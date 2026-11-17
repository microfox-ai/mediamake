#!/usr/bin/env python3
"""humanize.py: the write-human-text skill's helper. It keeps the facts while Phrasly's drafts are mixed.

    python3 humanize.py chunk   <text.txt> [--min 30] [--max 5000]       pieces Phrasly accepts (30–5,000 words a run)
    python3 humanize.py align   <original.txt> <drafts.json> [--keep k]   each original sentence beside its best match in every draft, with flags
    python3 humanize.py check   <original.txt> <final.txt> [--keep k]     what the final changed: facts, negations, typos, length

--keep is the facts list: a file with one must-keep fact per line, or "valid key; restart sshd". Write it before
humanizing (names, numbers, the exact claim, the action asked of the reader): detection alone can't know that
"valid key" or "restart sshd" matter.
    python3 humanize.py context <text.txt> --target "<exact span>" [--min 30]   the span plus enough context to reach 30 words
    python3 humanize.py splice  <text.txt> --target "<exact span>" --with <file|text>  replace only that span, everything else byte-identical

drafts.json is what phrasly_humanize returns (its "drafts": [{"draft", "text"}]) or a plain list of strings.
Everything is printed as JSON (align, check) or text (chunk, context, splice), so the caller reads it and decides.
Nothing here calls Phrasly: the skill does that with Browse Hack's phrasly_humanize.
"""
import argparse
import json
import re
import sys
from difflib import SequenceMatcher

# Deliberate slips Phrasly's strong modes add to look human. The skill fixes them in the final ("no faults").
SLIPS = [
    (r"\bits (allow|let|make|give|show|mean)s?\b", "\"its\" used as \"it's\" / \"it\""),
    (r"\byour (using|running|going|doing|on|in|not|getting)\b", "\"your\" for \"you're\""),
    (r"\bthere (checks?|code|key|keys|systems?|server|servers|data|own)\b", "\"there\" for \"their\""),
    (r"\b(this|it|that) effects\b", "\"effects\" for \"affects\""),
    (r"\ban (user|unique|use)\b", "\"an\" before a consonant sound"),
    (r"\b\w+'s\b(?=\s+(by|now|today|already))", "an apostrophe in a plural (\"distro's\")"),
    (r"\b(\w+) \1\b", "a doubled word"),
    (r"\b(could|should|would) of\b", "\"of\" for \"have\""),
    (r"\bthen (ever|before)\b", "\"then\" for \"than\""),
    (r"\balot\b", "\"alot\""),
    (r"\bits (been|not|revoked|rotated|patched|fixed|done|gone|over|true|safe|exposed|leaked)\b", "\"its\" for \"it's\""),
    (r"\b(untill|wont|dont|cant|didnt|doesnt|isnt|recieve|seperate|definately|occured|alot|thier|wich|becuase)\b", "a misspelling or a missing apostrophe"),
    (r"\b(he|she|they|we|I|you) (seen|done|gone)\b(?! by)", "a past participle for the past tense (\"seen\" for \"saw\")"),
    (r"\b(secrets|keys|they|we|users) was\b", "a plural with \"was\""),
    (r"\bits (due|around|about|because|so|very|just|a|an|the|like|going|getting|still|now|why|how|what|not)\b", "\"its\" for \"it's\""),
    (r"\b(more|less|rather|higher|lower|better|worse|faster|bigger|smaller|other)( \w+)? then\b", "\"then\" for \"than\""),
    (r"(?-i:(?<![A-Za-z])ai(?![A-Za-z]))", "\"ai\" in lower case"),
    (r"\bthere (has|is) been \w+ \w*s\b|\bthere has been about \d", "a singular verb with a plural (\"there has been about 3k commits\")"),
    (r"\bmore ok\b", "\"more ok\""),
]

# Number words → digits, so "twenty thousand", "20k" and "20,000" are the same fact.
_UNITS = {w: i for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split())}
_TENS = {w: 10 * i for i, w in enumerate("_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()) if w != "_"}
_SCALE = {"hundred": 100, "thousand": 1_000, "million": 1_000_000, "billion": 1_000_000_000}


def numbers(text: str) -> str:
    """Write every number the same way: words and "20k" / "2.4x" / "20,000" become plain digits."""
    t = text.lower().replace("per cent", "percent")
    t = re.sub(r"(\d),(\d{3})", r"\1\2", t)
    t = re.sub(r"(\d),(\d{3})", r"\1\2", t)
    t = re.sub(r"\b(\d+(?:\.\d+)?)\s?k\b", lambda m: str(int(float(m.group(1)) * 1000)), t)
    t = re.sub(r"\b(\d+(?:\.\d+)?)\s?(?:x|times)\b", r"\1 times", t)
    words_ = t.split()
    out, i = [], 0
    while i < len(words_):
        w = re.sub(r"[^a-z-]", "", words_[i])
        if w in _UNITS or w in _TENS:
            total, cur, j = 0, 0, i
            while j < len(words_):
                x = re.sub(r"[^a-z-]", "", words_[j])
                parts = x.split("-")
                if all(q in _UNITS or q in _TENS for q in parts) and x:
                    cur += sum(_UNITS.get(q, 0) + _TENS.get(q, 0) for q in parts)
                elif x == "hundred" and cur:
                    cur *= 100
                elif x in ("thousand", "million", "billion") and (cur or total):
                    total += (cur or 1) * _SCALE[x]
                    cur = 0
                elif x == "point" and j + 1 < len(words_) and re.sub(r"[^a-z]", "", words_[j + 1]) in _UNITS:
                    total += cur
                    cur = 0
                    dec = _UNITS[re.sub(r"[^a-z]", "", words_[j + 1])]
                    out.append(f"{total}.{dec}")
                    total, j = None, j + 2
                    break
                else:
                    break
                j += 1
            if total is not None:
                out.append(str(total + cur))
            i = j
        else:
            out.append(words_[i])
            i += 1
    return " ".join(out)
NEGATIONS = re.compile(r"\b(not|no|never|none|nothing|nobody|without|can't|cannot|don't|doesn't|didn't|isn't|aren't|wasn't|won't|shouldn't)\b|n't\b", re.I)


def read(path_or_text: str) -> str:
    try:
        with open(path_or_text, encoding="utf-8") as f:
            return f.read()
    except (FileNotFoundError, OSError):
        return path_or_text


def words(s: str) -> list[str]:
    return re.findall(r"\S+", s)


def sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text.strip())
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])[\"')\]]?\s+(?=[\"'(\[]?[A-Z0-9])", text)
    return [p.strip() for p in parts if p.strip()]


def protected(s: str) -> list[str]:
    """Tokens a humanizer must not change: numbers and versions, ids, names, quotes, code, URLs."""
    found = []
    found += re.findall(r"https?://\S+", s)
    found += re.findall(r"`[^`]+`", s)
    found += re.findall(r"[\"“][^\"”]{2,80}[\"”]", s)
    found += re.findall(r"\b[A-Z]{2,}(?:-\d+)+\b", s)  # CVE-2026-1234
    found += [m.rstrip(".,") for m in re.findall(r"[$€£₹]?\d[\d,.]*(?:%| percent|\s?(?:billion|million|thousand)\b|(?:[kKmMbB]n?|ms|GB|MB|TB)\b)?", s)]
    found += re.findall(r"\bv?\d+(?:\.\d+)+[a-z]?\d*\b", s)
    # names and products: a capitalised word that isn't the sentence's first word
    toks = re.findall(r"[A-Za-z][\w.+-]*", s)
    found += [t for i, t in enumerate(toks) if (i > 0 and t[0].isupper() or re.search(r"[a-z][A-Z]|[A-Z]{2}", t)) and t not in {"I"}]
    seen, out = set(), []
    for t in (x.strip() for x in found):
        k = t.lower().rstrip(".,")
        if t and k not in seen and len(k) > 1:
            seen.add(k)
            out.append(t.rstrip(".,"))
    return out


def keep_list(arg: str | None) -> list[str]:
    if not arg:
        return []
    raw = read(arg)
    items = re.split(r"\n|;", raw)
    return [x.strip() for x in items if x.strip()]


def stem(w: str) -> str:
    """A rough stem, so "revokes", "revoked" and "revoking" all match "revoke"."""
    for suf in ("ing", "ed", "es", "s", "e"):
        if len(w) > 4 and w.endswith(suf):
            return w[: -len(suf)]
    return w


def has_fact(fact: str, text: str) -> bool:
    """A fact survives when each of its words appears in some form (revoked ~ revokes), in any order."""
    pct = lambda x: re.sub(r"\s*(percent|per cent)\b", "%", numbers(x))
    toks = lambda x: [w.strip(".") for w in re.findall(r"[a-z0-9$%.]+", pct(x)) if w.strip(".")]
    tw = {stem(w) for w in toks(text)}
    loose = {"a", "an", "the", "of", "to", "almost", "about", "around", "nearly", "roughly", "approximately", "close", "some"}
    return all(stem(w) in tw for w in toks(fact) if w not in loose)


def has_token(token: str, text: str) -> bool:
    norm = lambda x: re.sub(r"[^a-z0-9$%.]", "", re.sub(r"\s*percent\b", "%", x.lower()))
    return norm(token) in norm(text)


def slips(s: str) -> list[str]:
    return [why for pat, why in SLIPS if re.search(pat, s, re.I)]


def sim(a: str, b: str) -> float:
    ta, tb = re.findall(r"\w+", a.lower()), re.findall(r"\w+", b.lower())
    if not ta or not tb:
        return 0.0
    seq = SequenceMatcher(None, ta, tb).ratio()
    overlap = len(set(ta) & set(tb)) / len(set(ta) | set(tb))
    return round(0.5 * seq + 0.5 * overlap, 3)


def load_drafts(path: str) -> list[str]:
    data = json.loads(read(path))
    if isinstance(data, dict):
        data = data.get("drafts", [])
    return [d["text"] if isinstance(d, dict) else str(d) for d in data]


def cmd_chunk(a):
    text = read(a.file)
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, cur = [], []
    for p in paras:
        n = len(words(p))
        if n > a.max:
            raise SystemExit(f"A paragraph has {n} words, over the {a.max} a run takes: split it first.")
        if cur and len(words(" ".join(cur))) + n > a.max:
            chunks.append(cur)
            cur = []
        cur.append(p)
    if cur:
        chunks.append(cur)
    # a chunk under the minimum joins its neighbour, or is reported as too short to send alone
    merged = []
    for c in chunks:
        if merged and len(words(" ".join(c))) < a.min and len(words(" ".join(merged[-1] + c))) <= a.max:
            merged[-1] += c
        else:
            merged.append(c)
    out = []
    for i, c in enumerate(merged, 1):
        body = "\n\n".join(c)
        n = len(words(body))
        out.append({"chunk": i, "words": n, "ok": a.min <= n <= a.max, "text": body})
    print(json.dumps(out, indent=1, ensure_ascii=False))


def cmd_align(a):
    orig = sentences(read(a.original))
    drafts = [sentences(d) for d in load_drafts(a.drafts)]
    keep = keep_list(a.keep)
    rows = []
    used = [set() for _ in drafts]
    for i, s in enumerate(orig):
        prot = protected(s)
        neg = len(NEGATIONS.findall(s))
        cands = []
        for di, ds in enumerate(drafts):
            if not ds:
                continue
            # best match, with a pull towards the same position so order stays sensible
            # Phrasly often splits one sentence into two or three: score windows of 1-3 draft sentences
            best = None
            for j in range(len(ds)):
                for w in (1, 2, 3):
                    if j + w > len(ds):
                        break
                    d = " ".join(ds[j:j + w])
                    pos = 1 - abs(j / max(len(ds) - 1, 1) - i / max(len(orig) - 1, 1))
                    score = sim(s, d) + 0.05 * pos - 0.02 * (w - 1)
                    if best is None or score > best[0]:
                        best = (score, j, w, d)
            score, j, w, d = best
            used[di].update(range(j, j + w))
            missing = [t for t in prot if not has_token(t, d)]
            missing += [k for k in keep if has_fact(k, s) and not has_fact(k, d) and k not in missing]
            flags = []
            if missing:
                flags.append("lost or changed: " + ", ".join(missing))
            if len(NEGATIONS.findall(d)) != neg:
                flags.append("negation count differs: check the meaning")
            flags += ["slip: " + x for x in slips(d)]
            flags += [f"slip: \"{n}\" lost its capital" for n in prot if n[0].isupper() and re.search(rf"\b{re.escape(n.lower())}\b", d)]
            cands.append({"draft": di + 1, "text": d, "match": round(score, 3), "flags": flags})
        rows.append({"sentence": i + 1, "original": s, "protected": prot, "candidates": cands})
    extra = []
    for di, ds in enumerate(drafts):
        for j, d in enumerate(ds):
            if j not in used[di] and max((sim(d, s) for s in orig), default=0) < 0.3:
                extra.append({"draft": di + 1, "text": d, "note": "matches no original sentence: probably added content"})
    print(json.dumps({"sentences": rows, "added": extra}, indent=1, ensure_ascii=False))


def cmd_check(a):
    o, f = read(a.original), read(a.final)
    prot = []
    for sent in sentences(o):  # per sentence, so a sentence's first word isn't taken for a name
        prot += [t for t in protected(sent) if t not in prot]
    missing = [t for t in prot if not has_token(t, f)] + [k for k in keep_list(a.keep) if not has_fact(k, f)]
    no, nf = len(NEGATIONS.findall(o)), len(NEGATIONS.findall(f))
    so, sf = sentences(o), sentences(f)
    unmatched = [s for s in so if max((sim(s, x) for x in sf), default=0) < 0.25]
    report = {
        "words": {"original": len(words(o)), "final": len(words(f)), "change": f"{(len(words(f)) / max(len(words(o)), 1) - 1) * 100:+.0f}%"},
        "protected_missing": missing,
        "negations": {"original": no, "final": nf, "same": no == nf},
        "slips": [{"sentence": s, "slips": slips(s)} for s in sf if slips(s)],
        "original_sentences_without_a_match": unmatched,
        "identical_to_original": o.strip() == f.strip(),
    }
    report["ok"] = not missing and no == nf and not report["slips"] and not unmatched
    print(json.dumps(report, indent=1, ensure_ascii=False))


def find_span(text: str, target: str) -> tuple[int, int]:
    i = text.find(target)
    if i < 0:
        raise SystemExit("The target span isn't in the text exactly as given (check spaces and punctuation).")
    if text.find(target, i + 1) >= 0:
        raise SystemExit("The target span appears more than once: give a longer span.")
    return i, i + len(target)


def cmd_context(a):
    text = read(a.file)
    i, j = find_span(text, a.target)
    sents = sentences(text)
    # grow around the target sentence by sentence until there are enough words
    before, after = text[:i], text[j:]
    b_s, a_s = sentences(before), sentences(after)
    ctx_b, ctx_a = [], []
    while len(words(" ".join(ctx_b + [a.target] + ctx_a))) < a.min and (b_s or a_s):
        if a_s:
            ctx_a.append(a_s.pop(0))
        if len(words(" ".join(ctx_b + [a.target] + ctx_a))) < a.min and b_s:
            ctx_b.insert(0, b_s.pop())
    send = " ".join(ctx_b + [a.target] + ctx_a)
    print(json.dumps({"send": send, "words": len(words(send)), "before": ctx_b, "target": a.target, "after": ctx_a,
                      "note": "Send `send` to phrasly_humanize, then take only the part that matches the target and splice it back."},
                     indent=1, ensure_ascii=False))
    _ = sents


def cmd_splice(a):
    text = read(a.file)
    new = read(a.with_).strip()
    i, j = find_span(text, a.target)
    out = text[:i] + new + text[j:]
    assert out[:i] == text[:i] and out[i + len(new):] == text[j:]
    sys.stdout.write(out)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("chunk"); c.add_argument("file"); c.add_argument("--min", type=int, default=30); c.add_argument("--max", type=int, default=5000)
    c = sub.add_parser("align"); c.add_argument("original"); c.add_argument("drafts"); c.add_argument("--keep")
    c = sub.add_parser("check"); c.add_argument("original"); c.add_argument("final"); c.add_argument("--keep")
    c = sub.add_parser("context"); c.add_argument("file"); c.add_argument("--target", required=True); c.add_argument("--min", type=int, default=30)
    c = sub.add_parser("splice"); c.add_argument("file"); c.add_argument("--target", required=True); c.add_argument("--with", dest="with_", required=True)
    a = p.parse_args()
    {"chunk": cmd_chunk, "align": cmd_align, "check": cmd_check, "context": cmd_context, "splice": cmd_splice}[a.cmd](a)


if __name__ == "__main__":
    main()
