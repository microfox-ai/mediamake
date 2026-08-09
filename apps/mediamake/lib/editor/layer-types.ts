/**
 * Shared layer editing types used by both the history store and the merge
 * utility. Kept here (not in the store) to avoid circular imports.
 */
import type { RenderableComponentData } from "@microfox/remotion";

export type LayerChangeType =
  | "override"
  | "add_node"
  | "remove_node"
  | "add_child"
  | "reorder"
  | "visibility"
  | "lock"
  | "reset";

export interface LayerNodeChange {
  /** Stable layer item identifier (_layerItemId assigned at editor entry). */
  layerItemId: string;
  nodeId: string;
  changeType: LayerChangeType;
  prevOverride?: Record<string, unknown>;
  nextOverride?: Record<string, unknown>;
  /** Full for add_node/add_child; trimmed {id,componentId,type} for others. */
  nodeData?: RenderableComponentData | { id: string; componentId: string; type: string };
  parentId?: string;
  prevOrder?: string[];
  nextOrder?: string[];
  prevValue?: boolean;
  nextValue?: boolean;
}

/**
 * Self-contained snapshot of all layer editing state.
 * Maps/Sets are serialised to arrays so this can be JSON-stringified.
 */
export interface LayerHistorySnapshot {
  loadedChildrenData: RenderableComponentData[] | null;
  addedNodes: RenderableComponentData[];
  /** Map<nodeId, LayerOverride> as entries array. */
  overrides: [string, unknown][];
  /** Map<parentId, string[]> as entries array. */
  childrenOrderByParentId: [string, string[]][];
  hiddenLayerIds: string[];
  lockedLayerIds: string[];
}

/** Conflict detected during global state merge. */
export interface MergeConflict {
  nodeId: string;
  changeType: LayerChangeType;
  clients: string[];
  description: string;
}
