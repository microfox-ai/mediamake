import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";
import { parseEditableSegments } from "./preset-range-utils";

export interface MediaSceneBlock {
  id: string;
  label: string;
  /** Seconds from the start of this track's content, before a head trim. */
  start: number;
  duration: number;
  itemIndex: number;
  rangeIndex: number;
}

export type MediaTrackMode = "lockedTo" | "sequence" | "aligned" | "autoRange";

export interface MediaSceneLayout {
  mode: MediaTrackMode;
  /** Sequence packs children in order. Aligned places each range on its own start. */
  sequence: boolean;
  trackStart: number;
  /** Every item resolved to a positive duration, so the track length is complete. */
  complete: boolean;
  /**
   * Sequence: sum of child durations.
   * Aligned: end of the last range, measured from 0.
   * Auto range: last item end minus first item start.
   */
  duration: number;
  blocks: MediaSceneBlock[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readItemList(raw: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (isRecord(raw) && Array.isArray(raw.items)) return raw.items.filter(isRecord);
  return null;
}

/** Media tracks store clips on `mediaItems`. Image loop stores them on `images`. */
function itemCollection(input: Record<string, unknown>): {
  key: "mediaItems" | "images";
  items: Record<string, unknown>[];
} {
  const media = readItemList(input.mediaItems);
  if (media) return { key: "mediaItems", items: media };
  const images = readItemList(input.images);
  if (images) return { key: "images", items: images };
  return { key: "mediaItems", items: [] };
}

function mediaItems(input: Record<string, unknown>): Record<string, unknown>[] {
  return itemCollection(input).items;
}

const MEDIA_SCENE_PRESETS = new Set(["media-track", "imageloop"]);
const RANGE_TRACK_PRESETS = new Set(["htmlBlockAtom", "second-counter"]);
const WINDOW_TRACK_PRESETS = new Set(["waveform-audio", "text-overlay"]);
/** Scenes draw their range through the instance rows, including nested presets. */
const STRUCTURAL_PRESETS = new Set(["scene", "base-scene"]);

function shellPlacement(presetId: string | undefined): "container" | "atom" | undefined {
  if (!presetId || STRUCTURAL_PRESETS.has(presetId)) return undefined;
  if (
    MEDIA_SCENE_PRESETS.has(presetId) ||
    RANGE_TRACK_PRESETS.has(presetId) ||
    WINDOW_TRACK_PRESETS.has(presetId)
  ) {
    return undefined;
  }
  const placement = getPredefinedPresetById(presetId)?.metadata.placement;
  return placement === "atom" || placement === "container" ? placement : undefined;
}

/** Tracks whose bottom timeline is a row of scene blocks, like an aligned media track. */
export function presetUsesSceneBlocks(presetId: string | undefined): boolean {
  return Boolean(
    presetId &&
      (MEDIA_SCENE_PRESETS.has(presetId) ||
        RANGE_TRACK_PRESETS.has(presetId) ||
        WINDOW_TRACK_PRESETS.has(presetId) ||
        shellPlacement(presetId)),
  );
}

/** Media and image tracks draw one draggable atom per item. Other tracks only draw the window. */
export function presetUsesMediaAtoms(presetId: string | undefined): boolean {
  return Boolean(presetId && MEDIA_SCENE_PRESETS.has(presetId));
}

/** Timeline name for a block: its track name, otherwise the fallback. */
export function trackDisplayName(input: unknown, fallback: string): string {
  if (isRecord(input)) {
    const name = input.trackName;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return fallback;
}

function itemLabel(
  item: Record<string, unknown>,
  index: number,
  collection: "mediaItems" | "images",
): string {
  if (typeof item.name === "string" && item.name.trim()) return item.name.trim();
  if (typeof item.type === "string" && item.type.trim()) {
    return `${item.type} ${index + 1}`;
  }
  return collection === "images" ? `Image ${index + 1}` : `Scene ${index + 1}`;
}

function positiveDuration(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return undefined;
}

function itemStart(item: Record<string, unknown>): number {
  const start = item.start;
  if (typeof start === "number" && Number.isFinite(start)) return Math.max(0, start);
  return 0;
}

function itemDuration(item: Record<string, unknown>): number | undefined {
  const duration = item.duration;
  if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
    return duration;
  }
  return undefined;
}

function itemExplicitLock(item: Record<string, unknown>): string {
  return typeof item.lockTo === "string" ? item.lockTo.trim() : "";
}

function itemRanges(item: Record<string, unknown>): Array<{ start: number; end: number }> {
  // lockTo copies the target's length. A leftover fitDurationTo does not
  // drop a range the item already has.
  if (itemExplicitLock(item)) return [];
  const raw = item.rangeString ?? item.ranges;
  const text = Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === "string").join(",")
    : typeof raw === "string"
      ? raw
      : "";
  return parseEditableSegments(text)
    .filter((segment) => segment.end > segment.start)
    .map((segment) => ({ start: segment.start, end: segment.end }));
}

function probedDuration(
  probed: Readonly<Record<number, number>> | undefined,
  index: number,
): number | undefined {
  const value = probed?.[index];
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return undefined;
}

/**
 * Scene blocks a media track places on the timeline.
 * A sequence scene's length is the sum of its children: each range contributes
 * its length, and children play back to back. An item with no range uses its
 * written duration, the probed file length, or — for an image sequence —
 * perImageDuration or an even share of the track duration.
 * An aligned item keeps its range. With no range, the atom starts at its
 * `start` (otherwise 0) and lasts for the file. Auto range starts at the
 * earliest item and ends at the latest item end.
 */
export function sceneBlocksFromMediaInput(
  input: unknown,
  probedItemDurations?: Readonly<Record<number, number>>,
): MediaSceneLayout {
  const record = isRecord(input) ? input : {};
  const trackType = record.trackType ?? record.arrangement;
  const imageItems = readItemList(record.images);
  const imageOnly = imageItems !== null && readItemList(record.mediaItems) === null;
  const implicitImage = imageOnly && typeof trackType !== "string";
  const imageRanges = Boolean(
    implicitImage && imageItems?.some((item) => itemRanges(item).length > 0),
  );
  const legacyFit =
    typeof record.trackFitDurationTo === "string" ? record.trackFitDurationTo.trim() : "";
  const locked =
    trackType === "lockedTo" ||
    (typeof record.lock === "string" && record.lock.trim().length > 0) ||
    (legacyFit.length > 0 &&
      trackType !== "sequence" &&
      trackType !== "aligned" &&
      trackType !== "random" &&
      trackType !== "autoRange") ||
    (implicitImage && !imageRanges);
  const autoRange = !locked && trackType === "autoRange";
  const sequence =
    !locked &&
    !autoRange &&
    !implicitImage &&
    trackType !== "aligned" &&
    trackType !== "random";
  const mode: MediaTrackMode = locked
    ? "lockedTo"
    : sequence
      ? "sequence"
      : autoRange
        ? "autoRange"
        : "aligned";
  if (locked) {
    const trackStart =
      typeof record.start === "number" && Number.isFinite(record.start) ? record.start : 0;
    return {
      mode,
      sequence: false,
      trackStart,
      complete: false,
      duration: 0,
      blocks: [],
    };
  }
  const trackStart =
    typeof record.start === "number" && Number.isFinite(record.start)
      ? record.start
      : typeof record.trackStartOffset === "number" &&
          Number.isFinite(record.trackStartOffset)
        ? record.trackStartOffset
        : 0;

  const collection = itemCollection(record);
  const items = collection.items;
  const blocks: MediaSceneBlock[] = [];
  let cursor = 0;
  let complete = items.length > 0;
  const perImage = sequence ? positiveDuration(record.perImageDuration) : undefined;
  const trackDuration =
    positiveDuration(record.duration) ?? positiveDuration(record.trackDuration);
  let uncovered = 0;
  if (sequence && perImage === undefined && trackDuration) {
    items.forEach((item, index) => {
      if (itemRanges(item).length > 0) return;
      if (itemDuration(item)) return;
      if (probedDuration(probedItemDurations, index)) return;
      uncovered += 1;
    });
  }
  // Sequence images have no file length. A lone track duration is shared across them.
  const evenShare =
    sequence &&
    perImage === undefined &&
    trackDuration &&
    uncovered > 0 &&
    uncovered === items.length
      ? trackDuration / items.length
      : undefined;

  items.forEach((item, index) => {
    const ranges = itemRanges(item);
    const fallback =
      itemDuration(item) ??
      (!autoRange ? probedDuration(probedItemDurations, index) : undefined) ??
      (sequence ? perImage ?? evenShare : undefined);
    const slices =
      ranges.length > 0
        ? ranges.map((range) => ({
            duration: range.end - range.start,
            absoluteStart: range.start,
          }))
        : !autoRange && fallback !== undefined
          ? [{ duration: fallback, absoluteStart: itemStart(item) }]
          : [];

    if (slices.length === 0) {
      complete = false;
      return;
    }

    slices.forEach((slice, rangeIndex) => {
      const start = sequence ? cursor : slice.absoluteStart;
      blocks.push({
        id: `${index}${rangeIndex > 0 ? `-range-${rangeIndex}` : ""}`,
        label:
          slices.length > 1
            ? `${itemLabel(item, index, collection.key)} ${rangeIndex + 1}`
            : itemLabel(item, index, collection.key),
        start,
        duration: slice.duration,
        itemIndex: index,
        rangeIndex,
      });
      if (sequence) cursor += slice.duration;
    });
  });

  let duration = sequence
    ? cursor
    : blocks.reduce((max, block) => Math.max(max, block.start + block.duration), 0);
  let resolvedTrackStart = trackStart;
  if (autoRange && blocks.length > 0) {
    let first = Infinity;
    let last = -Infinity;
    for (const block of blocks) {
      if (block.start < first) first = block.start;
      const end = block.start + block.duration;
      if (end > last) last = end;
    }
    if (Number.isFinite(first) && Number.isFinite(last) && last > first) {
      resolvedTrackStart = first;
      duration = last - first;
    }
  }

  return { mode, sequence, trackStart: resolvedTrackStart, complete, duration, blocks };
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function trackStartOf(record: Record<string, unknown>): number {
  return finiteNumber(record.start) ?? finiteNumber(record.trackStartOffset) ?? 0;
}

/**
 * Missing track type on a media track means sequence. A single overlay or a
 * range list means aligned, which is how those presets used to place time.
 */
function modeOfTrack(
  record: Record<string, unknown>,
  missing: "sequence" | "aligned",
): { mode: MediaTrackMode; sequence: boolean; trackStart: number } {
  const trackType = record.trackType ?? record.arrangement;
  const legacyFit =
    typeof record.trackFitDurationTo === "string" ? record.trackFitDurationTo.trim() : "";
  const locked =
    trackType === "lockedTo" ||
    (typeof record.lock === "string" && record.lock.trim().length > 0) ||
    (legacyFit.length > 0 &&
      trackType !== "sequence" &&
      trackType !== "aligned" &&
      trackType !== "random" &&
      trackType !== "autoRange");
  const autoRange = !locked && trackType === "autoRange";
  const sequence =
    !locked &&
    !autoRange &&
    (trackType === "sequence" || (typeof trackType !== "string" && missing === "sequence"));
  const mode: MediaTrackMode = locked
    ? "lockedTo"
    : sequence
      ? "sequence"
      : autoRange
        ? "autoRange"
        : "aligned";
  return { mode, sequence, trackStart: trackStartOf(record) };
}

function emptyLocked(trackStart: number): MediaSceneLayout {
  return {
    mode: "lockedTo",
    sequence: false,
    trackStart,
    complete: false,
    duration: 0,
    blocks: [],
  };
}

function rootRanges(record: Record<string, unknown>): Array<{ start: number; end: number }> {
  return itemRanges(record);
}

function transitionRecord(record: Record<string, unknown>): Record<string, unknown> | null {
  return isRecord(record.transitions) ? record.transitions : null;
}

function transitionSpan(
  transitions: Record<string, unknown>,
): { start: number; end: number } | null {
  const raw = transitions.range ?? transitions.rangeString;
  const text = typeof raw === "string" ? raw : "";
  const segment = parseEditableSegments(text).find((item) => item.end > item.start);
  return segment ? { start: segment.start, end: segment.end } : null;
}

function windowTrackStart(record: Record<string, unknown>): number {
  const direct = finiteNumber(record.start) ?? finiteNumber(record.trackStartOffset);
  if (direct !== undefined) return direct;
  const transitions = transitionRecord(record);
  if (!transitions) return 0;
  const span = transitionSpan(transitions);
  if (span) return span.start;
  const offset = finiteNumber(transitions.startOffset);
  if (offset !== undefined) return offset;
  return 0;
}

function windowTrackDuration(record: Record<string, unknown>): number | undefined {
  const direct = positiveDuration(record.duration) ?? positiveDuration(record.trackDuration);
  if (direct) return direct;
  const transitions = transitionRecord(record);
  if (transitions) {
    const span = transitionSpan(transitions);
    if (span) return span.end - span.start;
    const fromTransitions = positiveDuration(transitions.duration);
    if (fromTransitions) return fromTransitions;
  }
  const audio = isRecord(record.audio) ? record.audio : null;
  return audio ? positiveDuration(audio.duration) : undefined;
}

/** HTML blocks and the second counter: each range is one scene. */
function sceneBlocksFromRangeTrack(input: unknown, label: string): MediaSceneLayout {
  const record = isRecord(input) ? input : {};
  const mode = modeOfTrack(record, "aligned");
  if (mode.mode === "lockedTo") return emptyLocked(mode.trackStart);
  const ranges = rootRanges(record);
  const blocks: MediaSceneBlock[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    const duration = range.end - range.start;
    const start = mode.sequence ? cursor : range.start;
    blocks.push({
      id: `${index}`,
      label: ranges.length > 1 ? `${label} ${index + 1}` : label,
      start,
      duration,
      itemIndex: index,
      rangeIndex: 0,
    });
    if (mode.sequence) cursor += duration;
  });
  const duration = mode.sequence
    ? cursor
    : blocks.reduce((max, block) => Math.max(max, block.start + block.duration), 0);
  return {
    mode: mode.mode,
    sequence: mode.sequence,
    trackStart: mode.trackStart,
    complete: blocks.length > 0,
    duration,
    blocks,
  };
}

/** Waveform and text overlay: one block for the whole track window. */
function sceneBlocksFromWindowTrack(input: unknown, label: string): MediaSceneLayout {
  const record = isRecord(input) ? input : {};
  const mode = modeOfTrack(record, "aligned");
  if (mode.mode === "lockedTo") return emptyLocked(windowTrackStart(record));
  const duration = windowTrackDuration(record);
  const blocks: MediaSceneBlock[] =
    duration !== undefined
      ? [{ id: "0", label, start: 0, duration, itemIndex: 0, rangeIndex: 0 }]
      : [];
  return {
    mode: mode.mode,
    sequence: mode.sequence,
    trackStart: windowTrackStart(record),
    complete: blocks.length > 0,
    duration: duration ?? 0,
    blocks,
  };
}

/**
 * Scene blocks for a preset. Media and image tracks use their items.
 * HTML blocks and the second counter use the root range list.
 * Waveform, text overlay, and other atom or container presets are a single window.
 */
export function sceneBlocksForPreset(
  presetId: string | undefined,
  input: unknown,
  probedItemDurations?: Readonly<Record<number, number>>,
): MediaSceneLayout {
  if (presetId === "htmlBlockAtom") return sceneBlocksFromRangeTrack(input, "Block");
  if (presetId === "second-counter") return sceneBlocksFromRangeTrack(input, "Count");
  if (presetId === "waveform-audio") return sceneBlocksFromWindowTrack(input, "Waveform");
  if (presetId === "text-overlay") return sceneBlocksFromWindowTrack(input, "Text");
  if (shellPlacement(presetId)) {
    const record = isRecord(input) ? input : {};
    const name =
      typeof record.trackName === "string" && record.trackName.trim()
        ? record.trackName.trim()
        : "Track";
    return sceneBlocksFromWindowTrack(input, name);
  }
  return sceneBlocksFromMediaInput(input, probedItemDurations);
}

/** Negative head trim. Zero when the track is untrimmed. */
export function readStartOffset(input: unknown): number {
  if (!isRecord(input)) return 0;
  const value = input.startOffset;
  if (typeof value !== "number" || !Number.isFinite(value) || value >= 0) return 0;
  return value;
}

/**
 * Visible window after a negative head trim.
 * The end stays at `start + duration`. The left edge moves later.
 */
export function visibleSpan(
  start: number,
  duration: number,
  startOffset: number,
): { start: number; duration: number } {
  const offset = startOffset < 0 && Number.isFinite(startOffset) ? startOffset : 0;
  return {
    start: start - offset,
    duration: Math.max(0, duration + offset),
  };
}

/**
 * Next head trim after the left edge moves by `leftDelta` seconds.
 * Positive `leftDelta` trims more. The result stays at or below zero.
 */
export function nextStartOffset(
  startOffset: number,
  fullDuration: number,
  leftDelta: number,
  minDuration: number,
): number {
  const current = startOffset < 0 && Number.isFinite(startOffset) ? startOffset : 0;
  const floor = Math.min(0, minDuration - fullDuration);
  return Math.min(0, Math.max(floor, current - leftDelta));
}

/**
 * Content origin while a window drag is in progress.
 * A move shifts the origin with the block. A trim keeps the content put.
 */
export function placedOrigin(
  authoredStart: number,
  fullDuration: number,
  startOffset: number,
  shown: { start: number; duration: number },
): number {
  const base = visibleSpan(authoredStart, fullDuration, startOffset);
  const sameLength = Math.abs(shown.duration - base.duration) < 1e-3;
  return authoredStart + (sameLength ? shown.start - base.start : 0);
}

/** Aligned items with no range. Their timeline start is `item.start`. */
export function alignedLooseStarts(
  input: unknown,
): Map<number, { start: number; duration?: number }> | null {
  const record = isRecord(input) ? input : {};
  const layout = sceneBlocksFromMediaInput(record);
  if (layout.mode !== "aligned") return null;
  const placed = new Map<number, { start: number; duration?: number }>();
  mediaItems(record).forEach((item, index) => {
    if (itemRanges(item).length > 0) return;
    const duration = itemDuration(item);
    placed.set(index, duration ? { start: itemStart(item), duration } : { start: itemStart(item) });
  });
  return placed;
}

function rangeClock(sec: number): string {
  const safe = Math.max(0, sec);
  const minutes = Math.floor(safe / 60);
  const seconds = safe - minutes * 60;
  const whole = Math.abs(seconds - Math.round(seconds)) < 0.0005;
  const text = whole
    ? String(Math.round(seconds)).padStart(2, "0")
    : seconds.toFixed(3).padStart(6, "0");
  return `${minutes}:${text}`;
}

function mapMediaItem(
  input: Record<string, unknown>,
  itemIndex: number,
  update: (item: Record<string, unknown>) => Record<string, unknown>,
): Record<string, unknown> {
  const key: "mediaItems" | "images" =
    input.mediaItems !== undefined
      ? "mediaItems"
      : input.images !== undefined
        ? "images"
        : "mediaItems";
  const raw = input[key];
  const mapList = (items: unknown[]) =>
    items.map((item, index) =>
      index === itemIndex && isRecord(item) ? update(item) : item,
    );
  if (Array.isArray(raw)) return { ...input, [key]: mapList(raw) };
  if (isRecord(raw) && Array.isArray(raw.items)) {
    return { ...input, [key]: { ...raw, items: mapList(raw.items) } };
  }
  return input;
}

/**
 * Write an aligned atom edit back onto the media item.
 * One range is rewritten. Several ranges are left alone.
 * A file with no range stores start, duration, and a source in-point when the head moved.
 */
export function patchMediaAtom(
  input: unknown,
  itemIndex: number,
  edit: { start: number; duration: number; cropDelta?: number },
): unknown {
  if (!isRecord(input)) return input;
  const start = Math.max(0, edit.start);
  const duration = Math.max(0.05, edit.duration);
  return mapMediaItem(input, itemIndex, (item) => {
    if (itemExplicitLock(item)) return item;
    const ranges = itemRanges(item);
    if (ranges.length > 1) return item;
    if (ranges.length === 1) {
      return {
        ...item,
        rangeString: `${rangeClock(start)}-${rangeClock(start + duration)}`,
      };
    }
    const next: Record<string, unknown> = { ...item, start, duration };
    const images =
      isRecord(input) && input.mediaItems === undefined && input.images !== undefined;
    if (!images && typeof edit.cropDelta === "number" && edit.cropDelta !== 0) {
      const crop =
        typeof item.startCropVideo === "number" && Number.isFinite(item.startCropVideo)
          ? item.startCropVideo
          : 0;
      next.startCropVideo = Math.max(0, crop + edit.cropDelta);
    }
    return next;
  });
}

export interface EffectAnchor {
  /** Absolute timeline time where this scene block begins. */
  start: number;
  duration: number;
}

/** Loop and shake ranges are local to each image, not the composition clock. */
const SCENE_RELATIVE_EFFECT =
  /(?:^|\.)(?:loopEffects|shakeEffects|beatEffects|effects)\[\]\.range$/;

export function isSceneRelativeEffectPath(templatePath: string): boolean {
  return SCENE_RELATIVE_EFFECT.test(templatePath);
}

/**
 * Where each scene block sits on the timeline, so a local effect range can be
 * drawn on top of it. A lock moves the whole track; dragging an image moves
 * that block. The effect's stored range stays local to the block.
 */
export function sceneRelativeEffectAnchors(
  input: unknown,
  trackAbsoluteStart: number,
  trackDuration?: number,
): EffectAnchor[] {
  const record = isRecord(input) ? input : {};
  const layout = sceneBlocksFromMediaInput(record);
  const inner =
    layout.mode === "lockedTo"
      ? sceneBlocksFromMediaInput({
          ...record,
          trackType: record.trackType === "sequence" ? "sequence" : "aligned",
          lock: undefined,
          trackFitDurationTo: undefined,
        })
      : layout;
  if (inner.blocks.length === 0) {
    const duration =
      typeof trackDuration === "number" && trackDuration > 0
        ? trackDuration
        : inner.duration > 0
          ? inner.duration
          : Number.POSITIVE_INFINITY;
    return [{ start: trackAbsoluteStart, duration }];
  }
  return inner.blocks.map((block) => ({
    start: trackAbsoluteStart + block.start,
    duration: block.duration,
  }));
}

/** Map a ruler time back into the scene block under it. */
export function absoluteToLocalEffectTime(
  absolute: number,
  anchors: readonly EffectAnchor[],
): number {
  const hit = anchors.find((anchor) => {
    const end = anchor.start + anchor.duration;
    return absolute >= anchor.start && absolute <= end;
  });
  const base = hit ?? anchors[0];
  if (!base) return Math.max(0, absolute);
  return Math.max(0, absolute - base.start);
}

/** Clip a block so it sits inside a window. Null when it falls fully outside. */
export function clipToWindow(
  start: number,
  duration: number,
  windowStart: number,
  windowEnd: number,
): { start: number; duration: number } | null {
  const left = Math.max(start, windowStart);
  const right = Math.min(start + duration, windowEnd);
  if (!(right > left)) return null;
  return { start: left, duration: right - left };
}

/** Absolute end of the furthest media atom, including ones that stick out of the window. */
export function atomContentEnd(
  input: unknown,
  origin: number,
  probedItemDurations?: Readonly<Record<number, number>>,
  presetId?: string,
): number {
  const layout = sceneBlocksForPreset(presetId, input, probedItemDurations);
  let end = 0;
  for (const block of layout.blocks) {
    end = Math.max(end, origin + block.start + block.duration);
  }
  return end;
}

/**
 * Length of a sequence track.
 * A complete sum of ranges and probed file lengths wins. Otherwise the
 * compiled scene length is the sum the renderer already calculated.
 */
export function sequenceLengthFromInput(
  input: unknown,
  probedItemDurations?: Readonly<Record<number, number>>,
  intrinsicDuration?: number,
  presetId?: string,
): number | undefined {
  const media = sceneBlocksForPreset(presetId, input, probedItemDurations);
  if (!media.sequence) return undefined;
  if (media.complete && media.duration > 0) return media.duration;
  if (
    typeof intrinsicDuration === "number" &&
    Number.isFinite(intrinsicDuration) &&
    intrinsicDuration > 0
  ) {
    return intrinsicDuration;
  }
  if (media.duration > 0) return media.duration;
  return undefined;
}
