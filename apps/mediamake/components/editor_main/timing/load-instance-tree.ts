import type { Timeline } from '@/components/editor_main/stores/project-store';
import { presetTrackName } from '@/components/editor_main/timing/preset-track-name';
import {
  presetUsesSceneBlocks,
  sceneBlocksForPreset,
} from '@/components/editor_main/panels/bottom/editor/media-scene-blocks';
import { autoAudioLock } from './caption-audio-lock';
import type {
  AppliedNode,
  NodeTiming,
  PresetRole,
  SceneArrangement,
} from './types';

export const VIRTUAL_ROOT_ID = '__virtual_root';
export const BASE_SCENE_RENDER_ID = 'BaseScene';

export interface TimelinePresetLike {
  id: string;
  label?: string;
  presetId: string;
  presetType?: string;
  presetInputData?: unknown;
  disabled?: boolean;
}

const SCENE_PRESET_IDS = new Set(['base-scene', 'scene']);
const MODIFIER_TYPES = new Set(['data', 'context', 'effects']);
const FIT_SENTINELS = new Set(['this', 'fill', 'parent', 'BaseScene', 'scene']);

export function presetRole(
  presetId: string,
  presetType?: string,
  declared?: PresetRole,
): PresetRole {
  if (declared) return declared;
  if (SCENE_PRESET_IDS.has(presetId)) return 'scene';
  if (presetType && MODIFIER_TYPES.has(presetType)) return 'modifier';
  return 'track';
}

export function sceneRenderId(node: AppliedNode): string | null {
  if (node.role !== 'scene') return null;
  if (node.presetId === 'base-scene') return BASE_SCENE_RENDER_ID;
  if (node.presetId === VIRTUAL_ROOT_ID) return null;
  return node.id;
}

function asRecord(input: unknown): Record<string, unknown> {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

function readStart(input: Record<string, unknown>): number {
  if (typeof input.start === 'number' && Number.isFinite(input.start)) return input.start;
  if (typeof input.trackStartOffset === 'number' && Number.isFinite(input.trackStartOffset)) {
    return input.trackStartOffset;
  }
  const clip = asRecord(input.clip);
  if (typeof clip.start === 'number' && Number.isFinite(clip.start)) return clip.start;
  return 0;
}

function readDuration(input: Record<string, unknown>): number | undefined {
  const candidates = [input.duration, input.trackDuration, asRecord(input.clip).duration];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

function readLockRef(input: Record<string, unknown>): string | undefined {
  if (typeof input.lock === 'string' && input.lock) return input.lock;
  if (typeof input.lockPositionTo === 'string' && input.lockPositionTo) return input.lockPositionTo;
  if (typeof input.lockTo === 'string' && input.lockTo) return input.lockTo;
  const lock = asRecord(input.lock);
  if (typeof lock.refId === 'string' && lock.refId) return lock.refId;
  return undefined;
}

function readFitRef(input: Record<string, unknown>): string | undefined {
  const raw = input.fitDurationTo ?? input.trackFitDurationTo;
  if (typeof raw !== 'string' || !raw || FIT_SENTINELS.has(raw)) return undefined;
  return raw;
}

function arrangementOf(
  input: Record<string, unknown>,
  presetId: string,
): SceneArrangement {
  const raw = input.trackType ?? input.arrangement;
  if (raw === 'lockedTo' || (typeof input.lock === 'string' && input.lock)) {
    return 'aligned';
  }
  if (raw === 'sequence') return 'sequence';
  if (raw === 'autoRange') return 'autoRange';
  if (raw === 'aligned' || raw === 'random') return 'aligned';
  if (presetId === 'base-scene' || presetId === 'scene' || presetId === VIRTUAL_ROOT_ID) {
    return 'aligned';
  }
  return 'aligned';
}

/** Map a free-form ref (instance id, preset id, track name, or legacy label) onto an instance id. */
export function resolveInstanceRef(
  ref: string,
  presets: TimelinePresetLike[],
): string {
  const byId = presets.find((preset) => preset.id === ref);
  if (byId) return byId.id;
  const byPresetId = presets.find((preset) => preset.presetId === ref);
  if (byPresetId) return byPresetId.id;
  const byTrackName = presets.find(
    (preset) => asRecord(preset.presetInputData).trackName === ref,
  );
  if (byTrackName) return byTrackName.id;
  const byLabel = presets.find((preset) => preset.label === ref);
  if (byLabel) return byLabel.id;
  return ref;
}

function timingFromPreset(
  preset: TimelinePresetLike,
  role: PresetRole,
  arrangement: SceneArrangement,
  presets: TimelinePresetLike[],
): NodeTiming {
  const input = asRecord(preset.presetInputData);
  const start = readStart(input);
  const lockRef = readLockRef(input);
  if (lockRef || input.trackType === 'lockedTo') {
    if (lockRef) {
      return { kind: 'lock', refId: resolveInstanceRef(lockRef, presets) };
    }
    return { kind: 'unspecified', start: 0 };
  }
  if (role === 'track') {
    const followed = autoAudioLock(preset, presets);
    if (followed) return followed;
  }
  if (role === 'scene' && arrangement === 'sequence') return { kind: 'hug', start };
  if (role === 'scene' && arrangement === 'autoRange') return { kind: 'autoRange' };
  const duration = readDuration(input);
  if (presetUsesSceneBlocks(preset.presetId)) {
    const scenes = sceneBlocksForPreset(preset.presetId, preset.presetInputData);
    if (scenes.mode === 'autoRange' && scenes.duration > 0) {
      return { kind: 'explicit', start: scenes.trackStart, duration: scenes.duration };
    }
    const spanTrack =
      preset.presetId === 'htmlBlockAtom' ||
      preset.presetId === 'second-counter' ||
      preset.presetId === 'waveform-audio' ||
      preset.presetId === 'text-overlay';
    if (
      spanTrack &&
      duration === undefined &&
      scenes.mode !== 'lockedTo' &&
      scenes.duration > 0
    ) {
      return { kind: 'explicit', start: scenes.trackStart, duration: scenes.duration };
    }
    if (
      duration === undefined &&
      scenes.sequence &&
      scenes.complete &&
      scenes.duration > 0
    ) {
      return { kind: 'explicit', start, duration: scenes.duration };
    }
  }
  if (duration !== undefined) {
    return { kind: 'explicit', start, duration };
  }
  // Base scene length is start, duration, sequence, auto range, or lock.
  // A stored fitDurationTo is ignored.
  if (preset.presetId === 'base-scene') {
    return { kind: 'unspecified', start };
  }
  const fitRef = readFitRef(input);
  if (fitRef) {
    return {
      kind: 'durationLock',
      refId: resolveInstanceRef(fitRef, presets),
      start,
    };
  }
  if (role === 'track') return { kind: 'intrinsic', start };
  return { kind: 'unspecified', start };
}

function nodeFromPreset(
  preset: TimelinePresetLike,
  presets: TimelinePresetLike[],
  roleOverride?: PresetRole,
): AppliedNode {
  const input = asRecord(preset.presetInputData);
  const declared = input.role;
  const role = presetRole(
    preset.presetId,
    preset.presetType,
    roleOverride ??
      (declared === 'scene' || declared === 'track' || declared === 'modifier'
        ? declared
        : undefined),
  );
  const arrangement = role === 'scene' ? arrangementOf(input, preset.presetId) : undefined;
  return {
    id: preset.id,
    presetId: preset.presetId,
    name: presetTrackName(preset, preset.presetId),
    disabled: preset.disabled,
    role,
    arrangement,
    input: preset.presetInputData ?? {},
    timing: timingFromPreset(preset, role, arrangement ?? 'aligned', presets),
    children: [],
  };
}

function deriveTree(timeline: {
  presets?: TimelinePresetLike[];
  configuration?: { config?: { duration?: number } };
}): AppliedNode {
  const presets = timeline.presets ?? [];
  const base = presets.find((preset) => preset.presetId === 'base-scene');
  const rest = presets.filter((preset) => preset !== base);
  const nodes = rest.map((preset) => nodeFromPreset(preset, presets));
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const rootSource: TimelinePresetLike = base ?? {
    id: VIRTUAL_ROOT_ID,
    presetId: VIRTUAL_ROOT_ID,
    presetType: 'full',
    presetInputData: { trackName: 'Scene' },
  };
  const root = nodeFromPreset(rootSource, presets, 'scene');
  if (!base) {
    root.presetId = VIRTUAL_ROOT_ID;
    root.role = 'scene';
    root.arrangement = 'aligned';
    const configDuration = timeline.configuration?.config?.duration;
    if (typeof configDuration === 'number' && configDuration > 0) {
      root.timing = { kind: 'explicit', start: 0, duration: configDuration };
    }
  } else if (root.timing.kind === 'unspecified' || root.timing.kind === 'intrinsic') {
    const configDuration = timeline.configuration?.config?.duration;
    const fallback =
      typeof configDuration === 'number' && configDuration > 0 ? configDuration : 20;
    const start = 'start' in root.timing ? root.timing.start : 0;
    root.timing = { kind: 'explicit', start, duration: fallback };
  }

  const placed = new Set<string>();
  const place = (node: AppliedNode, trail: Set<string>) => {
    if (placed.has(node.id) || trail.has(node.id)) return;
    const parentId = asRecord(node.input).parentId;
    const parent =
      typeof parentId === 'string'
        ? (byId.get(parentId) ?? (parentId === root.id ? root : undefined))
        : undefined;
    if (parent && parent.role === 'scene' && parent.id !== node.id) {
      trail.add(node.id);
      place(parent, trail);
      const parentReady = placed.has(parent.id);
      trail.delete(node.id);
      if (parentReady && !placed.has(node.id)) {
        parent.children.push(node);
        placed.add(node.id);
        return;
      }
    }
    root.children.push(node);
    placed.add(node.id);
  };

  for (const node of nodes) place(node, new Set());
  return root;
}

function refreshFromPresets(node: AppliedNode, presets: TimelinePresetLike[]): AppliedNode {
  const preset = presets.find((item) => item.id === node.id);
  const children = node.children.map((child) => refreshFromPresets(child, presets));
  if (!preset) return { ...node, children };
  return { ...nodeFromPreset(preset, presets), children };
}

/** Fields written back onto a preset when the timeline changes its span. */
export function timingInputPatch(timing: NodeTiming): Record<string, unknown> {
  if (timing.kind === 'lock') {
    // A derived caption lock stays derived, so the block keeps following the audio.
    return timing.auto ? {} : { lock: timing.refId };
  }
  if (timing.kind === 'hug') {
    return { start: timing.start, duration: undefined, lock: undefined };
  }
  if (timing.kind === 'autoRange') {
    return { start: undefined, duration: undefined, lock: undefined };
  }
  if (timing.kind === 'explicit') {
    return {
      start: timing.start,
      duration: timing.duration,
      lock: undefined,
    };
  }
  if ('start' in timing) return { start: timing.start, lock: undefined };
  return {};
}

export function applyTimingToPresetInput(
  input: unknown,
  timing: NodeTiming,
): Record<string, unknown> {
  const next = { ...asRecord(input) };
  for (const [key, value] of Object.entries(timingInputPatch(timing))) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  if (timing.kind === 'explicit' || timing.kind === 'hug' || timing.kind === 'autoRange') {
    delete next.trackStartOffset;
    delete next.trackDuration;
    delete next.trackFitDurationTo;
    delete next.fitDurationTo;
  }
  return next;
}

function collectIds(node: AppliedNode, into: Set<string>) {
  into.add(node.id);
  for (const child of node.children) collectIds(child, into);
}

function cloneBranch(node: AppliedNode): AppliedNode {
  return { ...node, children: node.children.map(cloneBranch) };
}

/**
 * Insert presets that exist in `derived` but not in `saved`, under the same
 * parent and beside the same siblings. Existing sibling order is left as saved.
 */
function graftMissing(saved: AppliedNode, derived: AppliedNode): AppliedNode {
  const known = new Set<string>();
  collectIds(saved, known);

  const graftInto = (savedNode: AppliedNode): AppliedNode => {
    const derivedNode = findNode(derived, savedNode.id);
    let children = savedNode.children.map(graftInto);
    if (!derivedNode) return { ...savedNode, children };

    for (const child of derivedNode.children) {
      if (known.has(child.id)) continue;
      const index = derivedNode.children.findIndex((item) => item.id === child.id);
      const preceding = derivedNode.children.slice(0, index);
      let insertAt = -1;
      for (let i = preceding.length - 1; i >= 0; i--) {
        const at = children.findIndex((item) => item.id === preceding[i]?.id);
        if (at >= 0) {
          insertAt = at + 1;
          break;
        }
      }
      if (insertAt < 0) {
        const following = new Set(
          derivedNode.children.slice(index + 1).map((item) => item.id),
        );
        const later = children.findIndex((item) => following.has(item.id));
        insertAt = later >= 0 ? later : children.length;
      }
      const branch = cloneBranch(child);
      children = [
        ...children.slice(0, insertAt),
        branch,
        ...children.slice(insertAt),
      ];
      collectIds(branch, known);
    }
    return { ...savedNode, children };
  };

  return graftInto(saved);
}

/**
 * Load the instance tree. A saved `nodes` tree wins for structure and timing.
 * Preset params are refreshed from the flat list so inspector edits still apply.
 * Presets added after the tree was saved are inserted under their parent scene,
 * so a copy made inside a group stays inside that group.
 */
export function loadInstanceTree(timeline: Timeline): AppliedNode {
  const derived = deriveTree(timeline);
  if (!timeline.nodes) return derived;
  const saved = refreshFromPresets(timeline.nodes, timeline.presets ?? []);
  return graftMissing(saved, derived);
}

export interface CompileStep {
  node: AppliedNode;
  /** Render id to attach this preset under. Null keeps the preset's own target. */
  parentRenderId: string | null;
}

/** Depth-first compile order. The root scene runs before its children. */
export function compileOrder(root: AppliedNode): CompileStep[] {
  const steps: CompileStep[] = [];
  const walk = (node: AppliedNode, parentRenderId: string | null) => {
    steps.push({ node, parentRenderId });
    const childParent =
      node.role === 'scene' ? (sceneRenderId(node) ?? parentRenderId) : parentRenderId;
    for (const child of node.children) walk(child, childParent);
  };
  walk(root, null);
  return steps;
}

export function findNode(root: AppliedNode, id: string): AppliedNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

/** The node and every nested preset under it, at any depth. */
export function collectSubtreeIds(root: AppliedNode, id: string): string[] {
  const node = findNode(root, id);
  if (!node) return [id];
  const ids: string[] = [];
  const walk = (current: AppliedNode) => {
    ids.push(current.id);
    for (const child of current.children) walk(child);
  };
  walk(node);
  return ids;
}

/**
 * Presets removed with a deletion: each selected id, plus every preset nested
 * under it. The root scene is never included.
 */
export function idsRemovedWith(root: AppliedNode, ids: Iterable<string>): string[] {
  const drop = new Set<string>();
  for (const id of ids) {
    if (id === root.id) continue;
    for (const member of collectSubtreeIds(root, id)) {
      if (member !== root.id) drop.add(member);
    }
  }
  return [...drop];
}

/** Remove these nodes. Nested presets leave with a removed parent. */
export function pruneNodes(root: AppliedNode, ids: Set<string>): AppliedNode {
  return {
    ...root,
    children: root.children
      .filter((child) => !ids.has(child.id))
      .map((child) => pruneNodes(child, ids)),
  };
}

/** Set `disabled` on a node and every preset nested under it. */
export function mapNodeDisabled(
  root: AppliedNode,
  ids: Set<string>,
  disabled: boolean,
): AppliedNode {
  return {
    ...root,
    disabled: ids.has(root.id) ? disabled : root.disabled,
    children: root.children.map((child) => mapNodeDisabled(child, ids, disabled)),
  };
}

function withoutNode(root: AppliedNode, id: string): AppliedNode {
  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== id)
      .map((child) => withoutNode(child, id)),
  };
}

export function parentOfNode(root: AppliedNode, id: string): AppliedNode | null {
  let found: AppliedNode | null = null;
  const walk = (node: AppliedNode, parent: AppliedNode | null) => {
    if (node.id === id) found = parent;
    for (const child of node.children) walk(child, node);
  };
  walk(root, null);
  return found;
}

/** Same child order, including nested groups. */
function sameChildOrder(a: AppliedNode, b: AppliedNode): boolean {
  if (a.id !== b.id || a.children.length !== b.children.length) return false;
  return a.children.every((child, index) => sameChildOrder(child, b.children[index]!));
}

/**
 * Selected ids in tree order. A selected child of a selected block is omitted,
 * because it moves with that block.
 */
export function outermostIds(root: AppliedNode, ids: Iterable<string>): string[] {
  const wanted = new Set(ids);
  const ordered: string[] = [];
  const walk = (node: AppliedNode) => {
    if (node.id !== root.id && wanted.has(node.id)) {
      ordered.push(node.id);
      return;
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return ordered;
}

/**
 * Move nodes under a scene at `index` among that scene's remaining children.
 * Ids are placed in tree order. A selected child of a selected block stays inside it.
 * Refuses cycles and non-scene parents. Returns the same root when nothing moves.
 */
export function moveNodes(
  root: AppliedNode,
  nodeIds: readonly string[],
  parentId: string,
  index: number,
): AppliedNode {
  const parent = findNode(root, parentId);
  if (!parent || parent.role !== 'scene') return root;
  const ordered = outermostIds(root, nodeIds).flatMap((id) => {
    if (id === parentId) return [];
    const node = findNode(root, id);
    if (!node || findNode(node, parentId)) return [];
    return [node];
  });
  if (ordered.length === 0) return root;
  let stripped = root;
  for (const node of ordered) stripped = withoutNode(stripped, node.id);
  const strippedParent = findNode(stripped, parentId);
  if (!strippedParent) return root;
  const at = Math.max(0, Math.min(index, strippedParent.children.length));
  const insert = (current: AppliedNode): AppliedNode => {
    if (current.id === parentId) {
      const children = [...current.children];
      children.splice(at, 0, ...ordered);
      return { ...current, children };
    }
    return { ...current, children: current.children.map(insert) };
  };
  const next = insert(stripped);
  return sameChildOrder(root, next) ? root : next;
}

/**
 * Move a node under a scene at `index` among that scene's remaining children.
 * Refuses cycles and non-scene parents. Returns the same root when nothing moves.
 */
export function moveNode(
  root: AppliedNode,
  nodeId: string,
  parentId: string,
  index: number,
): AppliedNode {
  return moveNodes(root, [nodeId], parentId, index);
}

/** Insert a preset node under a scene. The preset is not already in `root`. */
export function insertPresetNode(
  root: AppliedNode,
  preset: TimelinePresetLike,
  presets: TimelinePresetLike[],
  parentId: string,
  index: number,
): AppliedNode {
  const node = nodeFromPreset(preset, presets);
  const parent = findNode(root, parentId);
  const target = parent?.role === 'scene' ? parent : root;
  const at = Math.max(0, Math.min(index, target.children.length));
  const insert = (current: AppliedNode): AppliedNode => {
    if (current.id === target.id) {
      const children = [...current.children];
      children.splice(at, 0, node);
      return { ...current, children };
    }
    return { ...current, children: current.children.map(insert) };
  };
  return insert(root);
}

/**
 * Where a dragged block lands.
 * Dropping on a group enters that group. Dropping on any of its children
 * enters the same group, beside that child.
 */
export function blockDropTarget(
  root: AppliedNode,
  activeId: string,
  overId: string,
  placeAfter: boolean,
  movingIds?: readonly string[],
): { parentId: string; index: number } | null {
  const moving = new Set(
    outermostIds(root, movingIds && movingIds.length > 0 ? movingIds : [activeId]),
  );
  if (findNode(root, activeId)) moving.add(activeId);
  if (!overId || moving.has(overId)) return null;
  const overNode = findNode(root, overId);
  if (!overNode || !findNode(root, activeId)) return null;
  for (const id of moving) {
    const node = findNode(root, id);
    if (node && findNode(node, overId)) return null;
  }

  if (overNode.role === 'scene' && overNode.id !== root.id) {
    return { parentId: overNode.id, index: Number.MAX_SAFE_INTEGER };
  }

  const parent = parentOfNode(root, overId) ?? root;
  if (parent.role !== 'scene' || moving.has(parent.id)) return null;
  const siblingIds = parent.children
    .map((child) => child.id)
    .filter((id) => !moving.has(id));
  const overIndex = siblingIds.indexOf(overId);
  const index = overIndex < 0 ? siblingIds.length : overIndex + (placeAfter ? 1 : 0);
  return { parentId: parent.id, index };
}

/**
 * Where a duplicate or paste is inserted relative to `anchorId`.
 * `beside` stays in the anchor's group. `into-or-beside` enters a selected group.
 */
export function presetAnchorPlacement(
  root: AppliedNode,
  anchorId: string | null,
  placement: 'beside' | 'into-or-beside',
): { parentId: string; index: number } {
  const fallback = { parentId: root.id, index: root.children.length };
  if (!anchorId) return fallback;
  const anchor = findNode(root, anchorId);
  if (!anchor) return fallback;
  if (placement === 'into-or-beside' && anchor.role === 'scene' && anchor.id !== root.id) {
    return { parentId: anchor.id, index: anchor.children.length };
  }
  const parent = parentOfNode(root, anchorId) ?? root;
  const at = parent.children.findIndex((child) => child.id === anchorId);
  return {
    parentId: parent.id,
    index: at < 0 ? parent.children.length : at + 1,
  };
}

/** Move a node to the end of another scene. Refuses cycles and non-scene parents. */
export function reparentNode(
  root: AppliedNode,
  nodeId: string,
  parentId: string,
): AppliedNode {
  return moveNode(root, nodeId, parentId, Number.MAX_SAFE_INTEGER);
}

/** Left-panel block rows, depth-first under the root scene. */
export function listBlockRows(root: AppliedNode): Array<{ id: string; depth: number }> {
  const rows: Array<{ id: string; depth: number }> = [];
  const walk = (node: AppliedNode, depth: number) => {
    for (const child of node.children) {
      rows.push({ id: child.id, depth });
      walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

/**
 * Flat preset order that `deriveTree` will turn back into `root`.
 * Sibling order inside a group is this array order when no `nodes` tree is stored.
 * Returns the same array when it already matches.
 */
export function orderPresetsLikeTree<T extends { id: string }>(
  presets: T[] | undefined,
  root: AppliedNode,
): T[] | undefined {
  if (!presets || presets.length < 2) return presets;
  const rank = new Map<string, number>([[root.id, 0]]);
  listBlockRows(root).forEach((row, index) => rank.set(row.id, index + 1));
  const indexed = presets.map((preset, index) => ({ preset, index }));
  indexed.sort((a, b) => {
    const ar = rank.get(a.preset.id) ?? Number.MAX_SAFE_INTEGER;
    const br = rank.get(b.preset.id) ?? Number.MAX_SAFE_INTEGER;
    if (ar !== br) return ar - br;
    return a.index - b.index;
  });
  const next = indexed.map((item) => item.preset);
  if (next.every((preset, index) => preset === presets[index])) return presets;
  return next;
}

export function mapNodeTiming(
  root: AppliedNode,
  id: string,
  timing: NodeTiming,
): AppliedNode {
  if (root.id === id) return { ...root, timing };
  return {
    ...root,
    children: root.children.map((child) => mapNodeTiming(child, id, timing)),
  };
}

/** Visible timeline rows: scenes and tracks, depth-first. */
export function visibleRows(
  root: AppliedNode,
): Array<{ node: AppliedNode; depth: number }> {
  const rows: Array<{ node: AppliedNode; depth: number }> = [];
  const walk = (node: AppliedNode, depth: number) => {
    if (node.presetId === VIRTUAL_ROOT_ID) {
      for (const child of node.children) walk(child, depth);
      return;
    }
    if (node.role !== 'modifier' && !node.disabled) {
      rows.push({ node, depth });
    }
    const childDepth = node.role === 'modifier' ? depth : depth + 1;
    for (const child of node.children) walk(child, childDepth);
  };
  walk(root, 0);
  return rows;
}

/** Track name when the block has one. Blocks without it cannot be locked to. */
function trackNameOf(node: AppliedNode): string | undefined {
  const input = node.input;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  if (!Object.prototype.hasOwnProperty.call(input, 'trackName')) return undefined;
  const trackName = (input as Record<string, unknown>).trackName;
  if (typeof trackName !== 'string' || !trackName.trim()) return undefined;
  return trackName.trim();
}

/**
 * Names a lock may target. Siblings and ancestors are included.
 * A scene may also lock to any descendant, which trims the scene to
 * that child. The stored value is the track name when it has one.
 */
export function lockTargetNames(root: AppliedNode, nodeId: string): string[] {
  const parentById = new Map<string, AppliedNode | null>();
  const nodeById = new Map<string, AppliedNode>();
  const index = (node: AppliedNode, parent: AppliedNode | null) => {
    parentById.set(node.id, parent);
    nodeById.set(node.id, node);
    for (const child of node.children) index(child, node);
  };
  index(root, null);
  if (!parentById.has(nodeId)) return [];

  const names = new Set<string>();
  const add = (node: AppliedNode | null | undefined) => {
    if (!node || node.id === VIRTUAL_ROOT_ID || node.id === nodeId || node.role === 'modifier') return;
    const name = trackNameOf(node);
    if (name) names.add(name);
  };

  const parent = parentById.get(nodeId) ?? null;
  if (parent) {
    for (const sibling of parent.children) add(sibling);
  }
  let cursor = parent;
  while (cursor) {
    add(cursor);
    cursor = parentById.get(cursor.id) ?? null;
  }
  const self = nodeById.get(nodeId);
  if (self?.role === 'scene') {
    const descendants: AppliedNode[] = [];
    const walk = (node: AppliedNode) => {
      for (const child of node.children) {
        if (child.role !== 'modifier' && !child.disabled) descendants.push(child);
        walk(child);
      }
    };
    walk(self);
    const nameCount = new Map<string, number>();
    for (const descendant of descendants) {
      const key = trackNameOf(descendant) ?? descendant.name?.trim();
      if (!key) continue;
      nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
    }
    for (const descendant of descendants) {
      const trackName = trackNameOf(descendant);
      if (trackName) {
        names.add(trackName);
        continue;
      }
      const name = descendant.name?.trim();
      if (name && nameCount.get(name) === 1) names.add(name);
      else names.add(descendant.id);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
