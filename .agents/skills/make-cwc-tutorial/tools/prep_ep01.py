"""Media for ep. 01 v4 (story v4): video atlases for the 3D panels, one clip per pantry station, textures,
favicon voxels and label cards. Reads the brand kits in the workspace's brands/ (never writes there);
writes into this project's input/ (atlas/, tex/, kit2/, sfx2/, voxels.json, stations.json).

uv run --with pillow --with numpy --with scipy python -I tools/prep_v4.py   (from the project folder)
"""
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

P = Path('.').resolve()
B = (P / '../../brands').resolve()
IN = P / 'input'
for d in ['atlas', 'tex/labels', 'tex/banner', 'tex/guide', 'tex/logo', 'kit2', 'sfx2']:
    (IN / d).mkdir(parents=True, exist_ok=True)
FONTS = B / 'cookwithclaude/graphics/public/fonts'
IVORY, SLATE, CLAY, OAT, CLOUD = (240, 238, 230), (20, 20, 19), (217, 119, 87), (227, 218, 204), (135, 134, 127)


def sh(*a):
    r = subprocess.run([str(x) for x in a], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f'failed: {" ".join(map(str, a))}\n{r.stderr[-1500:]}')
    return r.stdout


def clone(src: Path, dst: Path):
    if dst.exists():
        dst.unlink()
    sh('cp', '-c', src, dst)


# ---------------------------------------------------------------- the stations (verified kit contents)
STATIONS = [
    dict(id='inverteddevils', name='INVERTED Devils', kind='deep, smoky female vocals', intro='intros/intro-vinyl.mp4', end='outros/end-1-marquee.mp4',
         has='logo animation · 4 intros · 4 end screens · 10-page guide · YouTube kit · sound', token='logo/inverted-devils-logo-on-black.png'),
    dict(id='animemusiczone', name='Anime Music Zone', kind='anime covers and edits', intro='intros/amz-intro.mp4', end='outros/amz-end-screen.mp4',
         has='logo animation · 1 intro · 1 end screen · 10-page guide · YouTube kit · sound'),
    dict(id='animesoundlike', name='anime sounds like', kind='anime-feeling songs and shorts', starter='logo/anime-sounds-like-lockup-on-black.png',
         has='starter kit · logo · favicons · fonts · colours'),
    dict(id='getintozone', name='Get into Zone', kind='anime-inspired artist', intro='intros/get-into-zone-fist-redsun.mp4', end='outros/get-into-zone-end-prism-sheen.mp4',
         has='2 key logos · 9 intros · 13 end screens · 14-page guide · YouTube kit · sound', guide2='04-logo.png'),
    dict(id='atomicrap', name='ATOMIC RAP', kind='edit channel', intro='intros/intro-collider.mp4', end='outros/end-marquee.mp4',
         has='logo animation · 4 intros · 5 end screens · 11-page guide · YouTube kit · sound'),
    dict(id='zonestudios', name='ZONE Studios', kind='music studio', intro='intros/zone-studios-intro-strike.mp4', end='outros/zone-studios-end-flanked.mp4',
         has='logo animation · 4 intros · 4 end screens · 11-page guide · YouTube kit · sound'),
    dict(id='themoondevs', name='The Moon Devs', kind='dev studio', intro='intros/the-moon-devs-intro-circuit.mp4', end='outros/the-moon-devs-end-terminal.mp4',
         has='logo animation · 4 intros (+4 vertical) · 5 end screens · 12-page guide · YouTube kit · sound'),
    dict(id='portal', name='Portal', kind="The Moon Devs' work portal", intro='intros/portal-intro-tunnel.mp4', introAt=1.6, end_still='logo/og/portal-og.png',
         has='logo animation · 4 intros · 11-page guide · web set'),
    dict(id='microfox', name='Microfox', kind='small AI tools', intro='intros/intro-click.mp4', end='outros/end-corner.mp4',
         has='logo animation · 2 intros · 5 end screens · 11-page guide · YouTube kit · sound'),
    dict(id='browsehack', name='Browse Hack', kind='browser extension', starter='logo/browse-hack-lockup-dark.png',
         has='starter kit · logo · favicons · fonts · colours'),
    dict(id='mediamake', name='MediaMake', kind='the video app', intro='intros/intro-player.mp4', end='outros/end-timeline.mp4',
         has='logo animation · 4 intros · 4 end screens · 11-page guide · YouTube kit · sound'),
    dict(id='cookwithclaude', name='Cook with Claude', kind='this show', intro='intros/cook-with-claude-intro-burner.mp4', end='outros/cook-with-claude-end-prompt.mp4',
         has='logo animation · 6 intros · 4 end screens · 14-page guide · YouTube kit · theme · sting · voice', banner='youtube/cook-with-claude-banner.png'),
]

STATION_SECONDS = 4.0
for s in STATIONS:
    b = B / s['id']
    for f in ('intro', 'end', 'end_still', 'starter', 'token', 'banner'):
        if f in s:
            assert (b / s[f]).exists(), f'{s["id"]}: missing {s[f]}'
    out = IN / f'atlas/station-{s["id"]}.mp4'
    if 'intro' in s:
        pad = f'tpad=stop_mode=clone:stop_duration={STATION_SECONDS}'
        left = f'[0:v]scale=640:360,setsar=1,fps=30,{pad},trim=0:{STATION_SECONDS},setpts=PTS-STARTPTS[a]'
        if 'end' in s:
            right = f'[1:v]scale=640:360,setsar=1,fps=30,{pad},trim=0:{STATION_SECONDS},setpts=PTS-STARTPTS[b]'
            ins = ['-ss', str(s.get('introAt', 0.4)), '-i', b / s['intro'], '-ss', '3', '-i', b / s['end']]
        else:
            right = f'[1:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x141413,setsar=1,fps=30,trim=0:{STATION_SECONDS},setpts=PTS-STARTPTS[b]'
            ins = ['-ss', str(s.get('introAt', 0.4)), '-i', b / s['intro'], '-loop', '1', '-t', str(STATION_SECONDS), '-i', b / s['end_still']]
        sh('ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', f'{left};{right};[a][b]hstack=inputs=2,format=yuv420p',
           '-an', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-t', str(STATION_SECONDS), out)
        sh('ffmpeg', '-v', 'error', '-y', '-ss', '3.0', '-i', out, '-frames:v', '1', '-q:v', '3', IN / f'atlas/station-{s["id"]}.jpg')
        s['video'] = f'atlas/station-{s["id"]}.mp4'
        s['poster'] = f'atlas/station-{s["id"]}.jpg'
    if 'starter' in s or 'token' in s:
        src = b / (s.get('starter') or s['token'])
        im = Image.open(src).convert('RGBA')
        im.thumbnail((1200, 600))
        im.save(IN / f'tex/logo/{s["id"]}.png')
        s['logo'] = f'tex/logo/{s["id"]}.png'
    banner = b / s.get('banner', 'youtube/banner.png')
    if banner.exists():
        Image.open(banner).convert('RGB').resize((960, 540), Image.LANCZOS).save(IN / f'tex/banner/{s["id"]}.jpg', quality=85)
        s['bannerTex'] = f'tex/banner/{s["id"]}.jpg'
    pages = []
    for i, name in enumerate(['01-cover.png', s.get('guide2', '03-logo.png')]):
        g = b / 'guide' / name
        if g.exists():
            Image.open(g).convert('RGB').resize((640, 360), Image.LANCZOS).save(IN / f'tex/guide/{s["id"]}-{i + 1}.jpg', quality=85)
            pages.append(f'tex/guide/{s["id"]}-{i + 1}.jpg')
    s['guide'] = pages
    s['favicon'] = (b / 'logo/favicon/favicon-32x32.png').exists()

# ---------------------------------------------------------------- label cards (1024 × 512, slate)
jak = ImageFont.truetype(str(FONTS / 'PlusJakartaSans-800.ttf'), 92)
jak_s = ImageFont.truetype(str(FONTS / 'PlusJakartaSans-800.ttf'), 40)
mono = ImageFont.truetype(str(FONTS / 'JetBrainsMono-800.ttf'), 30)


def wrap(text, font, width, draw):
    words, lines, cur = text.split(' '), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=font) > width and cur:
            lines.append(cur)
            cur = w
        else:
            cur = t
    return lines + [cur]


for s in STATIONS:
    im = Image.new('RGBA', (1024, 512), SLATE + (255,))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, 1023, 511], radius=28, outline=(61, 61, 58), width=4)
    d.rectangle([56, 56, 56 + 120, 56 + 40], fill=CLAY)
    d.text((66, 58), 'kit', font=mono, fill=(250, 249, 245))
    size = 92
    while d.textlength(s['name'], font=ImageFont.truetype(str(FONTS / 'PlusJakartaSans-800.ttf'), size)) > 900:
        size -= 4
    d.text((56, 112), s['name'], font=ImageFont.truetype(str(FONTS / 'PlusJakartaSans-800.ttf'), size), fill=(250, 249, 245))
    d.text((56, 228), s['kind'], font=jak_s, fill=CLAY)
    y = 310
    for line in wrap(s['has'], mono, 910, d):
        d.text((56, y), line, font=mono, fill=(200, 198, 190))
        y += 44
    im.save(IN / f'tex/labels/{s["id"]}.png')
    s['label'] = f'tex/labels/{s["id"]}.png'

# ---------------------------------------------------------------- favicon voxels
vox = {}
for s in STATIONS:
    f = B / s['id'] / 'logo/favicon/favicon-32x32.png'
    if not f.exists():
        continue
    a = np.array(Image.open(f).convert('RGBA'))
    cubes = [[int(x), int(y), int(a[y, x, 0]), int(a[y, x, 1]), int(a[y, x, 2])]
             for y in range(a.shape[0]) for x in range(a.shape[1]) if a[y, x, 3] > 128]
    vox[s['id']] = {'w': int(a.shape[1]), 'h': int(a.shape[0]), 'cubes': cubes}
json.dump(vox, open(IN / 'voxels.json', 'w'))

# ---------------------------------------------------------------- Cook with Claude panels: 6 intros + 4 end screens, 5 × 2
CW = B / 'cookwithclaude'
tiles = ['burner', 'prompt', 'marker', 'toss', 'bell', 'opener']
files = [CW / f'intros/cook-with-claude-intro-{t}.mp4' for t in tiles] + [CW / f'outros/cook-with-claude-end-{t}.mp4' for t in ['prompt', 'pantry', 'toss', 'marker']]
ins, fil = [], []
for i, f in enumerate(files):
    loop = i < 6
    ins += (['-stream_loop', '-1'] if loop else ['-ss', '2']) + ['-i', f]
    fil.append(f'[{i}:v]scale=384:216,setsar=1,fps=30,trim=0:12,setpts=PTS-STARTPTS[v{i}]')
layout = '|'.join(f'{(i % 5) * 384}_{(i // 5) * 216}' for i in range(10))
sh('ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fil) + ';' + ''.join(f'[v{i}]' for i in range(10)) + f'xstack=inputs=10:layout={layout},format=yuv420p',
   '-an', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-t', '12', IN / 'atlas/cwc-panels.mp4')

# ---------------------------------------------------------------- the logo board's 40 references (atlas 8 × 5, 320 × 240 tiles)
refs_dir = CW / 'graphics/explorations/logo-1/references'
refs = []
for col in sorted(p for p in refs_dir.iterdir() if p.is_dir()):
    for f in sorted(col.iterdir()):
        if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp'):
            refs.append((col.name, f))
atlas = Image.new('RGB', (8 * 320, 5 * 240), OAT)
meta = []
for i, (col, f) in enumerate(refs):
    im = Image.open(f).convert('RGB')
    r = max(320 / im.width, 240 / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x0, y0 = (im.width - 320) // 2, (im.height - 240) // 2
    atlas.paste(im.crop((x0, y0, x0 + 320, y0 + 240)), ((i % 8) * 320, (i // 8) * 240))
    meta.append({'i': i, 'col': col[0], 'id': f.stem.split('-')[0], 'name': f.stem})
atlas.save(IN / 'tex/refs.jpg', quality=85)
json.dump({'cols': 8, 'rows': 5, 'items': meta}, open(IN / 'tex/refs.json', 'w'), indent=1)

# ---------------------------------------------------------------- the five logo rounds as cards (900 × 600), atlas 3 × 2
sheets = ['logo-1/sheets/K5-utensils.jpg', 'logo-2/sheets/U1-two-rows.jpg', 'logo-3/sheets/B1-justified-cut6.5.jpg',
          'logo-4/sheets/D2-wok.jpg', 'logo-5/sheets/S3-spark-fire-v2.jpg']
cards = Image.new('RGB', (3 * 900, 2 * 600), IVORY)
for i, rel in enumerate(sheets):
    im = Image.open(CW / 'graphics/explorations' / rel).convert('RGB')
    a = np.array(im).astype(int)
    c = a[int(im.height * 0.2), 60]  # the first panel's ground
    mask = (np.abs(a - c).sum(axis=2) < 24)
    lab, _ = ndimage.label(mask)
    k = lab[int(im.height * 0.2), 60]
    ys, xs = np.where(lab == k)
    panel = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    card = Image.new('RGB', (900, 600), tuple(int(v) for v in c))
    r = min(860 / panel.width, 570 / panel.height)
    panel = panel.resize((round(panel.width * r), round(panel.height * r)), Image.LANCZOS)
    card.paste(panel, ((900 - panel.width) // 2, (600 - panel.height) // 2))
    cards.paste(card, ((i % 3) * 900, (i // 3) * 600))
cards.save(IN / 'tex/rounds.jpg', quality=88)

# ---------------------------------------------------------------- Cook with Claude files the scenes play or show directly
for src, dst in [(CW / 'intros/cook-with-claude-intro-opener.mp4', 'kit2/opener.mp4'),
                 (CW / 'outros/cook-with-claude-end-prompt.mp4', 'kit2/end-prompt.mp4'),
                 (CW / 'youtube/cook-with-claude-banner.png', 'kit2/banner.png'),
                 (CW / 'youtube/cook-with-claude-profile.png', 'kit2/profile.png'),
                 (CW / 'youtube/cook-with-claude-watermark.png', 'kit2/watermark.png'),
                 (CW / 'logo/cook-with-claude-mark.png', 'kit2/mark.png')]:
    clone(src, IN / dst)
for n in ['01-cover', '03-logo', '06-colour', '08-motion', '10-intros', '11-end-screens', '12-sound', '14-youtube']:
    Image.open(CW / f'guide/{n}.png').convert('RGB').resize((960, 540), Image.LANCZOS).save(IN / f'kit2/guide-{n}.jpg', quality=86)
for n in ['intro-key', 'intro-send', 'intro-fold', 'intro-pop', 'intro-plop', 'intro-scribble', 'intro-3-whoosh', 'intro-3-swish', 'intro-3-flick',
          'intro-3-thump', 'intro-3-riser', 'intro-3-sparkle', 'intro-ting', 'intro-sizzle', 'intro-igniter', 'intro-whoomp', 'intro-clank',
          'intro-sting-f', 'intro-theme-i3', 'end-paper-loop', 'end-simmer-loop']:
    clone(CW / f'graphics/public/sfx/{n}.wav', IN / f'sfx2/{n}.wav')

# ---------------------------------------------------------------- the empty page's tag
im = Image.new('RGBA', (640, 120), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.rectangle([0, 0, 300, 64], fill=CLAY)
d.text((18, 6), 'your_brand', font=ImageFont.truetype(str(FONTS / 'JetBrainsMono-800.ttf'), 44), fill=(250, 249, 245))
im.save(IN / 'tex/your-brand-tag.png')

json.dump(STATIONS, open(IN / 'stations.json', 'w'), indent=1, ensure_ascii=False)
print('stations', len(STATIONS), '· videos', sum('video' in s for s in STATIONS), '· voxel sets', len(vox), '· refs', len(refs))
