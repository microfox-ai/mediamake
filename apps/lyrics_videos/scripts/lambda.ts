/**
 * lambda: render one lyrics_videos project on Remotion Lambda, through mediamake's AWS setup
 * (apps/mediamake/config.mjs: the bucket, the regions, the function presets; the keys in
 * apps/mediamake/.env as REMOTION_AWS_*).
 *
 *   npm run render-project -w lyrics_videos -- <slug> --lambda [--window=10-30 | --frames=a-b] [--proxy] [--look=B]
 *   npm run lambda -w lyrics_videos -- plan <slug>        the routing plan and the preset choice (nothing is spent)
 *   npm run lambda -w lyrics_videos -- pack <slug> [--write]   every file of the pack with advice; --write keeps it as lambda.json
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
 * The pack (what goes up) has rules, projects/<slug>/lambda.json (`lambda pack --write` writes the
 * suggestions): the lossless song encoded to AAC 256 kbps, a clip bigger than the export re-encoded
 * to the export's height (never one with transparency), files the manifest lists but nothing names
 * skipped. Derivatives are made once into out/<slug>/.lambda/derived/ and swapped in for the render
 * only; local renders keep the originals. Over 200 MB the render warns, over 500 MB it refuses.
 * The function preset is chosen from the render (choosePreset) unless --preset or lambda.json says.
 *
 * The render goes through mediamake's API by default (/api/remotion/render on the project's site,
 * /api/remotion/progress until it is done), so it sits in the user's render history, its cost in the
 * platform's cost usage and the quota counted, the same as a render from the editor; the site and
 * the key come from the media library's cloud login (scripts/library/cloud.ts). Deploying the site
 * and reading the composition's length still use the AWS keys on this machine; --direct renders
 * with them too, outside mediamake's books.
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
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ffmpegBin from '@ffmpeg-installer/ffmpeg';
import ffprobeBin from '@ffprobe-installer/ffprobe';
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
const MB = 1024 * 1024;
/** the pack (the files that go up as the site's public folder): a warning past this ... */
export const PACK_WARN_BYTES = 200 * MB;
/** ... and no render past this: every Lambda chunk downloads the media it plays, so a pack this big costs more than it is worth */
export const PACK_MAX_BYTES = 500 * MB;
/** lossless audio above this is encoded for Lambda (AAC 256 kbps: a tenth of the size, transparent to the ear) */
const AUDIO_ENCODE_OVER = 20 * MB;
/** a clip above this that is bigger than the export (taller, or over the bitrate) is re-encoded to the export's size */
const VIDEO_ENCODE_OVER = 40 * MB;
const VIDEO_BITRATE_LIMIT = 12_000_000;
const DEFAULT_CRF = 20;
const LOSSLESS_AUDIO = /^(pcm_|flac|alac|wavpack|tta|ape|mlp|truehd)/;
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

export type StagedFile = { rel: string; bytes: number; /** the project's path when this is a derivative */ from?: string };
export type Staged = {
  slug: string;
  publicDir: string;
  /** the manifest as the render gets it: derivatives in place of the files they replace, skipped files dropped */
  manifest: Manifest;
  /** the edits as the render gets them: a swap for every derivative, so literal asset() paths resolve too */
  edits: Edits | null;
  files: StagedFile[];
  /** files the manifest or edits name that are not on disk */
  missing: string[];
  /** manifest keys or paths written as strings in the project's code */
  named: Set<string>;
  rules: LambdaRules | null;
  derived: Derived[];
  /** input-relative paths lambda.json keeps out of the pack */
  skipped: string[];
  bytes: number;
  check: PackCheck;
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
  const rules = readRules(slug);
  const skipped = (rules?.skip ?? []).map(p => `${slug}/input/${p.replace(/^input\//, '')}`);
  const isSkipped = (p: string) => skipped.includes(p);

  // paths relative to projects/, the way the manifest writes them
  const wanted = new Set<string>([`${slug}/manifest.json`]);
  if (edits) wanted.add(`${slug}/video/edits.json`);
  const add = (p: string | undefined) => {
    if (p && !isUrl(p) && !isSkipped(p)) wanted.add(p);
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
  for (const s of strings) if (s.startsWith(`${slug}/`) && fs.existsSync(path.join(ROOT, 'projects', s))) add(s);

  const named = new Set<string>();
  for (const [key, p] of Object.entries(manifest.assets ?? {})) if (strings.has(key) || strings.has(p)) named.add(p);

  // lambda.json: the song encoded, clips re-encoded to the export's size (never one with transparency)
  const derived: Derived[] = [];
  const replaced = new Map<string, { file: string; rel: string }>();
  const audioRel = manifest.audio?.src;
  if (audioRel && rules?.audio && rules.audio !== 'keep' && wanted.has(audioRel)) {
    const src = path.join(ROOT, 'projects', audioRel);
    if (fs.existsSync(src)) {
      const info = probe(src);
      if (LOSSLESS_AUDIO.test(info.codec)) {
        const outRel = `${audioRel.replace(/\.[^.]+$/, '')}.lambda.m4a`;
        const file = derive(slug, src, outRel, ['-vn', '-c:a', 'aac', '-b:a', rules.audio.bitrate, '-movflags', '+faststart'], { audio: rules.audio });
        replaced.set(audioRel, { file, rel: outRel });
        derived.push({ from: audioRel, to: outRel, bytes: fs.statSync(file).size, fromBytes: fs.statSync(src).size, why: `${info.codec} → aac ${rules.audio.bitrate}` });
      }
    }
  }
  for (const [p, opts] of Object.entries(rules?.videos ?? {})) {
    const rel = `${slug}/input/${p.replace(/^input\//, '')}`;
    const src = path.join(ROOT, 'projects', rel);
    if (!wanted.has(rel) || !fs.existsSync(src)) continue;
    const info = probe(src);
    if (info.kind !== 'video' || info.alpha) continue;
    const height = opts.height ?? exportSize(slug).height;
    const crf = opts.crf ?? DEFAULT_CRF;
    const outRel = `${rel.replace(/\.[^.]+$/, '')}.lambda.mp4`;
    const args = ['-vf', `scale=-2:'min(${height},ih)'`, '-c:v', 'libx264', '-crf', String(crf), '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k'];
    const file = derive(slug, src, outRel, args, { height, crf, v: 1 });
    replaced.set(rel, { file, rel: outRel });
    derived.push({ from: rel, to: outRel, bytes: fs.statSync(file).size, fromBytes: fs.statSync(src).size, why: `${info.width}×${info.height} ${Math.round(info.bitrate / 1e6)} Mbps → ≤${height}p h264 crf ${crf}` });
  }
  for (const [from, { rel }] of replaced) {
    wanted.delete(from);
    wanted.add(rel);
  }

  const publicDir = path.join(lambdaDir(slug), 'public');
  fs.rmSync(publicDir, { recursive: true, force: true });
  const files: StagedFile[] = [];
  const missing: string[] = [];
  const sourceOf = (rel: string) => [...replaced.entries()].find(([, d]) => d.rel === rel);
  for (const rel of [...wanted].sort()) {
    const replacement = sourceOf(rel);
    const src = replacement ? replacement[1].file : path.join(ROOT, 'projects', rel);
    if (!fs.existsSync(src) || fs.statSync(src).isDirectory()) {
      missing.push(rel);
      continue;
    }
    const dst = path.join(publicDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    // a clone where the disk can (APFS), a copy elsewhere
    fs.copyFileSync(fs.realpathSync(src), dst, fs.constants.COPYFILE_FICLONE);
    files.push({ rel, bytes: fs.statSync(dst).size, ...(replacement ? { from: replacement[0] } : {}) });
  }

  // what the render gets: the manifest with derivatives in place and skipped files dropped, the edits with a swap per derivative
  const swap = (p: string) => replaced.get(p)?.rel ?? p;
  const renderManifest: Manifest = {
    ...manifest,
    audio: manifest.audio ? { ...manifest.audio, src: swap(manifest.audio.src) } : manifest.audio,
    assets: Object.fromEntries(Object.entries(manifest.assets ?? {}).filter(([, p]) => !isSkipped(p)).map(([k, p]) => [k, swap(p)])),
  };
  const swaps = Object.fromEntries([...replaced].map(([from, d]) => [from, d.rel]));
  const renderEdits: Edits | null = replaced.size
    ? { schema: 'lyrics_videos.edits/v1', ...(edits ?? {}), assets: { ...Object.fromEntries(Object.entries(edits?.assets ?? {}).map(([k, v]) => [k, swap(v)])), ...swaps } }
    : edits;
  const bytes = files.reduce((t, f) => t + f.bytes, 0);
  return { slug, publicDir, manifest: renderManifest, edits: renderEdits, files, missing, named, rules, derived, skipped, bytes, check: checkPack(bytes) };
};

// ---------- the pack: rules, derivatives, limits ----------

/**
 * projects/<slug>/lambda.json: how the project's media is packed for Lambda. Written by
 * `lambda pack <slug> --write` from the suggestions below, edited by hand or by the render-cloud
 * skill; applied by every Lambda render and deploy. Local renders never see it.
 */
export type LambdaRules = {
  schema: 'lyrics_videos.lambda/v1';
  /** lossless song → AAC at this bitrate ("256k"); "keep" leaves it as it is */
  audio?: 'keep' | { codec: 'aac'; bitrate: string };
  /** input-relative paths that stay out of the pack (unused files the manifest lists) */
  skip?: string[];
  /** input-relative clip → re-encode to this height (export's) and crf */
  videos?: Record<string, { height?: number; crf?: number }>;
  /** a function preset to use instead of the chooser's */
  preset?: string;
  notes?: string;
};
export const RULES_SCHEMA = 'lyrics_videos.lambda/v1';
const rulesFile = (slug: string) => path.join(ROOT, 'projects', slug, 'lambda.json');
export const readRules = (slug: string): LambdaRules | null => {
  if (!fs.existsSync(rulesFile(slug))) return null;
  const rules = JSON.parse(fs.readFileSync(rulesFile(slug), 'utf8')) as LambdaRules;
  if (rules.schema !== RULES_SCHEMA) throw new Error(`${path.relative(ROOT, rulesFile(slug))}: schema must be ${RULES_SCHEMA}`);
  return rules;
};

export type Probe = {
  kind: 'audio' | 'video' | 'other';
  duration: number;
  bitrate: number;
  codec: string;
  width?: number;
  height?: number;
  pixFmt?: string;
  alpha: boolean;
};

/** ffprobe, the way prepare.ts measures the song */
export const probe = (file: string): Probe => {
  const out = execFileSync(
    ffprobeBin.path,
    ['-v', 'error', '-show_entries', 'format=duration,bit_rate:stream=codec_type,codec_name,width,height,pix_fmt,bit_rate', '-of', 'json', file],
    { encoding: 'utf8' },
  );
  const j = JSON.parse(out) as { format?: { duration?: string; bit_rate?: string }; streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number; pix_fmt?: string; bit_rate?: string }[] };
  const video = j.streams?.find(st => st.codec_type === 'video' && (st.width ?? 0) > 1 && !/^(png|mjpeg|bmp|gif)$/.test(st.codec_name ?? ''));
  const audio = j.streams?.find(st => st.codec_type === 'audio');
  const main = video ?? audio;
  const pixFmt = video?.pix_fmt;
  return {
    kind: video ? 'video' : audio ? 'audio' : 'other',
    duration: Number(j.format?.duration) || 0,
    bitrate: Number(j.format?.bit_rate) || Number(main?.bit_rate) || 0,
    codec: main?.codec_name ?? '',
    width: video?.width,
    height: video?.height,
    pixFmt,
    // a clip with transparency must not be re-encoded to h264 (it would lose it)
    alpha: Boolean(pixFmt && /a$|^ya|yuva|rgba|argb|bgra|gbrap/.test(pixFmt)) || (video?.codec_name === 'prores' && /4444/.test(pixFmt ?? '')),
  };
};

/** the export size from projects/<slug>/video/index.tsx (defineProject({ width, height })), else 1080p */
export const exportSize = (slug: string): { width: number; height: number; fps: number; guessed: boolean } => {
  const file = path.join(ROOT, 'projects', slug, 'video', 'index.tsx');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const w = text.match(/\bwidth:\s*(\d+)/)?.[1];
  const h = text.match(/\bheight:\s*(\d+)/)?.[1];
  const f = text.match(/\bfps:\s*(\d+)/)?.[1];
  return { width: Number(w) || 1920, height: Number(h) || 1080, fps: Number(f) || 30, guessed: !(w && h) };
};

const derivedDir = (slug: string) => path.join(lambdaDir(slug), 'derived');

/** runs ffmpeg into out/<slug>/.lambda/derived/<rel> once per source + settings (a sidecar remembers what made it) */
const derive = (slug: string, src: string, outRel: string, args: string[], settings: unknown): string => {
  const out = path.join(derivedDir(slug), outRel);
  const sidecar = `${out}.json`;
  const stat = fs.statSync(src);
  const key = crypto.createHash('sha1').update(JSON.stringify({ size: stat.size, mtimeMs: stat.mtimeMs, settings })).digest('hex');
  if (fs.existsSync(out) && fs.existsSync(sidecar) && JSON.parse(fs.readFileSync(sidecar, 'utf8')).key === key) return out;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = `${out}.${process.pid}.part${path.extname(out)}`;
  line(`  encoding ${outRel}`);
  try {
    execFileSync(ffmpegBin.path, ['-y', '-v', 'error', '-i', src, ...args, tmp], { stdio: ['ignore', 'ignore', 'pipe'] });
    fs.renameSync(tmp, out);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  fs.writeFileSync(sidecar, `${JSON.stringify({ key, source: path.relative(ROOT, src), settings, madeAt: new Date().toISOString() })}\n`);
  endLine(`  ✔ ${outRel} (${formatBytes(fs.statSync(out).size)} from ${formatBytes(stat.size)})`);
  return out;
};

export type Derived = { from: string; to: string; bytes: number; fromBytes: number; why: string };

export type PackCheck = { level: 'ok' | 'warn' | 'reject'; bytes: number; message: string };
/** the pack against PACK_WARN_BYTES / PACK_MAX_BYTES */
export const checkPack = (bytes: number): PackCheck => {
  if (bytes > PACK_MAX_BYTES) {
    return { level: 'reject', bytes, message: `The pack is ${formatBytes(bytes)}, over the ${formatBytes(PACK_MAX_BYTES)} limit for a Lambda render: every chunk downloads the media it plays. Run \`npm run lambda -- pack <slug>\` and apply its advice (encode the song, re-encode or cut oversized clips, skip unused files), or render locally.` };
  }
  if (bytes > PACK_WARN_BYTES) {
    return { level: 'warn', bytes, message: `The pack is ${formatBytes(bytes)}, over ${formatBytes(PACK_WARN_BYTES)}: fine, but every chunk downloads the media it plays, so \`npm run lambda -- pack <slug>\` may find savings.` };
  }
  return { level: 'ok', bytes, message: `Pack ${formatBytes(bytes)}` };
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

// ---------- the pack report ----------

export type PackAdvice = { rel: string; bytes: number; kind: string; note: string; rule?: Partial<LambdaRules> };

/** every file in the pack with what it is and what to do about it; the rules the advice adds up to */
export const packReport = (staged: Staged): { advice: PackAdvice[]; suggested: LambdaRules } => {
  const { slug } = staged;
  const size = exportSize(slug);
  const advice: PackAdvice[] = [];
  const suggested: LambdaRules = { schema: RULES_SCHEMA, ...(staged.rules ?? {}) };
  const inputRel = (rel: string) => rel.replace(`${slug}/input/`, '');
  for (const f of staged.files) {
    const src = path.join(ROOT, 'projects', f.rel);
    const isMedia = AUDIO_EXT.test(f.rel) || VIDEO_EXT.test(f.rel);
    if (f.from) {
      const d = staged.derived.find(x => x.to === f.rel)!;
      advice.push({ rel: f.rel, bytes: f.bytes, kind: AUDIO_EXT.test(f.rel) ? 'audio' : 'video', note: `made for Lambda from ${inputRel(d.from)} (${formatBytes(d.fromBytes)}): ${d.why}` });
      continue;
    }
    if (!isMedia) {
      if (IMAGE_EXT.test(f.rel) && f.bytes > 8 * MB) advice.push({ rel: f.rel, bytes: f.bytes, kind: 'image', note: 'a big image: if it is a PNG photo, a JPEG at quality 90 is a fraction of it (the project must name the new file)' });
      else advice.push({ rel: f.rel, bytes: f.bytes, kind: IMAGE_EXT.test(f.rel) ? 'image' : 'file', note: '' });
      continue;
    }
    if (!fs.existsSync(src)) continue;
    const info = probe(src);
    const isSong = f.rel === staged.manifest.audio?.src;
    const unused = !isSong && !staged.named.has(f.rel);
    if (unused) {
      advice.push({ rel: f.rel, bytes: f.bytes, kind: info.kind, note: 'the manifest lists it but nothing in the code names it: skip it (check the code first)', rule: { skip: [inputRel(f.rel)] } });
      suggested.skip = [...new Set([...(suggested.skip ?? []), inputRel(f.rel)])];
      continue;
    }
    if (info.kind === 'audio') {
      if (LOSSLESS_AUDIO.test(info.codec) && f.bytes > AUDIO_ENCODE_OVER) {
        const est = Math.round((info.duration * 256_000) / 8);
        advice.push({ rel: f.rel, bytes: f.bytes, kind: 'audio', note: `${info.codec} ${Math.round(info.bitrate / 1000)} kbps: encode to AAC 256 kbps for Lambda (about ${formatBytes(est)}; the local master keeps the ${path.extname(f.rel).slice(1)})`, rule: { audio: { codec: 'aac', bitrate: '256k' } } });
        if (!suggested.audio) suggested.audio = { codec: 'aac', bitrate: '256k' };
      } else advice.push({ rel: f.rel, bytes: f.bytes, kind: 'audio', note: `${info.codec} ${Math.round(info.bitrate / 1000)} kbps: fine as it is` });
      continue;
    }
    const dims = `${info.width}×${info.height}, ${(info.bitrate / 1e6).toFixed(1)} Mbps, ${formatSeconds(info.duration)}`;
    const oversized = (info.height ?? 0) > size.height || info.bitrate > VIDEO_BITRATE_LIMIT;
    const long = info.duration > 60 ? ` ${formatSeconds(info.duration)} long: if a scene plays only a stretch of it, cut that stretch (render-cloud skill) instead of uploading it all.` : '';
    if (info.alpha) advice.push({ rel: f.rel, bytes: f.bytes, kind: 'video', note: `${dims}, with transparency: kept as it is (h264 would lose the alpha).${long}` });
    else if (f.bytes > VIDEO_ENCODE_OVER && oversized) {
      advice.push({ rel: f.rel, bytes: f.bytes, kind: 'video', note: `${dims}: bigger than the ${size.height}p export needs; re-encode to ≤${size.height}p h264 crf ${DEFAULT_CRF}.${long}`, rule: { videos: { [inputRel(f.rel)]: { height: size.height, crf: DEFAULT_CRF } } } });
      suggested.videos = { ...(suggested.videos ?? {}), [inputRel(f.rel)]: { height: size.height, crf: DEFAULT_CRF } };
    } else advice.push({ rel: f.rel, bytes: f.bytes, kind: 'video', note: `${dims}: ${f.bytes > VIDEO_ENCODE_OVER ? 'already at the export\'s size and bitrate, kept' : 'a reasonable size, kept'}.${long}` });
  }
  return { advice, suggested };
};

export const writeRules = (slug: string, rules: LambdaRules) => {
  const clean: LambdaRules = { schema: RULES_SCHEMA };
  if (rules.audio) clean.audio = rules.audio;
  if (rules.skip?.length) clean.skip = [...rules.skip].sort();
  if (rules.videos && Object.keys(rules.videos).length) clean.videos = rules.videos;
  if (rules.preset) clean.preset = rules.preset;
  if (rules.notes) clean.notes = rules.notes;
  fs.writeFileSync(rulesFile(slug), `${JSON.stringify(clean, null, 2)}\n`);
  return rulesFile(slug);
};

// ---------- the function preset ----------

export type PresetChoice = { key: string; reason: string };

/**
 * Which of mediamake's AWS_RENDER_CONFIGS fits a render. What matters for a lyrics project is that
 * every Lambda chunk downloads the media it plays (the song, the overlay clips) before it renders a
 * frame, so the number of chunks is the cost of media-heavy renders, and short chunks must still fit
 * a function's timeout. (render-cloud skill: "Which preset".)
 */
export const choosePreset = (c: { frames: number; fps: number; scale: number; playingClips: number; playingBytes: number; packBytes: number }): PresetChoice => {
  const seconds = c.frames / c.fps;
  const media = formatBytes(c.playingBytes);
  if (seconds <= 30 && c.playingClips === 0 && c.playingBytes <= 30 * MB) {
    return { key: 'lightweight', reason: `${formatSeconds(seconds)} with no clips and ${media} of media: the smallest function does it for the least` };
  }
  if (c.scale < 1) {
    return { key: 'basic-fast', reason: `a ${Math.round(c.scale * 100)}% review render: small frames need little memory, and its 15 min timeout leaves room for the ${media} each chunk downloads` };
  }
  if (seconds > 30 * 60) {
    return { key: 'enterprise', reason: `${formatSeconds(seconds)} of video: the most memory and the finest split keep every chunk well inside the timeout` };
  }
  if (seconds > 15 * 60) {
    return { key: 'complex-slow', reason: `${formatSeconds(seconds)} of video: 20 chunks at a time keep a long render clear of AWS's concurrency limit` };
  }
  if ((c.playingClips >= 2 || c.playingBytes >= 120 * MB) && c.frames >= 3000) {
    return { key: 'broadcast', reason: `${c.playingClips} clips playing and ${media} downloaded by every chunk: 30 big chunks on 6 GB functions download the media 30 times, not 100, and decode it faster` };
  }
  if (c.playingBytes <= 30 * MB && seconds <= 3 * 60) {
    return { key: 'classic', reason: `${formatSeconds(seconds)} with ${media} of media: light chunks finish well inside its 4 min timeout` };
  }
  return { key: 'complex-fast', reason: `${formatSeconds(seconds)}, ${c.playingClips} clip${c.playingClips === 1 ? '' : 's'} playing, ${media} per chunk: 75-frame chunks on 3 GB functions with a 15 min timeout, the safe default` };
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
  /** straight to AWS, not through mediamake's API (no render record, cost usage or quota there) */
  direct?: boolean;
  short?: MapShort;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Renders on Lambda and brings the file home the way render-project names it. The output path, or null when it failed. */
export const renderOnLambda = async (req: LambdaRenderRequest): Promise<string | null> => {
  loadAwsEnv();
  const { AWS_RENDER_CONFIGS } = await mediamakeConfig();
  const region = await pickRegion(req.region);
  const deployed = await getFunctions({ region, compatibleOnly: true });
  const functionFor = (key: string) => {
    const preset = AWS_RENDER_CONFIGS[key];
    if (!preset) throw new Error(`No preset ${key}. One of: ${Object.keys(AWS_RENDER_CONFIGS).join(', ')}`);
    const functionName = speculateFunctionName({ memorySizeInMb: preset.memory, diskSizeInMb: preset.disk, timeoutInSeconds: preset.timeout });
    if (!deployed.some(f => f.functionName === functionName)) {
      throw new Error(`Lambda function ${functionName} (preset ${key}) is not deployed in ${region}. Deploy mediamake's functions: npm run deploy -w mediamake`);
    }
    return { preset, functionName };
  };

  // 1. the project's files (lambda.json applied), the pack's size, the plan
  const staged = stageProject(req.slug);
  if (staged.missing.length) console.warn(`Not on disk (named by the manifest or edits.json): ${staged.missing.join(', ')}`);
  for (const d of staged.derived) console.log(`  ${d.to.replace(`${req.slug}/`, '')}: ${formatBytes(d.bytes)} for Lambda instead of ${formatBytes(d.fromBytes)} (${d.why})`);
  if (staged.skipped.length) console.log(`  skipped (lambda.json): ${staged.skipped.map(p => p.replace(`${req.slug}/input/`, '')).join(', ')}`);
  if (staged.check.level === 'reject') throw new Error(staged.check.message);
  if (staged.check.level === 'warn') console.warn(`⚠ ${staged.check.message}`);
  else console.log(`${staged.check.message} (${staged.files.length} files)`);
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
  // any deployed function reads the compositions; the render's own is chosen once the length is known
  const metaFunction = functionFor(req.preset ?? staged.rules?.preset ?? 'complex-fast').functionName;
  // envVariables must be an object: Remotion 4.0.496 measures JSON.stringify(envVariables).length
  const compositions = await getCompositionsOnLambda({ region, functionName: metaFunction, serveUrl: site.serveUrl, inputProps, envVariables: {} });
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

  // the function preset: --preset, else lambda.json, else chosen from the render
  const playing = plan.media.filter(m => (m.usedSeconds ?? 0) > 0);
  const chosen = choosePreset({
    frames: framesToRender,
    fps: comp.fps,
    scale: req.scale,
    playingClips: playing.filter(m => m.kind === 'video').length,
    playingBytes: playing.reduce((t, m) => t + (m.bytes ?? 0), 0),
    packBytes: staged.bytes,
  });
  const presetKey = req.preset ?? staged.rules?.preset ?? chosen.key;
  const { preset, functionName } = functionFor(presetKey);
  console.log(`Preset ${presetKey}${presetKey === chosen.key ? `: ${chosen.reason}` : ` (${req.preset ? '--preset' : 'lambda.json'}; the chooser would take ${chosen.key}: ${chosen.reason})`}`);
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

  // 4. render, poll, download: through mediamake (its render records, cost usage and quota), or AWS directly
  const started = Date.now();
  const request = {
    composition: req.composition,
    inputProps,
    frames,
    scale: req.scale,
    crf: req.crf,
    output,
    region,
    functionName,
    presetKey,
    preset,
    site,
  };
  const progress = req.direct ? await renderDirect(request) : await renderThroughMediamake(request);
  const ok = progress.done && !progress.fatalErrorEncountered;
  if (!ok) for (const e of progress.errors) console.error(`  ✗ ${e.name}: ${e.message}${e.frame != null ? ` (frame ${e.frame})` : ''}${e.stack ? `\n${e.stack.split('\n').slice(0, 6).join('\n')}` : ''}`);
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
      lambda: { region, renderId: progress.renderId, functionName, lambdas: progress.lambdasInvoked, costUsd: cost, through: req.direct ? 'aws' : 'mediamake' },
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

type RenderCall = {
  composition: string;
  inputProps: Record<string, unknown>;
  frames?: { from: number; to: number };
  scale: number;
  crf?: number;
  output: string;
  region: AwsRegion;
  functionName: string;
  presetKey: string;
  preset: RenderPreset;
  site: SiteInfo;
};

/** what both ways report back: Remotion's render progress, as far as this script reads it */
type Progress = {
  renderId: string;
  done: boolean;
  fatalErrorEncountered: boolean;
  errors: { name?: string; message: string; frame?: number | null; stack?: string }[];
  framesRendered: number;
  lambdasInvoked: number;
  costs: { accruedSoFar: number; displayCost: string };
  outputSizeInBytes: number | null;
  mostExpensiveFrameRanges?: { frameRange: [number, number]; timeInMilliseconds: number }[] | null;
};

const framesIn = (c: RenderCall) => (c.frames ? c.frames.to - c.frames.from + 1 : undefined);
const progressLine = (p: Progress, total: number | undefined, started: number, extra = '') =>
  line(`  ${p.framesRendered}${total ? `/${total}` : ''} frames${total ? ` (${Math.round((p.framesRendered / total) * 100)}%)` : ''} · ${p.lambdasInvoked} Lambdas · ${p.costs.displayCost} · ${Math.round((Date.now() - started) / 1000)} s${extra}`);

/**
 * The default: mediamake's /api/remotion/render starts the render on the project's site, its
 * /api/remotion/progress reports and records it (the render in the user's history, the cost in the
 * platform's cost usage, the quota counted), and the file comes back from Lambda's public URL. The
 * site is MEDIAMAKE_API_URL or `url` in ~/.mediamake/config.json; the key is MEDIAMAKE_API_KEY or the
 * one `media cloud login` keeps in the Keychain (none needed for a local dev server).
 */
const renderThroughMediamake = async (c: RenderCall): Promise<Progress> => {
  const { connect, keySource } = await import('./library/cloud.ts');
  const cloud = connect();
  console.log(`  through ${cloud.url} (key: ${keySource(cloud.url)})`);
  const started = Date.now();
  const startResponse = await cloud.post<{ type?: string; message?: string; renderId?: string; bucketName?: string; routing?: { recommended: string; reason: string } }>('api/remotion/render', {
    id: c.composition,
    inputProps: c.inputProps,
    isDownloadable: true,
    fileName: path.basename(c.output),
    codec: 'h264',
    audioCodec: 'aac',
    renderType: 'video',
    configMode: 'preset',
    awsRenderPreset: c.presetKey,
    region: c.region,
    siteName: c.site.siteName,
    ...(c.frames ? { frameRange: [c.frames.from, c.frames.to] } : {}),
    ...(c.scale !== 1 ? { scale: c.scale } : {}),
    ...(c.crf !== undefined ? { crf: c.crf } : {}),
    tags: ['lyrics_videos', c.site.siteName.replace(/^lyrics-/, '').replace(new RegExp(`-${c.region}$`), '')],
  });
  if (startResponse.type === 'error' || !startResponse.renderId || !startResponse.bucketName) {
    throw new Error(`mediamake did not start the render: ${startResponse.message ?? JSON.stringify(startResponse)}`);
  }
  const { renderId, bucketName } = startResponse;
  console.log(`  render ${renderId} started (in your mediamake render history)`);
  let delay = 2000;
  for (;;) {
    const r = await cloud.get<{ type: 'progress' | 'done' | 'error'; message?: string; url?: string; renderInfo?: Progress }>('api/remotion/progress', { bucketName, id: renderId });
    const info = r.renderInfo;
    if (!info) throw new Error(`mediamake answered without progress: ${r.message ?? JSON.stringify(r)}`);
    const progress: Progress = { ...info, renderId, errors: info.errors ?? [] };
    progressLine(progress, framesIn(c), started);
    if (r.type === 'error' || progress.fatalErrorEncountered) {
      endLine('');
      if (!progress.errors.length && r.message) progress.errors.push({ message: r.message });
      return { ...progress, done: false, fatalErrorEncountered: true };
    }
    if (r.type === 'done' && r.url) {
      line('  downloading');
      await cloud.download(r.url, c.output);
      return { ...progress, done: true };
    }
    await sleep(delay);
    delay = Math.min(5000, delay + 500);
  }
};

/** --direct: straight to AWS with the keys on this machine; nothing of it reaches mediamake's records. */
const renderDirect = async (c: RenderCall): Promise<Progress> => {
  const started = Date.now();
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: c.region,
    functionName: c.functionName,
    serveUrl: c.site.serveUrl,
    composition: c.composition,
    inputProps: c.inputProps,
    codec: 'h264',
    audioCodec: 'aac',
    imageFormat: 'jpeg',
    ...(c.crf !== undefined ? { crf: c.crf } : {}),
    scale: c.scale,
    ...(c.frames ? { frameRange: [c.frames.from, c.frames.to] as [number, number] } : {}),
    // Remotion takes one of the two
    ...(c.preset.concurrency !== undefined ? { concurrency: c.preset.concurrency } : c.preset.framesPerLambda ? { framesPerLambda: c.preset.framesPerLambda } : {}),
    timeoutInMilliseconds: c.preset.timeoutInMilliseconds,
    privacy: 'private',
    deleteAfter: '1-day',
    maxRetries: 2,
    downloadBehavior: { type: 'download', fileName: path.basename(c.output) },
  });
  console.log(`  render ${renderId} started (directly on AWS)`);
  let delay = 2000;
  for (;;) {
    const p = await getRenderProgress({ renderId, bucketName, functionName: c.functionName, region: c.region });
    progressLine(p, framesIn(c), started, p.encodingStatus ? ` · encoding ${p.encodingStatus.framesEncoded}` : '');
    if (p.fatalErrorEncountered) {
      endLine('');
      return p;
    }
    if (p.done) {
      await downloadMedia({ region: c.region, bucketName, renderId, outPath: c.output, onProgress: ({ percent }) => line(`  downloading ${Math.round(percent * 100)}%`) });
      return p;
    }
    await sleep(delay);
    delay = Math.min(5000, delay + 500);
  }
};

// ---------- CLI ----------

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [command, slug, ...rest] = process.argv.slice(2);
  const value = (name: string) => rest.find(f => f.startsWith(`--${name}=`))?.slice(name.length + 3);
  const usage = () => {
    console.error('Usage: npm run lambda -w lyrics_videos -- plan <slug> | pack <slug> [--write] | deploy <slug> [--region=…] | sites [--region=…] | functions [--region=…]');
    process.exit(1);
  };
  try {
    if (command === 'plan') {
      if (!slug) usage();
      const staged = stageProject(slug);
      const plan = planProject(staged);
      console.log(`${staged.files.length} files, ${formatBytes(plan.totalBytes)} would go up as the site's public folder${staged.rules ? ' (lambda.json applied)' : ''}`);
      for (const m of plan.media) console.log(`  ${m.kind.padEnd(5)} ${formatBytes(m.bytes ?? 0).padStart(8)}  ${m.src}${m.usedSeconds ? `  (plays ${formatSeconds(m.usedSeconds)})` : '  (not named by the code)'}`);
      if (staged.skipped.length) console.log(`  skipped: ${staged.skipped.join(', ')}`);
      if (staged.missing.length) console.log(`  missing: ${staged.missing.join(', ')}`);
      console.log(`${staged.check.level === 'ok' ? '' : staged.check.level === 'warn' ? '⚠ ' : '✗ '}${staged.check.message}`);
      console.log(`\n${plan.target === 'lambda' ? 'LAMBDA' : 'LOCAL'} — ${plan.reason}`);
      const size = exportSize(slug);
      const full = Math.ceil(staged.manifest.audio.duration * size.fps);
      const playing = plan.media.filter(m => (m.usedSeconds ?? 0) > 0);
      const choice = (frames: number, scale: number) => choosePreset({ frames, fps: size.fps, scale, playingClips: playing.filter(m => m.kind === 'video').length, playingBytes: playing.reduce((t, m) => t + (m.bytes ?? 0), 0), packBytes: staged.bytes });
      const whole = choice(full, 1);
      const review = choice(full, 0.5);
      const window = choice(20 * size.fps, 1);
      console.log(`Preset for the whole video: ${whole.key} (${whole.reason})`);
      console.log(`  a half-size review: ${review.key}; a 20 s window: ${window.key}${staged.rules?.preset ? `; lambda.json says ${staged.rules.preset}` : ''}`);
    } else if (command === 'pack') {
      if (!slug) usage();
      const staged = stageProject(slug);
      const { advice, suggested } = packReport(staged);
      const size = exportSize(slug);
      console.log(`Pack for ${slug}: ${staged.files.length} files, ${formatBytes(staged.bytes)}${staged.rules ? ' with lambda.json applied' : ''}; the export is ${size.width}×${size.height}${size.guessed ? ' (guessed)' : ''}`);
      for (const a of advice.sort((x, y) => y.bytes - x.bytes)) console.log(`  ${formatBytes(a.bytes).padStart(8)}  ${a.kind.padEnd(5)}  ${a.rel.replace(`${slug}/`, '')}${a.note ? `\n              ${a.note}` : ''}`);
      if (staged.missing.length) console.log(`  missing: ${staged.missing.join(', ')}`);
      console.log(`${staged.check.level === 'ok' ? '✔' : staged.check.level === 'warn' ? '⚠' : '✗'} ${staged.check.message}`);
      const changes = advice.filter(a => a.rule);
      if (changes.length) {
        if (rest.includes('--write') || slug === '--write') {
          const file = writeRules(slug, suggested);
          console.log(`Wrote ${path.relative(ROOT, file)}: ${changes.length} rule${changes.length === 1 ? '' : 's'}. Run \`lambda pack ${slug}\` again to see the pack with it applied.`);
        } else console.log(`${changes.length} suggestion${changes.length === 1 ? '' : 's'} above. --write puts them in projects/${slug}/lambda.json (then every Lambda render applies them; local renders don't).`);
      } else console.log('Nothing to change.');
    } else if (command === 'deploy') {
      if (!slug) usage();
      loadAwsEnv();
      const region = await pickRegion(slug.startsWith('--') ? undefined : value('region'));
      const staged = stageProject(slug);
      if (staged.missing.length) console.warn(`Not on disk: ${staged.missing.join(', ')}`);
      if (staged.check.level === 'reject') throw new Error(staged.check.message);
      if (staged.check.level === 'warn') console.warn(`⚠ ${staged.check.message}`);
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
