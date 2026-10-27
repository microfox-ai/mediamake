# Fix "cut N (shot) runs X s past the shot's end" warnings: slow the cut just enough (rate) to fit.
# usage: fitrate.py <slug> <id> < clips-output
import sys, re, json
slug, sid = sys.argv[1], sys.argv[2]
P = f'projects/{slug}'
src = json.load(open(f'{P}/shorts/footage.json'))['sources']
dur = {}
for s in src:
    for sh in json.load(open(f"{P}/{s['segregation']}/segregation.json"))['shots']:
        dur[s['prefix'] + sh['id'][2:]] = sh['duration']
edl_p = f'{P}/shorts/{sid}/edl.ts'; t = open(edl_p).read()
cut_re = re.compile(r"cut\(([0-9.]+), '([a-z]{2}[0-9]{4})', \{([^\n]*?)\}\)")
cuts = list(cut_re.finditer(t))
fixes = {}
for line in sys.stdin:
    m = re.search(r"cut (\d+) \(([a-z]{2}\d{4})\) runs ([0-9.]+) s past", line)
    if m: fixes[int(m.group(1))] = (m.group(2), float(m.group(3)))
out, last = [], 0
for i, c in enumerate(cuts, 1):
    if i not in fixes: continue
    shot, over = fixes[i]
    opts = c.group(3)
    m_in = re.search(r"in: ([0-9.]+)", opts); cin = float(m_in.group(1)) if m_in else 0
    m_rate = re.search(r"rate: ([0-9.]+)", opts); r0 = float(m_rate.group(1)) if m_rate else 1
    avail = dur[shot] - cin - 0.03
    need = avail + over
    r = round(r0 * avail / need * 0.97, 2)
    flag = '  ✗ under half speed: pick another shot' if r < 0.5 else ''
    print(f"cut {i} {shot}: rate {r0} → {r}{flag}")
    if r < 0.5: r = 0.5
    new = re.sub(r"rate: [0-9.]+", f"rate: {r}", opts) if m_rate else f" rate: {r},{opts}"
    out.append((c.start(3), c.end(3), new))
for a, z, new in reversed(out): t = t[:a] + new + t[z:]
open(edl_p, 'w').write(t)
