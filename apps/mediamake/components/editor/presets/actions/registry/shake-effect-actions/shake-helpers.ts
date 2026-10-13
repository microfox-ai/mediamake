/**
 * Shared helpers for shake-effect actions (apply + formatting + audio clip).
 */
import type {
  ActionBrowser,
  ActionDefinition,
  TimelineAction,
  ActionOutputVariant,
} from "../../types";
import { ACTION_GENERATED_KEY } from "../../engine/run-action";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { findAudioSrcForTrackName } from "../../engine/find-audio-for-track";

export type BeatPoint = {
  timestamp: number;
  intensity: number;
  frequency: number;
  rms?: number;
  bassRatio?: number;
  spectralFlux?: number;
  zeroCrossingRate?: number;
  spectralCentroid?: number;
  totalScore?: number;
  isLocalPeak?: boolean;
  localPeakStrength?: number;
};

export function formatSeconds(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  if (ms > 0) {
    return `${m}:${String(whole).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }
  return `${m}:${String(whole).padStart(2, "0")}`;
}

export function formatRange(start: number, end: number): string {
  return `${formatSeconds(start)}-${formatSeconds(end)}`;
}

function clipLoadedBeats(args: {
  analysis: BeatPoint[];
  durationInSeconds: number;
  summary: unknown;
  audio: { src: string; start?: number; duration?: number };
}): {
  beats: BeatPoint[];
  durationInSeconds: number;
  audioSrc: string;
  audioStart?: number;
  audioDuration?: number;
  rawAnalysis: unknown;
  summary: unknown;
} {
  const { audio } = args;
  const analysis = args.analysis;
  const durationInSeconds = args.durationInSeconds;

  let clipped = analysis;
  if (typeof audio.start === "number" && audio.start > 0) {
    clipped = clipped.filter((b) => b.timestamp >= audio.start!);
  }
  if (typeof audio.duration === "number" && audio.duration > 0) {
    const end =
      (typeof audio.start === "number" ? audio.start : 0) + audio.duration;
    clipped = clipped.filter((b) => b.timestamp <= end);
  }
  if (typeof audio.start === "number" && audio.start > 0) {
    clipped = clipped.map((b) => ({
      ...b,
      timestamp: b.timestamp - audio.start!,
    }));
  }

  const relativeDuration =
    typeof audio.duration === "number" && audio.duration > 0
      ? audio.duration
      : Math.max(
          durationInSeconds - (typeof audio.start === "number" ? audio.start : 0),
          clipped.length ? clipped[clipped.length - 1].timestamp : 0,
          1,
        );

  return {
    beats: clipped,
    durationInSeconds: relativeDuration,
    audioSrc: audio.src,
    audioStart: audio.start,
    audioDuration: audio.duration,
    rawAnalysis: analysis,
    summary: args.summary ?? null,
  };
}

async function loadTrackAudio(timeline: Timeline, trackName: string) {
  const audio = findAudioSrcForTrackName(
    timeline,
    trackName,
    timeline.defaultData?.references,
  );
  if (!audio?.src) {
    throw new Error(
      `No audio found for "${trackName}". Pick a waveform, beatstitch, or media-track name, or paste an audio URL.`,
    );
  }
  return audio;
}

function framesFromDoc(doc: {
  analysis: Array<{
    timestamp: number;
    intensity: number;
    frequency: number;
    spectralCentroid?: number;
  }>;
  durationInSeconds: number;
}): { analysis: BeatPoint[]; durationInSeconds: number } {
  const analysis: BeatPoint[] = Array.isArray(doc.analysis) ? doc.analysis : [];
  const durationInSeconds =
    typeof doc.durationInSeconds === "number"
      ? doc.durationInSeconds
      : analysis.length
        ? analysis[analysis.length - 1].timestamp
        : 0;
  if (!analysis.length) {
    throw new Error("Audio analysis returned no beats");
  }
  return { analysis, durationInSeconds };
}

/**
 * Server path: start analyze-audio, poll until the job finishes, then fetch
 * the Mongo document by id. The job itself only carries `analysisId`.
 */
export async function loadTrackBeats(args: {
  timeline: Timeline;
  trackName: string;
  browser: ActionBrowser;
}): Promise<{
  beats: BeatPoint[];
  durationInSeconds: number;
  audioSrc: string;
  audioStart?: number;
  audioDuration?: number;
  rawAnalysis: unknown;
  summary: unknown;
}> {
  const audio = await loadTrackAudio(args.timeline, args.trackName);
  const doc = await args.browser.analyzeAudioOnServer(audio.src);
  const { analysis, durationInSeconds } = framesFromDoc(doc);
  return clipLoadedBeats({
    analysis,
    durationInSeconds,
    summary: doc.summary,
    audio,
  });
}

/**
 * Browser path: decode the track with Web Audio (same fetch as the timeline
 * waveform) and build energy frames locally.
 */
export async function loadTrackBeatsInBrowser(args: {
  timeline: Timeline;
  trackName: string;
  browser: ActionBrowser;
}): Promise<{
  beats: BeatPoint[];
  durationInSeconds: number;
  audioSrc: string;
  audioStart?: number;
  audioDuration?: number;
  rawAnalysis: unknown;
  summary: unknown;
}> {
  const audio = await loadTrackAudio(args.timeline, args.trackName);
  const doc = await args.browser.analyzeAudioInBrowser(audio.src);
  const { analysis, durationInSeconds } = framesFromDoc(doc);
  return clipLoadedBeats({
    analysis,
    durationInSeconds,
    summary: doc.summary,
    audio,
  });
}

export const applyShakeEffectsOutput: ActionDefinition["applyOutput"] = ({
  currentData,
  action,
  output,
}) => {
  const next = { ...currentData };
  const idPrefix = `action-${action.id}-`;

  const isOwned = (effect: any) =>
    effect?.[ACTION_GENERATED_KEY] === action.id ||
    (typeof effect?.id === "string" && effect.id.startsWith(idPrefix));

  // Prefer dedicated shakeEffects; also scrub legacy action shakes from effects[]
  const existingShake = Array.isArray(next.shakeEffects)
    ? (next.shakeEffects as any[])
    : [];
  const keptShake = existingShake.filter(
    (effect) => !isOwned(effect) && effect?.type !== "beat-shake",
  );

  const keepMotion = (effect: any) => {
    if (!isOwned(effect)) {
      return (
        effect?.type === "pan" ||
        effect?.type === "zoom" ||
        effect?.type === "generic" ||
        !effect?.type
      );
    }
    return false;
  };
  if (Array.isArray(next.loopEffects)) {
    next.loopEffects = (next.loopEffects as any[]).filter(keepMotion);
  }
  if (Array.isArray(next.effects)) {
    next.effects = (next.effects as any[]).filter(keepMotion);
  }

  // Move any action-owned beat-shake off shakeEffects into beatEffects cleanup
  if (Array.isArray(next.beatEffects)) {
    next.beatEffects = (next.beatEffects as any[]).filter(
      (effect) => !isOwned(effect),
    );
  }

  const incoming =
    output.payload &&
    typeof output.payload === "object" &&
    Array.isArray((output.payload as any).shakeEffects)
      ? ((output.payload as any).shakeEffects as any[])
      : output.payload &&
          typeof output.payload === "object" &&
          Array.isArray((output.payload as any).effects)
        ? // Back-compat for older action payloads
          ((output.payload as any).effects as any[])
        : [];

  const tagged = incoming.map((effect, index) => ({
    ...effect,
    type: effect.type || "shake",
    id: `${idPrefix}${effect.id || index}`,
    [ACTION_GENERATED_KEY]: action.id,
  }));

  next.shakeEffects = [...keptShake, ...tagged];
  return next;
};

export type { TimelineAction, ActionOutputVariant };
