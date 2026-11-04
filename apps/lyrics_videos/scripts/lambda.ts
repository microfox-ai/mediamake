/**
 * lambda: render one lyrics_videos project on Remotion Lambda, through mediamake's AWS setup
 * (apps/mediamake/config.mjs: the bucket, the regions, the function presets; the keys in
 * apps/mediamake/.env as REMOTION_AWS_*).
 *
 *   npm run render-project -w lyrics_videos -- <slug> --lambda [--window=10-30 | --frames=a-b] [--proxy] [--look=B]
 *   npm run lambda -w lyrics_videos -- plan <slug>        the routing plan alone (nothing is spent)
 *   npm run lambda -w lyrics_videos -- deploy <slug>      stage + deploy the site, no render
 *   npm run lambda -w lyrics_videos -- sites | functions  what is deployed in the region
 *
 * Lambda renders a site: a bundle of the composition plus its public folder, uploaded to the
 * Lambda bucket. mediamake's own site (`mediamake`) holds the app's compositions; a lyrics project
 * gets its own, `lyrics-<slug>` (+ `-<region>` outside the default region), bundled with
 * ONLY_PROJECT so the other projects' code and fonts stay out of it.
 *
 * The project's inputs travel as that site's public folder. stageProject() clones (APFS, no space
 * taken) exactly the files the project needs into out/<slug>/.lambda/public/<slug>/: the manifest,
 * video/edits.json, the song, every file the manifest's `assets` name, every file edits.json swaps
 * in, fonts/ and derived/, and any '<slug>/…' path written in the project's code. On Lambda,
 * staticFile('<slug>/input/x.png') then resolves to that file on the site, so the manifest goes in
 * as inputProps ({ manifest, edits }) unchanged, swaps and all. deploySite diffs the bucket by
 * content: a second deploy uploads only the files that changed (a re-run after a code change
 * uploads the bundle, not the 600 MB of inputs).
 *
 * The render itself follows render-project's rules: out/<slug>/<slug>.mp4 (the previous one kept
 * in v<N>/), clips/<slug>-<a>-<b>.mp4 for a window, looks/<id>.mp4 for a look; the shot map beside
 * it; a line in out/<slug>/.renders.jsonl with the cost. The cost printed is what Lambda charged
 * for the render's compute (Remotion's accounting); S3 storage and transfer come on top.
 *
 * Routing (apps/mediamake/docs/render-routing.md): before spending, the plan weighs the project's
 * media against the heavy limits (a 1 GB file, 500 MB of media, 5 min of video or 30 min of audio
 * played) and says which way it leans and why. `--lambda` is the pick, so a heavy project still
 * renders when asked; `lambda plan <slug>` shows the plan alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { enableTailwind } from '@remotion/tailwind-v4';
import {
  deploySite,
  downloadMedia,
  getCompositionsOnLambda,
  getFunctions,
  getOrCreateBucket,
  getRenderProgress,
  getSites,
  renderMediaOnLambda,
  type AwsRegion,
} from '@remotion/lambda';
import { speculateFunctionName } from '@remotion/lambda/client';
import {
  formatBytes,
  formatSeconds,
  heavyReason,
  weighMedia,
  type MediaSource,
} from '../../mediamake/lib/render-routing/limits.ts';
import { keepPrevious, writeVideoMap, type MapShort } from './map.ts';
import { onlyProject } from './only-project.ts';
import { appendRender } from './render-log.ts';
import { timestampSnapshots } from './snapshots.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIAMAKE = path.resolve(ROOT, '..', 'mediamake');
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|mkv)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const isUrl = (p: string) => /^(https?:|data:|blob:)/.test(p);

// ---------- mediamake's Lambda config ----------

type RenderPreset = {
  name: string;
  memory: number;
  disk: number;
  timeout: number;
  concurrency: number | undefined;
  timeoutInMilliseconds: number;
  framesPerLambda: number | undefined;
  description: string;
};
type MediamakeConfig = {
  DEFAULT_REGION: AwsRegion;
  AWS_REGIONS: AwsRegion[];
  AWS_RENDER_CONFIGS: Record<string, RenderPreset>;
};

let config: MediamakeConfig | undefined;
/** apps/mediamake/config.mjs (plain JS, read by path so this file type-checks without its types) */
export const mediamakeConfig = async (): Promise<MediamakeConfig> =>
  (config ??= (await import(pathToFileURL(path.join(MEDIAMAKE, 'config.mjs')).href)) as MediamakeConfig);

/** REMOTION_AWS_* from apps/mediamake/.env (+ .env.local), unless already in the environment. */
export const loadAwsEnv = () => {
  for (const name of ['.env', '.env.local']) {
    const file = path.join(MEDIAMAKE, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?(REMOTION_AWS_[A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
    }
  }
  if (!process.env.REMOTION_AWS_ACCESS_KEY_ID || !process.env.REMOTION_AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      `No AWS keys: set REMOTION_AWS_ACCESS_KEY_ID and REMOTION_AWS_SECRET_ACCESS_KEY in ${path.relative(process.cwd(), path.join(MEDIAMAKE, '.env'))} (https://www.remotion.dev/docs/lambda/setup).`,
    );
  }
};

export const pickRegion = async (flag?: string): Promise<AwsRegion> => {
  const { DEFAULT_REGION, AWS_REGIONS } = await mediamakeConfig();
  const region = (flag ?? process.env.REMOTION_AWS_REGION ?? DEFAULT_REGION) as AwsRegion;
  if (!AWS_REGIONS.includes(region)) {
    throw new Error(`Region ${region} is not one mediamake deploys to (${AWS_REGIONS.join(', ')}).`);
  }
  return region;
};

// ---------- the project's files ----------

type Manifest = { audio: { src: string; duration: number }; assets: Record<string, string> };
type Edits = { assets?: Record<string, string> } & Record<string, unknown>;

export type StagedFile = { rel: string; bytes: number };
export type Staged = {
  slug: string;
  publicDir: string;
  manifest: Manifest;
  edits: Edits | null;
  files: StagedFile[];
  /** files the manifest or edits name that are not on disk */
  missing: string[];
  /** manifest keys or paths written as strings in the project's code */
  named: Set<string>;
};

const walk = (dir: string, out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

/** every string literal in the project's code, to know which files it names */
const codeStrings = (projectDir: string): Set<string> => {
  const out = new Set<string>();
  for (const dir of ['video', 'shorts']) {
    for (const file of walk(path.join(projectDir, dir))) {
      if (!/\.(tsx?|jsx?|json)$/.test(file) || file.endsWith('edits.json')) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/['"`]([^'"`\n]{1,300})['"`]/g)) out.add(m[1]);
    }
  }
  return out;
};

/** `out/<slug>/.lambda` */
export const lambdaDir = (slug: string) => path.join(ROOT, 'out', slug, '.lambda');

/**
 * Clones the files the project needs on Lambda into out/<slug>/.lambda/public/<slug>/ (the site's
 * public folder, so staticFile('<slug>/…') finds them there) and returns what went in.
 */
export const stageProject = (slug: string): Staged => {
  const projectDir = path.join(ROOT, 'projects', slug);
  const manifestFile = path.join(projectDir, 'manifest.json');
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`No manifest. Run: npm run prepare-project -w lyrics_videos -- ${slug}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as Manifest;
  const editsFile = path.join(projectDir, 'video', 'edits.json');
  const edits = fs.existsSync(editsFile) ? (JSON.parse(fs.readFileSync(editsFile, 'utf8')) as Edits) : null;
  const strings = codeStrings(projectDir);

  // paths relative to projects/, the way the manifest writes them
  const wanted = new Set<string>([`${slug}/manifest.json`]);
  if (edits) wanted.add(`${slug}/video/edits.json`);
  const add = (p: string | undefined) => {
    if (p && !isUrl(p)) wanted.add(p);
  };
  add(manifest.audio?.src);
  for (const p of Object.values(manifest.assets ?? {})) add(p);
  for (const [from, to] of Object.entries(edits?.assets ?? {})) {
    add(from);
    add(to);
  }
  // folders projects load file by file (fonts named in storyboards, sound effects made by derive-media)
  for (const dir of ['fonts', 'derived']) {
    for (const file of walk(path.join(projectDir, dir))) wanted.add(`${slug}/${path.relative(projectDir, file).split(path.sep).join('/')}`);
  }
  // any other '<slug>/…' path written in the code
  for (const s of strings) if (s.startsWith(`${slug}/`) && fs.existsSync(path.join(ROOT, 'projects', s))) wanted.add(s);

  const named = new Set<string>();
  for (const [key, p] of Object.entries(manifest.assets ?? {})) if (strings.has(key) || strings.has(p)) named.add(p);

  const publicDir = path.join(lambdaDir(slug), 'public');
  fs.rmSync(publicDir, { recursive: true, force: true });
  const files: StagedFile[] = [];
  const missing: string[] = [];
  for (const rel of [...wanted].sort()) {
    const src = path.join(ROOT, 'projects', rel);
    if (!fs.existsSync(src) || fs.statSync(src).isDirectory()) {
      missing.push(rel);
      continue;
    }
    const dst = path.join(publicDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    // a clone where the disk can (APFS), a copy elsewhere
    fs.copyFileSync(fs.realpathSync(src), dst, fs.constants.COPYFILE_FICLONE);
    files.push({ rel, bytes: fs.statSync(dst).size });
  }
  return { slug, publicDir, manifest, edits, files, missing, named };
};

// ---------- the routing plan ----------

export type ProjectPlan = {
  target: 'lambda' | 'local';
  reason: string;
  media: MediaSource[];
  images: { count: number; bytes: number };
  totalBytes: number;
};

/**
 * Weighs the project's media the way the editor weighs a timeline (lib/render-routing): the song
 * plays for the whole video; a clip the code names counts as playing all along (overlays loop
 * under everything), a clip the manifest lists but nothing names is uploaded but not counted.
 * Images are not in the limits (a chunk fetches only the ones its frames show) and are reported.
 */
export const planProject = (staged: Staged): ProjectPlan => {
  const duration = staged.manifest.audio?.duration ?? 0;
  const media: MediaSource[] = [];
  let imageCount = 0;
  let imageBytes = 0;
  for (const { rel, bytes } of staged.files) {
    if (rel === staged.manifest.audio?.src) media.push({ kind: 'audio', src: rel, bytes, usedSeconds: duration });
    else if (AUDIO_EXT.test(rel)) media.push({ kind: 'audio', src: rel, bytes, usedSeconds: staged.named.has(rel) ? duration : 0 });
    else if (VIDEO_EXT.test(rel)) media.push({ kind: 'video', src: rel, bytes, usedSeconds: staged.named.has(rel) ? duration : 0 });
    else if (IMAGE_EXT.test(rel)) {
      imageCount++;
      imageBytes += bytes;
    }
  }
  const weighed = weighMedia(media);
  const totalBytes = staged.files.reduce((t, f) => t + f.bytes, 0);
  const clips = media.filter(m => m.kind === 'video');
  const playing = clips.filter(m => (m.usedSeconds ?? 0) > 0);
  const parts = [
    `the song (${formatBytes(media.find(m => m.src === staged.manifest.audio?.src)?.bytes ?? 0)}, ${formatSeconds(duration)})`,
    ...(clips.length
      ? [`${clips.length} clip${clips.length === 1 ? '' : 's'} (${formatBytes(clips.reduce((t, m) => t + (m.bytes ?? 0), 0))}${playing.length ? `, ${playing.length} playing all along` : ''})`]
      : []),
    ...(imageCount ? [`${imageCount} image${imageCount === 1 ? '' : 's'} (${formatBytes(imageBytes)}, fetched by the chunks that show them)`] : []),
  ];
  const what = parts.join(', ');
  return weighed.weight === 'heavy'
    ? { target: 'local', reason: `${heavyReason(weighed.heavyBecause)} It carries ${what}.`, media, images: { count: imageCount, bytes: imageBytes }, totalBytes }
    : {
        target: 'lambda',
        reason: `Lambda suggested: ${what} is light media, so Lambda renders it fast for little. Local works too.`,
        media,
        images: { count: imageCount, bytes: imageBytes },
        totalBytes,
      };
};

// ---------- the site ----------

export type SiteInfo = {
  siteName: string;
  serveUrl: string;
  region: AwsRegion;
  bucketName: string;
  deployedAt: string;
  files: number;
  bytes: number;
};

const siteFile = (slug: string) => path.join(lambdaDir(slug), 'site.json');
export const savedSite = (slug: string, region: AwsRegion): SiteInfo | null => {
  if (!fs.existsSync(siteFile(slug))) return null;
  const site = JSON.parse(fs.readFileSync(siteFile(slug), 'utf8')) as SiteInfo;
  return site.region === region ? site : null;
};

const line = (text: string) => {
  if (process.stdout.isTTY) process.stdout.write(`\r\x1b[2K${text}`);
};
const endLine = (text: string) => {
  if (process.stdout.isTTY) process.stdout.write(`\r\x1b[2K${text}\n`);
  else console.log(text);
};

/** Bundles the project alone (ONLY_PROJECT) with its staged public folder and uploads it as the site lyrics-<slug>. */
export const deployLyricsSite = async (staged: Staged, region: AwsRegion): Promise<SiteInfo> => {
  const { DEFAULT_REGION } = await mediamakeConfig();
  const { slug } = staged;
  const siteName = region === DEFAULT_REGION ? `lyrics-${slug}` : `lyrics-${slug}-${region}`;
  const { bucketName } = await getOrCreateBucket({ region });
  const bytes = staged.files.reduce((t, f) => t + f.bytes, 0);
  console.log(`Site ${siteName} in ${region} (bucket ${bucketName}): ${staged.files.length} files, ${formatBytes(bytes)} staged`);
  process.env.ONLY_PROJECT = slug;
  const started = Date.now();
  const { serveUrl, stats } = await deploySite({
    bucketName,
    region,
    siteName,
    entryPoint: path.join(ROOT, 'src', 'index.ts'),
    privacy: 'public',
    options: {
      publicDir: staged.publicDir,
      rootDir: ROOT,
      // the same three steps as remotion.config.ts: Tailwind, timestamp snapshots, this project only
      webpackOverride: async c => onlyProject(timestampSnapshots(await enableTailwind(c)), slug),
      onBundleProgress: p => line(`  bundling ${p}%`),
      onDiffingProgress: (b, done) => line(`  comparing with the bucket ${done ? 'done' : formatBytes(b)}`),
      onUploadProgress: u => line(`  uploading ${u.filesUploaded}/${u.totalFiles} files, ${formatBytes(u.sizeUploaded)}/${formatBytes(u.totalSize)}`),
      askAIEnabled: false,
      interactivityEnabled: false,
      keyboardShortcutsEnabled: false,
    },
  });
  endLine(
    `  ✔ ${serveUrl} (${stats.uploadedFiles} uploaded, ${stats.untouchedFiles} unchanged, ${stats.deletedFiles} removed, ${Math.round((Date.now() - started) / 1000)} s)`,
  );
  const site: SiteInfo = { siteName, serveUrl, region, bucketName, deployedAt: new Date().toISOString(), files: staged.files.length, bytes };
  fs.mkdirSync(lambdaDir(slug), { recursive: true });
  fs.writeFileSync(siteFile(slug), `${JSON.stringify(site, null, 2)}\n`);
  return site;
};

// ---------- the render ----------

export type LambdaRenderRequest = {
  slug: string;
  /** the composition id: the slug, or '<slug>-<short>-<format>' */
  composition: string;
  /** out/<slug> or out/<slug>/shorts/<id> */
  outDir: string;
  /** the file's base name (<slug>, or <slug>-<short>-<format>) */
  name: string;
  /** --frames=a-b, inclusive frame numbers */
  frames?: { from: number; to: number };
  /** --window=a-b, song seconds */
  window?: { from: number; to: number };
  look?: string;
  scale: number;
  crf?: number;
  region?: string;
  preset?: string;
  /** reuse the last deployed site instead of staging and deploying again */
  skipDeploy?: boolean;
  short?: MapShort;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Renders on Lambda and brings the file home the way render-project names it. The output path, or null when it failed. */
export const renderOnLambda = async (req: LambdaRenderRequest): Promise<string | null> => {
  loadAwsEnv();
  const { AWS_RENDER_CONFIGS } = await mediamakeConfig();
  const region = await pickRegion(req.region);
  const presetKey = req.preset ?? 'complex-fast';
  const preset = AWS_RENDER_CONFIGS[presetKey];
  if (!preset) throw new Error(`No preset ${presetKey}. One of: ${Object.keys(AWS_RENDER_CONFIGS).join(', ')}`);
  const functionName = speculateFunctionName({ memorySizeInMb: preset.memory, diskSizeInMb: preset.disk, timeoutInSeconds: preset.timeout });
  const deployed = await getFunctions({ region, compatibleOnly: true });
  if (!deployed.some(f => f.functionName === functionName)) {
    throw new Error(`Lambda function ${functionName} is not deployed in ${region}. Deploy mediamake's functions: npm run deploy -w mediamake`);
  }

  // 1. the project's files and the plan
  const staged = stageProject(req.slug);
  if (staged.missing.length) console.warn(`Not on disk (named by the manifest or edits.json): ${staged.missing.join(', ')}`);
  const plan = planProject(staged);
  console.log(`Routing: ${plan.reason}`);
  if (plan.target === 'local') console.log('Rendering on Lambda anyway, as asked (--lambda).');

  // 2. the site
  let site = req.skipDeploy ? savedSite(req.slug, region) : null;
  if (req.skipDeploy && !site) console.log('No site deployed yet for this region; deploying.');
  site ??= await deployLyricsSite(staged, region);

  // 3. the composition's fps and length, from Lambda itself (calculateMetadata runs there with the manifest)
  const inputProps: Record<string, unknown> = {
    manifest: staged.manifest,
    // a short shares its project's folder, not its edits (ProjectVideo)
    edits: req.short ? null : staged.edits,
    ...(req.look ? { look: req.look } : {}),
  };
  // envVariables must be an object: Remotion 4.0.496 measures JSON.stringify(envVariables).length
  const compositions = await getCompositionsOnLambda({ region, functionName, serveUrl: site.serveUrl, inputProps, envVariables: {} });
  const comp = compositions.find(c => c.id === req.composition);
  if (!comp) throw new Error(`The site has no composition ${req.composition} (it has: ${compositions.map(c => c.id).join(', ')}).`);

  let frames = req.frames;
  if (req.window) {
    frames = { from: Math.round(req.window.from * comp.fps), to: Math.round(req.window.to * comp.fps) - 1 };
  }
  if (frames) {
    frames = { from: Math.max(0, frames.from), to: Math.min(comp.durationInFrames - 1, frames.to) };
    if (frames.to < frames.from) throw new Error(`Nothing to render: frames ${frames.from}-${frames.to} of ${comp.durationInFrames}.`);
  }
  const framesToRender = frames ? frames.to - frames.from + 1 : comp.durationInFrames;
  const clip = Boolean(frames);
  const framesName = frames ? `${frames.from}-${frames.to}` : '';
  const output = req.look
    ? path.join(req.outDir, 'looks', `${req.look}.mp4`)
    : clip
      ? path.join(req.outDir, 'clips', `${req.name}-${framesName}.mp4`)
      : path.join(req.outDir, `${req.name}.mp4`);
  if (!clip && !req.look) keepPrevious(req.outDir, req.name);
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const w = Math.round(comp.width * req.scale);
  const h = Math.round(comp.height * req.scale);
  console.log(
    `Render ${req.composition}: ${framesToRender} of ${comp.durationInFrames} frames at ${comp.fps} fps, ${w}×${h}, preset ${presetKey} (${preset.memory} MB, ${preset.framesPerLambda ? `${preset.framesPerLambda} frames per Lambda` : `concurrency ${preset.concurrency}`})`,
  );

  // 4. render, poll, download
  const started = Date.now();
  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl: site.serveUrl,
    composition: req.composition,
    inputProps,
    codec: 'h264',
    audioCodec: 'aac',
    imageFormat: 'jpeg',
    ...(req.crf !== undefined ? { crf: req.crf } : {}),
    scale: req.scale,
    ...(frames ? { frameRange: [frames.from, frames.to] as [number, number] } : {}),
    // Remotion takes one of the two
    ...(preset.concurrency !== undefined ? { concurrency: preset.concurrency } : preset.framesPerLambda ? { framesPerLambda: preset.framesPerLambda } : {}),
    timeoutInMilliseconds: preset.timeoutInMilliseconds,
    privacy: 'private',
    deleteAfter: '1-day',
    maxRetries: 2,
    downloadBehavior: { type: 'download', fileName: path.basename(output) },
  });
  console.log(`  render ${renderId} started`);

  let progress;
  let delay = 2000;
  for (;;) {
    progress = await getRenderProgress({ renderId, bucketName, functionName, region });
    const pct = Math.round((progress.framesRendered / framesToRender) * 100);
    line(
      `  ${progress.framesRendered}/${framesToRender} frames (${pct}%) · ${progress.lambdasInvoked} Lambdas · ${progress.costs.displayCost} · ${Math.round((Date.now() - started) / 1000)} s${progress.encodingStatus ? ` · encoding ${progress.encodingStatus.framesEncoded}` : ''}`,
    );
    if (progress.fatalErrorEncountered) {
      endLine('');
      for (const e of progress.errors) console.error(`  ✗ ${e.name}: ${e.message}${e.frame !== null ? ` (frame ${e.frame})` : ''}${e.stack ? `\n${e.stack.split('\n').slice(0, 6).join('\n')}` : ''}`);
      break;
    }
    if (progress.done) break;
    await sleep(delay);
    delay = Math.min(5000, delay + 500);
  }
  const ok = progress.done && !progress.fatalErrorEncountered;
  if (ok) {
    await downloadMedia({ region, bucketName, renderId, outPath: output, onProgress: ({ percent }) => line(`  downloading ${Math.round(percent * 100)}%`) });
  }
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  const cost = progress.costs.accruedSoFar;
  endLine(ok ? `  ✔ ${path.relative(ROOT, output)} (${formatBytes(progress.outputSizeInBytes ?? fs.statSync(output).size)}, ${seconds} s)` : `  ✗ render failed after ${seconds} s`);

  try {
    appendRender(output, {
      at: new Date(started).toISOString(),
      scale: req.scale,
      frames: frames ? [frames.from, frames.to] : undefined,
      look: req.look,
      seconds,
      ok,
      lambda: { region, renderId, functionName, lambdas: progress.lambdasInvoked, costUsd: cost },
    });
  } catch (err) {
    console.warn(`Could not log the render: ${err instanceof Error ? err.message : err}`);
  }
  if (!ok) return null;
  try {
    writeVideoMap(req.slug, output, frames, req.short);
  } catch (err) {
    console.warn(`Could not write the shot map: ${err instanceof Error ? err.message : err}`);
  }

  // 5. the bill
  console.log(`Cost: ${progress.costs.displayCost} for ${framesToRender} frames on ${progress.lambdasInvoked} Lambdas (compute only; S3 storage and transfer come on top).`);
  if (framesToRender < comp.durationInFrames) {
    const full = (cost / framesToRender) * comp.durationInFrames;
    console.log(`  the whole video (${comp.durationInFrames} frames) would be about $${full.toFixed(2)} at this rate`);
  }
  if (progress.mostExpensiveFrameRanges?.length) {
    const top = progress.mostExpensiveFrameRanges[0];
    console.log(`  slowest chunk: frames ${top.frameRange[0]}-${top.frameRange[1]}, ${Math.round(top.timeInMilliseconds / 1000)} s`);
  }
  return output;
};

// ---------- CLI ----------

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [command, slug, ...rest] = process.argv.slice(2);
  const value = (name: string) => rest.find(f => f.startsWith(`--${name}=`))?.slice(name.length + 3);
  const usage = () => {
    console.error('Usage: npm run lambda -w lyrics_videos -- plan <slug> | deploy <slug> [--region=…] | sites [--region=…] | functions [--region=…]');
    process.exit(1);
  };
  try {
    if (command === 'plan') {
      if (!slug) usage();
      const staged = stageProject(slug);
      const plan = planProject(staged);
      console.log(`${staged.files.length} files, ${formatBytes(plan.totalBytes)} would go up as the site's public folder`);
      for (const m of plan.media) console.log(`  ${m.kind.padEnd(5)} ${formatBytes(m.bytes ?? 0).padStart(8)}  ${m.src}${m.usedSeconds ? `  (plays ${formatSeconds(m.usedSeconds)})` : '  (not named by the code)'}`);
      if (staged.missing.length) console.log(`  missing: ${staged.missing.join(', ')}`);
      console.log(`\n${plan.target === 'lambda' ? 'LAMBDA' : 'LOCAL'} — ${plan.reason}`);
    } else if (command === 'deploy') {
      if (!slug) usage();
      loadAwsEnv();
      const region = await pickRegion(slug.startsWith('--') ? undefined : value('region'));
      const staged = stageProject(slug);
      if (staged.missing.length) console.warn(`Not on disk: ${staged.missing.join(', ')}`);
      console.log(`Routing: ${planProject(staged).reason}`);
      await deployLyricsSite(staged, region);
    } else if (command === 'sites' || command === 'functions') {
      loadAwsEnv();
      const flags = [slug, ...rest].filter(Boolean);
      const regionFlag = flags.find(f => f.startsWith('--region='))?.slice('--region='.length);
      const region = await pickRegion(regionFlag);
      if (command === 'sites') {
        const { sites } = await getSites({ region });
        for (const s of sites) console.log(`${s.id.padEnd(40)} ${formatBytes(s.sizeInBytes).padStart(8)}  ${s.serveUrl}`);
        if (!sites.length) console.log(`No sites in ${region}.`);
      } else {
        const fns = await getFunctions({ region, compatibleOnly: true });
        for (const f of fns) console.log(`${f.functionName.padEnd(58)} ${f.memorySizeInMb} MB, ${f.diskSizeInMb} MB disk, ${f.timeoutInSeconds} s`);
        if (!fns.length) console.log(`No functions in ${region}. Deploy them: npm run deploy -w mediamake`);
      }
    } else usage();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
