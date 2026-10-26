/**
 * stills: render one frame per section (plus any extra seconds) for a quick visual check.
 * Bundles once, so it is much faster than calling `remotion still` repeatedly.
 *
 * Usage: npm run stills -w lyrics_videos -- <slug> [seconds,seconds,...] [--only] [--scale=0.5]
 *   --only      render just the given seconds, not one frame per section
 *   --scale=1   full resolution (default 0.5)
 * Output: out/<slug>/stills/<nn>-<label>-<seconds>s.jpg
 *
 * A short (make-video-music-remix-shorts): --short=<id> [--format=9x16] renders that composition; the
 * seconds are the short's own, one frame per section inside it by default →
 * out/<slug>/shorts/<id>/stills-<format>/.
 *
 * --cuts: one frame from the middle of every cut (the project's or the short's shots.json, written by
 * `npm run remix`) and a contact sheet of them, sheet.jpg, each labelled with its cut id → stills-cuts/
 * (stills-<format>-cuts/ for a short): to see the whole edit as it renders, e.g. how a vertical
 * frame reframes each cut.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind-v4';
import { renderStill, selectComposition } from '@remotion/renderer';
import { ManifestSchema } from '../src/kit/manifest.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const main = async () => {
  const args = process.argv.slice(2);
  const flags = args.filter(a => a.startsWith('--'));
  const [slug, extra] = args.filter(a => !a.startsWith('--'));
  const only = flags.includes('--only');
  const scale = Number(flags.find(f => f.startsWith('--scale='))?.split('=')[1] ?? 0.5);
  const shortId = flags.find(f => f.startsWith('--short='))?.split('=')[1];
  if (!slug) {
    console.error(
      'Usage: npm run stills -w lyrics_videos -- <slug> [seconds,seconds,...]',
    );
    process.exit(1);
  }
  const manifestPath = path.join(ROOT, 'projects', slug, 'manifest.json');
  if (!fs.existsSync(manifestPath))
    throw new Error(
      `No manifest. Run: npm run prepare-project -w lyrics_videos -- ${slug}`,
    );
  const manifest = ManifestSchema.parse(
    JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
  );

  const short = shortId
    ? (JSON.parse(fs.readFileSync(path.join(ROOT, 'projects', slug, 'shorts', shortId, 'short.json'), 'utf8')) as { from: number; to: number; formats: string[] })
    : null;
  const format = flags.find(f => f.startsWith('--format='))?.split('=')[1] ?? short?.formats[0];
  const cuts = flags.includes('--cuts');
  const shotsFile = path.join(ROOT, 'projects', slug, shortId ? `shorts/${shortId}/shots.json` : 'video/shots.json');
  const points = cuts
    ? (JSON.parse(fs.readFileSync(shotsFile, 'utf8')) as { id: string; from: number; to: number }[])
        .filter(c => !short || (c.to > short.from + 0.02 && c.from < short.to - 0.02))
        .map(c => {
          const [a, b] = short ? [Math.max(c.from, short.from), Math.min(c.to, short.to)] : [c.from, c.to];
          return { label: c.id, t: (a + b) / 2 - (short?.from ?? 0) };
        })
    : only
    ? []
    : short
      ? manifest.sections
          .filter(s => s.to > short.from && s.from < short.to)
          .map(s => ({ label: s.label, t: (Math.max(s.from, short.from) + Math.min(s.to, short.to)) / 2 - short.from }))
      : manifest.sections.map(s => ({
          label: s.label,
          t: (s.from + s.to) / 2,
        }));
  for (const t of (extra ?? '').split(',').filter(Boolean))
    points.push({ label: 'at', t: Number(t) });

  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, 'src/index.ts'),
    publicDir: path.join(ROOT, 'projects'),
    // same as remotion.config.ts: mediamake presets and atoms use Tailwind classes
    webpackOverride: enableTailwind,
  });
  const inputProps = { manifest };
  // ANGLE gives headless Chrome a real GPU path (three.js / WebGL scenes need it)
  const chromiumOptions = { gl: 'angle' as const };
  const composition = await selectComposition({
    serveUrl,
    id: short ? `${slug}-${shortId}-${format}` : slug,
    inputProps,
    chromiumOptions,
  });

  const outDir = path.join(ROOT, 'out', slug, ...(short ? ['shorts', shortId!, `stills-${format}${cuts ? '-cuts' : ''}`] : [cuts ? 'stills-cuts' : 'stills']));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  for (const [i, p] of points.entries()) {
    const frame = Math.min(
      composition.durationInFrames - 1,
      Math.round(p.t * composition.fps),
    );
    const output = path.join(
      outDir,
      `${String(i).padStart(cuts ? 3 : 2, '0')}-${p.label}-${p.t.toFixed(1)}s.jpg`,
    );
    await renderStill({
      serveUrl,
      composition,
      frame,
      output,
      inputProps,
      imageFormat: 'jpeg',
      scale,
      chromiumOptions,
      timeoutInMilliseconds: 120000,
    });
    console.log(`✔ ${path.relative(ROOT, output)}`);
  }
  // the bundle copies the whole public dir (GBs of media): don't leave it in the temp folder
  fs.rmSync(serveUrl, { recursive: true, force: true });
  if (cuts && points.length) {
    // the contact sheet: every cut in order, its id (and time) burned in, 10 to a row
    const tall = composition.height > composition.width;
    const w = tall ? 180 : 320;
    const cols = 10;
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-export_path_metadata', '1', '-pattern_type', 'glob', '-i', path.join(outDir, '*.jpg'),
      '-vf', `scale=${w}:-2,drawtext=text='%{metadata\\:lavf.image2dec.source_basename}':x=4:y=4:fontsize=${tall ? 11 : 12}:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=${cols}x${Math.ceil(points.length / cols)}:padding=4:color=white`,
      '-frames:v', '1', '-update', '1', path.join(outDir, 'sheet.jpg'),
    ]);
    console.log(`✔ ${path.relative(ROOT, path.join(outDir, 'sheet.jpg'))} (${points.length} cuts)`);
  }
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
