"""Re-cut a song's transcribed words (input/lyrics.raw.json, from `mm transcribe`) into screens → input/lyrics.json.

    python3 .agents/skills/make-waveform-lyric-video/tools/recut.py <project folder> [--screens input/screens.txt]
                                                                    [--long 3.3]

The screens are a plain file in the project (default input/screens.txt), one screen a line, in sung order:

    # a comment
    fix: they marked my -> they mocked my        the user's written words win over what Scribe heard (times kept)
    [verse]                                      the section of the screens below (verse, pre, chorus, bridge, outro…)
    I was born<br/><b>white</b><br/>in the dark   <b> the hero word, <br/> the rows
    <b>Hollow soul,</b>
    Keep my<br/><b>hands</b>|stamp:hot          an optional |fx[:tone] kept as metadata.fx / metadata.tone

Repeats are written out (every sung word is on a screen once). Each screen's words are matched to the transcribed
words in order, ignoring case and punctuation; the screen keeps its own spelling and every word keeps its sung time.
It stops on the first mismatch (and says where), and when words are left over or missing. It prints every screen
with its length and flags those sung longer than --long seconds (split them at a clause, unless the idea keeps them
whole). Chorus screens get metadata.section "chorus": GlyphLyrics and StackedLyrics can treat them on their own.

Made from the seven projects that each carried a copy of this script (Devil in the Details … Hollow Soul): only
their lines differed.
"""
import argparse
import json
import re
import sys
from pathlib import Path

clean = lambda s: re.sub(r"[^\w']", "", s.lower())


def read_screens(path: Path):
    screens, fixes, section = [], [], None
    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.lower().startswith("fix:"):
            old, sep, new = line[4:].partition("->")
            if not sep or not old.split() or not new.split():
                sys.exit(f"{path.name}:{n}: a fix is `fix: heard words -> written words`")
            fixes.append((old.split(), new.split()))
            continue
        m = re.fullmatch(r"\[([\w -]+)\]", line)
        if m:
            section = m.group(1).strip()
            continue
        screens.append((section, line, n))
    return screens, fixes


def apply_fix(words, old_seq, new_seq):
    n = len(old_seq)
    at = next((i for i in range(len(words) - n + 1) if [clean(w["text"]) for w in words[i:i + n]] == [clean(x) for x in old_seq]), None)
    if at is None:
        sys.exit(f"fix: no {' '.join(old_seq)!r} in the transcription")
    olds = words[at:at + n]
    news = []
    for k, text in enumerate(new_seq):
        src = olds[min(k, n - 1)]
        end = olds[-1]["end"] if k == len(new_seq) - 1 else src["end"]
        news.append({**src, "text": text, "end": end})
    words[at:at + n] = news


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--screens", default="input/screens.txt")
    ap.add_argument("--long", type=float, default=3.3)
    a = ap.parse_args()
    P = Path(a.project).expanduser().resolve()
    screens_file = P / a.screens
    raw_file = P / "input" / "lyrics.raw.json"
    if not raw_file.exists():
        sys.exit(f"No {raw_file}: run `mm transcribe <slug>` first")
    if not screens_file.exists():
        sys.exit(f"No {screens_file}: write the screens first (see this script's header)")

    raw = json.loads(raw_file.read_text(encoding="utf-8"))
    words = [w for w in (raw["words"] if isinstance(raw, dict) else raw) if w.get("type", "word") == "word"]
    screens, fixes = read_screens(screens_file)
    for old_seq, new_seq in fixes:
        apply_fix(words, old_seq, new_seq)

    out, i = [], 0
    for section, entry, n in screens:
        html, _, fx = entry.partition("|")
        fx, _, tone = fx.partition(":")
        plain = re.sub(r"<[^>]+>", " ", html).split()
        ws = words[i:i + len(plain)]
        if len(ws) < len(plain):
            sys.exit(f"{screens_file.name}:{n}: ran out of sung words at {html!r}")
        for a_word, w in zip(plain, ws):
            if clean(a_word) != clean(w["text"]):
                near = " ".join(x["text"] for x in words[max(0, i - 2):i + len(plain) + 2])
                sys.exit(f"{screens_file.name}:{n}: {a_word!r} vs the sung {w['text']!r} in {html!r} (sung there: {near})")
        i += len(plain)
        meta = {"htmlText": html}
        if section:
            meta["section"] = section
        if fx:
            meta["fx"] = fx
        if tone:
            meta["tone"] = tone
        out.append({
            "text": " ".join(plain),
            "start": round(ws[0]["start"], 2),
            "end": round(ws[-1]["end"], 2),
            "words": [{"text": t, "start": round(w["start"], 2), "end": round(w["end"], 2)} for t, w in zip(plain, ws)],
            "metadata": meta,
        })
    if i != len(words):
        left = " ".join(w["text"] for w in words[i:i + 8])
        sys.exit(f"{len(words) - i} sung words left over after the last screen: {left} …")

    target = P / "input" / "lyrics.json"
    target.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    for k, l in enumerate(out, 1):
        span = l["end"] - l["start"]
        flag = "  <-- long" if span > a.long else ""
        print(f"{k:3d}  {l['start']:6.2f}–{l['end']:6.2f}  {span:3.1f}s  {l['metadata'].get('section', ''):7s} {l['metadata']['htmlText']}{flag}")
    print(f"\n{len(out)} screens → {target}")


if __name__ == "__main__":
    main()
