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
  kit.py swap --dir=<job dir> --gen=<generated image> --pic=<real picture> --name=<name>
      a generated host holding a solid chroma-green card (a mascot, a hand): the real picture is
      centre-cropped to the card's shape, warped onto it (its corners from the green region), lit
      like the card, shown only where the card was green (hands and props in front stay), and the
      green rim cleared → input/held/<name>.png and <name>.quad.png (the card's area)
  kit.py solid --dir=<job dir> --name=<name>
      after `thumbs cutout` of input/held/<name>.png: the card's area stays opaque in the cutout
      (background removal reads a picture's black parts as background) and its rim loses any green
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


def swap(o):
    import numpy as np
    from PIL import Image, ImageDraw
    from scipy import ndimage
    d, name = o["dir"], o["name"]
    im = Image.open(o["gen"]).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (g > r + 35) & (g > b + 25) & (g > 90)
    lab, n = ndimage.label(green)
    if n == 0:
        sys.exit("no green card in the generated image: ask for 'a solid bright chroma-key green square card'")
    big = lab == (int(np.argmax(ndimage.sum(green, lab, range(1, n + 1)))) + 1)
    hull = ndimage.binary_fill_holes(ndimage.binary_closing(big, iterations=4))
    ys, xs = np.nonzero(hull)
    pts = np.stack([xs, ys], 1).astype(np.float64)
    s, df = pts.sum(1), pts[:, 0] - pts[:, 1]
    tl, br, tr, bl = pts[s.argmin()], pts[s.argmax()], pts[df.argmax()], pts[df.argmin()]
    w = (np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2
    h = (np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2
    P = Image.open(o["pic"]).convert("RGB")
    ar, (pw, ph) = w / h, P.size
    if pw / ph > ar:
        nw = int(ph * ar); P = P.crop(((pw - nw) // 2, 0, (pw - nw) // 2 + nw, ph))
    else:
        nh = int(pw / ar); P = P.crop((0, (ph - nh) // 2, pw, (ph - nh) // 2 + nh))
    P = P.resize((max(2, int(w * 2)), max(2, int(h * 2))), Image.LANCZOS)
    W, H = P.size
    A, B = [], []
    for (x, y), (u, v) in zip([tuple(tl), tuple(tr), tuple(br), tuple(bl)], [(0, 0), (W, 0), (W, H), (0, H)]):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
        B += [u, v]
    warped = np.asarray(P.transform(im.size, Image.PERSPECTIVE, np.linalg.solve(np.array(A), np.array(B)).tolist(), Image.BICUBIC)).astype(np.float32)
    qm = Image.new("L", im.size, 0)
    ImageDraw.Draw(qm).polygon([tuple(tl), tuple(tr), tuple(br), tuple(bl)], fill=255)
    quad = np.asarray(qm) > 0
    card = green & ndimage.binary_dilation(quad, iterations=3)
    hull = hull | card
    shade = np.clip(g / max(np.percentile(g[card], 92), 1.0), 0.72, 1.0)
    mix = (ndimage.gaussian_filter(card.astype(np.float32), 0.8) * hull)[..., None]
    out = a * (1 - mix) + warped * shade[..., None] * mix
    near = ndimage.binary_dilation(quad, iterations=5)
    rest = near & (out[..., 1] > out[..., 0] + 12) & (out[..., 1] > out[..., 2] + 8)
    inside = rest & ndimage.binary_dilation(quad, iterations=2)
    out[inside] = warped[inside] * shade[inside][..., None]
    outside = rest & ~inside
    out[..., 1][outside] = np.maximum(out[..., 0], out[..., 2])[outside]
    od = os.path.join(d, "input", "held")
    os.makedirs(od, exist_ok=True)
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(od, f"{name}.png"))
    qm.save(os.path.join(od, f"{name}.quad.png"))
    with open(os.path.join(od, f"{name}.source.json"), "w") as f:
        json.dump({"schema": "mediamake.source/v1", "tool": "thumbs swap", "generated": o["gen"], "picture": o["pic"],
                   "card": [list(map(int, p)) for p in (tl, tr, br, bl)]}, f, indent=1)
    print(f"✔ input/held/{name}.png  (the real picture on the card; look at its edges)")


def solid(o):
    import numpy as np
    from PIL import Image
    from scipy import ndimage
    d, name = o["dir"], o["name"]
    q = np.asarray(Image.open(os.path.join(d, "input", "held", f"{name}.quad.png")).convert("L")) > 0
    p = os.path.join(d, "cutouts", f"{name}.png")
    cut = np.asarray(Image.open(p).convert("RGBA")).astype(np.float32)
    inner = ndimage.binary_erosion(q, iterations=1)
    cut[..., 3][inner] = 255
    ring = ndimage.binary_dilation(q, iterations=12) & ~inner
    gr = ring & (cut[..., 1] > cut[..., 0] + 4) & (cut[..., 1] > cut[..., 2])
    cut[..., 1][gr] = np.maximum(cut[..., 0], cut[..., 2])[gr]
    Image.fromarray(cut.clip(0, 255).astype(np.uint8)).save(p)
    print(f"✔ cutouts/{name}.png  (the held picture kept solid)")


if __name__ == "__main__":
    {"shot": shot, "logo": logo, "swap": swap, "solid": solid}[sys.argv[1]](opts(sys.argv[2:]))
