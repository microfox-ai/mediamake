# Per project: each source's faces.json = its faces.auto.json overlaid with footage/faces.manual.json
# (prefixed ids, hand-marked); and footage/faces.json = all of them with prefixed ids (index.tsx imports it).
import sys, os, json
proj = sys.argv[1]
src = json.load(open(os.path.join(proj, 'shorts/footage.json')))['sources']
man_f = os.path.join(proj, 'footage/faces.manual.json')
manual = json.load(open(man_f))['shots'] if os.path.exists(man_f) else {}
merged = {}
for s in src:
    seg = os.path.join(proj, s['segregation'])
    auto_f = os.path.join(seg, 'faces.auto.json')
    auto = json.load(open(auto_f))['shots'] if os.path.exists(auto_f) else {}
    own = {}
    for k, v in auto.items():
        if v: own[k] = v
    for k, v in manual.items():
        if k.startswith(s['prefix']) and k[len(s['prefix']):].isdigit():
            kk = 'sh' + k[len(s['prefix']):]
            if v: own[kk] = v
            else: own.pop(kk, None)
    json.dump({'aspect': 16 / 9, 'shots': own}, open(os.path.join(seg, 'faces.json'), 'w'), indent=1)
    for k, v in own.items(): merged[s['prefix'] + k[2:]] = v
json.dump({'_': 'merged from footage/<source>/faces.auto.json (anime face cascade) and footage/faces.manual.json (by eye); ids carry the source prefix (shorts/footage.json)', 'aspect': 16 / 9, 'shots': merged}, open(os.path.join(proj, 'footage/faces.json'), 'w'), indent=1)
print(proj, len(merged), 'framed shots')
