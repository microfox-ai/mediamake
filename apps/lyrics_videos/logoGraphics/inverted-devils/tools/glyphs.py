"""Glyph outlines for the INVERTED Devils logo (no font loading at render time).

Downloads Bebas Neue and Calligraffitti from Google Fonts, shapes each word with HarfBuzz
(so kerning matches a browser), and writes ../glyphs.json:
  { word: { upm, asc, desc, cap, glyphs: [{ ch, d, x, adv, bbox }] } }
Path data is in font units, y up; x is the pen position from HarfBuzz.

It also writes the pen path for the script word: the glyphs are rasterized, skeletonized and the
skeleton is traced into ordered strokes (font units), so "Devils" can be written on like a pen.

Usage (from apps/lyrics_videos): uv run --with fonttools --with uharfbuzz --with scikit-image --with scipy \
  --with pillow python logoGraphics/inverted-devils/tools/glyphs.py
"""
import io, json, os, urllib.request
import numpy as np
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image, ImageDraw
from skimage.morphology import skeletonize

FONTS = {
    'bebas': 'https://fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXooxW4.ttf',
    'calli': 'https://fonts.gstatic.com/s/calligraffitti/v20/46k2lbT3XjDVqJw3DCmCFjE0vnFZ.ttf',
}
WORDS = {'INVERTED': 'bebas', 'Devils': 'calli'}
HERE = os.path.dirname(__file__)
PEN_ORDER = [
    ('D', ((97, 207), (246, 78))), ('D', ((247, 78), (266, 59))), ('D', ((247, 79), (248, 92))),
    ('D', ((247, 94), (247, 110))), ('D', ((247, 112), (128, 383))), ('D', ((127, 384), (27, 433))),
    ('D', ((128, 384), (270, 102))),
    ('e', ((518, 323), (601, 372))),
    ('v', ((701, 193), (679, 375))), ('v', ((649, 454), (681, 380))), ('v', ((682, 379), (816, 27))),
    ('i', ((932, 176), (961, 376))),
    ('l', ((1113, 36), (1122, 402))),
    ('s', ((1116, 342), (1123, 401))), ('s', ((1124, 402), (1327, 189))),
]


def shape(blob, text):
    face = hb.Face(blob)
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True, 'liga': True})
    return buf.glyph_infos, buf.glyph_positions


def flatten(gs, name, x0, steps=12):
    """Polygons (font units) of a glyph, curves flattened."""
    from fontTools.pens.recordingPen import DecomposingRecordingPen
    pen = DecomposingRecordingPen(gs)
    gs[name].draw(pen)
    polys, cur, last = [], [], None
    for op, args in pen.value:
        if op == 'moveTo':
            if cur: polys.append(cur)
            cur = [args[0]]; last = args[0]
        elif op == 'lineTo':
            cur.append(args[0]); last = args[0]
        elif op == 'qCurveTo':
            pts = list(args)
            # implied on-curve points between consecutive off-curve points
            on = pts[-1]
            offs = pts[:-1]
            segs = []
            p0 = last
            for i, c in enumerate(offs):
                end = on if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2, (c[1] + offs[i + 1][1]) / 2)
                segs.append((p0, c, end)); p0 = end
            for a, c, b in segs:
                for k in range(1, steps + 1):
                    t = k / steps
                    cur.append(((1-t)**2*a[0] + 2*(1-t)*t*c[0] + t*t*b[0], (1-t)**2*a[1] + 2*(1-t)*t*c[1] + t*t*b[1]))
            last = on
        elif op == 'curveTo':
            a = last; c1, c2, b = args
            for k in range(1, steps + 1):
                t = k / steps
                cur.append(((1-t)**3*a[0] + 3*(1-t)**2*t*c1[0] + 3*(1-t)*t*t*c2[0] + t**3*b[0],
                            (1-t)**3*a[1] + 3*(1-t)**2*t*c1[1] + 3*(1-t)*t*t*c2[1] + t**3*b[1]))
            last = b
        elif op in ('closePath', 'endPath'):
            if cur: polys.append(cur)
            cur = []
    if cur: polys.append(cur)
    return [[(x + x0, y) for x, y in p] for p in polys]


def trace_skeleton(sk):
    """Skeleton pixels → list of polylines (pixel coords), split at junctions."""
    H, W = sk.shape
    pts = set(zip(*np.nonzero(sk)))
    nb = lambda p: [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (p[0] + dy, p[1] + dx) in pts]
    deg = {p: len(nb(p)) for p in pts}
    nodes = {p for p in pts if deg[p] != 2}
    seen_edges = set()
    strokes = []
    def walk(a, b):
        path = [a, b]
        prev, cur = a, b
        while cur not in nodes:
            nxt = [q for q in nb(cur) if q != prev and q not in path[-3:]]
            if not nxt: break
            prev, cur = cur, nxt[0]
            path.append(cur)
        return path
    for n in nodes:
        for m in nb(n):
            key = frozenset((n, m))
            if key in seen_edges: continue
            path = walk(n, m)
            for i in range(len(path) - 1): seen_edges.add(frozenset((path[i], path[i + 1])))
            strokes.append(path)
    # loops without nodes
    rest = pts - {p for s in strokes for p in s}
    while rest:
        start = min(rest)
        path = [start]; prev = None; cur = start
        while True:
            nxt = [q for q in nb(cur) if q != prev and q in rest and q not in path]
            if not nxt: break
            prev, cur = cur, nxt[0]; path.append(cur)
        path.append(start)
        rest -= set(path)
        strokes.append(path)
    return strokes


def simplify(poly, tol):
    """Ramer–Douglas–Peucker."""
    if len(poly) < 3: return poly
    a, b = np.array(poly[0], float), np.array(poly[-1], float)
    ab = b - a; L = np.hypot(*ab)
    d = [abs(np.cross(ab, np.array(p, float) - a)) / L if L else np.hypot(*(np.array(p, float) - a)) for p in poly]
    i = int(np.argmax(d))
    if d[i] > tol:
        return simplify(poly[:i + 1], tol)[:-1] + simplify(poly[i:], tol)
    return [poly[0], poly[-1]]


out = {}
for word, key in WORDS.items():
    blob_bytes = urllib.request.urlopen(FONTS[key]).read()
    font = TTFont(io.BytesIO(blob_bytes))
    gs = font.getGlyphSet()
    order = font.getGlyphOrder()
    infos, poss = shape(hb.Blob(blob_bytes), word)
    hhea, os2 = font['hhea'], font['OS/2']
    x = 0
    glyphs = []
    for ch, info, pos in zip(word, infos, poss):
        name = order[info.codepoint]
        pen = SVGPathPen(gs)
        gs[name].draw(pen)
        bp = BoundsPen(gs)
        gs[name].draw(bp)
        glyphs.append({'ch': ch, 'name': name, 'd': pen.getCommands(), 'x': x + pos.x_offset, 'adv': pos.x_advance,
                       'bbox': [round(v) for v in (bp.bounds or (0, 0, 0, 0))]})
        x += pos.x_advance
    upm = font['head'].unitsPerEm
    entry = {'upm': upm, 'asc': hhea.ascent, 'desc': hhea.descent,
             'cap': getattr(os2, 'sCapHeight', 0) or 700, 'xh': getattr(os2, 'sxHeight', 0) or 500,
             'width': x, 'glyphs': glyphs}

    if key == 'calli':
        # pen path: rasterize at 1 unit = S px, skeletonize, trace
        S = 0.5
        xs = [g['x'] + g['bbox'][0] for g in glyphs] + [g['x'] + g['bbox'][2] for g in glyphs]
        ys = [g['bbox'][1] for g in glyphs] + [g['bbox'][3] for g in glyphs]
        pad = 40
        minx, maxx, miny, maxy = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
        Wp, Hp = int((maxx - minx) * S) + 1, int((maxy - miny) * S) + 1
        img = Image.new('L', (Wp, Hp), 0)
        dr = ImageDraw.Draw(img)
        # even-odd per glyph: draw each glyph into its own mask and xor its contours
        for g in glyphs:
            m = Image.new('L', (Wp, Hp), 0)
            arr = np.zeros((Hp, Wp), bool)
            for poly in flatten(gs, g['name'], g['x']):
                pm = Image.new('L', (Wp, Hp), 0)
                ImageDraw.Draw(pm).polygon([((px - minx) * S, (maxy - py) * S) for px, py in poly], fill=255)
                arr ^= np.array(pm) > 127
            img = Image.fromarray(np.maximum(np.array(img), arr.astype(np.uint8) * 255))
        mask = np.array(img) > 127
        # stroke thickness: max of the distance transform along the skeleton
        from scipy.ndimage import distance_transform_edt
        dist = distance_transform_edt(mask)
        sk = skeletonize(mask)
        strokes = trace_skeleton(sk)
        # writing order, as (start, end) in skeleton.png pixels: each entry picks the traced
        # stroke whose ends are nearest and orients it; the i's dot is drawn separately
        pen = []
        for letter, (a, b) in PEN_ORDER:
            best = min(strokes, key=lambda st: min(
                np.hypot(st[0][1] - a[0], st[0][0] - a[1]) + np.hypot(st[-1][1] - b[0], st[-1][0] - b[1]),
                np.hypot(st[-1][1] - a[0], st[-1][0] - a[1]) + np.hypot(st[0][1] - b[0], st[0][0] - b[1])))
            fwd = np.hypot(best[0][1] - a[0], best[0][0] - a[1]) <= np.hypot(best[-1][1] - a[0], best[-1][0] - a[1])
            st = best if fwd else best[::-1]
            pts = simplify([((c / S) + minx, maxy - (r / S)) for r, c in st], 2.5 / S)
            pen.append({'letter': letter, 'pts': [[round(px, 1), round(py, 1)] for px, py in pts]})
        dot = min(strokes, key=lambda st: np.hypot(st[0][1] - 955, st[0][0] - 61))
        entry['pen'] = pen
        entry['dot'] = [round(dot[0][1] / S + minx, 1), round(maxy - dot[0][0] / S, 1)]
        entry['penBox'] = [minx, miny, maxx, maxy]
        Image.fromarray((mask * 120 + sk * 135).astype(np.uint8)).save(os.path.join(HERE, 'skeleton.png'))
    out[word] = entry
    print(word, key, 'upm', upm, 'cap', entry['cap'], 'width', x, [g['bbox'] for g in glyphs])

path = os.path.join(HERE, '..', 'glyphs.json')
json.dump(out, open(path, 'w'))
print('wrote', os.path.normpath(path), 'pen strokes', len(out['Devils']['pen']), 'dot', out['Devils']['dot'])
