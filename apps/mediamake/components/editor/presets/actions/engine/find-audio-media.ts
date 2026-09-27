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
      // Extra ref-only items
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
 * Find all audio-type media-track clips across a timeline's presets + references.
 * Used to render waveform tracks regardless of which preset/reference is selected.
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

  // Audio medias stored as standalone references
  for (const ref of refs) {
    if (ref.type === "media" || ref.type === "medias") {
      const values = Array.isArray(ref.value)
        ? ref.value
        : ref.value
          ? [ref.value]
          : [];
      values.forEach((item: any, index: number) => {
        if (!item) return;
        const kind = detectMediaKind(item);
        if (kind !== "audio") return;
        const src =
          typeof item === "string"
            ? item
            : item.src || item.filePath || item.url || "";
        if (!src) return;
        out.push({
          id: `ref-${ref.key}-audio-${index}`,
          src: String(src),
          name: itemName(typeof item === "object" ? item : {}),
          start: 0,
          duration:
            typeof item?.duration === "number" ? item.duration : undefined,
          trackName: ref.key,
        });
      });
    }
  }

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

  // beatstitch / waveform style audio object
  if (obj.audio && typeof obj.audio === "object") {
    const audio = obj.audio as Record<string, unknown>;
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

  for (const child of Object.values(obj)) {
    if (child === obj.mediaItems || child === obj.audio) continue;
    walkForMediaItems(child, baseData, out, presetId);
  }
}
