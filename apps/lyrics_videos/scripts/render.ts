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
 * Shorts (make-video-music-remix-shorts): --short=<id> renders projects/<slug>/shorts/<id> in every
 * format its short.json lists (or --format=9x16) → out/<slug>/shorts/<id>/<slug>-<id>-<format>.mp4,
 * kept in v<N>/ the same way, with a map in the short's own time.
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
const [slug, ...rest] = process.argv.slice(2);
const shortId = rest.find(f => f.startsWith('--short='))?.slice('--short='.length);
const format = rest.find(f => f.startsWith('--format='))?.slice('--format='.length);
// the rest go to remotion render
const flags = rest.filter(f => !f.startsWith('--short=') && !f.startsWith('--format='));
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

/** copy the current render (video, map, revisions) into <dir>/v<N>/ before it is replaced */
const keepPrevious = (dir: string, name = slug) => {
  const video = path.join(dir, `${name}.mp4`);
  if (!fs.existsSync(video)) return;
  const size = fs.statSync(video).size;
  const versions = fs.readdirSync(dir).filter(d => /^v\d+$/.test(d)).map(d => Number(d.slice(1)));
  const same = versions.find(n => {
    const kept = path.join(dir, `v${n}`, `${name}.mp4`);
    return fs.existsSync(kept) && fs.statSync(kept).size === size;
  });
  const into = path.join(dir, `v${same ?? Math.max(0, ...versions) + 1}`);
  fs.mkdirSync(into, { recursive: true });
  if (same === undefined) {
    for (const f of [`${name}.mp4`, `${name}.map.json`]) if (fs.existsSync(path.join(dir, f))) fs.copyFileSync(path.join(dir, f), path.join(into, f));
  }
  // the review notes belong to that cut: bring the kept copy up to date
  const revisions = path.join(dir, `${name}.revisions`);
  if (fs.existsSync(revisions)) fs.cpSync(revisions, path.join(into, `${name}.revisions`), { recursive: true });
  console.log(`${same === undefined ? 'Kept' : 'Already kept'} the previous render in ${path.relative(ROOT, into)}/`);
};

const frames = parseFramesFlag(flags);
const clip = frames || flags.includes('--frames');

if (shortId) {
  const shortDir = path.join(ROOT, 'projects', slug, 'shorts', shortId);
  if (!fs.existsSync(path.join(shortDir, 'short.json'))) {
    console.error(`No short ${shortId}. Run: npm run shorts -w lyrics_videos -- ${slug} make …`);
    process.exit(1);
  }
  // a rotate short starts at its hook, before the stretch
  const short = JSON.parse(fs.readFileSync(path.join(shortDir, 'short.json'), 'utf8')) as { from: number; formats: string[]; hook?: { from: number } };
  const shots = fs.existsSync(path.join(shortDir, 'shots.json')) ? `shorts/${shortId}/shots.json` : 'video/shots.json';
  for (const f of format ? [format] : short.formats) {
    const name = `${slug}-${shortId}-${f}`;
    const dir = path.join('out', slug, 'shorts', shortId);
    const output = clip
      ? path.join(dir, 'clips', `${name}-${frames ? `${frames.from}-${frames.to === Number.MAX_SAFE_INTEGER ? 'end' : frames.to}` : 'clip'}.mp4`)
      : path.join(dir, `${name}.mp4`);
    if (!clip) keepPrevious(path.join(ROOT, dir), name);
    fs.mkdirSync(path.join(ROOT, path.dirname(output)), { recursive: true });
    const r = spawnSync('npx', ['remotion', 'render', 'src/index.ts', name, output, ...flags], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
    try {
      writeVideoMap(slug, path.join(ROOT, output), frames, { shots, offset: short.hook?.from ?? short.from });
    } catch (err) {
      console.warn(`Could not write the shot map: ${err instanceof Error ? err.message : err}`);
    }
  }
  process.exit(0);
}

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
