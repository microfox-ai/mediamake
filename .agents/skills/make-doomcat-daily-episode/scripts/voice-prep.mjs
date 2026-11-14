#!/usr/bin/env node
// voice-prep: turn the episode's voice-over into what the engine reads.
//   input/vo.words.json   every word with its start and end (from Scribe: `mm transcribe <…>/input/vo.mp3`)
//   input/vo-env.json     the voice's loudness, 100 values a second, 0…1 (his mouth, the beats' onsets)
//   input/vo-onsets.json  where each word after a pause really starts in the audio (beats land on these)
// and the manifest's audio length. With --cut it first removes stretches of the voice (30 ms fades at each join)
// and shifts the words to match, keeping the uncut take as input/vo.full.mp3.
//
//   node ~/.claude/skills/make-doomcat-daily-episode/scripts/voice-prep.mjs <slug> [--cut=103.55-112.25,…]
//        [--words=<scribe json>] [--out=<folder>]
//
// --words  Scribe's answer (default input/vo.mp3.scribe.json, or input/vo.full.mp3.scribe.json after a cut)
// --out    write the three files somewhere else (a check), not into the project
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = k => args.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [slug] = args.filter(a => !a.startsWith('--'));
if (!slug) {
  console.error('Usage: voice-prep.mjs <slug> [--cut=a-b,…] [--words=<scribe json>] [--out=<folder>]');
  process.exit(1);
}
const home = os.homedir();
const expand = p => (p.startsWith('~') ? path.join(home, p.slice(1)) : p);
const workspace = () => {
  if (process.env.MEDIAMAKE_WORKSPACE) return expand(process.env.MEDIAMAKE_WORKSPACE);
  try {
    const c = JSON.parse(fs.readFileSync(path.join(home, '.mediamake/config.json'), 'utf8'));
    if (c.workspace) return expand(c.workspace);
  } catch {}
  return path.join(home, 'MediaMake');
};
const project = path.join(workspace(), 'projects', slug);
const input = path.join(project, 'input');
const out = opt('out') ? path.resolve(expand(opt('out'))) : input;
fs.mkdirSync(out, { recursive: true });
const vo = path.join(input, 'vo.mp3');
const full = path.join(input, 'vo.full.mp3');
if (!fs.existsSync(vo) && !fs.existsSync(full)) { console.error(`No ${path.relative(workspace(), vo)}: make the voice first.`); process.exit(1); }
const r3 = x => Math.round(x * 1000) / 1000;
const probe = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();

// ---------------------------------------------------------------- an optional cut
const cuts = (opt('cut') ?? '').split(',').filter(Boolean).map(s => s.split('-').map(Number)).sort((a, b) => a[0] - b[0]);
for (const [a, b] of cuts) if (!(b > a)) { console.error(`--cut: "${a}-${b}" is not a stretch`); process.exit(1); }
if (cuts.length && out === input) {
  if (!fs.existsSync(full)) fs.renameSync(vo, full);
  const sj = path.join(input, 'vo.mp3.scribe.json');
  const fj = path.join(input, 'vo.full.mp3.scribe.json');
  if (fs.existsSync(sj) && !fs.existsSync(fj)) fs.renameSync(sj, fj);
  const dur = probe(full);
  const keep = [];
  let t = 0;
  for (const [a, b] of cuts) { if (a > t) keep.push([t, a]); t = Math.max(t, b); }
  if (t < dur) keep.push([t, dur]);
  const F = 0.03;
  const parts = keep.map(([a, b], i) =>
    `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS${i ? `,afade=t=in:st=0:d=${F}` : ''}${i < keep.length - 1 ? `,afade=t=out:st=${r3(b - a - F)}:d=${F}` : ''}[k${i}]`);
  const graph = `${parts.join(';')};${keep.map((_, i) => `[k${i}]`).join('')}concat=n=${keep.length}:v=0:a=1[o]`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', full, '-filter_complex', graph, '-map', '[o]', '-c:a', 'libmp3lame', '-b:a', '192k', vo]);
  console.log(`cut ${cuts.map(([a, b]) => `${a}–${b}`).join(', ')} s: ${r3(dur)} s → ${r3(probe(vo))} s (the take kept as input/vo.full.mp3)`);
}

// ---------------------------------------------------------------- the words
const wordsFile = opt('words') ? expand(opt('words'))
  : [path.join(input, 'vo.full.mp3.scribe.json'), path.join(input, 'vo.mp3.scribe.json')].find(f => fs.existsSync(f) && (cuts.length || !f.includes('vo.full') || !fs.existsSync(path.join(input, 'vo.mp3.scribe.json'))));
let words = [];
if (wordsFile && fs.existsSync(wordsFile)) {
  const raw = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));
  words = (raw.words ?? raw).filter(w => (w.type ?? 'word') === 'word' && String(w.text).trim())
    .map(w => ({ text: String(w.text).trim(), start: +w.start, end: +w.end }));
  // after a cut: drop the cut words, move the rest up
  const shift = t => cuts.reduce((s, [a, b]) => (t >= b ? s + (b - a) : s), 0);
  const inCut = t => cuts.some(([a, b]) => t >= a && t < b);
  words = words.filter(w => !inCut(w.start)).map(w => ({ text: w.text, start: r3(w.start - shift(w.start)), end: r3(w.end - shift(w.end)) }));
  fs.writeFileSync(path.join(out, 'vo.words.json'), JSON.stringify({ text: words.map(w => w.text).join(' '), words }, null, 1) + '\n');
} else {
  console.log(`⚠ no Scribe words (${wordsFile ?? 'input/vo.mp3.scribe.json'}): run \`mm transcribe ${path.relative(workspace(), vo).replace(/^/, '~/MediaMake/')}\` (free first run: the price), then this again`);
}

// ---------------------------------------------------------------- the envelope
const RATE = 100;
const SR = 16000;
const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', vo, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const a = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
const n = SR / RATE;
const db = [];
for (let i = 0; i + n <= a.length; i += n) {
  let s = 0;
  for (let j = i; j < i + n; j++) s += a[j] * a[j];
  db.push(10 * Math.log10(s / n + 1e-12));
}
const voiced = db.filter(x => x > -45).sort((x, y) => x - y);
const top = voiced.length ? voiced[Math.floor(voiced.length * 0.99)] : -10;
let level = 0;
const values = db.map(x => {
  const v = x < -45 ? 0 : Math.max(0, Math.min(1, 1 + (x - top) / 36));
  level = v > level ? v : level * 0.86 + v * 0.14; // instant up, ~60 ms down
  return r3(level);
});
fs.writeFileSync(path.join(out, 'vo-env.json'), JSON.stringify({ rate: RATE, source: `${slug}/input/vo.mp3`, values }) + '\n');

// ---------------------------------------------------------------- onsets after pauses
const at = t => values[Math.max(0, Math.min(values.length - 1, Math.round(t * RATE)))] ?? 0;
const onsets = [];
words.forEach((w, i) => {
  const gap = i ? w.start - words[i - 1].end : w.start;
  if (gap < 0.25) return;
  // the quiet before the word, then its rise (a word heard up to 0.8 s after the transcript's start still counts)
  const stop = w.start + 0.8;
  let t = Math.max(i ? words[i - 1].end : 0, w.start - 0.35);
  while (t < stop && at(t) >= 0.15) t += 1 / RATE;
  while (t < stop && at(t) < 0.25) t += 1 / RATE;
  onsets.push({ i, text: w.text, start: w.start, onset: r3(t < stop ? t : w.start) });
});
fs.writeFileSync(path.join(out, 'vo-onsets.json'), JSON.stringify(onsets, null, 1) + '\n');
const off = onsets.filter(o => Math.abs(o.onset - o.start) > 0.08);

const dur = probe(vo);
const manifest = path.join(project, 'manifest.json');
if (out === input && fs.existsSync(manifest)) {
  const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  m.audio = { ...m.audio, src: `${slug}/input/vo.mp3`, duration: +dur.toFixed(2) };
  fs.writeFileSync(manifest, JSON.stringify(m, null, 1) + '\n');
  // the 16:9 twin plays the same voice: its manifest's length too (ep. 2 v2: it stayed at the placeholder's 1 s)
  const twin = path.join(path.dirname(project), `${slug}-wide`, 'manifest.json');
  if (fs.existsSync(twin)) {
    const w = JSON.parse(fs.readFileSync(twin, 'utf8'));
    w.audio = { ...w.audio, src: `${slug}/input/vo.mp3`, duration: +dur.toFixed(2) };
    fs.writeFileSync(twin, JSON.stringify(w, null, 1) + '\n');
  }
}
const spoken = words.length ? words[words.length - 1].end - words[0].start : 0;
console.log(`voice ${r3(dur)} s · ${words.length} words${spoken ? ` · ${Math.round((words.length / spoken) * 60)} wpm` : ''} · envelope ${values.length} values`);
console.log(`${onsets.length} words after a pause; ${off.length} start more than 80 ms away from the transcript${off.length ? ':' : ''}`);
for (const o of off.slice(0, 20)) console.log(`  "${o.text}" transcript ${o.start} s → heard ${o.onset} s (${o.onset > o.start ? '+' : ''}${r3(o.onset - o.start)})`);
console.log(`✔ ${['vo.words.json', 'vo-env.json', 'vo-onsets.json'].map(f => path.join(path.relative(workspace(), out), f)).join(', ')}`);
