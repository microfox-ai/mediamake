"""Make a ladder reviewable on MediaMake's Remaster Revisions screen and print its review link.

usage: review.py <ladder folder> [--title="Song Title"] [--note="what this ladder tries"]

Writes <ladder folder>/remaster.json (mediamake.remaster/v1): the song's title, the folder's path
(Show in Finder, the message to Claude), and for every audio file in the folder its integrated
loudness (pyloudnorm, LUFS), true peak (ffmpeg ebur128, dBTP), loudness range (LU) and PLR. The
screen measures loudness itself without this file, but not true peak or LRA. Versions already in the
file keep their key, label and note. Runs in the reaper-mcp-server tool environment (no REAPER
needed):
    "$(uv tool dir)/reaper-mcp-server/bin/python" review.py "<song folder>/remaster/v1"
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

import pyloudnorm as pyln
import soundfile as sf

AUDIO = {".wav", ".mp3", ".flac", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".aiff", ".aif"}
BASE_URL = "https://mediamake.microfox.app/remaster-revision"


def ebur128(path):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    tail = out[out.rfind("Summary:"):]
    grab = lambda key: float(re.search(key + r":\s+([-+\d.]+)", tail).group(1))
    return grab("LRA"), grab("Peak")


def common_prefix(names):
    if len(names) < 2:
        return ""
    prefix = names[0]
    for n in names[1:]:
        i = 0
        while i < len(prefix) and i < len(n) and prefix[i] == n[i]:
            i += 1
        prefix = prefix[:i]
    cut = max(prefix.rfind(" - ") + 3, prefix.rfind(" ") + 1, prefix.rfind("_") + 1)
    return prefix[:cut]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    if not args:
        sys.exit(__doc__)
    folder = Path(args[0]).expanduser().resolve()
    files = sorted((p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in AUDIO and not p.name.startswith(".")),
                   key=lambda p: [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.name)])
    if not files:
        sys.exit(f"No audio files in {folder}")

    existing = {}
    out_path = folder / "remaster.json"
    if out_path.exists():
        try:
            existing = {v["file"]: v for v in json.loads(out_path.read_text()).get("versions", []) if "file" in v}
        except (ValueError, KeyError, TypeError):
            existing = {}

    stems = [p.stem for p in files]
    prefix = common_prefix(stems)
    # the song folder: <song>/remaster/v<N>
    song_dir = folder.parent.parent if folder.parent.name == "remaster" else folder.parent
    title = opts.get("title") or (json.loads(out_path.read_text()).get("title") if out_path.exists() else None) \
        or prefix.rstrip(" -_") or song_dir.name

    versions = []
    print(f"{'version':44}{'LUFS':>7}{'TP':>7}{'LRA':>6}{'PLR':>6}")
    for p in files:
        x, sr = sf.read(str(p), always_2d=True)
        lufs = float(pyln.Meter(sr).integrated_loudness(x))
        lra, tp = ebur128(p)
        label = p.stem[len(prefix):].lstrip(" -_") or p.stem
        m = re.match(r"^([A-Z0-9])(?:[\s\-_.):]|$)", label)
        keep = existing.get(p.name, {})
        v = {
            "file": p.name,
            "key": keep.get("key") or (m.group(1) if m else None),
            "label": keep.get("label") or label,
            **({"note": keep["note"]} if keep.get("note") else {}),
            "lufs": round(lufs, 2),
            "truePeak": round(tp, 2),
            "lra": round(lra, 1),
            "plr": round(tp - lufs, 1),
        }
        if not v["key"]:
            del v["key"]
        versions.append(v)
        print(f"{label[:43]:44}{lufs:>7.1f}{tp:>7.1f}{lra:>6.1f}{tp - lufs:>6.1f}")

    data = {
        "schema": "mediamake.remaster/v1",
        "title": title,
        "song": song_dir.name,
        "path": str(folder),
        "songPath": str(song_dir),
        "workflow": "make-loudness-remaster",
        **({"note": opts["note"]} if opts.get("note") else
           ({"note": json.loads(out_path.read_text()).get("note")} if out_path.exists() and json.loads(out_path.read_text()).get("note") else {})),
        "versions": versions,
    }
    out_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    spread = max(v["lufs"] for v in versions) - min(v["lufs"] for v in versions)
    if spread > 1:
        print(f"\nNote: the versions are {spread:.1f} LU apart; the screen offers Match levels so the louder one doesn't win by volume.")

    # the review link names the folder by its path under Downloads (any folder above it can be the source on the screen)
    downloads = Path.home() / "Downloads"
    rel = folder.relative_to(downloads) if str(folder).startswith(str(downloads) + os.sep) else Path(*folder.parts[-4:])
    print(f"\nWrote {out_path}")
    print(f"Review: {BASE_URL}?job={quote(rel.as_posix())}")


if __name__ == "__main__":
    main()
