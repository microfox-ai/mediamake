import type { AppliedNode, ResolvedSpan } from './types';

interface StampTiming {
  start?: number;
  duration?: number;
  fitDurationTo?: string | string[];
}

interface Stampable {
  id: string;
  componentId?: string;
  data?: object | null;
  context?: { timing?: StampTiming };
  childrenData?: Stampable[];
  _presetItemId?: string;
}

const STAMP_KINDS = new Set(['explicit', 'lock', 'durationLock', 'hug']);

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

function applySpan(node: Stampable, span: ResolvedSpan) {
  const timing: StampTiming = { ...(node.context?.timing ?? {}) };
  timing.start = span.start;
  timing.duration = span.duration;
  delete timing.fitDurationTo;
  node.context = { ...(node.context ?? {}), timing };
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
      if (span) applySpan(node, span);
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
      walk(node.childrenData, itemId ?? parentItemId);
    }
  };
  walk(nodes, undefined);
  return durations;
}
