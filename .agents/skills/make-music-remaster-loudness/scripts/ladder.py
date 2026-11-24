# /// script
# requires-python = ">=3.9"
# dependencies = ["numpy", "soundfile", "pyloudnorm"]
# ///
"""Loudness ladder from a song's own mix: a gain-only copy with peaks at -1 dBTP, then one file per
target loudness made with a single limiter and nothing else.

usage: ladder.py <mix.wav> <out dir> <title> [--engine=soundcraft|reaper|both] [--targets=-11,-10,-9,-8]

Two engines make the limiter steps, each with its own limiter:
  soundcraft  SoundCraft's Maximizer, through soundcraft-cli (the default). Nothing has to be open; `uv run ladder.py …` is enough.
  reaper      REAPER's ReaLimit. REAPER must be open; run with the reaper-mcp-server tool's Python.
  both        each step from both, side by side in one folder, to compare by ear.

Writes into <out dir>:
  <title> - original <N> LUFS (level-matched).wav     gain only, the mix untouched
  <title> - original <N> LUFS.wav                     one per target, REAPER's (named "… (REAPER).wav" with both)
  <title> - original <N> LUFS (SoundCraft).wav        one per target, SoundCraft's
  <title> - original louder.rpp                       the REAPER session, left on the last target
  <title> - original louder (SoundCraft).steps.txt    SoundCraft's session as a step list, on the last target
  ladder.json                                         which engine and settings made each file
Run it again with other targets, or the other engine, to add steps: existing files are kept.
Each step is re-rendered until it measures within 0.15 LU of its target with its true peak at -1.0
dBTP or lower, both read by the same meters whichever engine made it. When a limiter stalls short of
a target it retries with a faster release (still a limiter only); the file is named after what it
measures, never after what was asked.
"""
import importlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from remaster_lib import lufs, sample_rate, true_peak, true_peak_fast  # noqa: E402

TP_LIMIT = -1.0
TRIES = 10            # renders a step may take at one release before the next release is tried

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
if len(args) < 3:
    sys.exit(__doc__)
mix, out, title = Path(args[0]), Path(args[1]), args[2]
targets = [float(t) for t in opts.get("targets", "-11,-10,-9,-8").split(",")]
choice = opts.get("engine", "soundcraft").lower()
if choice not in ("soundcraft", "reaper", "both"):
    sys.exit("--engine is soundcraft (the default), reaper or both")
names = ["reaper", "soundcraft"] if choice == "both" else [choice]
engines = [importlib.import_module(f"engine_{n}") for n in names]   # fails here, before any work, when one can't run

out.mkdir(parents=True, exist_ok=True)
rate = sample_rate(mix)
scratch = out / ".ladder-temp"
scratch.mkdir(exist_ok=True)
log_path = out / "ladder.json"
log = json.loads(log_path.read_text()) if log_path.exists() else {"schema": "mediamake.remaster-ladder/v1", "files": {}}

L0, T0 = lufs(mix), true_peak(mix)
log.update(mix=mix.name, original={"lufs": round(L0, 2), "truePeak": round(T0, 2)})
print(f"original: {L0:.1f} LUFS, {T0:.1f} dBTP")

# 1. gain only: the original, turned up until its peaks reach -1.0 dBTP
gain = TP_LIMIT - T0
matched = out / f"{title} - original {round(L0 + gain)} LUFS (level-matched).wav"
if any(out.glob(f"{title} - original * LUFS (level-matched).wav")):
    print("level-matched copy already there")
else:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-n", "-i", str(mix),
                    "-af", f"volume={gain:.2f}dB", "-c:a", "pcm_s24le", "-ar", str(rate), str(matched)],
                   check=True)
    Lm = lufs(matched)
    log["files"][matched.name] = {"engine": "gain only", "note": f"gain only, +{gain:.1f} dB, no limiter",
                                  "lufs": round(Lm, 2), "truePeak": round(true_peak(matched), 2)}
    print(f"{matched.name}: +{gain:.1f} dB, {Lm:.1f} LUFS")


def label_of(L):
    # a half step keeps its .5 (round() alone would name -8.5 after -8 and clash with it)
    return f"{round(L)}" if abs(L - round(L)) < 0.25 else f"{round(L * 2) / 2:g}"


# 2. limiter-only steps, one engine after the other
for engine in engines:
    tag = f" ({engine.NAME})" if (choice == "both" or engine.NAME != "REAPER") else ""
    print(f"\n{engine.NAME} ({engine.LIMITER}):")
    engine.start(mix, out, title)
    last_settings = None
    for target in targets:
        if target < L0 + gain - 0.3:     # quieter than the untouched gain-only copy: nothing to gain
            print(f"{target:g}: skipped, the level-matched copy is already {L0 + gain:.1f} LUFS")
            continue
        best = None                      # (lufs, tp, drive, ceiling, release, file)
        for release in engine.RELEASES:
            # drive is the gain into the limiter in dB: it starts at what the target asks of the original
            drive, ceiling, previous = target - L0, engine.CEILING, None
            for attempt in range(TRIES):
                # no dot in the name: REAPER reads "try-8.5-…" as "try-8" with an extension
                step = f"{target:g}".replace(".", "p")
                temp = scratch / f"try{step}-{engine.NAME.lower()}-r{release}-{attempt}.wav"
                temp.unlink(missing_ok=True)     # a temp left by an interrupted run
                engine.render(drive, ceiling, release, temp, rate)
                L, T = lufs(temp), true_peak_fast(temp)
                over = T - (TP_LIMIT - 0.05)     # the fast reading has one decimal: -1.1 or lower passes
                if over > 0:
                    # peaks between samples: lower the ceiling by what it is over, and drive the limiter
                    # that much harder so the level holds, then render again
                    down = max(0.1, round(over + 0.05, 2))
                    ceiling -= down
                    drive += down
                    previous = None
                    continue
                if best is None or abs(L - target) < abs(best[0] - target):
                    best = (L, T, drive, ceiling, release, temp)
                if abs(L - target) <= 0.15:
                    break
                # how much louder a dB of drive made it, from the last two renders; a limiter that is
                # working hard gives back less and less
                slope = 0.77 if previous is None else (L - previous[1]) / (drive - previous[0]) if drive != previous[0] else 0
                if previous is not None and (slope < 0.08 or drive >= engine.MAX_DRIVE):
                    break                        # stalled: more drive no longer makes it louder
                previous = (drive, L)
                drive = min(drive + (target - L) / min(max(slope, 0.2), 1.0), engine.MAX_DRIVE)
            if best and abs(best[0] - target) <= 0.15:
                break
            if best and release != engine.RELEASES[-1]:
                print(f"  {target:g}: {engine.LIMITER} at release {release} {engine.RELEASE_UNIT} stops at {best[0]:.2f} LUFS, trying faster")
        if best is None:
            print(f"{target:g}: no render kept its true peak at {TP_LIMIT} dBTP or lower, skipped")
            continue
        L, _, drive, ceiling, release, temp = best
        T = true_peak(temp)              # the exact reading, for the record
        final = out / f"{title} - original {label_of(L)} LUFS{tag}.wav"
        if final.exists():
            print(f"{final.name} already there, kept")
        else:
            shutil.move(temp, final)
            log["files"][final.name] = {"engine": engine.NAME, "limiter": engine.LIMITER,
                                        "note": f"{engine.NAME}: {engine.settings(drive, ceiling, release)}",
                                        "drive": round(drive, 2), "ceiling": round(ceiling, 2), "release": release,
                                        "releaseUnit": engine.RELEASE_UNIT, "target": target,
                                        "lufs": round(L, 2), "truePeak": round(T, 2)}
            print(f"{final.name}: {L:.2f} LUFS, {T:.1f} dBTP ({engine.settings(drive, ceiling, release)})")
        last_settings = (drive, ceiling, release)
    if last_settings:
        engine.finish(*last_settings)
    log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + "\n")

log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + "\n")
shutil.rmtree(scratch, ignore_errors=True)
