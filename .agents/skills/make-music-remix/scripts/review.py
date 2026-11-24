# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Make a folder of remix versions reviewable in MediaMake's Stem Player, and print its review link.

  uv run review.py <versions folder> [--title="Song title"] [--note="what this round tries"]

Writes <folder>/remaster.json (mediamake.remaster/v1, the Stem Player's versions sidecar, with
"workflow": "make-music-remix"): the song's title, the folder's path, and for every audio file in it
its integrated loudness (LUFS), true peak (dBTP, the louder channel) and loudness range (LU), all from
ffmpeg's loudnorm. Name the files "<title> - 0 original.wav", "<title> - A <what changed>.wav",
"<title> - B …": the letter or digit after the title becomes the version's key on the screen. A version
already in the file keeps its key, label and note when this runs again.

The link names the folder by its path under Downloads, or under the MediaMake workspace (the folder the
user opens in the Stem Player once; it is remembered). Needs ffmpeg on the PATH, nothing else.
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

AUDIO = {".wav", ".flac", ".mp3", ".m4a", ".aac", ".ogg", ".opus", ".aiff", ".aif"}
BASE_URL = "https://mediamake.microfox.app/stem-player"


def meters(path):
    """(LUFS, true peak dBTP, LRA) from one ffmpeg loudnorm pass."""
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af",
                          "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", err, re.S)
    if not m:
        sys.exit(f"ffmpeg could not measure {path}")
    j = json.loads(m.group(0))
    num = lambda v: float("-inf") if "inf" in str(v) else float(v)
    return num(j["input_i"]), num(j["input_tp"]), num(j["input_lra"])


def common_prefix(names):
    if len(names) < 2:
        return ""
    prefix = names[0]
    for n in names[1:]:
        i = 0
        while i < len(prefix) and i < len(n) and prefix[i] == n[i]:
            i += 1
        prefix = prefix[:i]
    return prefix[:max(prefix.rfind(" - ") + 3, 0)]


def workspace():
    try:
        cfg = json.loads((Path.home() / ".mediamake" / "config.json").read_text())
        if cfg.get("workspace"):
            return Path(cfg["workspace"]).expanduser().resolve()
    except (OSError, ValueError):
        pass
    return (Path.home() / "MediaMake").resolve()


def link_path(folder):
    for root in (Path.home() / "Downloads", workspace()):
        try:
            return folder.relative_to(root.resolve())
        except ValueError:
            continue
    return Path(*folder.parts[-3:])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    if not args:
        sys.exit(__doc__)
    folder = Path(args[0]).expanduser().resolve()
    natural = lambda p: [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.name)]
    files = sorted((p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in AUDIO
                    and not p.name.startswith(".")), key=natural)
    if not files:
        sys.exit(f"No audio files in {folder}")

    out_path = folder / "remaster.json"
    old = {}
    if out_path.exists():
        try:
            old = json.loads(out_path.read_text())
        except ValueError:
            old = {}
    kept = {v["file"]: v for v in old.get("versions", []) if isinstance(v, dict) and "file" in v}

    prefix = common_prefix([p.stem for p in files])
    title = opts.get("title") or old.get("title") or prefix.rstrip(" -") or folder.parent.name
    versions = []
    print(f"{'version':46}{'LUFS':>7}{'TP':>7}{'LRA':>6}")
    for p in files:
        lufs, tp, lra = meters(p)
        label = p.stem[len(prefix):].strip(" -_") or p.stem
        m = re.match(r"^([A-Z0-9])(?:[\s\-_.):]|$)", label)
        k = kept.get(p.name, {})
        v = {"file": p.name, "key": k.get("key") or (m.group(1) if m else None),
             "label": k.get("label") or (label[m.end():].strip(" -_") or label if m else label),
             **({"note": k["note"]} if k.get("note") else {}),
             "lufs": round(lufs, 2), "truePeak": round(tp, 2), "lra": round(lra, 1)}
        if not v["key"]:
            del v["key"]
        versions.append(v)
        print(f"{label[:45]:46}{lufs:>7.1f}{tp:>7.1f}{lra:>6.1f}")

    data = {"schema": "mediamake.remaster/v1", "title": title, "song": folder.parent.name, "path": str(folder),
            "songPath": str(folder.parent), "workflow": "make-music-remix",
            **({"note": opts.get("note") or old.get("note")} if opts.get("note") or old.get("note") else {}),
            "versions": versions}
    out_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    loud = [v["lufs"] for v in versions if v["lufs"] > -50]
    if loud and max(loud) - min(loud) > 1:
        print(f"\nThe versions are {max(loud) - min(loud):.1f} LU apart: level-match them to the original before "
              f"the user compares, or the louder one wins by volume (the screen's Match levels helps too).")
    over = [v["file"] for v in versions if v["truePeak"] > -1.0]
    if over:
        print("True peak over -1 dBTP: " + ", ".join(over))
    print(f"\nWrote {out_path}")
    print(f"Review: {BASE_URL}?job={quote(link_path(folder).as_posix())}")


if __name__ == "__main__":
    main()
