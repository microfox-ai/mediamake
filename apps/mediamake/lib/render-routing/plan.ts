/**
 * Render routing: where a render should run, and why.
 *
 * What makes Lambda expensive is media volume, not media being there at all.
 * Every Lambda chunk downloads each video or audio file it touches in full
 * and decodes the part it renders, so cost grows with how big the files are
 * and how many seconds of them the composition plays. One song, one clip or
 * a handful of short clips are fine on Lambda. A 1 GB file, or minutes of
 * footage, is cheaper on a machine that already has it.
 *
 * So a render is "heavy" (local suggested) when any of HEAVY_LIMITS is
 * reached, and "light" (Lambda suggested) otherwise. Stills are always light.
 * Local media can't reach Lambda at all, and Lambda is only for clients
 * allowed to use it (see lambda-access.ts). Otherwise the plan is a
 * suggestion: the user always picks, and `reason` says why we suggest what
 * we do.
 *
 * "Local" is the user's own machine: the in-browser renderer in the editor,
 * or `remotion render` / the lyrics_videos scripts from a terminal.
 *
 * Pure and isomorphic: the editor runs it on every props change, the API runs
 * it to answer /api/remotion/render/plan. File sizes come from the caller
 * (see sizes.ts); without them the plan goes by duration alone.
 */

import { containsLocalMedia } from "../local-media/urls";

export type RenderTarget = "lambda" | "local";
export type RenderWeight = "heavy" | "light";
export type RenderType = "video" | "audio" | "still";

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** Reaching any one of these makes a render heavy. */
export const HEAVY_LIMITS = {
  /** Any single video or audio file. */
  fileBytes: 1 * GB,
  /** All video and audio files together. */
  totalBytes: 500 * MB,
  /** Seconds of video the composition plays, summed over clips. */
  videoSeconds: 5 * 60,
  /** Seconds of audio the composition plays, summed over tracks. */
  audioSeconds: 30 * 60,
} as const;

export interface MediaSource {
  kind: "video" | "audio";
  src: string;
  /** Seconds the composition plays this file, summed over its uses. */
  usedSeconds?: number;
  /** File size, when known. */
  bytes?: number;
}

export interface RenderLoad {
  weight: RenderWeight;
  /** Video and audio files, one entry per distinct source. */
  media: MediaSource[];
  videoSources: number;
  audioSources: number;
  imageSources: number;
  /** Text, shapes, Lottie, HTML blocks and other non-media atoms. */
  graphicLayers: number;
  videoSecondsUsed: number;
  audioSecondsUsed: number;
  /** Sum of the known file sizes. */
  mediaBytes: number;
  largestFileBytes: number;
  /** Media files whose size we don't know. */
  unknownSizes: number;
  /** True when some media is a file on the user's computer. */
  hasLocalMedia: boolean;
  /** Seconds, when the props say (config.duration). */
  durationSeconds?: number;
  /** Which limits were reached, in words. Empty when light. */
  heavyBecause: string[];
}

export interface LambdaAccess {
  allowed: boolean;
  /** Shown to the user when Lambda is not allowed. */
  reason?: string;
}

export interface RenderPlan {
  /** The suggestion. */
  target: RenderTarget;
  load: RenderLoad;
  lambda: LambdaAccess;
  /** Lambda is allowed and can reach every file, so the user may pick it. */
  lambdaAvailable: boolean;
  /** One or two sentences for the UI or an API caller: why this target. */
  reason: string;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|mkv|flv|wmv)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus)(\?|#|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i;

/** Components that pull in an audio file to analyse or play. */
const AUDIO_COMPONENTS = new Set([
  "AudioAtom",
  "BeatMontage",
  "WaveformHistogram",
  "WaveformHistogramRanged",
  "WaveformSpectrumLine",
  "WaveformSpectrumFill",
]);
const VIDEO_COMPONENTS = new Set(["VideoAtom"]);
const IMAGE_COMPONENTS = new Set(["ImageAtom", "ImageBeat"]);

/** Keys whose string values are text, never a media source. */
const TEXT_KEYS = new Set(["text", "html", "captions", "words", "title", "description", "name", "label"]);

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;

function srcOf(node: Record<string, any>): string | undefined {
  const data = node.data ?? {};
  const src = data.src ?? data.url ?? data.audioSrc ?? data.videoSrc;
  return typeof src === "string" && src ? src : undefined;
}

function timingDuration(node: Record<string, any>): number | undefined {
  return num(node.context?.timing?.duration) ?? num(node.data?.timing?.duration);
}

/** How long a media atom plays: its own timing, its trim, or its source. */
function playedSeconds(node: Record<string, any>, inherited: number | undefined): number | undefined {
  const own = timingDuration(node);
  if (own !== undefined) return own;
  const data = node.data ?? {};
  const startFrom = num(data.startFrom) ?? 0;
  const endAt = num(data.endAt);
  if (endAt !== undefined && endAt > startFrom) return endAt - startFrom;
  const srcDuration = num(data.srcDuration) ?? num(data.duration);
  if (srcDuration !== undefined && !data.loop) {
    const left = srcDuration - startFrom;
    return inherited !== undefined ? Math.min(left, inherited) : left;
  }
  return inherited;
}

function sizeOf(node: Record<string, any>): number | undefined {
  const data = node.data ?? {};
  return num(data.fileSize) ?? num(data.size) ?? num(data.bytes);
}

function collectUrls(
  value: unknown,
  into: { video: Set<string>; audio: Set<string>; image: Set<string> },
  key?: string,
  depth = 0,
): void {
  if (depth > 64 || value == null) return;
  if (typeof value === "string") {
    if (key && TEXT_KEYS.has(key)) return;
    if (VIDEO_EXT.test(value)) into.video.add(value);
    else if (AUDIO_EXT.test(value)) into.audio.add(value);
    else if (IMAGE_EXT.test(value)) into.image.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, into, key, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collectUrls(v, into, k, depth + 1);
    }
  }
}

function parseProps(inputProps: unknown): unknown {
  if (typeof inputProps !== "string") return inputProps;
  try {
    return JSON.parse(inputProps);
  } catch {
    return {};
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / MB))} MB`;
}

export function formatSeconds(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

/**
 * Walks a timeline (DataMotion inputProps, or any props object) and measures
 * its media: which files, how long each plays and, with `sizes` (src →
 * bytes), how big they are. Unknown shapes still work: media URLs are found
 * by file extension anywhere in the props, and count as playing for the
 * whole composition.
 */
export function analyzeRenderLoad(
  inputProps: unknown,
  renderType: RenderType = "video",
  sizes: Record<string, number> = {},
): RenderLoad {
  const props = parseProps(inputProps);
  const config = (props as any)?.config;
  const durationSeconds = num(Number(config?.duration)) || undefined;

  const media = new Map<string, MediaSource>();
  const add = (kind: MediaSource["kind"], src: string, seconds?: number, bytes?: number) => {
    const existing = media.get(src);
    if (existing) {
      if (seconds !== undefined) existing.usedSeconds = (existing.usedSeconds ?? 0) + seconds;
      existing.bytes ??= bytes;
      return;
    }
    media.set(src, { kind, src, usedSeconds: seconds, bytes });
  };

  let images = 0;
  let graphicLayers = 0;
  let anonymousAudio = 0;
  let anonymousAudioSeconds = 0;

  const visit = (node: unknown, inherited: number | undefined, depth: number) => {
    if (!node || typeof node !== "object" || depth > 64) return;
    const n = node as Record<string, any>;
    const span = timingDuration(n) ?? inherited;
    const componentId = typeof n.componentId === "string" ? n.componentId : undefined;
    if (componentId) {
      const src = srcOf(n);
      if (VIDEO_COMPONENTS.has(componentId) || AUDIO_COMPONENTS.has(componentId)) {
        const kind = VIDEO_COMPONENTS.has(componentId) ? "video" : "audio";
        const seconds = playedSeconds(n, inherited);
        if (src) add(kind, src, seconds, sizeOf(n));
        else if (kind === "audio") {
          anonymousAudio++;
          anonymousAudioSeconds += seconds ?? 0;
        }
      } else if (IMAGE_COMPONENTS.has(componentId)) {
        images++;
      } else if (n.type === "atom") {
        graphicLayers++;
      }
    }
    if (Array.isArray(n.effects)) {
      for (const effect of n.effects) {
        const id = typeof effect === "string" ? effect : effect?.componentId;
        if (id === "waveform") {
          anonymousAudio++;
          anonymousAudioSeconds += span ?? 0;
        }
      }
    }
    if (Array.isArray(n.childrenData)) {
      for (const child of n.childrenData) visit(child, span, depth + 1);
    }
  };
  visit(props, durationSeconds, 0);

  // Media the tree walk didn't see (custom compositions, manifests).
  const urls = { video: new Set<string>(), audio: new Set<string>(), image: new Set<string>() };
  collectUrls(props, urls);
  for (const src of urls.video) if (!media.has(src)) add("video", src, durationSeconds);
  for (const src of urls.audio) if (!media.has(src)) add("audio", src, durationSeconds);

  const list = [...media.values()].map(m => {
    const bytes = m.bytes ?? num(sizes[m.src]);
    const used =
      m.usedSeconds !== undefined && durationSeconds !== undefined
        ? Math.min(m.usedSeconds, durationSeconds)
        : m.usedSeconds;
    return { ...m, bytes, usedSeconds: used };
  });

  const sum = (kind: MediaSource["kind"]) =>
    list.filter(m => m.kind === kind).reduce((t, m) => t + (m.usedSeconds ?? 0), 0);
  const videoSecondsUsed = sum("video");
  const audioSecondsUsed = sum("audio") + anonymousAudioSeconds;
  const known = list.filter(m => m.bytes !== undefined);
  const mediaBytes = known.reduce((t, m) => t + (m.bytes ?? 0), 0);
  const largest = known.reduce<MediaSource | undefined>(
    (a, m) => (!a || (m.bytes ?? 0) > (a.bytes ?? 0) ? m : a),
    undefined,
  );
  const largestFileBytes = largest?.bytes ?? 0;

  const heavyBecause: string[] = [];
  if (renderType !== "still") {
    if (largestFileBytes >= HEAVY_LIMITS.fileBytes) {
      heavyBecause.push(`one ${largest!.kind} file is ${formatBytes(largestFileBytes)}`);
    } else if (mediaBytes >= HEAVY_LIMITS.totalBytes) {
      heavyBecause.push(`the media adds up to ${formatBytes(mediaBytes)}`);
    }
    if (videoSecondsUsed >= HEAVY_LIMITS.videoSeconds) {
      heavyBecause.push(`it plays ${formatSeconds(videoSecondsUsed)} of video`);
    }
    if (audioSecondsUsed >= HEAVY_LIMITS.audioSeconds) {
      heavyBecause.push(`it plays ${formatSeconds(audioSecondsUsed)} of audio`);
    }
  }

  return {
    weight: heavyBecause.length ? "heavy" : "light",
    media: list,
    videoSources: list.filter(m => m.kind === "video").length,
    audioSources: list.filter(m => m.kind === "audio").length + anonymousAudio,
    imageSources: Math.max(images, urls.image.size),
    graphicLayers,
    videoSecondsUsed,
    audioSecondsUsed,
    mediaBytes,
    largestFileBytes,
    unknownSizes: list.length - known.length,
    hasLocalMedia: containsLocalMedia(props),
    durationSeconds,
    heavyBecause,
  };
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "2 video clips (1m 10s, 340 MB) and 1 audio track" */
export function describeMedia(load: RenderLoad): string {
  const parts: string[] = [];
  if (load.videoSources) {
    const details = [
      load.videoSecondsUsed ? formatSeconds(load.videoSecondsUsed) : "",
      ...(load.mediaBytes && !load.audioSources ? [formatBytes(load.mediaBytes)] : []),
    ].filter(Boolean);
    parts.push(`${plural(load.videoSources, "video clip")}${details.length ? ` (${details.join(", ")})` : ""}`);
  }
  if (load.audioSources) parts.push(plural(load.audioSources, "audio track"));
  let text = parts.join(" and ");
  if (load.mediaBytes && load.audioSources && load.videoSources) text += `, ${formatBytes(load.mediaBytes)} in all`;
  return text;
}

function joinReasons(reasons: string[]) {
  return reasons.length <= 1 ? reasons.join("") : `${reasons.slice(0, -1).join(", ")} and ${reasons[reasons.length - 1]}`;
}

/** Suggests where a render should run, and says why. */
export function planRender({
  inputProps,
  renderType = "video",
  lambda,
  sizes,
}: {
  inputProps: unknown;
  renderType?: RenderType;
  lambda: LambdaAccess;
  sizes?: Record<string, number>;
}): RenderPlan {
  const load = analyzeRenderLoad(inputProps, renderType, sizes);
  const lambdaAvailable = lambda.allowed && !load.hasLocalMedia;
  const base = { load, lambda, lambdaAvailable };
  const media = describeMedia(load);

  if (load.hasLocalMedia) {
    return {
      ...base,
      target: "local",
      reason: "This timeline uses files from your computer, which Lambda can't reach, so it renders locally.",
    };
  }
  if (!lambda.allowed) {
    return {
      ...base,
      target: "local",
      reason: lambda.reason ?? "Lambda renders need a mediamake API key with render access.",
    };
  }
  if (load.weight === "heavy") {
    return {
      ...base,
      target: "local",
      reason: `Local suggested: ${joinReasons(load.heavyBecause)}. Every Lambda chunk downloads and decodes that media again, so it costs far more there than on your machine. Lambda still works if you need it fast.`,
    };
  }
  if (renderType === "still") {
    return { ...base, target: "lambda", reason: "Lambda suggested: a still is one frame, quick and cheap there." };
  }
  const unknown =
    load.unknownSizes > 0 && load.videoSources > 0
      ? " File sizes are unknown, so this goes by duration alone; if a clip is very large, render locally."
      : "";
  return {
    ...base,
    target: "lambda",
    reason: media
      ? `Lambda suggested: ${media} is light media, so Lambda renders it fast for little. Local works too.${unknown}`
      : "Lambda suggested: only images and graphics, so Lambda renders it fast for little. Local works too.",
  };
}
