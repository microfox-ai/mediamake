#!/usr/bin/env python3
"""thumbs inspire: leading channels' hits and misses as thumbnail references (run by scripts/thumbs.ts).

A channel's videos are scored against the channel itself: views ÷ the median views of its recent
videos. The top few are its hits, the bottom few its misses; seeing both is the point (most traits of
a hit are on the misses too). Nothing here needs a key: yt-dlp lists the videos, i.ytimg.com serves
the thumbnails.

  inspire.py grab  --dir=<set folder> --dest=<download folder> [--have=<folder that may already hold them>]
                   [--winners=8] [--losers=3] [--search="<query>"] [--limit=30] @handle…
  inspire.py board --dir=<set folder> --from=<folder holding the images> [--title="…"] [--location=<shown path>]

grab   writes <dir>/research/listings.json and picks.json, and downloads each picked thumbnail to
       <dest>/<file> with a <file>.source.json beside it (the media library's sidecar)
board  clones the images into <dir>/<id>.jpg, draws <dir>/sheet.jpg and writes <dir>/index.json
       (mediamake.image-set/v1) so the set opens in /file-revision; <dir>/research/tags.json, when
       there, adds each picture's tags to its note
"""
import json, math, os, re, shutil, statistics, subprocess, sys, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

LIST_END = 140        # newest N videos listed per channel
SKIP_NEWEST = 8       # still gathering views: left out of the scoring
MAX_SCORED = 100      # videos scored per channel
MIN_SCORED = 20       # a channel with fewer is skipped
MIN_DURATION = 150    # seconds: trailers and teasers out
TW, TH, LABEL, HEAD, COLS, PAD = 256, 144, 20, 26, 6, 4


def opts(argv):
    flags, rest = {}, []
    for a in argv:
        m = re.match(r"^--([a-z-]+)(?:=(.*))?$", a, re.S)
        if m:
            flags[m.group(1)] = m.group(2) if m.group(2) is not None else "1"
        else:
            rest.append(a)
    return flags, rest


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def human(n):
    n = float(n or 0)
    for unit, div in (("B", 1e9), ("M", 1e6), ("K", 1e3)):
        if n >= div:
            v = n / div
            return (f"{v:.1f}" if v < 10 else f"{v:.0f}") + unit
    return str(int(n))


def ytdlp(url, end):
    out = subprocess.run(["yt-dlp", "--flat-playlist", "--playlist-end", str(end), "-J", url],
                         capture_output=True, text=True, timeout=300)
    if out.returncode != 0 or not out.stdout.strip():
        raise RuntimeError(((out.stderr or "").strip().splitlines() or ["no output"])[-1])
    return json.loads(out.stdout)


def list_channel(handle):
    h = handle if handle.startswith(("@", "http")) else "@" + handle
    url = h if h.startswith("http") else f"https://www.youtube.com/{h}/videos"
    try:
        d = ytdlp(url, LIST_END)
    except Exception as e:  # noqa: BLE001
        return {"handle": h, "error": str(e)}
    vids = [{"n": i, "id": e["id"], "title": e.get("title"), "views": e.get("view_count"),
             "duration": e.get("duration"), "live": e.get("live_status")}
            for i, e in enumerate(d.get("entries") or []) if e and e.get("id")]
    return {"handle": h, "channel": d.get("channel") or d.get("uploader") or h, "channelId": d.get("channel_id"),
            "followers": d.get("channel_follower_count"), "videos": vids}


def score_channel(ch, winners, losers):
    vids = [v for v in ch["videos"] if v["n"] >= SKIP_NEWEST and v.get("views")
            and (v.get("duration") or 0) >= MIN_DURATION and v.get("live") in (None, "not_live", "was_live")][:MAX_SCORED]
    if len(vids) < MIN_SCORED:
        return None
    med = statistics.median(v["views"] for v in vids)
    for v in vids:
        v["score"] = round(v["views"] / med, 2)
    ranked = sorted(vids, key=lambda v: -v["score"])
    return {"median": med, "winners": ranked[:winners], "losers": ranked[-losers:][::-1] if losers else []}


def fetch(p, dest, have):
    if have and os.path.isfile(os.path.join(have, p["file"])):
        return "have"
    os.makedirs(dest, exist_ok=True)
    out = os.path.join(dest, p["file"])
    if os.path.isfile(out) and os.path.getsize(out) > 4000:
        return "have"
    for name in ("maxresdefault.jpg", "hq720.jpg", "sddefault.jpg", "mqdefault.jpg"):
        try:
            req = urllib.request.Request(f"https://i.ytimg.com/vi/{p['id']}/{name}", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
        except (urllib.error.URLError, TimeoutError, OSError):
            continue
        if len(data) > 4000:
            with open(out, "wb") as f:
                f.write(data)
            how = {"W": "hit", "L": "miss", "S": "search result"}[p["role"]]
            note = f"{how} #{p['rank']} on {p['handle']}: {p['views']:,} views"
            if p.get("score"):
                note += f", x{p['score']} of the channel's median ({int(p['median']):,})"
            side = {"schema": "mediamake.source/v1", "tool": "yt-dlp", "ref": p["id"],
                    "url": f"https://www.youtube.com/watch?v={p['id']}", "title": p["title"],
                    "query": f"youtube thumbnail {p['set']} {p['channel']}", "author": p["channel"], "note": note}
            with open(out + ".source.json", "w") as f:
                json.dump(side, f, indent=1)
            return "new"
    return "FAIL"


def grab(flags, handles):
    d, dest, have = flags["dir"], flags["dest"], flags.get("have")
    name = re.sub(r"^inspire-", "", os.path.basename(d.rstrip("/")))
    winners, losers = int(flags.get("winners", 8)), int(flags.get("losers", 3))
    os.makedirs(os.path.join(d, "research"), exist_ok=True)
    picks, listings = [], []
    with ThreadPoolExecutor(max_workers=6) as ex:
        for ch in ex.map(list_channel, handles):
            if ch.get("error"):
                print(f"⚠ {ch['handle']}: {ch['error']}")
                continue
            listings.append(ch)
            s = score_channel(ch, winners, losers)
            if not s:
                print(f"⚠ {ch['handle']}: fewer than {MIN_SCORED} videos to score, skipped")
                continue
            for role, rows in (("W", s["winners"]), ("L", s["losers"])):
                for r, v in enumerate(rows, 1):
                    picks.append({"set": name, "handle": ch["handle"], "channel": ch["channel"], "followers": ch.get("followers"),
                                  "median": s["median"], "role": role, "rank": r, "id": v["id"], "title": v["title"],
                                  "views": v["views"], "score": v["score"],
                                  "file": f"{name}__{slug(ch['handle'])}__{role}{r}__{v['id']}.jpg"})
            print(f"  {ch['handle']:28s} median {human(s['median']):>6} views · best x{s['winners'][0]['score']} · "
                  f"worst x{s['losers'][0]['score'] if s['losers'] else '-'}")
    if flags.get("search"):
        q, limit = flags["search"], int(flags.get("limit", 30))
        try:
            rows = [e for e in (ytdlp(f"ytsearch{limit}:{q}", limit).get("entries") or []) if e and e.get("id") and e.get("view_count")]
        except Exception as e:  # noqa: BLE001
            rows = []
            print(f"⚠ search: {e}")
        rows = [e for e in rows if (e.get("duration") or 0) >= MIN_DURATION]
        for r, e in enumerate(sorted(rows, key=lambda e: -e["view_count"]), 1):
            picks.append({"set": name, "handle": "search", "channel": e.get("channel") or e.get("uploader") or "?", "followers": None,
                          "median": None, "role": "S", "rank": r, "id": e["id"], "title": e.get("title"), "views": e["view_count"],
                          "score": None, "query": q, "file": f"{name}__search__S{r}__{e['id']}.jpg"})
        print(f"  search \"{q}\": {len(rows)} videos")
    with open(os.path.join(d, "research", "listings.json"), "w") as f:
        json.dump(listings, f, indent=1)
    with open(os.path.join(d, "research", "picks.json"), "w") as f:
        json.dump(picks, f, indent=1)
    counts = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        for how in ex.map(lambda p: fetch(p, dest, have), picks):
            counts[how] = counts.get(how, 0) + 1
    print(f"✔ {len(picks)} thumbnails picked ({', '.join(f'{v} {k}' for k, v in counts.items()) or 'none'})")
    if not picks:
        sys.exit(1)


def clone(src, dst):
    if sys.platform == "darwin" and subprocess.run(["cp", "-c", src, dst], capture_output=True).returncode == 0:
        return
    shutil.copy2(src, dst)


def font(size):
    from PIL import ImageFont
    for p in ("/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf",
              "C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def board(flags, _):
    from PIL import Image, ImageDraw
    d, src_dir = flags["dir"], flags["from"]
    job = os.path.basename(d.rstrip("/"))
    name = re.sub(r"^inspire-", "", job)
    with open(os.path.join(d, "research", "picks.json")) as f:
        picks = json.load(f)
    tags = {}
    tf = os.path.join(d, "research", "tags.json")
    if os.path.isfile(tf):
        with open(tf) as f:
            tags = {t["file"]: t for t in json.load(f)}
    order = []
    for p in picks:
        if p["handle"] not in order:
            order.append(p["handle"])
    groups, blocks = [], []
    for handle in order:
        rows = [p for p in picks if p["handle"] == handle and os.path.isfile(os.path.join(src_dir, p["file"]))]
        if not rows:
            continue
        items = []
        for p in rows:
            p["iid"] = f"{slug(handle)}-{p['role']}{p['rank']}"
            dst = os.path.join(d, p["iid"] + ".jpg")
            if not os.path.isfile(dst):
                clone(os.path.join(src_dir, p["file"]), dst)
            how = {"W": "hit", "L": "miss", "S": "search"}[p["role"]]
            note = f"{how}{' x' + str(p['score']) if p.get('score') else ''} · {human(p['views'])} views · {p['title']}"
            if p["role"] == "S":
                note += f" · {p['channel']}"
            t = tags.get(p["file"])
            if t:
                note += f" · [{t.get('hero')}, {t.get('words')} words, {t.get('layout')}]"
            items.append({"id": p["iid"], "file": p["iid"] + ".jpg", "note": note})
        first = rows[0]
        if handle == "search":
            head, idea = f"Search: {first.get('query')}", "the most-viewed results for this search (no channel median to score against)"
        else:
            head = f"{first['channel']} ({handle})"
            idea = f"median {human(first['median'])} views · {human(first['followers'])} subscribers · hits and misses by views ÷ the channel's median"
        groups.append({"id": slug(handle), "name": head, "idea": idea, "items": items})
        wins, rest = [p for p in rows if p["role"] != "L"], [p for p in rows if p["role"] == "L"]
        blocks.append((f"{head}  ·  {idea.split(' · hits')[0]}", wins + ([None] if rest else []) + rest))

    f_label, f_head = font(12), font(15)
    W = COLS * (TW + PAD) + PAD
    H = PAD + sum(HEAD + math.ceil(len(slots) / COLS) * (TH + LABEL + PAD) for _, slots in blocks)
    sheet = Image.new("RGB", (W, H), (18, 18, 20))
    draw = ImageDraw.Draw(sheet)
    y = PAD
    for head, slots in blocks:
        draw.text((PAD + 2, y + 4), head, fill=(235, 235, 235), font=f_head)
        y += HEAD
        for i, p in enumerate(slots):
            if p is None:
                continue
            im = Image.open(os.path.join(d, p["iid"] + ".jpg")).convert("RGB")
            w, h = im.size
            if abs(w / h - 16 / 9) > 0.02:  # a 4:3 fallback with bars: its 16:9 middle
                nh = int(w * 9 / 16)
                im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
            x, ty = PAD + (i % COLS) * (TW + PAD), y + (i // COLS) * (TH + LABEL + PAD)
            sheet.paste(im.resize((TW, TH), Image.LANCZOS), (x, ty))
            label = f"{p['role']}{p['rank']}  {'x' + str(p['score']) + '  ' if p.get('score') else ''}{human(p['views'])}"
            draw.text((x + 2, ty + TH + 3), label, fill=(255, 120, 110) if p["role"] == "L" else (120, 230, 150), font=f_label)
        y += math.ceil(len(slots) / COLS) * (TH + LABEL + PAD)
    sheet.save(os.path.join(d, "sheet.jpg"), quality=88)

    index = {"schema": "mediamake.image-set/v1", "job": job, "kind": "inspiration",
             "title": flags.get("title") or f"Thumbnail inspiration: {name}", "workflow": "create-thumbnail",
             "source": (flags.get("location") or job) + "/research/picks.json", "location": flags.get("location") or job,
             "path": os.path.abspath(d), "sourcePath": os.path.abspath(os.path.join(d, "research", "picks.json")),
             "pick": {"max": 20, "label": "Like this"}, "groups": groups, "picked": [], "kept": []}
    with open(os.path.join(d, "index.json"), "w") as f:
        json.dump(index, f, indent=1, ensure_ascii=False)
    print(f"✔ {sum(len(g['items']) for g in groups)} thumbnails from {len(groups)} sources")


if __name__ == "__main__":
    cmd, (flags, rest) = sys.argv[1], opts(sys.argv[2:])
    {"grab": grab, "board": board}[cmd](flags, rest)
