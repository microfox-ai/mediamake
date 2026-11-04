/**
 * The heavy limits of render routing, and the weighing of a render's media against them.
 *
 * Kept free of imports so that the lyrics_videos scripts (another workspace, run with Node's
 * type stripping) can import it as a file (`../../mediamake/lib/render-routing/limits.ts`) and
 * weigh a project's manifest the same way the editor weighs a timeline. plan.ts walks timelines
 * and builds on this.
 */

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

export interface MediaWeight {
  weight: RenderWeight;
  videoSecondsUsed: number;
  audioSecondsUsed: number;
  /** Sum of the known file sizes. */
  mediaBytes: number;
  largestFileBytes: number;
  /** Which limits were reached, in words. Empty when light. */
  heavyBecause: string[];
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

/** "a, b and c" */
export function joinReasons(reasons: string[]): string {
  return reasons.length <= 1 ? reasons.join("") : `${reasons.slice(0, -1).join(", ")} and ${reasons[reasons.length - 1]}`;
}

/**
 * Weighs media (one entry per distinct file, sizes and played seconds where known) against
 * HEAVY_LIMITS. `extraAudioSeconds` counts audio that plays without a named file (waveform
 * effects). Stills are always light.
 */
export function weighMedia(media: MediaSource[], renderType: RenderType = "video", extraAudioSeconds = 0): MediaWeight {
  const sum = (kind: MediaSource["kind"]) =>
    media.filter(m => m.kind === kind).reduce((t, m) => t + (m.usedSeconds ?? 0), 0);
  const videoSecondsUsed = sum("video");
  const audioSecondsUsed = sum("audio") + extraAudioSeconds;
  const known = media.filter(m => m.bytes !== undefined);
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
    videoSecondsUsed,
    audioSecondsUsed,
    mediaBytes,
    largestFileBytes,
    heavyBecause,
  };
}

/** The sentence shown when a render is heavy and local is suggested. */
export function heavyReason(heavyBecause: string[]): string {
  return `Local suggested: ${joinReasons(heavyBecause)}. Every Lambda chunk downloads and decodes that media again, so it costs far more there than on your machine. Lambda still works if you need it fast.`;
}
