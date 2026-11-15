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
  kit.py pic --query="<what>" --dest=<folder> [--have=<library folder>] [--pick=1] [--name=…] [--width=3000]
      a real photo from Wikimedia Commons (NASA, museums, free press pictures): lists the matches
      with size and licence, downloads the picked one with <file>.source.json (page, author,
      licence, the credit line a CC licence asks for); skips it when the library already has it
  kit.py globe --dir=<job dir> --lat=<°> --lon=<°> --name=<name> [--texture=…] [--size=2000] [--gamma=0.62]
      the Earth as a globe with that place at the centre, from NASA's Blue Marble → cutouts/<name>.png
  kit.py swap --dir=<job dir> --gen=<generated image> --pic=<real picture> --name=<name>
      a generated host holding a solid chroma-green card (a mascot, a hand): the real picture is
      centre-cropped to the card's shape, warped onto it (its corners from the green region), lit
      like the card, shown only where the card was green (hands and props in front stay), and the
      green rim cleared → input/held/<name>.png and <name>.quad.png (the card's area)
  kit.py solid --dir=<job dir> --name=<name>
      after `thumbs cutout` of input/held/<name>.png: the card's area stays opaque in the cutout
      (background removal reads a picture's black parts as background) and its rim loses any green
"""
import json, os, re, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request

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


def get(url, timeout=60, tries=5):
    """Wikimedia answers 429 when asked too fast: wait as long as it says (or 5, 10, 20… s) and retry."""
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or i == tries - 1:
                raise
            wait = int(e.headers.get("Retry-After") or 0) or 5 * 2 ** i
            print(f"  (Wikimedia asks to slow down: waiting {wait} s)", flush=True)
            time.sleep(min(wait, 120))


def api(params):
    q = urllib.parse.urlencode({**params, "format": "json"})
    return json.loads(get(f"https://commons.wikimedia.org/w/api.php?{q}", 30))


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
    data = get(ii.get("thumburl") or ii["url"])
    with open(out, "wb") as f:
        f.write(data)
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


def pic(o):
    """A real photo from Wikimedia Commons (NASA, museums, press pictures under free licences): the
    best matches with their size and licence, the picked one at `width` px (or its original size)
    into `dest` with the library's <file>.source.json, and a credit line when the licence asks for one."""
    query, dest = o["query"], o["dest"]
    hits = api({"action": "query", "list": "search", "srnamespace": 6, "srlimit": 12, "srsearch": query})["query"]["search"]
    titles = [h["title"] for h in hits if re.search(r"\.(jpe?g|png|tiff?)$", h["title"], re.I)]
    if not titles:
        sys.exit(f"nothing on Wikimedia Commons for \"{query}\": try other words, the maker's press kit or Google Images (Browse Hack)")
    width = int(o.get("width", 3000))
    pages = api({"action": "query", "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": width,
                 "titles": "|".join(titles)})["query"]["pages"].values()
    info = {p["title"]: p["imageinfo"][0] for p in pages if p.get("imageinfo")}
    strip = lambda m, v: re.sub(r"<[^>]+>", "", (m.get(v) or {}).get("value", "")).strip()
    titles = [t for t in titles if t in info]
    for i, t in enumerate(titles, 1):
        ii = info[t]
        print(f"  {i}. {t}  {ii['width']}×{ii['height']}  {strip(ii.get('extmetadata', {}), 'LicenseShortName') or '?'}")
    title = titles[int(o.get("pick", 1)) - 1]
    ii, meta = info[title], info[title].get("extmetadata", {})
    url = ii.get("thumburl") if ii["width"] > width and ii.get("thumburl") else ii["url"]
    ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
    ext = ".jpg" if ext in (".jpeg", ".tif", ".tiff") else ext
    name = (o.get("name") or slug(re.sub(r"^File:|\.(jpe?g|png|tiff?)$", "", title, flags=re.I)))[:60]
    have = o.get("have")
    if have and os.path.isdir(have) and any(f.startswith(name + ".") and not f.endswith(".json") for f in os.listdir(have)):
        print(f"✔ {name}: already in the library ({have})")
        print(f"FILE {name}")
        return
    os.makedirs(dest, exist_ok=True)
    out = os.path.join(dest, name + ext)
    data = get(url, 120)
    with open(out, "wb") as f:
        f.write(data)
    licence, author = strip(meta, "LicenseShortName"), strip(meta, "Artist")
    free = re.search(r"public domain|^pd|cc0", licence, re.I) is not None
    credit = None if free else f"{title[5:]} by {author or 'unknown'}, {licence or 'licence unknown'}, via Wikimedia Commons"
    with open(out + ".source.json", "w") as f:
        json.dump({"schema": "mediamake.source/v1", "tool": "wikimedia-commons", "query": query,
                   "title": re.sub(r"^File:|\.(jpe?g|png|tiff?)$", "", title, flags=re.I), "file": title,
                   "pageUrl": ii.get("descriptionurl"), "url": url, "author": author or None, "licence": licence or None,
                   "credit": credit, "downloadedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, f, indent=1)
    print(f"✔ {name}{ext}  ({title}; {licence or '?'}{'' if free else '; credit it in the description: ' + credit})")
    print(f"FILE {name}")


def globe(o):
    """The Earth as a globe turned to a place: NASA's Blue Marble (an equirectangular texture, public
    domain) projected orthographically with the place at the centre, the dark ocean lifted, the limb
    shaded and a thin atmosphere rim → cutouts/<name>.png (transparent outside the disc).
    `--lat`/`--lon` put that point at the centre; a point elsewhere on the globe sits at
    (sin of its angular distance north of the centre) × radius above the centre."""
    import numpy as np
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    d, name, N = o["dir"], o["name"], int(o.get("size", 2000))
    texture = o.get("texture") or os.path.join(d, "input", "pictures", "earth-texture.jpg")
    if not os.path.isfile(texture):
        sys.exit('no Earth texture: mm thumbs pic <job> "Land shallow topo 2048" --name=earth-texture --subject=space/earth')
    tex = (np.asarray(Image.open(texture).convert("RGB")).astype(np.float32) / 255) ** float(o.get("gamma", 0.62))
    TH, TW = tex.shape[:2]
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    u, v = (x - N / 2 + 0.5) / (N / 2), -(y - N / 2 + 0.5) / (N / 2)
    r2 = u * u + v * v
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    p0, l0 = np.radians(float(o["lat"])), np.radians(float(o["lon"]))
    lat = np.arcsin(np.clip(z * np.sin(p0) + v * np.cos(p0), -1, 1))
    lon = (l0 + np.arctan2(u, z * np.cos(p0) - v * np.sin(p0)) + np.pi) % (2 * np.pi) - np.pi
    rgb = tex[((np.pi / 2 - lat) / np.pi * TH).astype(int).clip(0, TH - 1), ((lon + np.pi) / (2 * np.pi) * TW).astype(int).clip(0, TW - 1)]
    rgb = rgb * (0.6 + 0.4 * z)[..., None]
    rim = np.clip((np.sqrt(r2) - 0.9) / 0.1, 0, 1)[..., None]
    rgb = rgb * (1 - 0.35 * rim) + np.array([0.45, 0.7, 1.0]) * 0.35 * rim
    a = np.clip((1 - np.sqrt(r2)) * N / 2, 0, 1)
    os.makedirs(os.path.join(d, "cutouts"), exist_ok=True)
    Image.fromarray((np.dstack([rgb.clip(0, 1), a]) * 255).astype(np.uint8), "RGBA").save(os.path.join(d, "cutouts", f"{name}.png"))
    print(f"✔ cutouts/{name}.png  ({o['lat']}, {o['lon']} at the centre of a {N} px disc)")


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
    {"shot": shot, "logo": logo, "pic": pic, "globe": globe, "swap": swap, "solid": solid}[sys.argv[1]](opts(sys.argv[2:]))
