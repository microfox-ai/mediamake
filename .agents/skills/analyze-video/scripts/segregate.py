#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["numpy>=1.26", "pillow>=10.1"]
# ///
"""Segregate an edited video: shots -> scenes -> recurring locations, with contact sheets and clips.

    uv run --script segregate.py VIDEO [--out DIR] [--clips none|shots|scenes|both] [...]

Steps (each cached in OUT/cache, so a rerun after editing OUT/overrides.json or OUT/notes.json is quick):
  1. analyse   one decode at ~128 px: per-frame HSV histogram + 32x18 luma grid + brightness
  2. shots     hard cuts (adaptive threshold, flash rejection), dissolves (linear-blend test),
               black/white gaps; min shot length; overrides.json add/remove cuts
  3. frames    keyframes per shot (+ review frames) as 480 px JPEGs in OUT/frames
  4. embed     DINOv2 per keyframe (embed.py), falls back to colour histograms
  5. scenes    shots linked to any of the next K shots that look alike stay in one scene
  6. locations scenes clustered by look; a location with 2+ scenes is an environment that comes back
  7. output    segregation.json, shots.csv, INDEX.md, sheets/*.jpg, clips/
"""
from __future__ import annotations

import argparse
import bisect
import csv
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
VERSION = 1
HIST_BINS = (16, 4, 4)
NBINS = HIST_BINS[0] * HIST_BINS[1] * HIST_BINS[2]
GRID_GAIN = 4.0  # luma-grid mean abs diff of ~0.25 already means "a different picture"
THUMB = 480  # long side of saved keyframes
SHEET = 1560  # contact sheet width; Claude's image reader keeps up to ~1568 px per side
PALETTE = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6",
           "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324", "#fffac8", "#aaffc3", "#808000",
           "#ffd8b1", "#7f7fff", "#ff7f7f", "#a9a9a9"]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# ---------------------------------------------------------------- time helpers

def tc(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def tc_short(sec: float) -> str:
    t = tc(sec)
    return t[3:-2] if sec < 3600 else t[:-4]  # MM:SS.d or HH:MM:SS


def smpte(frame: int, fps: float) -> str:
    n = max(1, round(fps))
    s, ff = divmod(frame, n)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}:{ff:02d}"


def parse_ref(x, fps: float) -> int:
    """Frame number from an override value: 1234 / "f1234" (frames), "62.5s" / "00:01:02.500" (time)."""
    if isinstance(x, int):
        return x
    if isinstance(x, float):
        return int(round(x * fps))
    s = str(x).strip()
    if s.startswith("f"):
        return int(s[1:])
    if s.endswith("s"):
        return int(round(float(s[:-1]) * fps))
    if ":" in s:
        sec = 0.0
        for part in s.split(":"):
            sec = sec * 60 + float(part)
        return int(round(sec * fps))
    return int(s)


# ---------------------------------------------------------------- probe / decode

def probe(path: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format",
                          str(path)], capture_output=True, text=True, check=True)
    info = json.loads(out.stdout)
    v = next(s for s in info["streams"] if s.get("codec_type") == "video")

    def rate(r):
        try:
            n, d = r.split("/")
            return float(n) / float(d) if float(d) else 0.0
        except Exception:
            return 0.0

    fps_str = v.get("avg_frame_rate", "0/0")
    if not 1 <= rate(fps_str) <= 240:
        fps_str = v.get("r_frame_rate", "0/0")
    if not 1 <= rate(fps_str) <= 240:
        fps_str = "25/1"
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    if abs(rot) % 180 == 90:
        w, h = h, w
    return {
        "path": str(path), "width": w, "height": h, "fps": rate(fps_str), "fps_str": fps_str,
        "duration": float(info["format"].get("duration") or v.get("duration") or 0),
        "codec": v.get("codec_name"),
        "has_audio": any(s.get("codec_type") == "audio" for s in info["streams"]),
        "size": path.stat().st_size, "mtime": int(path.stat().st_mtime),
    }


def fit(w: int, h: int, long_side: int, mult: int = 2) -> tuple[int, int]:
    if w >= h:
        return long_side, max(mult, round(long_side * h / w / mult) * mult)
    return max(mult, round(long_side * w / h / mult) * mult), long_side


def stream_frames(meta: dict, w: int, h: int, batch: int = 256):
    """Yield (start_index, uint8 array (b, h, w, 3)) for every frame at the probed constant rate."""
    for hw in ([True, False] if sys.platform == "darwin" else [False]):
        cmd = ["ffmpeg", "-v", "error", "-nostdin"]
        if hw:
            cmd += ["-hwaccel", "videotoolbox"]
        cmd += ["-i", meta["path"], "-map", "0:v:0", "-an", "-sn",
                "-vf", f"fps={meta['fps_str']},scale={w}:{h}:flags=area,format=rgb24",
                "-f", "rawvideo", "-"]
        err = tempfile.TemporaryFile()
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err, bufsize=1 << 22)
        fb = w * h * 3
        n = 0
        try:
            while True:
                buf = p.stdout.read(fb * batch)
                if not buf:
                    break
                k = len(buf) // fb
                if k == 0:
                    break
                yield n, np.frombuffer(buf[: k * fb], np.uint8).reshape(k, h, w, 3)
                n += k
        finally:
            p.stdout.close()
            rc = p.wait()
        if n > 0:
            return
        err.seek(0)
        msg = err.read().decode(errors="replace")[-800:]
        log(f"  ffmpeg produced no frames (hwaccel={hw}, rc={rc}): {msg}")
    raise SystemExit("could not decode the video")


# ---------------------------------------------------------------- 1. analyse

def rgb_to_hsv(x: np.ndarray):
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    mx = x.max(-1)
    mn = x.min(-1)
    d = mx - mn
    dd = np.where(d > 1e-6, d, 1.0)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) / 6
    h = np.where(d > 1e-6, h, 0.0)
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0)
    return h, s, mx


def frame_features(batch: np.ndarray):
    b, hh, ww, _ = batch.shape
    x = batch.astype(np.float32) / 255.0
    h, s, v = rgb_to_hsv(x)
    hb = np.minimum((h * HIST_BINS[0]).astype(np.int32), HIST_BINS[0] - 1)
    sb = np.minimum((s * HIST_BINS[1]).astype(np.int32), HIST_BINS[1] - 1)
    vb = np.minimum((v * HIST_BINS[2]).astype(np.int32), HIST_BINS[2] - 1)
    idx = (hb * (HIST_BINS[1] * HIST_BINS[2]) + sb * HIST_BINS[2] + vb).reshape(b, -1)
    idx = idx + (np.arange(b, dtype=np.int32) * NBINS)[:, None]
    hist = np.bincount(idx.ravel(), minlength=b * NBINS).reshape(b, NBINS).astype(np.float32)
    hist /= hh * ww
    luma = x[..., 0] * 0.299 + x[..., 1] * 0.587 + x[..., 2] * 0.114
    grid = luma.reshape(b, hh // 4, 4, ww // 4, 4).mean((2, 4)).reshape(b, -1)
    return hist, grid, luma.mean((1, 2)), luma.std((1, 2))


class Feats:
    def __init__(self, hist, grid, lum, std):
        self.hist, self.grid, self.lum, self.std = hist, grid, lum, std
        self.n = len(lum)

    def d(self, i, j, chunk=16384):
        """Picture distance in [0, 1] between frames i[k] and j[k]: colour histogram + coarse layout."""
        i = np.asarray(i)
        j = np.asarray(j)
        out = np.empty(len(i), np.float32)
        for a in range(0, len(i), chunk):
            ii, jj = i[a:a + chunk], j[a:a + chunk]
            dh = 0.5 * np.abs(self.hist[ii].astype(np.float32) - self.hist[jj].astype(np.float32)).sum(-1)
            dg = np.abs(self.grid[ii].astype(np.float32) - self.grid[jj].astype(np.float32)).mean(-1)
            out[a:a + chunk] = 0.5 * dh + 0.5 * np.minimum(1.0, GRID_GAIN * dg)
        return out

    def d1(self, i, j):
        return float(self.d([i], [j])[0])

    def layout(self, i, j, chunk=16384):
        """Distance between brightness/contrast-normalized luma grids: ~0 for a grade or flash on the same
        picture, 0.5-1.2 for a different picture."""
        i = np.asarray(i)
        j = np.asarray(j)
        out = np.empty(len(i), np.float32)
        z = lambda g: (g - g.mean(-1, keepdims=True)) / (g.std(-1, keepdims=True) + 0.02)
        for a in range(0, len(i), chunk):
            gi = self.grid[i[a:a + chunk]].astype(np.float32)
            gj = self.grid[j[a:a + chunk]].astype(np.float32)
            out[a:a + chunk] = np.abs(z(gi) - z(gj)).mean(-1)
        return out


def analyse(meta: dict, cache: Path, force: bool) -> Feats:
    aw, ah = fit(meta["width"], meta["height"], 128, 4)
    key = {"v": VERSION, "size": meta["size"], "mtime": meta["mtime"], "fps": meta["fps_str"], "dims": [aw, ah]}
    f = cache / "features.npz"
    if f.exists() and not force:
        z = np.load(f, allow_pickle=False)
        if json.loads(str(z["key"])) == key:
            log(f"[analyse] cached ({len(z['lum'])} frames)")
            return Feats(z["hist"], z["grid"], z["lum"], z["std"])
    log(f"[analyse] decoding at {aw}x{ah} ...")
    t0 = time.time()
    H, G, L, S = [], [], [], []
    last = 0
    for start, frames in stream_frames(meta, aw, ah):
        h, g, l, s = frame_features(frames)
        H.append(h.astype(np.float16)); G.append(g.astype(np.float16)); L.append(l); S.append(s)
        if start - last >= 2000:
            last = start
            pos = start / meta["fps"]
            log(f"  {tc(pos)} / {tc(meta['duration'])}  ({start / max(1e-6, time.time() - t0):.0f} fps)")
    hist, grid = np.concatenate(H), np.concatenate(G)
    lum, std = np.concatenate(L).astype(np.float32), np.concatenate(S).astype(np.float32)
    np.savez(f, key=json.dumps(key), hist=hist, grid=grid, lum=lum, std=std)
    log(f"[analyse] {len(lum)} frames in {time.time() - t0:.1f}s")
    return Feats(hist, grid, lum, std)


# ---------------------------------------------------------------- 2. shots

def runs(mask: np.ndarray):
    m = np.concatenate([[False], mask, [False]]).astype(np.int8)
    d = np.diff(m)
    return list(zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)))


def detect_boundaries(F: Feats, fps: float, args, overrides: dict):
    N = F.n
    s = np.zeros(N, np.float32)
    s[1:] = F.d(np.arange(N - 1), np.arange(1, N))
    sp = np.pad(s, 2, mode="edge")
    local = (sp[0:N] + sp[1:N + 1] + sp[3:N + 3] + sp[4:N + 4]) / 4
    ratio = s / (local + 0.02)
    locmax = (s >= sp[1:N + 1]) & (s >= sp[3:N + 3])
    locmax[0] = False
    thr, rthr, big = args.cut_threshold, args.cut_ratio, max(args.cut_threshold * 2, 0.6)
    flash_len = max(1, round(fps * 0.125))

    def is_flash(i):
        for j in range(1, flash_len + 1):
            if i + j < N and F.d1(i - 1, i + j) < min(thr, 0.5 * s[i]):
                return True  # the picture comes back right after: a flash, not a cut
            if i - 1 - j >= 0 and F.d1(i - 1 - j, i) < min(thr, 0.5 * s[i]):
                return True  # returning from a flash
        return False

    bounds, possible = [], []
    cand = np.flatnonzero(locmax & (s >= thr * 0.6) & ((ratio >= rthr * 0.6) | (s >= big)))
    lay = F.layout(cand - 1, cand) if len(cand) else np.zeros(0, np.float32)
    lthr = args.layout_threshold
    for i, ly in zip(cand, lay):
        i = int(i)
        hard = (s[i] >= thr and ratio[i] >= rthr) or s[i] >= big
        regrade = ly < lthr  # same layout, new brightness/colour: a beat pulse or grade, not a cut
        flash = is_flash(i)
        if hard and not flash and not regrade:
            strong = ((s[i] >= thr * 1.3 and ratio[i] >= rthr * 1.5) or s[i] >= big) and ly >= lthr * 1.5
            bounds.append({"frame": i, "type": "cut", "score": round(float(s[i]), 3), "ratio": round(float(ratio[i]), 2),
                           "layout": round(float(ly), 3), "confidence": "high" if strong else "low"})
        else:
            possible.append({"frame": i, "type": "flash" if flash else "regrade" if regrade else "cut",
                             "score": round(float(s[i]), 3), "ratio": round(float(ratio[i]), 2),
                             "layout": round(float(ly), 3)})

    # black / white gaps (fades to black, title gaps) -> their own segments
    dark = (F.lum < 0.06) & (F.std < 0.04)
    light = (F.lum > 0.94) & (F.std < 0.04)
    blank = []
    for mask, kind, min_len in ((dark, "black", max(2, round(fps * 0.2))), (light, "white", max(2, round(fps * 0.3)))):
        for a, b in runs(mask):
            a, b = int(a), int(b)
            if b - a >= min_len:
                blank.append((a, b, kind))
                for fr, t in ((a, f"{kind}_start"), (b, f"{kind}_end")):
                    if 0 < fr < N:
                        bounds.append({"frame": fr, "type": t, "score": 1.0, "confidence": "high"})

    # dissolves: the middle frame is the average of the two ends, and the two ends are different pictures
    if not args.no_dissolves:
        hardmask = np.zeros(N + 1, np.int32)
        for b in bounds:
            hardmask[b["frame"]] = 1
        for a, b, _ in blank:
            hardmask[a:b + 1] = 1
        hc = np.concatenate([[0], np.cumsum(hardmask)])
        z = lambda g: (g - g.mean(-1, keepdims=True)) / (g.std(-1, keepdims=True) + 0.02)
        cands = []
        for L in sorted({max(3, round(fps * x)) for x in (0.25, 0.5, 1.0)}):
            allI = np.arange(L, N - L)
            for c0 in range(0, len(allI), 20000):
                i = allI[c0:c0 + 20000]
                i = i[(hc[i + L + 1] - hc[i - L + 1]) == 0]
                if len(i) == 0:
                    continue
                dab = F.d(i - L, i + L)
                i, dab = i[dab >= 0.4], dab[dab >= 0.4]
                if len(i) == 0:
                    continue
                gA = F.grid[i - L].astype(np.float32)
                gB = F.grid[i + L].astype(np.float32)
                gM = F.grid[i].astype(np.float32)
                spread = np.abs(gA - gB).mean(-1)
                resid = np.abs(gM - (gA + gB) / 2).mean(-1)
                dz = np.abs(z(gA) - z(gB)).mean(-1)  # layout change, not just a lighting change
                dam, dmb = F.d(i - L, i), F.d(i, i + L)
                good = (spread > 0.04) & (resid < 0.35 * spread) & (dz > 0.45) & (dam > 0.25 * dab) & (dmb > 0.25 * dab)
                for k in np.flatnonzero(good):
                    cands.append((int(i[k]), L, float(1 - resid[k] / spread[k]), float(dab[k])))
        cands.sort()
        groups, cur = [], []
        for c in cands:
            if cur and c[0] - cur[-1][0] > 2:
                groups.append(cur); cur = []
            cur.append(c)
        if cur:
            groups.append(cur)
        for g in groups:
            if len({c[0] for c in g}) < 2:
                continue
            center = int(round(np.mean([c[0] for c in g])))
            half = min(c[1] for c in g)
            if hc[min(N, center + half) + 1] - hc[max(0, center - half) + 1] > 0:
                continue
            q = max(c[2] for c in g)
            bounds.append({"frame": center, "type": "dissolve", "score": round(q, 3),
                           "window": [max(0, center - half), min(N - 1, center + half)],
                           "confidence": "medium" if q > 0.75 and len(g) >= 4 else "low"})

    # overrides
    fps_ = fps
    for x in overrides.get("remove_cuts", []):
        fr = parse_ref(x, fps_)
        bounds = [b for b in bounds if abs(b["frame"] - fr) > 2]
    for x in overrides.get("add_cuts", []):
        fr = parse_ref(x, fps_)
        if 0 < fr < N:
            bounds = [b for b in bounds if abs(b["frame"] - fr) > 1]
            bounds.append({"frame": fr, "type": "manual", "score": 1.0, "confidence": "manual"})

    # min shot length: drop the weaker of two boundaries that are too close
    min_frames = max(1, round(args.min_shot * fps))
    prio = lambda b: 99 if b["type"] == "manual" else b["score"] + (0.5 if b["type"].endswith(("_start", "_end")) else 0) \
        - (0.3 if b["type"] == "dissolve" else 0)
    bounds = sorted({b["frame"]: b for b in sorted(bounds, key=prio)}.values(), key=lambda b: b["frame"])
    changed = True
    while changed:
        changed = False
        for k in range(len(bounds)):
            prev = bounds[k - 1]["frame"] if k > 0 else 0
            if bounds[k]["frame"] - prev < min_frames:
                if k == 0 or prio(bounds[k]) < prio(bounds[k - 1]):
                    bounds.pop(k)
                else:
                    bounds.pop(k - 1)
                changed = True
                break
        if not changed and bounds and N - bounds[-1]["frame"] < min_frames and bounds[-1]["type"] != "manual":
            bounds.pop()
            changed = True

    taken = [b["frame"] for b in bounds]
    possible = [p for p in possible if all(abs(p["frame"] - t) >= min_frames for t in taken)
                and not (p["type"] == "regrade" and p["layout"] < lthr * 0.5)]
    possible.sort(key=lambda p: -p["score"])
    return bounds, possible[: args.max_review], blank


def build_shots(F: Feats, bounds, blank, fps: float):
    N = F.n
    starts = [0] + [b["frame"] for b in bounds]
    ends = starts[1:] + [N]
    btype = ["start"] + [b["type"] for b in bounds]
    dark = (F.lum < 0.06) & (F.std < 0.04)
    light = (F.lum > 0.94) & (F.std < 0.04)
    win = {b["frame"]: b.get("window") for b in bounds}
    shots = []
    for k, (a, b) in enumerate(zip(starts, ends)):
        kind = "black" if dark[a:b].mean() > 0.8 else "white" if light[a:b].mean() > 0.8 else "picture"
        t_in = btype[k]
        t_in = {"black_end": "from_black", "white_end": "from_white", "black_start": "cut", "white_start": "cut"}.get(t_in, t_in)
        # keep keyframes away from dissolve overlaps and the first/last frames of the shot
        lo, hi = a, b - 1
        if win.get(a):
            lo = max(lo, win[a][1] + 1)
        if b in win and win[b]:
            hi = min(hi, win[b][0] - 1)
        pad = min(2, (hi - lo) // 6) if hi > lo else 0
        lo, hi = lo + pad, hi - pad
        if lo > hi:
            lo = hi = (a + b - 1) // 2
        dur = (b - a) / fps
        nk = int(min(8, 3 + dur // 8))
        kf = sorted({int(round(x)) for x in np.linspace(lo, hi, nk)})
        shots.append({"id": f"sh{k + 1:04d}", "start_frame": int(a), "end_frame": int(b), "frames": int(b - a),
                      "start": round(a / fps, 3), "end": round(b / fps, 3), "duration": round(dur, 3),
                      "start_tc": tc(a / fps), "end_tc": tc(b / fps), "transition_in": t_in, "kind": kind,
                      "keyframes": kf})
    return shots


# ---------------------------------------------------------------- 3. frames

def extract_frames(meta: dict, frames_dir: Path, needed: set[int], jobs: int):
    frames_dir.mkdir(parents=True, exist_ok=True)
    missing = sorted(f for f in needed if not (frames_dir / f"f{f:07d}.jpg").exists())
    if not missing:
        log(f"[frames] {len(needed)} cached")
        return
    tw, th = fit(meta["width"], meta["height"], THUMB, 2)
    fps = meta["fps"]
    log(f"[frames] extracting {len(missing)} frames at {tw}x{th} ...")
    if len(missing) <= 40:
        def one(f):
            subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-y", "-ss", f"{max(0, (f - 0.25) / fps):.4f}",
                            "-i", meta["path"], "-frames:v", "1", "-vf", f"scale={tw}:{th}:flags=area",
                            "-q:v", "3", str(frames_dir / f"f{f:07d}.jpg")], check=False)
        with ThreadPoolExecutor(jobs) as ex:
            list(ex.map(one, missing))
    else:
        want = set(missing)
        last = missing[-1]
        gen = stream_frames(meta, tw, th, batch=32)
        for start, batch in gen:
            for k in range(len(batch)):
                f = start + k
                if f in want:
                    Image.fromarray(batch[k]).save(frames_dir / f"f{f:07d}.jpg", quality=88)
            if start + len(batch) > last:
                gen.close()
                break
    # frames past the decoded end (rounding at the tail): reuse the last existing frame
    for f in missing:
        p = frames_dir / f"f{f:07d}.jpg"
        if not p.exists():
            prev = max((g for g in needed if g < f and (frames_dir / f"f{g:07d}.jpg").exists()), default=None)
            if prev is not None:
                shutil.copy(frames_dir / f"f{prev:07d}.jpg", p)
            else:
                Image.new("RGB", (tw, th)).save(p)


# ---------------------------------------------------------------- 4. embed

def embed_frames(frames: list[int], frames_dir: Path, cache: Path, F: Feats, mode: str):
    """frame -> L2-normalized vector. DINOv2 when available, colour histograms otherwise."""
    if mode == "dino":
        f = cache / "embed_dino.npz"
        have = {}
        if f.exists():
            z = np.load(f)
            have = {int(a): v for a, v in zip(z["frames"], z["vecs"])}
        miss = [x for x in frames if x not in have]
        if miss:
            log(f"[embed] DINOv2 on {len(miss)} keyframes (first run downloads torch + model) ...")
            lst = cache / "embed_list.txt"
            lst.write_text("\n".join(str(frames_dir / f"f{x:07d}.jpg") for x in miss))
            out = cache / "embed_out.npy"
            r = subprocess.run(["uv", "run", "--script", str(HERE / "embed.py"), "--list", str(lst), "--out", str(out)])
            if r.returncode == 0 and out.exists():
                vecs = np.load(out)
                have.update({x: v for x, v in zip(miss, vecs)})
                ks = sorted(have)
                np.savez(f, frames=np.array(ks), vecs=np.stack([have[k] for k in ks]))
                out.unlink()
            else:
                log("[embed] DINOv2 failed, falling back to colour histograms")
                return embed_frames(frames, frames_dir, cache, F, "color")
        else:
            log(f"[embed] {len(frames)} cached")
        return {x: have[x] for x in frames}, "dino"
    # colour: Hellinger-mapped histogram + normalized layout, both from the analysis pass
    idx = np.array(frames)
    h = np.sqrt(F.hist[idx].astype(np.float32))
    g = F.grid[idx].astype(np.float32)
    g = (g - g.mean(-1, keepdims=True)) / (g.std(-1, keepdims=True) + 0.02)
    g /= np.linalg.norm(g, axis=-1, keepdims=True) + 1e-6
    h /= np.linalg.norm(h, axis=-1, keepdims=True) + 1e-6
    v = np.concatenate([h * 0.8, g * 0.6], -1)
    v /= np.linalg.norm(v, axis=-1, keepdims=True) + 1e-6
    return {x: v[k] for k, x in enumerate(frames)}, "color"


# ---------------------------------------------------------------- 5. scenes, 6. locations

def otsu(x: np.ndarray, lo: float, hi: float) -> float:
    x = np.clip(x, lo, hi)
    if len(x) < 8:
        return (lo + hi) / 2
    best, bt = -1, (lo + hi) / 2
    for t in np.linspace(lo, hi, 101)[1:-1]:
        a, b = x[x < t], x[x >= t]
        if len(a) == 0 or len(b) == 0:
            continue
        v = len(a) * len(b) * (a.mean() - b.mean()) ** 2
        if v > best:
            best, bt = v, t
    return float(bt)


def group(shots, emb, fps, args, overrides, emode):
    n = len(shots)
    pic = [s["kind"] == "picture" for s in shots]
    K = [np.stack([emb[f] for f in s["keyframes"]]) if pic[i] else None for i, s in enumerate(shots)]
    mean = np.zeros((n, len(next(iter(emb.values()))) if emb else 1), np.float32)
    for i in range(n):
        if pic[i]:
            m = K[i].mean(0)
            mean[i] = m / (np.linalg.norm(m) + 1e-6)
    M = mean @ mean.T

    def link(a, b):
        if not (pic[a] and pic[b]):
            return -1.0
        return float((K[a] @ K[b].T).max())

    # link value across each boundary: best match between the last W shots and the next W shots
    W = args.scene_window
    links = []
    for i in range(n - 1):
        best = -1.0
        for a in range(max(0, i - W + 1), i + 1):
            for b in range(i + 1, min(n, i + 1 + W)):
                best = max(best, link(a, b))
        links.append(best)
    links = np.array(links, np.float32)
    # Otsu needs two modes; action and montage give one broad hump, so cap the split low
    lo, hi = (0.4, 0.65) if emode == "dino" else (0.5, 0.9)
    valid = links[links > -1]
    T = args.scene_threshold if args.scene_threshold is not None else otsu(valid, lo, hi) if len(valid) else lo
    log(f"[scenes] link threshold {T:.3f} ({'given' if args.scene_threshold is not None else 'auto'}, {emode})")

    brk = [bool(l < T) for l in links]
    fixed = set()  # boundaries the short-scene merge below must not touch
    # a black/white gap ends the scene before it; one of >= 0.5 s always ends it (fade to black)
    for i, s in enumerate(shots):
        if s["kind"] == "picture":
            continue
        if i == 0:
            if n > 1:
                brk[0] = False  # opening black belongs to the first scene
            continue
        long_gap = s["duration"] >= 0.5 and not args.no_black_breaks
        if i < n - 1:
            brk[i] = brk[i] or brk[i - 1] or long_gap
            if long_gap:
                fixed.add(i)
        brk[i - 1] = False
    starts = [s["start_frame"] for s in shots]

    def shot_at(fr):
        return max(0, bisect.bisect_right(starts, fr) - 1)

    for x in overrides.get("scene_break_before", []):
        i = shot_at(parse_ref(x, fps))
        if i > 0:
            brk[i - 1] = True
            fixed.add(i - 1)
    for x in overrides.get("scene_join", []):
        i = shot_at(parse_ref(x, fps))
        if i > 0:
            brk[i - 1] = False
            fixed.add(i - 1)

    scenes, cur = [], [0]
    for i in range(n - 1):
        if brk[i]:
            scenes.append(cur); cur = []
        cur.append(i + 1)
    scenes.append(cur)

    # inserts, effect shots and reaction cutaways rarely make a scene of their own: fold any scene shorter
    # than --min-scene into the neighbour it links to best (boundary k sits between shot k and k+1)
    dur = lambda m: shots[m[-1]]["end"] - shots[m[0]]["start"]
    while len(scenes) > 1:
        order = sorted(range(len(scenes)), key=lambda k: dur(scenes[k]))
        done = True
        for k in order:
            if dur(scenes[k]) >= args.min_scene:
                break
            opts = []
            if k > 0 and scenes[k][0] - 1 not in fixed:
                opts.append((links[scenes[k][0] - 1], k - 1))
            if k < len(scenes) - 1 and scenes[k][-1] not in fixed:
                opts.append((links[scenes[k][-1]], k + 1))
            if not opts:
                continue
            _, j = max(opts)
            a, b = sorted((k, j))
            scenes[a] = scenes[a] + scenes[b]
            scenes.pop(b)
            done = False
            break
        if done:
            break
    for si, members in enumerate(scenes):
        for i in members:
            shots[i]["scene"] = f"S{si + 1:03d}"
    for i in range(n - 1):
        shots[i + 1]["link_prev"] = round(float(links[i]), 3)

    # scene similarity: how well each scene's shots find a look-alike in the other, both ways. A median, so a
    # long scene doesn't match everything just by having many shots to pick a lucky pair from
    ns = len(scenes)
    pics = [[i for i in m if pic[i]] for m in scenes]
    SS = np.full((ns, ns), -1.0, np.float32)
    for a in range(ns):
        for b in range(a + 1, ns):
            if not pics[a] or not pics[b]:
                continue
            blk = M[np.ix_(pics[a], pics[b])]
            SS[a, b] = SS[b, a] = 0.5 * float(np.median(blk.max(1)) + np.median(blk.max(0)))
    TL = args.location_threshold if args.location_threshold is not None else (0.66 if emode == "dino" else 0.85)

    # average-linkage clustering with must-link / cannot-link from overrides
    scene_at = lambda fr: next(k for k, m in enumerate(scenes) if shot_at(fr) in m)
    parent = list(range(ns))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for pair in overrides.get("same_location", []):
        ids = [scene_at(parse_ref(x, fps)) for x in pair]
        for x in ids[1:]:
            parent[find(x)] = find(ids[0])
    cannot = [tuple(scene_at(parse_ref(x, fps)) for x in pair[:2]) for pair in overrides.get("different_location", [])]
    groups = {}
    for k in range(ns):
        groups.setdefault(find(k), []).append(k)
    cl = list(groups.values())
    m = len(cl)
    C = np.full((m, m), -np.inf, np.float32)  # average linkage, updated Lance-Williams style
    for i in range(m):
        for j in range(i + 1, m):
            v = SS[np.ix_(cl[i], cl[j])]
            if (v > -1).any():
                C[i, j] = C[j, i] = float(v[v > -1].mean())
    size = np.array([len(c) for c in cl], np.float32)
    alive = np.ones(m, bool)
    while m > 1:
        Cm = np.where(alive[:, None] & alive[None, :], C, -np.inf)
        np.fill_diagonal(Cm, -np.inf)
        k = int(Cm.argmax())
        i, j = divmod(k, len(cl))
        if Cm[i, j] < TL:
            break
        if any((a in cl[i] and b in cl[j]) or (b in cl[i] and a in cl[j]) for a, b in cannot):
            C[i, j] = C[j, i] = -np.inf
            continue
        row = np.where(np.isfinite(C[i]) & np.isfinite(C[j]), (size[i] * C[i] + size[j] * C[j]) / (size[i] + size[j]),
                       np.where(np.isfinite(C[i]), C[i], C[j]))
        C[i, :] = C[:, i] = row
        size[i] += size[j]
        cl[i] = sorted(cl[i] + cl[j])
        alive[j] = False
    cl = sorted((c for c, a in zip(cl, alive) if a), key=min)
    loc_of = {}
    for li, c in enumerate(cl):
        for k in c:
            loc_of[k] = f"L{li + 1:02d}"

    scene_list = []
    for si, members in enumerate(scenes):
        p = pics[si]
        rep = members[0]
        if p:
            sub = M[np.ix_(p, p)]
            rep = p[int(sub.mean(1).argmax())]
        a, b = shots[members[0]], shots[members[-1]]
        scene_list.append({"id": f"S{si + 1:03d}", "start_frame": a["start_frame"], "end_frame": b["end_frame"],
                           "start": a["start"], "end": b["end"], "duration": round(b["end"] - a["start"], 3),
                           "start_tc": a["start_tc"], "end_tc": b["end_tc"],
                           "shots": [shots[i]["id"] for i in members], "location": loc_of[si],
                           "rep_shot": shots[rep]["id"]})
        for i in members:
            shots[i]["location"] = loc_of[si]

    locs = []
    for li, c in enumerate(cl):
        sc = [scene_list[k] for k in c]
        locs.append({"id": f"L{li + 1:02d}", "scenes": [s["id"] for s in sc],
                     "screen_time": round(sum(s["duration"] for s in sc), 3),
                     "recurring": len(c) > 1 and (max(c) - min(c) + 1) > len(c),
                     "first_tc": sc[0]["start_tc"]})

    # look-alike shots in other scenes (reused footage, coverage of the same set-up)
    scene_of = np.array([s["scene"] for s in shots])
    nopic = ~np.array(pic)
    for i in range(n):
        if not pic[i]:
            continue
        row = M[i].copy()
        row[(scene_of == scene_of[i]) | nopic] = -1
        top = np.argsort(-row)[:3]
        shots[i]["similar"] = [{"shot": shots[j]["id"], "sim": round(float(row[j]), 3)}
                               for j in top if row[j] >= max(TL + 0.1, 0.7 if emode == "dino" else 0.9)]
    return scene_list, locs, {"scene_threshold": round(T, 3), "location_threshold": TL}


# ---------------------------------------------------------------- 7. sheets

def load_font(size: int, bold=False):
    names = (["/System/Library/Fonts/SFNSMono.ttf", "/System/Library/Fonts/Menlo.ttc"]
             + ["DejaVuSansMono-Bold.ttf" if bold else "DejaVuSansMono.ttf", "Arial.ttf"])
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except Exception:
            pass
    return ImageFont.load_default(size)


class Sheets:
    def __init__(self, out: Path, meta: dict, frames_dir: Path, notes: dict):
        self.dir = out / "sheets"
        if self.dir.exists():
            shutil.rmtree(self.dir)
        self.dir.mkdir(parents=True)
        self.meta, self.frames_dir, self.notes = meta, frames_dir, notes
        self.f = load_font(15)
        self.fb = load_font(17, True)
        self.fh = load_font(20, True)
        self.cache = {}
        a = meta["width"] / meta["height"]
        self.cols = 6 if a >= 1.25 else 8 if a >= 0.8 else 10
        self.tw = (SHEET - 24 - (self.cols - 1) * 8) // self.cols
        self.th = round(self.tw / a)

    def img(self, frame, w=None, h=None):
        w, h = w or self.tw, h or self.th
        key = (frame, w, h)
        if key not in self.cache:
            p = self.frames_dir / f"f{frame:07d}.jpg"
            im = Image.open(p).convert("RGB") if p.exists() else Image.new("RGB", (w, h), "#333")
            self.cache[key] = im.resize((w, h), Image.LANCZOS)
            if len(self.cache) > 600:
                self.cache.pop(next(iter(self.cache)))
        return self.cache[key]

    def page(self, height, title, sub=""):
        im = Image.new("RGB", (SHEET, min(SHEET, height)), "#111")
        d = ImageDraw.Draw(im)
        d.text((12, 10), title, font=self.fh, fill="#fff")
        if sub:
            d.text((12 + d.textlength(title, font=self.fh) + 16, 13), sub, font=self.f, fill="#aaa")
        return im, d

    def save(self, im, name):
        im.save(self.dir / name, quality=85)
        return f"sheets/{name}"

    @staticmethod
    def color(idx):
        return PALETTE[idx % len(PALETTE)]

    def overview(self, shots, scene_idx):
        cell_h = 5 + self.th + 40
        per_row = self.cols
        rows = max(1, (SHEET - 48) // (cell_h + 8))
        per_page = rows * per_row
        pages = math.ceil(len(shots) / per_page)
        name = Path(self.meta["path"]).name
        out = []
        for p in range(pages):
            chunk = shots[p * per_page:(p + 1) * per_page]
            nrows = math.ceil(len(chunk) / per_row)
            im, d = self.page(48 + nrows * (cell_h + 8), f"{name} · shots {chunk[0]['id']}–{chunk[-1]['id']}",
                              f"page {p + 1}/{pages} · colour bar = scene · thick bar = first shot of a scene")
            for k, s in enumerate(chunk):
                x = 12 + (k % per_row) * (self.tw + 8)
                y = 48 + (k // per_row) * (cell_h + 8)
                col = self.color(scene_idx[s["scene"]])
                first = s["id"] == s["_scene_first"]
                d.rectangle([x, y + (0 if first else 3), x + self.tw - 1, y + 4], fill=col)
                im.paste(self.img(s["keyframes"][len(s["keyframes"]) // 2]), (x, y + 5))
                d.text((x, y + 7 + self.th), f"{s['id']} {s['scene']} {s['location']}", font=self.fb, fill=col if first else "#fff")
                extra = "" if s["kind"] == "picture" else f" {s['kind']}"
                tr = {"dissolve": " ◇", "from_black": " ▪", "manual": " ✎"}.get(s["transition_in"], "")
                d.text((x, y + 25 + self.th), f"{tc_short(s['start'])} · {s['duration']:.2f}s{tr}{extra}", font=self.f, fill="#bbb")
            out.append(self.save(im, f"shots_{p + 1:03d}.jpg"))
        return out

    def scene(self, sc, shots_by_id, loc, scene_desc):
        members = [shots_by_id[i] for i in sc["shots"]]
        per_row = max(1, self.cols // 3)
        row_h = 22 + self.th + 10
        rows = max(1, (SHEET - 70) // row_h)
        per_page = rows * per_row
        pages = math.ceil(len(members) / per_page)
        others = [x for x in loc["scenes"] if x != sc["id"]]
        sub = f"{sc['start_tc']} → {sc['end_tc']} ({sc['duration']:.1f}s) · {len(members)} shots · {sc['location']}"
        if others:
            sub += f" (also in {', '.join(others[:8])}{'…' if len(others) > 8 else ''})"
        out = []
        for p in range(pages):
            chunk = members[p * per_page:(p + 1) * per_page]
            nrows = math.ceil(len(chunk) / per_row)
            im, d = self.page(70 + nrows * row_h, f"{sc['id']}" + (f" — {scene_desc}" if scene_desc else ""),
                              sub + (f" · page {p + 1}/{pages}" if pages > 1 else ""))
            d.text((12, 40), "each shot: first · middle · last keyframe", font=self.f, fill="#777")
            for k, s in enumerate(chunk):
                x0 = 12 + (k % per_row) * 3 * (self.tw + 8)
                y = 66 + (k // per_row) * row_h
                tr = s["transition_in"] if s["transition_in"] not in ("cut", "start") else ""
                d.text((x0, y), f"{s['id']}  {tc_short(s['start'])}–{tc_short(s['end'])}  {s['duration']:.2f}s {tr}",
                       font=self.fb, fill="#fff")
                kf = s["keyframes"]
                for j, fr in enumerate([kf[0], kf[len(kf) // 2], kf[-1]]):
                    im.paste(self.img(fr), (x0 + j * (self.tw + 8), y + 22))
            out.append(self.save(im, f"scene_{sc['id']}{'' if pages == 1 else f'_{p + 1}'}.jpg"))
        return out

    def locations(self, locs, scenes_by_id, shots_by_id, loc_desc):
        rec = [l for l in locs if len(l["scenes"]) > 1]
        if not rec:
            return []
        per_row = self.cols
        items = []
        for l in rec:
            for r in range(math.ceil(len(l["scenes"]) / per_row)):
                items.append((l, l["scenes"][r * per_row:(r + 1) * per_row], r))
        block = 26 + self.th + 24 + 8
        rows = max(1, (SHEET - 48) // block)
        pages = math.ceil(len(items) / rows)
        out = []
        for p in range(pages):
            chunk = items[p * rows:(p + 1) * rows]
            im, d = self.page(48 + len(chunk) * block, "Locations that appear in more than one scene",
                              f"page {p + 1}/{pages} · one frame per scene (its most typical shot)")
            for k, (l, scs, r) in enumerate(chunk):
                y = 48 + k * block
                if r == 0:
                    desc = loc_desc.get(l["id"], "")
                    d.text((12, y), f"{l['id']}{' — ' + desc if desc else ''} · {len(l['scenes'])} scenes · "
                                    f"{l['screen_time']:.0f}s on screen", font=self.fb, fill="#ffe119")
                for j, sid in enumerate(scs):
                    sc = scenes_by_id[sid]
                    s = shots_by_id[sc["rep_shot"]]
                    x = 12 + j * (self.tw + 8)
                    im.paste(self.img(s["keyframes"][len(s["keyframes"]) // 2]), (x, y + 24))
                    d.text((x, y + 26 + self.th), f"{sid} {tc_short(sc['start'])} ({sc['duration']:.0f}s)", font=self.f, fill="#ddd")
            out.append(self.save(im, f"locations_{p + 1:03d}.jpg"))
        return out

    def review(self, items, fps):
        if not items:
            return []
        n_th = 4
        per_row = 2
        tw = (SHEET - 24 - (per_row * n_th - 1) * 6 - (per_row - 1) * 20) // (per_row * n_th)
        th = round(tw * self.meta["height"] / self.meta["width"])
        block = 24 + th + 10
        rows = max(1, (SHEET - 70) // block)
        per_page = rows * per_row
        pages = math.ceil(len(items) / per_page)
        out = []
        for p in range(pages):
            chunk = items[p * per_page:(p + 1) * per_page]
            nrows = math.ceil(len(chunk) / per_row)
            im, d = self.page(70 + nrows * block, "Boundaries to check",
                              f"page {p + 1}/{pages} · frames f-2 f-1 | f f+1 · green = kept as a cut, grey = not a cut")
            d.text((12, 40), "fix with overrides.json: remove_cuts / add_cuts take the frame number", font=self.f, fill="#777")
            for k, it in enumerate(chunk):
                x0 = 12 + (k % per_row) * (n_th * (tw + 6) + 14)
                y = 66 + (k // per_row) * block
                kept = it["kept"]
                d.text((x0, y), f"{it['rid']} f{it['frame']} {tc_short(it['frame'] / fps)} {it['type']} "
                                f"{it['score']:.2f} {'KEPT' if kept else 'not cut'}{' (' + it['confidence'] + ')' if kept else ''}",
                       font=self.fb, fill="#3cb44b" if kept else "#aaa")
                for j, fr in enumerate(it["frames"]):
                    x = x0 + j * (tw + 6) + (6 if j >= 2 else 0)
                    im.paste(self.img(fr, tw, th), (x, y + 22))
                xm = x0 + 2 * (tw + 6) + 1
                d.rectangle([xm, y + 22, xm + 3, y + 22 + th], fill="#3cb44b" if kept else "#666")
            out.append(self.save(im, f"review_{p + 1:03d}.jpg"))
        return out

    def timeline(self, scenes, locs, duration):
        rec = [l for l in locs if len(l["scenes"]) > 1]
        rows = rec + [{"id": "other", "scenes": [s["id"] for s in scenes if all(s["id"] not in l["scenes"] for l in rec)]}]
        rows = [r for r in rows if r["scenes"]][:60]
        lh = 22
        left = 110
        h = 60 + len(rows) * lh + 30
        im, d = self.page(h, "Timeline", "one row per location that comes back; every block is a scene")
        x = lambda t: left + (SHEET - left - 16) * t / max(1e-6, duration)
        sc_by = {s["id"]: s for s in scenes}
        for k, r in enumerate(rows):
            y = 50 + k * lh
            d.text((12, y + 2), r["id"], font=self.f, fill="#ddd")
            d.line([left, y + lh // 2, SHEET - 16, y + lh // 2], fill="#2a2a2a")
            for sid in r["scenes"]:
                s = sc_by[sid]
                d.rectangle([x(s["start"]), y + 3, max(x(s["start"]) + 2, x(s["end"]) - 1), y + lh - 3],
                            fill=self.color(k) if r["id"] != "other" else "#555")
        y = 50 + len(rows) * lh + 6
        step = next(st for st in (5, 10, 15, 30, 60, 120, 300, 600, 900, 1800) if duration / st <= 16)
        for t in np.arange(0, duration + 1e-6, step):
            d.line([x(t), 46, x(t), y], fill="#333")
            d.text((x(t) + 2, y + 2), tc_short(float(t)), font=self.f, fill="#888")
        return self.save(im, "timeline.jpg")


# ---------------------------------------------------------------- clips

def cut_clips(meta, items, out_dir: Path, jobs: int, height: int):
    out_dir.mkdir(parents=True, exist_ok=True)
    man_p = out_dir / ".ranges.json"
    man = json.loads(man_p.read_text()) if man_p.exists() else {}
    fps = meta["fps"]
    todo = []
    keep = set()
    for it in items:
        name = f"{it['id']}.mp4"
        keep.add(name)
        rng = [it["start_frame"], it["end_frame"]]
        if man.get(name) == rng and (out_dir / name).exists():
            continue
        todo.append((name, rng))
    for p in out_dir.glob("*.mp4"):
        if p.name not in keep:
            p.unlink()
    if not todo:
        log(f"[clips] {out_dir.name}: {len(items)} up to date")
        return
    vf = f"scale=-2:{height}" if height and height < meta["height"] else None

    def one(job):
        name, (a, b) = job
        cmd = ["ffmpeg", "-v", "error", "-nostdin", "-y", "-ss", f"{max(0, (a - 0.25) / fps):.4f}", "-i", meta["path"],
               "-t", f"{(b - a) / fps:.4f}", "-frames:v", str(b - a), "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "veryfast",
               "-crf", "18", "-pix_fmt", "yuv420p", "-r", meta["fps_str"]]
        if vf:
            cmd += ["-vf", vf]
        cmd += ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out_dir / name)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        return name, (a, b), r.returncode, r.stderr[-300:]

    log(f"[clips] {out_dir.name}: cutting {len(todo)} clips ...")
    done = 0
    with ThreadPoolExecutor(jobs) as ex:
        for name, rng, rc, err in ex.map(one, todo):
            done += 1
            if rc == 0:
                man[name] = list(rng)
            else:
                log(f"  {name} failed: {err}")
            if done % 25 == 0:
                log(f"  {done}/{len(todo)}")
                man_p.write_text(json.dumps(man))
    man = {k: v for k, v in man.items() if k in keep}
    man_p.write_text(json.dumps(man))


# ---------------------------------------------------------------- index

def write_index(out: Path, meta, shots, scenes, locs, params, sheets, notes, review_n, clips):
    sd = notes.get("scenes", {})
    ld = notes.get("locations", {})
    rec = [l for l in locs if len(l["scenes"]) > 1]
    L = []
    L.append(f"# {Path(meta['path']).name}\n")
    if notes.get("summary"):
        L.append(notes["summary"] + "\n")
    L.append(f"- source: `{meta['path']}`")
    L.append(f"- {tc(meta['duration'])} · {meta['width']}x{meta['height']} · {meta['fps']:.3f} fps · {meta['codec']}"
             f"{' · audio' if meta['has_audio'] else ''}")
    L.append(f"- **{len(shots)} shots**, **{len(scenes)} scenes**, **{len(locs)} locations** "
             f"({len(rec)} appear in more than one scene)")
    L.append(f"- embedding: {params['embed']} · scene link threshold {params['scene_threshold']} · "
             f"location threshold {params['location_threshold']} · min shot {params['min_shot']}s")
    if review_n:
        L.append(f"- {review_n} boundaries to check by eye: `sheets/review_*.jpg`")
    L.append("\nTimes are seconds from the start of the file; frames count from 0 at "
             f"{meta['fps_str']} fps (`start_frame` inclusive, `end_frame` exclusive).\n")
    L.append("## Files\n")
    L.append("| file | what |\n|---|---|")
    L.append("| `segregation.json` | everything below as data: shots, scenes, locations, review items |")
    L.append("| `shots.csv` | one row per shot |")
    L.append("| `sheets/timeline.jpg` | when each recurring location is on screen |")
    L.append(f"| `sheets/shots_*.jpg` | every shot, middle frame ({len(sheets['overview'])} pages) |")
    L.append("| `sheets/scene_S###.jpg` | one per scene: first/middle/last frame of each shot |")
    if sheets["locations"]:
        L.append(f"| `sheets/locations_*.jpg` | recurring locations, one frame per scene ({len(sheets['locations'])} pages) |")
    if sheets["review"]:
        L.append(f"| `sheets/review_*.jpg` | uncertain boundaries ({len(sheets['review'])} pages) |")
    L.append("| `frames/f#######.jpg` | keyframes at 480 px, by frame number |")
    for kind in clips:
        L.append(f"| `clips/{kind}/` | one mp4 per {kind[:-1]} |")
    L.append("| `overrides.json` / `notes.json` | your corrections and descriptions; rerun to apply |\n")
    L.append("## Scenes\n")
    L.append("| scene | start | end | dur | shots | location | description |\n|---|---|---|---|---|---|---|")
    for s in scenes:
        loc = s["location"] + (" ↺" if any(l["id"] == s["location"] for l in rec) else "")
        L.append(f"| {s['id']} | {s['start_tc']} | {s['end_tc']} | {s['duration']:.1f}s | {len(s['shots'])} "
                 f"({s['shots'][0]}–{s['shots'][-1]}) | {loc} | {sd.get(s['id'], '')} |")
    if rec:
        L.append("\n## Locations that come back\n")
        L.append("| location | scenes | on screen | description |\n|---|---|---|---|")
        for l in rec:
            L.append(f"| {l['id']} | {', '.join(l['scenes'])} | {l['screen_time']:.1f}s | {ld.get(l['id'], '')} |")
    reused = [(s["id"], m["shot"], m["sim"]) for s in shots for m in s.get("similar", []) if m["sim"] >= 0.92]
    if reused:
        L.append("\n## Near-identical shots in different scenes (reused footage or the same set-up)\n")
        seen = set()
        for a, b, v in reused:
            if (b, a) in seen:
                continue
            seen.add((a, b))
            L.append(f"- {a} ≈ {b} ({v})")
    (out / "INDEX.md").write_text("\n".join(L) + "\n")


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("--out", type=Path, help="output folder (default: <video dir>/<video name>_segregation)")
    ap.add_argument("--clips", choices=["none", "shots", "scenes", "both"], default="none")
    ap.add_argument("--clip-height", type=int, default=0, help="downscale clips to this height (0 = source)")
    ap.add_argument("--embed", choices=["dino", "color"], default="dino")
    ap.add_argument("--min-shot", type=float, default=0.2, help="shortest shot in seconds")
    ap.add_argument("--cut-threshold", type=float, default=0.3, help="frame distance a cut needs (0..1)")
    ap.add_argument("--cut-ratio", type=float, default=3.0, help="how far a cut must stand out from its neighbours")
    ap.add_argument("--layout-threshold", type=float, default=0.3,
                    help="layout change a cut needs; below it a jump is a colour/brightness pulse")
    ap.add_argument("--no-dissolves", action="store_true")
    ap.add_argument("--scene-threshold", type=float, help="shot link similarity that keeps shots in one scene (default: auto)")
    ap.add_argument("--scene-window", type=int, default=4, help="shots to look back/ahead when linking")
    ap.add_argument("--min-scene", type=float, default=2.5, help="shorter scenes join their best-linked neighbour (s)")
    ap.add_argument("--location-threshold", type=float, help="scene similarity that makes two scenes one location")
    ap.add_argument("--no-black-breaks", action="store_true", help="don't force a scene break at black gaps >= 0.5 s")
    ap.add_argument("--max-review", type=int, default=48, help="max rejected near-cuts on the review sheets")
    ap.add_argument("--jobs", type=int, default=3)
    ap.add_argument("--force", action="store_true", help="ignore the analysis cache")
    ap.add_argument("--no-sheets", action="store_true")
    args = ap.parse_args()

    video = args.video.expanduser().resolve()
    if not video.exists():
        raise SystemExit(f"no such file: {video}")
    out = (args.out or video.parent / f"{video.stem}_segregation").expanduser().resolve()
    cache = out / "cache"
    frames_dir = out / "frames"
    cache.mkdir(parents=True, exist_ok=True)
    overrides = json.loads((out / "overrides.json").read_text()) if (out / "overrides.json").exists() else {}
    notes = json.loads((out / "notes.json").read_text()) if (out / "notes.json").exists() else {}
    t0 = time.time()

    meta = probe(video)
    fps = meta["fps"]
    log(f"{video.name}: {tc(meta['duration'])}, {meta['width']}x{meta['height']} @ {fps:.3f} fps -> {out}")
    F = analyse(meta, cache, args.force)

    bounds, possible, blank = detect_boundaries(F, fps, args, overrides)
    shots = build_shots(F, bounds, blank, fps)
    log(f"[shots] {len(shots)} shots ({sum(b['type'] == 'cut' for b in bounds)} cuts, "
        f"{sum(b['type'] == 'dissolve' for b in bounds)} dissolves, {len(blank)} blank gaps)")

    review = []
    weak = sorted((b for b in bounds if b["confidence"] in ("low", "medium")), key=lambda b: b["score"])
    for b in weak[: args.max_review]:
        review.append({"frame": b["frame"], "type": b["type"], "score": b["score"], "kept": True,
                       "confidence": b["confidence"]})
    for p in possible[: args.max_review // 2]:
        review.append({"frame": p["frame"], "type": p["type"], "score": p["score"], "kept": False})
    review.sort(key=lambda r: r["frame"])
    N = F.n
    for k, r in enumerate(review):
        r["rid"] = f"R{k + 1:02d}"
        r["frames"] = [min(N - 1, max(0, r["frame"] + o)) for o in (-2, -1, 0, 1)]

    needed = {f for s in shots for f in s["keyframes"]} | {f for r in review for f in r["frames"]}
    extract_frames(meta, frames_dir, needed, args.jobs)

    kfs = sorted({f for s in shots if s["kind"] == "picture" for f in s["keyframes"]})
    emb, emode = embed_frames(kfs, frames_dir, cache, F, args.embed) if kfs else ({}, "none")
    scenes, locs, gp = group(shots, emb, fps, args, overrides, emode)
    log(f"[scenes] {len(scenes)} scenes · {len(locs)} locations, {sum(len(l['scenes']) > 1 for l in locs)} recurring")

    params = {"embed": emode, "min_shot": args.min_shot, "cut_threshold": args.cut_threshold,
              "cut_ratio": args.cut_ratio, "layout_threshold": args.layout_threshold, "dissolves": not args.no_dissolves, "scene_window": args.scene_window, "min_scene": args.min_scene, **gp}
    sheets = {"overview": [], "scenes": {}, "locations": [], "review": [], "timeline": None}
    if not args.no_sheets:
        log("[sheets] drawing ...")
        sh = Sheets(out, meta, frames_dir, notes)
        scene_idx = {s["id"]: k for k, s in enumerate(scenes)}
        first = {s["id"]: s["shots"][0] for s in scenes}
        for s in shots:
            s["_scene_first"] = first[s["scene"]]
        by_id = {s["id"]: s for s in shots}
        loc_by = {l["id"]: l for l in locs}
        sheets["timeline"] = sh.timeline(scenes, locs, meta["duration"] or N / fps)
        sheets["overview"] = sh.overview(shots, scene_idx)
        for sc in scenes:
            sheets["scenes"][sc["id"]] = sh.scene(sc, by_id, loc_by[sc["location"]], notes.get("scenes", {}).get(sc["id"], ""))
            sc["sheets"] = sheets["scenes"][sc["id"]]
        sheets["locations"] = sh.locations(locs, {s["id"]: s for s in scenes}, by_id, notes.get("locations", {}))
        sheets["review"] = sh.review(review, fps)
        for s in shots:
            s.pop("_scene_first", None)

    clips = []
    if args.clips in ("shots", "both"):
        cut_clips(meta, [s for s in shots], out / "clips" / "shots", args.jobs, args.clip_height)
        clips.append("shots")
    if args.clips in ("scenes", "both"):
        cut_clips(meta, scenes, out / "clips" / "scenes", args.jobs, args.clip_height)
        clips.append("scenes")
    for kind in clips:
        items = shots if kind == "shots" else scenes
        for it in items:
            it["clip"] = f"clips/{kind}/{it['id']}.mp4"
    for kind in ("shots", "scenes"):  # clips from an earlier run, if they still match
        man_p = out / "clips" / kind / ".ranges.json"
        if kind not in clips and man_p.exists():
            man = json.loads(man_p.read_text())
            for it in shots if kind == "shots" else scenes:
                if man.get(f"{it['id']}.mp4") == [it["start_frame"], it["end_frame"]]:
                    it["clip"] = f"clips/{kind}/{it['id']}.mp4"

    for s in shots:
        s["start_smpte"] = smpte(s["start_frame"], fps)
    sd, ld = notes.get("scenes", {}), notes.get("locations", {})
    for s in scenes:
        if s["id"] in sd:
            s["description"] = sd[s["id"]]
    for l in locs:
        if l["id"] in ld:
            l["description"] = ld[l["id"]]
    for s in shots:
        if s["id"] in notes.get("shots", {}):
            s["description"] = notes["shots"][s["id"]]

    data = {"version": VERSION, "video": meta, "frames": N, "params": params, "overrides": overrides,
            "shots": shots, "scenes": scenes, "locations": locs, "review": review, "sheets": sheets}
    (out / "segregation.json").write_text(json.dumps(data, indent=1, ensure_ascii=False))
    with open(out / "shots.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["shot", "scene", "location", "start", "end", "duration", "start_tc", "end_tc", "start_frame",
                    "end_frame", "transition_in", "kind", "similar", "clip"])
        for s in shots:
            w.writerow([s["id"], s["scene"], s["location"], s["start"], s["end"], s["duration"], s["start_tc"],
                        s["end_tc"], s["start_frame"], s["end_frame"], s["transition_in"], s["kind"],
                        " ".join(m["shot"] for m in s.get("similar", [])), s.get("clip", "")])
    write_index(out, meta, shots, scenes, locs, params, sheets, notes, len(review), clips)
    log(f"done in {time.time() - t0:.1f}s -> {out / 'INDEX.md'}")
    print(out)


if __name__ == "__main__":
    main()
