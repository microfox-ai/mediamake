"""Word-level lyric alignment -> analysis/lyrics.aligned.json

Pipeline (each step caches into analysis/work/):
  1. separate.py      : Demucs stems; the vocal stem is what gets aligned.
  2. ctc_emissions.py : frame-wise CTC log-probs from two acoustic models (MMS_FA,
                        wav2vec2 LV60K) on the vocal stem's mono sum, left and right.
  3. whisper_run.py   : mlx-whisper word timestamps (optional cross-check).
  4. vocal_feats.py   : vocal-stem RMS / pitch / onset / sibilance features (5 ms hop).
  5. this script      : one global constrained CTC Viterbi pass over the whole song on
                        the fused emissions (garbage "star" token between lines; each
                        line kept within +-margin of its input/lyrics.json time), then
                        signal-based refinement of word starts/ends, confidence scoring
                        and QA plots.

The lyric TEXT comes from input/lyrics.json and is never changed; only times are.
Per-project overrides in analysis/:
  pron.json   {"Token": "spelling as said"}           pronunciation spellings
  fixes.json  {"<line>:<token>": {"start":..,"end":..,"syl":[..],"conf":..}}
              manual corrections, only where the zoom plots clearly show an error
  config.json {"line_window": 1.5}                    seconds of slack around each
              input line (0 disables the windows)

Run:  uv run python align.py <slug> [--plots]
"""
import common
import json
import re
import sys
from difflib import SequenceMatcher

import numpy as np

import vocal_feats
import whisper_run
from ctcalign import align, emissions, word_table
from pron import Pron

PRIMARY = "fused6"
ALTS = ("mms", "lv60k", "fused_vocL", "fused_vocR")


def load_fixes(proj):
    """fixes.json -> ({(line, token): fix}, {line kept at its input times}).
    Keys: "<line>:<token>" -> {"start", "end", "syl", "conf"}, or "<line>" -> "input"
    for a line the CTC can't place (echoes, buried ad-libs): it keeps the input
    transcription's word times."""
    p = proj.out / "fixes.json"
    if not p.exists():
        return {}, set()
    out, keep = {}, set()
    for k, v in json.loads(p.read_text()).items():
        if k.startswith("_"):
            continue
        if ":" not in k:
            if v == "input":
                keep.add(int(k))
            continue
        li, ti = (int(x) for x in k.split(":"))
        out[(li, ti)] = v
    return out, keep


def activity(f, rel_db=22.0, abs_db=-48.0, win_s=1.5):
    """Vocal activity mask: RMS above an absolute floor and within rel_db of the local max."""
    from scipy.ndimage import maximum_filter1d, median_filter
    r = median_filter(f["rms_db"], 5)
    loc = maximum_filter1d(r, int(win_s / f["hop"]))
    return (r > abs_db) & (r > loc - rel_db), r


def runs(mask):
    m = np.concatenate([[False], mask, [False]]).astype(np.int8)
    d = np.diff(m)
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))


FRIC_START = re.compile(r"(s|sh|ch|z|f|th|j|c[eiy]|x|h)")
VOICED_TH = {"the", "there", "there's", "that", "that's", "they", "this", "then", "than", "their", "them"}
FRIC_END = re.compile(r"(s|z|f|x|ce|se|ze|sh|ch)$")


def refine(words, f, pron, fix=None):
    """Signal-based refinement of CTC boundaries, per sub-word unit (a word, or one
    part of a hyphenated / spelled token).

    1. rest-onset : a rest (>=50 ms silence) precedes the unit and the voice re-enters
                    >40 ms before the first CTC char -> start there (CTC fires late on
                    held vowels).
    2. onset-snap : otherwise snap to the strongest vocal onset (spectral flux) in a
                    window just before the CTC start (legato starts with glottal/vowel
                    onsets that CTC places late).
    3. fricative  : for s/sh/ch/z/f/th/j/h-initial units CTC emits the consonant at the
                    END of the frication; move the start back to where 4-10 kHz noise begins.
    end: next unit's start when the voice continues (legato), else the moment the voice
         stops (RMS >15 dB below the word's level for >=60 ms).
    """
    from scipy.ndimage import uniform_filter1d
    from scipy.signal import find_peaks
    hop = f["hop"]
    act, r = activity(f, rel_db=27.0)
    n = len(r)
    sil = ~act
    sib = uniform_filter1d(f["sib_ratio"], 3)
    on = f["onset"]
    on_thr = 0.3 * np.percentile(on, 99)
    pk_idx, _ = find_peaks(on, height=on_thr, distance=int(0.04 / hop))
    units = []
    for k, w in enumerate(words):
        w["ctc_start"], w["ctc_end"] = w["start"], w["end"]
        w["ctc_subs"] = [tuple(x) for x in w["subs"]]
        subs = pron(w["w"])
        for j, (a, b) in enumerate(w["subs"]):
            units.append(dict(k=k, j=j, text=subs[min(j, len(subs) - 1)], cs=a, ce=b, s=a, rule="ctc"))
    fix = fix or {}
    for u_i, u in enumerate(units):
        w = words[u["k"]]
        fx = fix.get((w["li"], w["ti"]))
        if fx is not None:
            starts = [fx.get("start")] + list(fx.get("syl", []))
            if u["j"] < len(starts) and starts[u["j"]] is not None:
                u["s"], u["rule"] = starts[u["j"]], "manual"
                continue
        pu = units[u_i - 1] if u_i else None
        prev_ce = pu["ce"] if pu else 0.0
        prev_cs = pu["cs"] if pu else 0.0
        s = u["cs"]
        # 1. rest-onset
        i0, i1 = int(prev_ce / hop), int(s / hop)
        done = False
        if i1 - i0 > int(0.05 / hop):
            rs = [(a, b) for a, b in runs(sil[i0:i1]) if (b - a) * hop >= 0.05]
            if rs:
                onset = (i0 + rs[-1][1]) * hop
                if s - onset > 0.04:
                    u["s"], u["rule"] = onset, "rest-onset"
                done = True
        # 2. onset snap
        if not done:
            vowel_init = u["text"][0] in "aeiou"
            lo = max(prev_ce - 0.06, prev_cs + 0.08, s - (0.25 if vowel_init else 0.12))
            hi = s + 0.04
            # ignore onsets followed by frication (the previous word's final consonants)
            cand = [p for p in pk_idx if lo <= p * hop <= hi
                    and np.median(sib[p:p + int(0.06 / hop)]) < -5]
            best, bsc = None, 0.0
            for p in cand:
                dt = s - p * hop
                wgt = 1.0 if dt < 0.06 else max(0.4, 1 - (dt - 0.06) / 0.4)
                if on[p] * wgt > bsc:
                    best, bsc = p, on[p] * wgt
            if best is not None:
                t = best * hop - 0.01
                if abs(t - s) > 0.02:
                    u["s"], u["rule"] = t, "onset-snap"
        # 3. fricative
        if FRIC_START.match(u["text"]) and u["text"] not in VOICED_TH:
            prev_fric_end = pu is not None and FRIC_END.search(pu["text"]) is not None
            lo_t = prev_ce + 0.02 if prev_fric_end else prev_ce - 0.10
            if pu is not None:
                lo_t = max(lo_t, pu["s"] + 0.10)
            lo = int(max(lo_t, s - 0.30, 0) / hop)
            a, b = max(int((s - 0.15) / hop), lo), int((s + 0.06) / hop)
            if b > a:
                pk = a + int(np.argmax(sib[a:b]))
                base = np.percentile(sib[max(0, lo - int(0.4 / hop)):lo + 1], 25) if lo > 0 else -40
                if sib[pk] >= base + 8:
                    thr = 0.5 * (base + sib[pk])
                    j = pk
                    while j - 1 >= lo and sib[j - 1] > thr:
                        j -= 1
                    if j * hop < u["s"] - 0.02:
                        u["s"], u["rule"] = j * hop, "fricative"
    for u_i in range(1, len(units)):
        units[u_i]["s"] = max(units[u_i]["s"], units[u_i - 1]["s"] + 0.03)
    for k, w in enumerate(words):
        us = [u for u in units if u["k"] == k]
        w["start"] = us[0]["s"]
        w["start_rule"] = us[0]["rule"]
        w["unit_starts"] = [u["s"] for u in us]
    for k, w in enumerate(words):
        nxt = words[k + 1]["start"] if k + 1 < len(words) else n * hop
        e = max(w["ctc_end"], w["start"] + 0.08)
        j0, j1 = int(w["start"] / hop), int(e / hop)
        level = np.percentile(r[j0:max(j1, j0 + 1)], 90)
        jn = int(nxt / hop)
        low = r < level - 15.0
        q = None
        j = j1
        need = int(0.06 / hop)
        while j < min(jn, n - need):
            if low[j] and low[j:j + need].all():
                q = j * hop
                break
            j += 1
        end = min(q, nxt) if q is not None else nxt
        end = max(end, w["start"] + 0.04)
        if nxt - end < 0.03:
            end = nxt
        # a word never runs on for more than 2.5 s past its CTC end (long rests between lines)
        end = min(end, max(w["ctc_end"], w["start"] + 0.3) + 2.5)
        fx = fix.get((w["li"], w["ti"]))
        if fx is not None:
            w["manual"] = True
            end = fx.get("end", end)
        w["end"] = end
        us = w["unit_starts"]
        w["subs"] = [(us[i], us[i + 1] if i + 1 < len(us) else end) for i in range(len(us))]
    return words


def detect_extras(words, f):
    """Vocal activity on the vocal stem that no lyric word covers (ad-libs, backing vocals)."""
    from scipy.ndimage import median_filter
    hop = f["hop"]
    r = median_filter(f["rms_db"], 9)
    act = r > -36
    cover = np.zeros_like(act)
    for w in words:
        cover[max(0, int((w["start"] - 0.1) / hop)):int((w["end"] + 0.1) / hop)] = True
    out = []
    for a, b in runs(act & ~cover):
        if out and a * hop - out[-1][1] < 0.4:
            out[-1][1] = b * hop
        else:
            out.append([a * hop, b * hop])
    return [dict(start=round(a, 2), end=round(b, 2), desc="unlisted vocal (backing vocal / ad-lib / breath)")
            for a, b in out if b - a >= 0.5]


def norm(t):
    return re.sub(r"[^a-z]", "", t.lower())


def map_seq(words, other, key="whisper", max_dt=1.5):
    """Fuzzy sequence alignment of another word list [(text, start, end)] to lyric tokens."""
    a = [norm(w["w"]) for w in words]
    b = [norm(x[0]) for x in other]
    m = {}
    for tag, i1, i2, j1, j2 in SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if tag == "equal" or (tag == "replace" and (i2 - i1) == (j2 - j1)):
            for d in range(i2 - i1):
                m[i1 + d] = other[j1 + d]
    for i, w in enumerate(words):
        x = m.get(i)
        if x is not None and abs(x[1] - w["start"]) > max_dt:
            x = None
        w[key] = None if x is None else (round(x[1], 3), round(x[2], 3))
    return words


def confidence(words, alt, fixes):
    for i, w in enumerate(words):
        ds = [abs(a[i]["start"] - w["ctc_start"]) for a in alt.values()]
        agree = np.mean([d <= 0.06 for d in ds])
        p = min(1.0, w["conf"] / 0.5)
        wh = w.get("whisper")
        wagree = 0.5 if wh is None else float(abs(wh[0] - w["start"]) <= 0.15)
        c = 0.35 + 0.3 * agree + 0.2 * p + 0.15 * wagree
        if w.get("manual"):
            c = fixes.get((w["li"], w["ti"]), {}).get("conf", max(c, 0.8))
        w["conf_final"] = round(float(np.clip(c, 0, 1)), 2)
    return words


def main(proj, plots=False):
    L = proj.lyrics()
    toks = [l["text"].split() for l in L]
    pron = Pron.for_project(proj)
    cfg = proj.config()
    margin = float(cfg.get("line_window", 1.5))
    windows = {li: (l["start"] - margin, l["end"] + margin) for li, l in enumerate(L)
               if margin > 0 and l["start"] is not None and l["end"] is not None}
    fixes, keep_input = load_fixes(proj)
    E = emissions(proj, PRIMARY)
    sp, score, _, _ = align(E, toks, pron, line_windows=windows)
    words = word_table(sp, toks)
    alt = {}
    for k in ALTS:
        s2, _, _, _ = align(emissions(proj, k), toks, pron, line_windows=windows)
        alt[k] = word_table(s2, toks)
    f = vocal_feats.load(proj)
    words = refine(words, f, pron, fixes)
    for k in range(1, len(words)):
        if words[k]["start"] < words[k - 1]["start"] + 0.02:
            words[k]["start"] = words[k - 1]["start"] + 0.02
        if words[k - 1]["end"] > words[k]["start"]:
            words[k - 1]["end"] = words[k]["start"]
    words = map_seq(words, whisper_run.words(proj), "whisper")
    given = [(w["text"], w["start"], w["end"]) for l in L for w in l["words"] if w["start"] is not None]
    words = map_seq(words, given, "input")
    words = confidence(words, alt, fixes)
    common.write_json(proj.work / "align_debug.json", dict(words=words, alt=alt))

    lines, report = [], []
    for li, l in enumerate(L):
        ws = [w for w in words if w["li"] == li]
        out = []
        if li in keep_input and len(l["words"]) == len(ws):
            out = [dict(text=w["w"], start=round(x["start"], 3), end=round(x["end"], 3), conf=0.5, source="input")
                   for w, x in zip(ws, l["words"])]
        for w in ([] if out else ws):
            d = dict(text=w["w"], start=round(w["start"], 3), end=round(w["end"], 3), conf=w["conf_final"])
            if len(w["subs"]) > 1:
                d["syl"] = [[round(a, 3), round(b, 3)] for a, b in w["subs"]]
            out.append(d)
        lines.append(dict(text=l["text"], start=out[0]["start"], end=out[-1]["end"], words=out))
        dts = [abs(w["start"] - w["input"][0]) for w in ws if w.get("input")]
        report.append((li, l["text"], out[0]["start"], l["start"], max(dts) if dts else None,
                       min(w["conf_final"] for w in ws)))
    doc = dict(lines=lines, extras=detect_extras(words, f), method=METHOD, score=score)
    common.write_json(proj.out / "lyrics.aligned.json", doc)
    print(f"wrote {(proj.out / 'lyrics.aligned.json').relative_to(common.APP)}: "
          f"{len(lines)} lines, {len(words)} words (viterbi score {score:.0f})")
    print("  line  aligned  input   max|d|  minconf  text")
    for li, text, a, b, dmax, cmin in report:
        flag = " <-- check" if (dmax is not None and dmax > 0.25) or cmin < 0.55 else ""
        print(f"  {li:4d}  {a:7.2f}  {b:6.2f}  {'' if dmax is None else f'{dmax:5.2f}':>6}  {cmin:6.2f}   "
              f"{text[:60]}{flag}")
    if plots:
        make_plots(proj, words, alt, L)
    return words, alt


def make_plots(proj, words, alt, L):
    from qa_plot import plot
    ww = whisper_run.words(proj)
    for li, l in enumerate(L):
        ws = [w for w in words if w["li"] == li]
        t0 = min(ws[0]["start"], ws[0]["ctc_start"]) - 0.8
        t1 = min(max(ws[-1]["end"], ws[-1]["ctc_end"]) + 0.6, t0 + 8)
        tracks = [
            ("final", [(w["w"], w["start"], w["end"]) for w in words]),
            ("fused-ctc", [(w["w"], w["ctc_start"], w["ctc_end"]) for w in words]),
            ("input", [(w["text"], w["start"], w["end"]) for x in L for w in x["words"] if w["start"] is not None]),
            ("mms", [(w["w"], w["start"], w["end"]) for w in alt["mms"]]),
            ("lv60k", [(w["w"], w["start"], w["end"]) for w in alt["lv60k"]]),
            ("whisper", ww),
        ]
        plot(proj, t0, t1, tracks, proj.qa / f"line_{li:03d}.png", title=f"L{li}: {l['text']}")
    print(f"QA plots: {proj.qa.relative_to(common.APP)}/line_*.png")


METHOD = (
    "Method (after mexicat/pdoom-video): (1) CTC emissions (20 ms frames) of the Demucs htdemucs_ft "
    "vocal stem from two acoustic models, torchaudio MMS_FA and wav2vec2-large-lv60k-960h, each on the "
    "mono sum and the left / right channel, fused as a probability mixture; (2) one global constrained "
    "Viterbi forced alignment of all lines over the whole song, with a garbage 'star' token between "
    "lines to absorb ad-libs and each line kept within +-line_window s of its input/lyrics.json time; "
    "(3) signal refinement per sub-word on the vocal stem: start moved to the voice re-entry after a rest, "
    "snapped to the nearest spectral-flux onset, or moved back to the start of s/sh/ch/f/th frication; "
    "ends = next word start when legato, else when the voice drops 15 dB below the word level; "
    "(4) cross-check against mlx-whisper large-v3-turbo word timestamps, the individual models / channels "
    "and the input transcription. conf = 0.35 + 0.3 x agreement of the independent alignments (<=60 ms) "
    "+ 0.2 x CTC posterior + 0.15 x Whisper agreement; manual fixes (fixes.json) carry their own conf. "
    "'syl' = start/end of each part of a hyphenated or spelled token."
)

if __name__ == "__main__":
    main(common.project_from_argv(), plots="--plots" in sys.argv)
