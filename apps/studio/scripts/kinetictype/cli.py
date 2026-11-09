"""kinetictype: the make-kinetictype skills' tools — a kinetic-typography edit from a picture, a quote and music.

  mm kinetictype <command> …

  pick <song> [--length=24] [--top=3]
      the best stretches of a long instrumental for an edit: a quiet build into a drop ~4 s in, big
      section hits after it, a dip at the end (good for a loop). Prints them, plots <song>.kt-pick.png.
  new <slug> --music=<file> [--from=S --to=S | --pick] [--length=24] [--image=<file>] [--quote="…"]
      the project: projects/<slug>/ with input/original.*, input/music.wav (the stretch, gained to a
      -1.8 dBFS peak, 20 ms fades so it loops), input/quote.txt, manifest.json, video/index.tsx,
      video/edit.json (a placeholder), prefs.md; then runs `hits`.
  hits <slug>
      the music's map → analysis/hits.json + hits.png: beats, onsets, bass hits, the riser and the drop,
      the section hits after it, the dips; the manifest's sections follow it.
  grid <slug> [--file=input/original.jpg]
      the picture with a coordinate grid (analysis/grid.jpg), to choose crops by eye.
  crops <slug> --boxes='{"c0-art":[x0,y0,x1,y1],"c1-face":[…]}'
      input/crops/<name>.png and <name>-1024.png (upscaled for Midjourney's edit), and a sheet.
  cutout <slug> <file.png>… [--all] [--size=2048]
      rembg (isnet-anime) cut-outs → input/cutouts/<name>.png and a check sheet (--all keeps every part:
      a group of characters).
  sheet <folder> [--out=<jpg>]
      a labelled contact sheet of the pictures in a folder (Midjourney results, pins).
  storyboard <slug> [--quote="…"] [--key=WORD] [--title="…"]
      a first video/edit.json from the quote, analysis/hits.json and input/assets.json (see the skill).
  kit <slug>
      clones the sound-effect kit from the media library into input/sfx/ (media find + media use).
  sfx <slug> [--auto]
      the sound: video/sfx.json cues (made from edit.json the first time, or with --auto) mixed over the
      music through a limiter → input/mix-sfx.wav, which becomes the manifest's audio.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]  # apps/studio
PROJ = ROOT / "projects"


def die(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)


def user_path(p):
    """A path the user typed: relative to where they ran npm (INIT_CWD), not to apps/studio."""
    q = Path(p).expanduser()
    return q if q.is_absolute() else Path(os.environ.get("INIT_CWD") or os.getcwd()) / q


def P(slug):
    d = PROJ / slug
    return d


def clone(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if subprocess.run(["cp", "-c", str(src), str(dst)], capture_output=True).returncode != 0:
        shutil.copyfile(src, dst)


def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *map(str, args)], check=True)


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout
    return float(out.strip() or 0)


# ======================================================================== audio analysis

def envelopes(path, sr=22050, hop=512):
    import librosa
    y, _ = librosa.load(path, sr=sr, mono=True)
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
    f = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low = S[f < 150].sum(0)
    t = librosa.times_like(rms, sr=sr, hop_length=hop)
    return y, sr, hop, t, 20 * np.log10(rms + 1e-6), low / (low.max() + 1e-9)


def movmean(x, n):
    n = max(1, int(n))
    c = np.cumsum(np.insert(x, 0, 0))
    out = np.empty_like(x)
    for i in range(len(x)):
        a, b = max(0, i - n // 2), min(len(x), i + n // 2 + 1)
        out[i] = (c[b] - c[a]) / (b - a)
    return out


def contrast(db, fps, span=2.0):
    """post-mean minus pre-mean of the loudness at every frame (dB): high where a drop lands."""
    n = int(span * fps)
    c = np.cumsum(np.insert(db, 0, 0))
    out = np.zeros_like(db)
    for i in range(n, len(db) - n):
        out[i] = (c[i + n] - c[i]) / n - (c[i] - c[i - n]) / n
    return out


def drop_curve(db, low, fps):
    """High where a drop lands: the bass coming back in (low-band contrast over 0.75 s) while the mix gets louder."""
    lc = contrast(movmean(low, 0.1 * fps), fps, 0.75)
    dc = contrast(movmean(db, 0.25 * fps), fps, 1.0)
    return np.maximum(lc, 0) * 20 + np.maximum(dc, 0) * 0.5


def low_hits(low, t, fps):
    import librosa
    dl = np.maximum(0, np.diff(low, prepend=low[0]))
    dl = dl / (dl.max() + 1e-9)
    pk = librosa.util.peak_pick(dl, pre_max=4, post_max=4, pre_avg=15, post_avg=15, delta=0.08, wait=int(0.3 * fps))
    return [(float(t[i]), float(dl[i])) for i in pk if dl[i] > 0.15]


def cmd_pick(a):
    song = user_path(a.song)
    y, sr, hop, t, db, low = envelopes(song)
    fps = sr / hop
    dur = len(y) / sr
    L = a.length
    con = drop_curve(db, low, fps)
    hits = low_hits(low, t, fps)
    med = np.median(db)
    import librosa
    drops = librosa.util.peak_pick(con, pre_max=int(3 * fps), post_max=int(3 * fps), pre_avg=1, post_avg=1, delta=0, wait=int(4 * fps))
    cands = []
    for i in drops:
        if con[i] < 6:
            continue
        d = float(t[i])
        best = None
        for lead in np.arange(3.0, 5.01, 0.25):
            s0, s1 = d - lead, d - lead + L
            if s0 < 0 or s1 > dur:
                continue
            w = (t >= s0) & (t < s1)
            after = (t >= d) & (t < s1)
            tail = (t >= s1 - 0.8) & (t < s1)
            n_hits = sum(1 for h, st in hits if d + 1.5 < h < s1 and st > 0.5)
            score = con[i] + 0.35 * (db[after].mean() - med) + 0.6 * min(n_hits, 5) + 0.15 * (db[w].mean() - db[tail].mean()) - 0.4 * abs(lead - 4)
            if best is None or score > best[0]:
                best = (score, round(s0, 2), round(s1, 2), round(d, 2), n_hits, round(float(con[i]), 1))
        if best:
            cands.append(best)
    cands.sort(reverse=True)
    picked = []
    for c in cands:
        if all(abs(c[1] - p[1]) > L * 0.6 for p in picked):
            picked.append(c)
        if len(picked) >= a.top:
            break
    out = [{"score": round(c[0], 1), "from": c[1], "to": c[2], "drop": c[3], "sectionHits": c[4], "dropDb": c[5]} for c in picked]
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(max(12, dur / 6), 3.2))
    ax.plot(t, db, lw=0.6, color="#555")
    for k, c in enumerate(out):
        ax.axvspan(c["from"], c["to"], color=["#e02b3e", "#4cc3ff", "#ff8a2a"][k % 3], alpha=0.18)
        ax.axvline(c["drop"], color="k", lw=0.8)
        ax.text(c["from"], db.max(), f" {k + 1}", va="top")
    ax.set_xlim(0, dur)
    plt.tight_layout()
    png = song.with_name(song.stem + ".kt-pick.png")
    plt.savefig(png, dpi=60)
    for k, c in enumerate(out):
        prev = song.with_name(f"{song.stem}.kt-pick-{k + 1}.mp3")
        ff("-ss", c["from"], "-t", c["to"] - c["from"], "-i", song, "-c:a", "libmp3lame", "-b:a", "192k", prev)
        c["preview"] = str(prev)
    for k, c in enumerate(out):
        m = lambda s: f"{int(s // 60)}:{s % 60:05.2f}"
        print(f"{k + 1}. {m(c['from'])}–{m(c['to'])}  drop {m(c['drop'])}  section hits {c['sectionHits']}  (+{c['dropDb']}, score {c['score']})  → {c['preview']}")
    print(f"plot: {png}")
    return out


def cmd_hits(a):
    import librosa
    d = P(a.slug)
    music = d / "input" / "music.wav"
    y, sr, hop, t, db, low = envelopes(music)
    fps = sr / hop
    dur = len(y) / sr
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
    tempo = float(np.atleast_1d(librosa.feature.tempo(onset_envelope=env, sr=sr, hop_length=256, start_bpm=120, std_bpm=0.6))[0])
    _, beats = librosa.beat.beat_track(onset_envelope=env, sr=sr, hop_length=256, bpm=tempo, units="time")
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
    ot = librosa.times_like(oenv, sr=sr, hop_length=256)
    pk = librosa.util.peak_pick(oenv, pre_max=5, post_max=5, pre_avg=15, post_avg=15, delta=1.0, wait=8)
    onsets = [(round(float(ot[i]), 3), round(float(oenv[i] / oenv.max()), 2)) for i in pk if oenv[i] / oenv.max() > 0.3]
    lows = [(round(h, 3), round(s, 2)) for h, s in low_hits(low, t, fps)]
    smooth = movmean(db, 0.25 * fps)
    con = drop_curve(db, low, fps)
    lo, hi = int(1.5 * fps), int(min(dur * 0.6, dur - 3) * fps)
    i = lo + int(np.argmax(con[lo:hi]))
    drop = float(t[i])
    # the bass usually lands a little before the drums: take the strongest bass hit within 0.5 s before
    near = [h for h, s in lows if drop - 0.5 <= h <= drop + 0.15 and s > 0.2]
    if near:
        drop = min(near)
    pre = (t >= 0.3) & (t < drop - 0.3)
    q = float(t[pre][np.argmin(smooth[pre])]) if pre.any() else max(0.0, drop - 3)
    riser = [round(min(max(q, drop - 4.5), drop - 2.0), 2) if drop > 2.5 else 0.0, round(drop, 3)]

    # section hits: strong bass hits after the drop where the bass comes back in (after a gap or a slide)
    def reentry(h):
        a0, a1 = (t >= h - 0.5) & (t < h - 0.05), (t >= h) & (t < h + 0.5)
        return low[a0].mean() < 0.75 * low[a1].mean() if a0.any() and a1.any() else False

    cands = sorted([(s, h) for h, s in lows if h > drop + 1.5 and s >= 0.5 and reentry(h)], reverse=True)
    sections = []
    for s, h in cands:
        if all(abs(h - x) >= 2.5 for x in sections):
            sections.append(h)
    sections = sorted(sections)
    med = np.median(db[t > drop])
    quiet = (db < med - 10) & (t > drop)
    dips, start = [], None
    for k, qv in enumerate(quiet):
        if qv and start is None:
            start = t[k]
        if not qv and start is not None:
            if t[k] - start > 0.25:
                dips.append([round(float(start), 2), round(float(t[k]), 2)])
            start = None
    out = {"duration": round(dur, 3), "tempo": round(tempo, 2), "beat": round(60 / tempo, 4), "beats": [round(float(b), 3) for b in beats],
           "onsets": onsets, "low": lows, "drop": round(drop, 3), "riser": riser, "sections": [round(x, 3) for x in sections], "dips": dips}
    (d / "analysis").mkdir(exist_ok=True)
    json.dump(out, open(d / "analysis" / "hits.json", "w"), indent=1)
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(3, 1, figsize=(20, 7), sharex=True)
    ax[0].plot(t, db, lw=0.7)
    ax[1].plot(t, low, color="r", lw=0.7)
    ax[2].plot(ot, oenv, color="g", lw=0.7)
    for x in ax:
        x.axvspan(riser[0], riser[1], color="#ffd", alpha=0.6)
        x.axvline(drop, color="k", lw=1.2)
        for s in sections:
            x.axvline(s, color="m", lw=1)
    ax[2].set_xticks(np.arange(0, dur + 0.01, 1))
    plt.tight_layout()
    plt.savefig(d / "analysis" / "hits.png", dpi=55)
    # the manifest's sections follow the map
    mf = d / "manifest.json"
    if mf.exists():
        m = json.load(open(mf))
        marks = [0.0, riser[0], drop, *sections, dur]
        names = ["open", "build", "drop", *[f"s{k + 1}" for k in range(len(sections))]]
        m["sections"] = [{"label": names[k], "from": marks[k], "to": marks[k + 1]} for k in range(len(names)) if marks[k + 1] > marks[k]]
        m["beats"] = {"bpm": round(tempo, 2), "list": [{"t": o[0], "strength": o[1]} for o in onsets], "mode": "onsets"}
        m["audio"]["duration"] = round(dur, 3)
        json.dump(m, open(mf, "w"), indent=1)
    print(f"tempo {tempo:.1f} bpm · riser {riser[0]}–{riser[1]} · drop {drop:.2f} · sections {', '.join(f'{x:.2f}' for x in sections) or 'none'} · dips {dips}")
    print(f"plot: {d / 'analysis' / 'hits.png'}")


# ======================================================================== the project

INDEX = """// {title}: a kinetic-type edit (make-kinetictype). The whole edit is data: video/edit.json; the sound is the
// manifest's audio. Write `mm kinetictype storyboard {slug}` for a first draft.
import edit from './edit.json';
import {{ defineKinetic, type KineticEdit }} from '../../../src/kinetictype';

export default defineKinetic('{slug}', edit as KineticEdit);
"""


def cmd_new(a):
    d = P(a.slug)
    if (d / "video" / "edit.json").exists() and not a.force:
        die(f"{d} already has video/edit.json (--force to start again)")
    for sub in ["input", "analysis", "video"]:
        (d / sub).mkdir(parents=True, exist_ok=True)
    music = user_path(a.music)
    if a.pick:
        a2 = argparse.Namespace(song=str(music), length=a.length, top=1)
        best = cmd_pick(a2)
        if not best:
            die("no stretch with a drop found; give --from/--to")
        a.__dict__["from"], a.to = best[0]["from"], best[0]["to"]
    start = float(getattr(a, "from") or 0)
    end = float(a.to) if a.to else start + a.length
    ff("-ss", start, "-t", end - start, "-i", music, "-ac", "2", "-ar", 48000, "-c:a", "pcm_s16le", d / "input" / "music-raw.wav")
    vol = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(d / "input" / "music-raw.wav"), "-af", "volumedetect", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    peak = float(re.search(r"max_volume: (-?[\d.]+)", vol).group(1))
    gain = min(6.0, -1.8 - peak)
    L = end - start
    ff("-i", d / "input" / "music-raw.wav", "-af", f"volume={gain:.2f}dB,afade=t=in:st=0:d=0.02,afade=t=out:st={L - 0.03:.3f}:d=0.03",
       "-c:a", "pcm_s16le", d / "input" / "music.wav")
    if a.image:
        img = user_path(a.image)
        clone(img, d / "input" / f"original{img.suffix.lower()}")
    if a.quote:
        (d / "input" / "quote.txt").write_text(a.quote.strip() + "\n")
    title = a.title or (a.quote.split(".")[0][:40] if a.quote else a.slug)
    manifest = {"version": 1, "slug": a.slug, "title": title, "artist": "", "preparedAt": "",
                "audio": {"src": f"{a.slug}/input/music.wav", "duration": round(L, 3)}, "lyrics": [],
                "sections": [{"label": "all", "from": 0, "to": round(L, 3)}], "beats": {"bpm": None, "list": []},
                "energy": {"rate": 10, "values": []}, "assets": {},
                "brief": f"kinetic-type edit (make-kinetictype): {Path(music).name} {start:.2f}–{end:.2f} s" + (f", quote: {a.quote}" if a.quote else "")}
    json.dump(manifest, open(d / "manifest.json", "w"), indent=1)
    (d / "video" / "index.tsx").write_text(INDEX.format(slug=a.slug, title=title))
    first = (a.quote or a.slug).split()[0].upper()
    json.dump({"version": 1, "label": title.upper(), "flashes": [],
               "shots": [{"id": "x1", "type": "slam", "from": 0, "to": round(L, 3), "ground": "#e02b3e", "rows": [first], "color": "#0a0a0a"}]},
              open(d / "video" / "edit.json", "w"), indent=1)
    if not (d / "prefs.md").exists():
        (d / "prefs.md").write_text(f"# {title}: prefs and lessons\n\nThe brief: {manifest['brief']}.\n\n## The user's words\n\n")
    print(f"✔ {d} · music {start:.2f}–{end:.2f} s ({L:.2f} s, gain {gain:+.1f} dB)")
    cmd_hits(argparse.Namespace(slug=a.slug))


def cmd_grid(a):
    from PIL import Image, ImageDraw
    d = P(a.slug)
    src = d / (a.file or next(str(p.relative_to(d)) for p in (d / "input").glob("original.*")))
    im = Image.open(src).convert("RGB")
    k = 2 if max(im.size) < 1400 else 1
    im = im.resize((im.width * k, im.height * k))
    dr = ImageDraw.Draw(im)
    step = 50 if max(im.size) / k < 1600 else 100
    for x in range(0, im.width // k, step):
        dr.line([(x * k, 0), (x * k, im.height)], fill=(255, 0, 0), width=1)
        dr.text((x * k + 3, 3), str(x), fill=(255, 0, 0))
    for y in range(0, im.height // k, step):
        dr.line([(0, y * k), (im.width, y * k)], fill=(0, 0, 255), width=1)
        dr.text((3, y * k + 3), str(y), fill=(0, 0, 255))
    out = d / "analysis" / "grid.jpg"
    im.save(out, quality=85)
    print(f"✔ {out} (coordinates in the original's pixels, {im.width // k}×{im.height // k})")


def sheet(files, out, th=360, cols=8):
    from PIL import Image, ImageDraw
    tiles = []
    for f in files:
        im = Image.open(f).convert("RGB")
        w = int(im.width * th / im.height)
        im = im.resize((min(w, int(th * 1.3)), th))
        ImageDraw.Draw(im).rectangle([0, 0, 8 * len(Path(f).stem) + 8, 20], fill="black")
        ImageDraw.Draw(im).text((4, 4), Path(f).stem, fill="yellow")
        tiles.append(im)
    rows = [tiles[i : i + cols] for i in range(0, len(tiles), cols)] or [[]]
    W = max(sum(t.width + 6 for t in r) for r in rows) or 10
    s = Image.new("RGB", (W, len(rows) * (th + 6)), "gray")
    for r, row in enumerate(rows):
        x = 0
        for t in row:
            s.paste(t, (x, r * (th + 6)))
            x += t.width + 6
    s.save(out, quality=82)
    return out


def cmd_crops(a):
    from PIL import Image
    d = P(a.slug)
    boxes = json.loads(user_path(a.boxes).read_text()) if not a.boxes.strip().startswith("{") else json.loads(a.boxes)
    src = next((d / "input").glob("original.*"))
    im = Image.open(src).convert("RGB")
    out = d / "input" / "crops"
    out.mkdir(parents=True, exist_ok=True)
    files = []
    for name, b in boxes.items():
        c = im.crop(tuple(b))
        c.save(out / f"{name}.png")
        s = 1024 / max(c.size)
        c.resize((round(c.width * s), round(c.height * s)), Image.LANCZOS).save(out / f"{name}-1024.png")
        files.append(out / f"{name}-1024.png")
        print(f"  {name}: {c.size[0]}×{c.size[1]} → {name}-1024.png")
    json.dump(boxes, open(out / "boxes.json", "w"), indent=1)
    print(f"✔ sheet {sheet(files, out / '_sheet.jpg', th=400)}")


def cmd_cutout(a):
    d = P(a.slug)
    out = d / "input" / "cutouts"
    out.mkdir(parents=True, exist_ok=True)
    checks = []
    for f in a.files:
        src = d / f if (d / f).exists() else user_path(f)
        dst = out / f"{src.stem}.png"
        cmd = ["uv", "run", "-q", "--with", "rembg[cpu]", "--with", "scipy", "--with", "pillow", "python",
               str(ROOT / "scripts" / "kinetictype" / "cutout.py"), str(src), str(dst), f"--size={a.size}"]
        if a.all:
            cmd.append("--all")
        subprocess.run(cmd, check=True)
        checks.append(Path(str(dst) + ".check.jpg"))
    print(f"✔ checks {sheet(checks, out / '_checks.jpg', th=400)}")


def cmd_sheet(a):
    folder = user_path(a.folder)
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp") and not p.name.startswith("_"))
    print(f"✔ {sheet(files, user_path(a.out) if a.out else folder / '_sheet.jpg')} ({len(files)} pictures)")


# ======================================================================== the storyboard

def snap(x, times, lo=None, hi=None):
    c = [o for o in times if (lo is None or o >= lo) and (hi is None or o <= hi)]
    return min(c, key=lambda o: abs(o - x)) if c else x


def group_words(words):
    """Short words ride with the next one ("IN YOUR"), never with the last word."""
    out, i = [], 0
    while i < len(words):
        if len(words[i]) <= 2 and i + 1 < len(words) - 1:
            out.append(f"{words[i]} {words[i + 1]}")
            i += 2
        else:
            out.append(words[i])
            i += 1
    return out


def cmd_storyboard(a):
    d = P(a.slug)
    H = json.load(open(d / "analysis" / "hits.json"))
    A = json.load(open(d / "input" / "assets.json"))
    quote = (a.quote or (d / "input" / "quote.txt").read_text()).strip()
    words = [w for w in re.sub(r"[^\w\s'’-]", " ", quote).upper().split()]
    key = (a.key or max(words, key=len)).upper()
    if key not in words:
        die(f"--key {key} is not a word of the quote")
    ki = words.index(key)
    pre, post = words[:ki], words[ki + 1 :]
    small = " ".join(post[:-1]) or None
    big = post[-1] if post else key
    groups = group_words(pre) if pre else []
    S = lambda p: f"{a.slug}/input/{p}"
    plates = {k: S(v) for k, v in A["plates"].items()}
    teams = {k: S(v) for k, v in A.get("teams", {}).items()}
    faces = [{**f, "src": S(f["src"])} for f in A.get("faces", [])]
    fist = A.get("fist") and {**A["fist"], "src": S(A["fist"]["src"])}
    fistfire = A.get("fistFire") and {**A["fistFire"], "src": S(A["fistFire"]["src"])}
    pl = lambda *names: [plates[n] for n in names if n in plates] or list(plates.values())
    bright, dark = pl("riso", "lino"), pl("neon", "fire", "oil")
    colour = plates.get("colour") or list(plates.values())[-1]
    team = lambda *names: next((teams[n] for n in names if n in teams), None)

    E = H["duration"]
    drop = H["drop"]
    r0 = H["riser"][0]
    beat = H["beat"]
    ons = [o for o, s in H["onsets"]]
    lows = [h for h, s in H["low"]]
    secs = [s for s in H["sections"] if s > drop + 1.5]
    # where the sections go: faces, the rise, the win, the end — from the section hits, else by proportion
    want = 4
    fr = [0.27, 0.40, 0.53, 0.80]
    marks = secs[:want] + [drop + f * (E - drop) for f in fr[len(secs[:want]) :]]
    marks = sorted(marks)[:want]
    sA, sB, sC, sD = marks
    shots = []
    sid = iter(range(1, 999))
    nid = lambda p: f"{p}{next(sid)}"

    # ---- open + build: one word group per beat of the riser, the last one strobing into the drop
    strobe_at = drop - min(0.2, beat * 0.4)
    # one group per beat, counted back from the drop on the song's pulse (a short excerpt's beat tracking is
    # unreliable, the drop isn't), each snapped to an onset within 60 ms when there is one
    n = len(groups)
    step = beat if 0.35 <= beat <= 0.75 else 0.5
    times = []
    for k in range(n, 0, -1):
        x = drop - k * step
        near = [o for o in ons if abs(o - x) <= 0.06]
        times.append(near[0] if near else x)
    times = [max(0.25, x) for x in times]
    first = times[0] if times else drop
    if first > 0.3:
        op = A.get("open", {})
        shots.append({"id": "o1", "type": "open", "from": 0, "to": round(first, 3), "plate": plates.get(op.get("plate", "lino"), bright[0]),
                      "face": op.get("face", [0.5, 0.25]), "label": "out of the white (the loop lands here)"})
    looks = [("red", "ink", 0), ("ink", "paper", 1), ("knock", None, 2), ("red", "ink", 3), ("knock", None, 4), ("paper", "red", 5)]
    knocks = pl("oil", "lino", "fire")
    nk = 0
    for k, (g, at) in enumerate(zip(groups, times)):
        to = times[k + 1] if k + 1 < len(times) else strobe_at
        ground, color, _ = looks[k % len(looks)]
        sh = {"id": f"b{k + 1}", "type": "slam", "from": round(at, 3), "to": round(to, 3), "label": g, "invertStart": True, "amp": round((at - r0) / max(0.1, drop - r0), 2)}
        if ground == "knock":
            sh.update({"knock": knocks[nk % len(knocks)], "rows": g.split() if len(g.split()) == 2 else [g] * (3 if len(g) <= 7 else 1), "y": 960, "max": 1000})
            nk += 1
        else:
            fc = faces[k % len(faces)] if faces else None
            sh.update({"ground": {"red": "#e02b3e", "ink": "#0a0a0a", "paper": "#fbfbfa"}[ground], "rows": [g],
                       "color": {"ink": "#0a0a0a", "paper": "#fbfbfa", "red": "#e02b3e"}[color], "echoes": ground != "paper",
                       "y": 700 if ground == "paper" else 640, "max": 1100 if len(g) <= 3 else 1500,
                       "lines": "#fff" if ground == "ink" else "#0a0a0a"})
            if fc:
                sh["cut"] = {"src": fc["src"], "f": fc["f"], "at": [540, 1120], "w": 1700}
        shots.append(sh)
    if groups:
        shots.append({"id": f"b{len(groups) + 1}", "type": "strobe", "from": round(strobe_at, 3), "to": round(drop, 3), "word": groups[-1], "label": "strobe into the drop"})

    # ---- the drop: the key word letter by letter, then on the plates, cracked, bursting out of a mouth
    letters = list(key)
    dons = [o for o in ons if drop + 0.12 < o < sA - 1.4]
    lh = [drop]
    for o in dons:
        if len(lh) >= len(letters):
            break
        if o - lh[-1] >= 0.14:
            lh.append(o)
    while len(lh) < len(letters):
        lh.append(lh[-1] + beat / 2)
    letter_looks = []
    for k in range(len(letters)):
        kind = k % 4
        if kind in (0, 2):
            letter_looks.append({"knock": list(plates.values())[k % len(plates)], "y": 860})
        else:
            fc = faces[k % len(faces)] if faces and k % 3 else None
            tm = team("riso", "lino", "colour")
            ground = ["#e02b3e", "#0a0a0a", "#fbfbfa"][k % 3]
            look = {"ground": ground, "color": "#0a0a0a" if ground == "#e02b3e" else "#fbfbfa" if ground == "#0a0a0a" else "#e02b3e",
                    "lines": "#fff" if ground == "#0a0a0a" else "#0a0a0a"}
            if fc:
                look["cut"] = {"src": fc["src"], "f": fc["f"], "at": [540, 1220], "w": 1650}
                look["y"] = 720
            elif tm:
                look["cut"] = {"src": tm, "f": [0.5, 0.5], "at": [540, 1330], "w": 1500}
                look["y"] = 760
            letter_looks.append(look)
    after = [o for o in ons if o > lh[-1] + 0.12 and o < sA - 0.9]
    word_t = []
    for o in after:
        if not word_t or o - word_t[-1] >= 0.35:
            word_t.append(o)
        if len(word_t) >= 4:
            break
    while len(word_t) < 4:
        word_t.append((word_t[-1] if word_t else lh[-1]) + 0.45)
    shots.append({"id": "d1", "type": "letters", "from": round(drop, 3), "to": round(word_t[0], 3), "word": key, "hits": [round(x, 3) for x in lh],
                  "looks": letter_looks, "label": f"{key} letter by letter"})
    wplates = (bright + dark)[:3]
    for k in range(3):
        p = wplates[k % len(wplates)]
        neon = "neon" in p
        shots.append({"id": f"d{k + 2}", "type": "slam", "from": round(word_t[k], 3), "to": round(word_t[k + 1], 3), "plate": p, "rows": [key],
                      "color": "#4cc3ff" if neon else ("#e02b3e" if k == 1 else "#fbfbfa"), "glow": "#4cc3ff" if neon else None, "y": 1400,
                      "width": 1000, "invertStart": True, "label": f"{key} on a plate"})
    burst_from = snap(word_t[3] + 0.36, lows + ons, word_t[3] + 0.25, sA - 0.6)
    shots.append({"id": "d5", "type": "crack", "from": round(word_t[3], 3), "to": round(burst_from, 3), "word": key, "ground": "#e02b3e", "color": "#0a0a0a",
                  "y": 520, "echoes": True, "crackAt": round(word_t[3] + 0.1, 3), "label": f"{key} cracks",
                  **({"cut": {"src": team("lino", "riso", "colour"), "f": [0.5, 0.5], "at": [540, 1300], "w": 1500}} if team("lino", "riso", "colour") else {})})
    mouth = next((f for f in faces if f.get("mouth")), faces[0] if faces else None)
    if mouth:
        shots.append({"id": "d6", "type": "burst", "from": round(burst_from, 3), "to": round(sA, 3), "word": key, "diveAt": round(sA - 0.57, 3),
                      "cut": {"src": mouth.get("burstSrc", mouth["src"]), "f": mouth.get("mouth", mouth["f"]), "at": [430, 900], "w": 1900},
                      "label": f"{key} bursts out of the scream"})
    else:
        shots[-1]["to"] = round(sA, 3)

    # ---- faces on the bass hits, the key word running vertically behind
    fh = [sA] + [h for h in lows if sA + 0.3 < h < sB - 0.3]
    fh = [h for k, h in enumerate(fh) if k == 0 or h - fh[k - 1] >= 0.3][:6]
    grounds = [("#e02b3e", "#0a0a0a", "#0a0a0a"), ("#0a0a0a", "#e02b3e", "#fff"), ("#fbfbfa", "#e02b3e", "#0a0a0a")]
    if faces:
        shots.append({"id": "f1", "type": "faces", "from": round(sA, 3), "to": round(sB, 3), "word": key, "label": "faces",
                      "faces": [{"at": round(h, 3), "ground": grounds[k % 3][0], "color": grounds[k % 3][1], "lines": grounds[k % 3][2],
                                 "cut": faces[k % len(faces)]["src"], "f": faces[k % len(faces)]["f"], "side": "right" if k % 2 == 0 else "left"}
                                for k, h in enumerate(fh)]})

    # ---- the rise: a fist (or a face) climbing towards the outline of the last word, the small word above
    roll = [o for o in ons if sB <= o < sC - 0.25]
    riser_cut = fist or (faces[0] if faces else None)
    if riser_cut:
        shots.append({"id": "r1", "type": "rise", "from": round(sB, 3), "to": round(sC, 3), "big": big, "small": small,
                      "smallAt": round(snap(sB + 0.27 * (sC - sB), roll, sB, sC) if small else sB, 3),
                      "cut": {"src": riser_cut["src"], "f": riser_cut.get("f", [0.5, 0.15]), "at": [540, 860], "w": 1500}, "roll": [round(x, 3) for x in roll],
                      "blackAt": round(sC - 0.2, 3), "label": f"the rise: {small or ''} {big}".strip()})

    # ---- the win: cracked with the fist punching through, fire, windows, the plates, the flashes
    span = sD - sC
    wo = [o for o in ons if sC < o < sD]
    cuts = [sC]
    for f in [0.19, 0.32, 0.44, 0.56, 0.68, 0.80]:
        cuts.append(snap(sC + f * span, wo, cuts[-1] + 0.25, sD - 0.3))
    cuts.append(sD)
    crack_cut = fist or (faces[0] if faces else None)
    shots.append({"id": "w1", "type": "crack", "from": round(cuts[0], 3), "to": round(cuts[1], 3), "word": big, "ground": "#e02b3e", "color": "#0a0a0a",
                  "y": 1010, "crackAt": round(snap(sC + 0.36, wo, sC + 0.2, cuts[1]), 3), "label": f"{big} cracked, the fist through it",
                  **({"cut": {"src": crack_cut["src"], "f": crack_cut.get("f", [0.5, 0.15]), "at": [560, 520], "w": 1700}} if crack_cut else {})})
    ff2 = fistfire or crack_cut
    shots.append({"id": "w2", "type": "slam", "from": round(cuts[1], 3), "to": round(cuts[2], 3), "ground": "#0a0a0a", "rows": [big], "color": "#ff8a2a",
                  "echoes": True, "y": 900, "width": 1000, "label": f"{big} in fire",
                  **({"cut": {"src": ff2["src"], "f": ff2.get("f", [0.5, 0.2]), "at": [560, 560], "w": 1500}} if ff2 else {})})
    shots.append({"id": "w3", "type": "slam", "from": round(cuts[2], 3), "to": round(cuts[3], 3), "knock": pl("fire", "oil")[0], "rows": [big, big, big],
                  "y": 960, "width": 1000, "label": f"{big} ×3, windows onto the fire"})
    for k, p in enumerate((pl("fire") + pl("oil") + pl("neon"))[:3]):
        neon = "neon" in p
        shots.append({"id": f"w{4 + k}", "type": "slam", "from": round(cuts[3 + k], 3), "to": round(cuts[4 + k], 3), "plate": p, "rows": [big],
                      "color": "#4cc3ff" if neon else "#fbfbfa", "glow": "#4cc3ff" if neon else None, "y": 1390, "width": 760, "label": f"{big} on a plate"})
    shots.append({"id": "w7", "type": "flash", "from": round(cuts[6], 3), "to": round(sD, 3), "word": big, "plates": list(plates.values()), "label": "every plate flashing"})

    # ---- the end: the quote slammed phrase by phrase, the lockup, the crack, the rush into the white (the loop)
    chunks = [" ".join(groups[i : i + 2]) for i in range(0, len(groups), 2)] or []
    eo = [o for o in ons if sD < o < E - 1.2]
    ph_t = [sD]
    for o in eo:
        if len(ph_t) >= len(chunks) + 1:
            break
        if o - ph_t[-1] >= 0.14:
            ph_t.append(o)
    while len(ph_t) < len(chunks) + 1:
        ph_t.append(ph_t[-1] + 0.35)
    final_at = snap(ph_t[-1] + 0.34, eo, ph_t[-1] + 0.2) if eo else ph_t[-1] + 0.34
    crack_at = snap(final_at + 1.36, lows + ons, final_at + 0.8, E - 1.0)
    shots.append({"id": "e1", "type": "poster", "from": round(sD, 3), "to": round(E, 3), "plate": colour,
                  **({"cutout": team("colour")} if team("colour") else {}),
                  "phrases": [{"at": round(t_, 3), "text": c} for t_, c in zip(ph_t, chunks)] + [{"at": round(ph_t[len(chunks)], 3), "text": key, "color": "#e02b3e"}],
                  "final": {"at": round(final_at, 3), "top": key, "bottom": (" ".join(post) + ".") if post else key, "crackAt": round(crack_at, 3)},
                  "warp": {"at": round(E - 0.77, 3), "face": A.get("warp", {}).get("face", [0.4, 0.15])}, "label": "the end: the quote, the crack, the rush into white"})

    edit = {"version": 1, "label": (a.title or " / ".join([key, " ".join(post)]).strip(" /")).upper(),
            "flashes": [round(x, 3) for x in [drop, sA, sC, sD]], "shots": shots}
    for s in shots:
        for k in [k for k, v in s.items() if v is None]:
            del s[k]
    out = d / "video" / "edit.json"
    if out.exists():
        clone(out, d / "video" / "edit.prev.json")
    json.dump(edit, open(out, "w"), indent=1)
    shots_map = [{"id": s["id"], "from": s["from"], "to": s["to"], "label": s.get("label", s["type"]), "section": s["type"]} for s in shots]
    json.dump(shots_map, open(d / "video" / "shots.json", "w"), indent=1)
    print(f"✔ {out}: {len(shots)} shots · key {key} · build {groups} · rise {small} {big}")
    for s in shots:
        print(f"  {s['id']:4} {s['from']:6.2f}–{s['to']:6.2f}  {s['type']:8} {s.get('label', '')}")


# ======================================================================== the sound

KIT = {  # name: (preferred library id, search words)
    "boom.wav": ("2a0152374f", "impact synth low boom"), "impact.mp3": ("b26c5eac15", "impact"), "punch.mp3": ("58b2aa57f2", "punch"),
    "whoosh.mp3": ("2d770f849a", "hero whoosh"), "whoosh-a.mp3": ("eea089078a", "whoosh"), "whoosh-b.mp3": ("5d708a7dfe", "whoosh"),
    "swoosh.mp3": ("03e3cdff21", "swoosh"), "swish.mp3": ("99d56795a8", "swish"), "riser.mp3": ("2dc4de5e0b", "riser"),
    "riser2.mp3": ("f148e7d6c3", "riser"), "glass.mp3": ("33e31cab7a", "glass"), "crack.mp3": ("ddee3d729f", "ice cracking"),
    "glitch.wav": ("f640fd972e", "glitch"), "whoomp.mp3": ("25c145132f", "whoomp"), "sizzle.mp3": ("7e7e8d1503", "sizzle"),
    "heartbeat.mp3": ("036656b38d", "heartbeat"),
}


def media(*args):
    r = subprocess.run(["node", "--experimental-strip-types", "--no-warnings=ExperimentalWarning", str(ROOT / "scripts" / "media.ts"), *args],
                       cwd=ROOT, capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


def cmd_kit(a):
    d = P(a.slug)
    missing = []
    for name, (pid, words) in KIT.items():
        if (d / "input" / "sfx" / name).exists():
            continue
        code, out = media("use", pid, a.slug, f"--as=input/sfx/{name}")
        if code != 0:
            code2, js = media("find", *words.split(), "--kind=sfx", "--json", "--limit=1")
            try:
                hit = json.loads(js[js.index("[") :])[0]
                code, out = media("use", hit["id"], a.slug, f"--as=input/sfx/{name}")
            except Exception:
                code = 1
        print(("✔ " if code == 0 else "✗ ") + name)
        if code != 0:
            missing.append(name)
    if missing:
        print(f"missing: {', '.join(missing)} — find others (media find), or make them with ElevenLabs text_to_sound_effects (ask first: ~20–30 credits each)")


def cues_from_edit(edit, H):
    C = [(0.0, "boom.wav", 0.45, 0)]
    build = [s for s in edit["shots"] if s["id"].startswith("b") and s["type"] == "slam"]
    for k, s in enumerate(build):
        C.append((s["from"], "swoosh.mp3" if k % 2 == 0 else "swish.mp3", 0.22 + 0.024 * k, -0.4 if k % 2 == 0 else 0.4))
    for s in edit["shots"]:
        t, ty = s["from"], s["type"]
        if ty == "strobe":
            C += [(t, "glitch.wav", 0.35, -0.3), (t + 0.1, "glitch.wav", 0.35, 0.3)]
        elif ty == "letters":
            C += [(t, "boom.wav", 0.3, 0), (t, "impact.mp3", 0.2, 0), (t, "sub", 0.34, 0), ("end", t, "riser.mp3", 0.22, 0), ("end", t, "rev:whoosh.mp3", 0.32, 0)]
            C += [(h, "swish.mp3", 0.16, 0.5 if k % 2 else -0.5) for k, h in enumerate(s["hits"][1:])]
        elif ty == "slam" and not s["id"].startswith("b"):
            if s.get("knock"):
                C.append((t, "whoomp.mp3", 0.24, 0))
            elif s.get("plate"):
                C.append((t, ["whoosh-a.mp3", "whoosh-b.mp3", "swoosh.mp3"][int(t * 7) % 3], 0.28, 0.3 if int(t * 10) % 2 else -0.3))
                if "neon" in s.get("plate", ""):
                    C.append((t, "glitch.wav", 0.25, 0))
            elif s.get("color") == "#ff8a2a":
                C += [(t, "sizzle.mp3", 0.55, 0), (t, "whoosh.mp3", 0.3, 0.3)]
        elif ty == "crack":
            if s["id"].startswith("w"):
                C += [(t, "sub", 0.3, 0), (s["crackAt"], "crack.mp3", 0.45, 0), (s["crackAt"], "glass.mp3", 0.22, 0)]
            else:
                C += [(t, "whoomp.mp3", 0.26, 0), (s["crackAt"], "glass.mp3", 0.32, 0)]
        elif ty == "burst":
            C += [(t, "whoosh.mp3", 0.3, -0.2), ("end", s["to"] - 0.08, "rev:whoosh-a.mp3", 0.28, 0)]
        elif ty == "faces":
            f0 = s["faces"][0]["at"]
            C += [(f0, "impact.mp3", 0.3, 0), (f0, "sub", 0.26, 0)]
            C += [(f["at"], "whoosh-a.mp3" if k % 2 else "whoosh-b.mp3", 0.24, -0.5 if k % 2 else 0.5) for k, f in enumerate(s["faces"][1:])]
        elif ty == "rise":
            if s.get("roll"):
                C.append((s["roll"][0], "heartbeat.mp3", 0.3, 0))
                later = [r for r in s["roll"] if r >= s["roll"][0] + 0.9]
                if later:
                    C.append((later[0], "heartbeat.mp3", 0.34, 0))
            C += [("end", s["to"] - 0.05, "riser2.mp3", 0.22, 0), ("end", s["to"] - 0.03, "rev:whoosh.mp3", 0.3, 0)]
        elif ty == "flash":
            C += [(t, "crack.mp3", 0.3, 0), ("end", s["to"], "riser2.mp3", 0.2, 0)]
            C += [(o, "glitch.wav", 0.27, 0.4 * ((k % 3) - 1)) for k, (o, st) in enumerate(H["onsets"]) if s["from"] <= o < s["to"] - 0.1][:4]
        elif ty == "poster":
            C += [(t, "boom.wav", 0.5, 0), (t, "sub", 0.28, 0)]
            C += [(p["at"], "swoosh.mp3" if k % 2 == 0 else "swish.mp3", 0.26, -0.4 if k % 2 == 0 else 0.4) for k, p in enumerate(s["phrases"][1:])]
            C.append((s["final"]["at"], "punch.mp3", 0.45, 0))
            if s["final"].get("crackAt"):
                c = s["final"]["crackAt"]
                C += [(c, "boom.wav", 0.4, 0), (c, "punch.mp3", 0.4, 0), (c, "glass.mp3", 0.22, 0), (c, "sub", 0.2, 0)]
            if s.get("warp"):
                C += [(s["warp"]["at"], "whoosh.mp3", 0.3, 0), ("end", s["to"] - 0.03, "rev:whoosh.mp3", 0.34, 0)]
    out = []
    for c in C:
        if c[0] == "end":
            out.append({"end": round(c[1], 3), "sound": c[2], "gain": c[3], "pan": c[4]})
        else:
            out.append({"at": round(c[0], 3), "sound": c[1], "gain": c[2], "pan": c[3]})
    return out


def cmd_sfx(a):
    import librosa
    import soundfile as sf
    d = P(a.slug)
    SR = 48000
    cues_file = d / "video" / "sfx.json"
    H = json.load(open(d / "analysis" / "hits.json"))
    if a.auto or not cues_file.exists():
        cues = cues_from_edit(json.load(open(d / "video" / "edit.json")), H)
        json.dump({"note": "sound effects on the edit's hits: at (starts there) or end (finishes there), gain linear, pan -1..1; sound 'sub' is made here, 'rev:<file>' plays a file backwards",
                   "cues": cues}, open(cues_file, "w"), indent=1)
    cues = json.load(open(cues_file))["cues"]
    music, _ = librosa.load(d / "input" / "music.wav", sr=SR, mono=False)
    n = music.shape[1]
    cache = {}

    def sound(name):
        if name in cache:
            return cache[name]
        if name == "sub":
            t = np.arange(int(1.4 * SR)) / SR
            f = 95 * (28 / 95) ** (t / 1.4)
            y = np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-2.2 * t / 1.4) * 0.9
            s = np.stack([y, y])
        else:
            rev = name.startswith("rev:")
            fn = name[4:] if rev else name
            y, _ = librosa.load(d / "input" / "sfx" / fn, sr=SR, mono=False)
            s = np.stack([y, y]) if y.ndim == 1 else y
            if fn.startswith("crack"):  # the sharpest snap of a long crackle
                m = np.abs(s).mean(0)
                i = max(0, int(np.argmax(m)) - int(0.04 * SR))
                s = s[:, i : i + int(1.1 * SR)].copy()
                s[:, -int(0.15 * SR) :] *= np.linspace(1, 0, int(0.15 * SR))
            if rev:
                s = s[:, ::-1].copy()
        cache[name] = s
        return s

    fx = np.zeros((2, n))
    missing = set()
    for c in cues:
        try:
            s = sound(c["sound"])
        except FileNotFoundError:
            missing.add(c["sound"])
            continue
        ang = (c.get("pan", 0) + 1) * np.pi / 4
        s = np.stack([s[0] * np.cos(ang), s[1] * np.sin(ang)]) * np.sqrt(2)
        t0 = c["at"] if "at" in c else c["end"] - s.shape[1] / SR
        i = int(round(t0 * SR))
        if i < 0:
            s, i = s[:, -i:], 0
        j = min(n, i + s.shape[1])
        if j > i:
            fx[:, i:j] += c["gain"] * s[:, : j - i]
    mix = music + fx
    raw = d / "analysis" / "mix-sfx.raw.wav"
    sf.write(raw, mix.T, SR, subtype="FLOAT")
    out = d / "input" / "mix-sfx.wav"
    L = n / SR
    ff("-i", raw, "-af", f"alimiter=limit=0.82:attack=3:release=60:level=disabled,afade=t=out:st={L - 0.03:.3f}:d=0.03", "-c:a", "pcm_s24le", out)
    m = json.load(open(d / "manifest.json"))
    m["audio"]["src"] = f"{a.slug}/input/mix-sfx.wav"
    json.dump(m, open(d / "manifest.json", "w"), indent=1)
    lo = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(out), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", lo)
    pk = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", lo)
    print(f"✔ {out}: {len(cues)} cues, peak before the limiter {20 * np.log10(np.abs(mix).max()):.1f} dBFS → {I[-1] if I else '?'} LUFS, true peak {pk[-1] if pk else '?'} dBTP")
    if missing:
        print(f"  missing sounds (skipped): {', '.join(sorted(missing))} — run `kit`")


def main():
    ap = argparse.ArgumentParser(prog="kinetictype", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("pick"); p.add_argument("song"); p.add_argument("--length", type=float, default=24); p.add_argument("--top", type=int, default=3)
    p = sp.add_parser("new"); p.add_argument("slug"); p.add_argument("--music", required=True); p.add_argument("--from", dest="from", type=float)
    p.add_argument("--to", type=float); p.add_argument("--length", type=float, default=24); p.add_argument("--pick", action="store_true")
    p.add_argument("--image"); p.add_argument("--quote"); p.add_argument("--title"); p.add_argument("--force", action="store_true")
    p = sp.add_parser("hits"); p.add_argument("slug")
    p = sp.add_parser("grid"); p.add_argument("slug"); p.add_argument("--file")
    p = sp.add_parser("crops"); p.add_argument("slug"); p.add_argument("--boxes", required=True)
    p = sp.add_parser("cutout"); p.add_argument("slug"); p.add_argument("files", nargs="+"); p.add_argument("--all", action="store_true"); p.add_argument("--size", type=int, default=2048)
    p = sp.add_parser("sheet"); p.add_argument("folder"); p.add_argument("--out")
    p = sp.add_parser("storyboard"); p.add_argument("slug"); p.add_argument("--quote"); p.add_argument("--key"); p.add_argument("--title")
    p = sp.add_parser("kit"); p.add_argument("slug")
    p = sp.add_parser("sfx"); p.add_argument("slug"); p.add_argument("--auto", action="store_true")
    a = ap.parse_args()
    {"pick": cmd_pick, "new": cmd_new, "hits": cmd_hits, "grid": cmd_grid, "crops": cmd_crops, "cutout": cmd_cutout, "sheet": cmd_sheet,
     "storyboard": cmd_storyboard, "kit": cmd_kit, "sfx": cmd_sfx}[a.cmd](a)


if __name__ == "__main__":
    main()
