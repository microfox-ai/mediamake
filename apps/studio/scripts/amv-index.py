#!/usr/bin/env python3
"""amv-index: the facts a make-anime-music-video cut list is written against, as JSON next to it.

    python3 scripts/amv-index.py <slug>

Writes projects/<slug>/video/
  footage.json  per source (projects/<slug>/footage/<id>/segregation.json): fps, proxy path, and
                every shot as "<n>": [start, end] in source seconds (n = the shot number on the sheets)
  timing.json   beats, downbeats (analysis/audio.json) and every sung word with its time
                (analysis/lyrics.aligned.json), so cut.ts can say b(412) or w('blindfold')
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
slug = sys.argv[1]
P = ROOT / "projects" / slug
out = P / "video"
out.mkdir(exist_ok=True)

footage = {}
for seg in sorted((P / "footage").glob("*/segregation.json")):
    sid = seg.parent.name
    s = json.loads(seg.read_text())
    footage[sid] = {
        "fps": s["video"]["fps"],
        "duration": s["video"]["duration"],
        "proxy": f"derived/src/{sid}.mp4",
        "shots": {str(int(sh["id"][2:])): [round(sh["start"], 3), round(sh["end"], 3)] for sh in s["shots"]},
    }
(out / "footage.json").write_text(json.dumps(footage, indent=1))

audio = json.loads((P / "analysis" / "audio.json").read_text())
aligned = json.loads((P / "analysis" / "lyrics.aligned.json").read_text())
words = []
for li, line in enumerate(aligned["lines"]):
    for w in line["words"]:
        words.append([w["text"], round(w["start"], 3), round(w["end"], 3), li])
timing = {
    "bpm": audio["bpm"],
    "beats": [round(b, 3) for b in audio["beats"]],
    "downbeats": [round(b, 3) for b in audio["downbeats"]],
    "duration": audio["duration"],
    "lines": [[l["text"], round(l["start"], 3), round(l["end"], 3)] for l in aligned["lines"]],
    "words": words,
}
# the drum onsets (scripts/amv-drums.py): the fast sections cut on them, the bass punches land on them
drummap = P / "analysis/drummap.json"
if drummap.exists():
    timing["hits"] = json.loads(drummap.read_text())["onsets"]
(out / "timing.json").write_text(json.dumps(timing))
print(f"{len(footage)} sources, {sum(len(f['shots']) for f in footage.values())} shots; "
      f"{len(timing['beats'])} beats, {len(words)} words")
