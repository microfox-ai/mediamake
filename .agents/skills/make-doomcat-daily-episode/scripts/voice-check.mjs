#!/usr/bin/env node
// voice-check: is this episode's take the show's voice, at the show's pace? Compares the episode's input/vo.mp3 (and
// its Scribe words) with the reference take (ep. 1: brands/doomcat/voice/M5-mandrake-scriptC-anchor.mp3, the voice the
// user approved): pitch (median and range), brightness (spectral centroid) and words a minute.
//   node ~/.claude/skills/make-doomcat-daily-episode/scripts/voice-check.mjs <slug> [--ref=<mp3>]
// More than ~10 % off in pace or pitch from the reference: re-voice (fewer slowing tags, or stability 1.0).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
if (!slug) { console.error('Usage: voice-check.mjs <slug> [--ref=<mp3>]'); process.exit(1); }
const home = os.homedir();
const expand = p => (p.startsWith('~') ? path.join(home, p.slice(1)) : p);
let ws = path.join(home, 'MediaMake');
try { const c = JSON.parse(fs.readFileSync(path.join(home, '.mediamake/config.json'), 'utf8')); if (c.workspace) ws = expand(c.workspace); } catch {}
const ref = expand(args.find(a => a.startsWith('--ref='))?.slice(6) ?? path.join(ws, 'brands/doomcat/voice/M5-mandrake-scriptC-anchor.mp3'));
const take = path.join(ws, 'projects', slug, 'input/vo.mp3');
const SR = 16000;
const pcm = f => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const pitch = f => {
  const a = pcm(f), n = 640, f0 = [];
  for (let i = 0; i + n < a.length; i += 640) {
    let e = 0; for (let j = i; j < i + n; j++) e += a[j] * a[j];
    if (e / n < 1e-4) continue;
    let best = 0, lag = 0;
    for (let L = Math.floor(SR / 300); L <= Math.floor(SR / 60); L++) {
      let s = 0, s1 = 0, s2 = 0;
      for (let j = i; j < i + n - L; j++) { s += a[j] * a[j + L]; s1 += a[j] * a[j]; s2 += a[j + L] * a[j + L]; }
      const r = s / Math.sqrt(s1 * s2 + 1e-12); if (r > best) { best = r; lag = L; }
    }
    if (best > 0.6) f0.push(SR / lag);
  }
  f0.sort((x, y) => x - y);
  return { med: f0[Math.floor(f0.length / 2)], p10: f0[Math.floor(f0.length * 0.1)], p90: f0[Math.floor(f0.length * 0.9)] };
};
const centroid = f => +execFileSync('sh', ['-c', `ffmpeg -nostats -i "${f}" -af aspectralstats=measure=centroid,ametadata=print:key=lavfi.aspectralstats.1.centroid:file=- -f null - 2>/dev/null | grep centroid | awk -F= '{s+=$2;n++} END {printf "%.0f", s/n}'`]).toString();
const wpm = (f, words) => {
  if (words) { const w = words.filter(x => (x.type ?? 'word') === 'word'); return (w.length / ((w[w.length - 1].end - w[0].start) / 60)); }
  return null;
};
const wordsOf = f => { for (const j of [f + '.scribe.json', path.join(path.dirname(f), 'vo.words.json')]) { try { const r = JSON.parse(fs.readFileSync(j, 'utf8')); return r.words ?? r; } catch {} } return null; };
const REF_WPM = 128; // ep. 1's take: 225 words in its 105.9 s cut
const row = (name, f, knownWpm) => {
  const p = pitch(f), c = centroid(f), w = knownWpm ?? wpm(f, wordsOf(f));
  return { name, med: p.med, p10: p.p10, p90: p.p90, c, w };
};
const r = row('reference (ep. 1)', ref, REF_WPM), t = row(slug, take);
for (const x of [r, t]) console.log(`${x.name.padEnd(28)} pitch ${x.med.toFixed(0)} Hz (${x.p10.toFixed(0)}–${x.p90.toFixed(0)}) · brightness ${x.c} Hz · ${x.w ? x.w.toFixed(0) + ' words a minute' : 'no words yet'}`);
const off = (a, b) => Math.abs(a - b) / b;
const notes = [];
if (off(t.med, r.med) > 0.1) notes.push(`pitch ${((t.med / r.med - 1) * 100).toFixed(0)} %`);
if (t.w && off(t.w, r.w) > 0.1) notes.push(`pace ${((t.w / r.w - 1) * 100).toFixed(0)} %`);
if (off(t.c, r.c) > 0.15) notes.push(`brightness ${((t.c / r.c - 1) * 100).toFixed(0)} %`);
console.log(notes.length ? `⚠ off the reference: ${notes.join(', ')} → re-voice (fewer slowing tags, or stability 1.0)` : '✔ the show\'s voice, at the show\'s pace');
