"""Cut picked voice reads into the episode's chunks and add them to its voice list.

usage: python cut_reads.py <project dir> <plan.json>

plan.json is a list of chunks: {"id", "src" (a take under input/, e.g. "vo-r4/ritual.mp3"), "from", "to"
(seconds, cut at the take's silences), "text"}. Each chunk gets the light chain every voice piece in
ep. 1 has (high-pass 80 Hz, gentle 2:1 compression, -16 LUFS measured on the spoken part, a limiter at
-1 dB, 5 ms / 40 ms fades), is written to input/<dir of src>/cut/<id>.wav (48 kHz mono), and replaces
or joins its entry in input/vo4/vo.json (the list video/timeline.ts reads; pass --list= for another).
"""
import json
import os
import re
import subprocess
import sys
import tempfile

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
if len(args) != 2:
    sys.exit(__doc__)
project, plan_path = args
listing = os.path.join(project, 'input', opts.get('list', 'vo4/vo.json'))
plan = json.load(open(plan_path))
run = lambda *a: subprocess.run(a, capture_output=True, text=True)
chain = 'highpass=f=80,acompressor=threshold=0.1:ratio=2:attack=5:release=100'
tmp = tempfile.mkdtemp(prefix='cwc-cut-')
out = []
for c in plan:
    src = os.path.join(project, 'input', c['src'])
    cut_dir = os.path.join(os.path.dirname(src), 'cut')
    os.makedirs(cut_dir, exist_ok=True)
    wav = os.path.join(tmp, c['id'] + '.wav')
    run('ffmpeg', '-v', 'error', '-y', '-i', src, '-af', chain, '-ar', '48000', wav)
    a, b = float(c['from']), float(c['to'])
    seg = run('ffmpeg', '-hide_banner', '-i', wav, '-af', f'atrim={a}:{b},ebur128', '-f', 'null', '-').stderr
    gain = -16.0 - float(re.findall(r'I:\s+(-?[\d.]+) LUFS', seg)[-1])
    d = b - a
    af = (f'atrim={a}:{b},asetpts=PTS-STARTPTS,volume={gain:.2f}dB,alimiter=limit=0.89:level=false,'
          f'afade=t=in:d=0.005,afade=t=out:st={d - 0.04:.3f}:d=0.04')
    dst = os.path.join(cut_dir, c['id'] + '.wav')
    r = run('ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', af, '-ac', '1', '-ar', '48000', dst)
    if r.returncode:
        sys.exit(r.stderr)
    dur = float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst).stdout)
    rel = os.path.relpath(dst, os.path.join(project, 'input'))
    out.append({'id': c['id'], 'file': rel, 'text': c['text'], 'duration': round(dur, 3), 'from': c['src'], 'at': [a, b]})
    print(f"{c['id']:12s} {dur:6.2f}s  gain {gain:+.1f} dB  {rel}")
have = json.load(open(listing)) if os.path.exists(listing) else []
ids = {o['id'] for o in out}
json.dump([x for x in have if x['id'] not in ids] + out, open(listing, 'w'), indent=1, ensure_ascii=False)
print(f'{listing}: {len(have) - len([x for x in have if x["id"] in ids]) + len(out)} chunks')
