#!/usr/bin/env python3
"""Headless stand-in for Present: turn a .figcraft prototype into a clickable HTML page.

FigCraft has no HTML/player export, so: export every top-level frame as PNG inside the run
(fonts loaded there), named after the frame (`/` -> `_`), then

    python3 proto_to_html.py file.figcraft screens_dir out.html [scale]

reads document.json from the .figcraft zip, places a hotspot over every layer with interactions
and plays click / key / after-delay triggers with navigate, back, open/close/swap overlay and
open link. Transitions are approximated (smart animate and dissolve = cross-fade, push/move/slide
= slide in from that side). `scale` is the PNG export scale (default 2)."""
import json, os, sys, zipfile

src, screens, out = sys.argv[1], sys.argv[2], sys.argv[3]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
doc = json.loads(zipfile.ZipFile(src).read("document.json"))
nodes = doc["nodes"]
page = next((nodes[str(p)] for p in doc["pages"] if nodes[str(p)].get("flows")), nodes[str(doc["pages"][0])])

def off(n):
    t = n.get("transform")
    return (t[4], t[5]) if t else (0.0, 0.0)

frames, hotspots = {}, []
def walk(nid, top, ox, oy):
    n = nodes[str(nid)]
    dx, dy = off(n)
    x, y = (0.0, 0.0) if nid == top else (ox + dx, oy + dy)
    if n.get("interactions"):
        hotspots.append({"frame": top, "x": x, "y": y, "w": n["width"], "h": n["height"],
                         "name": n["name"], "interactions": n["interactions"], "isFrame": nid == top})
    for c in n.get("children", []):
        walk(c, top, x, y)
for fid in page.get("children", []):
    f = nodes[str(fid)]
    if f["type"] in ("frame", "component", "instance"):
        img = os.path.join(screens, f["name"].replace("/", "_") + ".png")
        if os.path.exists(img):
            frames[fid] = {"name": f["name"], "w": f["width"], "h": f["height"],
                           "img": os.path.relpath(img, os.path.dirname(os.path.abspath(out)))}
            walk(fid, fid, 0, 0)
flows = page.get("flows") or []
start = flows[0]["start"] if flows else next(iter(frames))
data = {"frames": frames, "hotspots": hotspots, "start": start, "title": doc.get("name", "Prototype"),
        "bg": "#%02x%02x%02x" % tuple(int(page.get("prototype", {}).get("background", {}).get(k, 0.1) * 255) for k in "rgb")}

html = """<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%TITLE%</title><style>
html,body{margin:0;height:100%;background:%BG%;font-family:system-ui,sans-serif;overflow:hidden}
#stage{position:absolute;left:50%;top:50%;transform-origin:center}
.scr{position:absolute;left:0;top:0;background-size:100% 100%;transition:opacity .35s,transform .35s}
.hot{position:absolute;cursor:pointer}.hint .hot{outline:2px solid #4f8cff99;background:#4f8cff22}
#ov{position:absolute;inset:0;display:none}#ov .scr{position:absolute}
#bar{position:fixed;bottom:12px;left:12px;color:#aaa;font-size:12px}
</style></head><body><div id="stage"></div><div id="bar">Click to play · H shows hotspots · ← back</div>
<script>const P=%DATA%;let hist=[],cur=null,ov=null;const st=document.getElementById('stage');
function el(fid){const f=P.frames[fid];const d=document.createElement('div');d.className='scr';d.style.width=f.w+'px';d.style.height=f.h+'px';d.style.backgroundImage='url("'+encodeURI(f.img)+'")';
 for(const h of P.hotspots.filter(h=>h.frame==fid&&!h.isFrame)){const a=document.createElement('div');a.className='hot';Object.assign(a.style,{left:h.x+'px',top:h.y+'px',width:h.w+'px',height:h.h+'px'});a.title=h.name;
  a.onclick=e=>{e.stopPropagation();fire(h,'onClick')};d.appendChild(a)}return d}
function fit(f){const s=Math.min(innerWidth/(f.w+40),innerHeight/(f.h+40),1);st.style.width=f.w+'px';st.style.height=f.h+'px';st.style.transform='translate(-50%,-50%) scale('+s+')'}
function anim(d,t,inn){if(!t||t.type=='instant')return;const dir={left:[1,0],right:[-1,0],top:[0,1],bottom:[0,-1]}[t.direction]||[0,0];
 if(['push','moveIn','slideIn'].includes(t.type)&&inn){d.style.transition='none';d.style.transform=`translate(${dir[0]*100}%,${dir[1]*100}%)`;requestAnimationFrame(()=>requestAnimationFrame(()=>{d.style.transition='';d.style.transform=''}))}
 else if(inn){d.style.transition='none';d.style.opacity=0;requestAnimationFrame(()=>requestAnimationFrame(()=>{d.style.transition='';d.style.opacity=1}))}}
let timers=[];function show(fid,t,push=true){closeOv();if(cur!==null&&push)hist.push(cur);cur=fid;const f=P.frames[fid];fit(f);const d=el(fid);st.appendChild(d);anim(d,t,true);
 setTimeout(()=>{while(st.children.length>1)st.removeChild(st.firstChild)},400);timers.forEach(clearTimeout);timers=[];
 for(const h of P.hotspots.filter(h=>h.frame==fid))for(const i of h.interactions)if(i.trigger.type=='afterDelay')timers.push(setTimeout(()=>run(i),i.trigger.ms))}
function closeOv(){const o=document.getElementById('ov');if(o)o.remove();ov=null}
function openOv(a,t){closeOv();const f=P.frames[a.dest],c=P.frames[cur];const o=document.createElement('div');o.id='ov';o.style.display='block';
 if(a.background){const b=a.background;o.style.background=`rgba(${b.r*255},${b.g*255},${b.b*255},${b.a})`}
 const d=el(a.dest);const pos=a.position||'center';let x=(c.w-f.w)/2,y=(c.h-f.h)/2;if(pos.startsWith('bottom'))y=c.h-f.h;if(pos.startsWith('top'))y=0;if(pos.endsWith('Left'))x=0;if(pos.endsWith('Right'))x=c.w-f.w;
 d.style.left=x+'px';d.style.top=y+'px';o.appendChild(d);if(a.close_on_outside!==false)o.onclick=e=>{if(e.target===o)closeOv()};st.appendChild(o);anim(d,t,true);ov=a.dest}
function run(i){for(const a of i.actions){const t=i.transition;
 if(a.type=='navigate'&&P.frames[a.dest])show(a.dest,t);else if(a.type=='back'){if(ov!==null)closeOv();else if(hist.length)show(hist.pop(),t,false)}
 else if(a.type=='openOverlay'||a.type=='swapOverlay')openOv(a,t);else if(a.type=='closeOverlay')closeOv();else if(a.type=='openUrl')window.open(a.url,'_blank')}}
function fire(h,type){for(const i of h.interactions)if(i.trigger.type==type)run(i)}
addEventListener('keydown',e=>{if(e.key=='h'||e.key=='H')document.body.classList.toggle('hint');const fid=ov!==null?ov:cur;
 for(const h of P.hotspots.filter(h=>h.frame==fid||h.frame==cur))for(const i of h.interactions)if(i.trigger.type=='keyPress'&&i.trigger.key==e.key)run(i)});
addEventListener('resize',()=>fit(P.frames[cur]));show(P.start,null,false);</script></body></html>"""
html = html.replace("%TITLE%", data["title"]).replace("%BG%", data["bg"]).replace("%DATA%", json.dumps(data))
open(out, "w").write(html)
print(f"{len(frames)} screens, {len(hotspots)} hotspots, start {start} -> {out}")
