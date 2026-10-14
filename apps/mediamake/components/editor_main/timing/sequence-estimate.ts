import { sequenceLengthFromInput } from '@/components/editor_main/panels/bottom/editor/media-scene-blocks';
import { findNode } from './load-instance-tree';
import { resolveTiming } from './resolve-timing';
import {
  collectIntrinsicDurations,
  collectMediaItemDurations,
} from './stamp-timing';
import type { AppliedNode } from './types';

type CompiledChildren = Parameters<typeof collectIntrinsicDurations>[0];

/**
 * Sequence length for a preset.
 * A media track sums its items, using probed file lengths when an item has
 * no range. A sequence scene sums the resolved spans of its children.
 */
export function estimateSequenceDuration(options: {
  input: unknown;
  presetId: string;
  root: AppliedNode;
  compiledChildren?: CompiledChildren;
}): number | undefined {
  const intrinsic = collectIntrinsicDurations(options.compiledChildren);
  const node = findNode(options.root, options.presetId);
  const fromItems = sequenceLengthFromInput(
    options.input,
    collectMediaItemDurations(options.compiledChildren, options.presetId),
    intrinsic[options.presetId],
    node?.presetId,
  );
  if (fromItems !== undefined) return fromItems;
  if (!node || node.arrangement !== 'sequence') return undefined;
  const resolved = resolveTiming(options.root, { intrinsicDurations: intrinsic });
  let sum = 0;
  let any = false;
  for (const child of node.children) {
    if (child.disabled || child.role === 'modifier') continue;
    const span = resolved.nodes.get(child.id);
    if (span && span.duration > 0) {
      sum += span.duration;
      any = true;
    }
  }
  return any ? sum : undefined;
}
