#!/usr/bin/env python3
"""research-character's helper: plan the batches, list what is done, check the answers, put dropped names back.

Standard library only. Every command takes --out, the research folder (one folder per work inside it,
batches/<work>.json with the questions, items.json with every question ever planned).

  rc.py batch --out DIR --work "Title" --names "Name" "Name (alias)" ... [--slug SLUG] [--aspects "a, b, c"]
  rc.py list  --out DIR [--json]
  rc.py check --out DIR [WORK-SLUG ...] [--json]
  rc.py fix-names --out DIR [WORK-SLUG ...]
  rc.py keep  --out DIR FILE          # move a cut-off answer aside (<name>-google.v1.md) before asking again

A character with no work behind it (a mascot, a public persona) takes --slug and no --work.
"""
import argparse, json, os, re, sys

DEFAULT_ASPECTS = ["character", "attitude", "style", "personality", "famous quotes", "backstory",
                   "famous scenes", "why fans love them"]
# What each default aspect looks like in an answer, to tell a complete report from a cut-off one.
ASPECT_WORDS = {
    "personality": r"personality|traits?|temperament|demeanou?r",
    "style": r"style|look|appearance|design|outfit|costume|fashion|aesthetic",
    "famous quotes": r"quote",
    "backstory": r"backstory|origin|past|history|childhood|early life|born",
    "famous scenes": r"scene|moment|fight|battle|arc|episode|chapter|showdown",
    "why fans love them": r"fans?\b.{0,20}(love|adore)|why fans|fan.favou?rite|why (people|viewers|audiences|readers|players)",
}
MIN_BODY = 3000          # characters; a full answer is usually 4–8k, a cut one stops short
LEAD_VERB = r"(is|are|was|were|serves|stands|remains|has|had|became|appears)"
# A word left hanging before punctuation ("…confidant in . Born…"): Google showed a name or a title there as a
# link chip, which the saved text lost. An ellipsis or a word after the mark ("the :re Café") is not one.
GAP = re.compile(r"\b(as|is|in|of|by|named|called|from|on|and|the) [,.;:)](?=\s|$)|\(\s*\)")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("'", "").replace("’", "")).strip("-")


def aspects_text(aspects):
    a = [x.strip() for x in aspects if x.strip()]
    return a[0] if len(a) == 1 else ", ".join(a[:-1]) + ", and " + a[-1]


def load(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")


def batches(out, only=None):
    bdir = os.path.join(out, "batches")
    names = sorted(f[:-5] for f in os.listdir(bdir) if f.endswith(".json")) if os.path.isdir(bdir) else []
    for s in names:
        if not only or s in only:
            yield s, load(os.path.join(bdir, s + ".json"), {})


def name_of(item, batch):
    """The character's name as asked: the query up to ' from <work>:' (or up to ':' with no work)."""
    q, work = item["query"], batch.get("work")
    if work and f" from {work}:" in q:
        return q.split(f" from {work}:")[0]
    head = q.split(":")[0]
    if "work" not in batch and " from " in head:   # a batch written by hand, without its work
        return head.rsplit(" from ", 1)[0]
    return head


def fpath(out, item, base="batches"):
    """An item's file: relative to the batch file (or items.json) that holds it, or absolute in older batches."""
    f = os.path.expanduser(item["file"])
    return f if os.path.isabs(f) else os.path.normpath(os.path.join(out, base, f))


def body_of(text):
    return text.split("\n## Sources")[0]


def first_line(lines):
    """Index of the answer's first line: after the title and the '_Google AI Mode…' line."""
    for k in range(1, len(lines)):
        l = lines[k].strip()
        if l and not l.startswith("#") and not l.startswith("_Google AI Mode"):
            return k
    return None


def dropped(line):
    return bool(re.match(rf"^(\*\*)?({LEAD_VERB}\b|\()|^[,—–]", line))


# ---------------------------------------------------------------- commands

def cmd_batch(a):
    out = os.path.expanduser(a.out)
    if not a.work and not a.slug:
        sys.exit("give --work, or --slug for characters with no work behind them")
    wslug = a.slug or slug(a.work)
    aspects = [x for x in (a.aspects.split(",") if a.aspects else DEFAULT_ASPECTS)]
    tail = aspects_text(aspects)
    items = []
    for n in a.names:
        n = n.strip()
        q = f"{n} from {a.work}: {tail}" if a.work else f"{n}: {tail}"
        items.append({"query": q, "file": f"../{wslug}/{slug(n)}-google.md"})
    bpath = os.path.join(out, "batches", wslug + ".json")
    old = load(bpath, {}) or {}
    have = {os.path.basename(i["file"]) for i in old.get("items", [])}
    merged = old.get("items", []) + [i for i in items if os.path.basename(i["file"]) not in have]
    save(bpath, {"work": a.work, "aspects": aspects, "items": merged})
    os.makedirs(os.path.join(out, wslug), exist_ok=True)
    master = load(os.path.join(out, "items.json"), {"items": []})
    seen = {fpath(out, i, ".") for i in master["items"]}
    master["items"] += [{"query": i["query"], "file": os.path.relpath(fpath(out, i), out)}
                        for i in merged if fpath(out, i) not in seen]
    save(os.path.join(out, "items.json"), master)
    done = sum(os.path.exists(fpath(out, i)) for i in merged)
    print(f"{bpath}: {len(merged)} characters ({len(merged) - len(old.get('items', []))} new, {done} already saved)")
    for i in merged:
        print(("  ✔ " if os.path.exists(fpath(out, i)) else "  · ") + os.path.relpath(fpath(out, i), out))


def cmd_list(a):
    out = os.path.expanduser(a.out)
    rows = []
    for s, b in batches(out):
        items = b.get("items", [])
        saved = [name_of(i, b) for i in items if os.path.exists(fpath(out, i))]
        todo = [name_of(i, b) for i in items if not os.path.exists(fpath(out, i))]
        rows.append({"slug": s, "work": b.get("work"), "saved": saved, "todo": todo})
    if a.json:
        print(json.dumps(rows, indent=1, ensure_ascii=False)); return
    if not rows:
        print(f"nothing researched in {out} yet"); return
    for r in rows:
        print(f"{r['slug']} ({r['work'] or 'no work'}): {len(r['saved'])} saved" + (f", {len(r['todo'])} to ask" if r["todo"] else ""))
        print("   " + ", ".join(r["saved"] + [f"[{t}]" for t in r["todo"]]))


def cmd_check(a):
    out = os.path.expanduser(a.out)
    report, bad = [], 0
    for s, b in batches(out, set(a.works) or None):
        aspects = b.get("aspects") or DEFAULT_ASPECTS
        for it in b.get("items", []):
            p, name = fpath(out, it), name_of(it, b)
            r = {"work": s, "name": name, "file": os.path.relpath(p, out), "problems": [], "notes": []}
            if not os.path.exists(p):
                r["problems"].append("not saved")
            else:
                text = open(p, encoding="utf-8").read()
                body = body_of(text)
                if len(body) < MIN_BODY:
                    r["problems"].append(f"short ({len(body)} characters): maybe cut off")
                for asp in aspects:
                    rx = ASPECT_WORDS.get(asp.strip().lower())
                    if rx is None:
                        words = [w for w in re.findall(r"[a-z]+", asp.lower()) if len(w) > 3]
                        rx = "|".join(words) if words else None
                    if rx and not re.search(rx, body, re.I):
                        r["problems"].append(f"no {asp.strip()}")
                if "\n## Sources" not in text:
                    r["notes"].append("no sources (Google showed none)")
                lines = body.split("\n")
                k = first_line(lines)
                if k is not None and dropped(lines[k]):
                    r["notes"].append("name dropped on the first line (fix-names)")
                gaps = [m for m in GAP.finditer(body) if not (k is not None and m.start() < len("\n".join(lines[:k + 1])) and dropped(lines[k]))]
                for m in gaps:
                    r["notes"].append("gap: …" + body[max(0, m.start() - 45):m.end() + 25].replace("\n", " ") + "…")
            bad += bool(r["problems"])
            report.append(r)
    if a.json:
        print(json.dumps(report, indent=1, ensure_ascii=False))
    else:
        for r in report:
            if r["problems"] or r["notes"]:
                print(("✖ " if r["problems"] else "· ") + f"{r['file']}: " + "; ".join(r["problems"] + r["notes"]))
        ok = sum(not r["problems"] for r in report)
        print(f"{ok} of {len(report)} complete" + (f", {bad} to ask again or look at" if bad else ""))
    sys.exit(1 if bad else 0)


def cmd_fix_names(a):
    out = os.path.expanduser(a.out)
    fixed = kept = 0
    for s, b in batches(out, set(a.works) or None):
        for it in b.get("items", []):
            p = fpath(out, it)
            if not os.path.exists(p):
                continue
            name = name_of(it, b)
            lines = open(p, encoding="utf-8").read().split("\n")
            k = first_line(lines)
            if k is None or not dropped(lines[k]):
                kept += 1; continue
            l = lines[k]
            # "Alias (Real name)": when the line already names one part, put the other one in front.
            m = re.match(r"^(.*?)\s*\((.*)\)$", name)
            if m:
                head = l[:160]
                a_, b_ = m.group(1).strip(), m.group(2).strip()
                name = b_ if a_ in head else a_ if b_ in head else name
            if re.match(rf"^\*\*({LEAD_VERB}\b|\()", l):
                new = "**" + name + " " + l[2:]
            elif re.match(rf"^({LEAD_VERB}\b|\()", l):
                new = "**" + name + "** " + l
            else:  # starts with a comma or a dash: ", known as …"
                new = "**" + name + "**" + l
            lines[k] = new
            with open(p, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
            fixed += 1
            print(f"  {os.path.relpath(p, out)}: {new[:90]}")
    print(f"names put back on {fixed} first lines; {kept} already had them")
    print("run check again: any 'gap' it lists is a name or title Google showed as a link chip, filled by hand")


def cmd_keep(a):
    p = os.path.expanduser(a.file)
    if not os.path.isabs(p):
        p = os.path.join(os.path.expanduser(a.out), p)
    if not p.endswith("-google.md") or not os.path.exists(p):
        sys.exit(f"no answer at {p}")
    n = 1
    while os.path.exists(p[:-3] + f".v{n}.md"):
        n += 1
    os.rename(p, p[:-3] + f".v{n}.md")
    print(f"kept the old answer as {os.path.basename(p[:-3] + f'.v{n}.md')}; run the batch again to ask once more")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("batch"); b.add_argument("--out", required=True); b.add_argument("--work")
    b.add_argument("--slug"); b.add_argument("--names", nargs="+", required=True); b.add_argument("--aspects")
    l = sub.add_parser("list"); l.add_argument("--out", required=True); l.add_argument("--json", action="store_true")
    c = sub.add_parser("check"); c.add_argument("--out", required=True); c.add_argument("works", nargs="*")
    c.add_argument("--json", action="store_true")
    f = sub.add_parser("fix-names"); f.add_argument("--out", required=True); f.add_argument("works", nargs="*")
    k = sub.add_parser("keep"); k.add_argument("--out", required=True); k.add_argument("file")
    a = ap.parse_args()
    {"batch": cmd_batch, "list": cmd_list, "check": cmd_check, "fix-names": cmd_fix_names, "keep": cmd_keep}[a.cmd](a)


if __name__ == "__main__":
    main()
