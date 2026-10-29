# A short's cuts with each shot's camera motion (footage/<source>/motion.json, scripts/motion.py): where two
# cuts in a row move against each other (a pan left into a pan right) the cut jars; where they move the same
# way, with the subject at the same spot, it matches (user, 2026-10-28). Also lists the shots of each motion.
# usage: python continuity.py <project> <framed cuts json from framed.mjs>
import json, sys
proj, cuts_file = sys.argv[1], sys.argv[2]
src = json.load(open(f'{proj}/shorts/footage.json'))['sources']
motion = {}
for s in src:
    try:
        for k, v in json.load(open(f"{proj}/{s['segregation']}/motion.json")).items():
            motion[s['prefix'] + k[2:]] = v
    except FileNotFoundError:
        pass
cuts = json.load(open(cuts_file))
arrow = {'pan-left': '←', 'pan-right': '→', 'tilt-up': '↑', 'tilt-down': '↓', 'push-in': '⊕', 'pull-out': '⊖', 'still': '·'}
opp = {('pan-left', 'pan-right'), ('pan-right', 'pan-left'), ('tilt-up', 'tilt-down'), ('tilt-down', 'tilt-up'), ('push-in', 'pull-out'), ('pull-out', 'push-in')}
prev = None
for c in cuts:
    m = motion.get(c['shot'])
    d = m['dir'] if m else '?'
    flag = ''
    if prev and m and prev in opp and False: pass
    if prev and m and (prev, d) in opp: flag = '  ✗ against the cut before'
    elif prev and m and prev == d and d != 'still': flag = '  ✓ continues'
    print(f"{c['n']:3d} {c['shot']}  {arrow.get(d, '?')} {d:9s} {('dx %+.2f dy %+.2f z %+.2f' % (m['dx'], m['dy'], m['zoom'])) if m else ''}{flag}")
    prev = d if m else None
by = {}
for k, v in motion.items(): by.setdefault(v['dir'], []).append((v['mag'] + abs(v['zoom']), k))
print()
for d, ks in sorted(by.items()):
    print(f"{arrow.get(d, '?')} {d:9s} {len(ks):3d}: " + ' '.join(k for _, k in sorted(ks, reverse=True)[:40]))
