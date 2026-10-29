# Convert a short's cut list to the 2026-10-28 approach (cursedlove s01 v6): masks only on the opener, the dives
# and short lines that fill the frame (at most 4), every other line a lockup over the footage; twixtor beat
# effects on 60 fps footage, a slow push on the rest; runs of one camera move (crop pans / tilts) per screen pair,
# tilting up on rising lines and down on falling ones; nothing moving at the loop seam.
# usage: python rollout.py <project dir> <id> <screens.json>
import json, re, sys
proj, sid, screens_file = sys.argv[1], sys.argv[2], sys.argv[3]
screens = json.load(open(screens_file))
edl_p = f'{proj}/shorts/{sid}/edl.ts'; t = open(edl_p).read()
src = json.load(open(f'{proj}/shorts/footage.json'))['sources']
fps = {s['prefix']: json.load(open(f"{proj}/{s['segregation']}/segregation.json"))['video']['fps'] for s in src}
art = {s['prefix'] for s in src if s['id'].endswith('-art') or 'manga' in s['id']}

# --- screens: which stay masks
stacks = [s for s in screens if s['kind'] == 'stack']
def keep(s):
    if s['exit'] == 'through' or s['enter'] == 'into': return True
    return len(s['words']) <= 3 and (s['fill'] or 0) >= 0.75 and not s['columns']
masks = [s['index'] for s in stacks if keep(s)]
# at most 4: the dives and the opener first, then the best-filling short lines
pri = sorted(masks, key=lambda i: (0 if next(x for x in stacks if x['index'] == i)['exit'] == 'through' else 1 if next(x for x in stacks if x['index'] == i)['enter'] == 'into' else 2, -(next(x for x in stacks if x['index'] == i)['fill'] or 0)))
masks = set(pri[:4])

# the screens array: one entry per line, in order
m = re.search(r"\n  screens: \[\n(.*?)\n  \],", t, re.S)
body = m.group(1)
lines = body.split('\n')
entries = [k for k, l in enumerate(lines) if re.match(r"\s*(stack|full|cap)\(", l)]
assert len(entries) == len(screens), (len(entries), len(screens))
for k, s in zip(entries, screens):
    l = lines[k]
    if s['kind'] != 'stack' or s['index'] in masks: continue
    if "reverse: { flip" in l: continue  # one held word as black words over the whole shot: keep
    fa = re.match(r"(\s*)stack\((\[[^\]]*\]|'[^']*'|\"[^\"]*\")", l)
    if not fa: continue
    ind, find = fa.group(1), fa.group(2)
    opts = []
    for key in ('at', 'end'):
        mm = re.search(rf"\b{key}: ([0-9.]+)", l)
        if mm: opts.append(f"{key}: {mm.group(1)}")
    col = re.search(r"color: ([A-Z_]+|'#[0-9A-Fa-f]{6}')", l)
    if col: opts.append(f"color: {col.group(1)}")
    comment = l[l.index('//'):] if '//' in l else ''
    lines[k] = f"{ind}cap({find}{', { ' + ', '.join(opts) + ' }' if opts else ''}),{(' ' + comment) if comment else ''}"
t = t[:m.start(1)] + '\n'.join(lines) + t[m.end(1):]
t = t.replace("import { cut, full, stack, type LyricShortEdl }", "import { cap, cut, full, stack, type LyricShortEdl }")

# --- cuts: camera runs and twixtor effects
UP = {'rise', 'risen', 'above', 'sky', 'heaven', 'fly', 'up', 'light', 'glow', 'high', 'back', 'resurrected', 'divine', 'god', 'grace'}
DOWN = {'fall', 'fell', 'down', 'grave', 'graveyard', 'bury', 'drown', 'drowning', 'sink', 'dead', 'death', 'floor', 'floors', 'bowing', 'kneel', 'blood', 'wilts', 'bone'}
def screen_at(b):
    for s in screens:
        if s['start'] - 0.01 <= b < s['end'] - 0.01: return s
    return None
order = [s['index'] for s in screens if s['kind'] != 'full']
cut_re = re.compile(r"cut\(([0-9.]+), '([a-z]{2})([0-9]{4})', \{([^\n]*?)\}\)")
cuts = list(cut_re.finditer(t))
out = []
for n, c in enumerate(cuts):
    at, pre, num, opts = float(c.group(1)), c.group(2), c.group(3), c.group(4)
    if re.search(r"\b(pan|tilt|ramp|bump|push):", opts): continue
    s = screen_at(at)
    fx = []
    seam = n == 0 or n == len(cuts) - 1
    if not seam:
        words = {w.lower().strip(".,!?'") for w in (s['words'] if s else [])}
        if words & UP: fx.append('tilt: -0.06')
        elif words & DOWN: fx.append('tilt: 0.05')
        else:
            k = order.index(s['index']) if s and s['index'] in order else 0
            fx.append('pan: 0.05' if (k // 2) % 2 == 0 else 'pan: -0.05')
    if pre in art or fps.get(pre, 30) < 50:
        if not seam or n == 0: fx.append('push: 0.06')
    else:
        hard = re.search(r"slash|velocity|shake", opts)
        if s and s['kind'] == 'stack': fx.append('bump: 0.05')
        else: fx.append('ramp: 0.6, bump: 0.05' if hard else 'ramp: 0.5, bump: 0.04')
    out.append((c.start(4), c.end(4), ', '.join(fx + ([opts.strip()] if opts.strip() else []))))
for a, z, new in reversed(out):
    t = t[:a] + ' ' + new + ' ' + t[z:]
t = re.sub(r"\{  ", "{ ", t)
t = re.sub(r"  \}\)", " })", t)
note = """  // 2026-10-28 (user, on cursedlove s01): masks only on the punch lines, the rest as lockups over the footage;
  // no wide black bands; twixtor on the beat; runs of one camera move across the cuts (rollout of s01 v6)
"""
t = t.replace("export const edl: LyricShortEdl = {\n", "export const edl: LyricShortEdl = {\n" + note, 1)
open(edl_p, 'w').write(t)
print(f"{proj.split('/')[-1]}/{sid}: masks {len(masks)} of {len(stacks)} stacks; fx on {len(out)} of {len(cuts)} cuts")
