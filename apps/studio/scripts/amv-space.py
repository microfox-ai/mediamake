#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["numpy>=1.26", "pillow>=10.1", "torch>=2.4", "torchvision>=0.19", "transformers>=4.45,<5",
#                 "timm>=1.0", "kornia>=0.7", "einops>=0.8", "opencv-python-headless>=4.9"]
# ///
"""The free space under every caption of an anime music video (make-anime-music-video), so the words go
where the picture is not: the subject's cutout (BiRefNet-lite) and the brightness, as coarse grids, from
the picture without its words, at three moments of each caption.

    uv run --script scripts/amv-space.py <slug> [--sheet]

Needs projects/<slug>/analysis/clean/clean.mp4 (the composition rendered with --props='{"clean":true}',
any size) and analysis/captions.json (mm amv <slug> --captions).

Writes projects/<slug>/video/space.json:
  { "cols": 32, "rows": 18, "captions": { "<from, 2 decimals>": { "sub": "<cols*rows digits 0-9>",
    "luma": "<digits 0-9>" } } }
  sub = how much of the cell the subject covers (the most over the three moments), luma = its mean
  brightness. motion.tsx places and sizes each caption in the cells the subject leaves free.
--sheet also writes research/space/sheet_*.jpg: each moment with its grid drawn over it, to check.
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import torch

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(Path(__file__).resolve().parent.parent / "analysis"))
from workspace import workspace_dir  # noqa: E402  (where projects are: analysis/workspace.py)
MEAN = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
STD = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
COLS, ROWS = 32, 18


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def load_model():
    from transformers import AutoModelForImageSegmentation
    dev = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    m = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet_lite", trust_remote_code=True).to(dev).eval()
    if dev != "cpu":
        m = m.half()
    return m, dev


def predict(model, dev, frames: np.ndarray, size=512) -> np.ndarray:
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


def grid(a: np.ndarray, how="mean") -> np.ndarray:
    h, w = a.shape
    out = np.zeros((ROWS, COLS))
    for r in range(ROWS):
        for c in range(COLS):
            cell = a[r * h // ROWS:(r + 1) * h // ROWS, c * w // COLS:(c + 1) * w // COLS]
            out[r, c] = cell.mean()
    return out


def digits(g: np.ndarray) -> str:
    return "".join(str(int(round(min(1, max(0, v)) * 9))) for v in g.flatten())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--sheet", action="store_true")
    a = ap.parse_args()
    d = workspace_dir("projects") / a.slug
    caps = json.loads((d / "analysis/captions.json").read_text())
    cap = cv2.VideoCapture(str(d / "analysis/clean/clean.mp4"))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    # every frame the captions need, read in order once
    want: dict[int, list[tuple[int, int]]] = {}
    for i, c in enumerate(caps):
        span = c["to"] - c["from"]
        ts = [c["from"] + min(0.15, span * 0.2), (c["from"] + c["to"]) / 2, c["to"] - min(0.15, span * 0.2)]
        for k, t in enumerate(ts):
            want.setdefault(min(n - 1, int(round(t * fps))), []).append((i, k))
    frames: dict[int, np.ndarray] = {}
    f = 0
    for target in sorted(want):
        if target < f:
            continue
        cap.set(cv2.CAP_PROP_POS_FRAMES, target) if target - f > 30 else None
        f = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
        img = None
        while f <= target:
            ok, img = cap.read()
            if not ok:
                break
            f += 1
        if img is not None:
            frames[target] = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    log(f"{len(frames)} frames for {len(caps)} captions")
    model, dev = load_model()
    keys = sorted(frames)
    masks: dict[int, np.ndarray] = {}
    for b in range(0, len(keys), 16):
        batch = keys[b:b + 16]
        m = predict(model, dev, np.stack([frames[k] for k in batch]))
        for k, mm in zip(batch, m):
            masks[k] = mm
        log(f"  matted {min(len(keys), b + 16)}/{len(keys)}")
    out = {"cols": COLS, "rows": ROWS, "captions": {}}
    sheets: list[np.ndarray] = []
    for i, c in enumerate(caps):
        sub = np.zeros((ROWS, COLS))
        lum = np.zeros((ROWS, COLS))
        got = 0
        for fi, lst in want.items():
            if not any(x[0] == i for x in lst) or fi not in masks:
                continue
            sub = np.maximum(sub, grid((masks[fi] > 0.5).astype(float)))
            lum += grid(cv2.cvtColor(frames[fi], cv2.COLOR_RGB2GRAY).astype(float) / 255)
            got += 1
            if a.sheet and len(sheets) < 400:
                im = frames[fi].copy()
                h, w = im.shape[:2]
                ov = np.zeros_like(im)
                g = grid((masks[fi] > 0.5).astype(float))
                for r in range(ROWS):
                    for cc in range(COLS):
                        if g[r, cc] > 0.15:
                            ov[r * h // ROWS:(r + 1) * h // ROWS, cc * w // COLS:(cc + 1) * w // COLS] = (255, 0, 120)
                im = cv2.addWeighted(im, 1, ov, 0.45, 0)
                cv2.putText(im, f"{c['from']:.2f} {c['text'][:22]}", (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 0), 1)
                sheets.append(im)
        if got:
            lum /= got
        out["captions"][f"{c['from']:.2f}"] = {"sub": digits(sub), "luma": digits(lum)}
    (d / "video/space.json").write_text(json.dumps(out))
    log(f"video/space.json: {len(out['captions'])} captions, {COLS}x{ROWS} cells")
    if a.sheet and sheets:
        sd = d / "research/space"
        sd.mkdir(parents=True, exist_ok=True)
        h, w = sheets[0].shape[:2]
        for s in range(0, len(sheets), 24):
            tiles = sheets[s:s + 24]
            while len(tiles) % 6:
                tiles.append(np.zeros_like(sheets[0]))
            rows = [np.hstack(tiles[r:r + 6]) for r in range(0, len(tiles), 6)]
            cv2.imwrite(str(sd / f"sheet_{s // 24 + 1:02d}.jpg"), cv2.cvtColor(np.vstack(rows), cv2.COLOR_RGB2BGR))
        log(f"sheets: {sd}")


if __name__ == "__main__":
    main()
