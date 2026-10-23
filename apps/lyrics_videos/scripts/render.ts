/**
 * render: full video for one project via the Remotion CLI (so remotion.config.ts applies).
 *
 * Usage: npm run render-project -w lyrics_videos -- <slug> [extra remotion render flags]
 * Output: out/<slug>/<slug>.mp4, plus out/<slug>/<slug>.map.json (every shot with its id, for the
 * mediamake Revisions screen; see scripts/map.ts)
 *
 * To render through mediamake's /api/remotion/render or Lambda instead, pass the manifest
 * as inputProps ({ manifest }) with asset paths rewritten to public URLs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFramesFlag, writeVideoMap } from './map.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [slug, ...flags] = process.argv.slice(2);
if (!slug) {
  console.error('Usage: npm run render-project -w lyrics_videos -- <slug> [flags]');
  process.exit(1);
}
if (!fs.existsSync(path.join(ROOT, 'projects', slug, 'manifest.json'))) {
  console.error(
    `No manifest. Run: npm run prepare-project -w lyrics_videos -- ${slug}`,
  );
  process.exit(1);
}

const output = path.join('out', slug, `${slug}.mp4`);
const result = spawnSync(
  'npx',
  ['remotion', 'render', 'src/index.ts', slug, output, ...flags],
  {
    cwd: ROOT,
    stdio: 'inherit',
  },
);
if (result.status === 0) {
  try {
    writeVideoMap(slug, path.join(ROOT, output), parseFramesFlag(flags));
  } catch (err) {
    // The render is fine without a map; say so and move on.
    console.warn(`Could not write the shot map: ${err instanceof Error ? err.message : err}`);
  }
}
process.exit(result.status ?? 1);
