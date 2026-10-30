"""Compare masters side by side: loudness, true peak, build-up, stereo and tone balance.

usage: measure.py <file.wav> [<file.wav> ...]

Columns:
  LUFS   integrated loudness (YouTube and Spotify turn everything down to about -14)
  TP     true peak in dBTP (keep it at -1.0 or lower)
  LRA    loudness range: how much the song builds from its quiet to its loud parts
  PLR    peak to loudness ratio: punch; it shrinks as a limiter works harder
  corr   left/right correlation (1 = mono, 0 = very wide, below 0 = phase trouble)
  mono   loudness change when played in mono (phone speakers)
  sub low mid pres air   each band in dB against the mids (20-60, 60-250, 250-2k, 2k-6k, 6k-16k Hz)
"""
import re
import subprocess
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf


def lra_and_tp(path):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    tail = out[out.rfind("Summary:"):]
    return (float(re.search(r"LRA:\s+([-+\d.]+)", tail).group(1)),
            float(re.search(r"Peak:\s+([-+\d.]+)", tail).group(1)))


def bands(m, sr):
    n = 8192
    spec = np.zeros(n // 2 + 1)
    for i in range(0, len(m) - n, n * 4):
        spec += np.abs(np.fft.rfft(m[i:i + n] * np.hanning(n))) ** 2
    f = np.fft.rfftfreq(n, 1 / sr)
    level = {k: 10 * np.log10(spec[(f >= a) & (f < b)].sum() + 1e-20)
             for a, b, k in [(20, 60, "sub"), (60, 250, "low"), (250, 2000, "mid"),
                             (2000, 6000, "pres"), (6000, 16000, "air")]}
    return {k: round(v - level["mid"], 1) for k, v in level.items()}


print(f"{'file':40}{'LUFS':>7}{'TP':>7}{'LRA':>6}{'PLR':>6}{'corr':>6}{'mono':>7}"
      f"   sub   low   mid  pres   air")
for p in sys.argv[1:]:
    x, sr = sf.read(p, always_2d=True)
    meter = pyln.Meter(sr)
    L = meter.integrated_loudness(x)
    mono = meter.integrated_loudness(np.repeat(x.mean(1, keepdims=True), 2, 1)) - L
    lra, tp = lra_and_tp(p)
    corr = np.corrcoef(x[:, 0], x[:, 1])[0, 1]
    b = bands(x.mean(1), sr)
    name = p.rsplit("/", 1)[-1][:39]
    print(f"{name:40}{L:>7.1f}{tp:>7.1f}{lra:>6.1f}{tp - L:>6.1f}{corr:>6.2f}{mono:>7.1f}  "
          + " ".join(f"{b[k]:>5}" for k in ("sub", "low", "mid", "pres", "air")))
