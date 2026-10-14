import { alignedLooseStarts } from '../panels/bottom/editor/media-scene-blocks';
import type { AppliedNode, ResolvedSpan } from './types';

interface StampTiming {
  start?: number;
  startInFrames?: number;
  duration?: number;
  durationInFrames?: number;
  /** Negative seconds. Skips that much from the head without moving the end. */
  startOffset?: number;
  fitDurationTo?: string | string[];
}

interface Stampable {
  id: string;
  type?: string;
  componentId?: string;
  data?: object | null;
  context?: { timing?: StampTiming };
  childrenData?: Stampable[];
  _presetItemId?: string;
}

const STAMP_KINDS = new Set(['explicit', 'lock', 'durationLock', 'hug', 'autoRange']);
const RANGE_SUFFIX = /-range-\d+$/;
const TRAILING_INDEX = /-(\d+)$/;

function indexTree(root: AppliedNode) {
  const kinds = new Map<string, string>();
  const sequenceChild = new Set<string>();
  const walk = (node: AppliedNode) => {
    kinds.set(node.id, node.timing.kind);
    if (node.arrangement === 'sequence') {
      for (const child of node.children) sequenceChild.add(child.id);
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return { kinds, sequenceChild };
}

function applySpan(node: Stampable, span: ResolvedSpan, offset: number) {
  const timing: StampTiming = { ...(node.context?.timing ?? {}) };
  if (offset < 0) timing.startOffset = offset;
  else delete timing.startOffset;
  // A negative offset moves the visible start later and shortens the window,
  // so the end stays put. Remotion then clips the head.
  timing.start = span.start - offset;
  timing.duration = Math.max(0.05, span.duration + offset);
  delete timing.fitDurationTo;
  // Frame counts were written before probed media lengths moved this span.
  // Drop them so playback derives frames from the stamped seconds.
  delete timing.startInFrames;
  delete timing.durationInFrames;
  node.context = { ...(node.context ?? {}), timing };
}

/** Untrimmed start and duration, so a second stamp does not trim twice. */
const offsetBases = new WeakMap<Stampable, { start: number; duration: number }>();

function applyUnstampedOffset(node: Stampable, offset: number) {
  if (!(offset < 0)) return;
  const timing: StampTiming = { ...(node.context?.timing ?? {}) };
  let base = offsetBases.get(node);
  if (!base) {
    const duration = timing.duration;
    if (typeof duration !== 'number' || !(duration > 0)) return;
    const start = typeof timing.start === 'number' ? timing.start : 0;
    base = { start, duration };
    offsetBases.set(node, base);
  }
  timing.startOffset = offset;
  timing.start = base.start - offset;
  timing.duration = Math.max(0.05, base.duration + offset);
  delete timing.startInFrames;
  delete timing.durationInFrames;
  node.context = { ...(node.context ?? {}), timing };
}

function indexEditor(root: AppliedNode) {
  const nodes = new Map<string, AppliedNode>();
  const offsets = new Map<string, number>();
  const walk = (node: AppliedNode) => {
    nodes.set(node.id, node);
    const input = node.input;
    if (input && typeof input === 'object' && !Array.isArray(input) && 'startOffset' in input) {
      const value = (input as { startOffset?: unknown }).startOffset;
      offsets.set(node.id, typeof value === 'number' && value < 0 ? value : 0);
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return { nodes, offsets };
}

function offsetFor(
  offsets: Map<string, number>,
  ids: Array<string | undefined>,
  timing: StampTiming | undefined,
): number {
  for (const id of ids) {
    if (id && offsets.has(id)) return offsets.get(id) ?? 0;
  }
  const value = timing?.startOffset;
  return typeof value === 'number' && value < 0 ? value : 0;
}

function applyAlignedLooseStarts(node: Stampable, input: unknown) {
  const placed = alignedLooseStarts(input);
  if (!placed) return;
  for (const child of node.childrenData ?? []) {
    if (RANGE_SUFFIX.test(child.id)) continue;
    const match = TRAILING_INDEX.exec(child.id);
    if (!match) continue;
    const placement = placed.get(Number(match[1]));
    if (!placement) continue;
    const timing: StampTiming = { ...(child.context?.timing ?? {}) };
    timing.start = placement.start;
    delete timing.startInFrames;
    delete timing.durationInFrames;
    if (placement.duration) timing.duration = placement.duration;
    child.context = { ...(child.context ?? {}), timing };
  }
}

/**
 * Duration of the single node named by fitDurationTo.
 * Used after media lengths are stamped, when the composition clock was
 * captured from an earlier, shorter span.
 */
export function fittedDuration(
  nodes: Stampable[] | undefined,
  fitDurationTo: string | string[] | undefined,
): number | undefined {
  if (!nodes?.length || fitDurationTo == null || fitDurationTo === '') return undefined;
  const ids = (Array.isArray(fitDurationTo) ? fitDurationTo : [fitDurationTo]).filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
  if (ids.length === 0) return undefined;
  const matches: Stampable[] = [];
  const walk = (list: Stampable[]) => {
    for (const node of list) {
      if (ids.includes(node.id)) matches.push(node);
      if (node.childrenData?.length) walk(node.childrenData);
    }
  };
  walk(nodes);
  if (matches.length !== 1) return undefined;
  const duration = matches[0].context?.timing?.duration;
  return typeof duration === 'number' && duration > 0 ? duration : undefined;
}

/**
 * Write resolved instance spans onto the matching render nodes.
 * Only `context.timing` is touched. Atom data, including VideoAtom
 * `srcDuration` and `loop`, is left unchanged.
 */
export function stampInstanceTiming<T extends Stampable>(
  nodes: T[] | undefined,
  root: AppliedNode,
  resolved: Map<string, ResolvedSpan>,
): T[] {
  if (!nodes) return [];
  const { kinds, sequenceChild } = indexTree(root);
  const editor = indexEditor(root);

  const shouldStamp = (id: string | undefined): ResolvedSpan | undefined => {
    if (!id) return undefined;
    const kind = kinds.get(id) ?? '';
    const authored = STAMP_KINDS.has(kind);
    const packed = sequenceChild.has(id);
    if (!authored && !packed) return undefined;
    const span = resolved.get(id);
    if (!span || !(span.duration > 0)) return undefined;
    return span;
  };

  const walk = (list: T[], parentItemId: string | undefined) => {
    for (const node of list) {
      const itemId = node._presetItemId;
      const outer = itemId && itemId !== parentItemId ? shouldStamp(itemId) : undefined;
      const byRenderId = shouldStamp(node.id);
      const span = byRenderId ?? outer;
      const outerId = itemId && itemId !== parentItemId ? itemId : undefined;
      const offset = offsetFor(
        editor.offsets,
        [outerId, byRenderId ? node.id : undefined],
        node.context?.timing,
      );
      if (span) applySpan(node, span, offset);
      else if (outerId && editor.offsets.has(outerId)) applyUnstampedOffset(node, offset);
      const editorNode = outerId ? editor.nodes.get(outerId) : undefined;
      if (editorNode) applyAlignedLooseStarts(node, editorNode.input);
      if (node.childrenData?.length) {
        walk(node.childrenData as T[], itemId ?? parentItemId);
      }
    }
  };

  walk(nodes, undefined);
  return nodes;
}

/**
 * Media lengths for intrinsic tracks. Looping VideoAtoms are skipped:
 * their probed length is one iteration, not the timeline window.
 */
export function collectIntrinsicDurations(
  nodes: Stampable[] | undefined,
): Record<string, number> {
  const durations: Record<string, number> = {};
  const walk = (list: Stampable[] | undefined, parentItemId: string | undefined) => {
    if (!list) return;
    for (const node of list) {
      const itemId = node._presetItemId;
      const isOuter = Boolean(itemId && itemId !== parentItemId);
      const data = node.data as { loop?: boolean } | null | undefined;
      const loops = data?.loop === true;
      const duration = node.context?.timing?.duration;
      if (
        isOuter &&
        itemId &&
        !loops &&
        node.componentId !== 'VideoAtom' &&
        typeof duration === 'number' &&
        duration > 0 &&
        durations[itemId] === undefined
      ) {
        durations[itemId] = duration;
      }
      if (
        isOuter &&
        itemId &&
        !loops &&
        (node.componentId === 'AudioAtom' || node.componentId === 'VideoAtom') &&
        typeof duration === 'number' &&
        duration > 0
      ) {
        durations[itemId] = duration;
      }
      // A sequence media track is a scene whose length is its children.
      // The wrapper may still be empty when only the audio or video was probed.
      if (
        isOuter &&
        itemId &&
        durations[itemId] === undefined &&
        node.type === 'scene'
      ) {
        let sum = 0;
        let any = false;
        for (const child of node.childrenData ?? []) {
          if (child.componentId !== 'AudioAtom' && child.componentId !== 'VideoAtom') continue;
          const childData = child.data as { loop?: boolean } | null | undefined;
          if (childData?.loop === true) continue;
          const childDuration = child.context?.timing?.duration;
          if (typeof childDuration === 'number' && childDuration > 0) {
            sum += childDuration;
            any = true;
          }
        }
        if (any) durations[itemId] = sum;
      }
      walk(node.childrenData, itemId ?? parentItemId);
    }
  };
  walk(nodes, undefined);
  return durations;
}

/**
 * Probed file lengths for media-track items that have no range.
 * Keyed by item index. Range slices are skipped: their length is the range.
 */
export function collectMediaItemDurations(
  nodes: Stampable[] | undefined,
  presetItemId: string,
): Record<number, number> {
  const durations: Record<number, number> = {};
  const take = (node: Stampable) => {
    if (node.componentId !== 'AudioAtom' && node.componentId !== 'VideoAtom') return;
    if (RANGE_SUFFIX.test(node.id)) return;
    const match = TRAILING_INDEX.exec(node.id);
    if (!match) return;
    const index = Number(match[1]);
    const duration = node.context?.timing?.duration;
    if (!Number.isInteger(index) || typeof duration !== 'number' || !(duration > 0)) return;
    if (durations[index] === undefined) durations[index] = duration;
  };
  const walk = (list: Stampable[] | undefined, parentItemId: string | undefined) => {
    if (!list) return;
    for (const node of list) {
      const itemId = node._presetItemId;
      const isOuter = Boolean(itemId && itemId !== parentItemId);
      if (isOuter && itemId === presetItemId) {
        for (const child of node.childrenData ?? []) take(child);
      }
      walk(node.childrenData, itemId ?? parentItemId);
    }
  };
  walk(nodes, undefined);
  return durations;
}
