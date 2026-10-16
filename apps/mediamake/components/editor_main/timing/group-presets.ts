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
