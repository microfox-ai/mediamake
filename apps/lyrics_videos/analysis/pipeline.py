"""Run the whole analysis for a project, skipping steps whose outputs are up to date.

  separate   Demucs htdemucs_ft stems                     stems/*.wav
  feats      vocal-stem features                          work/vocal_feats.npz
  emissions  CTC emissions (MMS_FA + LV60K, mono/L/R)      work/emission_*.npy
  whisper    mlx-whisper word timestamps (Apple Silicon)   work/whisper.json
  analyze    beat grid, downbeats, envelopes, onsets      audio.json
  align      CTC forced alignment + refinement            lyrics.aligned.json

Then run prepare (npm run prepare-project -w lyrics_videos -- <slug>) to fold the
results into manifest.json.

Run:  uv run python pipeline.py <slug> [--plots] [--force] [--only step,step]
"""
import common
import importlib
import platform
import sys
import time


def stale(outputs, inputs):
    outs = [p for p in outputs]
    if not outs or not all(p.exists() for p in outs):
        return True
    newest_in = max((p.stat().st_mtime for p in inputs if p.exists()), default=0)
    return min(p.stat().st_mtime for p in outs) < newest_in


def main():
    proj = common.project_from_argv()
    plots = "--plots" in sys.argv
    force = "--force" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    song = proj.audio_file()
    lyrics = proj.input / "lyrics.json"
    stems = [proj.stems / f"{s}.wav" for s in ("vocals", "drums", "bass", "other")]
    feats = proj.work / "vocal_feats.npz"
    ems = [proj.work / f"emission_{m}{s}.npy" for m in ("mms", "lv60k") for s in ("", "_vocL", "_vocR")]
    whisper = proj.work / "whisper.json"
    cfg = [proj.out / n for n in ("config.json", "pron.json", "fixes.json")]
    apple = platform.system() == "Darwin" and platform.machine() == "arm64"

    steps = [
        ("separate", stems, [song], lambda: run("separate", [])),
        ("feats", [feats], stems, lambda: importlib.import_module("vocal_feats").compute(proj)),
        ("emissions", ems, stems, lambda: [importlib.import_module("ctc_emissions").compute(proj, m, s)
                                           for m in ("mms", "lv60k") for s in ("vocals", "vocL", "vocR")]),
        ("whisper", [whisper], stems + [lyrics],
         (lambda: importlib.import_module("whisper_run").run(proj)) if apple else None),
        ("analyze", [proj.out / "audio.json"], stems + [feats, lyrics] + cfg,
         lambda: importlib.import_module("analyze").main(proj, plots=plots)),
        ("align", [proj.out / "lyrics.aligned.json"], ems + [feats, whisper, lyrics, proj.out / "audio.json"] + cfg,
         lambda: importlib.import_module("align").main(proj, plots=plots)),
    ]

    def run(name, extra):
        sys.argv = [f"{name}.py", proj.slug] + extra
        importlib.import_module(name).main()

    for name, outs, ins, fn in steps:
        if only and name not in only:
            continue
        if fn is None:
            print(f"· {name}: skipped (needs Apple Silicon)")
            continue
        if not force and not (only and name in only) and not stale(outs, ins):
            print(f"· {name}: up to date")
            continue
        t0 = time.time()
        print(f"▶ {name}")
        fn()
        print(f"  {name} done in {time.time() - t0:.0f} s")
    print(f"\nNext: npm run prepare-project -w lyrics_videos -- {proj.slug}")


if __name__ == "__main__":
    main()
