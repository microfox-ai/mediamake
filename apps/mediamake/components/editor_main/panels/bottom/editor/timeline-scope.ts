import {
  findNode,
  VIRTUAL_ROOT_ID,
} from "@/components/editor_main/timing/load-instance-tree";
import type { AppliedNode } from "@/components/editor_main/timing/types";
import { presetUsesMediaAtoms } from "./media-scene-blocks";

/**
 * How deep the bottom timeline opens for the current selection.
 * Scene scopes show one level of attached presets. A preset scope shows that
 * preset alone, and clip rows only when the preset owns media atoms.
 */
export type TimelineScope =
  | {
      kind: "scene-children";
      sceneId: string;
      /** Caption references stay on the unfocused base view. */
      includeTimelineSources: boolean;
    }
  | {
      kind: "preset";
      nodeId: string;
      expandClips: boolean;
    };

/** The fields of editor selection this resolver reads. */
export interface TimelineScopeSelection {
  type: string;
  item?: { id?: string };
}

export function baseSceneOf(tree: AppliedNode): AppliedNode {
  if (tree.presetId === "base-scene" || tree.presetId === VIRTUAL_ROOT_ID) return tree;
  const walk = (node: AppliedNode): AppliedNode | undefined => {
    if (node.presetId === "base-scene") return node;
    for (const child of node.children) {
      const found = walk(child);
      if (found) return found;
    }
    return undefined;
  };
  return walk(tree) ?? tree;
}

function isPresetSelection(
  selected: TimelineScopeSelection | null,
): selected is TimelineScopeSelection & { item: { id: string } } {
  return selected?.type === "preset" && typeof selected.item?.id === "string";
}

/** Map the editor selection onto one bottom-timeline scope. */
export function resolveTimelineScope(
  tree: AppliedNode,
  selected: TimelineScopeSelection | null,
): TimelineScope {
  const base = baseSceneOf(tree);
  if (isPresetSelection(selected)) {
    const node = findNode(tree, selected.item.id);
    if (node?.role === "scene") {
      return {
        kind: "scene-children",
        sceneId: node.id,
        includeTimelineSources: false,
      };
    }
    if (node && node.role !== "modifier") {
      return {
        kind: "preset",
        nodeId: node.id,
        expandClips: presetUsesMediaAtoms(node.presetId),
      };
    }
  }
  return {
    kind: "scene-children",
    sceneId: base.id,
    includeTimelineSources: true,
  };
}

/** Sequence rows for this scope. Modifiers and disabled children stay hidden. */
export function scopeInstanceRows(
  tree: AppliedNode,
  scope: TimelineScope,
): Array<{ node: AppliedNode; depth: number }> {
  if (scope.kind === "preset") {
    const node = findNode(tree, scope.nodeId);
    if (!node || node.role === "modifier") return [];
    return [{ node, depth: 0 }];
  }
  const scene = findNode(tree, scope.sceneId) ?? baseSceneOf(tree);
  const children = scene.children
    .filter((child) => child.role !== "modifier" && !child.disabled)
    .map((node) => ({ node, depth: 0 }));
  // The unfocused timeline keeps the base scene itself on top so its span can be dragged.
  if (
    scope.includeTimelineSources &&
    scene.role === "scene" &&
    scene.presetId !== VIRTUAL_ROOT_ID
  ) {
    return [{ node: scene, depth: 0 }, ...children];
  }
  return children;
}

/** Preset ids whose range tracks belong on this scope. */
export function scopeRangePresetIds(scope: TimelineScope): string[] {
  return scope.kind === "preset" ? [scope.nodeId] : [];
}
