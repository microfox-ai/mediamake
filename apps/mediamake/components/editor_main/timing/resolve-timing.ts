import type {
  AppliedNode,
  ResolvedSpan,
  TimingDiagnostic,
} from './types';

export interface ResolveTimingOptions {
  /** Probed media lengths, keyed by instance id. Used for `kind: 'intrinsic'`. */
  intrinsicDurations?: Record<string, number>;
}

export interface ResolveTimingResult {
  nodes: Map<string, ResolvedSpan>;
  diagnostics: TimingDiagnostic[];
}

/**
 * Resolve every instance span from the tree alone.
 * Start is always parent-relative. Absolute time is derived.
 * A lock may target a sibling or an ancestor, never a descendant.
 * Inside a sequence, start is packed from sibling order; a lock there
 * contributes duration only.
 */
export function resolveTiming(
  root: AppliedNode,
  options: ResolveTimingOptions = {},
): ResolveTimingResult {
  const diagnostics: TimingDiagnostic[] = [];
  const nodes = new Map<string, ResolvedSpan>();
  const byId = new Map<string, AppliedNode>();
  const parentOf = new Map<string, string | null>();

  const index = (node: AppliedNode, parentId: string | null) => {
    if (byId.has(node.id)) {
      diagnostics.push({
        nodeId: node.id,
        code: 'duplicate-id',
        message: `Duplicate instance id "${node.id}".`,
      });
      return;
    }
    byId.set(node.id, node);
    parentOf.set(node.id, parentId);
    for (const child of node.children) index(child, node.id);
  };
  index(root, null);

  const descendantIds = (id: string): Set<string> => {
    const found = new Set<string>();
    const walk = (node: AppliedNode) => {
      for (const child of node.children) {
        found.add(child.id);
        walk(child);
      }
    };
    const node = byId.get(id);
    if (node) walk(node);
    return found;
  };

  const ancestorIds = (id: string): string[] => {
    const chain: string[] = [];
    let current = parentOf.get(id) ?? null;
    while (current) {
      chain.push(current);
      current = parentOf.get(current) ?? null;
    }
    return chain;
  };

  const visiting = new Set<string>();

  const fail = (
    nodeId: string,
    code: TimingDiagnostic['code'],
    message: string,
  ) => {
    diagnostics.push({ nodeId, code, message });
  };

  const placeChildren = (node: AppliedNode) => {
    if (node.role !== 'scene') return;
    if (node.arrangement === 'sequence') {
      let cursor = 0;
      for (const child of node.children) {
        if (child.disabled || child.role === 'modifier') continue;
        const span = resolveNode(child, node, cursor);
        if (span) cursor += span.duration;
      }
      return;
    }
    for (const child of node.children) {
      if (child.disabled || child.role === 'modifier') continue;
      resolveNode(child, node);
    }
  };

  const resolveNode = (
    node: AppliedNode,
    parent: AppliedNode | null,
    packedStart?: number,
  ): ResolvedSpan | undefined => {
    const existing = nodes.get(node.id);
    if (existing && existing.duration > 0) return existing;
    if (visiting.has(node.id)) {
      fail(node.id, 'lock-cycle', `Timing lock cycle at "${node.name}".`);
      return undefined;
    }

    visiting.add(node.id);
    const parentAbsoluteStart = parent
      ? (nodes.get(parent.id)?.absoluteStart ?? 0)
      : 0;
    const sequenceParent = parent?.arrangement === 'sequence';

    const finish = (
      start: number,
      duration: number,
      locked: boolean,
    ): ResolvedSpan | undefined => {
      if (!(duration > 0) || !Number.isFinite(duration)) {
        fail(
          node.id,
          'non-positive-duration',
          `"${node.name}" needs a duration greater than zero.`,
        );
        visiting.delete(node.id);
        return undefined;
      }
      const span: ResolvedSpan = {
        start,
        duration,
        absoluteStart: parentAbsoluteStart + start,
        parentAbsoluteStart,
        locked,
      };
      nodes.set(node.id, span);
      placeChildren(node);
      visiting.delete(node.id);

      if (parent && parent.arrangement !== 'sequence') {
        const parentSpan = nodes.get(parent.id);
        if (
          parentSpan &&
          span.start + span.duration > parentSpan.duration + 1e-4
        ) {
          fail(
            node.id,
            'child-overflow',
            `"${node.name}" extends past its scene.`,
          );
        }
      }
      return span;
    };

    if (node.timing.kind === 'hug') {
      if (node.arrangement !== 'sequence') {
        fail(
          node.id,
          'missing-duration',
          `"${node.name}" is aligned, so it needs a duration.`,
        );
        visiting.delete(node.id);
        return undefined;
      }
      const provisional: ResolvedSpan = {
        start: node.timing.start,
        duration: 0,
        absoluteStart: parentAbsoluteStart + node.timing.start,
        parentAbsoluteStart,
        locked: false,
      };
      nodes.set(node.id, provisional);
      let sum = 0;
      let cursor = 0;
      for (const child of node.children) {
        if (child.disabled || child.role === 'modifier') continue;
        const childSpan = resolveNode(child, node, cursor);
        if (!childSpan) continue;
        cursor += childSpan.duration;
        sum += childSpan.duration;
      }
      if (!(sum > 0)) {
        nodes.delete(node.id);
        fail(
          node.id,
          'missing-duration',
          `"${node.name}" has no child durations to hug.`,
        );
        visiting.delete(node.id);
        return undefined;
      }
      const span: ResolvedSpan = { ...provisional, duration: sum };
      nodes.set(node.id, span);
      visiting.delete(node.id);
      return span;
    }

    const timing = node.timing;
    const authoredStart = sequenceParent
      ? (packedStart ?? 0)
      : 'start' in timing
        ? timing.start
        : 0;

    if (timing.kind === 'explicit') {
      return finish(authoredStart, timing.duration, false);
    }

    if (timing.kind === 'intrinsic') {
      const probed = options.intrinsicDurations?.[node.id];
      if (!(typeof probed === 'number' && probed > 0)) {
        fail(
          node.id,
          'missing-duration',
          `"${node.name}" has no media length yet.`,
        );
        visiting.delete(node.id);
        return undefined;
      }
      return finish(authoredStart, probed, false);
    }

    if (timing.kind === 'lock' || timing.kind === 'durationLock') {
      const refId = timing.refId;
      const ref = byId.get(refId);
      if (!ref) {
        fail(node.id, 'lock-missing', `Lock target "${refId}" was not found.`);
        visiting.delete(node.id);
        return undefined;
      }
      if (descendantIds(node.id).has(refId)) {
        fail(
          node.id,
          'lock-out-of-scope',
          `"${node.name}" cannot lock to its descendant "${ref.name}".`,
        );
        visiting.delete(node.id);
        return undefined;
      }
      const isAncestor = ancestorIds(node.id).includes(refId);
      const isSibling = (parent?.children ?? []).some((child) => child.id === refId);
      if (!isSibling && !isAncestor) {
        fail(
          node.id,
          'lock-out-of-scope',
          `"${node.name}" can only lock to a sibling or an ancestor.`,
        );
        visiting.delete(node.id);
        return undefined;
      }
      const refParentId = parentOf.get(refId) ?? null;
      const refParent = refParentId ? (byId.get(refParentId) ?? null) : null;
      const refSpan = resolveNode(ref, refParent);
      if (!refSpan) {
        visiting.delete(node.id);
        return undefined;
      }
      const duration = refSpan.duration;
      let start = authoredStart;
      if (!sequenceParent && timing.kind === 'lock') {
        start = isSibling
          ? refSpan.start
          : refSpan.absoluteStart - parentAbsoluteStart;
      }
      return finish(start, duration, true);
    }

    fail(
      node.id,
      'missing-duration',
      `"${node.name}" needs a start and duration, or a lock.`,
    );
    visiting.delete(node.id);
    return undefined;
  };

  resolveNode(root, null);
  return { nodes, diagnostics };
}
