/**
 * stills: render one frame per section (plus any extra seconds) for a quick visual check.
 * Bundles once, so it is much faster than calling `remotion still` repeatedly.
 *
 * Usage: npm run stills -w lyrics_videos -- <slug> [seconds,seconds,...]
 * Output: out/<slug>/stills/<nn>-<label>-<seconds>s.jpg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { ManifestSchema } from '../src/kit/manifest.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const main = async () => {
  const [slug, extra] = process.argv.slice(2);
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

  const points = manifest.sections.map(s => ({
    label: s.label,
    t: (s.from + s.to) / 2,
  }));
  for (const t of (extra ?? '').split(',').filter(Boolean))
    points.push({ label: 'at', t: Number(t) });

  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, 'src/index.ts'),
    publicDir: path.join(ROOT, 'projects'),
  });
  const inputProps = { manifest };
  const composition = await selectComposition({
    serveUrl,
    id: slug,
    inputProps,
  });

  const outDir = path.join(ROOT, 'out', slug, 'stills');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  for (const [i, p] of points.entries()) {
    const frame = Math.min(
      composition.durationInFrames - 1,
      Math.round(p.t * composition.fps),
    );
    const output = path.join(
      outDir,
      `${String(i).padStart(2, '0')}-${p.label}-${p.t.toFixed(1)}s.jpg`,
    );
    await renderStill({
      serveUrl,
      composition,
      frame,
      output,
      inputProps,
      imageFormat: 'jpeg',
      scale: 0.5,
    });
    console.log(`✔ ${path.relative(ROOT, output)}`);
  }
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
