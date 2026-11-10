#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["numpy>=1.26", "pillow>=10.1", "torch>=2.4", "torchvision>=0.19", "transformers>=4.45,<5",
#                 "timm>=1.0", "kornia>=0.7", "einops>=0.8", "opencv-python-headless>=4.9"]
# ///
"""Cut the subject out of a project's picture with BiRefNet (local, Apple GPU, free) and paint them out of the
background, so the plate can be the cover and the cutout a Subject layer over the visualizers.

    uv run --script .agents/skills/make-waveform-lyric-video/tools/cutout.py <project folder>
        [--src input/picture.png] [--model full|lite] [--size 1024] [--matte <grey png>]
        [--keep x0,y0,x1,y1 ...] [--patch cx0,cy0,cx1,cy1:bx0,by0,bx1,by1 ...] [--fill x,y x,y … [--fill-luma 80]]

<project folder>: the project (take it from `mm workspace`: <projects>/<slug>). Writes to its input/cutout/; a cut
already there moves to input/cutout/v<N>/ first (nothing is overwritten):
  subject.png  the picture where the subject is, transparent elsewhere (the picture's size)
  matte.png    the matte as grey
  plate.png    the picture with the subject inpainted away (OpenCV Telea, a thin margin): the background the
               cover shows under the subject layer, so the two can move apart (parallax)
  check.jpg    top: the cutout over a checkerboard | the plate; bottom: the cutout over magenta | the matte.
               Look at it before anyone else does: magenta shows every halo, hole and lost edge

Look at check.jpg's magenta row (and crops of it at full size) before the user does: what is missing there is what
the user will find (Hollow Soul, 2026-11-09: the dark fur at the bottom left, lost against the dark ground: "redo the
cutout its not clean, especially the bottom left"; a lost part has no half-transparent edge for a number to catch,
but on magenta it shows at once). Then:
  --patch  runs the model again on a crop (c…, picture px) where a part it missed reads as part of the subject,
           and adds that matte back only inside the box (b…, picture px)
  --fill   adds the dark pixels inside a polygon (picture px) to the matte: a black glove against a bright sky
  --keep   limits the matte to boxes (fractions of the picture), to drop props the model also picked
  --matte  a matte made elsewhere instead (a grey PNG, resized to the picture): fal's BiRefNet v2 at 2304 px
           (~$0.01, ask first) cut Hollow Soul's dark fur where the local model at 1024 could not
  --src    the picture to cut (default: input/picture.png, else the first picture in input/); a version with the
           user's own mark painted out, when they asked for that
"""
import argparse
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image

MEAN = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
STD = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
OUTPUTS = ["subject.png", "matte.png", "plate.png", "check.jpg"]

_models = {}


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def matte(img: np.ndarray, kind: str, size: int) -> np.ndarray:
    from transformers import AutoModelForImageSegmentation
    name = {"lite": "ZhengPeng7/BiRefNet_lite", "full": "ZhengPeng7/BiRefNet"}[kind]
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    if name not in _models:
        _models[name] = AutoModelForImageSegmentation.from_pretrained(name, trust_remote_code=True).to(dev).eval()
    m = _models[name]
    h, w, _ = img.shape
    x = torch.from_numpy(img).permute(2, 0, 1)[None].float() / 255
    x = torch.nn.functional.interpolate(x, size=(size, size), mode="bilinear", align_corners=False)
    x = ((x - MEAN) / STD).to(dev)
    with torch.inference_mode():
        y = m(x)[-1].sigmoid().float()
    y = torch.nn.functional.interpolate(y.cpu(), size=(h, w), mode="bilinear", align_corners=False)
    return y[0, 0].numpy()


def keep_previous(out: Path):
    """A cut already in input/cutout/ moves to the next v<N>/ before a new one is written."""
    there = [f for f in OUTPUTS if (out / f).exists()]
    if not there:
        return
    n = 1
    while (out / f"v{n}").exists():
        n += 1
    (out / f"v{n}").mkdir()
    for f in there:
        shutil.move(str(out / f), str(out / f"v{n}" / f))
    log(f"the previous cut is now in input/cutout/v{n}/")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--src")
    ap.add_argument("--model", default="full")
    ap.add_argument("--size", type=int, default=1024)
    ap.add_argument("--keep", nargs="*", default=[])
    ap.add_argument("--patch", nargs="*", default=[])
    ap.add_argument("--fill", nargs="*", default=[])
    ap.add_argument("--fill-luma", type=float, default=80)
    ap.add_argument("--matte")
    a = ap.parse_args()

    P = Path(a.project).expanduser().resolve()
    if a.src:
        src = (P / a.src) if not Path(a.src).is_absolute() else Path(a.src)
    else:
        pics = sorted(p for p in (P / "input").glob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
        src = P / "input" / "picture.png" if (P / "input" / "picture.png").exists() else (pics[0] if pics else None)
    if not src or not src.exists():
        sys.exit(f"No picture to cut: pass --src (looked in {P / 'input'})")
    out = P / "input" / "cutout"
    out.mkdir(parents=True, exist_ok=True)
    keep_previous(out)

    img = np.array(Image.open(src).convert("RGB"))
    h, w, _ = img.shape
    if a.matte:
        log(f"{src.name} {w}x{h}, matte from {a.matte}")
        m = np.array(Image.open(a.matte).convert("L").resize((w, h), Image.LANCZOS)).astype(np.float32) / 255
    else:
        log(f"{src.name} {w}x{h}, BiRefNet {a.model} at {a.size}")
        m = matte(img, a.model, a.size)
    if a.keep:
        keep = np.zeros_like(m)
        for box in a.keep:
            x0, y0, x1, y1 = (float(v) for v in box.split(","))
            keep[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 1
        m *= keep
    for spec in a.patch:
        crop, box = spec.split(":")
        cx0, cy0, cx1, cy1 = (int(v) for v in crop.split(","))
        bx0, by0, bx1, by1 = (int(v) for v in box.split(","))
        pm = matte(np.ascontiguousarray(img[cy0:cy1, cx0:cx1]), a.model, a.size)
        full = np.zeros_like(m)
        full[cy0:cy1, cx0:cx1] = pm
        # a feathered box, so the added part blends into what was there
        wbox = np.zeros_like(m)
        wbox[by0:by1, bx0:bx1] = 1
        wbox = cv2.GaussianBlur(wbox, (0, 0), 6)
        m = np.maximum(m, full * wbox)
        log(f"patch {crop} → box {box}")
    if a.fill:
        poly = np.array([[int(v) for v in p.split(",")] for p in a.fill], np.int32)
        inside = np.zeros((h, w), np.uint8)
        cv2.fillPoly(inside, [poly], 1)
        luma = img[..., 0] * 0.2126 + img[..., 1] * 0.7152 + img[..., 2] * 0.0722
        add = (inside & (luma < a.fill_luma)).astype(np.uint8)
        add = cv2.morphologyEx(add, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
        add = cv2.morphologyEx(add, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        add = cv2.GaussianBlur(add.astype(np.float32) * inside, (0, 0), 1.2)
        m = np.maximum(m, add)
        log(f"fill {len(poly)}-point polygon, luma < {a.fill_luma:g}")
    m8 = (np.clip((m - 0.06) / 0.88, 0, 1) * 255).astype(np.uint8)

    Image.fromarray(np.dstack([img, m8])).save(out / "subject.png", optimize=True)
    Image.fromarray(m8).save(out / "matte.png")

    # inpaint at half size (Telea is slow on big holes), then put the original back outside the hole. A thin margin
    # only: a wide one smears dark paint into gaps the subject layer doesn't cover (keep the Subject's depth small)
    hole = cv2.dilate((m8 > 24).astype(np.uint8) * 255, np.ones((13, 13), np.uint8))
    small = cv2.resize(img, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    small_hole = cv2.resize(hole, (w // 2, h // 2), interpolation=cv2.INTER_NEAREST)
    filled = cv2.inpaint(cv2.cvtColor(small, cv2.COLOR_RGB2BGR), small_hole, 12, cv2.INPAINT_TELEA)
    filled = cv2.cvtColor(cv2.resize(filled, (w, h), interpolation=cv2.INTER_CUBIC), cv2.COLOR_BGR2RGB)
    soft = cv2.GaussianBlur(hole, (0, 0), 3).astype(np.float32)[..., None] / 255
    plate = (filled * soft + img * (1 - soft)).astype(np.uint8)
    Image.fromarray(plate).save(out / "plate.png", optimize=True)

    # the check sheet: over a checkerboard | the plate, over magenta | the matte
    tile = ((np.indices((h, w)) // 48).sum(0) % 2 * 60 + 120).astype(np.uint8)
    board = np.dstack([tile] * 3).astype(np.float32)
    al = m8.astype(np.float32)[..., None] / 255
    over = (img * al + board * (1 - al)).astype(np.uint8)
    magenta = (img * al + np.array([255, 0, 255], np.float32) * (1 - al)).astype(np.uint8)
    sheet = np.concatenate([np.concatenate([over, plate], axis=1), np.concatenate([magenta, np.dstack([m8] * 3)], axis=1)], axis=0)
    Image.fromarray(sheet).resize((1920, int(1920 * h / w))).save(out / "check.jpg", quality=88)
    log(f"wrote {out}/subject.png, matte.png, plate.png, check.jpg: look at the magenta row before showing anyone")


if __name__ == "__main__":
    main()
