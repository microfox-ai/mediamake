# /// script
# requires-python = ">=3.9"
# dependencies = ["numpy", "soundfile"]
# ///
"""Map a song bar by bar: where each of its stems plays and where its words are, on the song's own grid.

A remix follows the song's own arrangement, so this is the first thing to know: which bars each part
plays in, where the words are sung and where they pause, where the song stops, and whether another
version (or the master) sits on the same grid.

  uv run song_map.py <stems folder | audio files…> [--midi=<file.mid> | --bpm=<N> [--offset=<s>]]
                     [--beats-per-bar=<N>] [--threshold=-45] [--words=<transcript.json>]
                     [--compare=<stems folder | a mix>] [--json=<out.json>]

- The grid comes from a MIDI file's tempo map and time signature (Suno's stems come with one `.mid` a
  stem; the drums' is taken when --midi is left out), or from the tempo the user gives (--bpm, with
  --offset for where bar 1 starts; 4 beats a bar unless --beats-per-bar). Never from beat detection
  alone: it guesses wrong tempos on real songs.
- A stem is one audio file (WAV first, then FLAC, AIFF, MP3). In a Suno folder its name is the part in
  brackets: "<title> (Drums).wav" is "Drums". A mix (the master) can be given as a file beside the folder.
- A bar under --threshold (dBFS RMS, default -45) counts as silent and shows as ".". A vocal stem
  often never goes silent (bleed): where the words are comes from --words, not from its level.
- --words takes the song's timed words (a `*.transcript.json` beside the song, or `mm transcribe`'s
  `input/lyrics.raw.json`: any JSON with a `words` list of {text, start, end}). It adds a Words column
  (seconds sung in the bar), every sung line with its start, end and bars, and the pauses between
  lines: an edit or an added part's entry belongs in one of those pauses, never inside a line.
- --compare maps another version's stems (a folder) or a mix (a file) on the same grid and says how far
  it sits from this song (a lag in ms, by the drums, or by the whole when no drums are shared): near
  0 means it drops in with no shifting.
- --json writes the grid, the per-bar levels, the bar ranges each stem plays in and the sung lines;
  its folder is made when missing.

Needs nothing but numpy and soundfile (uv installs them). Nothing is changed or written but --json.
"""
import argparse
import json
import re
import struct
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

AUDIO = [".wav", ".flac", ".aiff", ".aif", ".mp3"]
ORDER = ["Vocals", "Backing Vocals", "Drums", "Percussion", "Bass", "Keyboard", "Synth", "Guitar", "Strings",
         "Brass", "Woodwinds", "FX"]  # the order stems are shown in; others follow by name
LINE_GAP = 0.6  # seconds of silence between words that start a new line, when the words carry no line numbers


# ---- the grid -----------------------------------------------------------------------------------

def _var(b, i):
    v = 0
    while True:
        c = b[i]
        i += 1
        v = (v << 7) | (c & 0x7F)
        if not c & 0x80:
            return v, i


def read_midi(path):
    """(ticks per beat, [(tick, seconds per tick from there)], beats per bar or None) from a MIDI file."""
    b = Path(path).read_bytes()
    if b[:4] != b"MThd":
        sys.exit(f"{path} is not a MIDI file")
    ntrk, div = struct.unpack(">HH", b[10:14])
    if div & 0x8000:
        sys.exit(f"{path} uses SMPTE time, not beats: give --bpm instead")
    i, tempos, meter = 14, [], None
    for _ in range(ntrk):
        ln = struct.unpack(">I", b[i + 4:i + 8])[0]
        j, end, t, status = i + 8, i + 8 + ln, 0, 0
        while j < end:
            d, j = _var(b, j)
            t += d
            c = b[j]
            if c == 0xFF:
                typ = b[j + 1]
                l, k = _var(b, j + 2)
                if typ == 0x51:
                    tempos.append((t, int.from_bytes(b[k:k + l], "big") / 1e6 / div))
                elif typ == 0x58 and meter is None and t == 0:
                    meter = b[k]  # the time signature's numerator: beats a bar
                j = k + l
            elif c in (0xF0, 0xF7):
                l, k = _var(b, j + 1)
                j = k + l
            else:
                if c & 0x80:
                    status = c
                    j += 1
                j += 1 if (status & 0xF0) in (0xC0, 0xD0) else 2
        i = end
    if not tempos:
        tempos = [(0, 0.5 / div)]  # MIDI's default: 120 BPM
    return div, sorted(set(tempos)), meter


def beats_from_midi(path, until):
    div, tempos, meter = read_midi(path)
    times, t, tick, k = [], 0.0, 0, 0
    spt = tempos[0][1]
    while t < until + 8:
        times.append(t)
        target = tick + div
        while k + 1 < len(tempos) and tempos[k + 1][0] <= tick:
            k += 1
            spt = tempos[k][1]
        cur = tick
        while k + 1 < len(tempos) and tempos[k + 1][0] < target:  # through a tempo change inside the beat
            t += (tempos[k + 1][0] - cur) * spt
            cur = tempos[k + 1][0]
            k += 1
            spt = tempos[k][1]
        t += (target - cur) * spt
        tick = target
    return np.array(times), len(tempos), meter


# ---- the audio ----------------------------------------------------------------------------------

def stem_name(p):
    m = re.search(r"\(([^()]+)\)\s*$", p.stem)
    return m.group(1) if m else p.stem


def find_stems(paths):
    files = []
    for p in paths:
        p = Path(p).expanduser()
        if p.is_dir():
            files += [f for f in p.iterdir() if f.is_file() and f.suffix.lower() in AUDIO and not f.name.startswith(".")]
        elif p.is_file():
            files.append(p)
        else:
            sys.exit(f"Not found: {p}")
    by_name = {}
    for f in sorted(files, key=lambda f: AUDIO.index(f.suffix.lower()) if f.suffix.lower() in AUDIO else 99):
        by_name.setdefault(stem_name(f), f)  # one file a stem, WAV first
    if not by_name:
        sys.exit("No audio files found")
    rank = lambda n: (ORDER.index(n) if n in ORDER else len(ORDER), n.lower())
    return {n: by_name[n] for n in sorted(by_name, key=rank)}


def load_mono(path):
    y, sr = sf.read(str(path), dtype="float32", always_2d=True)
    return y.mean(axis=1), sr


def db(x):
    r = float(np.sqrt(np.mean(np.square(x, dtype=np.float64)))) if len(x) else 0.0
    return 20 * np.log10(r) if r > 1e-7 else -140.0


def runs(flags, first=1):
    """[True, True, False, True] → [[1, 2], [4, 4]] (bar numbers)."""
    out, start = [], None
    for i, on in enumerate(list(flags) + [False]):
        if on and start is None:
            start = i
        elif not on and start is not None:
            out.append([start + first, i - 1 + first])
            start = None
    return out


def runs_text(rs):
    return ", ".join(f"{a}" if a == b else f"{a}-{b}" for a, b in rs) or "never"


def envelope(y, sr, hop=256):
    n = len(y) // hop
    e = np.sqrt(np.mean(np.square(y[:n * hop].reshape(n, hop), dtype=np.float64), axis=1))
    d = np.diff(np.log10(e + 1e-6), prepend=0)
    return np.maximum(d, 0), hop / sr


def lag(a, b, sr, span=0.25):
    """How late b is against a, in seconds, by their onset envelopes (positive: b is later)."""
    ea, step = envelope(a, sr)
    eb, _ = envelope(b, sr)
    n = min(len(ea), len(eb))
    ea, eb = ea[:n] - ea[:n].mean(), eb[:n] - eb[:n].mean()
    m = int(span / step)

    def score(k):
        return float(np.dot(ea[max(0, -k):n - max(0, k)], eb[max(0, k):n - max(0, -k)]))
    best = max(range(-m, m + 1), key=score)
    likeness = score(best) / (np.linalg.norm(ea) * np.linalg.norm(eb) + 1e-9)
    return best * step, likeness


def mixdown(stems):
    sr = next(iter(stems.values()))[1]
    n = max(len(y) for y, _ in stems.values())
    out = np.zeros(n, dtype=np.float32)
    for y, _ in stems.values():
        out[:len(y)] += y
    return out, sr


# ---- the words ----------------------------------------------------------------------------------

def read_words(path):
    d = json.loads(Path(path).expanduser().read_text())
    words = d.get("words") if isinstance(d, dict) else d
    if not isinstance(words, list):
        sys.exit(f"{path} has no words list")
    ws = [w for w in words if isinstance(w, dict) and w.get("type", "word") == "word"
          and isinstance(w.get("start"), (int, float)) and isinstance(w.get("end"), (int, float))]
    ws.sort(key=lambda w: w["start"])
    lines, cur, key = [], [], None
    for w in ws:
        k = (w.get("stanza"), w.get("line")) if w.get("line") is not None else None
        new = (k != key) if k is not None else (bool(cur) and w["start"] - cur[-1]["end"] > LINE_GAP)
        if cur and new:
            lines.append(cur)
            cur = []
        cur.append(w)
        key = k
    if cur:
        lines.append(cur)
    return ws, [{"start": round(l[0]["start"], 3), "end": round(l[-1]["end"], 3),
                 "text": " ".join(str(w.get("text", "")).strip() for w in l).strip()} for l in lines]


def bar_of(t, bars):
    return int(np.searchsorted(bars, t, side="right"))  # 1-based bar number


# ---- the map ------------------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("--midi")
    ap.add_argument("--bpm", type=float)
    ap.add_argument("--offset", type=float, default=0.0)
    ap.add_argument("--beats-per-bar", type=int)
    ap.add_argument("--threshold", type=float, default=-45.0)
    ap.add_argument("--words")
    ap.add_argument("--compare")
    ap.add_argument("--json")
    a = ap.parse_args()

    files = find_stems(a.inputs)
    stems = {n: load_mono(f) for n, f in files.items()}
    length = max(len(y) / sr for y, sr in stems.values())

    midi = a.midi
    if not midi and not a.bpm:
        folder = next((Path(p).expanduser() for p in a.inputs if Path(p).expanduser().is_dir()), None)
        mids = sorted(folder.glob("*.mid"), key=lambda m: (stem_name(m) != "Drums", m.name)) if folder else []
        midi = str(mids[0]) if mids else None  # every Suno stem's MIDI shares one tempo map: the drums' first
    if midi:
        beats, changes, meter = beats_from_midi(midi, length)
        source = f"MIDI tempo map ({Path(midi).name}, {changes} tempo event{'s' if changes != 1 else ''})"
    elif a.bpm:
        beats, meter = np.arange(a.offset, length + 8, 60.0 / a.bpm), None
        source = f"{a.bpm:g} BPM from {a.offset:g} s"
    else:
        sys.exit("No tempo: give --midi=<file.mid> (Suno's stems have one) or --bpm=<N>. Never guess it from beat detection.")
    per_bar = a.beats_per_bar or meter or 4
    bars = beats[::per_bar]
    bar_len = np.diff(bars[bars < length + 1e-6]) if (bars < length).sum() > 1 else np.diff(bars[:2])
    bpm = 60.0 * per_bar / bar_len
    print(f"{len(stems)} audio files, {length:.2f} s; grid from the {source}: {per_bar} beats a bar"
          f"{'' if a.beats_per_bar or meter else ' (assumed: none given)'}, bar 1 at {bars[0]:.3f} s, "
          f"a bar {bar_len.mean():.4f} s ({bpm.mean():.1f} BPM; {bpm.min():.1f}-{bpm.max():.1f})")

    other, other_files = {}, {}
    if a.compare:
        other_files = find_stems([a.compare])
        other = {n: load_mono(f) for n, f in other_files.items()}
        olen = max(len(y) / sr for y, sr in other.values())
        print(f"compare: {len(other)} audio file{'s' if len(other) != 1 else ''}, {olen:.2f} s "
              f"({olen - length:+.2f} s against this song)")
        key = next((n for n in ("Drums", "Percussion") if n in stems and n in other), None)
        (ya, sra), (yb, _) = (stems[key], other[key]) if key else (mixdown(stems), mixdown(other))
        l, like = lag(ya, yb, sra)
        print(f"  it sits {l * 1000:+.0f} ms from this song ({'its ' + key if key else 'the whole of it'}; "
              f"likeness {like:.2f}). Near 0 ms with a likeness over 0.5: the same grid, it drops in as it is")

    words, lines = read_words(a.words) if a.words else ([], [])

    allstems = {**stems, **{f"~{n}": v for n, v in other.items()}}
    span = max([length] + [len(y) / sr for y, sr in other.values()])
    rows = []
    for i in range(len(bars) - 1):
        t0, t1 = float(bars[i]), min(float(bars[i + 1]), span)
        if t0 >= span - 0.05:
            break
        r = {"bar": i + 1, "start": round(t0, 4), "end": round(t1, 4),
             "db": {n: round(db(y[int(t0 * sr):int(t1 * sr)]), 1) for n, (y, sr) in allstems.items()}}
        if words:
            r["sung"] = round(sum(max(0.0, min(w["end"], t1) - max(w["start"], t0)) for w in words), 2)
        rows.append(r)

    names = list(allstems)
    width = 5
    head = " ".join(f"{n[:width]:>{width}}" for n in names) + (" words" if words else "")
    print(f"\n bar   start | {head}   (dBFS RMS; '.' under {a.threshold:g}; ~ = compared"
          f"{'; words = seconds sung' if words else ''})")
    for r in rows:
        cells = " ".join(f"{r['db'][n]:>{width}.0f}" if r["db"][n] > a.threshold else f"{'.':>{width}}" for n in names)
        if words:
            cells += f" {r['sung']:>5.1f}" if r["sung"] > 0 else f" {'.':>5}"
        print(f"{r['bar']:>4} {r['start']:7.2f} | {cells}")

    plays = {n: runs([r["db"][n] > a.threshold for r in rows]) for n in names}
    silent = runs([all(r["db"][n] <= a.threshold for n in stems) for r in rows])
    pad = max(len(x) for x in names + ["words"])
    print("\nwhere each plays (bars):")
    for n in names:
        print(f"  {n:>{pad}}: {runs_text(plays[n])}")
    if words:
        sung = runs([r["sung"] > 0 for r in rows])
        print(f"  {'words':>{pad}}: {runs_text(sung)}")
    print(f"  the whole song is silent in: {runs_text(silent)}")

    gaps = []
    if lines:
        print(f"\nthe sung lines ({len(lines)}), and the pauses between them, where an edit or an entry can go:")
        prev = None
        for ln in lines:
            if prev is not None and ln["start"] - prev["end"] > 0.05:
                gaps.append({"start": prev["end"], "end": ln["start"], "seconds": round(ln["start"] - prev["end"], 3),
                             "bars": [bar_of(prev["end"], bars), bar_of(ln["start"], bars)]})
                print(f"      pause {prev['end']:7.2f}-{ln['start']:7.2f} s ({ln['start'] - prev['end']:.2f} s)")
            ln["bars"] = [bar_of(ln["start"], bars), bar_of(ln["end"], bars)]
            print(f"  bars {ln['bars'][0]:>3}-{ln['bars'][1]:<3} {ln['start']:7.2f}-{ln['end']:7.2f} s  {ln['text'][:60]}")
            prev = ln

    if a.json:
        out = Path(a.json).expanduser()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({
            "schema": "mediamake.song-map/v1",
            "grid": {"source": source, "beatsPerBar": per_bar, "bpm": round(float(bpm.mean()), 2),
                     "beats": [round(float(b), 5) for b in beats if b <= span],
                     "bars": [round(float(b), 5) for b in bars if b <= span]},
            "seconds": round(length, 3),
            "files": {n: str(f) for n, f in files.items()},
            "compare": {n: str(f) for n, f in other_files.items()},
            "threshold": a.threshold,
            "plays": plays,
            "silent": silent,
            "lines": lines,
            "pauses": gaps,
            "rows": rows,
        }, indent=1))
        print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
