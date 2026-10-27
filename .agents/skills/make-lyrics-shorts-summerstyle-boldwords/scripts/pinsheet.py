# contact sheet of a folder of images, numbered, with size
import sys, os
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
files = sorted(f for f in os.listdir(src) if f.lower().endswith(('.jpg','.jpeg','.png','.webp')))
W, H, cols = 220, 300, 8
rows = (len(files)+cols-1)//cols
sheet = Image.new('RGB', (cols*W, rows*H), (30,30,30))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    try:
        im = Image.open(os.path.join(src, f)).convert('RGB')
    except Exception as e:
        continue
    w, h = im.size
    im.thumbnail((W-6, H-26))
    x, y = (i%cols)*W, (i//cols)*H
    sheet.paste(im, (x+3+(W-6-im.width)//2, y+3))
    d.rectangle([x, y+H-22, x+W, y+H], fill=(0,0,0))
    d.text((x+4, y+H-20), f"{i} {w}x{h}", fill=(255,255,0))
sheet.save(out, quality=80)
with open(out + '.txt', 'w') as fh:
    for i, f in enumerate(files): fh.write(f"{i}\t{f}\n")
