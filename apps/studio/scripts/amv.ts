/**
 * amv: check and prepare a make-anime-music-video project's cut list (projects/<slug>/video/cut.ts).
 *
 * Usage: mm amv <slug> [--stills] [--matte] [--list]
 *
 *   always    resolves cut.ts, prints its warnings (gaps, overlaps, shots longer than their footage),
 *             writes video/shots.json (the Revisions shot map) and video/overlays.json (overlay lengths)
 *   --list    prints every shot: id, song time, source shot, rate, grade, transition, effects
 *   --stills  grabs the still frames pieces use into derived/stills/ (from the proxies)
 *   --matte   cuts the subject mattes the cut asks for (scripts/matte.py, BiRefNet) into derived/mattes/
 *   --audio=<file>  mixes the song and the cut's sound effects with ffmpeg (what the composition plays),
 *             for a chunked render: rendering audio through Remotion runs the whole composition again
 *   --captions  writes analysis/captions.json (every caption's text and time), which scripts/amv-space.py
 *             reads with the clean render to map the free space under each caption into video/space.json
 *
 * footage.json and timing.json (scripts/amv-index.py) must be up to date first.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [slug, ...flags] = process.argv.slice(2);
if (!slug) {
  console.error('Usage: mm amv <slug> [--stills] [--matte] [--list]');
  process.exit(1);
}
const dir = path.join(ROOT, 'projects', slug);
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const footage = read('video/footage.json');
const timing = read('video/timing.json');
// match cuts and cross-pack repeats (scripts/amv-match.py), when it has been run
const match = fs.existsSync(path.join(dir, 'video/match.json')) ? read('video/match.json') : undefined;
const space = fs.existsSync(path.join(dir, 'video/space.json')) ? read('video/space.json') : undefined;
const mod = await import(pathToFileURL(path.join(dir, 'video/cut.ts')).href);
const { cut, warnings, jobs } = mod.make(footage, timing, match, space);

const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
if (flags.includes('--list')) {
  for (const s of cut.shots) {
    console.log(
      `${s.id.padEnd(12)} ${fmt(s.from)}–${fmt(s.to)} ${(s.to - s.from).toFixed(2).padStart(5)}s  ${s.src}@${s.in.toFixed(2).padStart(7)}` +
        `  ${(s.grade ?? 'teal').padEnd(6)} ${(s.tin ?? 'cut').padEnd(7)} ${(s.fx ?? []).join(',')}${s.matte ? ' [matte]' : ''}${s.aura ? ' [aura]' : ''}${s.worlds ? ` [worlds ×${s.worlds.length}]` : ''}` +
        `${s.z !== undefined ? ` z${Number(s.z).toFixed(2)} @${Number(s.x ?? 0.5).toFixed(2)},${Number(s.y ?? 0.5).toFixed(2)}` : ''}  ${s.label ?? ''}`,
    );
  }
}
for (const w of warnings) console.log(`warn: ${w}`);

if (flags.includes('--captions')) {
  const caps = cut.words.map((w: { from: number; to: number; text: string; style: string }) => ({ from: w.from, to: w.to, text: w.text, style: w.style }));
  fs.mkdirSync(path.join(dir, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'analysis/captions.json'), JSON.stringify(caps, null, 1));
  console.log(`analysis/captions.json: ${caps.length} captions`);
}

// the shot map the Revisions screen reads
const shotsJson = cut.shots.map((s: { id: string; from: number; to: number; label?: string; lyric?: string; section?: string }) => ({
  id: s.id,
  from: Math.round(s.from * 1000) / 1000,
  to: Math.round(s.to * 1000) / 1000,
  label: s.label,
  lyric: s.lyric,
  section: s.section,
}));
fs.writeFileSync(path.join(dir, 'video/shots.json'), JSON.stringify(shotsJson, null, 1));

// overlay lengths, so long uses loop
const ovDir = path.join(dir, 'input/overlays');
const lengths: Record<string, number> = {};
for (const f of fs.existsSync(ovDir) ? fs.readdirSync(ovDir) : []) {
  if (!f.endsWith('.mp4')) continue;
  const d = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(ovDir, f)]).toString().trim();
  lengths[f.replace(/\.mp4$/, '')] = Number(d);
}
fs.writeFileSync(path.join(dir, 'video/overlays.json'), JSON.stringify(lengths, null, 1));
const missing = [...new Set(cut.overlays.map((o: { src: string }) => o.src))].filter(o => !(o as string in lengths));
if (missing.length) console.log(`warn: overlays not in input/overlays: ${missing.join(', ')}`);

if (flags.includes('--stills')) {
  fs.mkdirSync(path.join(dir, 'derived/stills'), { recursive: true });
  for (const j of jobs.stills) {
    const out = path.join(dir, `derived/stills/${j.id}.jpg`);
    if (fs.existsSync(out)) continue;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(j.t), '-i', path.join(dir, footage[j.src].proxy), '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', out]);
    console.log(`still ${j.id}`);
  }
}

if (flags.includes('--matte')) {
  const out = path.join(dir, 'derived/mattes');
  fs.mkdirSync(out, { recursive: true });
  const bySrc: Record<string, Record<string, [number, number]>> = {};
  for (const m of jobs.mattes) (bySrc[m.src] ??= {})[m.id] = [Math.round(m.from * 1000) / 1000, Math.round(m.to * 1000) / 1000];
  for (const [src, shots] of Object.entries(bySrc)) {
    const job = path.join(out, `.jobs-${src}.json`);
    // matte.py wants the crop (here the whole 2560×1440 proxy) as well as the output width
    fs.writeFileSync(job, JSON.stringify({ src: path.join(dir, footage[src].proxy), out, crop: [2560, 1440, 0, 0], width: 1920, shots }, null, 1));
    console.log(`matte ${src}: ${Object.keys(shots).join(', ')}`);
    const r = spawnSync('uv', ['run', '--script', path.join(ROOT, 'scripts/matte.py'), job], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}
const audioOut = flags.find(f => f.startsWith('--audio='))?.slice('--audio='.length);
if (audioOut) {
  const project = read('input/project.json');
  const inputs = ['-i', path.join(dir, 'input', project.audio)];
  const chains: string[] = [];
  cut.sfx.forEach((x: { at: number; src: string; volume?: number }, k: number) => {
    inputs.push('-i', path.join(dir, 'input/sfx', x.src));
    const ms = Math.max(0, Math.round(x.at * 1000));
    chains.push(`[${k + 1}:a]adelay=${ms}|${ms},volume=${x.volume ?? 0.35}[s${k}]`);
  });
  // the sound effects ride on a mastered song: one limiter keeps the peaks at -1 dBFS
  const mix = `${chains.join(';')}${chains.length ? ';' : ''}[0:a]${cut.sfx.map((_: unknown, k: number) => `[s${k}]`).join('')}amix=inputs=${cut.sfx.length + 1}:normalize=0:duration=first,alimiter=limit=0.891:level=0[out]`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', mix, '-map', '[out]', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', path.resolve(audioOut)]);
  console.log(`audio: song + ${cut.sfx.length} sfx → ${audioOut}`);
}
console.log(`${cut.shots.length} shots, ${cut.words.length} words, ${cut.overlays.length} overlays, ${cut.pieces.length} pieces, ${cut.sfx.length} sfx; ${warnings.length} warnings`);
