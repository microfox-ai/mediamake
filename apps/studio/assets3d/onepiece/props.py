"""One Piece props for Blender, modelled from scratch after real replicas and cosplay pieces (2026-10-27,
for the Nakama logbook's desk: "add more crew related items on the table, make it packed; we will use
these 3D models later on as well; take real images as reference and render them with good detailing").

Every prop is a function that builds it into its own collection ("OP <name>"), at real-world size in
metres, standing on z = 0, centred on the origin, longest side along x; materials are procedural (plus
the printed textures from textures.py). Build them all into the asset library with build_library.py, or
import this module in another script and instance the collections (see projects/nakama/tools/blender_outro.py).

  straw_hat      Luffy's hat: plaited straw rows (herringbone braid), red band, frayed brim       Ø 40 cm
  meat           manga meat on the bone on a plate with garnish (Luffy / Sanji)                   plate Ø 28 cm
  katana_*       Zoro's swords lying flat: wado (white), kitetsu (dark red, flame wave), shusui
                 (black, pink blossoms): lacquered scabbard, wrapped hilt, guard                 ~102 cm
  log_pose       Nami's Log Pose: glass ball and needle on a wooden base, on a leather strap      25 cm
  clima_tact     Nami's Clima-Tact: three blue rods with white ends                               30 cm
  tangerine      one of Nami's tangerines (Bell-mère's grove)                                     Ø 6.5 cm
  sea_chart      a navigator's chart: coastlines, land and sea tints, grid (arg seed)             A3-ish
  kabuto         Usopp's Kabuto: green staff, ring head with prongs, slingshot band               55 cm
  chopper_hat    Chopper's pink plush top hat with the white X and antlers, lying on its side     Ø 27 cm
  medicine       Chopper's medicine: two amber bottles and three Rumble Balls                     ~10 cm
  cola           a bottle of Franky Cola, lying on its side                                       24 cm
  teacup         Brook's tea: cup and saucer, tea in it                                           Ø 15 cm
  ashtray        Sanji's cigarette on a little iron tray                                          Ø 9 cm
  books          Robin's books: a stack of three leather-bound volumes                            ~30 cm
  sake_set       Jinbe's red lacquer sakazuki and a sake bottle                                   Ø 12 cm
  den_den_mushi  the snail phone: shell with stripes, receiver, coiled cord, eyes on stalks      ~14 cm
  globe          a globe on a wooden stand                                                        Ø 20 cm
  spyglass       a sailor's spyglass (draw tubes, leather barrel, iron rings)                     40 cm
  ink_quill      ink bottle with a cork, a dried drip, a white quill                              ~25 cm
  chart_roll     a rolled chart tied with red cord                                                34 cm
  candle         a candle stub with drips in an iron dish                                         Ø 9 cm
  magnifier      a magnifying glass                                                               24 cm
  dividers       navigator's dividers                                                             18 cm
  pencils        two pencils (graphite, red)                                                      17 cm
  wanted_*       a wanted poster (luffy, zoro), with a little curl                               A4-ish
"""
import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'textures')
PROPS = {}
_coll = None


# ---------------------------------------------------------------- objects

def put(ob):
    """Move a new object into the prop being built."""
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    (_coll or bpy.context.scene.collection).objects.link(ob)
    return ob


def prim(op, **kw):
    getattr(bpy.ops.mesh, op)(**kw)
    return put(bpy.context.active_object)


def smooth_shade(ob):
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def mod(ob, kind, **kw):
    m = ob.modifiers.new(kind.lower(), kind)
    for k, v in kw.items():
        setattr(m, k, v)
    return m


def subsurf(ob, levels=2):
    mod(ob, 'SUBSURF', levels=levels, render_levels=levels)
    return ob


def from_bm(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return put(bpy.data.objects.new(name, me))


def lathe(name, prof, segs=96, smooth=True):
    """Surface of revolution round z from an (r, z) profile; a point with r = 0 closes it."""
    bm = bmesh.new()
    rings = []
    for r, z in prof:
        n = segs if r > 1e-7 else 1
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), z)) for i in range(n)])
    for ra, rb in zip(rings, rings[1:]):
        if len(ra) == 1:
            for i in range(segs):
                bm.faces.new((ra[0], rb[i], rb[(i + 1) % segs]))
        elif len(rb) == 1:
            for i in range(segs):
                bm.faces.new((ra[i], ra[(i + 1) % segs], rb[0]))
        else:
            for i in range(segs):
                bm.faces.new((ra[i], ra[(i + 1) % segs], rb[(i + 1) % segs], rb[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = from_bm(name, bm)
    return smooth_shade(ob) if smooth else ob


def sweep(name, path, radius, segs=24, caps=True, aspect=1.0):
    """A tube along a 3D polyline; `radius` a number or a function of u (0…1 along the path);
    aspect squashes the section in the path's local 'up' (z-ish) direction."""
    pts = [Vector(p) for p in path]
    n = len(pts)
    L = [0.0]
    for a, b in zip(pts, pts[1:]):
        L.append(L[-1] + (b - a).length)
    tot = L[-1] or 1
    rad = radius if callable(radius) else (lambda u: radius)
    bm = bmesh.new()
    rings = []
    up = Vector((0, 0, 1))
    normal = None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        if normal is None:
            ref = up if abs(t.dot(up)) < 0.9 else Vector((0, 1, 0))
            normal = (ref - t * ref.dot(t)).normalized()
        else:
            normal = (normal - t * normal.dot(t)).normalized()
        side = t.cross(normal)
        r = rad(L[i] / tot)
        ring = []
        for k in range(segs):
            a = 2 * math.pi * k / segs
            ring.append(bm.verts.new(p + side * (math.cos(a) * r) + normal * (math.sin(a) * r * aspect)))
        rings.append(ring)
    for ra, rb in zip(rings, rings[1:]):
        for k in range(segs):
            bm.faces.new((ra[k], ra[(k + 1) % segs], rb[(k + 1) % segs], rb[k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth_shade(from_bm(name, bm))


def arc(c, r, a0, a1, n=48, z=0.0):
    return [(c[0] + r * math.cos(a0 + (a1 - a0) * i / (n - 1)), c[1] + r * math.sin(a0 + (a1 - a0) * i / (n - 1)), z) for i in range(n)]


def at(ob, loc=(0, 0, 0), rot=(0, 0, 0), scale=None):
    """Place an object; a scale goes into its mesh, so textures and modifiers work in metres."""
    ob.location = loc
    ob.rotation_euler = Euler(rot)
    if scale is not None:
        ob.data.transform(Matrix.Diagonal((*scale, 1)))
    return ob


# ---------------------------------------------------------------- materials

_mats = {}


def mat(name, color=(0.8, 0.8, 0.8), rough=0.5, **kw):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    for k, v in kw.items():
        b.inputs[k.replace('_', ' ')].default_value = v
    _mats[name] = m
    return m


def give(ob, m):
    ob.data.materials.append(m)
    return ob


def nodes(m):
    return m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']


def bump(m, height, strength=0.3, distance=0.0005):
    n, l, b = nodes(m)
    bp = n.new('ShaderNodeBump')
    bp.inputs['Strength'].default_value = strength
    bp.inputs['Distance'].default_value = distance
    l.new(height, bp.inputs['Height'])
    l.new(bp.outputs['Normal'], b.inputs['Normal'])


def ramp(n, l, fac, stops, constant=False):
    r = n.new('ShaderNodeValToRGB')
    if constant:
        r.color_ramp.interpolation = 'CONSTANT'
    el = r.color_ramp.elements
    el[0].position, el[0].color = stops[0][0], (*stops[0][1], 1)
    el[1].position, el[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, c in stops[1:-1]:
        e = el.new(pos)
        e.color = (*c, 1)
    l.new(fac, r.inputs['Fac'])
    return r.outputs['Color']


def op(n, l, kind, a, b=None, c=None):
    x = n.new('ShaderNodeMath')
    x.operation = kind
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            x.inputs[i].default_value = v
        else:
            l.new(v, x.inputs[i])
    return x.outputs[0]


def coords(n, l, space='Object'):
    tc = n.new('ShaderNodeTexCoord')
    sep = n.new('ShaderNodeSeparateXYZ')
    l.new(tc.outputs[space], sep.inputs[0])
    return tc.outputs[space], sep.outputs[0], sep.outputs[1], sep.outputs[2]


def mix_rgb(n, l, fac, a, b):
    mx = n.new('ShaderNodeMix')
    mx.data_type = 'RGBA'
    sock = lambda socks, name: next(s for s in socks if s.name == name and s.type == 'RGBA')
    l.new(fac, mx.inputs['Factor']) if not isinstance(fac, (int, float)) else None
    for name, v in (('A', a), ('B', b)):
        if isinstance(v, tuple):
            sock(mx.inputs, name).default_value = (*v, 1)
        else:
            l.new(v, sock(mx.inputs, name))
    return sock(mx.outputs, 'Result')


def noise(n, l, vec, scale, detail=4, rough=0.5):
    t = n.new('ShaderNodeTexNoise')
    t.inputs['Scale'].default_value = scale
    t.inputs['Detail'].default_value = detail
    t.inputs['Roughness'].default_value = rough
    l.new(vec, t.inputs['Vector'])
    return t.outputs['Fac']


def straw():
    """Plaited straw: the hat is sewn from rows of braid ~1 cm wide; each row a herringbone of straws,
    each straw its own shade, rows a little uneven."""
    if 'straw' in _mats:
        return _mats['straw']
    m = mat('straw', rough=0.6)
    n, l, b = nodes(m)
    vec, x, y, z = coords(n, l)
    r = op(n, l, 'SQRT', op(n, l, 'ADD', op(n, l, 'MULTIPLY', x, x), op(n, l, 'MULTIPLY', y, y)))
    ang = op(n, l, 'ARCTAN2', y, x)
    rows = op(n, l, 'MULTIPLY', r, 105.0)
    row = op(n, l, 'FLOOR', rows)
    u = op(n, l, 'FRACT', rows)
    wn = n.new('ShaderNodeTexWhiteNoise')
    wn.noise_dimensions = '1D'
    l.new(row, wn.inputs['W'])
    s = op(n, l, 'MULTIPLY', op(n, l, 'MULTIPLY', ang, r), 1.0 / 0.0055)
    herring = op(n, l, 'FRACT', op(n, l, 'ADD', op(n, l, 'ADD', s, op(n, l, 'MULTIPLY', op(n, l, 'ABSOLUTE', op(n, l, 'SUBTRACT', u, 0.5)), 1.6)), op(n, l, 'MULTIPLY', wn.outputs['Value'], 7.0)))
    strand = op(n, l, 'SINE', op(n, l, 'MULTIPLY', herring, math.pi))
    edge = op(n, l, 'SINE', op(n, l, 'MULTIPLY', u, math.pi))
    height = op(n, l, 'MULTIPLY', op(n, l, 'POWER', strand, 0.6), op(n, l, 'POWER', edge, 0.5))
    shade = op(n, l, 'ADD', op(n, l, 'MULTIPLY', height, 0.55), op(n, l, 'ADD', op(n, l, 'MULTIPLY', wn.outputs['Value'], 0.25), op(n, l, 'MULTIPLY', noise(n, l, vec, 900, 6), 0.3)))
    col = ramp(n, l, shade, [(0.15, (0.36, 0.22, 0.07)), (0.45, (0.72, 0.52, 0.24)), (0.75, (0.9, 0.74, 0.44)), (1.0, (0.97, 0.86, 0.6))])
    l.new(col, b.inputs['Base Color'])
    b.inputs['Subsurface Weight'].default_value = 0.08
    bump(m, height, 0.7, 0.0012)
    return m


def plush(name, color):
    """Fleece / plush: soft sheen, fuzzy fibre bump."""
    if name in _mats:
        return _mats[name]
    m = mat(name, color, rough=0.85, Sheen_Weight=0.8, Sheen_Roughness=0.4)
    n, l, b = nodes(m)
    vec, *_ = coords(n, l)
    f = noise(n, l, vec, 2500, 8, 0.7)
    col = ramp(n, l, noise(n, l, vec, 120, 3), [(0.3, tuple(c * 0.86 for c in color)), (0.7, color)])
    l.new(col, b.inputs['Base Color'])
    bump(m, f, 0.45, 0.0006)
    return m


def lacquer(name, color, coat=1.0, rough=0.25):
    m = mat(name, color, rough=rough, Coat_Weight=coat, Coat_Roughness=0.06)
    return m


def leather(name='leather', color=(0.17, 0.085, 0.04), grain=1700):
    if name in _mats:
        return _mats[name]
    m = mat(name, color, rough=0.5, Coat_Weight=0.25, Coat_Roughness=0.35)
    n, l, b = nodes(m)
    vec, *_ = coords(n, l)
    vor = n.new('ShaderNodeTexVoronoi')
    vor.feature = 'DISTANCE_TO_EDGE'
    vor.inputs['Scale'].default_value = grain
    l.new(vec, vor.inputs['Vector'])
    col = ramp(n, l, noise(n, l, vec, 18, 4), [(0.3, tuple(c * 0.72 for c in color)), (0.55, color), (0.8, tuple(min(1, c * 1.3) for c in color))])
    l.new(col, b.inputs['Base Color'])
    bump(m, vor.outputs['Distance'], 0.35, 0.0004)
    return m


def metal(name, color, rough=0.32):
    return mat(name, color, rough=rough, Metallic=1.0)


def glass(name, color=(0.95, 0.98, 0.98), rough=0.02, ior=1.45):
    return mat(name, color, rough=rough, Transmission_Weight=1.0, IOR=ior)


def ceramic(name, color=(0.93, 0.92, 0.88), rim=None, rim_r=None):
    """Glazed ceramic; `rim` = a coloured band at radius ≥ rim_r (a plate's blue rim)."""
    if name in _mats:
        return _mats[name]
    m = mat(name, color, rough=0.12, Coat_Weight=0.6, Coat_Roughness=0.04)
    if rim:
        n, l, b = nodes(m)
        vec, x, y, z = coords(n, l)
        r = op(n, l, 'SQRT', op(n, l, 'ADD', op(n, l, 'MULTIPLY', x, x), op(n, l, 'MULTIPLY', y, y)))
        band = op(n, l, 'GREATER_THAN', r, rim_r)
        l.new(mix_rgb(n, l, band, color, rim), b.inputs['Base Color'])
    return m


def wood(name='wood', color=(0.16, 0.08, 0.035), rough=0.35, scale=60):
    if name in _mats:
        return _mats[name]
    m = mat(name, color, rough=rough, Coat_Weight=0.5, Coat_Roughness=0.15)
    n, l, b = nodes(m)
    vec, *_ = coords(n, l)
    w = n.new('ShaderNodeTexWave')
    w.wave_type = 'RINGS'
    w.inputs['Scale'].default_value = scale
    w.inputs['Distortion'].default_value = 6
    w.inputs['Detail'].default_value = 3
    l.new(vec, w.inputs['Vector'])
    col = ramp(n, l, w.outputs['Fac'], [(0.0, tuple(c * 0.7 for c in color)), (1.0, tuple(min(1, c * 1.5) for c in color))])
    l.new(col, b.inputs['Base Color'])
    bump(m, w.outputs['Fac'], 0.1)
    return m


def paper_mat(name, color=(0.9, 0.84, 0.68), lines=None, freq=110):
    if name in _mats:
        return _mats[name]
    m = mat(name, color, rough=0.85)
    n, l, b = nodes(m)
    vec, x, y, z = coords(n, l)
    col = ramp(n, l, noise(n, l, vec, 30, 5), [(0.3, tuple(c * 0.85 for c in color)), (0.72, color)])
    if lines:
        def stripes(axis, f):
            return op(n, l, 'GREATER_THAN', op(n, l, 'SINE', op(n, l, 'MULTIPLY', axis, 2 * math.pi * f)), 0.97)
        k = stripes(y, freq) if lines == 'ruled' else op(n, l, 'MAXIMUM', stripes(x, freq * 0.6), stripes(y, freq * 0.6))
        col = mix_rgb(n, l, op(n, l, 'MULTIPLY', k, 0.5), col, (0.3, 0.24, 0.17))
    l.new(col, b.inputs['Base Color'])
    bump(m, noise(n, l, vec, 300, 4), 0.06)
    return m


def chart_mat(name, seed=0.0, sea=(0.62, 0.72, 0.58), land=(0.84, 0.76, 0.54), ink=(0.25, 0.18, 0.11)):
    """A navigator's chart: land masses from noise, a drawn coastline, hatched shallows, a grid."""
    if name in _mats:
        return _mats[name]
    m = mat(name, rough=0.82)
    n, l, b = nodes(m)
    vec, x, y, z = coords(n, l)
    t = n.new('ShaderNodeTexNoise')
    t.noise_dimensions = '4D'
    t.inputs['W'].default_value = seed
    t.inputs['Scale'].default_value = 9
    t.inputs['Detail'].default_value = 7
    t.inputs['Roughness'].default_value = 0.6
    l.new(vec, t.inputs['Vector'])
    f = t.outputs['Fac']
    landk = op(n, l, 'GREATER_THAN', f, 0.53)
    coast = op(n, l, 'LESS_THAN', op(n, l, 'ABSOLUTE', op(n, l, 'SUBTRACT', f, 0.53)), 0.0045)
    shallow = op(n, l, 'MULTIPLY', op(n, l, 'LESS_THAN', op(n, l, 'ABSOLUTE', op(n, l, 'SUBTRACT', f, 0.505)), 0.003), 0.6)
    grid = op(n, l, 'MAXIMUM', op(n, l, 'GREATER_THAN', op(n, l, 'SINE', op(n, l, 'MULTIPLY', x, 2 * math.pi * 30)), 0.985), op(n, l, 'GREATER_THAN', op(n, l, 'SINE', op(n, l, 'MULTIPLY', y, 2 * math.pi * 30)), 0.985))
    age = noise(n, l, vec, 25, 4)
    base = mix_rgb(n, l, landk, sea, land)
    base = mix_rgb(n, l, op(n, l, 'MULTIPLY', op(n, l, 'SUBTRACT', age, 0.5), 0.6), base, (0.55, 0.42, 0.25))
    base = mix_rgb(n, l, op(n, l, 'MULTIPLY', grid, 0.35), base, ink)
    base = mix_rgb(n, l, shallow, base, ink)
    base = mix_rgb(n, l, coast, base, ink)
    l.new(base, b.inputs['Base Color'])
    bump(m, noise(n, l, vec, 300, 4), 0.06)
    return m


def image_mat(name, path, rough=0.8):
    if name in _mats:
        return _mats[name]
    m = mat(name, rough=rough)
    n, l, b = nodes(m)
    img = n.new('ShaderNodeTexImage')
    img.image = bpy.data.images.load(path)
    l.new(img.outputs['Color'], b.inputs['Base Color'])
    return m


# ---------------------------------------------------------------- the props

def prop(name):
    def deco(fn):
        def build(*a, **kw):
            global _coll
            c = bpy.data.collections.new(f'OP {name}')
            prev, _coll = _coll, c
            try:
                fn(*a, **kw)
            finally:
                _coll = prev
            return c
        PROPS[name] = build
        return build
    return deco


@prop('straw_hat')
def straw_hat(R=0.2):
    """Brim Ø 40 cm with a slight wave and droop, crown Ø 18 cm, 11 cm tall; red band 3 cm."""
    s = R
    prof = [(0, 0.55), (0.1, 0.548), (0.2, 0.54), (0.3, 0.522), (0.37, 0.495), (0.42, 0.455), (0.45, 0.4), (0.465, 0.3),
            (0.47, 0.2), (0.475, 0.13), (0.49, 0.105), (0.54, 0.09), (0.66, 0.07), (0.78, 0.05), (0.9, 0.028), (0.97, 0.012), (1.0, 0.0)]
    hat = lathe('hat', [(r * s, z * s) for r, z in prof], 256)
    for v in hat.data.vertices:
        rr = math.hypot(v.co.x, v.co.y)
        if rr > 0.5 * s:
            a = math.atan2(v.co.y, v.co.x)
            v.co.z += 0.012 * s * math.sin(a * 3 + 0.4) * (rr - 0.5 * s) / (0.5 * s)
    mod(hat, 'SOLIDIFY', thickness=0.006, offset=-1)
    subsurf(hat, 1)
    give(hat, straw())
    band = lathe('band', [(0.477 * s, 0.1 * s), (0.473 * s, 0.17 * s), (0.468 * s, 0.25 * s)], 256)
    mod(band, 'SOLIDIFY', thickness=0.0025, offset=1)
    subsurf(band, 1)
    red = mat('hatband', (0.42, 0.03, 0.03), rough=0.75, Sheen_Weight=0.4)
    n, l, b = nodes(red)
    vec, *_ = coords(n, l)
    w = n.new('ShaderNodeTexWave')
    w.inputs['Scale'].default_value = 3000
    l.new(vec, w.inputs['Vector'])
    bump(red, w.outputs['Fac'], 0.15)
    give(band, red)
    # loose straws at the brim's edge, the odd one sticking out further
    for i in range(34):
        a = 2 * math.pi * (i + 0.6 * math.sin(i * 12.9898)) / 34
        L = s * (0.015 + 0.07 * abs(math.sin(i * 3.1 + 0.7)) ** 3)
        dev = 0.5 * math.sin(i * 4.7)
        p0 = Vector((math.cos(a) * s * 0.985, math.sin(a) * s * 0.985, 0.003))
        p1 = p0 + Vector((math.cos(a + dev), math.sin(a + dev), 0)) * L
        give(sweep(f'fray{i}', [p0, (p0 + p1) / 2 + Vector((0, 0, 0.0015)), p1], lambda u: 0.0008 * (1 - 0.6 * u), 6), straw())
    # the chin cord, trailing out from under the brim
    cord = [(0.12 * math.cos(t) - 0.02, -0.15 + 0.07 * math.sin(t) - 0.1 * t / 6, 0.0015) for t in [i * 0.25 for i in range(26)]]
    give(sweep('chincord', cord, 0.0016, 10), mat('chincordm', (0.86, 0.82, 0.74), rough=0.8))


@prop('meat')
def meat():
    """Manga meat: a glazed roast round a bone sticking out both ends, on a blue-rimmed plate, with broccoli."""
    plate = lathe('plate', [(0, 0.004), (0.09, 0.004), (0.1, 0.006), (0.128, 0.017), (0.14, 0.021)], 128)
    mod(plate, 'SOLIDIFY', thickness=0.004, offset=-1)
    subsurf(plate, 2)
    give(plate, ceramic('plate', rim=(0.12, 0.25, 0.55), rim_r=0.125))
    roast = prim('primitive_uv_sphere_add', segments=96, ring_count=48, radius=1)
    smooth_shade(roast)
    at(roast, (0, 0, 0.055), scale=(0.085, 0.062, 0.05))
    tex = bpy.data.textures.new('lumps', 'CLOUDS')
    tex.noise_scale = 0.03
    mod(roast, 'DISPLACE', texture=tex, strength=0.009, mid_level=0.5)
    subsurf(roast, 1)
    m = mat('roast', (0.35, 0.12, 0.05), rough=0.28, Coat_Weight=0.8, Coat_Roughness=0.15, Subsurface_Weight=0.15)
    n, l, b = nodes(m)
    vec, *_ = coords(n, l)
    crust = noise(n, l, vec, 70, 8, 0.65)
    l.new(ramp(n, l, crust, [(0.3, (0.1, 0.03, 0.015)), (0.5, (0.3, 0.09, 0.03)), (0.72, (0.5, 0.2, 0.07))]), b.inputs['Base Color'])
    bump(m, crust, 0.6, 0.0015)
    give(roast, m)
    # the cut ends round the bone: pink, a darker ring outside
    for e in (-1, 1):
        cut = prim('primitive_cylinder_add', vertices=64, radius=1, depth=0.004)
        at(cut, (e * 0.083, 0, 0.055), (0, math.radians(90), 0), (0.04, 0.034, 1))
        cm = mat('meatcut', (0.75, 0.32, 0.3), rough=0.4)
        n, l, b = nodes(cm)
        vec, x, y, z = coords(n, l)
        rr = op(n, l, 'SQRT', op(n, l, 'ADD', op(n, l, 'MULTIPLY', x, x), op(n, l, 'MULTIPLY', y, y)))
        l.new(ramp(n, l, rr, [(0.0, (0.86, 0.45, 0.42)), (0.6, (0.76, 0.3, 0.28)), (0.9, (0.35, 0.1, 0.05))]), b.inputs['Base Color'])
        give(cut, cm)
    bone = mat('bone', (0.9, 0.86, 0.76), rough=0.45, Subsurface_Weight=0.2)
    give(sweep('bone', [(-0.13, 0, 0.055), (0.13, 0, 0.055)], 0.011, 32), bone)
    for e in (-1, 1):
        for sy in (-1, 1):
            k = prim('primitive_uv_sphere_add', segments=32, ring_count=16, radius=0.017)
            smooth_shade(k)
            at(k, (e * 0.138, sy * 0.012, 0.055))
            give(k, bone)
    # broccoli on the side
    for i, (bx, by) in enumerate([(0.0, 0.095), (0.04, 0.09), (-0.045, 0.088), (0.07, -0.085), (-0.06, -0.09)]):
        stem = prim('primitive_cylinder_add', vertices=12, radius=0.005, depth=0.02)
        at(stem, (bx, by, 0.016), (math.radians(80), 0, math.radians(i * 40)))
        give(stem, mat('stem', (0.5, 0.65, 0.3), rough=0.6))
        for j in range(7):
            fl = prim('primitive_ico_sphere_add', subdivisions=2, radius=0.008)
            smooth_shade(fl)
            a = j * 2.4
            at(fl, (bx + math.cos(a) * 0.008, by + math.sin(a) * 0.008, 0.026 + 0.003 * (j % 2)))
            give(fl, mat('broccoli', (0.12, 0.32, 0.08), rough=0.7))


def _katana(kind):
    """A katana in its scabbard lying flat along +x: hilt on the left, guard at x = 0."""
    curve = lambda x: 0.035 * (x / 0.75) ** 2
    rx, rz = 0.0165, 0.0125
    sp = [(x, curve(max(x, 0)), rz) for x in [0.006 + 0.744 * i / 60 for i in range(61)]]
    saya = sweep('saya', sp, lambda u: rx * (1 - 0.12 * u), 32, aspect=rz / rx)
    th = [(-0.27 + 0.27 * i / 30, 0, rz) for i in range(31)]
    tsuka = sweep('tsuka', th, lambda u: 0.0145 * (1 - 0.08 * abs(u - 0.5) * 2), 32, aspect=0.82)
    if kind == 'wado':
        saya_m = lacquer('saya_wado', (0.86, 0.84, 0.8))
        wrap, dia = (0.9, 0.89, 0.86), (0.05, 0.05, 0.06)
        guard = metal('tsuba_wado', (0.42, 0.31, 0.13), 0.35)
    elif kind == 'kitetsu':
        saya_m = mat('saya_kitetsu', rough=0.2, Coat_Weight=1.0, Coat_Roughness=0.05)
        n, l, b = nodes(saya_m)
        vec, x, y, z = coords(n, l)
        w = n.new('ShaderNodeTexWave')
        w.inputs['Scale'].default_value = 22
        w.inputs['Distortion'].default_value = 9
        w.inputs['Detail'].default_value = 3
        l.new(vec, w.inputs['Vector'])
        l.new(ramp(n, l, w.outputs['Fac'], [(0.45, (0.33, 0.02, 0.025)), (0.62, (0.03, 0.02, 0.02))], True), b.inputs['Base Color'])
        wrap, dia = (0.45, 0.04, 0.04), (0.04, 0.03, 0.03)
        guard = metal('tsuba_kitetsu', (0.12, 0.1, 0.09), 0.4)
    else:
        saya_m = mat('saya_shusui', rough=0.2, Coat_Weight=1.0, Coat_Roughness=0.05)
        n, l, b = nodes(saya_m)
        vec, *_ = coords(n, l)
        v = n.new('ShaderNodeTexVoronoi')
        v.inputs['Scale'].default_value = 90
        l.new(vec, v.inputs['Vector'])
        spot = op(n, l, 'LESS_THAN', v.outputs['Distance'], 0.18)
        l.new(mix_rgb(n, l, spot, (0.025, 0.02, 0.025), (0.8, 0.32, 0.42)), b.inputs['Base Color'])
        wrap, dia = (0.03, 0.03, 0.035), (0.86, 0.84, 0.8)
        guard = metal('tsuba_shusui', (0.08, 0.07, 0.07), 0.45)
    give(saya, saya_m)
    # the hilt's wrap: crossed bands of cord, diamonds of ray skin showing between
    wm = mat(f'tsuka_{kind}', wrap, rough=0.65)
    n, l, b = nodes(wm)
    vec, x, y, z = coords(n, l)
    aroundv = op(n, l, 'MULTIPLY', op(n, l, 'ARCTAN2', op(n, l, 'SUBTRACT', z, rz), y), 1.0 / math.pi)
    along = op(n, l, 'MULTIPLY', x, 40.0)
    d1 = op(n, l, 'ABSOLUTE', op(n, l, 'SUBTRACT', op(n, l, 'FRACT', op(n, l, 'ADD', along, aroundv)), 0.5))
    d2 = op(n, l, 'ABSOLUTE', op(n, l, 'SUBTRACT', op(n, l, 'FRACT', op(n, l, 'SUBTRACT', along, aroundv)), 0.5))
    diamond = op(n, l, 'LESS_THAN', op(n, l, 'ADD', d1, d2), 0.42)
    l.new(mix_rgb(n, l, diamond, wrap, dia), b.inputs['Base Color'])
    bump(wm, op(n, l, 'SUBTRACT', 1.0, diamond), 0.5, 0.0012)
    give(tsuka, wm)
    # guard, collars, pommel, the scabbard's mouth and tip
    tsuba = prim('primitive_cylinder_add', vertices=64, radius=1, depth=0.006)
    at(tsuba, (0, 0, rz), (0, math.radians(90), 0), (0.036 if kind != 'kitetsu' else 0.033, 0.039, 1))
    if kind == 'kitetsu':
        mod(tsuba, 'BEVEL', width=0.002, segments=3)
    give(tsuba, guard)
    horn = mat('horn', (0.03, 0.025, 0.02), rough=0.25, Coat_Weight=0.8)
    collar = metal(f'collar_{kind}', (0.12, 0.1, 0.08), 0.35)
    for x0, x1, r, m in ((-0.274, -0.262, 0.0155, collar), (-0.01, -0.003, 0.016, collar), (0.004, 0.026, rx * 1.02, horn), (0.72, 0.752, rx * 0.9, horn)):
        c = sweep('fit', [(x0, curve(max(x0, 0)), rz), (x1, curve(max(x1, 0)), rz)], r, 32, aspect=rz / rx if m is horn else 0.82)
        give(c, m)


for _k in ('wado', 'kitetsu', 'shusui'):
    prop(f'katana_{_k}')(lambda _k=_k: _katana(_k))


@prop('log_pose')
def log_pose():
    strap = prim('primitive_cube_add', size=1)
    at(strap, (0, 0, 0.0035), scale=(0.25, 0.034, 0.005))
    mod(strap, 'BEVEL', width=0.0015, segments=3)
    give(strap, leather('strap', (0.24, 0.12, 0.05), 2500))
    stitch = mat('stitch', (0.85, 0.72, 0.5), rough=0.6)
    for side in (-1, 1):
        for k in range(30):
            st = prim('primitive_cube_add', size=1)
            at(st, (-0.115 + k * 0.0079, side * 0.0125, 0.0063), scale=(0.004, 0.0009, 0.0008))
            give(st, stitch)
    for hx in (-0.1, -0.085, 0.085, 0.1):
        h = prim('primitive_cylinder_add', vertices=16, radius=0.0022, depth=0.006)
        at(h, (hx, 0, 0.004))
        give(h, mat('hole', (0.02, 0.01, 0.005), rough=0.9))
    base = lathe('lpbase', [(0, 0.016), (0.026, 0.016), (0.0268, 0.012), (0.0268, 0.004), (0.026, 0.0)], 96)
    at(base, (0, 0, 0.006))
    give(base, wood('lpwood', (0.2, 0.1, 0.04), 0.3, 300))
    ring = lathe('lpring', [(0.0195, 0.0165), (0.0215, 0.017), (0.0215, 0.0155), (0.0195, 0.0155)], 96)
    at(ring, (0, 0, 0.006))
    give(ring, metal('lpmetal', (0.55, 0.45, 0.25), 0.3))
    nd = prim('primitive_cube_add', size=1)
    at(nd, (0, 0, 0.042), (0, 0, -0.5), (0.03, 0.0016, 0.0009))
    give(nd, metal('needle', (0.07, 0.07, 0.08), 0.25))
    tip = prim('primitive_cone_add', vertices=12, radius1=0.0019, depth=0.006)
    at(tip, (math.cos(-0.5) * 0.017, math.sin(-0.5) * 0.017, 0.042), (0, math.radians(90), -0.5))
    give(tip, mat('needletip', (0.65, 0.05, 0.04), rough=0.35))
    post = prim('primitive_cylinder_add', vertices=16, radius=0.0012, depth=0.02)
    at(post, (0, 0, 0.032))
    give(post, metal('needle', (0.07, 0.07, 0.08)))
    ball = prim('primitive_uv_sphere_add', segments=96, ring_count=48, radius=0.0245)
    smooth_shade(ball)
    at(ball, (0, 0, 0.042))
    give(ball, glass('logglass', (0.86, 0.96, 0.97)))


@prop('clima_tact')
def clima_tact():
    blue = metal('climablue', (0.1, 0.28, 0.75), 0.28)
    white = ceramic('climawhite', (0.92, 0.93, 0.95))
    for i, (dy, rot) in enumerate(((0.0, 0.02), (0.034, -0.03), (0.068, 0.05))):
        c, s = math.cos(rot), math.sin(rot)
        p = lambda x: (x * c, dy + x * s, 0.011)
        give(sweep(f'rod{i}', [p(-0.14), p(0.14)], 0.0105, 32), blue)
        for x0, x1 in ((-0.15, -0.135), (0.135, 0.15), (-0.01, 0.01)):
            give(sweep(f'band{i}', [p(x0), p(x1)], 0.0118, 32), white)
        for e in (-0.155, 0.155):
            k = prim('primitive_uv_sphere_add', segments=32, ring_count=16, radius=0.012)
            smooth_shade(k)
            at(k, p(e))
            give(k, white)


@prop('tangerine')
def tangerine(R=0.033, leaf=True):
    t = prim('primitive_uv_sphere_add', segments=96, ring_count=48, radius=R)
    smooth_shade(t)
    at(t, (0, 0, R * 0.84), scale=(1, 1, 0.84))
    m = mat('tangerine', (0.95, 0.42, 0.04), rough=0.42, Subsurface_Weight=0.15, Coat_Weight=0.3)
    n, l, b = nodes(m)
    vec, *_ = coords(n, l)
    vor = n.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 900
    l.new(vec, vor.inputs['Vector'])
    l.new(ramp(n, l, noise(n, l, vec, 40, 3), [(0.35, (0.82, 0.3, 0.02)), (0.65, (1.0, 0.5, 0.06))]), b.inputs['Base Color'])
    bump(m, vor.outputs['Distance'], 0.4, 0.0003)
    give(t, m)
    st = prim('primitive_cylinder_add', vertices=10, radius=R * 0.07, depth=R * 0.12)
    at(st, (0, 0, R * 1.69))
    give(st, mat('tstem', (0.25, 0.3, 0.1), rough=0.6))
    if leaf:
        bm = bmesh.new()
        Lf = R * 1.7
        out = [(u * Lf, 0.36 * Lf * math.sin(math.pi * u) ** 0.9) for u in [i / 16 for i in range(17)]]
        vs = [bm.verts.new((x, y, 0)) for x, y in out] + [bm.verts.new((x, -y, 0)) for x, y in reversed(out[1:-1])]
        bm.faces.new(vs)
        lf = from_bm('leaf', bm)
        mod(lf, 'SUBSURF', levels=2, render_levels=2, subdivision_type='SIMPLE')
        mod(lf, 'SOLIDIFY', thickness=0.0004)
        mod(lf, 'SIMPLE_DEFORM', deform_method='BEND', angle=math.radians(25), deform_axis='Y')
        smooth_shade(lf)
        at(lf, (0, 0, R * 1.62), (math.radians(-8), math.radians(-14), math.radians(30)))
        lm = mat('leafm', (0.1, 0.26, 0.05), rough=0.38, Coat_Weight=0.4)
        n, l, b = nodes(lm)
        vec, x, y, z = coords(n, l)
        vein = op(n, l, 'MAXIMUM', op(n, l, 'LESS_THAN', op(n, l, 'ABSOLUTE', y), 0.0007), op(n, l, 'GREATER_THAN', op(n, l, 'SINE', op(n, l, 'MULTIPLY', op(n, l, 'SUBTRACT', x, op(n, l, 'MULTIPLY', op(n, l, 'ABSOLUTE', y), 1.4)), 2 * math.pi * 260)), 0.92))
        l.new(mix_rgb(n, l, op(n, l, 'MULTIPLY', vein, 0.6), (0.1, 0.26, 0.05), (0.42, 0.55, 0.2)), b.inputs['Base Color'])
        bump(lm, vein, 0.2)
        give(lf, lm)


@prop('kabuto')
def kabuto():
    """Usopp's Kabuto (a desk-size replica): the green staff, a white grip, the ring head with prongs."""
    green = lacquer('kabutogreen', (0.06, 0.22, 0.1), 0.6, 0.3)
    give(sweep('staff', [(-0.3, 0, 0.011), (0.19, 0, 0.011)], 0.0095, 32), green)
    grip = mat('grip', (0.88, 0.86, 0.8), rough=0.8)
    n, l, b = nodes(grip)
    vec, x, *_ = coords(n, l)
    bump(grip, op(n, l, 'SINE', op(n, l, 'MULTIPLY', x, 2 * math.pi * 120)), 0.6, 0.001)
    give(sweep('grip', [(-0.29, 0, 0.011), (-0.15, 0, 0.011)], 0.0112, 32), grip)
    cap = prim('primitive_uv_sphere_add', segments=24, ring_count=12, radius=0.012)
    smooth_shade(cap)
    at(cap, (-0.302, 0, 0.011))
    give(cap, green)
    c = (0.265, 0.0)
    R = 0.075
    give(sweep('ring', arc(c, R, math.radians(200), math.radians(520), 96, 0.011), 0.0085, 24), green)
    for a in (math.radians(250), math.radians(330), math.radians(410), math.radians(490)):
        p0 = (c[0] + math.cos(a) * R, c[1] + math.sin(a) * R, 0.011)
        p1 = (c[0] + math.cos(a) * R * 0.62, c[1] + math.sin(a) * R * 0.62, 0.011)
        give(sweep('prong', [p0, p1], lambda u: 0.007 * (1 - 0.5 * u), 16), green)
    # the slingshot band to its leather pouch
    rubber = mat('rubber', (0.75, 0.55, 0.32), rough=0.4, Subsurface_Weight=0.3)
    pouch = (c[0] - 0.01, 0.0, 0.013)
    for a in (math.radians(160), math.radians(200)):
        give(sweep('bandr', [(c[0] + math.cos(a + math.pi) * R * 0.98, c[1] + math.sin(a + math.pi) * R * 0.98, 0.012), pouch], 0.0028, 10), rubber)
    po = prim('primitive_uv_sphere_add', segments=24, ring_count=12, radius=1)
    smooth_shade(po)
    at(po, pouch, scale=(0.012, 0.018, 0.005))
    give(po, leather('pouch', (0.3, 0.17, 0.08), 2500))


@prop('chopper_hat')
def chopper_hat():
    """Pink plush top hat with the white X, antlers through it; lying on its side, the X facing up."""
    pink = plush('pinkplush', (0.93, 0.36, 0.55))
    white = plush('whiteplush', (0.95, 0.93, 0.9))
    antler = mat('antler', (0.33, 0.2, 0.1), rough=0.7)
    n, l, b = nodes(antler)
    vec, *_ = coords(n, l)
    bump(antler, noise(n, l, vec, 400, 4), 0.5)
    parts = []
    brim = lathe('brim', [(0.08, 0.0), (0.135, -0.004), (0.142, 0.006), (0.135, 0.016), (0.08, 0.014)], 128)
    subsurf(brim, 1)
    give(brim, pink)
    crown = lathe('crown', [(0.084, 0.0), (0.083, 0.06), (0.086, 0.12), (0.089, 0.14), (0.07, 0.148), (0, 0.15)], 128)
    subsurf(crown, 1)
    give(crown, pink)
    parts += [brim, crown]
    for a in (math.radians(45), math.radians(-45)):
        xb = prim('primitive_cube_add', size=1)
        at(xb, (0, 0.09, 0.075), (0, a, 0), (0.15, 0.012, 0.04))
        mod(xb, 'BEVEL', width=0.005, segments=4)
        give(xb, white)
        parts.append(xb)
    for e in (-1, 1):
        beam = [(e * 0.08, 0, 0.11), (e * 0.12, 0, 0.14), (e * 0.15, 0.01, 0.19), (e * 0.16, 0.0, 0.23)]
        parts.append(give(sweep('antler', beam, lambda u: 0.012 * (1 - 0.5 * u), 16), antler))
        parts.append(give(sweep('tine', [(e * 0.13, 0.0, 0.16), (e * 0.11, 0.02, 0.2)], lambda u: 0.008 * (1 - 0.6 * u), 12), antler))
        parts.append(give(sweep('tine2', [(e * 0.155, 0.005, 0.2), (e * 0.19, 0.01, 0.215)], lambda u: 0.007 * (1 - 0.6 * u), 12), antler))
    root = put(bpy.data.objects.new('chopperhat', None))
    for p in parts:
        p.parent = root
    # on its side: the hat's axis along -y, the X up, resting on the brim's edge
    at(root, (0, 0, 0.142), (math.radians(90), 0, 0))


@prop('medicine')
def medicine():
    amber = glass('amber', (0.75, 0.38, 0.08), 0.05)
    cork = mat('cork', (0.55, 0.38, 0.2), rough=0.9)
    for i, (x, y) in enumerate(((0, 0), (0.05, 0.02))):
        b = lathe('vial', [(0, 0), (0.017, 0), (0.018, 0.004), (0.018, 0.05), (0.01, 0.06), (0.008, 0.07), (0.009, 0.074)], 64)
        mod(b, 'SOLIDIFY', thickness=0.0012, offset=-1)
        at(b, (x, y, 0))
        give(b, amber)
        ck = prim('primitive_cylinder_add', vertices=32, radius=0.0075, depth=0.014)
        at(ck, (x, y, 0.078))
        give(ck, cork)
    for i, (x, y) in enumerate(((0.03, -0.035), (0.05, -0.03), (0.042, -0.05))):
        ball = prim('primitive_uv_sphere_add', segments=32, ring_count=16, radius=0.0085)
        smooth_shade(ball)
        at(ball, (x, y, 0.0085))
        give(ball, mat('rumble', (0.78, 0.6, 0.25), rough=0.35, Coat_Weight=0.5))


@prop('cola')
def cola():
    """A Franky Cola, lying on its side."""
    prof = [(0, 0.0), (0.028, 0.0), (0.0315, 0.006), (0.033, 0.03), (0.031, 0.06), (0.0285, 0.085), (0.031, 0.11), (0.0325, 0.13),
            (0.03, 0.16), (0.022, 0.19), (0.0155, 0.212), (0.0135, 0.228), (0.0145, 0.236), (0.0135, 0.24)]
    parts = []
    bot = lathe('bottle', prof, 96)
    mod(bot, 'SOLIDIFY', thickness=0.0022, offset=-1)
    give(bot, glass('bottleglass', (0.62, 0.8, 0.72), 0.03, 1.5))
    liq = lathe('cola', [(0, 0.004), (0.029, 0.004), (0.03, 0.03), (0.028, 0.06), (0.026, 0.085), (0.028, 0.11), (0.029, 0.13), (0.027, 0.16), (0.019, 0.19), (0, 0.19)], 96)
    give(liq, glass('colaliquid', (0.22, 0.07, 0.02), 0.02, 1.34))
    label = prim('primitive_cylinder_add', vertices=96, radius=0.0318, depth=0.045, end_fill_type='NOTHING')
    at(label, (0, 0, 0.042), (0, 0, math.radians(-90)))
    give(label, image_mat('colalabel', os.path.join(TEX, 'franky-cola.png'), 0.5))
    capm = metal('colacap', (0.62, 0.06, 0.05), 0.35)
    cap = prim('primitive_cylinder_add', vertices=24, radius=0.0165, depth=0.008)
    at(cap, (0, 0, 0.241))
    mod(cap, 'BEVEL', width=0.0012, segments=2)
    give(cap, capm)
    parts += [bot, liq, label, cap]
    root = put(bpy.data.objects.new('cola', None))
    for p in parts:
        p.parent = root
    at(root, (-0.12, 0, 0.033), (0, math.radians(90), 0))


@prop('teacup')
def teacup():
    por = ceramic('porcelain', (0.95, 0.94, 0.91), rim=(0.15, 0.25, 0.5), rim_r=0.071)
    sau = lathe('saucer', [(0, 0.002), (0.05, 0.002), (0.06, 0.006), (0.075, 0.012)], 128)
    mod(sau, 'SOLIDIFY', thickness=0.003, offset=-1)
    subsurf(sau, 1)
    give(sau, por)
    cupm = ceramic('cupporcelain', (0.95, 0.94, 0.91), rim=(0.15, 0.25, 0.5), rim_r=0.043)
    cup = lathe('cup', [(0, 0.008), (0.025, 0.008), (0.035, 0.015), (0.042, 0.035), (0.045, 0.058)], 128)
    mod(cup, 'SOLIDIFY', thickness=0.0025, offset=-1)
    subsurf(cup, 1)
    give(cup, cupm)
    tea = lathe('tea', [(0, 0.045), (0.041, 0.045)], 96)
    give(tea, mat('tea', (0.36, 0.13, 0.03), rough=0.05, Coat_Weight=1.0))
    give(sweep('handle', arc((0.05, 0.0), 0.014, math.radians(-110), math.radians(110), 24, 0.0), 0.0035, 12), cupm).location = (0, 0, 0.033)


@prop('ashtray')
def ashtray():
    tray = lathe('tray', [(0, 0.002), (0.035, 0.002), (0.04, 0.008), (0.045, 0.014), (0.047, 0.016)], 96)
    mod(tray, 'SOLIDIFY', thickness=0.002, offset=-1)
    give(tray, metal('tin', (0.4, 0.38, 0.35), 0.4))
    paperw = mat('cigpaper', (0.95, 0.94, 0.9), rough=0.7)
    filt = mat('filter', (0.85, 0.55, 0.25), rough=0.7)
    ash = mat('ash', (0.35, 0.34, 0.33), rough=0.95)
    a = math.radians(20)
    p = lambda u: (math.cos(a) * u, math.sin(a) * u, 0.018)
    give(sweep('cig', [p(-0.03), p(0.04)], 0.004, 16), paperw)
    give(sweep('filter', [p(-0.055), p(-0.03)], 0.0041, 16), filt)
    give(sweep('ash', [p(0.04), p(0.052)], 0.0038, 16), ash)


@prop('books')
def books():
    """Three leather-bound volumes, stacked a little askew, raised bands on their spines."""
    specs = [((0.3, 0.22, 0.045), (0.2, 0.04, 0.03), 0.0, 0.0), ((0.27, 0.2, 0.04), (0.05, 0.11, 0.065), 0.08, 0.06), ((0.24, 0.17, 0.035), (0.06, 0.065, 0.12), -0.06, 0.12)]
    z = 0.0
    pages = paper_mat('pageblock', (0.88, 0.82, 0.66))
    for i, ((w, d, t), col, rot, dx) in enumerate(specs):
        lm = leather(f'book{i}', col, 1500)
        cv = prim('primitive_cube_add', size=1)
        at(cv, (dx, 0.01 * i, z + t / 2), (0, 0, rot), (w, d, t))
        mod(cv, 'BEVEL', width=0.003, segments=4)
        give(cv, lm)
        pb = prim('primitive_cube_add', size=1)
        at(pb, (dx + 0.004 * math.cos(rot), 0.01 * i + 0.004 * math.sin(rot), z + t / 2), (0, 0, rot), (w - 0.006, d + 0.004, t - 0.008))
        give(pb, pages)
        # the spine (on -y): rounded, with four raised bands across it
        sp = prim('primitive_cylinder_add', vertices=32, radius=t * 0.5, depth=w * 0.995)
        loc = Vector((0, -d / 2 + t * 0.12, 0))
        loc.rotate(Euler((0, 0, rot)))
        at(sp, (dx + loc.x, 0.01 * i + loc.y, z + t / 2), (0, math.radians(90), rot), (1, 0.55, 1))
        smooth_shade(sp)
        give(sp, lm)
        for k in range(4):
            u = -w / 2 + w * (0.2 + 0.2 * k)
            band = prim('primitive_cylinder_add', vertices=32, radius=t * 0.52, depth=0.007)
            loc = Vector((u, -d / 2 + t * 0.12, 0))
            loc.rotate(Euler((0, 0, rot)))
            at(band, (dx + loc.x, 0.01 * i + loc.y, z + t / 2), (0, math.radians(90), rot), (1, 0.6, 1))
            smooth_shade(band)
            give(band, lm)
        z += t


@prop('sake_set')
def sake_set():
    s = 0.06
    cup = lathe('sakazuki', [(r * s, z * s) for r, z in [(0, 0.1), (0.4, 0.105), (0.62, 0.14), (0.8, 0.22), (0.93, 0.34), (1.0, 0.44)]], 128)
    mod(cup, 'SOLIDIFY', thickness=0.004, offset=-1)
    subsurf(cup, 2)
    foot = lathe('foot', [(0.42 * s, 0.0), (0.46 * s, 0.0), (0.46 * s, 0.11 * s), (0.42 * s, 0.11 * s)], 96)
    red = lacquer('sakelacquer', (0.48, 0.03, 0.02))
    give(cup, red)
    give(foot, red)
    sake = lathe('sake', [(0, 0.016), (0.042, 0.016)], 96)
    give(sake, glass('sake', (0.95, 0.93, 0.85), 0.02, 1.34))
    bottle = lathe('tokkuri', [(0, 0), (0.03, 0), (0.042, 0.03), (0.044, 0.06), (0.03, 0.1), (0.014, 0.13), (0.012, 0.15), (0.017, 0.16)], 96)
    mod(bottle, 'SOLIDIFY', thickness=0.003, offset=-1)
    at(bottle, (0.1, 0.03, 0))
    give(bottle, ceramic('tokkuri', (0.93, 0.91, 0.86), rim=(0.15, 0.2, 0.42), rim_r=0.038))


@prop('den_den_mushi')
def den_den_mushi():
    """The snail phone: a tan snail, its shell striped, a receiver on top, eyes on stalks, a coiled cord."""
    skin = mat('snailskin', (0.66, 0.42, 0.24), rough=0.45, Subsurface_Weight=0.3, Coat_Weight=0.3)
    n, l, b = nodes(skin)
    vec, *_ = coords(n, l)
    bump(skin, noise(n, l, vec, 600, 4), 0.3)
    foot = prim('primitive_uv_sphere_add', segments=64, ring_count=32, radius=1)
    smooth_shade(foot)
    at(foot, (0.0, 0, 0.012), scale=(0.075, 0.036, 0.014))
    give(foot, skin)
    body = prim('primitive_uv_sphere_add', segments=64, ring_count=32, radius=1)
    smooth_shade(body)
    at(body, (0.03, 0, 0.03), (0, math.radians(-25), 0), (0.045, 0.028, 0.026))
    give(body, skin)
    head = prim('primitive_uv_sphere_add', segments=64, ring_count=32, radius=1)
    smooth_shade(head)
    at(head, (0.058, 0, 0.052), scale=(0.024, 0.024, 0.027))
    give(head, skin)
    lip = prim('primitive_torus_add', major_radius=0.012, minor_radius=0.0045, major_segments=48, minor_segments=12)
    at(lip, (0.078, 0, 0.044), (0, math.radians(80), 0), (1, 1.2, 0.7))
    give(lip, mat('lips', (0.82, 0.48, 0.42), rough=0.35, Subsurface_Weight=0.3))
    white = ceramic('eyewhite', (0.97, 0.97, 0.95))
    black = mat('pupil', (0.02, 0.02, 0.025), rough=0.1, Coat_Weight=1.0)
    for e in (-1, 1):
        give(sweep('stalk', [(0.06, e * 0.01, 0.07), (0.07, e * 0.016, 0.09), (0.077, e * 0.022, 0.103)], 0.0045, 16), skin)
        eye = prim('primitive_uv_sphere_add', segments=32, ring_count=16, radius=0.009)
        smooth_shade(eye)
        at(eye, (0.079, e * 0.023, 0.108))
        give(eye, white)
        pu = prim('primitive_uv_sphere_add', segments=24, ring_count=12, radius=0.0042)
        smooth_shade(pu)
        at(pu, (0.0865, e * 0.024, 0.11))
        give(pu, black)
    shell = prim('primitive_uv_sphere_add', segments=96, ring_count=48, radius=1)
    smooth_shade(shell)
    at(shell, (-0.018, 0, 0.06), scale=(0.048, 0.033, 0.047))
    sm = mat('shell', (0.93, 0.89, 0.8), rough=0.35, Coat_Weight=0.5)
    n, l, b = nodes(sm)
    vec, x, y, z = coords(n, l)
    # (the shell's own coordinates: metres from its centre)
    rr = op(n, l, 'SQRT', op(n, l, 'ADD', op(n, l, 'MULTIPLY', x, x), op(n, l, 'MULTIPLY', z, z)))
    ang = op(n, l, 'ARCTAN2', z, x)
    spiral = op(n, l, 'FRACT', op(n, l, 'ADD', op(n, l, 'MULTIPLY', rr, 80.0), op(n, l, 'MULTIPLY', ang, 1.0 / (2 * math.pi))))
    groove = op(n, l, 'GREATER_THAN', spiral, 0.88)
    stripe = op(n, l, 'LESS_THAN', op(n, l, 'ABSOLUTE', op(n, l, 'SUBTRACT', op(n, l, 'ABSOLUTE', x), 0.016)), 0.006)
    colr = mix_rgb(n, l, stripe, (0.93, 0.89, 0.8), (0.2, 0.42, 0.75))
    colr = mix_rgb(n, l, op(n, l, 'MULTIPLY', groove, 0.5), colr, (0.45, 0.38, 0.3))
    l.new(colr, b.inputs['Base Color'])
    bump(sm, groove, 0.4)
    give(shell, sm)
    rec = mat('receiver', (0.2, 0.04, 0.03), rough=0.25, Coat_Weight=0.6)
    bar = prim('primitive_cube_add', size=1)
    at(bar, (-0.018, 0, 0.113), scale=(0.07, 0.014, 0.01))
    mod(bar, 'BEVEL', width=0.004, segments=4)
    give(bar, rec)
    for e in (-1, 1):
        cupr = prim('primitive_cylinder_add', vertices=32, radius=0.012, depth=0.012)
        at(cupr, (-0.018 + e * 0.035, 0, 0.106))
        mod(cupr, 'BEVEL', width=0.003, segments=3)
        give(cupr, rec)
    coil = [(-0.053 + 0.004 * math.cos(t * 2 * math.pi), 0.025 + 0.004 * math.sin(t * 2 * math.pi), 0.1 - t * 0.0042) for t in [i / 8 for i in range(8 * 14)]]
    give(sweep('cord', coil, 0.0011, 8), mat('cordm', (0.08, 0.06, 0.05), rough=0.4))
    dial = prim('primitive_cylinder_add', vertices=48, radius=0.017, depth=0.004)
    at(dial, (-0.018, 0.033, 0.06), (math.radians(90), 0, 0))
    give(dial, mat('dial', (0.2, 0.25, 0.4), rough=0.3))


@prop('globe')
def globe():
    stand = wood('globewood', (0.18, 0.09, 0.04), 0.3, 80)
    base = lathe('gbase', [(0, 0.0), (0.075, 0.0), (0.078, 0.012), (0.06, 0.02), (0.012, 0.03), (0.012, 0.12), (0, 0.12)], 96)
    give(base, stand)
    g = prim('primitive_uv_sphere_add', segments=128, ring_count=64, radius=0.1)
    smooth_shade(g)
    at(g, (0, 0, 0.235))
    gm = chart_mat('globemap', 3.7, sea=(0.22, 0.42, 0.42), land=(0.82, 0.74, 0.5))
    nodes(gm)[2].inputs['Coat Weight'].default_value = 0.6
    give(g, gm)
    ring = sweep('meridian', arc((0, 0.235), 0.107, math.radians(-60), math.radians(240), 96, 0.0), 0.0035, 16)
    at(ring, (0, 0, 0), (math.radians(90), 0, math.radians(20)))
    ring.location = (0, 0, 0)
    give(ring, metal('globemetal', (0.45, 0.36, 0.2), 0.3))


@prop('spyglass')
def spyglass(L=0.4):
    tube = lacquer('tube', (0.03, 0.025, 0.02), 0.6, 0.25)
    lth = leather('barrel', (0.2, 0.1, 0.045), 2500)
    iron = metal('spyiron', (0.28, 0.24, 0.19), 0.3)
    for u0, u1, r, kind in ((0.0, 0.42, 0.0175, lth), (0.42, 0.66, 0.0145, tube), (0.66, 0.86, 0.012, tube), (0.86, 1.0, 0.0102, tube)):
        give(sweep('seg', [(-L / 2 + L * u0, 0, 0.0175), (-L / 2 + L * u1, 0, 0.0175)], r, 48), kind)
        for u in (u0, u1):
            t = prim('primitive_torus_add', major_radius=r + 0.0004, minor_radius=0.0011, major_segments=64, minor_segments=10)
            at(t, (-L / 2 + L * u, 0, 0.0175), (0, math.radians(90), 0))
            give(t, iron)
    lens = prim('primitive_cylinder_add', vertices=48, radius=0.0155, depth=0.002)
    at(lens, (-L / 2 - 0.001, 0, 0.0175), (0, math.radians(90), 0))
    give(lens, glass('lens', (0.6, 0.7, 0.75)))


@prop('ink_quill')
def ink_quill():
    s = 0.03
    prof = [(0, 0), (0.85, 0), (0.98, 0.06), (1.0, 0.25), (0.96, 0.5), (0.7, 0.66), (0.42, 0.72), (0.4, 0.86), (0.44, 0.9), (0.44, 0.96), (0.38, 0.98)]
    bottle = lathe('inkbottle', [(r * s, z * s * 1.3) for r, z in prof], 96)
    mod(bottle, 'SOLIDIFY', thickness=0.0015, offset=-1)
    subsurf(bottle, 1)
    give(bottle, glass('inkglass', (0.12, 0.13, 0.22), 0.05))
    ink = lathe('ink', [(0, 0.002), (0.026, 0.002), (0.027, 0.016), (0, 0.016)], 64)
    give(ink, mat('inkm', (0.01, 0.01, 0.025), rough=0.06))
    cork = prim('primitive_cylinder_add', vertices=48, radius=0.0115, depth=0.01)
    at(cork, (0, 0, 0.04))
    give(cork, mat('cork', (0.55, 0.38, 0.2), rough=0.9))
    bm = bmesh.new()
    pts = [(math.cos(a) * (1 + 0.25 * math.sin(a * 3)) * 0.012, math.sin(a) * (1 + 0.2 * math.cos(a * 4)) * 0.008, 0) for a in [i * 2 * math.pi / 32 for i in range(32)]]
    bm.faces.new([bm.verts.new(p) for p in pts])
    drip = from_bm('drip', bm)
    at(drip, (0.04, -0.035, 0.0003))
    give(drip, mat('dripm', (0.02, 0.02, 0.04), rough=0.15))
    L = 0.22
    bm = bmesh.new()
    top = [(L * u, L * 0.075 * math.sin(math.pi * min(1, (u - 0.18) / 0.82)) ** 0.7 + 0.004 * L * u) for u in [0.18 + 0.82 * i / 40 for i in range(41)]]
    low = [(L * u, -L * 0.045 * math.sin(math.pi * min(1, (u - 0.25) / 0.75)) ** 0.8) for u in [0.25 + 0.75 * i / 40 for i in range(41)]]
    bm.faces.new([bm.verts.new((x, y, 0)) for x, y in top] + [bm.verts.new((x, y, 0)) for x, y in reversed(low)])
    vane = from_bm('vane', bm)
    mod(vane, 'SOLIDIFY', thickness=0.0003)
    mod(vane, 'SIMPLE_DEFORM', deform_method='BEND', angle=math.radians(10), deform_axis='Z')
    fm = mat('feather', (0.93, 0.9, 0.84), rough=0.6, Subsurface_Weight=0.2)
    n, l, b = nodes(fm)
    vec, x, y, z = coords(n, l)
    barbs = op(n, l, 'SINE', op(n, l, 'MULTIPLY', op(n, l, 'ADD', x, op(n, l, 'MULTIPLY', op(n, l, 'ABSOLUTE', y), 1.6)), 2 * math.pi * 900))
    l.new(ramp(n, l, barbs, [(0.0, (0.76, 0.72, 0.64)), (1.0, (0.97, 0.95, 0.9))]), b.inputs['Base Color'])
    bump(fm, barbs, 0.25)
    give(vane, fm)
    shaft = give(sweep('shaft', [(0.0, 0, 0.0004), (L, -0.002, 0.0004)], lambda u: 0.0011 * (1 - 0.5 * u), 12), mat('shaft', (0.75, 0.68, 0.55), rough=0.4))
    nib = prim('primitive_cone_add', vertices=12, radius1=0.0012, depth=0.014)
    at(nib, (-0.007, 0, 0.0004), (0, math.radians(-90), 0))
    give(nib, metal('nib', (0.03, 0.03, 0.04), 0.2))
    # the quill lies beside the bottle, its nib towards it
    for ob in (vane, shaft, nib):
        ob.location.x += 0.03
        ob.location.y -= 0.045


@prop('chart_roll')
def chart_roll(L=0.34, r=0.017):
    give(sweep('roll', [(-L / 2, 0, r), (L / 2, 0, r)], r, 64), paper_mat('rollpaper', (0.84, 0.75, 0.55)))
    sp = mat('spiral', (0.45, 0.35, 0.22), rough=0.8)
    for e in (-1, 1):
        for k in range(5):
            t = prim('primitive_torus_add', major_radius=r * (0.22 + 0.17 * k), minor_radius=0.00025, major_segments=48, minor_segments=6)
            at(t, (e * (L / 2 + 0.0002), 0, r), (0, math.radians(90), 0))
            give(t, sp)
    cord = prim('primitive_torus_add', major_radius=r * 1.04, minor_radius=0.0013, major_segments=64, minor_segments=10)
    at(cord, (0.03, 0, r), (0, math.radians(90), 0))
    give(cord, mat('cord', (0.5, 0.04, 0.03), rough=0.65))
    give(sweep('cordend', [(0.03, r * 0.8, 0.003), (0.05, r * 1.6, 0.002), (0.06, r * 2.6, 0.0015)], 0.0012, 8), mat('cord', (0.5, 0.04, 0.03)))


@prop('candle')
def candle():
    dish = lathe('dish', [(0, 0.002), (0.035, 0.002), (0.042, 0.008), (0.045, 0.014)], 96)
    mod(dish, 'SOLIDIFY', thickness=0.002, offset=-1)
    give(dish, metal('dishiron', (0.18, 0.16, 0.14), 0.45))
    wax = mat('candlewax', (0.93, 0.88, 0.76), rough=0.4, Subsurface_Weight=0.4)
    stub = lathe('stub', [(0, 0.004), (0.016, 0.004), (0.0165, 0.05), (0.014, 0.054), (0.004, 0.051), (0, 0.05)], 64)
    give(stub, wax)
    for i in range(6):
        a = i * 1.1
        d = prim('primitive_uv_sphere_add', segments=16, ring_count=8, radius=1)
        smooth_shade(d)
        at(d, (math.cos(a) * 0.0158, math.sin(a) * 0.0158, 0.036 - 0.003 * i), scale=(0.0022, 0.0022, 0.007 + 0.002 * (i % 3)))
        give(d, wax)
    wick = prim('primitive_cylinder_add', vertices=8, radius=0.0009, depth=0.008)
    at(wick, (0, 0, 0.055), (0.2, 0, 0))
    give(wick, mat('wick', (0.02, 0.02, 0.02), rough=0.9))
    give(sweep('handle', arc((0.05, 0), 0.012, math.radians(-120), math.radians(120), 24, 0.008), 0.0025, 12), metal('dishiron', (0.18, 0.16, 0.14)))


@prop('magnifier')
def magnifier():
    rim = prim('primitive_torus_add', major_radius=0.042, minor_radius=0.004, major_segments=96, minor_segments=16)
    at(rim, (0, 0, 0.006))
    give(rim, metal('magrim', (0.22, 0.2, 0.18), 0.3))
    lens = prim('primitive_uv_sphere_add', segments=64, ring_count=32, radius=1)
    smooth_shade(lens)
    at(lens, (0, 0, 0.006), scale=(0.041, 0.041, 0.005))
    give(lens, glass('maglens', (0.97, 0.99, 0.99), 0.0, 1.5))
    give(sweep('ferrule', [(0.045, 0, 0.006), (0.062, 0, 0.006)], 0.0055, 24), metal('magrim', (0.22, 0.2, 0.18)))
    give(sweep('handle', [(0.062, 0, 0.007), (0.16, 0, 0.007)], lambda u: 0.007 * (1 + 0.15 * math.sin(u * math.pi)), 24), wood('maghandle', (0.25, 0.12, 0.05), 0.3, 200))


@prop('dividers')
def dividers():
    steel = metal('steel', (0.62, 0.62, 0.64), 0.22)
    for e in (-1, 1):
        give(sweep('leg', [(0, 0, 0.004), (0.17, e * 0.022, 0.002)], lambda u: 0.0035 * (1 - 0.85 * u), 12), steel)
    hinge = prim('primitive_cylinder_add', vertices=32, radius=0.008, depth=0.006)
    at(hinge, (0, 0, 0.004))
    give(hinge, metal('brassish', (0.4, 0.34, 0.22), 0.3))


@prop('pencils')
def pencils():
    for i, (y, rot, col) in enumerate(((0, 0.05, (0.85, 0.65, 0.12)), (0.025, -0.08, (0.6, 0.06, 0.05)))):
        c, s = math.cos(rot), math.sin(rot)
        p = lambda u: (u * c, y + u * s, 0.0038)
        body = sweep(f'pencil{i}', [p(-0.08), p(0.065)], 0.0038, 6)
        give(body, lacquer(f'pencilpaint{i}', col, 0.5, 0.35))
        give(sweep(f'cone{i}', [p(0.065), p(0.085)], lambda u: 0.0037 * (1 - u) + 0.0006, 12), wood('pencilwood', (0.75, 0.55, 0.35), 0.6, 400))
        give(sweep(f'lead{i}', [p(0.083), p(0.09)], lambda u: 0.0009 * (1 - u) + 0.0002, 8), mat('graphite', (0.1, 0.1, 0.11), rough=0.3) if i == 0 else mat('redlead', (0.6, 0.05, 0.04), rough=0.4))


@prop('sea_chart')
def sea_chart(w=0.42, h=0.3, seed=0.0):
    sh = prim('primitive_plane_add', size=1)
    sh.data.transform(Matrix.Diagonal((w, h, 1, 1)))
    at(sh, (0, 0, 0.0004))
    mod(sh, 'SUBSURF', levels=3, render_levels=3, subdivision_type='SIMPLE')
    mod(sh, 'SIMPLE_DEFORM', deform_method='BEND', angle=math.radians(5), deform_axis='Y')
    give(sh, chart_mat(f'chart{seed}', seed))


def _wanted(who):
    sh = prim('primitive_plane_add', size=1)
    sh.data.transform(Matrix.Diagonal((0.21, 0.3, 1, 1)))
    at(sh, (0, 0, 0.0005))
    mod(sh, 'SUBSURF', levels=4, render_levels=4, subdivision_type='SIMPLE')
    mod(sh, 'SIMPLE_DEFORM', deform_method='BEND', angle=math.radians(12), deform_axis='X')
    give(sh, image_mat(f'wanted_{who}', os.path.join(TEX, f'wanted-{who}.png'), 0.85))


for _w in ('luffy', 'zoro'):
    prop(f'wanted_{_w}')(lambda _w=_w: _wanted(_w))
