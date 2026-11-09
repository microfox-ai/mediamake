/**
 * lambda: render one studio project on Remotion Lambda, through mediamake's AWS setup
 * (apps/mediamake/config.mjs: the bucket, the regions, the function presets; the keys in
 * apps/mediamake/.env as REMOTION_AWS_*).
 *
 *   mm render <slug> --lambda [--window=10-30 | --frames=a-b] [--proxy] [--look=B]
 *   mm lambda plan <slug>        the routing plan and the preset choice (nothing is spent)
 *   mm lambda pack <slug> [--write]   every file of the pack with advice; --write keeps it as lambda.json
 *   mm lambda deploy <slug>      stage + deploy the site, no render
 *   mm lambda sites | functions  what is deployed in the region
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
 * suggestions, and suggests only what the limits need: a render is render-bound, so a lighter pack
 * does not cut the cost): the lossless song encoded to AAC 256 kbps, a clip bigger than the export
 * re-encoded to the export's height (never one with transparency), files the manifest lists but
 * nothing names skipped. Derivatives are made once into out/<slug>/.lambda/derived/ and swapped in for the render
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
import { estimatePrice, speculateFunctionName } from '@remotion/lambda/client';
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
import { DIRS, shown } from './paths.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIAMAKE = path.resolve(ROOT, '..', 'mediamake');
const MB = 1024 * 1024;
/** the pack (the files that go up as the site's public folder): a warning past this ... */
export const PACK_WARN_BYTES = 200 * MB;
/** ... and no render past this: every Lambda chunk downloads the media it plays, so a pack this big costs more than it is worth */
export const PACK_MAX_BYTES = 500 * MB;
/**
 * Optimising is only worth its time when it keeps the pack under the limits, a chunk clear of its timeout,
 * or cuts what every frame has to do: a lyrics render is render-bound (wakeup-waveform, 2026-11-04: 75
 * frames with two 1080p overlays took ~175 s with the song as a 73 MB WAV and as an 8 MB AAC alike).
 * So `pack` suggests encoding the song, re-encoding a clip for its bitrate or skipping unused files
 * only once the pack is over PACK_WARN_BYTES, or a single file over FILE_ENCODE_OVER; a clip taller
 * than the export is the one thing suggested on sight, since every frame decodes it.
 */
const FILE_ENCODE_OVER = 100 * MB;
/** lossless audio above this is worth encoding when the pack needs it (AAC 256 kbps: a tenth of the size, transparent to the ear) */
const AUDIO_ENCODE_OVER = 20 * MB;
/** a clip above this that is over the export's bitrate is worth re-encoding when the pack needs it */
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
export const lambdaDir = (slug: string) => path.join(DIRS.out, slug, '.lambda');

/**
 * Clones the files the project needs on Lambda into out/<slug>/.lambda/public/<slug>/ (the site's
 * public folder, so staticFile('<slug>/…') finds them there) and returns what went in.
 */
export const stageProject = (slug: string): Staged => {
  const projectDir = path.join(DIRS.projects, slug);
  const manifestFile = path.join(projectDir, 'manifest.json');
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`No manifest. Run: mm prepare ${slug}`);
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
  for (const s of strings) if (s.startsWith(`${slug}/`) && fs.existsSync(path.join(DIRS.projects, s))) add(s);

  const named = new Set<string>();
  for (const [key, p] of Object.entries(manifest.assets ?? {})) if (strings.has(key) || strings.has(p)) named.add(p);

  // lambda.json: the song encoded, clips re-encoded to the export's size (never one with transparency)
  const derived: Derived[] = [];
  const replaced = new Map<string, { file: string; rel: string }>();
  const audioRel = manifest.audio?.src;
  if (audioRel && rules?.audio && rules.audio !== 'keep' && wanted.has(audioRel)) {
    const src = path.join(DIRS.projects, audioRel);
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
    const src = path.join(DIRS.projects, rel);
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
    const src = replacement ? replacement[1].file : path.join(DIRS.projects, rel);
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
const rulesFile = (slug: string) => path.join(DIRS.projects, slug, 'lambda.json');
export const readRules = (slug: string): LambdaRules | null => {
  if (!fs.existsSync(rulesFile(slug))) return null;
  const rules = JSON.parse(fs.readFileSync(rulesFile(slug), 'utf8')) as LambdaRules;
  if (rules.schema !== RULES_SCHEMA) throw new Error(`${shown(rulesFile(slug))}: schema must be ${RULES_SCHEMA}`);
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
  const file = path.join(DIRS.projects, slug, 'video', 'index.tsx');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  // a frame size has 3–5 digits; a stroke width or a column width is not it
  const w = text.match(/\bwidth:\s*(\d{3,5})\b/)?.[1];
  const h = text.match(/\bheight:\s*(\d{3,5})\b/)?.[1];
  const f = text.match(/\bfps:\s*(\d{2,3})\b/)?.[1];
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

/** the slowest chunk's seconds per frame from the project's last finished Lambda render on a 3 GB function (out/<slug>/.renders.jsonl), if any */
export type Measurement = {
  /** one tab on 3 GB, the chooser's unit (worked back from the tier it was measured on) */
  secondsPerFrame: number;
  /** as measured: seconds a frame in the slowest chunk on that function with that many tabs */
  effective: number;
  memory: number;
  tabs: number;
  /** USD per frame the measuring render cost, every chunk averaged */
  costPerFrame?: number;
  at: string;
  frames?: [number, number | null];
};
export const measuredSecondsPerFrame = (slug: string): Measurement | undefined => {
  const log = path.join(DIRS.out, slug, '.renders.jsonl');
  if (!fs.existsSync(log)) return undefined;
  const entries = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }) as { at: string; ok: boolean; scale: number; frames?: [number, number | null]; lambda?: { slowestChunkSecondsPerFrame?: number; functionName: string; costUsd?: number; config?: { concurrencyPerLambda?: number } } }[];
  const last = entries.filter(e => e.ok && e.scale >= 1 && e.lambda?.slowestChunkSecondsPerFrame).at(-1);
  if (!last?.lambda?.slowestChunkSecondsPerFrame) return undefined;
  // back to "one tab on 3 GB": the chooser's unit (the same gains it assumes, in reverse)
  const memory = Number(last.lambda.functionName.match(/mem(\d+)mb/)?.[1]) || 3008;
  const tabs = last.lambda.config?.concurrencyPerLambda ?? 1;
  const singleTabGain = Math.min(2, Math.max(0.6, (memory / 3008) ** 0.5));
  const perChunkFrame = last.lambda.slowestChunkSecondsPerFrame;
  const frames = last.frames ? (last.frames[1] ?? 0) - last.frames[0] + 1 : undefined;
  return {
    secondsPerFrame: Math.round(perChunkFrame * singleTabGain * (1 + (tabs - 1) * TAB_GAIN) * 10) / 10,
    effective: perChunkFrame,
    memory,
    tabs,
    costPerFrame: last.lambda.costUsd && frames && last.frames?.[1] ? last.lambda.costUsd / frames : undefined,
    at: last.at,
    frames: last.frames,
  };
};

export type PackCheck = { level: 'ok' | 'warn' | 'reject'; bytes: number; message: string };
/** the pack against PACK_WARN_BYTES / PACK_MAX_BYTES */
export const checkPack = (bytes: number): PackCheck => {
  if (bytes > PACK_MAX_BYTES) {
    return { level: 'reject', bytes, message: `The pack is ${formatBytes(bytes)}, over the ${formatBytes(PACK_MAX_BYTES)} limit for a Lambda render: every chunk downloads the media it plays. Run \`mm lambda pack <slug>\` and apply its advice (encode the song, re-encode or cut oversized clips, skip unused files), or render locally.` };
  }
  if (bytes > PACK_WARN_BYTES) {
    return { level: 'warn', bytes, message: `The pack is ${formatBytes(bytes)}, over ${formatBytes(PACK_WARN_BYTES)}: fine, but every chunk downloads the media it plays, so \`mm lambda pack <slug>\` may find savings.` };
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
export const packReport = (staged: Staged): { advice: PackAdvice[]; suggested: LambdaRules; needed: boolean; verdict: string } => {
  const { slug } = staged;
  const size = exportSize(slug);
  const advice: PackAdvice[] = [];
  const suggested: LambdaRules = { schema: RULES_SCHEMA, ...(staged.rules ?? {}) };
  const inputRel = (rel: string) => rel.replace(`${slug}/input/`, '');
  // the pack needs slimming only past the warning line; a single huge file is worth it on its own
  const needed = staged.bytes > PACK_WARN_BYTES;
  const later = ' (not needed while the pack is under ' + formatBytes(PACK_WARN_BYTES) + ': it would not cut the cost, the render is render-bound)';
  for (const f of staged.files) {
    const src = path.join(DIRS.projects, f.rel);
    const isMedia = AUDIO_EXT.test(f.rel) || VIDEO_EXT.test(f.rel);
    if (f.from) {
      const d = staged.derived.find(x => x.to === f.rel)!;
      advice.push({ rel: f.rel, bytes: f.bytes, kind: AUDIO_EXT.test(f.rel) ? 'audio' : 'video', note: `made for Lambda from ${inputRel(d.from)} (${formatBytes(d.fromBytes)}): ${d.why}` });
      continue;
    }
    if (!isMedia) {
      if (IMAGE_EXT.test(f.rel) && f.bytes > 8 * MB) advice.push({ rel: f.rel, bytes: f.bytes, kind: 'image', note: `a big image${needed ? ': if it is a PNG photo, a JPEG at quality 90 is a fraction of it (the project must name the new file)' : ', fine while the pack is under the limit'}` });
      else advice.push({ rel: f.rel, bytes: f.bytes, kind: IMAGE_EXT.test(f.rel) ? 'image' : 'file', note: '' });
      continue;
    }
    if (!fs.existsSync(src)) continue;
    const info = probe(src);
    const isSong = f.rel === staged.manifest.audio?.src;
    const unused = !isSong && !staged.named.has(f.rel);
    if (unused) {
      // no ffmpeg, no time: always worth doing, once the code confirms it
      advice.push({ rel: f.rel, bytes: f.bytes, kind: info.kind, note: 'the manifest lists it but nothing in the code names it: skip it, or move it out of input/ (check the code first)', rule: { skip: [inputRel(f.rel)] } });
      suggested.skip = [...new Set([...(suggested.skip ?? []), inputRel(f.rel)])];
      continue;
    }
    if (info.kind === 'audio') {
      const lossless = LOSSLESS_AUDIO.test(info.codec) && f.bytes > AUDIO_ENCODE_OVER;
      if (lossless && (needed || f.bytes > FILE_ENCODE_OVER)) {
        const est = Math.round((info.duration * 256_000) / 8);
        advice.push({ rel: f.rel, bytes: f.bytes, kind: 'audio', note: `${info.codec} ${Math.round(info.bitrate / 1000)} kbps: encode to AAC 256 kbps for Lambda (about ${formatBytes(est)}; the local master keeps the ${path.extname(f.rel).slice(1)})`, rule: { audio: { codec: 'aac', bitrate: '256k' } } });
        if (!suggested.audio) suggested.audio = { codec: 'aac', bitrate: '256k' };
      } else advice.push({ rel: f.rel, bytes: f.bytes, kind: 'audio', note: `${info.codec} ${Math.round(info.bitrate / 1000)} kbps: ${lossless ? `lossless, kept${later}` : 'fine as it is'}` });
      continue;
    }
    const dims = `${info.width}×${info.height}, ${(info.bitrate / 1e6).toFixed(1)} Mbps, ${formatSeconds(info.duration)}`;
    const taller = (info.height ?? 0) > size.height;
    const bitrateHeavy = info.bitrate > VIDEO_BITRATE_LIMIT && f.bytes > VIDEO_ENCODE_OVER;
    const long = info.duration > 60 ? ` ${formatSeconds(info.duration)} long: if a scene plays only a stretch of it, cut that stretch (render-cloud skill) instead of uploading it all.` : '';
    if (info.alpha) advice.push({ rel: f.rel, bytes: f.bytes, kind: 'video', note: `${dims}, with transparency: kept as it is (h264 would lose the alpha).${long}` });
    else if (taller || (bitrateHeavy && (needed || f.bytes > FILE_ENCODE_OVER))) {
      const why = taller ? `taller than the ${size.height}p export: every frame decodes more than it shows` : `over ${VIDEO_BITRATE_LIMIT / 1e6} Mbps`;
      advice.push({ rel: f.rel, bytes: f.bytes, kind: 'video', note: `${dims}: ${why}; re-encode to ≤${size.height}p h264 crf ${DEFAULT_CRF}.${long}`, rule: { videos: { [inputRel(f.rel)]: { height: size.height, crf: DEFAULT_CRF } } } });
      suggested.videos = { ...(suggested.videos ?? {}), [inputRel(f.rel)]: { height: size.height, crf: DEFAULT_CRF } };
    } else advice.push({ rel: f.rel, bytes: f.bytes, kind: 'video', note: `${dims}: ${bitrateHeavy ? `over the export's bitrate, kept${later}` : 'at the export\'s size, kept'}.${long}` });
  }
  const verdict = needed
    ? `Over ${formatBytes(PACK_WARN_BYTES)}: slim it with the suggestions (cheapest first: skips, the song, cuts; re-encodes last).`
    : `Under ${formatBytes(PACK_WARN_BYTES)}: nothing to optimise for size. A lighter pack would not cut the cost (the render is render-bound); only a clip taller than the export, or a file nothing uses, is worth touching.`;
  return { advice, suggested, needed, verdict };
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
export const choosePreset = (c: { frames: number; fps: number; scale: number; playingClips: number; playingBytes: number; packBytes: number; /** the slowest chunk of this project's last Lambda render, seconds per frame on a 3 GB function */ secondsPerFrame?: number }): PresetChoice => {
  const seconds = c.frames / c.fps;
  const media = formatBytes(c.playingBytes);
  // Lambda's hard limit is 15 min for the whole render (the main function) and for each chunk, so a frame that
  // takes long on a 3 GB function needs more CPU and fewer frames per chunk: enterprise (10 GB, 50 frames)
  if (c.secondsPerFrame !== undefined && c.secondsPerFrame * 75 > 600 && c.scale >= 1) {
    return { key: 'enterprise', reason: `the last render's slowest chunk took ${c.secondsPerFrame.toFixed(1)} s a frame on 3 GB: 75-frame chunks would run ${formatSeconds(c.secondsPerFrame * 75)} and hit the 15 min limit; 10 GB functions with 50-frame chunks keep each under it` };
  }
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

// ---------- the render configuration ----------

/**
 * One Lambda render's configuration, worked out per render rather than picked from a preset
 * (render-cloud skill, "Configuring the render"). In order: the output must arrive, then the cost,
 * then the speed.
 *
 * What Lambda imposes: 15 minutes is the hard limit for each chunk and for the main function that
 * waits for all of them; the CPU scales with the memory (1769 MB = 1 vCPU, 10240 MB ≈ 6); a Chrome
 * tab renders one frame at a time, so a function with CPU to spare renders more frames at once with
 * concurrencyPerLambda (more tabs); every chunk pays a fixed overhead (the function's start, Chrome,
 * the media download); the bill is GB-seconds, so more memory for proportionally less time costs
 * the same, and fewer chunks cost less overhead.
 *
 * What the project tells: how long its slowest frame takes on a 3 GB function with one tab,
 * measured by its last Lambda render (a window on the heaviest stretch); unmeasured, the worst seen
 * so far is assumed, so an unmeasured full render is sized to arrive, not to be cheap.
 */
export type RenderConfig = {
  memory: number;
  disk: number;
  timeout: number;
  framesPerLambda: number;
  concurrencyPerLambda: number;
  /** the function that runs it (deployed) */
  functionName: string;
  chunks: number;
  /** seconds a chunk is expected to take, and in the worst case (no gain from the extra tabs) */
  expectedChunkSeconds: number;
  worstChunkSeconds: number;
  /** seconds per frame assumed for this render (on a 3 GB function, one tab, full size) */
  secondsPerFrame: number;
  measured: boolean;
  /** USD, Remotion's price for the Lambdas' time */
  estimatedCost: number;
  reason: string;
};

/** the slowest frames seen on a lyrics project so far (fma-edwardeleric's stage masks, 2026-11-04): assumed when nothing is measured */
const ASSUMED_SECONDS_PER_FRAME = 12;
/** a chunk's fixed cost: the function starting, Chrome, the pack's media downloading */
const CHUNK_OVERHEAD_SECONDS = 25;
/** a chunk is sized to finish in this time: a third of the 15 min, leaving room for a retry and for the main function's final concat */
const CHUNK_BUDGET_SECONDS = 300;
/** and never past this even if the extra tabs bring nothing */
const CHUNK_WORST_SECONDS = 700;
/** chunks running at once that an account is sure to allow (113 ran on 2026-11-04); past this a render leans on Remotion's retries */
const CHUNKS_AT_ONCE = 200;
/** how much of the extra tabs' parallelism arrives in practice */
const TAB_GAIN = 0.8;

export const chooseConfig = (c: {
  frames: number;
  scale: number;
  region: AwsRegion;
  deployed: { functionName: string; memorySizeInMb: number; diskSizeInMb: number; timeoutInSeconds: number }[];
  secondsPerFrame?: number;
  measurement?: Measurement;
}): RenderConfig => {
  const measured = c.secondsPerFrame !== undefined || c.measurement !== undefined;
  const base = c.measurement?.secondsPerFrame ?? c.secondsPerFrame ?? ASSUMED_SECONDS_PER_FRAME;
  // a smaller frame is cheaper in proportion to its pixels
  const perFrame = base * Math.max(0.2, c.scale * c.scale);
  // the function: 2 GB for light frames, 3 GB for ordinary ones, 10 GB with three tabs for heavy ones
  const want = perFrame <= 1.5 ? { memory: 2048, tabs: 1 } : perFrame <= 4 ? { memory: 3008, tabs: 1 } : { memory: 10240, tabs: 3 };
  // the deployed function nearest above it (timeout 900, the biggest disk)
  const candidates = c.deployed.filter(f => f.timeoutInSeconds >= 900).sort((a, b) => a.memorySizeInMb - b.memorySizeInMb);
  if (!candidates.length) throw new Error(`No Lambda function with a 900 s timeout in ${c.region}. Deploy mediamake's functions: npm run deploy -w mediamake`);
  const fn = candidates.find(f => f.memorySizeInMb >= want.memory) ?? candidates[candidates.length - 1];
  const tabs = fn.memorySizeInMb >= 6144 ? want.tabs : 1;
  // on a bigger function a single tab is somewhat faster too (the CPU scales with the memory, Chrome uses a few threads)
  const singleTabGain = Math.min(2, Math.max(0.6, (fn.memorySizeInMb / 3008) ** 0.5));
  // measured on this very tier at full size: that number, not the model's
  const sameTier = c.measurement && c.measurement.memory === fn.memorySizeInMb && c.measurement.tabs === tabs && c.scale >= 1;
  const effective = sameTier ? c.measurement!.effective : perFrame / singleTabGain / (1 + (tabs - 1) * TAB_GAIN);
  // frames per chunk: as many as fit the budget (fewer chunks, less overhead), within Remotion's 150, never past the worst case
  let framesPerLambda = Math.max(10, Math.min(150, Math.floor((CHUNK_BUDGET_SECONDS - CHUNK_OVERHEAD_SECONDS) / effective)));
  framesPerLambda = Math.min(framesPerLambda, Math.max(10, Math.floor((CHUNK_WORST_SECONDS - CHUNK_OVERHEAD_SECONDS) / (perFrame / singleTabGain))));
  framesPerLambda = Math.min(framesPerLambda, c.frames);
  let chunks = Math.ceil(c.frames / framesPerLambda);
  // too many chunks at once: bigger ones, as long as they stay inside the budget's double
  if (chunks > CHUNKS_AT_ONCE) {
    const bigger = Math.min(150, Math.ceil(c.frames / CHUNKS_AT_ONCE));
    if (CHUNK_OVERHEAD_SECONDS + bigger * effective <= CHUNK_BUDGET_SECONDS * 2 && CHUNK_OVERHEAD_SECONDS + bigger * (perFrame / singleTabGain) <= CHUNK_WORST_SECONDS) {
      framesPerLambda = bigger;
      chunks = Math.ceil(c.frames / framesPerLambda);
    }
  }
  const expectedChunkSeconds = Math.round(CHUNK_OVERHEAD_SECONDS + framesPerLambda * effective);
  const worstChunkSeconds = Math.round(CHUNK_OVERHEAD_SECONDS + framesPerLambda * (sameTier ? effective * 1.5 : perFrame / singleTabGain));
  // the bill: every chunk's expected time, plus the main function waiting for the slowest and concatenating
  const estimatedCost = estimatePrice({
    region: c.region,
    memorySizeInMb: fn.memorySizeInMb,
    diskSizeInMb: fn.diskSizeInMb,
    lambdasInvoked: chunks + 1,
    durationInMilliseconds: (chunks * expectedChunkSeconds + expectedChunkSeconds + 60 + c.frames / 100) * 1000,
  });
  const atRate = c.measurement?.costPerFrame && c.scale >= 1 ? `; at the window's average rate $${(c.measurement.costPerFrame * c.frames).toFixed(2)}` : '';
  const reason = sameTier
    ? `measured ${effective.toFixed(1)} s a frame in the slowest chunk on this very function (${Math.round(fn.memorySizeInMb / 1024)} GB, ${tabs} at a time), so ${framesPerLambda} frames a chunk run ~${expectedChunkSeconds} s (worst ${worstChunkSeconds} s, inside the 15 min), ${chunks} chunks${atRate}`
    : `${measured ? `measured ${base.toFixed(1)}` : `assumed ${base}`} s a frame on 3 GB${c.scale < 1 ? ` (${Math.round(c.scale * 100)}% size: ${perFrame.toFixed(1)} s)` : ''}; ${Math.round(fn.memorySizeInMb / 1024)} GB${tabs > 1 ? ` with ${tabs} frames at a time` : ''} brings a frame to ~${effective.toFixed(1)} s, so ${framesPerLambda} frames a chunk run ~${expectedChunkSeconds} s (worst ${worstChunkSeconds} s, inside the 15 min), ${chunks} chunks${atRate}`;
  return { memory: fn.memorySizeInMb, disk: fn.diskSizeInMb, timeout: fn.timeoutInSeconds, framesPerLambda, concurrencyPerLambda: tabs, functionName: fn.functionName, chunks, expectedChunkSeconds, worstChunkSeconds, secondsPerFrame: base, measured, estimatedCost, reason };
};

/** a preset, in the same shape (for --preset and lambda.json "preset") */
const configFromPreset = (key: string, preset: RenderPreset, frames: number, region: AwsRegion, deployed: { functionName: string }[], perFrame: number): RenderConfig => {
  const functionName = speculateFunctionName({ memorySizeInMb: preset.memory, diskSizeInMb: preset.disk, timeoutInSeconds: preset.timeout });
  if (!deployed.some(f => f.functionName === functionName)) throw new Error(`Lambda function ${functionName} (preset ${key}) is not deployed in ${region}. Deploy mediamake's functions: npm run deploy -w mediamake`);
  const framesPerLambda = preset.framesPerLambda ?? (preset.concurrency ? Math.ceil(frames / preset.concurrency) : Math.max(10, Math.min(150, Math.ceil(frames / 20))));
  const chunks = Math.ceil(frames / framesPerLambda);
  const expected = Math.round(CHUNK_OVERHEAD_SECONDS + framesPerLambda * perFrame);
  return {
    memory: preset.memory, disk: preset.disk, timeout: preset.timeout, framesPerLambda, concurrencyPerLambda: 1, functionName, chunks,
    expectedChunkSeconds: expected, worstChunkSeconds: expected, secondsPerFrame: perFrame, measured: false,
    estimatedCost: estimatePrice({ region, memorySizeInMb: preset.memory, diskSizeInMb: preset.disk, lambdasInvoked: chunks + 1, durationInMilliseconds: (chunks + 1) * expected * 1000 }),
    reason: `preset ${key} as mediamake's config.mjs defines it (${preset.description})`,
  };
};

export const describeConfig = (r: RenderConfig) =>
  `${Math.round(r.memory / 1024)} GB, ${r.framesPerLambda} frames a chunk${r.concurrencyPerLambda > 1 ? `, ${r.concurrencyPerLambda} at a time` : ''}, ${r.chunks} chunk${r.chunks === 1 ? '' : 's'} of ~${formatSeconds(r.expectedChunkSeconds)} (worst ${formatSeconds(r.worstChunkSeconds)}), about $${r.estimatedCost.toFixed(2)}`;

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
  /** a render mediamake already started (its renderId, from the render history): follow and download it, start nothing */
  attach?: string;
  short?: MapShort;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Renders on Lambda and brings the file home the way render-project names it. The output path, or null when it failed. */
export const renderOnLambda = async (req: LambdaRenderRequest): Promise<string | null> => {
  loadAwsEnv();
  const { AWS_RENDER_CONFIGS } = await mediamakeConfig();
  const region = await pickRegion(req.region);
  const deployed = await getFunctions({ region, compatibleOnly: true });
  if (!deployed.length) throw new Error(`No Lambda functions in ${region}. Deploy mediamake's functions: npm run deploy -w mediamake`);

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
  // any deployed function reads the compositions; the render's own is worked out once the length is known
  const metaFunction = [...deployed].sort((a, b) => b.memorySizeInMb - a.memorySizeInMb).find(f => f.timeoutInSeconds >= 900)?.functionName ?? deployed[0].functionName;
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

  // the render's configuration: worked out from the frames (and the project's last measurement), unless --preset or lambda.json says
  const measured = measuredSecondsPerFrame(req.slug);
  const presetKey = req.preset ?? staged.rules?.preset;
  const config = presetKey
    ? configFromPreset(presetKey, (() => { const p = AWS_RENDER_CONFIGS[presetKey]; if (!p) throw new Error(`No preset ${presetKey}. One of: ${Object.keys(AWS_RENDER_CONFIGS).join(', ')}`); return p; })(), framesToRender, region, deployed, (measured?.secondsPerFrame ?? ASSUMED_SECONDS_PER_FRAME) * Math.max(0.2, req.scale * req.scale))
    : chooseConfig({ frames: framesToRender, scale: req.scale, region, deployed, measurement: measured });
  if (!measured && !clip && req.scale >= 1) console.warn(`  not measured yet: sized for ${ASSUMED_SECONDS_PER_FRAME} s a frame (the slowest seen); a 20 s window on the heaviest stretch first would measure it (render-cloud skill)`);
  console.log(`Configuration: ${describeConfig(config)}\n  ${config.reason}`);
  const functionName = config.functionName;

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
  console.log(`Render ${req.composition}: ${framesToRender} of ${comp.durationInFrames} frames at ${comp.fps} fps, ${w}×${h}`);

  // 4. render, poll, download: through mediamake (its render records, cost usage and quota), or AWS directly
  const started = Date.now();
  const request = {
    composition: req.composition,
    inputProps,
    attach: req.attach,
    frames,
    scale: req.scale,
    crf: req.crf,
    output,
    region,
    functionName,
    presetKey,
    config,
    site,
  };
  const progress = req.direct ? await renderDirect(request) : await renderThroughMediamake(request);
  const ok = progress.done && !progress.fatalErrorEncountered;
  if (!ok) for (const e of progress.errors) console.error(`  ✗ ${e.name}: ${e.message}${e.frame != null ? ` (frame ${e.frame})` : ''}${e.stack ? `\n${e.stack.split('\n').slice(0, 6).join('\n')}` : ''}`);
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  const cost = progress.costs.accruedSoFar;
  const slowest = progress.mostExpensiveFrameRanges?.[0];
  endLine(ok ? `  ✔ ${shown(output)} (${formatBytes(progress.outputSizeInBytes ?? fs.statSync(output).size)}, ${seconds} s)` : `  ✗ render failed after ${seconds} s`);

  try {
    appendRender(output, {
      at: new Date(started).toISOString(),
      scale: req.scale,
      frames: frames ? [frames.from, frames.to] : undefined,
      look: req.look,
      seconds,
      ok,
      lambda: {
        region,
        renderId: progress.renderId,
        functionName,
        lambdas: progress.lambdasInvoked,
        costUsd: cost,
        through: req.direct || progress.direct ? 'aws' : 'mediamake',
        config: { memory: config.memory, framesPerLambda: config.framesPerLambda, concurrencyPerLambda: config.concurrencyPerLambda, chunks: config.chunks, estimatedCost: Math.round(config.estimatedCost * 100) / 100 },
        ...(slowest ? { slowestChunkSecondsPerFrame: Math.round((slowest.timeInMilliseconds / 1000 / (slowest.frameRange[1] - slowest.frameRange[0] + 1)) * 10) / 10 } : {}),
      },
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
  if (slowest) {
    const perFrame = slowest.timeInMilliseconds / 1000 / (slowest.frameRange[1] - slowest.frameRange[0] + 1);
    console.log(`  slowest chunk: frames ${slowest.frameRange[0]}-${slowest.frameRange[1]}, ${Math.round(slowest.timeInMilliseconds / 1000)} s (${perFrame.toFixed(1)} s a frame; the next full render's preset is chosen from this)`);
  }
  return output;
};

type RenderCall = {
  composition: string;
  inputProps: Record<string, unknown>;
  /** follow this render instead of starting one (through mediamake only) */
  attach?: string;
  frames?: { from: number; to: number };
  scale: number;
  crf?: number;
  output: string;
  region: AwsRegion;
  functionName: string;
  presetKey?: string;
  config: RenderConfig;
  site: SiteInfo;
};

/** what both ways report back: Remotion's render progress, as far as this script reads it */
type Progress = {
  renderId: string;
  /** set when the render was followed on AWS directly (nothing of it in mediamake's records) */
  direct?: boolean;
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
  let renderId: string;
  let bucketName: string;
  if (c.attach) {
    // the render is already running (a dropped connection, a second terminal): find it in the history
    type Record = { renderId?: string; bucketName?: string; composition?: string; status?: string };
    const history = await cloud.get<Record[] | { renders?: Record[]; items?: Record[]; data?: Record[] }>('api/remotion/history');
    const list = Array.isArray(history) ? history : (history.renders ?? history.items ?? history.data ?? []);
    const found = list.find(r => r.renderId === c.attach);
    if (!found?.bucketName) {
      // the start call was cut off before mediamake wrote the record: the render still runs on AWS
      const { bucketName: siteBucket } = await getOrCreateBucket({ region: c.region });
      console.warn(`  render ${c.attach} is not in your mediamake render history (its start call was cut off); following it on AWS directly, so its cost is not in mediamake's records`);
      return { ...(await followDirect(c, c.attach, siteBucket, started)), direct: true };
    }
    if (found.composition && found.composition !== c.composition) throw new Error(`Render ${c.attach} is of ${found.composition}, not ${c.composition}.`);
    renderId = found.renderId!;
    bucketName = found.bucketName;
    console.log(`  following render ${renderId} (${found.status})`);
  } else {
  // starting a render uploads the props and invokes the function: minutes, not seconds
  const startResponse = await cloud.post<{ type?: string; message?: string; renderId?: string; bucketName?: string; routing?: { recommended: string; reason: string } }>('api/remotion/render', {
    id: c.composition,
    inputProps: c.inputProps,
    isDownloadable: true,
    fileName: path.basename(c.output),
    codec: 'h264',
    audioCodec: 'aac',
    renderType: 'video',
    ...(c.presetKey
      ? { configMode: 'preset', awsRenderPreset: c.presetKey }
      : {
          configMode: 'custom',
          customConfig: { memory: c.config.memory, disk: c.config.disk, timeout: c.config.timeout, concurrency: 'auto', framesPerLambda: c.config.framesPerLambda, concurrencyPerLambda: c.config.concurrencyPerLambda, timeoutInMilliseconds: c.config.timeout * 1000 },
        }),
    region: c.region,
    siteName: c.site.siteName,
    ...(c.frames ? { frameRange: [c.frames.from, c.frames.to] } : {}),
    ...(c.scale !== 1 ? { scale: c.scale } : {}),
    ...(c.crf !== undefined ? { crf: c.crf } : {}),
    tags: ['lyrics_videos', c.site.siteName.replace(/^lyrics-/, '').replace(new RegExp(`-${c.region}$`), '')],
  }, 10 * 60_000);
  if (startResponse.type === 'error' || !startResponse.renderId || !startResponse.bucketName) {
    throw new Error(`mediamake did not start the render: ${startResponse.message ?? JSON.stringify(startResponse)}`);
  }
  renderId = startResponse.renderId;
  bucketName = startResponse.bucketName;
  console.log(`  render ${renderId} started (in your mediamake render history; if this terminal drops, --attach=${renderId} picks it up)`);
  }
  let delay = 2000;
  let notFound = 0;
  for (;;) {
    let r: { type: 'progress' | 'done' | 'error'; message?: string; url?: string; renderInfo?: Progress };
    try {
      r = await cloud.get('api/remotion/progress', { bucketName, id: renderId });
    } catch (err) {
      const { CloudError } = await import('./library/cloud.ts');
      // mediamake writes the record after Lambda accepts the render; a slow or failed write shows as 404 here
      if (err instanceof CloudError && err.status === 404 && ++notFound <= 20) {
        line(`  waiting for mediamake's record of ${renderId} (${notFound})`);
        await sleep(5000);
        continue;
      }
      if (err instanceof CloudError && err.status === 404) {
        endLine(`  mediamake never recorded ${renderId}; following it on AWS directly (its cost is not in mediamake's records)`);
        return { ...(await followDirect(c, renderId, bucketName, started)), direct: true };
      }
      throw err;
    }
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
    framesPerLambda: c.config.framesPerLambda,
    ...(c.config.concurrencyPerLambda > 1 ? { concurrencyPerLambda: c.config.concurrencyPerLambda } : {}),
    timeoutInMilliseconds: c.config.timeout * 1000,
    privacy: 'private',
    deleteAfter: '1-day',
    maxRetries: 2,
    downloadBehavior: { type: 'download', fileName: path.basename(c.output) },
  });
  console.log(`  render ${renderId} started (directly on AWS)`);
  return followDirect(c, renderId, bucketName, started);
};

/** polls a render on AWS with the keys here and downloads it (the --direct path, and --attach when mediamake has no record) */
const followDirect = async (c: RenderCall, renderId: string, bucketName: string, started: number): Promise<Progress> => {
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
    console.error('Usage: mm lambda plan <slug> | pack <slug> [--write] | deploy <slug> [--region=…] | sites [--region=…] | functions [--region=…]');
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
      const measured = measuredSecondsPerFrame(slug);
      console.log(measured ? `Measured: ${measured.effective} s a frame in the slowest chunk on ${Math.round(measured.memory / 1024)} GB with ${measured.tabs} at a time (${measured.secondsPerFrame} s for one tab on 3 GB), render of ${measured.at.slice(0, 10)}${measured.frames ? ` (frames ${measured.frames[0]}-${measured.frames[1] ?? 'end'})` : ''}` : `Not measured yet: sized for ${ASSUMED_SECONDS_PER_FRAME} s a frame, the slowest seen. Render a 20 s window on the heaviest stretch first (--lambda --window=a-b); its slowest chunk sizes the full render.`);
      try {
        loadAwsEnv();
        const region = await pickRegion(rest.find(f => f.startsWith('--region='))?.slice('--region='.length));
        const deployed = await getFunctions({ region, compatibleOnly: true });
        const show = (label: string, frames: number, scale: number) => {
          const r = chooseConfig({ frames, scale, region, deployed, measurement: measured });
          console.log(`${label}: ${describeConfig(r)}\n  ${r.reason}`);
        };
        show('Whole video', full, 1);
        show('Half-size review', full, 0.5);
        show('20 s window', 20 * size.fps, 1);
      } catch (err) {
        console.log(`(no AWS keys here, so no configuration: ${err instanceof Error ? err.message : err})`);
      }
    } else if (command === 'pack') {
      if (!slug) usage();
      const staged = stageProject(slug);
      const { advice, suggested, verdict } = packReport(staged);
      const size = exportSize(slug);
      console.log(`Pack for ${slug}: ${staged.files.length} files, ${formatBytes(staged.bytes)}${staged.rules ? ' with lambda.json applied' : ''}; the export is ${size.width}×${size.height}${size.guessed ? ' (guessed)' : ''}`);
      for (const a of advice.sort((x, y) => y.bytes - x.bytes)) console.log(`  ${formatBytes(a.bytes).padStart(8)}  ${a.kind.padEnd(5)}  ${a.rel.replace(`${slug}/`, '')}${a.note ? `\n              ${a.note}` : ''}`);
      if (staged.missing.length) console.log(`  missing: ${staged.missing.join(', ')}`);
      console.log(`${staged.check.level === 'ok' ? '✔' : staged.check.level === 'warn' ? '⚠' : '✗'} ${staged.check.message}. ${verdict}`);
      const changes = advice.filter(a => a.rule);
      if (changes.length) {
        if (rest.includes('--write') || slug === '--write') {
          const file = writeRules(slug, suggested);
          console.log(`Wrote ${shown(file)}: ${changes.length} rule${changes.length === 1 ? '' : 's'}. Run \`lambda pack ${slug}\` again to see the pack with it applied.`);
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
