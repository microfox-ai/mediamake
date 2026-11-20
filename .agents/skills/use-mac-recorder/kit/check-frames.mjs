#!/usr/bin/env node
/**
 * check-frames: one contact sheet to check a recording against its events log. It takes a frame at each
 * click and step (up to 12, the first, the last and evenly between), draws a ring where the log says the
 * click was, and labels each frame with its time. When the ring sits on what was clicked, the log lines
 * up with the video.
 *
 *   node check-frames.mjs <name>.events.json [--out <sheet.jpg>] [--max 12]
 *
 * Needs ffmpeg (Homebrew's, or FFMPEG=<path>).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findFfmpeg } from './plan-edit.mjs';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
if (!file) {
  console.error('node check-frames.mjs <name>.events.json [--out sheet.jpg] [--max 12]');
  process.exit(64);
}
const opt = k => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ffmpeg = findFfmpeg();
if (!ffmpeg) {
  console.error('check-frames needs ffmpeg: brew install ffmpeg');
  process.exit(1);
}
const events = JSON.parse(fs.readFileSync(file, 'utf8'));
const video = path.join(path.dirname(file), events.video);
const { width: W, height: H } = events.size;
const max = Number(opt('max') ?? 12);

/** What to look at: clicks and markers, in time order, thinned to `max`. */
let moments = [
  ...events.clicks.map((c, i) => ({ t: c.t, x: c.x, y: c.y, label: `click ${i + 1}${c.inside === false ? ' (outside)' : ''}` })),
  ...events.markers.map(m => ({ t: m.t, x: m.x, y: m.y, label: m.name })),
].sort((a, b) => a.t - b.t);
if (!moments.length) moments = [0.1, 0.5, 0.9].map(f => ({ t: events.duration * f, label: `${Math.round(f * 100)}%` }));
if (moments.length > max) moments = Array.from({ length: max }, (_, i) => moments[Math.round((i * (moments.length - 1)) / (max - 1))]);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-frames-'));
const font = ['/System/Library/Fonts/Helvetica.ttc', '/System/Library/Fonts/SFNS.ttf', '/Library/Fonts/Arial.ttf'].find(f => fs.existsSync(f));
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\u2019").replace(/%/g, '\\%');
const ring = Math.round(Math.max(W, H) / 40);
moments.forEach((m, i) => {
  const filters = [];
  if (Number.isFinite(m.x) && Number.isFinite(m.y)) {
    const x = Math.round(m.x - ring);
    const y = Math.round(m.y - ring);
    filters.push(`drawbox=x=${x}:y=${y}:w=${ring * 2}:h=${ring * 2}:color=0xff2d2dF2:t=${Math.max(3, Math.round(ring / 6))}`);
    filters.push(`drawbox=x=${Math.round(m.x) - 2}:y=${Math.round(m.y) - 2}:w=5:h=5:color=red:t=fill`);
  }
  filters.push('scale=960:-2');
  if (font) filters.push(`drawtext=fontfile=${font}:text='${esc(`${m.t.toFixed(2)} s  ${m.label}`)}':x=16:y=16:fontsize=26:fontcolor=white:box=1:boxcolor=0x000000B3:boxborderw=8`);
  const out = path.join(tmp, `f${String(i).padStart(2, '0')}.jpg`);
  const res = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-ss', String(Math.max(0, m.t + 0.03)), '-i', video, '-frames:v', '1', '-vf', filters.join(','), '-q:v', '3', '-y', out], { encoding: 'utf8' });
  if (res.status !== 0) console.error(`frame at ${m.t}: ${res.stderr.trim().split('\n').pop()}`);
});
const frames = fs.readdirSync(tmp).filter(f => f.endsWith('.jpg')).sort();
if (!frames.length) {
  console.error('No frame could be read from', video);
  process.exit(1);
}
const cols = frames.length > 4 ? 3 : 2;
const rows = Math.ceil(frames.length / cols);
const sheet = opt('out') ?? file.replace(/\.events\.json$/, '.check.jpg');
const res = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-framerate', '1', '-i', path.join(tmp, 'f%02d.jpg'), '-vf', `tile=${cols}x${rows}:padding=8:margin=8:color=0x222222`, '-frames:v', '1', '-q:v', '3', '-y', sheet], { encoding: 'utf8' });
fs.rmSync(tmp, { recursive: true, force: true });
if (res.status !== 0) {
  console.error(res.stderr);
  process.exit(1);
}
console.log(`✔ ${sheet} (${frames.length} frames: ${moments.map(m => `${m.t.toFixed(2)} s ${m.label}`).join(' · ')})`);
