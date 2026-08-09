/**
 * Multi-user layer state merge.
 *
 * Given the base timeline children (from preset compilation) and an ordered
 * list of DB history operations from all users, produces a merged
 * LayerHistorySnapshot and a list of detected conflicts.
 *
 * Strategy:
 *  - Operations are applied in timestamp order (oldest first).
 *  - "Later wins" for same-node same-field conflicts — deterministic with no
 *    manual resolution required for most edits.
 *  - Conflicts are flagged (different clients touched the same node) but the
 *    merge still succeeds; the UI shows conflicts as warnings.
 *  - A "reset" operation from any user clears all accumulated edits at that
 *    point and restarts from the base timeline.
 */
import type { RenderableComponentData } from "@microfox/remotion";
import type {
  LayerHistorySnapshot,
  LayerNodeChange,
  MergeConflict,
  LayerChangeType,
} from "./layer-types";

export interface LayerOperation {
  clientId: string;
  timestamp: number;
  changes: Array<Omit<LayerNodeChange, "nodeData"> & {
    nodeData?: unknown; // full or trimmed — checked at runtime
  }>;
}

export interface MergeResult {
  snapshot: LayerHistorySnapshot;
  conflicts: MergeConflict[];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Replay all operations onto the base timeline to produce a merged state.
 * Safe to call with an empty operations array (returns base state with no edits).
 */
export function computeGlobalLayerState(
  base: RenderableComponentData[],
  operations: LayerOperation[]
): MergeResult {
  const sorted = [...operations].sort((a, b) => a.timestamp - b.timestamp);

  let loadedChildrenData: RenderableComponentData[] | null = deepClone(base);
  let addedNodes: RenderableComponentData[] = [];
  const overrides = new Map<string, Record<string, unknown>>();
  const childrenOrderByParentId = new Map<string, string[]>();
  const hiddenLayerIds = new Set<string>();
  const lockedLayerIds = new Set<string>();

  const conflicts: MergeConflict[] = [];
  /** nodeId → { clientId, changeType } of the most recent edit to that node. */
  const lastTouch = new Map<string, { clientId: string; changeType: LayerChangeType }>();

  for (const op of sorted) {
    for (const change of op.changes) {
      const { nodeId, changeType } = change;
      const clientId = op.clientId;

      // ── Conflict detection ───────────────────────────────────────────────
      const prev = lastTouch.get(nodeId);
      if (prev && prev.clientId !== clientId) {
        const existing = conflicts.find(
          (c) => c.nodeId === nodeId && c.changeType === changeType
        );
        if (existing) {
          if (!existing.clients.includes(clientId)) existing.clients.push(clientId);
        } else {
          conflicts.push({
            nodeId,
            changeType,
            clients: [prev.clientId, clientId],
            description: `"${changeType}" on …${nodeId.slice(-8)} by multiple users`,
          });
        }
      }
      lastTouch.set(nodeId, { clientId, changeType });

      // ── Apply change ─────────────────────────────────────────────────────
      switch (changeType) {
        case "override": {
          const existing = overrides.get(nodeId) ?? {};
          overrides.set(nodeId, deepMerge(existing, (change.nextOverride ?? {}) as Record<string, unknown>));
          break;
        }

        case "add_node": {
          const nd = change.nodeData;
          if (nd && isFullNode(nd)) {
            const full = nd as RenderableComponentData;
            if (!addedNodes.find((n) => n.id === full.id)) {
              addedNodes = [...addedNodes, full];
            }
          }
          break;
        }

        case "add_child": {
          const nd = change.nodeData;
          const parentId = change.parentId;
          if (nd && isFullNode(nd) && parentId && loadedChildrenData) {
            const full = nd as RenderableComponentData;
            loadedChildrenData = insertIntoTree(loadedChildrenData, parentId, full);
          }
          break;
        }

        case "remove_node": {
          // Remove from both layers and addedNodes; clear its overrides / ui state
          addedNodes = addedNodes.filter((n) => n.id !== nodeId);
          if (loadedChildrenData) {
            loadedChildrenData = removeFromTree(loadedChildrenData, nodeId);
          }
          overrides.delete(nodeId);
          hiddenLayerIds.delete(nodeId);
          lockedLayerIds.delete(nodeId);
          break;
        }

        case "reorder": {
          if (change.nextOrder && change.parentId) {
            childrenOrderByParentId.set(change.parentId, change.nextOrder);
          }
          break;
        }

        case "visibility": {
          if (change.nextValue === false) hiddenLayerIds.add(nodeId);
          else hiddenLayerIds.delete(nodeId);
          break;
        }

        case "lock": {
          if (change.nextValue === true) lockedLayerIds.add(nodeId);
          else lockedLayerIds.delete(nodeId);
          break;
        }

        case "reset": {
          // Any user resetting clears all accumulated edits at this timestamp
          loadedChildrenData = deepClone(base);
          addedNodes = [];
          overrides.clear();
          childrenOrderByParentId.clear();
          hiddenLayerIds.clear();
          lockedLayerIds.clear();
          lastTouch.clear();
          break;
        }
      }
    }
  }

  return {
    snapshot: {
      loadedChildrenData,
      addedNodes,
      overrides: Array.from(overrides.entries()),
      childrenOrderByParentId: Array.from(childrenOrderByParentId.entries()),
      hiddenLayerIds: Array.from(hiddenLayerIds),
      lockedLayerIds: Array.from(lockedLayerIds),
    },
    conflicts,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** A "full" node has a proper ComponentType string, not just an id/label. */
function isFullNode(nd: unknown): boolean {
  if (typeof nd !== "object" || nd === null) return false;
  const n = nd as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    typeof n.componentId === "string" &&
    ["atom", "layout", "frame", "scene", "transition"].includes(n.type as string)
  );
}

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof result[k] === "object" &&
      result[k] !== null
    ) {
      result[k] = deepMerge(
        result[k] as Record<string, unknown>,
        v as Record<string, unknown>
      );
    } else {
      result[k] = v;
    }
  }
  return result;
}

function removeFromTree(
  nodes: RenderableComponentData[],
  nodeId: string
): RenderableComponentData[] {
  if (nodes.findIndex((n) => n.id === nodeId) >= 0) {
    return nodes.filter((n) => n.id !== nodeId);
  }
  return nodes.map((n) =>
    n.childrenData?.length
      ? { ...n, childrenData: removeFromTree(n.childrenData, nodeId) }
      : n
  );
}

function insertIntoTree(
  nodes: RenderableComponentData[],
  parentId: string,
  child: RenderableComponentData
): RenderableComponentData[] {
  if (parentId === "__root__") {
    // Avoid duplicate inserts
    if (nodes.find((n) => n.id === child.id)) return nodes;
    return [...nodes, child];
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      if ((n.childrenData ?? []).find((c) => c.id === child.id)) return n;
      return { ...n, childrenData: [...(n.childrenData ?? []), child] };
    }
    if (n.childrenData?.length) {
      return { ...n, childrenData: insertIntoTree(n.childrenData, parentId, child) };
    }
    return n;
  });
}
