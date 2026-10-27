"""Printed textures for the One Piece prop library (props.py): wanted posters and the Franky Cola label.

Writes textures/wanted-<id>.png (700×1000) and textures/franky-cola.png (1600×400). The posters use the
crew's portraits from projects/nakama/derived/img (a_<id>.jpg) on the nakama poster stock.

Usage: uv run --with pillow python assets3d/onepiece/textures.py
"""
import os

from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', '..')
NAKAMA = os.path.join(APP, 'projects', 'nakama', 'derived')
OUT = os.path.join(HERE, 'textures')
SUP = '/System/Library/Fonts/Supplemental'
INK = (52, 34, 22)
os.makedirs(OUT, exist_ok=True)


def font(name, size):
    return ImageFont.truetype(os.path.join(SUP, name), size)


def wanted(id_, name, bounty, focus=(0.5, 0.4)):
    im = Image.open(os.path.join(NAKAMA, 'paper', 'poster.png')).convert('RGB').resize((700, 1000))
    d = ImageDraw.Draw(im)

    def centred(text, y, f, spacing=0):
        w = sum(d.textlength(c, font=f) for c in text) + spacing * (len(text) - 1)
        x = (700 - w) / 2
        for ch in text:
            d.text((x, y), ch, font=f, fill=INK)
            x += d.textlength(ch, font=f) + spacing

    centred('WANTED', 40, font('Georgia Bold.ttf', 128), 4)
    photo = ImageOps.fit(Image.open(os.path.join(NAKAMA, 'img', f'a_{id_}.jpg')).convert('RGB'), (560, 420), centering=focus)
    im.paste(Image.blend(photo, Image.new('RGB', photo.size, (200, 170, 120)), 0.12), (70, 205))
    d.rectangle([66, 201, 634, 629], outline=INK, width=5)
    centred('DEAD OR ALIVE', 652, font('Georgia Bold.ttf', 50), 3)
    f = font('Times New Roman Bold.ttf', 66 if len(name) < 15 else 54)
    centred(name, 730, f, 2)
    # the bounty: ฿ is a B with a stroke through it
    f = font('Times New Roman Bold.ttf', 72)
    text = 'B' + bounty
    w = d.textlength(text, font=f)
    x0 = (700 - w) / 2
    d.text((x0, 828), text, font=f, fill=INK)
    bw = d.textlength('B', font=f)
    d.line([(x0 + bw * 0.45, 822), (x0 + bw * 0.45, 912)], fill=INK, width=6)
    centred('MARINE', 930, font('Georgia Bold.ttf', 30), 10)
    im.save(os.path.join(OUT, f'wanted-{id_}.png'))


def cola_label():
    """Franky Cola: white script on red, a cream band round it (wraps round the bottle)."""
    W, H = 1600, 400
    im = Image.new('RGB', (W, H), (176, 26, 30))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 34], fill=(240, 228, 205))
    d.rectangle([0, H - 34, W, H], fill=(240, 228, 205))
    for k in range(2):
        cx = W * (0.25 + 0.5 * k)
        f = font('Georgia Bold Italic.ttf', 128)
        t = 'Franky'
        w = d.textlength(t, font=f)
        d.text((cx - w / 2, 70), t, font=f, fill=(250, 244, 230))
        f2 = font('Georgia Bold.ttf', 86)
        t2 = 'COLA'
        w2 = d.textlength(t2, font=f2)
        d.text((cx - w2 / 2, 210), t2, font=f2, fill=(250, 244, 230))
        d.line([(cx - 260, 200), (cx + 260, 200)], fill=(250, 244, 230), width=5)
    im.save(os.path.join(OUT, 'franky-cola.png'))


wanted('luffy', 'MONKEY·D·LUFFY', '3,000,000,000-', (0.42, 0.45))
wanted('zoro', 'RORONOA ZORO', '1,111,000,000-', (0.6, 0.35))
cola_label()
print('wrote', os.listdir(OUT))
