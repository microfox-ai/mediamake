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
      /** Unfocused base view. Its scene row stays compact. */
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
  /**
   * Preset selections carry `{ id }`. References and other kinds use a
   * different item shape, so this stays open.
   */
  item?: unknown;
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
  if (selected?.type !== "preset" || selected.item == null || typeof selected.item !== "object") {
    return false;
  }
  return typeof (selected.item as { id?: unknown }).id === "string";
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

function visibleSceneChildren(scene: AppliedNode): AppliedNode[] {
  return scene.children.filter((child) => child.role !== "modifier" && !child.disabled);
}

/**
 * Sequence rows for this scope. Modifiers and disabled children stay hidden.
 * The scene's own span is the first row. A sequence scene does not list each
 * child here; the timeline draws those blocks on one track under the scene.
 */
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
  const showSelf =
    scene.role === "scene" &&
    scene.presetId !== VIRTUAL_ROOT_ID &&
    (scope.includeTimelineSources || scene.id === scope.sceneId);
  const self = showSelf ? [{ node: scene, depth: 0 }] : [];
  if (scene.arrangement === "sequence") {
    if (self.length > 0) return self;
    return visibleSceneChildren(scene).map((node) => ({ node, depth: 0 }));
  }
  const children = visibleSceneChildren(scene).map((node) => ({ node, depth: 0 }));
  return [...self, ...children];
}

/** Presets represented in this scope, including children packed onto one sequence track. */
export function scopeShownPresetCount(tree: AppliedNode, scope: TimelineScope): number {
  const rows = scopeInstanceRows(tree, scope);
  if (scope.kind !== "scene-children") return rows.length;
  const scene = findNode(tree, scope.sceneId) ?? baseSceneOf(tree);
  if (scene.arrangement !== "sequence") return rows.length;
  const packed = rows.length === 1 && rows[0]?.node.id === scene.id;
  if (!packed) return rows.length;
  return rows.length + visibleSceneChildren(scene).length;
}

/** Preset ids whose range tracks belong on this scope. */
export function scopeRangePresetIds(scope: TimelineScope): string[] {
  return scope.kind === "preset" ? [scope.nodeId] : [];
}
