#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["numpy>=1.26", "librosa>=0.10"]
# ///
"""Where the drums go full speed (make-anime-music-video): onsets in the drum stem, counted per bar.

    uv run --script scripts/amv-drums.py <slug>

Reads projects/<slug>/analysis/stems/drums.wav (the analyze step's Demucs stems) and video/timing.json
(the beat grid). Prints a bar-by-bar chart (onsets per bar, loudness) and writes
analysis/drummap.json: { bars: [{beat, t, onsets, level}], onsets: [s, ...] }. scripts/amv-index.py
copies the onsets into video/timing.json as `hits`: the fast sections cut on them (c.hitsIn, seqAt)
and the bass punches land on them. A bar with 6+ onsets at level 0.4+ is a fill; a run of them is a
full-speed section.
"""
import json
import sys
from pathlib import Path

import librosa
import numpy as np

proj = Path(__file__).resolve().parent.parent / "projects" / sys.argv[1]
t = json.load(open(proj / 'video/timing.json'))
beats = np.array(t['beats']); bpm = t['bpm']
y, sr = librosa.load(proj / 'analysis/stems/drums.wav', sr=22050, mono=True)
hop = 256
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
on = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop, units='time', backtrack=False, delta=0.08)
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
tt = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
# per bar of 4 beats: onsets, loudness
rows = []
for i in range(0, len(beats) - 4, 4):
    a, b = beats[i], beats[i + 4]
    n = int(((on >= a) & (on < b)).sum())
    r = float(rms[(tt >= a) & (tt < b)].mean()) if ((tt >= a) & (tt < b)).any() else 0
    rows.append((i, a, b, n, r))
rmax = max(r for *_, r in rows)
out = []
for i, a, b, n, r in rows:
    lvl = r / rmax
    out.append({'beat': i, 't': round(a, 2), 'onsets': n, 'level': round(lvl, 3)})
    print(f'{i:4d} {int(a//60)}:{a%60:05.2f}  on/bar {n:3d}  lvl {lvl:4.2f}  ' + '#' * n + ('  ' + '=' * int(lvl * 20)))
json.dump({'bars': out, 'onsets': [round(float(x), 3) for x in on]}, open(proj / 'analysis/drummap.json', 'w'))
