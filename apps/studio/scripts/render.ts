/**
 * render: a render of one project through the Remotion CLI (so remotion.config.ts applies).
 *
 * Usage: mm render <slug> [--preview[=<what>,…]] [--proxy[=0.5]] [--look=<id>[,<id>…]] [--no-queue] [extra remotion render flags]
 * Output: out/<slug>/<slug>.mp4, plus out/<slug>/<slug>.map.json (every shot with its id, for the
 * mediamake Revisions screen; see scripts/map.ts)
 *
 * Previews (revise-video): a review round renders 10-second stretches, never the whole video.
 * --preview renders the 10 s around what changed (the latest revision's comments) or around each
 * shot, section or second named (--preview=h1.3,hook-2,1:23 or a stretch 40-55), at half size, joined
 * into out/<slug>/preview/<slug>.mp4 with a map that keeps every shot's id and where each stretch sits
 * in the song (scripts/preview.ts). --seconds=<n> for another length. The previous preview is kept
 * in out/<slug>/preview/v<N>/.
 *
 * Earlier cuts are never lost: before a full render replaces out/<slug>/<slug>.mp4, the previous
 * video, its map and its .revisions/ folder are copied into out/<slug>/v<N>/ (the next free number;
 * skipped when an identical copy is already kept there). A clip (--frames=a-b) never touches the
 * main file: it goes to out/<slug>/clips/<slug>-<a>-<b>.mp4. Only the user asks for a cleanup.
 *
 * The whole video at half size (--proxy; --proxy=0.75 for another scale, an explicit --scale wins)
 * goes into the same file as the master, so its review link and map stay the same: only when the user
 * asks to review the whole video. Render the master (no --proxy) once, after the user signs off:
 * thumbnails, upload packs and rotate shorts come only from the master.
 *
 * Look previews (revise-video › Previews or the whole video): --look=<id> passes { "look": "<id>" }
 * as input props (merged into any --props; the project reads it with getInputProps()) and writes
 * out/<slug>/looks/<id>.mp4, the main file untouched. --look=A,B,C,D renders every look on the same
 * stretch (--frames=a-b or one --preview target) and puts them in one labelled grid (look-grid).
 *
 * Speed (refactor step B1): the project's bundle is made once and reused until its code changes
 * (scripts/project-bundle.ts); renders wait their turn in this machine's render queue, so two
 * sessions' renders don't slow each other down (scripts/render-queue.ts; --no-queue skips it); and
 * the CLI runs with the benchmarked concurrency, x264 veryfast for anything but the master, and on
 * macOS the memory it can really use (scripts/render-tuning.ts).
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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lookGrid } from './look-grid.ts';
import { keepPrevious, parseFramesFlag, writeVideoMap, type MapShort } from './map.ts';
import { DIRS, ROOT, shown, studioPath } from './paths.ts';
import { describeStretch, joinPreview, previewPlan } from './preview.ts';
import { projectBundle } from './project-bundle.ts';
import { appendRender } from './render-log.ts';
import { queueDisabled, renderSlot } from './render-queue.ts';
import { remotionRender, tunedFlags } from './render-tuning.ts';
import { reviewLink } from './revision-files.ts';

const [slug, ...rest] = process.argv.slice(2);
const value = (name: string) => rest.find(f => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const shortId = value('short');
const format = value('format');
const lookFlag = value('look');
const looks = lookFlag ? lookFlag.split(',').map(l => l.trim()).filter(Boolean) : [];
const look = looks.length === 1 ? looks[0] : undefined;
const proxy = rest.find(f => f === '--proxy' || f.startsWith('--proxy='));
const previewFlag = rest.find(f => f === '--preview' || f.startsWith('--preview='));
const previewTargets = previewFlag?.includes('=') ? previewFlag.slice('--preview='.length).split(',').map(t => t.trim()).filter(Boolean) : [];
const previewSeconds = Number(value('seconds') ?? 10);
const lambda = rest.includes('--lambda');
const LAMBDA_FLAGS = /^--(window|region|preset|attach)=|^--skip-deploy$|^--direct$|^--lambda$/;
if (!lambda && rest.some(f => LAMBDA_FLAGS.test(f) && f !== '--lambda')) {
  console.error('--window, --region, --preset, --skip-deploy, --direct and --attach go with --lambda.');
  process.exit(1);
}
// the rest go to remotion render
let flags = rest.filter(f => !/^--(short|format|look|seconds)=/.test(f) && f !== proxy && f !== previewFlag && f !== '--no-queue' && !LAMBDA_FLAGS.test(f));
if (!slug) {
  console.error('Usage: mm render <slug> [--preview[=<shot|section|seconds>,…]] [--proxy] [--look=<id>[,<id>…]] [flags]');
  process.exit(1);
}
if (!fs.existsSync(path.join(DIRS.projects, slug, 'manifest.json'))) {
  console.error(
    `No manifest. Run: mm prepare ${slug}`,
  );
  process.exit(1);
}
const fail = (msg: string) => {
  console.error(msg);
  process.exit(1);
};
if (previewFlag && (shortId || lambda)) fail('--preview is for the main video (a short is short: render it whole).');
if (previewFlag && parseFramesFlag(flags)) fail('--preview picks its own stretches: name them (--preview=40-50), or render a clip with --frames alone.');
if (!(previewSeconds > 0)) fail('--seconds takes the preview length in seconds: --seconds=10');
if (looks.length > 1 && lambda) fail('--lambda renders one look at a time: --look=<id>.');

const explicitScale = flags.find(f => f.startsWith('--scale='));
let scale = explicitScale ? Number(explicitScale.slice('--scale='.length)) : 1;
if ((proxy || previewFlag) && !explicitScale) {
  scale = proxy?.includes('=') ? Number(proxy.slice('--proxy='.length)) : 0.5;
  if (!(scale > 0 && scale < 1)) fail('--proxy takes a scale below 1: --proxy or --proxy=0.75');
  flags.push(`--scale=${scale}`);
}

if (looks.length) {
  if (shortId) fail('--look is for the main video, not a short.');
  for (const l of looks) if (!/^[\w.-]+$/.test(l)) fail('--look takes plain ids (letters, digits, - _ .): --look=B or --look=A,B,C');
}
/** --props merged with { look } for each look */
let baseProps: Record<string, unknown> | null = null;
if (looks.length) {
  const propsFlag = flags.find(f => f.startsWith('--props='));
  baseProps = {};
  if (propsFlag) {
    const raw = propsFlag.slice('--props='.length);
    const file = path.resolve(ROOT, raw);
    try {
      baseProps = JSON.parse(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : raw);
    } catch {
      fail('--props must be JSON or a JSON file to merge the look into');
    }
    flags = flags.filter(f => f !== propsFlag);
  }
}
const propsFor = (id: string) => `--props=${JSON.stringify({ ...baseProps, look: id })}`;

let frames = parseFramesFlag(flags);
const windowFlag = value('window');
const songWindow = windowFlag ? parseWindow(windowFlag) : undefined;
const clip = Boolean(frames) || flags.includes('--frames') || Boolean(songWindow);
const framesName = () => (frames ? `${frames.from}-${frames.to === Number.MAX_SAFE_INTEGER ? 'end' : frames.to}` : 'clip');

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
      outDir,
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

/** the project's bundle, made or reused once for every render of this run */
let bundled: ReturnType<typeof projectBundle> | null = null;
const theBundle = () => (bundled ??= projectBundle(slug));

/** the bundle and this machine's render slot, taken once for every render of this run */
let session = null as { serveUrl: string; bundleSeconds: number; queuedSeconds: number } | null;
async function start(what: string) {
  if (session) return session;
  const bundle = await theBundle();
  const asked = Date.now();
  await renderSlot(`${slug} ${what}`, { disabled: queueDisabled(rest) });
  session = { serveUrl: bundle.serveUrl, bundleSeconds: Math.round(bundle.ms / 100) / 10, queuedSeconds: Math.round((Date.now() - asked) / 100) / 10 };
  return session;
}
const isPreviewish = () => Boolean(previewFlag) || clip || looks.length > 0 || scale < 1;
let shownTuning = false;

/** one remotion render from the project's bundle, logged, then its shot map; false when the render failed */
async function renderOne(composition: string, output: string, opts: { short?: MapShort; extra?: string[]; log?: boolean; map?: boolean } = {}): Promise<{ ok: boolean; seconds: number }> {
  if (lambda) {
    // clips/ and looks/ sit one level under the render's folder; the file is named after the composition
    const outDir = clip || look ? path.dirname(path.dirname(output)) : path.dirname(output);
    return { ok: (await renderOnLambdaHere(composition, outDir, opts.short)) !== null, seconds: 0 };
  }
  const s = await start(previewFlag ? 'preview' : looks.length ? `look ${looks.join(',')}` : shortId ? `short ${shortId}` : clip ? `clip ${framesName()}` : scale < 1 ? 'whole video, review' : 'master');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const tuned = tunedFlags([...flags, ...(opts.extra ?? [])], { slug, preview: isPreviewish() });
  if (tuned.notes.length && !shownTuning) {
    shownTuning = true;
    console.log(`Render: ${tuned.notes.join(', ')}`);
  }
  const started = Date.now();
  const r = remotionRender(s.serveUrl, composition, output, tuned.flags);
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  const renderFrames = parseFramesFlag([...flags, ...(opts.extra ?? [])]);
  if (opts.log !== false) {
    try {
      appendRender(output, {
        at: new Date(started).toISOString(),
        scale,
        frames: renderFrames ? [renderFrames.from, renderFrames.to === Number.MAX_SAFE_INTEGER ? null : renderFrames.to] : undefined,
        look: opts.extra?.find(f => f.startsWith('--props=')) ? JSON.parse(opts.extra.find(f => f.startsWith('--props='))!.slice(8)).look : look,
        seconds,
        bundle: s.bundleSeconds,
        queued: s.queuedSeconds,
        ok: r.ok,
      });
    } catch (err) {
      console.warn(`Could not log the render: ${err instanceof Error ? err.message : err}`);
    }
  }
  if (!r.ok) return { ok: false, seconds };
  if (opts.map !== false) {
    try {
      writeVideoMap(slug, output, renderFrames, opts.short);
    } catch (err) {
      // The render is fine without a map; say so and move on.
      console.warn(`Could not write the shot map: ${err instanceof Error ? err.message : err}`);
    }
  }
  return { ok: true, seconds };
}

if (shortId) {
  const shortDir = path.join(DIRS.projects, slug, 'shorts', shortId);
  if (!fs.existsSync(path.join(shortDir, 'short.json'))) {
    console.error(`No short ${shortId}. Run: mm shorts ${slug} make …`);
    process.exit(1);
  }
  // a rotate short starts at its hook, before the stretch
  const short = JSON.parse(fs.readFileSync(path.join(shortDir, 'short.json'), 'utf8')) as { from: number; formats: string[]; hook?: { from: number }; wide?: boolean; video?: string };
  const shots = fs.existsSync(path.join(shortDir, 'shots.json')) ? `shorts/${shortId}/shots.json` : 'video/shots.json';
  // a rotate short with its own stretch: the 16:9 stretch first (unless only another format is asked for
  // and the stretch is already there), so the turned short has its video
  const wideFile = short.wide && short.video ? path.join(DIRS.projects, slug, short.video) : undefined;
  const list = format ? [format] : short.formats;
  if (wideFile && !clip && !list.includes('16x9') && (!format || !fs.existsSync(wideFile))) list.unshift('16x9');
  for (const f of list) {
    const name = `${slug}-${shortId}-${f}`;
    const dir = path.join(DIRS.out, slug, 'shorts', shortId);
    const output = clip ? path.join(dir, 'clips', `${name}-${framesName()}.mp4`) : path.join(dir, `${name}.mp4`);
    if (!clip && !lambda) keepPrevious(dir, name);
    if (!(await renderOne(name, output, { short: { shots, offset: short.hook?.from ?? short.from } })).ok) process.exit(1);
    if (f === '16x9' && wideFile && !clip) {
      // the turned short plays it from the project folder (a hard link: no second copy)
      fs.rmSync(wideFile, { force: true });
      try {
        fs.linkSync(output, wideFile);
      } catch {
        fs.copyFileSync(output, wideFile);
      }
      console.log(`✔ ${shown(wideFile)} ← ${shown(output)}`);
    }
  }
  process.exit(0);
}

if (previewFlag && !looks.length) {
  // 10 s stretches around what changed, joined into one review file (scripts/preview.ts)
  const bundle = await theBundle();
  const plan = await previewPlan(slug, bundle.serveUrl, previewTargets, { seconds: previewSeconds });
  console.log(`Preview from ${plan.source}:`);
  for (const st of plan.stretches) console.log(`  ${describeStretch(st, plan.fps)}`);
  const dir = path.join(DIRS.out, slug, 'preview');
  const output = path.join(dir, `${slug}.mp4`);
  const parts: { file: string; stretch: (typeof plan.stretches)[number] }[] = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `mm-preview-${slug}-`));
  const started = Date.now();
  let renderSeconds = 0;
  try {
    for (const [i, st] of plan.stretches.entries()) {
      const file = path.join(tmp, `part-${i + 1}.mp4`);
      const r = await renderOne(slug, file, { extra: [`--frames=${st.frames[0]}-${st.frames[1]}`], log: false, map: false });
      renderSeconds += r.seconds;
      if (!r.ok) {
        appendRender(output, { at: new Date(started).toISOString(), scale, preview: plan.stretches.map(x => x.frames), seconds: renderSeconds, bundle: session?.bundleSeconds, queued: session?.queuedSeconds, ok: false });
        process.exit(1);
      }
      parts.push({ file, stretch: st });
    }
    keepPrevious(dir, slug);
    const map = joinPreview(slug, parts, output, plan.fps);
    appendRender(output, {
      at: new Date(started).toISOString(),
      scale,
      preview: plan.stretches.map(x => x.frames),
      seconds: Math.round((Date.now() - started) / 100) / 10,
      bundle: session?.bundleSeconds,
      queued: session?.queuedSeconds,
      ok: true,
    });
    const length = map.stretches!.reduce((a, x) => a + x.to - x.from, 0);
    console.log(`✔ ${shown(output)}: ${plan.stretches.length} stretch${plan.stretches.length === 1 ? '' : 'es'}, ${length.toFixed(1)} s of video in ${((Date.now() - started) / 1000).toFixed(1)} s (${map.shots.length} shots in the map)`);
    console.log(`Review link: ${reviewLink(output)}`);
    console.log(`Preflight: mm preflight ${slug} --video=${studioPath(output)}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  process.exit(0);
}

if (looks.length) {
  // every look on one stretch: --frames, or the one stretch --preview names
  if (previewFlag) {
    const bundle = await theBundle();
    const plan = await previewPlan(slug, bundle.serveUrl, previewTargets, { seconds: previewSeconds });
    if (plan.stretches.length !== 1) fail(`Looks are compared on one stretch; --preview gave ${plan.stretches.length}. Name one: --preview=<shot|section|a-b>.`);
    const [a, b] = plan.stretches[0].frames;
    console.log(`Looks on ${describeStretch(plan.stretches[0], plan.fps)}`);
    frames = { from: a, to: b };
    flags.push(`--frames=${a}-${b}`);
  }
  const outputs: string[] = [];
  for (const id of looks) {
    const output = path.join(DIRS.out, slug, 'looks', `${id}.mp4`);
    if (!(await renderOne(slug, output, { extra: [propsFor(id)] })).ok) process.exit(1);
    outputs.push(output);
  }
  if (outputs.length >= 2 && outputs.length <= 4) {
    const grid = lookGrid(outputs, { labels: looks });
    console.log(`✔ ${shown(grid)}`);
    console.log(`Review link: ${reviewLink(grid)}`);
  } else if (outputs.length > 4) console.log('More than four looks: put up to four in a grid with mm look-grid.');
  process.exit(0);
}

const output = clip ? path.join(DIRS.out, slug, 'clips', `${slug}-${framesName()}.mp4`) : path.join(DIRS.out, slug, `${slug}.mp4`);
if (!clip && !lambda) keepPrevious(path.join(DIRS.out, slug), slug);
const ok = (await renderOne(slug, output)).ok;
if (ok && scale < 1 && !clip)
  console.log(
    `The whole video at ${Math.round(scale * 100)}% size. Review rounds preview 10 s stretches instead (mm render ${slug} --preview). ` +
      'Render the master without --proxy once the user signs off.',
  );
process.exit(ok ? 0 : 1);
