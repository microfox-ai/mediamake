# Each shot's camera motion, for match cuts (user, 2026-10-28: "use shots that make you feel continuity, like if
# the shot is a left pan and the next shot is also a left pan, and you align the subject, you get a good match
# cut"). Decodes the source once at 192x108, 12 fps, gray; for every shot of <seg>/segregation.json takes the
# dense optical flow (Farneback) between consecutive frames of its middle 80 % and writes <seg>/motion.json:
#   { sh0012: { dx, dy, zoom, mag, dir } }   dx/dy: median flow in frame widths/heights per second (the picture
#   moving right/down is +; a camera panning left moves the picture right), zoom: mean outward flow (+ pushes
#   in), dir: 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'push-in' | 'pull-out' | 'still'.
# usage: python motion.py <video> <segregation folder>
import sys, json, subprocess
import numpy as np, cv2
video, seg = sys.argv[1], sys.argv[2]
W, H, FPS = 192, 108, 12
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-vf', f'fps={FPS},scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W)
d = json.load(open(f'{seg}/segregation.json'))
yy, xx = np.mgrid[0:H, 0:W]
rx, ry = (xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)
out = {}
for s in d['shots']:
    a, b = s['start'] + 0.1 * s['duration'], s['end'] - 0.1 * s['duration']
    i0, i1 = int(a * FPS), int(b * FPS)
    i1 = min(i1, len(frames) - 1)
    if i1 - i0 < 1:
        continue
    dxs, dys, zs = [], [], []
    for i in range(i0, i1):
        f = cv2.calcOpticalFlowFarneback(frames[i], frames[i + 1], None, 0.5, 3, 15, 3, 5, 1.2, 0)
        dxs.append(np.median(f[..., 0]) / W * FPS)
        dys.append(np.median(f[..., 1]) / H * FPS)
        zs.append(float(np.mean(f[..., 0] * rx + f[..., 1] * ry)) / (W / 2) * FPS)
    dx, dy, z = float(np.median(dxs)), float(np.median(dys)), float(np.median(zs))
    mag = (dx * dx + dy * dy) ** 0.5
    if abs(z) > max(0.06, mag):
        dir_ = 'push-in' if z > 0 else 'pull-out'
    elif mag < 0.05:
        dir_ = 'still'
    elif abs(dx) >= abs(dy):
        dir_ = 'pan-left' if dx > 0 else 'pan-right'  # the picture slides right when the camera pans left
    else:
        dir_ = 'tilt-up' if dy > 0 else 'tilt-down'
    out[s['id']] = {'dx': round(dx, 3), 'dy': round(dy, 3), 'zoom': round(z, 3), 'mag': round(mag, 3), 'dir': dir_}
json.dump(out, open(f'{seg}/motion.json', 'w'), indent=1)
from collections import Counter
print(seg, len(out), 'shots', dict(Counter(v['dir'] for v in out.values())))
