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

/** True when the value points at another track/ref rather than a fetchable URL. */
function isIndirectAudioSrc(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const s = raw.trim();
  // data:[key] — timeline data reference
  if (/^data:\[[^\]]+\]/.test(s)) return true;
  // ref:componentId / ref:trackName — points at another composition audio track
  if (/^ref:/i.test(s)) return true;
  return false;
}

/** True when src is a real http(s) / blob / data-URL that the browser can fetch. */
function isFetchableAudioUrl(src: string): boolean {
  const s = src.trim();
  return (
    /^https?:\/\//i.test(s) ||
    /^blob:/i.test(s) ||
    /^data:audio\//i.test(s)
  );
}

function resolveSrc(
  raw: unknown,
  baseData: Record<string, unknown>,
): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  // ref:trackName is composition-internal — not resolvable from timeline data alone
  if (/^ref:/i.test(raw.trim())) return null;
  const dataMatch = raw.match(/^data:\[([^\]]+)\]/);
  if (dataMatch) {
    const val = baseData[dataMatch[1]];
    if (typeof val === "string") {
      // Nested ref:/data: — still not a fetchable URL
      if (isIndirectAudioSrc(val) || !isFetchableAudioUrl(val)) return null;
      return val;
    }
    if (val && typeof val === "object" && typeof (val as any).src === "string") {
      const nested = String((val as any).src);
      if (isIndirectAudioSrc(nested) || !isFetchableAudioUrl(nested)) return null;
      return nested;
    }
    // medias array ref — take first audio-looking src
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      if (typeof first === "string") {
        if (isIndirectAudioSrc(first) || !isFetchableAudioUrl(first)) return null;
        return first;
      }
      if (first && typeof first === "object") {
        const nested = String(
          (first as any).src ||
            (first as any).filePath ||
            (first as any).url ||
            "",
        );
        if (!nested || isIndirectAudioSrc(nested) || !isFetchableAudioUrl(nested)) {
          return null;
        }
        return nested;
      }
    }
    return null;
  }
  if (!isFetchableAudioUrl(raw)) return null;
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

    // Skip items whose src is only a data:[...] / ref:... pointer to another track
    if (isIndirectAudioSrc(item.src)) return;

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
 * - Skips audio that is merely a `data:[key]` or `ref:track` reference to another
 *   track (avoids duplicate waveforms and failed fetches for non-URL schemes).
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
    // Final safety: never surface non-fetchable schemes to the waveform UI
    if (!isFetchableAudioUrl(clip.src)) return false;
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

  // beatstitch / waveform style: only include concrete http(s) audio URLs —
  // skip data:[...] / ref:... (those duplicate the owning media-track waveform).
  if (obj.audio && typeof obj.audio === "object") {
    const audio = obj.audio as Record<string, unknown>;
    if (!isIndirectAudioSrc(audio.src)) {
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
