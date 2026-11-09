#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["numpy>=1.26", "pillow>=10.1", "torch>=2.4", "torchvision>=0.19", "transformers>=4.45,<5",
#                 "timm>=1.0", "kornia>=0.7", "einops>=0.8"]
# ///
"""Subject mattes for a remix edit: one RGBA cutout video per shot, from BiRefNet on the Apple GPU.

    uv run --script matte.py JOBS.json [--model lite|full] [--size 1024] [--force]

JOBS.json: {"src": "<video>", "out": "<dir>", "crop": [w, h, x, y] (optional, applied first),
            "width": 1920 (output width, optional), "shots": {"<id>": [from_s, to_s], ...}}

For every shot it writes <out>/<id>.webm (VP9 with alpha: the shot's picture where the subject is,
transparent elsewhere), <out>/<id>.matte.mp4 (the matte as grey, for masks and checks) and
<out>/<id>.stats.json (per frame [cx, cy, area, x0, y0, x1, y1] of the subject as fractions of the
frame: anchors for zoom transitions and match cuts). Up-to-date
outputs are skipped (<out>/.ranges.json). The matte is smoothed over time (a short EMA) so it doesn't
boil from frame to frame, then given a soft 1-px edge.
"""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import torch
from PIL import Image


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def probe_fps(src: str) -> str:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=avg_frame_rate", "-of", "csv=p=0", src], capture_output=True, text=True)
    return out.stdout.strip() or "24/1"


def load_model(kind: str):
    from transformers import AutoModelForImageSegmentation
    name = {"lite": "ZhengPeng7/BiRefNet_lite", "full": "ZhengPeng7/BiRefNet"}[kind]
    dev = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    m = AutoModelForImageSegmentation.from_pretrained(name, trust_remote_code=True).to(dev).eval()
    if dev != "cpu":
        m = m.half()
    return m, dev


MEAN = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
STD = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)


def predict(model, dev, frames: np.ndarray, size: int) -> np.ndarray:
    """frames (b, h, w, 3) uint8 -> mattes (b, h, w) float32 0..1"""
    b, h, w, _ = frames.shape
    x = torch.from_numpy(frames).permute(0, 3, 1, 2).float() / 255
    x = torch.nn.functional.interpolate(x, size=(size, size), mode="bilinear", align_corners=False)
    x = ((x - MEAN) / STD).to(dev)
    if dev != "cpu":
        x = x.half()
    with torch.inference_mode():
        y = model(x)[-1].sigmoid().float()
    y = torch.nn.functional.interpolate(y, size=(h, w), mode="bilinear", align_corners=False)
    return y[:, 0].cpu().numpy()


def run_shot(model, dev, src, fps, crop, width, a, b, size, out_webm: Path, out_matte: Path):
    vf = []
    if crop:
        vf.append("crop={}:{}:{}:{}".format(*crop))
    cw, ch = (crop[0], crop[1]) if crop else (None, None)
    if width:
        vf.append(f"scale={width}:-2:flags=lanczos")
    vf.append("format=rgb24")
    if not (cw and width):
        raise SystemExit("jobs need both crop and width")
    w, h = width, int(round(width * ch / cw / 2) * 2)
    fb = w * h * 3
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-nostdin", "-ss", f"{a:.4f}", "-i", src, "-t", f"{b - a:.4f}",
                            "-vf", ",".join(vf), "-r", fps, "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-nostdin", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
                            "-s", f"{w}x{h}", "-r", fps, "-i", "-", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
                            "-b:v", "0", "-crf", "24", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1",
                            "-auto-alt-ref", "0", str(out_webm)], stdin=subprocess.PIPE)
    encm = subprocess.Popen(["ffmpeg", "-v", "error", "-nostdin", "-y", "-f", "rawvideo", "-pix_fmt", "gray",
                             "-s", f"{w}x{h}", "-r", fps, "-i", "-", "-c:v", "libx264", "-crf", "16",
                             "-preset", "veryfast", "-pix_fmt", "yuv420p", "-g", "12", str(out_matte)],
                            stdin=subprocess.PIPE)
    prev = None
    n = 0
    batch = []
    stats = []

    def flush(batch):
        nonlocal prev, n
        frames = np.stack(batch)
        mats = predict(model, dev, frames, size)
        for f, m in zip(frames, mats):
            # temporal EMA, but let big changes through at once (fast motion)
            if prev is not None:
                diff = np.abs(m - prev).mean()
                k = 0.45 if diff < 0.06 else 0.0
                m = k * prev + (1 - k) * m
            prev = m
            m8 = (np.clip((m - 0.08) / 0.84, 0, 1) * 255).astype(np.uint8)
            rgba = np.dstack([f, m8])
            enc.stdin.write(rgba.tobytes())
            encm.stdin.write(m8.tobytes())
            stats.append(subject_stats(m))
            n += 1

    while True:
        buf = dec.stdout.read(fb)
        if len(buf) < fb:
            break
        batch.append(np.frombuffer(buf, np.uint8).reshape(h, w, 3))
        if len(batch) == 2:
            flush(batch)
            batch = []
    if batch:
        flush(batch)
    dec.wait()
    for p in (enc, encm):
        p.stdin.close()
        p.wait()
    out_webm.with_suffix("").with_suffix(".stats.json").write_text(json.dumps(stats))
    return n, (w, h)


def subject_stats(m: np.ndarray) -> list:
    """[cx, cy, area, x0, y0, x1, y1] of the matte as fractions of the frame (centre if empty)."""
    h, w = m.shape
    small = m[:: max(1, h // 60), :: max(1, w // 140)]
    area = float(small.mean())
    if area < 0.004:
        return [0.5, 0.5, 0.0, 0.5, 0.5, 0.5, 0.5]
    ys, xs = np.mgrid[0 : small.shape[0], 0 : small.shape[1]]
    tot = small.sum()
    cx = float((xs * small).sum() / tot / small.shape[1])
    cy = float((ys * small).sum() / tot / small.shape[0])
    on = small > 0.5
    if on.any():
        yy, xx = np.where(on)
        box = [xx.min() / small.shape[1], yy.min() / small.shape[0], (xx.max() + 1) / small.shape[1], (yy.max() + 1) / small.shape[0]]
    else:
        box = [cx, cy, cx, cy]
    return [round(v, 4) for v in [cx, cy, area, *box]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs", type=Path)
    ap.add_argument("--model", choices=["lite", "full"], default="lite")
    ap.add_argument("--size", type=int, default=1024)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", help="comma-separated shot ids")
    args = ap.parse_args()
    job = json.loads(args.jobs.read_text())
    out = Path(job["out"])
    out.mkdir(parents=True, exist_ok=True)
    man_p = out / ".ranges.json"
    man = json.loads(man_p.read_text()) if man_p.exists() else {}
    src = job["src"]
    fps = job.get("fps") or probe_fps(src)
    key_extra = [job.get("crop"), job.get("width"), args.model, args.size]
    todo = []
    only = set(args.only.split(",")) if args.only else None
    for sid, (a, b) in job["shots"].items():
        if only and sid not in only:
            continue
        rec = [a, b, *key_extra]
        if not args.force and man.get(sid) == rec and (out / f"{sid}.webm").exists():
            continue
        todo.append((sid, a, b, rec))
    if not todo:
        log(f"[matte] {len(job['shots'])} up to date")
        return
    log(f"[matte] loading BiRefNet ({args.model}) ...")
    model, dev = load_model(args.model)
    t0 = time.time()
    total = 0
    for k, (sid, a, b, rec) in enumerate(todo):
        t1 = time.time()
        n, (w, h) = run_shot(model, dev, src, fps, job.get("crop"), job.get("width"), a, b, args.size,
                             out / f"{sid}.webm", out / f"{sid}.matte.mp4")
        total += n
        man[sid] = rec
        man_p.write_text(json.dumps(man, indent=1))
        log(f"  [{k + 1}/{len(todo)}] {sid}: {n} frames {w}x{h} in {time.time() - t1:.1f}s")
    log(f"[matte] {total} frames in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
