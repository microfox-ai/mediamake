# set a short's window from beat indices (fractional ok): the loop seam sits at the same place in the bar at both ends
import json, sys
s, sid, b0, b1 = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
m = json.load(open(f'projects/{s}/manifest.json'))
bt = [b['t'] for b in m['beats']['list']]
t = lambda b: bt[int(b)] + (b - int(b)) * (bt[int(b) + 1] - bt[int(b)])
p = f'projects/{s}/shorts/{sid}/short.json'
sh = json.load(open(p)); sh['from'], sh['to'] = round(t(b0), 3), round(t(b1), 3)
json.dump(sh, open(p, 'w'), indent=1)
h = f'projects/{s}/shorts/history.json'; hd = json.load(open(h))
for x in hd['shorts']:
    if x['id'] == sid: x['from'], x['to'], x['fromBeat'], x['toBeat'] = sh['from'], sh['to'], round(b0), round(b1)
json.dump(hd, open(h, 'w'), indent=1)
print(s, sid, sh['from'], sh['to'], round(sh['to'] - sh['from'], 2), 's')
