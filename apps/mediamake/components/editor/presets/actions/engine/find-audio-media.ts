import type { Timeline } from "@/components/editor_main/stores/project-store";
import type { ReferenceItem } from "@/components/editor/presets/types";
import { parseTimeRanges } from "@/components/editor/presets/engine/preset-stdlib";
import { detectMediaKind } from "@/components/editor/presets/dataTypes/media";

export type TimelineAudioClip = {
  id: string;
  src: string;
  name?: string;
  /** Absolute start on the composition timeline (seconds). */
  start: number;
  /** Clip duration in seconds when known. */
  duration?: number;
  trackName?: string;
};

/** True when the value is a data:[key] reference string (points at another track/ref). */
function isDataReference(raw: unknown): boolean {
  return typeof raw === "string" && /^data:\[[^\]]+\]/.test(raw.trim());
}

function resolveSrc(
  raw: unknown,
  baseData: Record<string, unknown>,
): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const dataMatch = raw.match(/^data:\[([^\]]+)\]/);
  if (dataMatch) {
    const val = baseData[dataMatch[1]];
    if (typeof val === "string") return val;
    if (val && typeof val === "object" && typeof (val as any).src === "string") {
      return (val as any).src;
    }
    // medias array ref — take first audio-looking src
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        return (
          (first as any).src ||
          (first as any).filePath ||
          (first as any).url ||
          null
        );
      }
    }
    return null;
  }
  return raw;
}

function itemName(item: Record<string, unknown>): string | undefined {
  const n =
    item.name ||
    item.title ||
    item.fileName ||
    (item.metadata as any)?.title;
  return typeof n === "string" && n.trim() ? n.trim() : undefined;
}

function collectFromMediaItems(
  mediaItemsRaw: unknown,
  trackName: string | undefined,
  baseData: Record<string, unknown>,
  out: TimelineAudioClip[],
  presetId: string,
): void {
  let items: any[] = [];
  if (Array.isArray(mediaItemsRaw)) {
    items = mediaItemsRaw;
  } else if (
    mediaItemsRaw &&
    typeof mediaItemsRaw === "object" &&
    Array.isArray((mediaItemsRaw as any).items)
  ) {
    const group = mediaItemsRaw as { mediaRef?: string; items: any[] };
    items = group.items;
    // When linked to a medias ref, merge srcs from the reference array
    if (group.mediaRef && Array.isArray(baseData[group.mediaRef])) {
      const refArr = baseData[group.mediaRef] as any[];
      items = items.map((local, i) => {
        const ref = refArr[i];
        const refSrc =
          typeof ref === "string"
            ? ref
            : ref?.src || ref?.filePath || ref?.url || "";
        return {
          ...(local && typeof local === "object" ? local : {}),
          ...(ref && typeof ref === "object" ? ref : {}),
          src: refSrc || local?.src || "",
        };
      });
      for (let i = items.length; i < refArr.length; i++) {
        const ref = refArr[i];
        items.push(
          typeof ref === "object" && ref
            ? ref
            : { src: typeof ref === "string" ? ref : "" },
        );
      }
    }
  }

  items.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const kind = detectMediaKind(item);
    if (kind !== "audio") return;

    // Skip items whose src is only a data:[...] pointer to another track —
    // that track (or media-track owner) already owns the waveform.
    if (isDataReference(item.src)) return;

    const src = resolveSrc(item.src, baseData);
    if (!src) return;

    const rangeRaw =
      typeof item.rangeString === "string"
        ? item.rangeString
        : Array.isArray(item.ranges)
          ? item.ranges.join(",")
          : "";
    const ranges = parseTimeRanges(rangeRaw);

    if (ranges.length > 0) {
      ranges.forEach((r, ri) => {
        out.push({
          id: `${presetId}-${trackName ?? "media"}-audio-${index}-${ri}`,
          src,
          name: itemName(item),
          start: r.start,
          duration: Math.max(0.05, r.end - r.start),
          trackName,
        });
      });
    } else {
      out.push({
        id: `${presetId}-${trackName ?? "media"}-audio-${index}`,
        src,
        name: itemName(item),
        start: typeof item.start === "number" ? item.start : 0,
        duration:
          typeof item.duration === "number" ? item.duration : undefined,
        trackName,
      });
    }
  });
}

/**
 * Find audio clips that should get a waveform row on preset/reference timelines.
 *
 * - Only media-track (and similar) items with a concrete src are included.
 * - Skips audio that is merely a `data:[key]` reference to another track
 *   (avoids duplicate waveforms for beatstitch/etc. pointing at shared audio).
 * - Does NOT invent rows from bare media/medias references alone.
 */
export function findAudioMediaClipsFromTimeline(
  timeline: Timeline | null | undefined,
  references?: ReferenceItem[],
): TimelineAudioClip[] {
  if (!timeline) return [];

  const refs = references || timeline.defaultData?.references || [];
  const baseData: Record<string, unknown> = Object.fromEntries(
    refs.map((ref: ReferenceItem) => [ref.key, ref.value]),
  );

  const out: TimelineAudioClip[] = [];

  for (const preset of timeline.presets || []) {
    const data = preset.presetInputData;
    if (!data || typeof data !== "object") continue;
    walkForMediaItems(data, baseData, out, preset.id || "preset");
  }

  // Deduplicate by src+start+duration
  const seen = new Set<string>();
  return out.filter((clip) => {
    const key = `${clip.src}|${clip.start}|${clip.duration ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function walkForMediaItems(
  value: unknown,
  baseData: Record<string, unknown>,
  out: TimelineAudioClip[],
  presetId: string,
): void {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) walkForMediaItems(item, baseData, out, presetId);
    return;
  }

  const obj = value as Record<string, unknown>;
  const trackName =
    typeof obj.trackName === "string" ? obj.trackName : undefined;

  if (obj.mediaItems != null) {
    collectFromMediaItems(obj.mediaItems, trackName, baseData, out, presetId);
  }

  // beatstitch / waveform style: only include concrete audio URLs —
  // skip data:[...] refs (those duplicate the owning media-track waveform).
  if (obj.audio && typeof obj.audio === "object") {
    const audio = obj.audio as Record<string, unknown>;
    if (!isDataReference(audio.src)) {
      const src = resolveSrc(audio.src, baseData);
      if (src) {
        out.push({
          id: `${presetId}-${trackName ?? "audio"}-src`,
          src,
          name: itemName(audio),
          start: typeof audio.start === "number" ? audio.start : 0,
          duration:
            typeof audio.duration === "number" ? audio.duration : undefined,
          trackName,
        });
      }
    }
  }

  for (const child of Object.values(obj)) {
    if (child === obj.mediaItems || child === obj.audio) continue;
    walkForMediaItems(child, baseData, out, presetId);
  }
}
