/**
 * clip-loop: will an overlay clip loop without a visible jump, and if not, a loop that does. An overlay
 * (a ring of fire, smoke, light) loops by starting over, so its last frame must lead into its first; and a
 * clip cut from a longer one can hide a jump inside it. This measures how much the picture changes from each
 * frame to the next (small grey copies, mean difference 0–100), then:
 *   - the seam: last frame → first, against the clip's usual step;
 *   - jumps: steps far above the usual one (a cut, a glitch, a dropped frame), with their times;
 *   - a suggestion: loop as is, or a ping-pong (forwards, then backwards) up to the first jump.
 *
 * Usage: mm clip-loop <clip> [--pingpong[=<to s>]] [--from=<s>] [--out=<file>] [--jump=3]
 *
 *   --pingpong   writes the ping-pong: frames from → to forwards, then back to just after `from` (no turn frame
 *                twice), so its end leads into its start. Without a value: up to the last frame before the first jump
 *   --from       where it starts (s, default 0)
 *   --out        the file to write (default: next to the clip, <name>-pingpong-<len>s.mp4; never overwrites: a new
 *                name also keeps the editor from showing a cached copy of an older one)
 *   --jump       how many times the clip's median step counts as a jump (default 3)
 *   --json       the measurements (every step) as JSON, nothing written
 *
 * Hollow Soul (2026-11-09): the fire ring's first and last frames didn't match, and a jump at 6.1 s showed once a
 * whole-length ping-pong ran past it ("at 6secs of the ring video there is a glitch, so cut at that and reverse
 * from there"): three rounds the user had to find by eye. A .webm keeps its alpha (VP9).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FFMPEG, ffmpegLog, probeMedia } from './ff.ts';
import { shown } from './paths.ts';

const args = process.argv.slice(2);
const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => args.includes(`--${name}`) || opt(name) !== undefined;
const [clipArg] = args.filter(a => !a.startsWith('--'));
if (!clipArg) {
  console.error('Usage: mm clip-loop <clip> [--pingpong[=<to s>]] [--from=<s>] [--out=<file>] [--jump=3]');
  process.exit(1);
}
const clip = path.resolve(clipArg);
if (!fs.existsSync(clip)) {
  console.error(`No clip at ${shown(clip)}.`);
  process.exit(1);
}
const JUMP = Number(opt('jump') ?? 3);
const W = 96;

/** `usual`: the 95th percentile step, what the clip's own motion reaches without a cut. */
type Steps = { fps: number; frames: number; steps: number[]; seam: number; median: number; usual: number };

/** Mean absolute difference (0–100) between consecutive frames of small grey copies, and last → first. */
const measure = (file: string): Steps => {
  const info = probeMedia(file);
  if (!info.video) throw new Error(`${shown(file)} has no picture.`);
  const H = Math.max(2, Math.round((W * info.video.height) / info.video.width / 2) * 2);
  const webm = /\.webm$/i.test(file);
  const r = spawnSync(
    FFMPEG,
    ['-hide_banner', '-v', 'error', ...(webm ? ['-c:v', 'libvpx-vp9'] : []), '-i', file, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'],
    { maxBuffer: 1 << 30 },
  );
  if (r.status !== 0) throw new Error(`ffmpeg could not read ${shown(file)}: ${r.stderr?.toString().trim().split('\n').pop()}`);
  const buf = r.stdout as Buffer;
  const size = W * H;
  const frames = Math.floor(buf.length / size);
  const diff = (a: number, b: number) => {
    let s = 0;
    for (let i = 0; i < size; i++) s += Math.abs(buf[a * size + i] - buf[b * size + i]);
    return (s / size / 255) * 100;
  };
  const steps = Array.from({ length: Math.max(0, frames - 1) }, (_, i) => diff(i, i + 1));
  const sorted = [...steps].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const usual = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
  return { fps: info.video.fps, frames, steps, seam: frames > 1 ? diff(frames - 1, 0) : 0, median, usual };
};

const f2 = (n: number) => n.toFixed(2);
const at = (frame: number, fps: number) => `${(frame / fps).toFixed(2)} s`;
/**
 * A jump inside: `--jump` × the median step and twice what the clip's own motion reaches (its 95th percentile).
 * Calibrated on Hollow Soul's fire ring (mostly black, so every step is small): its cuts were ~10 × the median,
 * its motion never above 1.5 ×. The seam is held to more: past 1.3 × the 95th percentile it shows as a hitch
 * (that ring's seam, 2.5 × the median, was the one the user saw).
 */
const isJump = (step: number, s: Steps) => step > Math.max(JUMP * s.median, 2 * s.usual, 0.01);
const seamShows = (s: Steps) => s.seam > Math.max(1.3 * s.usual, 0.01);

const report = (file: string, s: Steps) => {
  const jumps = s.steps.map((v, i) => ({ i, v })).filter(j => isJump(j.v, s));
  console.log(`${shown(file)} · ${s.frames} frames at ${s.fps} fps (${at(s.frames, s.fps)})`);
  console.log(`  usual step ${f2(s.median)} (95% under ${f2(s.usual)}) · largest ${f2(Math.max(0, ...s.steps))} · seam (last → first) ${f2(s.seam)}${isJump(s.seam, s) ? '  ✗ a jump' : seamShows(s) ? '  ✗ shows as a hitch' : '  ✓'}`);
  for (const j of jumps.slice(0, 12)) console.log(`  ✗ jump between frames ${j.i} and ${j.i + 1} (${at(j.i + 1, s.fps)}): ${f2(j.v)}`);
  if (jumps.length > 12) console.log(`  … ${jumps.length - 12} more`);
  return jumps;
};

const source = measure(clip);
if (has('json')) {
  console.log(JSON.stringify({ ...source, steps: source.steps.map(v => Math.round(v * 1000) / 1000) }));
  process.exit(0);
}
const jumps = report(clip, source);
const from = Math.max(0, Math.round(Number(opt('from') ?? 0) * source.fps));
const firstJump = jumps.find(j => j.i >= from);
const clean = !jumps.length && !seamShows(source);

if (!has('pingpong')) {
  if (clean) console.log('\nIt loops as is.');
  else {
    const to = firstJump ? firstJump.i : source.frames - 1;
    console.log(
      `\n${!jumps.length ? 'Its end does not lead into its start.' : 'It jumps inside.'} A ping-pong of frames ${from}–${to} ` +
        `(${at(to - from + 1, source.fps)} forwards, then back) loops without one: mm clip-loop ${clipArg} --pingpong${firstJump ? '' : `=${(to / source.fps).toFixed(2)}`}` +
        (from ? ` --from=${(from / source.fps).toFixed(2)}` : ''),
    );
  }
  process.exit(0);
}

// ------------------------------------------------------------------ the ping-pong
const toArg = opt('pingpong');
const to = Math.min(source.frames - 1, toArg ? Math.round(Number(toArg) * source.fps) : firstJump ? firstJump.i : source.frames - 1);
if (!(to > from + 1)) {
  console.error(`Nothing to loop between frames ${from} and ${to}.`);
  process.exit(1);
}
const crossed = jumps.filter(j => j.i >= from && j.i < to);
if (crossed.length) console.log(`  ⚠ frames ${from}–${to} cross the jump at ${at(crossed[0].i + 1, source.fps)}: it will show twice a loop.`);
const webm = /\.webm$/i.test(clip);
const len = (2 * (to - from)) / source.fps;
const ext = webm ? '.webm' : '.mp4';
const base = path.join(path.dirname(clip), `${path.basename(clip, path.extname(clip))}-pingpong-${len.toFixed(len < 10 ? 2 : 1).replace(/\.?0+$/, '')}s`);
let out = opt('out') ? path.resolve(opt('out')!) : `${base}${ext}`;
for (let n = 2; fs.existsSync(out) && !opt('out'); n++) out = `${base}-${n}${ext}`;
if (fs.existsSync(out)) {
  console.error(`${shown(out)} is there already: pass another --out (an earlier loop stays as it is).`);
  process.exit(1);
}
// forwards from → to, then to-1 … from+1 backwards: 2 × (to − from) frames, each step a real one
const graph =
  `[0:v]trim=start_frame=${from}:end_frame=${to + 1},setpts=PTS-STARTPTS,split[f][r];` +
  `[r]reverse,trim=start_frame=1:end_frame=${to - from},setpts=PTS-STARTPTS[b];` +
  `[f][b]concat=n=2:v=1:a=0[out]`;
ffmpegLog([
  ...(webm ? ['-c:v', 'libvpx-vp9'] : []),
  '-i', clip,
  '-filter_complex', graph,
  '-map', '[out]',
  '-an',
  ...(webm ? ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '20', '-auto-alt-ref', '0'] : ['-c:v', 'libx264', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']),
  out,
]);
console.log(`\nWrote ${shown(out)}: frames ${from}–${to} forwards, ${to - 1}–${from + 1} back (${2 * (to - from)} frames, ${len.toFixed(2)} s; clipSeconds ${len.toFixed(3)})`);
report(out, measure(out));
