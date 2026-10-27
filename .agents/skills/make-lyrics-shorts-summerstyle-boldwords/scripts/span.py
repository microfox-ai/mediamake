# words between two beats as word@start-end (beats), with a | before each downbeat
import json, sys, bisect
s, b0, b1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
m = json.load(open(f'projects/{s}/manifest.json'))
bt = [b['t'] for b in m['beats']['list']]
def beat(t):
    i = max(0, min(len(bt) - 2, bisect.bisect_right(bt, t) - 1))
    return i + (t - bt[i]) / (bt[i + 1] - bt[i])
dbs = sorted(round(beat(t)) for t in m['beats'].get('downbeats') or [])
ws = [(beat(w['start']), beat(w['end']), w['text']) for l in m['lyrics'] for w in l['words']]
out, nd = [], [d for d in dbs if b0 <= d <= b1]
for a, z, t in ws:
    if b0 <= a <= b1:
        while nd and nd[0] <= a: out.append(f'|{nd.pop(0)}'); 
        out.append(f'{t}@{a:.1f}-{z:.1f}')
print(' '.join(out))
