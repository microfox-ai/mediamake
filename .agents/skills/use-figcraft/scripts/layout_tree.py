"""Print a Figcraft file's layer tree with its auto layout, sizing, constraints and component links.

    figcraft-cli convert file.figcraft file.json
    python3 layout_tree.py file.json <root node id> [max depth]

Root ids: `figcraft-cli info file.figcraft` lists the top-level frames with theirs."""
import json,sys
d=json.load(open(sys.argv[1]));n=d['nodes']
root=sys.argv[2]; maxd=int(sys.argv[3]) if len(sys.argv)>3 else 99
def desc(x):
    s=f"{x['type']} \"{x.get('name','')}\" {x.get('width',0):.0f}x{x.get('height',0):.0f}"
    L=x.get('layout')
    if L and L.get('mode') not in (None,'none'):
        s+=f" AL[{L['mode']} gap{L['gap']:.0f} pad{[int(p) for p in L['padding']]} main={L['main_align']} cross={L['cross_align']}{' wrap' if L.get('wrap') else ''}]"
    cl=x.get('child_layout')
    if cl: s+=f" child{ {k:v for k,v in cl.items() if v not in (None,False)} }"
    if x.get('constraints'): s+=f" cons{x['constraints']['horizontal']}/{x['constraints']['vertical']}"
    if x.get('type')=='text': s+=f" «{x.get('text',x.get('characters',''))[:30] if isinstance(x.get('text',''),str) else ''}»"
    if x.get('corner_radius'): s+=f" r{x['corner_radius']}"
    if x.get('component_id') or x.get('main'): s+=f" inst->{x.get('component_id',x.get('main'))}"
    return s
def walk(i,dep):
    x=n[str(i)]; print('  '*dep+f"{i} "+desc(x))
    if dep<maxd:
        for c in x.get('children',[]): walk(c,dep+1)
walk(root,0)
