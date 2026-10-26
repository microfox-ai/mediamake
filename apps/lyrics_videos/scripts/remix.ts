/**
 * remix: get a music-remix project (make-video-music-remix skill) ready to render.
 *
 *   1. video/footage.json   the footage's shots from its segregation, as { id: [start, end] }
 *   2. derived/plate.mp4    the footage cropped to its picture (remix.json `crop`), scaled to the
 *                           window, short GOP (derived/plate-lo.mp4 at half size)
 *   3. video/anchors.json   the subject's centre/area/box per source frame, from the matte stats
 *   4. resolves video/edl.ts against the manifest: prints every cut with its transition, warns about
 *      cuts that run past their shot, prints each block's rhythm (cuts per beat, how many one-beat
 *      cuts, how often the length changes) and every shot used twice (⚠ when the same source frames
 *      show twice), writes video/shots.json (the review map); --unused lists the shots not used yet;
 *      --animatic draws out/<slug>/animatic/<block>.jpg: the middle frame of every cut, to read the story
 *   5. derived/shotmattes/jobs.json: one subject cutout per footage shot the edit uses;
 *      --matte runs scripts/matte.py on the shots that have none yet (~0.3–1 s a frame)
 *   6. derived/slow/<shot>.mp4: every shot a slow() cut plays, motion-interpolated to 60 fps
 *      (minterpolate) from its real frames (a "60 fps" upload of a film repeats its 24 frames 3-2,
 *      so the unique frames are picked first); slowed cuts play from it, without judder
 *
 * projects/<slug>/video/remix.json:
 *   { "sources": [{ "id": "f1", "prefix": "sh", "source": "input/<footage>.mp4",
 *                   "segregation": "footage/segregation.json", "crop": [w, h, x, y], "matteFps": 24 },
 *                 { "id": "lm", "prefix": "lm", ... }],
 *     "window": [1920, 804], "logo": "input/<logo>" }
 *   (the old single-source form { source, segregation, crop, window } still works)
 *
 * Usage: npm run remix -w lyrics_videos -- <slug> [--matte] [--only=sh0010,sh0030] [--force] [--unused] [--animatic]
 *
 * --short=<id> (make-video-music-remix-shorts): resolve shorts/<id>/edl.ts instead and check only its
 * window (short.json): its cuts, rhythm, repeats and mattes; shots.json and the animatic go with the
 * short (shorts/<id>/shots.json, out/<slug>/shorts/<id>/animatic/). Shared media (plates, mattes, slow
 * clips, footage.json) stay the project's.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveAll, sourceTime, type Footage } from '../src/remix/resolve.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
if (!slug) throw new Error('usage: npm run remix -w lyrics_videos -- <slug> [--matte]');
const flag = (n: string) => args.some(a => a === `--${n}`);
const opt = (n: string) => args.find(a => a.startsWith(`--${n}=`))?.split('=')[1];

const dir = path.join(ROOT, 'projects', slug);
type SourceCfg = { id: string; prefix: string; source: string; segregation: string; crop: [number, number, number, number]; matteFps?: number; plate?: string };
const raw = JSON.parse(fs.readFileSync(path.join(dir, 'video/remix.json'), 'utf8'));
// a single-source remix.json ({ source, segregation, crop }) is the first source with prefix "sh"
const cfg = (raw.sources ? raw : { ...raw, sources: [{ id: 'main', prefix: 'sh', source: raw.source, segregation: raw.segregation, crop: raw.crop }] }) as {
  sources: SourceCfg[];
  window: [number, number];
  logo?: string;
};
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const derived = path.join(dir, 'derived');
const matteDir = path.join(derived, 'shotmattes');
fs.mkdirSync(matteDir, { recursive: true });

// 1. footage table: every source's shots, ids re-prefixed per source (sh0012 → lm0012)
const footage: Footage = { sources: {}, shots: {} };
for (const [k, sc] of cfg.sources.entries()) {
  const seg = JSON.parse(fs.readFileSync(path.join(dir, sc.segregation), 'utf8'));
  const plate = sc.plate ?? (k === 0 ? 'plate.mp4' : `plate-${sc.id}.mp4`);
  footage.sources[sc.id] = { fps: Math.min(30, seg.video.fps), matteFps: sc.matteFps ?? Math.min(30, Math.round(seg.video.fps)), duration: seg.frames / seg.video.fps, plate: `derived/${plate}` };
  for (const sh of seg.shots) footage.shots[sc.prefix + sh.id.slice(2)] = [sh.start, sh.end, sc.id];

  // 2. the plate: the source cropped to its picture, at the window size, short GOP
  const src = path.join(dir, sc.source);
  const out = path.join(derived, plate);
  if (flag('force') || !fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) {
    const [cw, ch, cx, cy] = sc.crop;
    const [w, h] = cfg.window;
    console.log(`plate ${plate} ${w}×${h} ...`);
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-i', src, '-an',
      // high-fps sources go down to 30 fps: the compositions run at 30, more only weighs
      '-vf', `crop=${cw}:${ch}:${cx}:${cy}${w === cw && h === ch ? '' : `,scale=${w}:${h}:flags=lanczos${w > cw ? ',unsharp=5:5:0.4' : ''}`}${seg.video.fps > 30.5 ? ',fps=30' : ''}`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
      '-g', '12', '-keyint_min', '12', '-movflags', '+faststart', out,
    ], { stdio: 'inherit' });
  }
}
// slow-motion clips made for this edit or a short stay listed (step 6 adds new ones)
const prevFootage = path.join(dir, 'video/footage.json');
const prevSlow: Record<string, string> = fs.existsSync(prevFootage) ? JSON.parse(fs.readFileSync(prevFootage, 'utf8')).slow ?? {} : {};
const keptSlow = Object.fromEntries(Object.entries(prevSlow).filter(([id, rel]) => footage.shots[id] && fs.existsSync(path.join(dir, rel))));
if (Object.keys(keptSlow).length) footage.slow = keptSlow;
fs.writeFileSync(path.join(dir, 'video/footage.json'), JSON.stringify(footage));

// the title card's logo → white on transparent: its own alpha when it has one, else its dark marks
if (cfg.logo) {
  const out = path.join(derived, 'logo.png');
  const src = path.join(dir, cfg.logo);
  if (flag('force') || !fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) {
    const pix = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=pix_fmt', '-of', 'csv=p=0', src]).toString().trim();
    const alpha = /a/.test(pix.replace('gray', ''));
    const graph = alpha
      ? '[0]format=rgba,geq=r=255:g=255:b=255:a=alpha(X\\,Y)'
      : '[0]format=gray,negate,format=gray[a];[0]format=rgba,geq=r=255:g=255:b=255:a=255[c];[c][a]alphamerge';
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-filter_complex', graph, out]);
    console.log(`logo derived/logo.png (${alpha ? 'its alpha' : 'dark marks'})`);
  }
}

// 3. anchors: the subject per matte frame, from the matte stats
const anchors: Record<string, number[][]> = {};
for (const f of fs.readdirSync(matteDir)) {
  if (f.endsWith('.stats.json')) anchors[f.replace('.stats.json', '')] = JSON.parse(fs.readFileSync(path.join(matteDir, f), 'utf8'));
}
fs.writeFileSync(path.join(dir, 'video/anchors.json'), JSON.stringify(anchors));

// 4. resolve (a short: its own cut list, checked over its window only)
const shortId = opt('short');
const short: { from: number; to: number; formats: string[] } | null = shortId ? JSON.parse(fs.readFileSync(path.join(dir, 'shorts', shortId, 'short.json'), 'utf8')) : null;
const edl = await import(pathToFileURL(path.join(dir, shortId ? `shorts/${shortId}/edl.ts` : 'video/edl.ts')).href);
const all = resolveAll(manifest, footage, edl.blocks, edl.words, edl.sfx ?? [], new Set(Object.keys(anchors)));
const inWindow = (x: { from: number; to: number }) => !short || (x.to > short.from + 1e-3 && x.from < short.to - 1e-3);
const cuts = all.cuts.filter(inWindow);
const text = all.text.filter(inWindow);
const sfx = all.sfx.filter(s => !short || (s.at > short.from - 3 && s.at < short.to));
if (short) {
  // a vertical frame filled by the wide picture blows it up: soft past ~1.5×
  const sizes: Record<string, number> = { '9x16': 1920, '3x4': 1440, '4x5': 1350 };
  const zoom = short.formats.map(f => `${f} ×${(sizes[f] / cfg.window[1]).toFixed(1)}`).join(', ');
  console.log(`short ${shortId}: ${short.from.toFixed(2)}–${short.to.toFixed(2)} s · a full-frame reframe enlarges the ${cfg.window[0]}×${cfg.window[1]} picture ${zoom}${short.formats.some(f => sizes[f] / cfg.window[1] > 1.5) ? ' (soft: band() and stacked splits stay sharp)' : ''}\n`);
}
const sectionAt = (t: number) => manifest.sections.find((s: any) => t >= s.from - 1e-6 && t < s.to)?.label;
const beatLen = (t: number) => {
  const bt = manifest.beats.list as { t: number }[];
  const i = Math.max(0, bt.findIndex(b => b.t > t) - 1);
  return (bt[Math.min(i + 1, bt.length - 1)].t - bt[i].t) || 0.6;
};
const fmt = (t: number) => t.toFixed(2).padStart(7);
for (const c of cuts) {
  const fx = c.fx.map(f => f.k).join(' ');
  const tag = c.gfx ? 'gfx' : c.matte ? '◐' : '·';
  console.log(`${c.id.padEnd(6)} ${fmt(c.from)} ${fmt(c.to)}  ${c.src.padEnd(7)} ${tag} ${c.tin.padEnd(6)} ${fx}${c.rate !== 1 ? ` ×${c.rate.toFixed(2)}` : ''}${c.warn ? `   ⚠ ${c.warn}` : ''}`);
}
for (const w of text.filter(t => t.to <= t.from)) console.log(`⚠ text "${w.cue.text}" has no time on screen (${w.from.toFixed(2)})`);
// a split panel plays its take from where it lands and holds the last frame (often a fade or black) when
// the take is shorter: flag the ones holding more than half a beat
for (const c of cuts.filter(x => x.panels)) {
  c.panels!.forEach((p, k) => {
    const at = c.from + (c.panelAt?.[k] ?? (k / c.panels!.length) * (c.to - c.from));
    const over = c.to - at - (p.srcOut - p.srcIn);
    const len = beatLen(c.from);
    if (over > len / 2) console.log(`⚠ ${c.id} panel ${k + 1} (${p.src}) holds its last frame ${(over / len).toFixed(1)} beats: a longer take, or land it later`);
  });
}
for (const s of sfx) if (!fs.existsSync(path.join(derived, 'sfx', `${s.file}.wav`))) console.log(`⚠ sfx ${s.file}.wav missing in derived/sfx/`);
const used = [...new Set(cuts.flatMap(c => (c.panels ? c.panels.map(p => p.src) : c.gfx ? [] : [c.src])))];
const missing = used.filter(id => !anchors[id]);
const lens = cuts.map(c => c.to - c.from);

// rhythm per block: a steady pulse reads better than chasing every line (one-beat cuts, few length changes)
console.log('\nrhythm  block  cuts/beats  1-beat  <1-beat  length changes');
for (const b of edl.blocks as { id: string; cuts: { b: number | 'end' }[] }[]) {
  if (short && !cuts.some(c => c.id.split('.')[0] === b.id)) continue;
  const ls = b.cuts.map(c => c.b).filter((x): x is number => x !== 'end');
  if (!ls.length) continue;
  const beats = ls.reduce((a, x) => a + x, 0);
  const changes = ls.slice(1).filter((x, k) => x !== ls[k]).length;
  console.log(`        ${b.id.padEnd(6)} ${String(ls.length).padStart(4)}/${String(beats).padEnd(6)} ${String(ls.filter(x => x === 1).length).padStart(6)}  ${String(ls.filter(x => x < 1).length).padStart(7)}  ${String(changes).padStart(6)}`);
}

// shots used twice: fine for other moments of a long take, a fault when the same frames show again
const spans: Record<string, { id: string; a: number; b: number }[]> = {};
for (const c of cuts) {
  if (c.panels) for (const p of c.panels) (spans[p.src] ??= []).push({ id: c.id, a: p.srcIn, b: p.srcIn + (c.to - c.from) });
  else if (!c.gfx) {
    const end = sourceTime(c, c.to - c.from); // before srcIn when the cut rewinds (rev)
    (spans[c.src] ??= []).push({ id: c.id, a: Math.min(c.srcIn, end), b: Math.max(c.srcIn, end) });
  }
}
const twice = Object.entries(spans).filter(([, v]) => v.length > 1);
if (twice.length) {
  console.log('\nshots used more than once:');
  for (const [shot, v] of twice) {
    const clash = v.some((x, k) => v.some((y, j) => j > k && x.a < y.b - 0.04 && y.a < x.b - 0.04));
    console.log(`  ${clash ? '⚠' : ' '} ${shot}  ${v.map(x => `${x.id} ${x.a.toFixed(2)}–${x.b.toFixed(2)}`).join('  ')}${clash ? '  (same frames twice)' : ''}`);
  }
}
if (flag('unused')) {
  const taken = new Set(Object.keys(spans));
  console.log('\nunused shots (≥ 0.3 s):');
  for (const id of Object.keys(footage.sources)) {
    const free = Object.entries(footage.shots).filter(([k, [a, b, src]]) => src === id && !taken.has(k) && b - a >= 0.3);
    console.log(`  ${id}: ${free.map(([k, [a, b]]) => `${k}:${(b - a).toFixed(2)}`).join(' ')}`);
  }
}

console.log(`\n${cuts.length} cuts (median ${lens.sort((a, b) => a - b)[lens.length >> 1].toFixed(2)}s) · ${text.length} text cues · ${sfx.length} sfx · ${used.length} shots, ${missing.length} without a matte yet`);

// the animatic: one frame from the middle of every cut, a sheet per block, to read the story before a render
if (flag('animatic')) {
  const out = path.join(ROOT, 'out', slug, ...(shortId ? ['shorts', shortId] : []), 'animatic');
  fs.mkdirSync(path.join(out, 'f'), { recursive: true });
  const [tw, th] = [320, Math.round((320 * cfg.window[1]) / cfg.window[0])];
  const byBlock: Record<string, string[]> = {};
  for (const c of cuts) {
    const f = path.join(out, 'f', `${c.id}.jpg`);
    const label = `drawtext=text='${c.id} ${(c.to - c.from).toFixed(2)}':x=4:y=4:fontsize=13:fontcolor=yellow:box=1:boxcolor=black@0.6`;
    if (c.gfx || c.panels) execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=0x202020:s=${tw}x${th}`, '-frames:v', '1', '-vf', label, '-update', '1', f]);
    else {
      const sc = cfg.sources.find(x => x.id === c.source)!;
      const [cw, ch, cx, cy] = sc.crop;
      const mono = c.fx.some(x => x.k === 'mono') ? ',hue=s=0' : '';
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', sourceTime(c, (c.to - c.from) / 2).toFixed(3), '-i', path.join(dir, sc.source), '-frames:v', '1',
        '-vf', `crop=${cw}:${ch}:${cx}:${cy},scale=${tw}:${th}${mono},${label}`, '-update', '1', f]);
    }
    (byBlock[c.id.split('.')[0]] ??= []).push(f);
  }
  for (const [b, files] of Object.entries(byBlock)) {
    const cols = 8;
    const n = Math.ceil(files.length / cols) * cols;
    const inputs = files.flatMap(f => ['-i', f]);
    for (let k = files.length; k < n; k++) inputs.push('-f', 'lavfi', '-i', `color=c=black:s=${tw}x${th}`);
    const layout = Array.from({ length: n }, (_, k) => `${(k % cols) * tw}_${Math.floor(k / cols) * th}`).join('|');
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${Array.from({ length: n }, (_, k) => `[${k}]`).join('')}xstack=inputs=${n}:layout=${layout}`, '-frames:v', '1', '-update', '1', path.join(out, `${b}.jpg`)]);
  }
  console.log(`✔ ${path.relative(ROOT, out)}/<block>.jpg (${Object.keys(byBlock).length} sheets)`);
}

fs.writeFileSync(
  path.join(dir, shortId ? `shorts/${shortId}/shots.json` : 'video/shots.json'),
  JSON.stringify(
    cuts.map(c => ({
      id: c.id,
      from: +c.from.toFixed(3),
      to: +c.to.toFixed(3),
      label: `${c.src} ${c.tin}${c.fx.length ? ' ' + c.fx.map(f => f.k).join('+') : ''}`,
      lyric: text.filter(t => t.from < c.to && t.to > c.from).map(t => t.words.map(w => w.text).join(' ')).join(' / ') || undefined,
      section: sectionAt(c.from),
    })),
    null,
    1,
  ),
);

// 6. slow motion clips (the footage table gets them as footage.slow)
const slowShots = [...new Set(cuts.filter(c => !c.gfx && c.rate < 1).map(c => c.src))];
if (slowShots.length) {
  fs.mkdirSync(path.join(derived, 'slow'), { recursive: true });
  footage.slow = { ...footage.slow };
  for (const id of slowShots) {
    const [s0, s1, sid] = footage.shots[id];
    const sc = cfg.sources.find(x => x.id === sid)!;
    const rel = `derived/slow/${id}.mp4`;
    footage.slow[id] = rel;
    const out = path.join(dir, rel);
    if (!flag('force') && fs.existsSync(out)) continue;
    const [cw, ch, cx, cy] = sc.crop;
    const [w, h] = cfg.window;
    console.log(`slow ${id} (${(s1 - s0).toFixed(2)} s) → 60 fps ...`);
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-ss', `${s0}`, '-t', `${s1 - s0 + 0.1}`, '-i', path.join(dir, sc.source), '-an',
      '-vf', [
        `crop=${cw}:${ch}:${cx}:${cy}`, ...(w === cw && h === ch ? [] : [`scale=${w}:${h}:flags=lanczos${w > cw ? ',unsharp=5:5:0.4' : ''}`]),
        'mpdecimate=max=2', 'fps=24', 'minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1',
      ].join(','),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '12', out,
    ], { stdio: 'inherit' });
  }
  fs.writeFileSync(path.join(dir, 'video/footage.json'), JSON.stringify(footage));
}

// 5. matte jobs: per source, every footage shot the edit uses (plus any already queued), whole shots
const jobFiles: string[] = [];
for (const [k, sc] of cfg.sources.entries()) {
  const jobFile = path.join(matteDir, k === 0 ? 'jobs.json' : `jobs-${sc.id}.json`);
  const prev = fs.existsSync(jobFile) ? JSON.parse(fs.readFileSync(jobFile, 'utf8')).shots : {};
  const jobs: Record<string, [number, number]> = { ...prev };
  for (const id of used) if (footage.shots[id][2] === sc.id) jobs[id] = [footage.shots[id][0], footage.shots[id][1]];
  fs.writeFileSync(jobFile, JSON.stringify({ src: path.join(dir, sc.source), out: matteDir, crop: sc.crop, width: cfg.window[0], fps: `${footage.sources[sc.id].matteFps}`, shots: jobs }, null, 1));
  jobFiles.push(jobFile);
}
console.log(`✔ video/footage.json, video/anchors.json, ${shortId ? `shorts/${shortId}` : 'video'}/shots.json, derived/shotmattes/jobs*.json`);

if (flag('matte')) {
  const only = opt('only') ?? (missing.length ? missing.join(',') : undefined);
  if (only) {
    for (const jobFile of jobFiles) {
      const r = spawnSync('uv', ['run', '-q', '--script', path.join(ROOT, 'scripts/matte.py'), jobFile, '--only', only], { stdio: 'inherit' });
      if (r.status) process.exit(r.status);
    }
  }
}
