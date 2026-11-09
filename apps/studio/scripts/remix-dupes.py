# /// script
# dependencies = ["pillow", "numpy"]
# ///
"""dupes.py <project> — shots that show the same footage across sources (fan edits reuse film shots).
Each shot's keyframes (footage-<id>/frames, 480 px) → a 16×9 grey thumbnail, normalised; two shots are copies
when any pair of their keyframes match (mean abs diff of the normalised thumbs < threshold). Writes
video/dupes.json: { shot: [copies…] } and prints the groups."""
import json, sys, glob, os
import numpy as np
from PIL import Image

proj = sys.argv[1]
TH = float(sys.argv[2]) if len(sys.argv) > 2 else 0.16
remix = json.load(open(f'{proj}/video/remix.json'))
vecs, owner = [], []
for src in remix['sources']:
    seg = json.load(open(f"{proj}/{src['segregation']}"))
    fdir = os.path.join(proj, os.path.dirname(src['segregation']), 'frames')
    crop = src.get('crop')  # [w, h, x, y] in source pixels
    vw, vh = seg['video'].get('width', 1920), seg['video'].get('height', 1080)
    for sh in seg['shots']:
        if sh.get('kind') not in (None, 'picture'):
            continue
        sid = src['prefix'] + sh['id'][2:]
        for kf in sh.get('keyframes', []):
            fp = os.path.join(fdir, f'f{kf:07d}.jpg')
            if not os.path.exists(fp):
                continue
            im = Image.open(fp).convert('L')
            if crop:
                sx, sy = im.width / vw, im.height / vh
                cw, ch, cx, cy = crop
                im = im.crop((int(cx * sx), int(cy * sy), int((cx + cw) * sx), int((cy + ch) * sy)))
            a = np.asarray(im.resize((32, 14)), dtype=np.float32)
            if a.std() < 6:  # black / flat frames match everything
                continue
            a = (a - a.mean()) / (a.std() + 1e-6)
            vecs.append(a.ravel()); owner.append(sid)
V = np.stack(vecs)
own = np.array(owner)
pre = np.array([o[:2] for o in owner])
groups = {}
for i in range(len(V)):
    d = np.abs(V - V[i]).mean(axis=1) / 2.0
    hit = (d < TH) & (pre != pre[i])
    for j in np.nonzero(hit)[0]:
        groups.setdefault(own[i], set()).add(own[j])
out = {k: sorted(v) for k, v in sorted(groups.items())}
json.dump(out, open(f'{proj}/video/dupes.json', 'w'), indent=1)
seen = set()
for k, v in out.items():
    if k in seen:
        continue
    g = sorted({k, *v}); seen.update(g)
    print(' = '.join(g))
print(len(out), 'shots have a copy in another source')
