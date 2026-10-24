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
 * A lock may target a sibling or an ancestor. A scene may also lock to a
 * descendant, and then its window is that child's start and duration.
 * Inside a sequence, start is packed from sibling order; a lock there
 * contributes duration only, except a scene locked to its own child, which
 * keeps the packed start and takes that child's duration.
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
  /** Auto locks whose target, in another scope, was not placed yet. */
  const deferredLocks: Array<{ node: AppliedNode; parent: AppliedNode | null }> = [];
  let settling = false;

  const fail = (
    nodeId: string,
    code: TimingDiagnostic['code'],
    message: string,
  ) => {
    diagnostics.push({ nodeId, code, message });
  };

  /**
   * Pack a sequence's children and return the packed length.
   * A plain lock copies its target and takes no slot, so it resolves after
   * the packed siblings. Resolving it in order would place a later target
   * before that target had its packed start, and both would land at 0.
   */
  const packSequence = (node: AppliedNode): number => {
    let cursor = 0;
    const deferred: Array<{ child: AppliedNode; at: number }> = [];
    for (const child of node.children) {
      if (child.disabled || child.role === 'modifier') continue;
      const locksToOwnChild =
        child.timing.kind === 'lock' &&
        descendantIds(child.id).has(child.timing.refId);
      if (child.timing.kind === 'lock' && !locksToOwnChild) {
        deferred.push({ child, at: cursor });
        continue;
      }
      const span = resolveNode(child, node, cursor);
      if (span) cursor += span.duration;
    }
    for (const { child, at } of deferred) resolveNode(child, node, at);
    return cursor;
  };

  const placeChildren = (node: AppliedNode) => {
    if (node.role !== 'scene') return;
    if (node.arrangement === 'sequence') {
      packSequence(node);
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

      if (
        parent &&
        parent.arrangement !== 'sequence' &&
        parent.arrangement !== 'autoRange'
      ) {
        const parentSpan = nodes.get(parent.id);
        if (
          parentSpan &&
          parentSpan.duration > 0 &&
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
      const sum = packSequence(node);
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

    if (node.timing.kind === 'autoRange') {
      const packed = sequenceParent ? (packedStart ?? 0) : 0;
      const provisional: ResolvedSpan = {
        start: packed,
        duration: 0,
        absoluteStart: parentAbsoluteStart + packed,
        parentAbsoluteStart,
        locked: false,
      };
      nodes.set(node.id, provisional);

      const spans: ResolvedSpan[] = [];
      for (const child of node.children) {
        if (child.disabled || child.role === 'modifier') continue;
        const childSpan = resolveNode(child, node);
        if (childSpan && childSpan.duration > 0 && Number.isFinite(childSpan.start)) {
          spans.push(childSpan);
        }
      }

      if (spans.length === 0) {
        nodes.delete(node.id);
        fail(
          node.id,
          'missing-duration',
          `"${node.name}" has no child timings to range.`,
        );
        visiting.delete(node.id);
        return undefined;
      }

      let first = Infinity;
      let last = -Infinity;
      for (const span of spans) {
        const end = span.start + span.duration;
        if (span.start < first) first = span.start;
        if (end > last) last = end;
      }
      const content = last - first;
      if (!Number.isFinite(first) || !Number.isFinite(last) || !(content > 0)) {
        nodes.delete(node.id);
        fail(
          node.id,
          'non-positive-duration',
          `"${node.name}" needs a range greater than zero.`,
        );
        visiting.delete(node.id);
        return undefined;
      }

      // Sequence packing owns the scene position and drops the leading gap.
      // Otherwise the scene moves to the first child and children stay put in time.
      const sceneStart = sequenceParent ? packed : first;
      const relativeDelta = -first;
      const absoluteDelta = sequenceParent ? -first : 0;
      const shiftDescendants = (current: AppliedNode, delta: number) => {
        for (const child of current.children) {
          const childSpan = nodes.get(child.id);
          if (childSpan) {
            childSpan.absoluteStart += delta;
            childSpan.parentAbsoluteStart += delta;
          }
          shiftDescendants(child, delta);
        }
      };
      for (const child of node.children) {
        const childSpan = nodes.get(child.id);
        if (!childSpan) continue;
        childSpan.start += relativeDelta;
        childSpan.absoluteStart += absoluteDelta;
        childSpan.parentAbsoluteStart = parentAbsoluteStart + sceneStart;
        if (absoluteDelta !== 0) shiftDescendants(child, absoluteDelta);
      }

      const span: ResolvedSpan = {
        start: sceneStart,
        duration: content,
        absoluteStart: parentAbsoluteStart + sceneStart,
        parentAbsoluteStart,
        locked: false,
      };
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
      const locksToDescendant = descendantIds(node.id).has(refId);
      if (locksToDescendant && node.role === 'scene' && timing.kind === 'lock') {
        const packed = sequenceParent ? (packedStart ?? 0) : 0;
        const provisional: ResolvedSpan = {
          start: packed,
          duration: 0,
          absoluteStart: parentAbsoluteStart + packed,
          parentAbsoluteStart,
          locked: true,
        };
        nodes.set(node.id, provisional);
        for (const child of node.children) {
          if (child.disabled || child.role === 'modifier') continue;
          resolveNode(child, node);
        }
        const refSpan = nodes.get(refId);
        if (!refSpan || !(refSpan.duration > 0) || !Number.isFinite(refSpan.absoluteStart)) {
          nodes.delete(node.id);
          fail(
            node.id,
            'missing-duration',
            `"${node.name}" cannot lock to "${ref.name}" because it has no duration.`,
          );
          visiting.delete(node.id);
          return undefined;
        }
        const childOffset = refSpan.absoluteStart - provisional.absoluteStart;
        const duration = refSpan.duration;
        if (sequenceParent) {
          // Packing owns the scene position. Pull the locked child to that
          // start and drop the time before it.
          const delta = -childOffset;
          const shiftDescendants = (current: AppliedNode, amount: number) => {
            for (const child of current.children) {
              const childSpan = nodes.get(child.id);
              if (childSpan) {
                childSpan.absoluteStart += amount;
                childSpan.parentAbsoluteStart += amount;
              }
              shiftDescendants(child, amount);
            }
          };
          for (const child of node.children) {
            const childSpan = nodes.get(child.id);
            if (!childSpan) continue;
            childSpan.start += delta;
            childSpan.absoluteStart += delta;
            childSpan.parentAbsoluteStart = provisional.absoluteStart;
            if (delta !== 0) shiftDescendants(child, delta);
          }
          const span: ResolvedSpan = {
            start: packed,
            duration,
            absoluteStart: provisional.absoluteStart,
            parentAbsoluteStart,
            locked: true,
          };
          nodes.set(node.id, span);
          visiting.delete(node.id);
          return span;
        }
        for (const child of node.children) {
          const childSpan = nodes.get(child.id);
          if (!childSpan) continue;
          childSpan.start -= childOffset;
          childSpan.parentAbsoluteStart = provisional.absoluteStart + childOffset;
        }
        const span: ResolvedSpan = {
          start: childOffset,
          duration,
          absoluteStart: provisional.absoluteStart + childOffset,
          parentAbsoluteStart,
          locked: true,
        };
        nodes.set(node.id, span);
        visiting.delete(node.id);
        if (
          parent &&
          parent.arrangement !== 'sequence' &&
          parent.arrangement !== 'autoRange'
        ) {
          const parentSpan = nodes.get(parent.id);
          if (
            parentSpan &&
            parentSpan.duration > 0 &&
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
      }
      if (locksToDescendant) {
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
      const crossScope = !isSibling && !isAncestor;
      const auto = timing.kind === 'lock' && timing.auto === true;
      if (crossScope && !auto) {
        fail(
          node.id,
          'lock-out-of-scope',
          `"${node.name}" can only lock to a sibling or an ancestor.`,
        );
        visiting.delete(node.id);
        return undefined;
      }
      let refSpan: ResolvedSpan | undefined;
      if (crossScope) {
        // The target's parent may not be placed yet, and resolving it from
        // here would lose its packed start. Wait for the tree walk to place it.
        refSpan = nodes.get(refId);
        if (!refSpan || !(refSpan.duration > 0)) {
          if (settling) {
            fail(node.id, 'lock-missing', `"${node.name}" follows "${ref.name}", which is not placed.`);
          } else {
            deferredLocks.push({ node, parent });
          }
          visiting.delete(node.id);
          return undefined;
        }
      } else {
        const refParentId = parentOf.get(refId) ?? null;
        const refParent = refParentId ? (byId.get(refParentId) ?? null) : null;
        refSpan = resolveNode(ref, refParent);
      }
      if (!refSpan) {
        visiting.delete(node.id);
        return undefined;
      }
      const offset =
        timing.kind === 'lock' && typeof timing.offset === 'number' && timing.offset > 0
          ? timing.offset
          : 0;
      const duration = refSpan.duration - offset;
      let start = authoredStart;
      if (timing.kind === 'lock') {
        start =
          (isSibling ? refSpan.start : refSpan.absoluteStart - parentAbsoluteStart) + offset;
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
  // Cross-scope auto locks, once every target has its place. A chain may need
  // more than one round. A round that places nothing reports what is left.
  while (deferredLocks.length > 0) {
    const pending = deferredLocks.splice(0);
    for (const { node, parent } of pending) resolveNode(node, parent);
    if (deferredLocks.length >= pending.length) {
      settling = true;
      for (const { node, parent } of deferredLocks.splice(0)) resolveNode(node, parent);
    }
  }
  return { nodes, diagnostics };
}

/** Latest absolute end among resolved spans. Zero when nothing placed. */
export function latestSpanEnd(
  root: AppliedNode,
  options: ResolveTimingOptions = {},
): number {
  const { nodes } = resolveTiming(root, options);
  let end = 0;
  for (const span of nodes.values()) {
    const edge = span.absoluteStart + span.duration;
    if (Number.isFinite(edge) && edge > end) end = edge;
  }
  return end;
}
