#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["numpy>=1.26", "pillow>=10.1", "torch>=2.4", "torchvision>=0.19", "transformers>=4.45,<5",
#                 "timm>=1.0", "kornia>=0.7", "einops>=0.8", "opencv-python-headless>=4.9"]
# ///
"""Match cuts for an anime music video (make-anime-music-video): the subject's shape and the eyes in
every shot's first, middle and last keyframe, then the shot pairs that line up across a cut.

    uv run --script scripts/amv-match.py <slug> [--skip=stn] [--sheet=40]

Reads projects/<slug>/video/footage.json (packs and shots) and each pack's analyze-video keyframes
(projects/<slug>/footage/<pack>/frames, 480 px). Per keyframe: BiRefNet-lite matte → area, centroid,
box, tilt (second moments) and a normalised silhouette; the eyes as pairs of saturated cyan-blue blobs in
the top of the subject (Gojo's Six Eyes; other characters need their own colour, --eye-hue).

Writes projects/<slug>/video/match.json:
  shots: { "<pack>:<n>": { "first"|"mid"|"last": { area, cx, cy, box, tilt, eyes } } }
  dups:  shots that are the same footage in two packs (or twice in one): the cut's repeat check uses it
  shape: top end→start pairs (silhouettes that overlap once centred and scaled, with the zoom and shift
         the incoming shot needs; different pictures only), eyes: top eye-line pairs (eye midpoint +
         spacing), and sheets research/match/shape_*.jpg / eyes_*.jpg (A | B | both overlaid).
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MEAN = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
STD = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
CANON = 48  # side of the normalised silhouette


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


def describe(img: np.ndarray, m: np.ndarray, hue: tuple[int, int]):
    """descriptors of one keyframe: the subject's shape and the eyes"""
    h, w = m.shape
    mb = m > 0.5
    area = float(mb.mean())
    d = {"area": round(area, 4), "cx": 0.5, "cy": 0.5, "box": [0.5, 0.5, 0.5, 0.5], "tilt": 0.0, "eyes": None}
    canon = np.zeros((CANON, CANON), np.float32)
    if area < 0.01:
        return d, canon
    ys, xs = np.nonzero(mb)
    cx, cy = xs.mean() / w, ys.mean() / h
    d["cx"], d["cy"] = round(float(cx), 4), round(float(cy), 4)
    d["box"] = [round(float(xs.min() / w), 4), round(float(ys.min() / h), 4), round(float(xs.max() / w), 4), round(float(ys.max() / h), 4)]
    mu = np.cov(np.stack([xs / w * (w / h), ys / h]))
    d["tilt"] = round(float(np.degrees(0.5 * np.arctan2(2 * mu[0, 1], mu[0, 0] - mu[1, 1]))), 1)
    # normalised silhouette: centred on the centroid, scaled so the subject's area is fixed
    s = np.sqrt(area) * 2.2
    M = np.float32([[CANON / (s * h), 0, CANON / 2 - CANON / (s * h) * cx * w], [0, CANON / (s * h), CANON / 2 - CANON / (s * h) * cy * h]])
    canon = cv2.warpAffine(m.astype(np.float32), M, (CANON, CANON), flags=cv2.INTER_AREA)
    # eyes: saturated blobs of the iris colour in the upper part of the subject
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    hh, ss, vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    top = ys.min() + 0.6 * (ys.max() - ys.min())
    iris = (hh >= hue[0]) & (hh <= hue[1]) & (ss > 90) & (vv > 120) & (m > 0.4)
    iris[int(top):, :] = False
    n, _, st, cen = cv2.connectedComponentsWithStats(iris.astype(np.uint8), 8)
    # irises in an extreme close-up are big: up to 8 % of the frame each
    blobs = [(cen[i][0] / w, cen[i][1] / h, st[i][4]) for i in range(1, n) if 6 <= st[i][4] <= 0.08 * h * w]
    blobs.sort(key=lambda b: -b[2])
    best = None
    for i in range(min(6, len(blobs))):
        for j in range(i + 1, min(6, len(blobs))):
            a, b = blobs[i], blobs[j]
            dx, dy = abs(a[0] - b[0]) * w / h, abs(a[1] - b[1])
            ratio = min(a[2], b[2]) / max(a[2], b[2])
            if 0.03 < dx < 0.6 and dy < 0.35 * dx + 0.02 and ratio > 0.25:
                score = (a[2] + b[2]) * ratio
                if not best or score > best[0]:
                    best = (score, a, b)
    if best:
        _, a, b = best
        l, r = (a, b) if a[0] < b[0] else (b, a)
        d["eyes"] = [round(float(v), 4) for v in (l[0], l[1], r[0], r[1])]
    elif blobs and blobs[0][2] > 0.0006 * h * w:
        # one big iris (an extreme close-up)
        d["eyes"] = [round(float(blobs[0][0]), 4), round(float(blobs[0][1]), 4)]
    return d, canon


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--skip", default="stn")
    ap.add_argument("--sheet", type=int, default=40)
    ap.add_argument("--eye-hue", default="85,110", help="OpenCV hue range (0-180) of the iris; Gojo's cyan-blue = 85,110")
    args = ap.parse_args()
    proj = ROOT / "projects" / args.slug
    footage = json.loads((proj / "video/footage.json").read_text())
    skip = set(args.skip.split(","))
    hue = tuple(int(v) for v in args.eye_hue.split(","))
    model, dev = load_model()
    shots, canons, frames_of, thumbs = {}, {}, {}, {}
    for pack, meta in footage.items():
        if pack in skip or not isinstance(meta, dict):
            continue
        seg = json.loads((proj / "footage" / pack / "segregation.json").read_text())
        fdir = proj / "footage" / pack / "frames"
        for k, sh in enumerate(seg["shots"], start=1):
            kf = [f for f in sh.get("keyframes", []) if (fdir / f"f{f:07d}.jpg").exists()]
            if not kf:
                continue
            picks = {"first": kf[0], "mid": kf[len(kf) // 2], "last": kf[-1]}
            imgs = {p: np.asarray(Image.open(fdir / f"f{f:07d}.jpg").convert("RGB")) for p, f in picks.items()}
            batch = np.stack([imgs[p] for p in picks])
            mats = predict(model, dev, batch)
            key = f"{pack}:{k}"
            shots[key] = {}
            for (p, f), m in zip(picks.items(), mats):
                d, c = describe(imgs[p], m, hue)
                d["frame"] = f
                # how bright the frame is (0..1): captions over bright frames get a dark pool under them
                d["luma"] = round(float(cv2.cvtColor(imgs[p], cv2.COLOR_RGB2GRAY).mean()) / 255, 3)
                shots[key][p] = d
                canons[(key, p)] = c
                frames_of[(key, p)] = fdir / f"f{f:07d}.jpg"
                # a small normalised grey picture: the same footage in two packs correlates near 1
                g = cv2.resize(cv2.cvtColor(imgs[p], cv2.COLOR_RGB2GRAY), (48, 27), interpolation=cv2.INTER_AREA).astype(np.float32).ravel()
                g -= g.mean()
                thumbs[(key, p)] = g / (np.linalg.norm(g) + 1e-6)
        log(f"{pack}: {len(seg['shots'])} shots")

    keys = list(shots)
    # the same footage twice: any keyframe of one shot correlating with any keyframe of another
    kf = [(k, p) for k in keys for p in ("first", "mid", "last")]
    T = np.stack([thumbs[x] for x in kf])
    ncc = T @ T.T
    same: dict[tuple[str, str], float] = {}
    ii, jj = np.nonzero(np.triu(ncc > 0.9, 1))
    for i, j in zip(ii, jj):
        a, b = kf[i][0], kf[j][0]
        if a != b:
            pair = tuple(sorted((a, b)))
            same[pair] = max(same.get(pair, 0.0), float(ncc[i, j]))
    dups = [{"a": a, "b": b, "ncc": round(v, 3)} for (a, b), v in sorted(same.items())]
    dupset = set(same)
    is_dup = lambda a, b: tuple(sorted((a, b))) in dupset
    log(f"dups: {len(dups)} shot pairs show the same footage")
    # silhouette pairs: A's last frame against B's first frame
    A = np.stack([canons[(k, "last")].ravel() for k in keys])
    B = np.stack([canons[(k, "first")].ravel() for k in keys])
    inter = A @ B.T
    union = A.sum(1)[:, None] + B.sum(1)[None, :] - inter
    iou = np.where(union > 1e-6, inter / np.maximum(union, 1e-6), 0)
    pairs = []
    for i, a in enumerate(keys):
        da = shots[a]["last"]
        # a subject filling the frame has no shape to match (close-ups match on the eyes instead)
        if not 0.02 < da["area"] < 0.75:
            continue
        for j, b in enumerate(keys):
            if a.split(":")[0] == b.split(":")[0] and abs(int(a.split(":")[1]) - int(b.split(":")[1])) <= 1:
                continue
            if a == b or is_dup(a, b):
                continue
            db = shots[b]["first"]
            if not 0.02 < db["area"] < 0.75:
                continue
            # the same picture is a repeat, not a match: the shapes must line up in different frames
            if float(thumbs[(a, "last")] @ thumbs[(b, "first")]) > 0.75:
                continue
            k = float(np.sqrt(da["area"] / db["area"]))  # zoom the incoming shot needs
            if not 0.62 < k < 1.7:
                continue
            pairs.append({"a": a, "b": b, "iou": round(float(iou[i, j]), 3), "zoom": round(k, 3),
                          "shift": [round(da["cx"] - (0.5 + (db["cx"] - 0.5) * k), 3), round(da["cy"] - (0.5 + (db["cy"] - 0.5) * k), 3)],
                          "tilt": round(da["tilt"] - db["tilt"], 1)})
    pairs.sort(key=lambda p: -(p["iou"] - 0.15 * abs(np.log(p["zoom"])) - 0.2 * (abs(p["shift"][0]) + abs(p["shift"][1]))))
    # keep a few per outgoing shot
    seen, shape = {}, []
    for p in pairs:
        if seen.get(p["a"], 0) >= 3:
            continue
        seen[p["a"]] = seen.get(p["a"], 0) + 1
        shape.append(p)
    shape = shape[:300]
    # eye-line pairs: any two frames whose eyes can be laid on each other
    eyed = [(k, p) for k in keys for p in ("first", "mid", "last") if shots[k][p]["eyes"] and len(shots[k][p]["eyes"]) == 4]
    eyes = []
    for i, (ka, pa) in enumerate(eyed):
        ea = shots[ka][pa]["eyes"]
        sa = np.hypot((ea[2] - ea[0]) * 16 / 9, ea[3] - ea[1])
        for kb, pb in eyed[i + 1:]:
            if ka == kb or is_dup(ka, kb) or float(thumbs[(ka, pa)] @ thumbs[(kb, pb)]) > 0.75:
                continue
            eb = shots[kb][pb]["eyes"]
            sb = np.hypot((eb[2] - eb[0]) * 16 / 9, eb[3] - eb[1])
            k = sa / sb
            if not 0.6 < k < 1.7:
                continue
            ma, mb_ = ((ea[0] + ea[2]) / 2, (ea[1] + ea[3]) / 2), ((eb[0] + eb[2]) / 2, (eb[1] + eb[3]) / 2)
            ang = np.degrees(np.arctan2(ea[3] - ea[1], (ea[2] - ea[0]) * 16 / 9) - np.arctan2(eb[3] - eb[1], (eb[2] - eb[0]) * 16 / 9))
            eyes.append({"a": ka, "pa": pa, "b": kb, "pb": pb, "spacing": round(float(sa), 3), "zoom": round(float(k), 3),
                         "shift": [round(ma[0] - (0.5 + (mb_[0] - 0.5) * k), 3), round(ma[1] - (0.5 + (mb_[1] - 0.5) * k), 3)],
                         "tilt": round(float(ang), 1)})
    eyes.sort(key=lambda e: abs(np.log(e["zoom"])) + abs(e["shift"][0]) + abs(e["shift"][1]) + abs(e["tilt"]) / 60)
    # one eye pair per shot pair, and no shot more than 4 times: a list to choose runs from
    best, uses, picked = set(), {}, []
    for e in eyes:
        pair = tuple(sorted((e["a"], e["b"])))
        if pair in best or uses.get(e["a"], 0) >= 4 or uses.get(e["b"], 0) >= 4:
            continue
        best.add(pair)
        uses[e["a"]] = uses.get(e["a"], 0) + 1
        uses[e["b"]] = uses.get(e["b"], 0) + 1
        picked.append(e)
    eyes = picked
    out = {"shots": shots, "dups": dups, "shape": shape, "eyes": eyes[:300]}
    (proj / "video/match.json").write_text(json.dumps(out))
    log(f"match.json: {len(shots)} shots, {len(dups)} duplicate pairs, {len(eyed)} frames with eyes, {len(shape)} shape pairs, {len(eyes)} eye pairs")

    # review sheets: A | B | A with B laid over it (B moved and zoomed as the pair says)
    sheets = proj / "research/match"
    sheets.mkdir(parents=True, exist_ok=True)

    def card(fa, fb, zoom, shift, title):
        ia = Image.open(fa).convert("RGB").resize((320, 180))
        ib = Image.open(fb).convert("RGB").resize((320, 180))
        z = max(zoom, 1e-3)
        ibz = ib.resize((int(320 * z), int(180 * z)))
        lay = Image.new("RGB", (320, 180))
        ox = int(160 - 160 * z + shift[0] * 320)
        oy = int(90 - 90 * z + shift[1] * 180)
        lay.paste(ibz, (ox, oy))
        over = Image.blend(ia, lay, 0.5)
        c = Image.new("RGB", (966, 200), (17, 17, 17))
        for i, im in enumerate((ia, ib, over)):
            c.paste(im, (2 + i * 322, 18))
        ImageDraw.Draw(c).text((4, 2), title, fill=(255, 220, 60))
        return c

    def sheet(items, name):
        for page in range(0, min(len(items), args.sheet), 10):
            cards = items[page:page + 10]
            s = Image.new("RGB", (966, 200 * len(cards)), (17, 17, 17))
            for r, c in enumerate(cards):
                s.paste(c, (0, 200 * r))
            s.save(sheets / f"{name}_{page // 10 + 1:02d}.jpg", quality=85)

    sheet([card(frames_of[(p["a"], "last")], frames_of[(p["b"], "first")], p["zoom"], p["shift"],
                f"{p['a']} last -> {p['b']} first  iou {p['iou']}  zoom {p['zoom']}  shift {p['shift']}") for p in shape], "shape")
    sheet([card(frames_of[(e["a"], e["pa"])], frames_of[(e["b"], e["pb"])], e["zoom"], e["shift"],
                f"{e['a']} {e['pa']} -> {e['b']} {e['pb']}  zoom {e['zoom']}  shift {e['shift']}  tilt {e['tilt']}") for e in eyes], "eyes")
    log(f"sheets: {sheets.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
