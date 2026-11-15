#!/usr/bin/env python3
"""thumbs shot / thumbs logo: the real pieces a thumbnail is built from (run by scripts/thumbs.ts).

  kit.py shot --dir=<job dir> --url=<page> --name=<name> [--width=1440] [--height=900] [--scale=2]
              [--wait=15000] [--crop=x,y,w,h]
      a real web page (a tool's screen, the result where it lives: a store page, a Spotify track)
      captured with headless Chrome in a throwaway profile (no sign-ins, nothing of the user's),
      at `scale`× → input/shots/<name>.png (+ <name>.full.png when cropped) and <name>.source.json
  kit.py logo --dir=<job dir> --query="<name> logo" [--pick=1] [--name=<file name>]
      an official logo from Wikimedia Commons: lists the best matches, downloads the picked one as a
      1200 px PNG render → assets/logos/<name>.png with <name>.source.json (page, licence, author),
      and says whether it is transparent
"""
import json, os, re, shutil, subprocess, sys, tempfile, time, urllib.parse, urllib.request

UA = {"User-Agent": "mediamake-thumbnails/1.0 (thumbnail kit)"}


def opts(argv):
    out = {}
    for a in argv:
        m = re.match(r"^--([a-z-]+)(?:=(.*))?$", a, re.S)
        if m:
            out[m.group(1)] = m.group(2) if m.group(2) is not None else "1"
    return out


def chrome():
    for p in (os.environ.get("CHROME_PATH"), "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "/Applications/Chromium.app/Contents/MacOS/Chromium", shutil.which("google-chrome"), shutil.which("chromium"),
              shutil.which("chromium-browser"), r"C:\Program Files\Google\Chrome\Application\chrome.exe"):
        if p and os.path.exists(p):
            return p
    sys.exit("thumbs shot needs Google Chrome or Chromium (or CHROME_PATH)")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def shot(o):
    d, url = o["dir"], o["url"]
    name = o.get("name") or slug(urllib.parse.urlparse(url).netloc + urllib.parse.urlparse(url).path)[:60]
    w, h, scale = int(o.get("width", 1440)), int(o.get("height", 900)), float(o.get("scale", 2))
    out_dir = os.path.join(d, "input", "shots")
    os.makedirs(out_dir, exist_ok=True)
    full = os.path.join(out_dir, f"{name}.png")
    profile = tempfile.mkdtemp(prefix="thumbs-shot-")
    try:
        subprocess.run([chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                        f"--user-data-dir={profile}", f"--window-size={w},{h}", f"--force-device-scale-factor={scale}",
                        f"--virtual-time-budget={int(o.get('wait', 15000))}", f"--screenshot={full}", url],
                       capture_output=True, timeout=180)
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    if not os.path.isfile(full):
        sys.exit(f"no screenshot came back from {url}")
    note = {"schema": "mediamake.source/v1", "tool": "thumbs shot", "url": url, "viewport": [w, h], "scale": scale,
            "takenAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    if o.get("crop"):
        from PIL import Image
        x, y, cw, ch = (int(float(v) * scale) for v in o["crop"].split(","))
        keep = os.path.join(out_dir, f"{name}.full.png")
        os.replace(full, keep)
        Image.open(keep).crop((x, y, x + cw, y + ch)).save(full)
        note["crop"] = o["crop"]
    with open(os.path.join(out_dir, f"{name}.source.json"), "w") as f:
        json.dump(note, f, indent=1)
    print(f"✔ input/shots/{name}.png  (look at it: a sign-in wall or a cookie banner is not the page)")


def api(params):
    q = urllib.parse.urlencode({**params, "format": "json"})
    with urllib.request.urlopen(urllib.request.Request(f"https://commons.wikimedia.org/w/api.php?{q}", headers=UA), timeout=30) as r:
        return json.load(r)


def logo(o):
    d, query = o["dir"], o["query"]
    hits = api({"action": "query", "list": "search", "srnamespace": 6, "srlimit": 6, "srsearch": query})["query"]["search"]
    hits = [h["title"] for h in hits if re.search(r"\.(svg|png)$", h["title"], re.I)]
    if not hits:
        sys.exit(f"nothing on Wikimedia Commons for \"{query}\": try the maker's press kit")
    for i, t in enumerate(hits, 1):
        print(f"  {i}. {t}")
    title = hits[int(o.get("pick", 1)) - 1]
    page = list(api({"action": "query", "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 1200, "titles": title})["query"]["pages"].values())[0]
    ii = page["imageinfo"][0]
    meta = ii.get("extmetadata", {})
    name = o.get("name") or slug(re.sub(r"^File:|\.(svg|png)$", "", title, flags=re.I))
    out_dir = os.path.join(d, "assets", "logos")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f"{name}.png")
    with urllib.request.urlopen(urllib.request.Request(ii.get("thumburl") or ii["url"], headers=UA), timeout=60) as r, open(out, "wb") as f:
        f.write(r.read())
    strip = lambda v: re.sub(r"<[^>]+>", "", (meta.get(v) or {}).get("value", "")).strip()
    with open(os.path.join(out_dir, f"{name}.source.json"), "w") as f:
        json.dump({"schema": "mediamake.source/v1", "tool": "thumbs logo", "query": query, "title": title,
                   "url": ii.get("descriptionurl"), "licence": strip("LicenseShortName"), "author": strip("Artist")}, f, indent=1)
    transparent = "?"
    try:
        from PIL import Image
        im = Image.open(out)
        transparent = "yes" if im.mode in ("RGBA", "LA") and min(im.getchannel("A").getextrema()) == 0 else "no"
    except Exception:  # noqa: BLE001
        pass
    print(f"✔ assets/logos/{name}.png  ({title}; licence: {strip('LicenseShortName') or '?'}; transparent: {transparent})")


if __name__ == "__main__":
    {"shot": shot, "logo": logo}[sys.argv[1]](opts(sys.argv[2:]))
