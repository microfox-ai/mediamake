import type { Timeline } from "@/components/editor_main/stores/project-store";
import type { ReferenceItem } from "@/components/editor/presets/types";
import { findAudioMediaClipsFromTimeline } from "./find-audio-media";

/** A fetchable audio file pasted into the track field. */
function isDirectAudioUrl(value: string): boolean {
  const s = value.trim();
  return (
    /^https?:\/\//i.test(s) ||
    /^blob:/i.test(s) ||
    /^data:audio\//i.test(s)
  );
}

function urlFromUnknown(value: unknown): string | null {
  if (typeof value === "string" && isDirectAudioUrl(value)) return value.trim();
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = urlFromUnknown(item);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  return (
    urlFromUnknown(record.src) ||
    urlFromUnknown(record.filePath) ||
    urlFromUnknown(record.url) ||
    urlFromUnknown(record.contentSourceUrl) ||
    null
  );
}

/** `data:[key]` → the referenced media URL, when the track field holds a data link. */
function resolveDataAudioLink(
  raw: string,
  timeline: Timeline,
  references?: ReferenceItem[],
): string | null {
  const match = raw.match(/^data:\[([^\]]+)\]/);
  if (!match) return null;
  const refs = (references ||
    timeline.defaultData?.references ||
    []) as ReferenceItem[];
  const value = refs.find((ref) => ref.key === match[1])?.value;
  return urlFromUnknown(value);
}

/**
 * Resolve an audio file for a preset `trackName`, or use the value itself
 * when it is already an audio URL / `data:[key]` link.
 *
 * Track lookup uses the same clip discovery as the timeline waveform rows:
 * - media-track `mediaItems` as an array or `{ mediaRef, items }`
 * - src from the item, or from the linked medias ref (`src` / `filePath` / `url`)
 * - waveform / beatstitch `{ audio: { src, start, duration } }`
 * - `trackName` on that preset object (nested audio inherits it)
 */
export function findAudioSrcForTrackName(
  timeline: Timeline,
  trackName: string,
  references?: ReferenceItem[],
): { src: string; start?: number; duration?: number } | null {
  const target = trackName?.trim();
  if (!target) return null;

  if (isDirectAudioUrl(target)) {
    return { src: target };
  }

  const linked = resolveDataAudioLink(target, timeline, references);
  if (linked) {
    return { src: linked };
  }

  const clips = findAudioMediaClipsFromTimeline(timeline, references, {
    resolveDataRefs: true,
  }).filter((clip) => (clip.trackName || "").trim() === target);

  if (!clips.length) return null;

  const src = clips[0].src;
  const sameFile = clips.filter((clip) => clip.src === src);
  const start = Math.min(...sameFile.map((clip) => clip.start || 0));
  const ends = sameFile.map((clip) =>
    typeof clip.duration === "number" ? (clip.start || 0) + clip.duration : null,
  );
  const duration = ends.every((end) => end != null)
    ? Math.max(...(ends as number[])) - start
    : undefined;

  return {
    src,
    start: start > 0 ? start : undefined,
    duration: duration && duration > 0 ? duration : undefined,
  };
}
