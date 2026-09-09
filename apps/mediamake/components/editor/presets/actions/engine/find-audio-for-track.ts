import type { Timeline } from "@/components/editor_main/stores/project-store";
import type { ReferenceItem } from "@/components/editor/presets/types";

/**
 * Resolve an audio src for a trackName by scanning timeline presets
 * (and resolving data:[key] refs when present).
 */
export function findAudioSrcForTrackName(
  timeline: Timeline,
  trackName: string,
  references?: ReferenceItem[],
): { src: string; start?: number; duration?: number } | null {
  if (!trackName?.trim()) return null;
  const target = trackName.trim();
  const baseData = Object.fromEntries(
    (references || timeline.defaultData?.references || []).map(
      (ref: ReferenceItem) => [ref.key, ref.value],
    ),
  );

  const resolveSrc = (raw: unknown): string | null => {
    if (typeof raw !== "string" || !raw.trim()) return null;
    const dataMatch = raw.match(/^data:\[([^\]]+)\]/);
    if (dataMatch) {
      const val = baseData[dataMatch[1]];
      if (typeof val === "string") return val;
      if (val && typeof val === "object" && typeof (val as any).src === "string") {
        return (val as any).src;
      }
      return null;
    }
    return raw;
  };

  for (const preset of timeline.presets || []) {
    const data = preset.presetInputData;
    if (!data || typeof data !== "object") continue;

    const found = walkForTrackAudio(data, target, resolveSrc);
    if (found) return found;
  }

  return null;
}

function walkForTrackAudio(
  value: unknown,
  trackName: string,
  resolveSrc: (raw: unknown) => string | null,
): { src: string; start?: number; duration?: number } | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = walkForTrackAudio(item, trackName, resolveSrc);
      if (found) return found;
    }
    return null;
  }

  const obj = value as Record<string, unknown>;
  const thisTrack =
    typeof obj.trackName === "string" && obj.trackName.trim() === trackName;

  if (thisTrack) {
    // beatstitch / waveform style: { audio: { src } }
    if (obj.audio && typeof obj.audio === "object") {
      const audio = obj.audio as Record<string, unknown>;
      const src = resolveSrc(audio.src);
      if (src) {
        return {
          src,
          start: typeof audio.start === "number" ? audio.start : undefined,
          duration:
            typeof audio.duration === "number" ? audio.duration : undefined,
        };
      }
    }

    // media-track style: mediaItems[]
    if (Array.isArray(obj.mediaItems)) {
      for (const item of obj.mediaItems) {
        if (!item || typeof item !== "object") continue;
        const media = item as Record<string, unknown>;
        if (media.type === "audio" || !media.type) {
          const src = resolveSrc(media.src);
          if (src) {
            return {
              src,
              start:
                typeof media.start === "number"
                  ? media.start
                  : typeof media.startCropVideo === "number"
                    ? media.startCropVideo
                    : undefined,
              duration:
                typeof media.duration === "number" ? media.duration : undefined,
            };
          }
        }
      }
    }
  }

  for (const child of Object.values(obj)) {
    const found = walkForTrackAudio(child, trackName, resolveSrc);
    if (found) return found;
  }

  return null;
}
