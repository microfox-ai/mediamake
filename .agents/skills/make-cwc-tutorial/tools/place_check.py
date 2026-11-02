"""Check that every voice chunk lands where the timeline puts it, in a rendered episode.

usage: python place_check.py <project dir> <render.mp4> <id>=<seconds> [<id>=<seconds> …]

Cross-correlates each chunk (from input/vo4/vo.json) with the render's audio around its expected
start and prints where it was found and how well it matched. A steady +0.04 s on every line is the
render's own audio delay; anything else means a chunk moved. Run from apps/lyrics_videos with the
analysis venv (it needs numpy and librosa).
"""
import json
import os
import subprocess
import sys
import tempfile

import librosa
import numpy as np

if len(sys.argv) < 4:
    sys.exit(__doc__)
project, video, *pairs = sys.argv[1:]
wav = os.path.join(tempfile.mkdtemp(prefix='cwc-place-'), 'mix.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-ac', '1', '-ar', '16000', wav], check=True)
mix, _ = librosa.load(wav, sr=16000)
chunks = {c['id']: c for c in json.load(open(os.path.join(project, 'input', 'vo4', 'vo.json')))}
for pair in pairs:
    cid, at = pair.split('=')
    at = float(at)
    y, _ = librosa.load(os.path.join(project, 'input', chunks[cid]['file']), sr=16000)
    y = y[: 16000 * 4]  # the first 4 s are enough to find a long read
    a = max(0, int((at - 0.5) * 16000))
    seg = mix[a: a + len(y) + 16000]
    c = np.correlate(seg, y, 'valid')
    k = int(np.argmax(np.abs(c)))
    score = abs(c[k]) / (np.linalg.norm(seg[k: k + len(y)]) * np.linalg.norm(y) + 1e-9)
    print(f'{cid:12s} expected {at:7.2f}  found {(a + k) / 16000:7.2f}  match {score:.2f}')
