/**
 * render: full video for one project via the Remotion CLI (so remotion.config.ts applies).
 *
 * Usage: npm run render-project -w lyrics_videos -- <slug> [extra remotion render flags]
 * Output: out/<slug>/<slug>.mp4, plus out/<slug>/<slug>.map.json (every shot with its id, for the
 * mediamake Revisions screen; see scripts/map.ts)
 *
 * Earlier cuts are never lost: before a full render replaces out/<slug>/<slug>.mp4, the previous
 * video, its map and its .revisions/ folder are copied into out/<slug>/v<N>/ (the next free number;
 * skipped when an identical copy is already kept there). A clip (--frames=a-b) never touches the
 * main file: it goes to out/<slug>/clips/<slug>-<a>-<b>.mp4. Only the user asks for a cleanup.
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

/** copy the current render (video, map, revisions) into out/<slug>/v<N>/ before it is replaced */
const keepPrevious = (dir: string) => {
  const video = path.join(dir, `${slug}.mp4`);
  if (!fs.existsSync(video)) return;
  const size = fs.statSync(video).size;
  const versions = fs.readdirSync(dir).filter(d => /^v\d+$/.test(d)).map(d => Number(d.slice(1)));
  const same = versions.find(n => {
    const kept = path.join(dir, `v${n}`, `${slug}.mp4`);
    return fs.existsSync(kept) && fs.statSync(kept).size === size;
  });
  const into = path.join(dir, `v${same ?? Math.max(0, ...versions) + 1}`);
  fs.mkdirSync(into, { recursive: true });
  if (same === undefined) {
    for (const f of [`${slug}.mp4`, `${slug}.map.json`]) if (fs.existsSync(path.join(dir, f))) fs.copyFileSync(path.join(dir, f), path.join(into, f));
  }
  // the review notes belong to that cut: bring the kept copy up to date
  const revisions = path.join(dir, `${slug}.revisions`);
  if (fs.existsSync(revisions)) fs.cpSync(revisions, path.join(into, `${slug}.revisions`), { recursive: true });
  console.log(`${same === undefined ? 'Kept' : 'Already kept'} the previous render in ${path.relative(ROOT, into)}/`);
};

const frames = parseFramesFlag(flags);
const clip = frames || flags.includes('--frames');
const output = clip
  ? path.join('out', slug, 'clips', `${slug}-${frames ? `${frames.from}-${frames.to === Number.MAX_SAFE_INTEGER ? 'end' : frames.to}` : 'clip'}.mp4`)
  : path.join('out', slug, `${slug}.mp4`);
if (!clip) keepPrevious(path.join(ROOT, 'out', slug));
fs.mkdirSync(path.join(ROOT, path.dirname(output)), { recursive: true });
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
    writeVideoMap(slug, path.join(ROOT, output), frames);
  } catch (err) {
    // The render is fine without a map; say so and move on.
    console.warn(`Could not write the shot map: ${err instanceof Error ? err.message : err}`);
  }
}
process.exit(result.status ?? 1);
