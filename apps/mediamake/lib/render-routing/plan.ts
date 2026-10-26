/**
 * Render routing: where a render should run, and why.
 *
 * Lambda bills for every second of every function, and media-heavy timelines
 * are where that adds up: each Lambda downloads and decodes the same video
 * and audio files again, and audio mixing is done on top. A machine that
 * already holds the media renders those for free. Timelines made only of
 * images, text, shapes and Lottie are cheap to split across many Lambdas
 * and finish much faster there.
 *
 * So:
 *  - any video or audio in the timeline (or an audio-only render) → local
 *  - images and graphics only, and every still → Lambda
 *  - Lambda is only for clients allowed to use it (see lambda-access.ts);
 *    everyone else renders locally
 *  - media that lives on the user's computer can't reach Lambda at all
 *
 * "Local" is the user's own machine: the in-browser renderer in the editor,
 * or `remotion render` / the lyrics_videos scripts from a terminal.
 *
 * Pure and isomorphic: the editor runs it on every props change, the API runs
 * it to answer /api/remotion/render/plan.
 */

import { containsLocalMedia } from "../local-media/urls";

export type RenderTarget = "lambda" | "local";
export type RenderWeight = "heavy" | "light";
export type RenderType = "video" | "audio" | "still";

export interface RenderLoad {
  weight: RenderWeight;
  /** Distinct video sources (atoms plus any video URL in the props). */
  videoSources: number;
  /** Distinct audio sources (atoms, waveforms, beat montages, audio URLs). */
  audioSources: number;
  imageSources: number;
  /** Text, shapes, Lottie, HTML blocks and other non-media atoms. */
  graphicLayers: number;
  /** True when some media is a file on the user's computer. */
  hasLocalMedia: boolean;
  /** Seconds, when the props say (config.duration). */
  durationSeconds?: number;
}

export interface LambdaAccess {
  allowed: boolean;
  /** Shown to the user when Lambda is not allowed. */
  reason?: string;
}

export interface RenderPlan {
  target: RenderTarget;
  load: RenderLoad;
  lambda: LambdaAccess;
  /** Lambda is allowed and can reach every file. */
  lambdaAvailable: boolean;
  /** One sentence for the UI or an API caller. */
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
/** Effects that read an audio track. */
const AUDIO_EFFECTS = new Set(["waveform"]);

/** Keys whose string values are text, never a media source. */
const TEXT_KEYS = new Set(["text", "html", "captions", "words", "title", "description", "name", "label"]);

type Sources = { video: Set<string>; audio: Set<string>; image: Set<string> };

function collectUrls(value: unknown, into: Sources, key?: string, depth = 0): void {
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

function srcOf(node: Record<string, any>): string | undefined {
  const data = node.data ?? {};
  const src = data.src ?? data.url ?? data.audioSrc ?? data.videoSrc;
  return typeof src === "string" && src ? src : undefined;
}

/**
 * Walks a timeline (DataMotion inputProps, or any props object) and says how
 * media-heavy it is. Unknown shapes still work: media URLs are found by file
 * extension anywhere in the props.
 */
export function analyzeRenderLoad(
  inputProps: unknown,
  renderType: RenderType = "video",
): RenderLoad {
  let props: unknown = inputProps;
  if (typeof props === "string") {
    try {
      props = JSON.parse(props);
    } catch {
      props = {};
    }
  }

  const sources: Sources = { video: new Set(), audio: new Set(), image: new Set() };
  let videoAtoms = 0;
  let audioAtoms = 0;
  let imageAtoms = 0;
  let graphicLayers = 0;

  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 64) return;
    const n = node as Record<string, any>;
    const componentId = typeof n.componentId === "string" ? n.componentId : undefined;
    if (componentId) {
      const src = srcOf(n);
      if (VIDEO_COMPONENTS.has(componentId)) {
        videoAtoms++;
        if (src) sources.video.add(src);
      } else if (AUDIO_COMPONENTS.has(componentId)) {
        audioAtoms++;
        if (src) sources.audio.add(src);
      } else if (IMAGE_COMPONENTS.has(componentId)) {
        imageAtoms++;
        if (src) sources.image.add(src);
      } else if (n.type === "atom") {
        graphicLayers++;
      }
    }
    if (Array.isArray(n.effects)) {
      for (const effect of n.effects) {
        const id = typeof effect === "string" ? effect : effect?.componentId;
        if (typeof id === "string" && AUDIO_EFFECTS.has(id)) audioAtoms++;
      }
    }
    if (Array.isArray(n.childrenData)) {
      for (const child of n.childrenData) visit(child, depth + 1);
    }
  };
  visit(props, 0);
  collectUrls(props, sources);

  const videoSources = Math.max(videoAtoms, sources.video.size);
  const audioSources = Math.max(audioAtoms, sources.audio.size);
  const imageSources = Math.max(imageAtoms, sources.image.size);

  const config = (props as any)?.config;
  const duration = Number(config?.duration);
  const durationSeconds = Number.isFinite(duration) && duration > 0 ? duration : undefined;

  const heavy =
    renderType === "audio" ||
    (renderType !== "still" && (videoSources > 0 || audioSources > 0));

  return {
    weight: heavy ? "heavy" : "light",
    videoSources,
    audioSources,
    imageSources,
    graphicLayers,
    hasLocalMedia: containsLocalMedia(props),
    durationSeconds,
  };
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function describeMedia(load: RenderLoad): string {
  const parts: string[] = [];
  if (load.videoSources) parts.push(plural(load.videoSources, "video"));
  if (load.audioSources) parts.push(plural(load.audioSources, "audio track"));
  return parts.join(" and ");
}

/** Picks where a render should run. */
export function planRender({
  inputProps,
  renderType = "video",
  lambda,
}: {
  inputProps: unknown;
  renderType?: RenderType;
  lambda: LambdaAccess;
}): RenderPlan {
  const load = analyzeRenderLoad(inputProps, renderType);
  const lambdaAvailable = lambda.allowed && !load.hasLocalMedia;
  const base = { load, lambda, lambdaAvailable };

  if (load.hasLocalMedia) {
    return {
      ...base,
      target: "local",
      reason: "This timeline uses files from your computer, which Lambda can't reach, so it renders locally.",
    };
  }
  if (load.weight === "heavy") {
    const media = describeMedia(load);
    return {
      ...base,
      target: "local",
      reason:
        renderType === "audio"
          ? "Audio renders are cheapest on your own machine."
          : `This timeline has ${media}. Media-heavy renders are cheapest on your own machine${
              lambda.allowed ? ", though Lambda is still available" : ""
            }.`,
    };
  }
  if (!lambda.allowed) {
    return {
      ...base,
      target: "local",
      reason: lambda.reason ?? "Lambda renders need a mediamake API key with render access.",
    };
  }
  return {
    ...base,
    target: "lambda",
    reason:
      renderType === "still"
        ? "Stills are quick and cheap on Lambda."
        : "Only images and graphics here, so Lambda renders it fastest for very little.",
  };
}
