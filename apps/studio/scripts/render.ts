/**
 * render: full video for one project via the Remotion CLI (so remotion.config.ts applies).
 *
 * Usage: mm render <slug> [--proxy[=0.5]] [--look=<id>] [extra remotion render flags]
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
 * (make-lyrics-shorts-summerstyle-boldwords) have their own: mm lyric-shorts <slug> render <id | all>.
 *
 * Lambda (scripts/lambda.ts): --lambda renders the same thing on Remotion Lambda through mediamake's
 * AWS setup, into the same files. The project is bundled alone as the site lyrics-<slug> with its
 * inputs as the site's public folder, { manifest, edits } go in as inputProps, and the cost is
 * printed. The render goes through mediamake's API (render history, cost usage, quota) with the media
 * library's cloud login; --direct goes straight to AWS instead. --window=a-b is a stretch in song
 * seconds (--frames=a-b works too); --region=, --preset= (mediamake's AWS_RENDER_CONFIGS, default
 * complex-fast), --skip-deploy (reuse the last site) and --attach=<renderId> (follow a render mediamake
 * already started, after a dropped connection) are its own flags; --proxy/--scale, --look and --crf
 * apply as locally. Other remotion flags don't.
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
const lambda = rest.includes('--lambda');
const LAMBDA_FLAGS = /^--(window|region|preset|attach)=|^--skip-deploy$|^--direct$|^--lambda$/;
if (!lambda && rest.some(f => LAMBDA_FLAGS.test(f) && f !== '--lambda')) {
  console.error('--window, --region, --preset, --skip-deploy, --direct and --attach go with --lambda.');
  process.exit(1);
}
// the rest go to remotion render
let flags = rest.filter(f => !/^--(short|format|look)=/.test(f) && f !== proxy && !LAMBDA_FLAGS.test(f));
if (!slug) {
  console.error('Usage: mm render <slug> [--proxy] [--look=<id>] [flags]');
  process.exit(1);
}
if (!fs.existsSync(path.join(ROOT, 'projects', slug, 'manifest.json'))) {
  console.error(
    `No manifest. Run: mm prepare ${slug}`,
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
const windowFlag = value('window');
const songWindow = windowFlag ? parseWindow(windowFlag) : undefined;
const clip = frames || flags.includes('--frames') || Boolean(songWindow);
const framesName = frames ? `${frames.from}-${frames.to === Number.MAX_SAFE_INTEGER ? 'end' : frames.to}` : 'clip';

/** --window=a-b: song seconds, b may be left out (to the end) */
function parseWindow(raw: string): { from: number; to: number } {
  const [a, b] = raw.split('-').map(Number);
  if (!Number.isFinite(a) || a < 0 || (b !== undefined && !(Number.isNaN(b) || b > a))) {
    console.error('--window takes song seconds: --window=10-30 (or --window=200- to the end)');
    process.exit(1);
  }
  return { from: a, to: Number.isFinite(b) ? b : Number.MAX_SAFE_INTEGER };
}

/** the same render on Lambda, into the same file names (scripts/lambda.ts) */
async function renderOnLambdaHere(composition: string, outDir: string, short?: MapShort): Promise<string | null> {
  const { renderOnLambda } = await import('./lambda.ts');
  const crfFlag = flags.find(f => f.startsWith('--crf='));
  const started = Date.now();
  try {
    return await renderOnLambda({
      slug,
      composition,
      outDir: path.join(ROOT, outDir),
      name: composition,
      frames: frames && { from: frames.from, to: frames.to },
      window: songWindow,
      look,
      scale,
      crf: crfFlag ? Number(crfFlag.slice('--crf='.length)) : undefined,
      region: value('region'),
      preset: value('preset'),
      skipDeploy: rest.includes('--skip-deploy') || Boolean(value('attach')),
      direct: rest.includes('--direct'),
      attach: value('attach'),
      short,
    });
  } catch (err) {
    console.error(`Lambda render failed after ${Math.round((Date.now() - started) / 1000)} s: ${err instanceof Error ? err.message : err}`);
    if (err instanceof Error && err.stack && !/^(No |The site|Nothing to|Lambda function|Region )/.test(err.message)) console.error(err.stack.split('\n').slice(1, 6).join('\n'));
    return null;
  }
}

/** one remotion render, logged, then its shot map; false when the render failed */
async function renderOne(composition: string, output: string, short?: MapShort): Promise<boolean> {
  if (lambda) {
    // clips/ and looks/ sit one level under the render's folder; the file is named after the composition
    const outDir = clip || look ? path.dirname(path.dirname(output)) : path.dirname(output);
    return (await renderOnLambdaHere(composition, outDir, short)) !== null;
  }
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
    console.error(`No short ${shortId}. Run: mm shorts ${slug} make …`);
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
    if (!clip && !lambda) keepPrevious(path.join(ROOT, dir), name);
    if (!(await renderOne(name, output, { shots, offset: short.hook?.from ?? short.from }))) process.exit(1);
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
if (!clip && !look && !lambda) keepPrevious(path.join(ROOT, 'out', slug), slug);
process.exit((await renderOne(slug, output)) ? 0 : 1);
