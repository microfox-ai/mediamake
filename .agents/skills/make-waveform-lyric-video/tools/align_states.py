"""Warp each stage picture (several pictures of one frame, e.g. power stages) onto the reference
stage, so a cut between stages moves nothing but the picture. Similarity transform (scale,
rotation, shift) from ORB matches, estimated at half size and applied at full size.
Reads every input/states/<name>.png, writes input/states/aligned/<name>.png.

Run: uv run --with opencv-python-headless --with numpy python \
       .agents/skills/make-waveform-lyric-video/tools/align_states.py <project dir> [reference stage]
(goten-theme-ost: s1-base, s2-ember, s3-golden, s4-prism, aligned to s3-golden)
"""
import sys
from pathlib import Path

import cv2
import numpy as np

proj = Path(sys.argv[1])
d = proj / 'input' / 'states'
out = d / 'aligned'
out.mkdir(exist_ok=True)
NAMES = sorted(p.stem for p in d.glob('*.png'))
REF = sys.argv[2] if len(sys.argv) > 2 else NAMES[0]

full = {n: cv2.imread(str(d / f'{n}.png'), cv2.IMREAD_UNCHANGED) for n in NAMES}
H, W = full[REF].shape[:2]
half = lambda im: cv2.cvtColor(cv2.resize(im[..., :3], (W // 2, H // 2), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
orb = cv2.ORB_create(8000)
kr, dr = orb.detectAndCompute(half(full[REF]), None)
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
for n in NAMES:
    im = full[n]
    if n == REF:
        cv2.imwrite(str(out / f'{n}.png'), im)
        continue
    k, dsc = orb.detectAndCompute(half(im), None)
    m = sorted(bf.match(dsc, dr), key=lambda x: x.distance)[:1000]
    src = np.float32([k[x.queryIdx].pt for x in m]) * 2
    dst = np.float32([kr[x.trainIdx].pt for x in m]) * 2
    A, inl = cv2.estimateAffinePartial2D(src, dst, ransacReprojThreshold=4)
    s = np.hypot(A[0, 0], A[1, 0])
    print(f'{n}: scale {s:.4f} rot {np.degrees(np.arctan2(A[1, 0], A[0, 0])):.2f} shift ({A[0, 2]:.1f}, {A[1, 2]:.1f}) inliers {int(inl.sum())}')
    # tiny shifts (< 3 px, no scale) aren't worth a resample
    if abs(s - 1) < 0.002 and abs(A[0, 2]) < 3 and abs(A[1, 2]) < 3:
        cv2.imwrite(str(out / f'{n}.png'), im)
        continue
    warped = cv2.warpAffine(im, A, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    cv2.imwrite(str(out / f'{n}.png'), warped)
