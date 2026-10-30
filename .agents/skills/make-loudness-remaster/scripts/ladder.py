"""Loudness ladder from a song's own mix: a gain-only copy with peaks at -1 dBTP, then one file per
target loudness made with a single limiter (REAPER's ReaLimit) and nothing else.

usage: ladder.py <mix.wav> <out dir> <title> [--targets=-11,-10,-9,-8]

Writes into <out dir>:
  <title> - original <N> LUFS (level-matched).wav   gain only, the mix untouched
  <title> - original <N> LUFS.wav                   one per target, limiter only
  <title> - original louder.rpp                     the REAPER session, left on the last target
Run it again with other targets to add steps: the session is reused and existing files are kept.
Each step is re-rendered until it measures within 0.15 LU of its target. When ReaLimit stalls short
of a target it retries with a faster release (still a limiter only); the file is named after what
it measures, never after what was asked.
"""
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from remaster_lib import lufs, open_session, render, sample_rate, save, set_limiter, true_peak  # noqa: E402

CEILING = -1.5        # ReaLimit's ceiling is a sample peak; -1.5 keeps the true peak at -1.0 or lower
RELEASES = (40, 80, 150)   # dB/s; 40 is the cleanest, faster ones get past the stall near -8.7

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--"))
mix, out, title = Path(args[0]), Path(args[1]), args[2]
targets = [float(t) for t in opts.get("targets", "-11,-10,-9,-8").split(",")]
out.mkdir(parents=True, exist_ok=True)
rpp = out / f"{title} - original louder.rpp"
rate = sample_rate(mix)
scratch = out / ".ladder-temp"
scratch.mkdir(exist_ok=True)

L0, T0 = lufs(mix), true_peak(mix)
print(f"original: {L0:.1f} LUFS, {T0:.1f} dBTP")

# 1. gain only: the original, turned up until its peaks reach -1.0 dBTP
gain = -1.0 - T0
matched = out / f"{title} - original {round(L0 + gain)} LUFS (level-matched).wav"
if any(out.glob(f"{title} - original * LUFS (level-matched).wav")):
    print("level-matched copy already there")
else:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-n", "-i", str(mix),
                    "-af", f"volume={gain:.2f}dB", "-c:a", "pcm_s24le", "-ar", str(rate), str(matched)],
                   check=True)
    print(f"{matched.name}: +{gain:.1f} dB, {lufs(matched):.1f} LUFS")

# 2. limiter-only steps
open_session(rpp, mix)
last_settings = None
for target in targets:
    if target < L0 + gain - 0.3:     # quieter than the untouched gain-only copy: nothing to gain
        print(f"{target:g}: skipped, the level-matched copy is already {L0 + gain:.1f} LUFS")
        continue
    best = None                      # (lufs, tp, threshold, ceiling, release, file)
    for release in RELEASES:
        threshold, ceiling, previous = CEILING - (target - L0), CEILING, None
        for attempt in range(10):
            set_limiter(threshold, ceiling, release)
            temp = scratch / f"try{target:g}-r{release}-{attempt}.wav"
            temp.unlink(missing_ok=True)     # a temp left by an interrupted run
            render(temp, rate)
            L, T = lufs(temp), true_peak(temp)
            if T > -1.0:             # peaks between samples: lower the ceiling a little and retry
                ceiling -= 0.3
                continue
            if best is None or abs(L - target) < abs(best[0] - target):
                best = (L, T, threshold, ceiling, release, temp)
            if abs(L - target) <= 0.15 or (previous is not None and abs(L - previous) < 0.05):
                break
            previous = L
            threshold -= (target - L) * 1.3
        if best and abs(best[0] - target) <= 0.15:
            break
        if best and release != RELEASES[-1]:
            print(f"  {target:g}: ReaLimit at release {release} dB/s stops at {best[0]:.2f} LUFS, trying faster")
    if best is None:
        print(f"{target:g}: no render kept its true peak at -1.0 dBTP or lower, skipped")
        continue
    L, T, threshold, ceiling, release, temp = best
    final = out / f"{title} - original {round(L)} LUFS.wav"
    if final.exists():
        print(f"{final.name} already there, kept")
    else:
        shutil.move(temp, final)
        print(f"{final.name}: {L:.2f} LUFS, {T:.1f} dBTP "
              f"(ReaLimit threshold {threshold:.2f}, ceiling {ceiling:.1f}, release {release})")
    last_settings = (threshold, ceiling, release)

if last_settings:
    set_limiter(*last_settings)
    save()
shutil.rmtree(scratch, ignore_errors=True)
