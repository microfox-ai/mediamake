/**
 * derive-media: projects/<slug>/video/media.json  →  projects/<slug>/derived/
 *
 * Turns raw inputs into frame-ready media, so scenes never fight odd sizes or codecs:
 *   - images: cropped to the frame's aspect around a focus point (portraits become
 *     landscape crops), downscaled to maxWidth, never upscaled
 *   - clips: cut to [from, to], cover-cropped to the aspect, scaled to `height`
 *     (lanczos, light sharpening when upscaling), H.264 with short GOPs for fast seeking
 *
 * input/ stays untouched. Re-run after editing media.json; up-to-date outputs are skipped.
 * Writes derived/index.json ({ id: { path, width, height, duration? } }) for the scenes.
 *
 * Usage: npm run derive-media -w lyrics_videos -- <slug> [--force]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { z } from 'zod';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The system ffmpeg usually has more decoders (AV1 via dav1d) than the bundled one.
const which = (bin: string, fallback: string) => {
  try {
    return execFileSync('which', [bin]).toString().trim() || fallback;
  } catch {
    return fallback;
  }
};
const FFMPEG = which('ffmpeg', ffmpegInstaller.path);
const FFPROBE = which('ffprobe', ffprobeInstaller.path);

const Aspect = z.union([z.literal('keep'), z.string().regex(/^\d+:\d+$/)]);
const ImageSpec = z.object({
  src: z.string(),
  /** Crop centre as fractions of the source (0..1). Default: centre. */
  focus: z.tuple([z.number(), z.number()]).optional(),
  aspect: Aspect.default('16:9'),
  maxWidth: z.number().default(2560),
  /** png keeps alpha (cutouts). */
  format: z.enum(['jpg', 'png']).default('jpg'),
});
const ClipSpec = z.object({
  src: z.string(),
  from: z.number().optional(),
  to: z.number().optional(),
  aspect: Aspect.default('16:9'),
  focus: z.tuple([z.number(), z.number()]).optional(),
  height: z.number().default(1080),
  fps: z.number().optional(),
  crf: z.number().default(17),
});
const MediaSchema = z.object({
  images: z.record(z.string(), ImageSpec).default({}),
  clips: z.record(z.string(), ClipSpec).default({}),
});

type Probe = { width: number; height: number; duration?: number };
const probe = (file: string): Probe => {
  const out = JSON.parse(
    execFileSync(FFPROBE, [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:format=duration',
      '-of', 'json', file,
    ]).toString(),
  );
  const s = out.streams?.[0] ?? {};
  const d = parseFloat(out.format?.duration);
  return { width: s.width, height: s.height, duration: Number.isFinite(d) ? d : undefined };
};

const ratio = (aspect: string, w: number, h: number) => {
  if (aspect === 'keep') return w / h;
  const [a, b] = aspect.split(':').map(Number);
  return a / b;
};

/** Largest crop of `aspect` inside w×h, centred on focus. Even sizes for the encoder. */
const cropBox = (w: number, h: number, aspect: number, focus: [number, number] = [0.5, 0.5]) => {
  let cw = w;
  let ch = Math.round(w / aspect);
  if (ch > h) {
    ch = h;
    cw = Math.round(h * aspect);
  }
  cw -= cw % 2;
  ch -= ch % 2;
  const x = Math.round(Math.min(w - cw, Math.max(0, focus[0] * w - cw / 2)));
  const y = Math.round(Math.min(h - ch, Math.max(0, focus[1] * h - ch / 2)));
  return { cw, ch, x, y };
};

/** Up to date when the output exists, is newer than its source, and was made from the same spec. */
const fresh = (out: string, input: string, entry: { spec?: string } | undefined, spec: unknown) =>
  fs.existsSync(out) &&
  fs.statSync(input).mtimeMs <= fs.statSync(out).mtimeMs &&
  entry?.spec === JSON.stringify(spec);

const main = () => {
  const [slug, ...flags] = process.argv.slice(2);
  if (!slug) {
    console.error('Usage: npm run derive-media -w lyrics_videos -- <slug> [--force]');
    process.exit(1);
  }
  const force = flags.includes('--force');
  const projectDir = path.join(ROOT, 'projects', slug);
  const specPath = path.join(projectDir, 'video', 'media.json');
  if (!fs.existsSync(specPath)) throw new Error(`No ${path.relative(ROOT, specPath)}`);
  const spec = MediaSchema.parse(JSON.parse(fs.readFileSync(specPath, 'utf8')));
  const outDir = path.join(projectDir, 'derived');
  fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'clips'), { recursive: true });
  const indexPath = path.join(outDir, 'index.json');
  const index: Record<string, Probe & { path: string; spec?: string }> = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
    : {};

  for (const [id, s] of Object.entries(spec.images)) {
    const src = path.join(projectDir, 'input', s.src);
    const rel = `derived/img/${id}.${s.format}`;
    const out = path.join(projectDir, rel);
    if (!force && fresh(out, src, index[id], s)) continue;
    const p = probe(src);
    const { cw, ch, x, y } = cropBox(p.width, p.height, ratio(s.aspect, p.width, p.height), s.focus);
    const w = Math.min(cw, s.maxWidth);
    execFileSync(FFMPEG, [
      '-v', 'error', '-y', '-i', src,
      '-vf', `crop=${cw}:${ch}:${x}:${y},scale=${w}:-2:flags=lanczos`,
      ...(s.format === 'jpg' ? ['-q:v', '2'] : []),
      '-frames:v', '1', out,
    ]);
    index[id] = { path: `${slug}/${rel}`, ...probe(out), spec: JSON.stringify(s) };
    const up = cw < 1920 ? `  ⚠ crop is ${cw}px wide: ${(1920 / cw).toFixed(2)}× upscale at 1080p` : '';
    console.log(`✔ img   ${id.padEnd(10)} ${p.width}×${p.height} → ${index[id].width}×${index[id].height}${up}`);
  }

  for (const [id, s] of Object.entries(spec.clips)) {
    const src = path.join(projectDir, 'input', s.src);
    const rel = `derived/clips/${id}.mp4`;
    const out = path.join(projectDir, rel);
    if (!force && fresh(out, src, index[id], s)) continue;
    const p = probe(src);
    const { cw, ch, x, y } = cropBox(p.width, p.height, ratio(s.aspect, p.width, p.height), s.focus);
    const h = s.height - (s.height % 2);
    const up = h > ch;
    const vf = [
      `crop=${cw}:${ch}:${x}:${y}`,
      `scale=-2:${h}:flags=lanczos`,
      ...(up ? ['unsharp=5:5:0.5:5:5:0'] : []),
      ...(s.fps ? [`fps=${s.fps}`] : []),
      'format=yuv420p',
    ].join(',');
    execFileSync(FFMPEG, [
      '-v', 'error', '-y',
      ...(s.from !== undefined ? ['-ss', String(s.from)] : []),
      ...(s.to !== undefined ? ['-to', String(s.to)] : []),
      '-i', src, '-an', '-vf', vf,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(s.crf),
      '-g', '12', '-bf', '0', '-movflags', '+faststart', out,
    ], { maxBuffer: 1 << 26 });
    index[id] = { path: `${slug}/${rel}`, ...probe(out), spec: JSON.stringify(s) };
    console.log(
      `✔ clip  ${id.padEnd(10)} ${p.width}×${p.height} → ${index[id].width}×${index[id].height}` +
        `  ${index[id].duration?.toFixed(2)}s${up ? `  (${(h / ch).toFixed(2)}× upscale)` : ''}`,
    );
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 1) + '\n');
  console.log(`index: ${path.relative(ROOT, indexPath)} (${Object.keys(index).length} items)`);
};

main();
