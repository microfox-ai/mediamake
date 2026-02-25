import { create } from "zustand";
import type {
  RenderableComponentData,
  CalculatedBoundaries,
  RenderableContext,
} from "@microfox/remotion";

/** Build a map of output node id → timeline preset item id from a composition tree. */
export function buildPresetItemIdByNodeId(
  childrenData: RenderableComponentData[] | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  if (!childrenData) return map;
  const walk = (nodes: RenderableComponentData[]) => {
    for (const node of nodes) {
      const pid = (node as RenderableComponentData & { _presetItemId?: string })._presetItemId;
      if (pid) map.set(node.id, pid);
      if (node.childrenData?.length) walk(node.childrenData);
    }
  };
  walk(childrenData);
  return map;
}

export type LayerOverride = Partial<{
  data: Partial<RenderableComponentData["data"]> & {
    boundaries?: Partial<CalculatedBoundaries>;
  };
  context: Partial<RenderableContext>;
  effects?: RenderableComponentData["effects"];
}>;

export interface TrackState {
  hidden: boolean;
  muted: boolean;
  solo: boolean;
  locked: boolean;
}

/** Whole state snapshot for persistence (localStorage + API). No deltas—only full tree + UI state. */
export interface LayerStateSnapshot {
  /** Full merged layer tree. */
  childrenData?: RenderableComponentData[];
  trackStates: Record<string, TrackState>;
  hiddenLayerIds: string[];
  lockedLayerIds: string[];
}

interface LayerState {
  trackStates: Record<string, TrackState>;
  setTrackState: (trackId: string, state: Partial<TrackState>) => void;

  selectedLayerIds: string[];
  overrides: Map<string, LayerOverride>;
  hiddenLayerIds: Set<string>;
  lockedLayerIds: Set<string>;
  presetItemIdByNodeId: Map<string, string>;
  currentFrame: number;
  seekToFrame: (frame: number) => void;

  setSelectedLayerIds: (ids: string[]) => void;
  setCurrentFrame: (frame: number) => void;
  setSeekToFrame: (fn: (frame: number) => void) => void;
  selectLayer: (id: string, addToSelection?: boolean) => void;
  clearLayerSelection: () => void;
  toggleLayerSelection: (id: string) => void;

  setLayerHidden: (nodeId: string, hidden: boolean) => void;
  toggleLayerHidden: (nodeId: string) => void;
  isLayerHidden: (nodeId: string) => boolean;

  setLayerLocked: (nodeId: string, locked: boolean) => void;
  toggleLayerLocked: (nodeId: string) => void;
  isLayerLocked: (nodeId: string) => boolean;

  setOverride: (nodeId: string, override: LayerOverride) => void;
  clearOverride: (nodeId: string) => void;
  clearOverridesForPresetItem: (presetItemId: string) => void;
  setPresetItemIdByNodeId: (map: Map<string, string>) => void;

  hasOverridesForPresetItem: (presetItemId: string) => boolean;
  getNodeIdsForPresetItem: (presetItemId: string) => string[];
  selectPresetItem: (presetItemId: string) => void;
  getOverride: (nodeId: string) => LayerOverride | undefined;

  addedNodes: RenderableComponentData[];
  addNode: (node: RenderableComponentData) => void;
  removeAddedNode: (id: string) => void;
  reorderAddedNodes: (fromIndex: number, toIndex: number) => void;

  /** Insert a new node as a child of the given parent (or root) into the base tree. */
  addChildNode: (
    baseFromCompile: RenderableComponentData[] | undefined,
    parentId: string,
    node: RenderableComponentData
  ) => void;

  childrenOrderByParentId: Map<string, string[]>;
  setChildrenOrder: (
    parentId: string,
    childIds: string[],
    baseFromCompile?: RenderableComponentData[] | undefined
  ) => void;

  loadedChildrenData: RenderableComponentData[] | null;
  /** Set root-level children directly (used for reorder so UI updates immediately). */
  setRootChildren: (children: RenderableComponentData[] | null) => void;
  /** Replace a parent's childrenData in the tree and persist. For __root__ uses first root node's children. */
  setParentChildrenOrder: (
    parentId: string,
    reorderedChildren: RenderableComponentData[],
    baseFromCompile?: RenderableComponentData[] | undefined
  ) => void;
  getMergedChildren: (baseFromCompile: RenderableComponentData[] | undefined) => RenderableComponentData[] | undefined;

  getLayerStateSnapshot: (baseFromCompile?: RenderableComponentData[]) => LayerStateSnapshot;
  loadLayerState: (snapshot: LayerStateSnapshot) => void;

  /** Clear all overrides, added nodes, and order so layers match the generated timeline output. */
  resetLayerStateToGenerated: () => void;

  /** Remove a layer by id (from addedNodes or from loaded/base tree). Clears override and updates order. */
  removeNode: (nodeId: string, baseFromCompile?: RenderableComponentData[] | undefined) => void;
}

export const useLayerStateStore = create<LayerState>((set, get) => ({
  trackStates: {},
  setTrackState: (trackId, state) =>
    set((prev) => ({
      trackStates: {
        ...prev.trackStates,
        [trackId]: { ...(prev.trackStates[trackId] || { hidden: false, muted: false, solo: false, locked: false }), ...state },
      },
    })),

  selectedLayerIds: [],
  overrides: new Map(),
  hiddenLayerIds: new Set(),
  lockedLayerIds: new Set(),
  presetItemIdByNodeId: new Map(),
  currentFrame: 0,
  seekToFrame: () => {},

  setSelectedLayerIds: (ids) => set({ selectedLayerIds: ids }),
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setSeekToFrame: (fn) => set({ seekToFrame: fn }),

  selectLayer: (id, addToSelection = false) => {
    set((state) => ({
      selectedLayerIds: addToSelection
        ? state.selectedLayerIds.includes(id)
          ? state.selectedLayerIds.filter((x) => x !== id)
          : [...state.selectedLayerIds, id]
        : [id],
    }));
  },

  clearLayerSelection: () => set({ selectedLayerIds: [] }),

  toggleLayerSelection: (id) => {
    set((state) => {
      const has = state.selectedLayerIds.includes(id);
      return {
        selectedLayerIds: has
          ? state.selectedLayerIds.filter((x) => x !== id)
          : [...state.selectedLayerIds, id],
      };
    });
  },

  setLayerHidden: (nodeId, hidden) => {
    set((state) => {
      const next = new Set(state.hiddenLayerIds);
      if (hidden) next.add(nodeId);
      else next.delete(nodeId);
      return { hiddenLayerIds: next };
    });
  },

  toggleLayerHidden: (nodeId) => {
    set((state) => {
      const next = new Set(state.hiddenLayerIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { hiddenLayerIds: next };
    });
  },

  isLayerHidden: (nodeId) => get().hiddenLayerIds.has(nodeId),

  setLayerLocked: (nodeId, locked) => {
    set((state) => {
      const next = new Set(state.lockedLayerIds);
      if (locked) next.add(nodeId);
      else next.delete(nodeId);
      return { lockedLayerIds: next };
    });
  },

  toggleLayerLocked: (nodeId) => {
    set((state) => {
      const next = new Set(state.lockedLayerIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { lockedLayerIds: next };
    });
  },

  isLayerLocked: (nodeId) => get().lockedLayerIds.has(nodeId),

  setOverride: (nodeId, override) => {
    if (get().lockedLayerIds.has(nodeId)) return;
    set((state) => {
      const next = new Map(state.overrides);
      const existing = next.get(nodeId) || {};
      const mergedData = deepMergeOverrideData(existing.data, override.data);
      next.set(nodeId, {
        ...existing,
        ...override,
        data: mergedData,
        context: { ...existing.context, ...override.context },
        ...(override.effects !== undefined && { effects: override.effects }),
      });
      return { overrides: next };
    });
  },

  clearOverride: (nodeId) => {
    set((state) => {
      const next = new Map(state.overrides);
      next.delete(nodeId);
      return { overrides: next };
    });
  },

  clearOverridesForPresetItem: (presetItemId) => {
    set((state) => {
      const next = new Map(state.overrides);
      state.presetItemIdByNodeId.forEach((pid, nodeId) => {
        if (pid === presetItemId) next.delete(nodeId);
      });
      return { overrides: next };
    });
  },

  setPresetItemIdByNodeId: (map) => set({ presetItemIdByNodeId: map }),

  hasOverridesForPresetItem: (presetItemId) => {
    const state = get();
    for (const [nodeId, presetItemIdStored] of state.presetItemIdByNodeId) {
      if (presetItemIdStored === presetItemId && state.overrides.has(nodeId)) return true;
    }
    return false;
  },

  getNodeIdsForPresetItem: (presetItemId) => {
    const state = get();
    const ids: string[] = [];
    state.presetItemIdByNodeId.forEach((pid, nodeId) => {
      if (pid === presetItemId) ids.push(nodeId);
    });
    return ids;
  },

  selectPresetItem: (presetItemId) => {
    set({ selectedLayerIds: get().getNodeIdsForPresetItem(presetItemId) });
  },

  getOverride: (nodeId) => get().overrides.get(nodeId),

  addedNodes: [],
  addNode: (node) => set((state) => ({ addedNodes: [...state.addedNodes, node] })),
  removeAddedNode: (id) => set((state) => ({ addedNodes: state.addedNodes.filter((n) => n.id !== id) })),
  reorderAddedNodes: (fromIndex, toIndex) => {
    set((state) => {
      const list = [...state.addedNodes];
      const [removed] = list.splice(fromIndex, 1);
      if (removed) list.splice(toIndex, 0, removed);
      return { addedNodes: list };
    });
  },

  addChildNode: (baseFromCompile, parentId, node) => {
    set((state) => {
      const base = state.loadedChildrenData ?? baseFromCompile;
      const source = base && base.length > 0 ? base : [];

      const cloneTree = (nodes: RenderableComponentData[]): RenderableComponentData[] =>
        nodes.map((n) => ({
          ...n,
          ...(n.childrenData && n.childrenData.length
            ? { childrenData: cloneTree(n.childrenData) }
            : {}),
        }));

      const root = cloneTree(source);

      let inserted = false;
      const insert = (nodes: RenderableComponentData[]) => {
        for (const n of nodes) {
          if (n.id === parentId) {
            const children = Array.isArray(n.childrenData) ? [...n.childrenData, node] : [node];
            n.childrenData = children;
            inserted = true;
            return;
          }
          if (n.childrenData && n.childrenData.length > 0) {
            insert(n.childrenData);
            if (inserted) return;
          }
        }
      };

      if (parentId === "__root__") {
        root.push(node);
        inserted = true;
      } else if (root.length > 0) {
        insert(root);
      }

      if (!inserted) {
        // Fallback: append at root
        root.push(node);
      }

      return {
        loadedChildrenData: root,
      };
    });
  },

  childrenOrderByParentId: new Map(),
  setChildrenOrder: (parentId, childIds, baseFromCompile) => {
    set((state) => {
      const next = new Map(state.childrenOrderByParentId);
      if (childIds.length === 0) next.delete(parentId);
      else next.set(parentId, [...childIds]);

      // Bake root order into loadedChildrenData so reorder is persisted and all consumers see it
      if (parentId === "__root__" && childIds.length > 0) {
        const base = state.loadedChildrenData ?? baseFromCompile;
        if (base?.length) {
          const baseIds = new Set(base.map((n) => n.id));
          const reorderedBaseIds = childIds.filter((id) => baseIds.has(id));
          const reorderedRoot = reorderedBaseIds
            .map((id) => base.find((n) => n.id === id))
            .filter((n): n is RenderableComponentData => n != null);
          if (reorderedRoot.length === base.length) {
            return { childrenOrderByParentId: next, loadedChildrenData: reorderedRoot };
          }
        }
      }
      return { childrenOrderByParentId: next };
    });
  },

  loadedChildrenData: null,

  setRootChildren: (children) => set({ loadedChildrenData: children }),

  setParentChildrenOrder: (parentId, reorderedChildren, baseFromCompile) => {
    const state = get();
    const base = state.loadedChildrenData ?? baseFromCompile;
    if (!base?.length) return;
    const newTree = replaceParentChildrenInTree(base, parentId, reorderedChildren);
    if (newTree) set({ loadedChildrenData: newTree });
  },

  getMergedChildren: (baseFromCompile) => {
    const state = get();
    const base = state.loadedChildrenData ?? baseFromCompile;
    const mergedBase = base?.length
      ? mergeOverridesIntoChildrenData(
          base,
          state.overrides,
          state.childrenOrderByParentId,
          "__root__"
        ) ?? []
      : [];

    const mergedAdded =
      state.addedNodes.length > 0
        ? mergeOverridesIntoChildrenData(
            state.addedNodes,
            state.overrides,
            state.childrenOrderByParentId
          ) ?? []
        : [];

    const all = [...mergedBase, ...mergedAdded];
    return all.length ? all : undefined;
  },

  getLayerStateSnapshot: (baseFromCompile) => {
    const state = get();
    const base = state.loadedChildrenData ?? baseFromCompile;
    let childrenData: RenderableComponentData[] | undefined;
    const mergedBase = base?.length
      ? mergeOverridesIntoChildrenData(
          base,
          state.overrides,
          state.childrenOrderByParentId,
          "__root__"
        ) ?? []
      : [];
    const mergedAdded =
      state.addedNodes.length > 0
        ? mergeOverridesIntoChildrenData(
            state.addedNodes,
            state.overrides,
            state.childrenOrderByParentId
          ) ?? []
        : [];
    const combined = [...mergedBase, ...mergedAdded];
    if (combined.length) {
      childrenData = combined;
    }
    return {
      ...(childrenData?.length ? { childrenData } : {}),
      trackStates: { ...state.trackStates },
      hiddenLayerIds: Array.from(state.hiddenLayerIds),
      lockedLayerIds: Array.from(state.lockedLayerIds),
    };
  },

  loadLayerState: (snapshot) => {
    set({
      loadedChildrenData: Array.isArray(snapshot.childrenData) && snapshot.childrenData.length > 0 ? snapshot.childrenData : null,
      overrides: new Map(),
      addedNodes: [],
      childrenOrderByParentId: new Map(),
      trackStates: snapshot.trackStates && typeof snapshot.trackStates === "object" ? snapshot.trackStates : {},
      hiddenLayerIds: new Set(Array.isArray(snapshot.hiddenLayerIds) ? snapshot.hiddenLayerIds : []),
      lockedLayerIds: new Set(Array.isArray(snapshot.lockedLayerIds) ? snapshot.lockedLayerIds : []),
    });
  },

  resetLayerStateToGenerated: () => {
    set({
      overrides: new Map(),
      addedNodes: [],
      childrenOrderByParentId: new Map(),
      loadedChildrenData: null,
    });
  },

  removeNode: (nodeId, baseFromCompile) => {
    const state = get();
    const inAdded = state.addedNodes.some((n) => n.id === nodeId);
    if (inAdded) {
      set((s) => ({
        addedNodes: s.addedNodes.filter((n) => n.id !== nodeId),
        selectedLayerIds: s.selectedLayerIds.filter((id) => id !== nodeId),
      }));
      get().clearOverride(nodeId);
      return;
    }
    const base = state.loadedChildrenData ?? baseFromCompile;
    if (!base?.length) return;
    const treeWithoutNode = removeNodeFromTree(base, nodeId);
    if (treeWithoutNode === null) return;
    set((s) => {
      const nextOverrides = new Map(s.overrides);
      nextOverrides.delete(nodeId);
      const nextHidden = new Set(s.hiddenLayerIds);
      nextHidden.delete(nodeId);
      const nextLocked = new Set(s.lockedLayerIds);
      nextLocked.delete(nodeId);
      const nextOrder = new Map(s.childrenOrderByParentId);
      nextOrder.forEach((order, pid) => {
        nextOrder.set(pid, order.filter((id) => id !== nodeId));
      });
      return {
        loadedChildrenData: treeWithoutNode,
        overrides: nextOverrides,
        hiddenLayerIds: nextHidden,
        lockedLayerIds: nextLocked,
        childrenOrderByParentId: nextOrder,
        selectedLayerIds: s.selectedLayerIds.filter((id) => id !== nodeId),
      };
    });
  },
}));

/**
 * Returns a new tree (root array) with the given parent's childrenData replaced by reorderedChildren.
 * For parentId === "__root__", replaces base[0].childrenData (first root node's children).
 * For nested parentId, finds the node by id and replaces its childrenData.
 */
function replaceParentChildrenInTree(
  root: RenderableComponentData[],
  parentId: string,
  reorderedChildren: RenderableComponentData[]
): RenderableComponentData[] | null {
  if (parentId === "__root__") {
    if (root.length === 0) return null;
    const [first, ...rest] = root;
    return [{ ...first, childrenData: reorderedChildren }, ...rest];
  }
  function cloneAndReplace(
    nodes: RenderableComponentData[]
  ): { found: boolean; nodes: RenderableComponentData[] } {
    let found = false;
    const result = nodes.map((n) => {
      if (n.id === parentId) {
        found = true;
        return { ...n, childrenData: reorderedChildren };
      }
      if (n.childrenData?.length) {
        const childOut = cloneAndReplace(n.childrenData);
        if (childOut.found) found = true;
        return { ...n, childrenData: childOut.nodes };
      }
      return { ...n };
    });
    return { found, nodes: result };
  }
  const out = cloneAndReplace(root);
  return out.found ? out.nodes : null;
}

/** Returns a new tree with the node (and its subtree) removed, or null if node not found. */
function removeNodeFromTree(
  nodes: RenderableComponentData[],
  nodeId: string
): RenderableComponentData[] | null {
  const atThisLevel = nodes.findIndex((n) => n.id === nodeId);
  if (atThisLevel >= 0) {
    return nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({
        ...n,
        ...(n.childrenData?.length
          ? { childrenData: removeNodeFromTree(n.childrenData, nodeId) ?? n.childrenData }
          : {}),
      }));
  }
  for (const n of nodes) {
    if (n.childrenData?.length) {
      const childResult = removeNodeFromTree(n.childrenData, nodeId);
      if (childResult !== null) {
        return nodes.map((node) =>
          node.id === n.id ? { ...n, childrenData: childResult } : node
        );
      }
    }
  }
  return null;
}

function deepMergeOverrideData(
  existing: LayerOverride["data"],
  override: LayerOverride["data"]
): LayerOverride["data"] {
  if (!override) return existing;
  const base = { ...existing, ...override } as Record<string, unknown>;

  const existingContainerProps = (existing as Record<string, unknown>)?.containerProps as Record<string, unknown> | undefined;
  const overrideContainerProps = (override as Record<string, unknown>)?.containerProps as Record<string, unknown> | undefined;
  if (existingContainerProps || overrideContainerProps) {
    base.containerProps = {
      ...(existingContainerProps || {}),
      ...(overrideContainerProps || {}),
    };
    const existingStyle = existingContainerProps?.style as Record<string, unknown> | undefined;
    const overrideStyle = overrideContainerProps?.style as Record<string, unknown> | undefined;
    if (existingStyle || overrideStyle) {
      const merged = { ...(existingStyle || {}), ...(overrideStyle || {}) } as Record<string, unknown>;
      if (overrideStyle && typeof overrideStyle === "object") {
        for (const k of Object.keys(overrideStyle)) {
          if (overrideStyle[k] === undefined) delete merged[k];
        }
      }
      (base.containerProps as Record<string, unknown>).style = merged;
    }
  }

  const existingDataStyle = (existing as Record<string, unknown>)?.style as Record<string, unknown> | undefined;
  const overrideDataStyle = (override as Record<string, unknown>)?.style as Record<string, unknown> | undefined;
  if (existingDataStyle || overrideDataStyle) {
    const merged = { ...(existingDataStyle || {}), ...(overrideDataStyle || {}) } as Record<string, unknown>;
    if (overrideDataStyle && typeof overrideDataStyle === "object") {
      for (const k of Object.keys(overrideDataStyle)) {
        if (overrideDataStyle[k] === undefined) delete merged[k];
      }
    }
    base.style = merged;
  }

  if ((override as Record<string, unknown>)?.boundaries != null) {
    base.boundaries = override.boundaries;
  }
  return base as LayerOverride["data"];
}

export function mergeOverridesIntoChildrenData(
  childrenData: RenderableComponentData[] | undefined,
  overrides: Map<string, LayerOverride>,
  childrenOrderByParentId?: Map<string, string[]>,
  parentId?: string
): RenderableComponentData[] | undefined {
  if (!childrenData || childrenData.length === 0) return childrenData;

  let ordered = childrenData;
  const orderIds: string[] | undefined =
    parentId !== undefined ? childrenOrderByParentId?.get(parentId) : undefined;
  if (Array.isArray(orderIds) && orderIds.length > 0) {
    const idToIndex = new Map(orderIds.map((id: string, i: number) => [id, i]));
    ordered = [...childrenData].sort((a, b) => {
      const ia = idToIndex.has(a.id) ? (idToIndex.get(a.id) as number) : orderIds.length;
      const ib = idToIndex.has(b.id) ? (idToIndex.get(b.id) as number) : orderIds.length;
      return ia - ib;
    });
  }

  return ordered.map((node) => {
    const override = overrides.get(node.id);
    const next: RenderableComponentData = { ...node };
    if (override?.data) {
      const existingData = next.data as Record<string, unknown> | undefined;
      next.data = deepMergeOverrideData(existingData, override.data) as RenderableComponentData["data"];
      if (override.data.boundaries) {
        next.data = next.data || {};
        (next.data as Record<string, unknown>).boundaries = override.data.boundaries;
      }
      const bounds = (next.data as { boundaries?: CalculatedBoundaries })?.boundaries;
      if (
        bounds &&
        typeof bounds.left === "number" &&
        typeof bounds.top === "number" &&
        typeof bounds.width === "number" &&
        typeof bounds.height === "number"
      ) {
        const dataRecord = next.data as Record<string, unknown>;
        dataRecord.containerProps = dataRecord.containerProps ?? {};
        const cp = dataRecord.containerProps as Record<string, unknown>;
        cp.style = {
          ...(cp.style as Record<string, unknown>),
          position: "absolute",
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        };
      }
    }
    if (override?.context) {
      next.context = { ...next.context, ...override.context } as RenderableContext;
      if (override.context.boundaries) {
        (next.context as RenderableContext).boundaries = {
          ...(next.context as RenderableContext)?.boundaries,
          ...override.context.boundaries,
        };
      }
    }
    if (override?.data?.boundaries) {
      next.context = (next.context || {}) as RenderableContext;
      (next.context as RenderableContext).boundaries = {
        ...(next.context as RenderableContext).boundaries,
        ...override.data.boundaries,
      };
    }
    if (override?.effects !== undefined) {
      next.effects = override.effects;
    }
    if (node.childrenData && node.childrenData.length > 0) {
      next.childrenData = mergeOverridesIntoChildrenData(
        node.childrenData,
        overrides,
        childrenOrderByParentId,
        node.id
      );
    }
    return next;
  });
}

export function getTrackIdForNode(node: RenderableComponentData): string {
  const isAudio = node.componentId === "AudioAtom";
  const dataZ = (node.data as any)?.boundaries?.zIndex;
  const ctxZ = (node.context as any)?.boundaries?.zIndex;
  const zIndex = typeof dataZ === "number" ? dataZ : typeof ctxZ === "number" ? ctxZ : 0;
  return `${isAudio ? "A" : "V"}${zIndex}`;
}

export function filterHiddenChildrenData(
  childrenData: RenderableComponentData[] | undefined,
  hiddenLayerIds: Set<string>,
  trackStates?: Record<string, TrackState>
): RenderableComponentData[] | undefined {
  if (!childrenData || childrenData.length === 0) return childrenData;

  const isAnyAudioSolo = trackStates
    ? Object.entries(trackStates).some(([id, state]) => id.startsWith("A") && state.solo)
    : false;

  const next = childrenData
    .filter((n) => {
      if (hiddenLayerIds.has(n.id)) return false;
      if (trackStates) {
        const trackId = getTrackIdForNode(n);
        const state = trackStates[trackId];
        if (trackId.startsWith("V") && state?.hidden) return false;
        if (trackId.startsWith("A")) {
          if (state?.muted) return false;
          if (isAnyAudioSolo && !state?.solo) return false;
        }
      }
      return true;
    })
    .map((n) => {
      const copy: RenderableComponentData = { ...n };
      if (n.childrenData?.length) {
        copy.childrenData = filterHiddenChildrenData(n.childrenData, hiddenLayerIds, trackStates);
      }
      return copy;
    });
  return next;
}
