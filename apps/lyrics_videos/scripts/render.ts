/**
 * render: full video for one project via the Remotion CLI (so remotion.config.ts applies).
 *
 * Usage: npm run render-project -w lyrics_videos -- <slug> [--proxy[=0.5]] [--look=<id>] [extra remotion render flags]
 * Output: out/<slug>/<slug>.mp4, plus out/<slug>/<slug>.map.json (every shot with its id, for the
 * mediamake Revisions screen; see scripts/map.ts)
 *
 * Earlier cuts are never lost: before a full render replaces out/<slug>/<slug>.mp4, the previous
 * video, its map and its .revisions/ folder are copied into out/<slug>/v<N>/ (the next free number;
 * skipped when an identical copy is already kept there). A clip (--frames=a-b) never touches the
 * main file: it goes to out/<slug>/clips/<slug>-<a>-<b>.mp4. Only the user asks for a cleanup.
 *
 * Review renders (revise-video): --proxy renders at half size (--scale=0.5; --proxy=0.75 for another
 * scale, an explicit --scale wins) into the same file, so the review link and the map stay the same
 * and a round costs a quarter of the pixels. Render the master (no --proxy) once, after the user
 * signs off: thumbnails, upload packs and rotate shorts come only from the master.
 *
 * Look previews (revise-video › Previews or the whole video): --look=<id> passes { "look": "<id>" }
 * as input props (merged into any --props; the project reads it with getInputProps()) and writes
 * out/<slug>/looks/<id>.mp4, the main file untouched. Render each look on the same --frames stretch,
 * then put them in one labelled video with look-grid.
 *
 * Every render is logged in out/<slug>/.renders.jsonl (scripts/render-log.ts): loop-stats counts
 * render minutes from it, and shorts --mode=rotate refuses a review render as its source.
 *
 * Shorts (make-video-music-remix-shorts): --short=<id> renders projects/<slug>/shorts/<id> in every
 * format its short.json lists (or --format=9x16) → out/<slug>/shorts/<id>/<slug>-<id>-<format>.mp4,
 * kept in v<N>/ the same way, with a map in the short's own time. A rotate short with its own stretch
 * (short.json "wide") renders its 16:9 stretch first (<slug>-<id>-16x9) and links it into
 * projects/<slug>/shorts/<id>/wide.mp4, which the turned short plays. Lyric shorts
 * (make-lyrics-shorts-summerstyle-boldwords) have their own: npm run lyric-shorts -- <slug> render <id | all>.
 *
 * To render through mediamake's /api/remotion/render or Lambda instead, pass the manifest
 * as inputProps ({ manifest }) with asset paths rewritten to public URLs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { keepPrevious, parseFramesFlag, writeVideoMap, type MapShort } from './map.ts';
import { appendRender } from './render-log.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [slug, ...rest] = process.argv.slice(2);
const value = (name: string) => rest.find(f => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const shortId = value('short');
const format = value('format');
const look = value('look');
const proxy = rest.find(f => f === '--proxy' || f.startsWith('--proxy='));
// the rest go to remotion render
let flags = rest.filter(f => !/^--(short|format|look)=/.test(f) && f !== proxy);
if (!slug) {
  console.error('Usage: npm run render-project -w lyrics_videos -- <slug> [--proxy] [--look=<id>] [flags]');
  process.exit(1);
}
if (!fs.existsSync(path.join(ROOT, 'projects', slug, 'manifest.json'))) {
  console.error(
    `No manifest. Run: npm run prepare-project -w lyrics_videos -- ${slug}`,
  );
  process.exit(1);
}

const explicitScale = flags.find(f => f.startsWith('--scale='));
let scale = explicitScale ? Number(explicitScale.slice('--scale='.length)) : 1;
if (proxy && !explicitScale) {
  scale = proxy.includes('=') ? Number(proxy.slice('--proxy='.length)) : 0.5;
  if (!(scale > 0 && scale < 1)) {
    console.error('--proxy takes a scale below 1: --proxy or --proxy=0.75');
    process.exit(1);
  }
  flags.push(`--scale=${scale}`);
}

if (look) {
  if (shortId) {
    console.error('--look is for the main video, not a short.');
    process.exit(1);
  }
  if (!/^[\w.-]+$/.test(look)) {
    console.error('--look takes a plain id (letters, digits, - _ .): --look=B');
    process.exit(1);
  }
  const propsFlag = flags.find(f => f.startsWith('--props='));
  let props: Record<string, unknown> = {};
  if (propsFlag) {
    const raw = propsFlag.slice('--props='.length);
    const file = path.resolve(ROOT, raw);
    try {
      props = JSON.parse(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : raw);
    } catch {
      console.error('--props must be JSON or a JSON file to merge the look into');
      process.exit(1);
    }
    flags = flags.filter(f => f !== propsFlag);
  }
  flags.push(`--props=${JSON.stringify({ ...props, look })}`);
}

const frames = parseFramesFlag(flags);
const clip = frames || flags.includes('--frames');
const framesName = frames ? `${frames.from}-${frames.to === Number.MAX_SAFE_INTEGER ? 'end' : frames.to}` : 'clip';

/** one remotion render, logged, then its shot map; false when the render failed */
function renderOne(composition: string, output: string, short?: MapShort): boolean {
  fs.mkdirSync(path.join(ROOT, path.dirname(output)), { recursive: true });
  const started = Date.now();
  const r = spawnSync('npx', ['remotion', 'render', 'src/index.ts', composition, output, ...flags], {
    cwd: ROOT,
    stdio: 'inherit',
    // bundle this project alone (other projects' Google font loads made renders time out)
    env: { ...process.env, ONLY_PROJECT: slug },
  });
  try {
    appendRender(path.join(ROOT, output), {
      at: new Date(started).toISOString(),
      scale,
      frames: frames ? [frames.from, frames.to === Number.MAX_SAFE_INTEGER ? null : frames.to] : undefined,
      look,
      seconds: Math.round((Date.now() - started) / 100) / 10,
      ok: r.status === 0,
    });
  } catch (err) {
    console.warn(`Could not log the render: ${err instanceof Error ? err.message : err}`);
  }
  if (r.status !== 0) return false;
  try {
    writeVideoMap(slug, path.join(ROOT, output), frames, short);
  } catch (err) {
    // The render is fine without a map; say so and move on.
    console.warn(`Could not write the shot map: ${err instanceof Error ? err.message : err}`);
  }
  if (scale < 1 && !clip && !look)
    console.log(`Review render at ${Math.round(scale * 100)}% size. Render the master without --proxy once the user signs off.`);
  return true;
}

if (shortId) {
  const shortDir = path.join(ROOT, 'projects', slug, 'shorts', shortId);
  if (!fs.existsSync(path.join(shortDir, 'short.json'))) {
    console.error(`No short ${shortId}. Run: npm run shorts -w lyrics_videos -- ${slug} make …`);
    process.exit(1);
  }
  // a rotate short starts at its hook, before the stretch
  const short = JSON.parse(fs.readFileSync(path.join(shortDir, 'short.json'), 'utf8')) as { from: number; formats: string[]; hook?: { from: number }; wide?: boolean; video?: string };
  const shots = fs.existsSync(path.join(shortDir, 'shots.json')) ? `shorts/${shortId}/shots.json` : 'video/shots.json';
  // a rotate short with its own stretch: the 16:9 stretch first (unless only another format is asked for
  // and the stretch is already there), so the turned short has its video
  const wideFile = short.wide && short.video ? path.join(ROOT, 'projects', slug, short.video) : undefined;
  const list = format ? [format] : short.formats;
  if (wideFile && !clip && !list.includes('16x9') && (!format || !fs.existsSync(wideFile))) list.unshift('16x9');
  for (const f of list) {
    const name = `${slug}-${shortId}-${f}`;
    const dir = path.join('out', slug, 'shorts', shortId);
    const output = clip ? path.join(dir, 'clips', `${name}-${framesName}.mp4`) : path.join(dir, `${name}.mp4`);
    if (!clip) keepPrevious(path.join(ROOT, dir), name);
    if (!renderOne(name, output, { shots, offset: short.hook?.from ?? short.from })) process.exit(1);
    if (f === '16x9' && wideFile && !clip) {
      // the turned short plays it from the project folder (a hard link: no second copy)
      fs.rmSync(wideFile, { force: true });
      try {
        fs.linkSync(path.join(ROOT, output), wideFile);
      } catch {
        fs.copyFileSync(path.join(ROOT, output), wideFile);
      }
      console.log(`✔ ${path.relative(ROOT, wideFile)} ← ${output}`);
    }
  }
  process.exit(0);
}

const output = look
  ? path.join('out', slug, 'looks', `${look}.mp4`)
  : clip
    ? path.join('out', slug, 'clips', `${slug}-${framesName}.mp4`)
    : path.join('out', slug, `${slug}.mp4`);
if (!clip && !look) keepPrevious(path.join(ROOT, 'out', slug), slug);
process.exit(renderOne(slug, output) ? 0 : 1);
