import type { DatabasePreset, Preset as PresetType } from "@/components/editor/presets/types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { uniqueTrackName } from "./preset-track-name";
import type { AppliedNode } from "./types";
import { findNode, loadInstanceTree, orderPresetsLikeTree, parentOfNode, sceneRenderId } from "./load-instance-tree";

type PresetInstance = NonNullable<Timeline["presets"]>[number];

export interface GroupSceneSeed {
  presetInfo: PresetType | DatabasePreset;
}

export interface GroupPresetsResult {
  presets: PresetInstance[];
  nodes: AppliedNode;
  sceneId: string;
}

function asRecord(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

function spanEnd(node: AppliedNode): number {
  const input = asRecord(node.input);
  const start =
    typeof input.start === "number" && Number.isFinite(input.start) ? input.start : 0;
  const duration =
    typeof input.duration === "number" && Number.isFinite(input.duration) && input.duration > 0
      ? input.duration
      : 0;
  return start + duration;
}

function stripIds(node: AppliedNode, ids: Set<string>): AppliedNode {
  return {
    ...node,
    children: node.children
      .filter((child) => !ids.has(child.id))
      .map((child) => stripIds(child, ids)),
  };
}

function cloneNode(node: AppliedNode): AppliedNode {
  return { ...node, children: node.children.map(cloneNode) };
}

function insertChild(
  node: AppliedNode,
  parentId: string,
  child: AppliedNode,
  index: number,
): AppliedNode {
  if (node.id === parentId) {
    const children = [...node.children];
    const at = Math.max(0, Math.min(index, children.length));
    children.splice(at, 0, child);
    return { ...node, children };
  }
  return {
    ...node,
    children: node.children.map((item) => insertChild(item, parentId, child, index)),
  };
}

function withParent(input: unknown, parentId: string, rootId: string): Record<string, unknown> {
  const next = { ...asRecord(input) };
  if (parentId === rootId) delete next.parentId;
  else next.parentId = parentId;
  return next;
}

function withParentScene(
  input: unknown,
  parentId: string,
  rootId: string,
  attachedToId: string,
): Record<string, unknown> {
  return { ...withParent(input, parentId, rootId), attachedToId };
}

interface GroupSelection {
  tree: AppliedNode;
  parent: AppliedNode;
  ordered: AppliedNode[];
  firstIndex: number;
}

function selectionToGroup(
  timeline: Pick<Timeline, "presets" | "nodes" | "configuration">,
  ids: string[],
): GroupSelection | null {
  const presets = timeline.presets ?? [];
  const unique = [...new Set(ids)].filter((id) => presets.some((preset) => preset.id === id));
  if (unique.length < 2) return null;

  const tree = loadInstanceTree(timeline as Timeline);
  if (unique.some((id) => id === tree.id || !findNode(tree, id))) return null;

  const parents = unique.map((id) => parentOfNode(tree, id));
  const parent = parents[0];
  if (!parent || parents.some((item) => item?.id !== parent.id)) return null;

  for (const id of unique) {
    const node = findNode(tree, id);
    if (!node) return null;
    for (const other of unique) {
      if (other !== id && findNode(node, other)) return null;
    }
  }

  const ordered = parent.children.filter((child) => unique.includes(child.id));
  if (ordered.length < 2) return null;
  const firstIndex = parent.children.findIndex((child) => child.id === ordered[0]?.id);
  if (firstIndex < 0) return null;
  return { tree, parent, ordered, firstIndex };
}

/** Same-parent selections of two or more presets can become one scene. */
export function canGroupPresets(
  timeline: Pick<Timeline, "presets" | "nodes" | "configuration">,
  ids: string[],
): boolean {
  return selectionToGroup(timeline, ids) !== null;
}

/**
 * Wrap the selected presets in a new scene that stays beside them.
 * Mixed parents, or a preset that contains another selected preset, are ignored.
 */
export function groupSelectedPresets(
  timeline: Pick<Timeline, "presets" | "nodes" | "configuration">,
  ids: string[],
  seed: GroupSceneSeed,
  sceneId: string,
): GroupPresetsResult | null {
  const selection = selectionToGroup(timeline, ids);
  if (!selection) return null;
  const { tree, parent, ordered, firstIndex } = selection;
  const presets = timeline.presets ?? [];
  const metadata = seed.presetInfo.metadata;
  const trackName = uniqueTrackName(presets, "scene");
  const attachedToId = sceneRenderId(parent) ?? "BaseScene";
  const duration = Math.max(10, ...ordered.map(spanEnd));
  const sceneInput: Record<string, unknown> = {
    ...(metadata.defaultInputParams ?? {}),
    trackName,
    trackType: "aligned",
    start: 0,
    duration,
    attachedToId,
    ...withParent({}, parent.id, tree.id),
  };

  const sceneNode: AppliedNode = {
    id: sceneId,
    presetId: metadata.id,
    name: trackName,
    role: "scene",
    arrangement: "aligned",
    input: sceneInput,
    timing: { kind: "explicit", start: 0, duration },
    children: ordered.map((node) => {
      const clone = cloneNode(node);
      clone.input = withParentScene(node.input, sceneId, tree.id, sceneId);
      return clone;
    }),
  };

  const nodes = insertChild(
    stripIds(tree, new Set(ordered.map((node) => node.id))),
    parent.id,
    sceneNode,
    firstIndex,
  );

  const scenePreset: PresetInstance = {
    id: sceneId,
    presetId: metadata.id,
    presetType: metadata.presetType,
    presetInfo: seed.presetInfo,
    presetInputData: sceneInput,
    disabled: false,
  };

  const nextPresets = presets.map((preset) => {
    if (!ordered.some((node) => node.id === preset.id)) return preset;
    return {
      ...preset,
      presetInputData: withParentScene(preset.presetInputData, sceneId, tree.id, sceneId),
    };
  });
  const insertAt = nextPresets.findIndex((preset) => preset.id === ordered[0]?.id);
  nextPresets.splice(insertAt < 0 ? nextPresets.length : insertAt, 0, scenePreset);

  return {
    presets: orderPresetsLikeTree(nextPresets, nodes) ?? nextPresets,
    nodes,
    sceneId,
  };
}

export interface UngroupPresetsResult {
  presets: PresetInstance[];
  nodes: AppliedNode;
  /** Scenes removed by this ungroup. */
  removedIds: string[];
  /** Blocks that left those scenes, in tree order. Nested scenes that were also removed are omitted. */
  childIds: string[];
}

function sceneDepth(tree: AppliedNode, id: string): number {
  let depth = 0;
  let parent = parentOfNode(tree, id);
  while (parent) {
    depth += 1;
    parent = parentOfNode(tree, parent.id);
  }
  return depth;
}

/**
 * A scene block can be dissolved. The base scene is the root and stays put.
 */
export function canUngroupPreset(
  timeline: Pick<Timeline, "presets" | "nodes" | "configuration">,
  id: string,
): boolean {
  const presets = timeline.presets ?? [];
  const preset = presets.find((item) => item.id === id);
  if (!preset || preset.presetId !== "scene") return false;
  const tree = loadInstanceTree(timeline as Timeline);
  if (id === tree.id) return false;
  const node = findNode(tree, id);
  if (!node || node.role !== "scene" || node.presetId !== "scene") return false;
  return parentOfNode(tree, id) !== null;
}

function retargetAwayFromScene(
  input: unknown,
  sceneId: string,
  parentId: string,
  rootId: string,
  attachedToId: string,
  direct: boolean,
): Record<string, unknown> {
  const current = asRecord(input);
  const attachPoints = current.attachedToId === sceneId;
  if (!direct && !attachPoints) return current;
  const next = { ...current };
  if (direct) {
    if (parentId === rootId) delete next.parentId;
    else next.parentId = parentId;
  }
  if (direct || attachPoints) next.attachedToId = attachedToId;
  return next;
}

function retargetNode(
  node: AppliedNode,
  sceneId: string,
  parentId: string,
  rootId: string,
  attachedToId: string,
  direct: boolean,
): AppliedNode {
  return {
    ...node,
    input: retargetAwayFromScene(node.input, sceneId, parentId, rootId, attachedToId, direct),
    children: node.children.map((child) =>
      retargetNode(child, sceneId, parentId, rootId, attachedToId, false),
    ),
  };
}

/** Replace one scene with its children, in that scene's place under its parent. */
function ungroupOneScene(
  timeline: Pick<Timeline, "presets" | "nodes" | "configuration">,
  sceneId: string,
): { presets: PresetInstance[]; nodes: AppliedNode; childIds: string[] } | null {
  if (!canUngroupPreset(timeline, sceneId)) return null;
  const tree = loadInstanceTree(timeline as Timeline);
  const scene = findNode(tree, sceneId);
  const parent = parentOfNode(tree, sceneId);
  if (!scene || !parent) return null;
  const childIds = scene.children.map((child) => child.id);
  const attachedToId = sceneRenderId(parent) ?? "BaseScene";
  const direct = new Set(childIds);

  const lift = (node: AppliedNode): AppliedNode => {
    const index = node.children.findIndex((child) => child.id === sceneId);
    if (index >= 0) {
      const lifted = node.children[index]!.children.map((child) =>
        retargetNode(child, sceneId, parent.id, tree.id, attachedToId, true),
      );
      return {
        ...node,
        children: [
          ...node.children.slice(0, index),
          ...lifted,
          ...node.children.slice(index + 1),
        ],
      };
    }
    return { ...node, children: node.children.map(lift) };
  };

  const nodes = lift(tree);
  const nextPresets = (timeline.presets ?? [])
    .filter((preset) => preset.id !== sceneId)
    .map((preset) => {
      const input = asRecord(preset.presetInputData);
      if (!direct.has(preset.id) && input.attachedToId !== sceneId) {
        return preset;
      }
      return {
        ...preset,
        presetInputData: retargetAwayFromScene(
          preset.presetInputData,
          sceneId,
          parent.id,
          tree.id,
          attachedToId,
          direct.has(preset.id),
        ),
      };
    });

  return {
    presets: orderPresetsLikeTree(nextPresets, nodes) ?? nextPresets,
    nodes,
    childIds,
  };
}

/**
 * Dissolve scene blocks. Their children take the scene's place under the parent.
 * The base scene is left alone. Nested scenes are dissolved from the inside out.
 */
export function ungroupSelectedPresets(
  timeline: Pick<Timeline, "presets" | "nodes" | "configuration">,
  ids: string[],
): UngroupPresetsResult | null {
  const tree = loadInstanceTree(timeline as Timeline);
  const scenes = [...new Set(ids)]
    .filter((id) => canUngroupPreset(timeline, id))
    .sort((a, b) => sceneDepth(tree, b) - sceneDepth(tree, a));
  if (scenes.length === 0) return null;

  let current = timeline;
  const removedIds: string[] = [];
  const lifted = new Set<string>();
  for (const sceneId of scenes) {
    const step = ungroupOneScene(current, sceneId);
    if (!step) continue;
    current = { ...current, presets: step.presets, nodes: step.nodes };
    removedIds.push(sceneId);
    for (const childId of step.childIds) lifted.add(childId);
  }
  if (removedIds.length === 0 || !current.presets || !current.nodes) return null;
  for (const id of removedIds) lifted.delete(id);

  const ordered = orderPresetsLikeTree(current.presets, current.nodes) ?? current.presets;
  return {
    presets: ordered,
    nodes: current.nodes,
    removedIds,
    childIds: ordered.map((preset) => preset.id).filter((id) => lifted.has(id)),
  };
}
