#!/usr/bin/env python3
"""Plain lyrics out of a lyrics file, and a check of a YouTube title + description.

  ytmeta.py lyrics <lyrics.json|.txt|.md|.lrc> [--gap=2.0] [--sections=project.json] [--out=lyrics.txt]
                   [--source=auto|written|captions]
  ytmeta.py check <dir> [--lyrics=<dir>/lyrics.txt] [--no-lyrics] [--free]   # reads <dir>/title.txt and <dir>/description.txt

`lyrics` prefers the written lyrics (`sunoLyrics` in a mediamake lyrics.json, or a text file) with
section labels taken out and a blank line where a section started; otherwise it joins the timed
captions, one caption per line, with a blank line where the singing pauses for longer than --gap
seconds, or (with --sections, a project.json with "sections": [{from, to}]) where a section starts.
It prints a one-line summary to stderr (source, lines, stanzas, last sung second).

`check` exits 1 when the description breaks the layout or YouTube's limits:
2 intro lines / the lyrics / 1 outro line / one line of at most 5 hashtags, blocks split by one blank
line (with --no-lyrics, when the user leaves the lyrics out: 2 intro lines / 1 outro line / hashtags);
title at most 100 characters, description at most 5000 bytes, no < or > anywhere. With --free (a
brand's own description template, or the user's own text) only YouTube's limits are checked, not the
layout: the title, the bytes, no < or >, at most 15 hashtags anywhere (YouTube ignores them all past
15), none repeated.
Only the standard library is used.
"""
import json
import re
import sys
from pathlib import Path

LABELS = (
    r"intro|outro|verse|pre[- ]?chorus|post[- ]?chorus|chorus|hook|bridge|refrain|drop|breakdown|"
    r"interlude|instrumental|break|build|build[- ]?up|ad[- ]?libs?|spoken|rap|solo|final chorus|end"
)
LABEL_LINE = re.compile(
    rf"^[\s*_#>]*[\[(]?\s*(?:{LABELS})\b[^\])]*[\])]?\s*:?[\s*_]*$", re.IGNORECASE
)
BRACKETED_LINE = re.compile(r"^[\s*_]*\[[^\]]*\][\s*_]*$")  # [anything] alone on a line is a tag
# "(A slow beat fades in. The vocals whisper.)": a whole line in parentheses of 6+ words is a
# production note, not sung; short ones ("(ooh, yeah)") are ad-libs and stay
STAGE_DIRECTION = re.compile(r"^\((?:[^()\s]+\s+){5,}[^()]*\)$")
REPEAT_NOTE = re.compile(r"^\(?\s*(?:x\s*\d+|\d+\s*x|repeat.*)\s*\)?$", re.IGNORECASE)
LRC_STAMP = re.compile(r"\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]")
HASHTAG = re.compile(r"#[^\s#]+")


def arg(args, name, default=None):
    for a in args:
        if a.startswith(f"--{name}="):
            return a.split("=", 1)[1]
    return default


def clean_written(text):
    """Written lyrics → stanzas: labels and markdown out, one blank line between sections."""
    stanzas, cur = [], []
    for raw in LRC_STAMP.sub("", text).splitlines():
        line = raw.replace("**", "").replace("__", "").strip()
        if not line or LABEL_LINE.match(line) or BRACKETED_LINE.match(line) or REPEAT_NOTE.match(line):
            if cur:
                stanzas.append(cur)
                cur = []
            continue
        if STAGE_DIRECTION.match(line):
            continue
        cur.append(line)
    if cur:
        stanzas.append(cur)
    return stanzas


def captions_of(data):
    caps = data.get("captions", []) if isinstance(data, dict) else data
    out = []
    for c in caps if isinstance(caps, list) else []:
        if not isinstance(c, dict) or not str(c.get("text", "")).strip():
            continue
        start = c.get("absoluteStart", c.get("start"))
        end = c.get("absoluteEnd", c.get("end"))
        out.append((float(start or 0), float(end or start or 0), " ".join(str(c["text"]).split())))
    return sorted(out, key=lambda c: c[0])


def stanzas_from_captions(caps, gap, cuts=()):
    stanzas, cur, prev_end = [], [], None
    for start, end, text in caps:
        crossed = prev_end is not None and any(prev_end - 0.25 <= t <= start + 0.25 for t in cuts)
        if cur and prev_end is not None and (start - prev_end > gap or crossed):
            stanzas.append(cur)
            cur = []
        cur.append(text)
        prev_end = end
    if cur:
        stanzas.append(cur)
    return stanzas


def cmd_lyrics(args):
    src = Path(args[0])
    gap = float(arg(args, "gap", "2.0"))
    want = arg(args, "source", "auto")
    text = src.read_text(encoding="utf-8")
    data, caps, written = None, [], ""
    if src.suffix.lower() == ".json":
        data = json.loads(text)
        caps = captions_of(data)
        if isinstance(data, dict):
            written = str(data.get("sunoLyrics") or data.get("lyrics") or "")
    else:
        written = text

    if want == "captions" or (want == "auto" and not written.strip()):
        if not caps:
            sys.exit(f"{src}: no captions with text")
        cuts, how = (), f"gap > {gap}s"
        if arg(args, "sections"):
            secs = json.loads(Path(arg(args, "sections")).read_text(encoding="utf-8")).get("sections", [])
            cuts, how = [float(x["from"]) for x in secs if float(x["from"]) > 0], f"gap > {gap}s or a new section"
        stanzas, used = stanzas_from_captions(caps, gap, cuts), f"captions ({how} = new stanza)"
    else:
        stanzas, used = clean_written(written), "written lyrics" + (" (sunoLyrics)" if data else "")
        if not stanzas:
            sys.exit(f"{src}: no written lyrics")

    plain = "\n\n".join("\n".join(s) for s in stanzas) + "\n"
    out = arg(args, "out")
    if out:
        Path(out).write_text(plain, encoding="utf-8")
    else:
        sys.stdout.write(plain)
    last = f", last sung {caps[-1][1]:.1f}s" if caps else ""
    lines = sum(len(s) for s in stanzas)
    print(f"[lyrics] {used}: {lines} lines, {len(stanzas)} stanzas{last}" + (f" → {out}" if out else ""), file=sys.stderr)


def cmd_check(args):
    d = Path(args[0])
    title = (d / "title.txt").read_text(encoding="utf-8").strip()
    desc = (d / "description.txt").read_text(encoding="utf-8").replace("\r\n", "\n").strip("\n")
    lyrics_file = Path(arg(args, "lyrics", str(d / "lyrics.txt")))
    no_lyrics = "--no-lyrics" in args
    free = "--free" in args
    want_blocks = 3 if no_lyrics else 4
    errors, warnings = [], []

    if not title:
        errors.append("title.txt is empty")
    if "\n" in title:
        errors.append("the title is more than one line")
    if len(title) > 100:
        errors.append(f"title is {len(title)} characters (YouTube allows 100)")
    elif len(title) > 70:
        warnings.append(f"title is {len(title)} characters: search and the feed cut it at about 70")
    nbytes = len(desc.encode("utf-8"))
    if nbytes > 5000:
        errors.append(f"description is {nbytes} bytes (YouTube allows 5000; Telugu/Hindi letters take 3 bytes each)")
    for name, s in (("title", title), ("description", desc)):
        if "<" in s or ">" in s:
            errors.append(f"the {name} has < or > (YouTube rejects them)")

    if free:
        # the brand's or the user's own layout: YouTube's limits only
        tags = HASHTAG.findall(desc)
        if len(tags) > 15:
            errors.append(f"{len(tags)} hashtags; YouTube ignores every hashtag when there are more than 15")
        if len(set(t.lower() for t in tags)) != len(tags):
            errors.append("a hashtag is repeated")
        print(f"[check] title {len(title)} chars · description {nbytes} bytes · own layout · hashtags {' '.join(tags)}")
    else:
        blocks = [b.split("\n") for b in re.split(r"\n[ \t]*\n", desc)]
        if re.search(r"\n[ \t]*\n[ \t]*\n", desc):
            errors.append("more than one blank line in a row somewhere")
        if no_lyrics and len(blocks) != 3:
            errors.append(f"{len(blocks)} blocks; want intro / outro / hashtags (no lyrics), split by blank lines")
        elif len(blocks) < want_blocks:
            errors.append(f"{len(blocks)} blocks; want intro / lyrics / outro / hashtags, split by blank lines")
        else:
            if len(blocks[0]) != 2:
                errors.append(f"the intro is {len(blocks[0])} lines; want 2")
            if len(blocks[-2]) != 1:
                errors.append(f"the outro is {len(blocks[-2])} lines; want 1")
            tag_block = blocks[-1]
            tags = HASHTAG.findall(" ".join(tag_block))
            leftover = HASHTAG.sub("", " ".join(tag_block)).strip()
            if len(tag_block) != 1 or leftover:
                errors.append("the last block must be one line of hashtags only")
            if not 1 <= len(tags) <= 5:
                errors.append(f"{len(tags)} hashtags; want 1 to 5")
            if len(set(t.lower() for t in tags)) != len(tags):
                errors.append("a hashtag is repeated")
            stray = [t for t in HASHTAG.findall("\n".join("\n".join(b) for b in blocks[:-1]))]
            if stray:
                errors.append(f"hashtags outside the last line: {' '.join(stray)} (they count toward the 5)")
            if no_lyrics:
                pass
            elif lyrics_file.exists():
                want = lyrics_file.read_text(encoding="utf-8").strip("\n")
                got = "\n\n".join("\n".join(b) for b in blocks[1:-2])
                if got != want:
                    errors.append(f"the lyrics between intro and outro differ from {lyrics_file.name}")
            else:
                warnings.append(f"no {lyrics_file} to compare the lyrics with")
            print(f"[check] title {len(title)} chars · description {nbytes} bytes · intro {len(blocks[0])} lines · "
                  f"{'no lyrics' if no_lyrics else f'{len(blocks) - 3} lyric stanzas'} · outro {len(blocks[-2])} line · hashtags {' '.join(tags)}")

    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    if errors:
        sys.exit(1)
    print("[check] ok")


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("lyrics", "check"):
        sys.exit(__doc__)
    {"lyrics": cmd_lyrics, "check": cmd_check}[sys.argv[1]](sys.argv[2:])


if __name__ == "__main__":
    main()
