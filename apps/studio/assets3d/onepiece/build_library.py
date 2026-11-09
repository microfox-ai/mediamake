"""Builds every prop in props.py into the asset library onepiece_props.blend (each prop a collection
"OP <name>", marked as an asset so Blender's Asset Browser lists it) and renders a 3/4 preview of each
into previews/<name>.png plus previews/sheet.png.

Usage (headless; textures first):
  uv run --with pillow python assets3d/onepiece/textures.py
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P assets3d/onepiece/build_library.py [-- --samples 48 --only name,name]
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import props  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = {argv[i][2:]: argv[i + 1] for i in range(len(argv) - 1) if argv[i].startswith('--')}
SAMPLES = int(opt.get('samples', 48))
ONLY = set(opt['only'].split(',')) if 'only' in opt else None
PREV = os.path.join(HERE, 'previews')
os.makedirs(PREV, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
cp = bpy.context.preferences.addons['cycles'].preferences
cp.compute_device_type = 'METAL'
cp.get_devices()
for d in cp.devices:
    d.use = True
sc.cycles.device = 'GPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'
sc.render.resolution_x = sc.render.resolution_y = 640
world = bpy.data.worlds.new('w')
sc.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.47, 0.44, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.6

built = {}
for name, build in props.PROPS.items():
    if ONLY and name not in ONLY:
        continue
    c = build()
    c.use_fake_user = True
    c.asset_mark()
    c.asset_data.description = name
    c.asset_data.tags.new('one piece')
    built[name] = c
    print('built', name, len(c.all_objects), 'objects')


def world_matrix(ob):
    m = ob.matrix_basis.copy()
    p = ob.parent
    while p:
        m = p.matrix_basis @ m
        p = p.parent
    return m


def bounds(c):
    lo = Vector((1e9, 1e9, 1e9))
    hi = -lo
    for ob in c.all_objects:
        if ob.type != 'MESH':
            continue
        M = world_matrix(ob)
        # (vertices, not bound_box: that is only refreshed by a depsgraph update)
        for vert in ob.data.vertices:
            v = M @ vert.co
            lo = Vector(map(min, lo, v))
            hi = Vector(map(max, hi, v))
    return lo, hi


# a neutral table, a key light and a camera, then each prop in turn
bpy.ops.mesh.primitive_plane_add(size=6)
floor = bpy.context.active_object
fm = bpy.data.materials.new('floor')
fm.use_nodes = True
fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.32, 0.2, 0.12, 1)
fm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.5
floor.data.materials.append(fm)
key = bpy.data.objects.new('key', bpy.data.lights.new('key', 'AREA'))
sc.collection.objects.link(key)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 60

shots = []
for name, c in built.items():
    lo, hi = bounds(c)
    ctr = (lo + hi) / 2
    size = max((hi - lo).x, (hi - lo).y, (hi - lo).z, 0.02)
    inst = bpy.data.objects.new(f'inst {name}', None)
    inst.instance_type = 'COLLECTION'
    inst.instance_collection = c
    sc.collection.objects.link(inst)
    d = Vector((0.9, -1.1, 0.95)).normalized()
    cam.location = ctr + d * size * 2.0
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    key.location = ctr + Vector((-1.0, -0.6, 1.4)) * size * 2.5
    key.rotation_euler = (ctr - key.location).to_track_quat('-Z', 'Y').to_euler()
    key.data.size = size * 1.5
    key.data.energy = 60 * (size * 2.5) ** 2
    sc.render.filepath = os.path.join(PREV, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    shots.append(sc.render.filepath)
    bpy.data.objects.remove(inst)
    print('preview', name)

# keep the preview stage out of the library file
for ob in (floor, key, cam):
    bpy.data.objects.remove(ob)
out = os.path.join(HERE, 'onepiece_props.blend')
if not ONLY:
    bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
    print('saved', out)
