import { create } from "zustand";
import type {
  RenderableComponentData,
  CalculatedBoundaries,
  RenderableContext,
} from "@microfox/remotion";
import {
  useLayerHistoryStore,
  assignLayerItemIds,
  makeLayerItemId,
  hashLayerSnapshot,
} from "./layer-history-store";
import type { LayerHistorySnapshot } from "@/lib/editor/layer-types";
import { mergeLayerSnapshots, type LayerConflict, type MergeSide } from "@/lib/editor/layer-state-merge";

/** Outcome of a manual publish attempt. */
export type PublishResult =
  | { ok: true; version: number }
  | { ok: true; merged: true; version: number }
  | { ok: false; reason: "conflict"; lastClientId?: string }
  | { ok: false; reason: "merge"; conflicts: number }
  | { ok: false; reason: "nochange" }
  | { ok: false; reason: "error"; message?: string };

export type { LayerConflict, MergeSide };

/** Pending layer merge surfaced to the conflict dialog. */
export interface PendingLayerMerge {
  conflicts: LayerConflict[];
  autoMerged: string[];
  remoteVersion: number;
  build: (choices: Record<string, MergeSide>) => LayerStateSnapshot;
}

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

/**
 * State snapshot for persistence (localStorage + API).
 * `childrenData` is the layer STRUCTURE only (added/removed/reordered nodes) —
 * overrides are NOT baked in; they live in `overrides` and are re-applied over
 * the live timeline output at render time so timeline edits flow through.
 */
export interface LayerStateSnapshot {
  /** Layer structure (added/removed/reordered nodes). Omitted when there are no structural edits. */
  childrenData?: RenderableComponentData[];
  /** Serialized override map (id-keyed layer customizations) re-applied over the live base. */
  overrides?: [string, unknown][];
  trackStates: Record<string, TrackState>;
  hiddenLayerIds: string[];
  lockedLayerIds: string[];
}

interface LayerState {
  trackStates: Record<string, TrackState>;
  setTrackState: (trackId: string, state: Partial<TrackState>) => void;

  /**
   * The `version` value returned by the last successful GET or PUT of
   * `/api/project/timeline/layer-state`. Sent back on the next PUT so
   * the server can detect when another client saved in between (409 conflict).
   */
  stateVersion: number;
  setStateVersion: (version: number) => void;

  /**
   * When true (default, new diff format), the layer structure is rebased onto
   * the live compiled timeline output so timeline-tab edits flow into the
   * preview. Set false only for legacy baked saves (childrenData with no
   * separate `overrides`) to avoid stripping their baked-in customizations.
   */
  rebaseFromBase: boolean;

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

  /**
   * Restore all layer state from a LayerHistorySnapshot directly (no history entry recorded).
   * Used exclusively by undo/redo so the act of restoring doesn't push new history.
   */
  applyHistorySnapshot: (snapshot: LayerHistorySnapshot) => void;
  /** Undo the last layer change. Returns true if anything was undone. */
  undoLayerChange: () => boolean;
  /** Redo the next layer change. Returns true if anything was redone. */
  redoLayerChange: () => boolean;

  /** True while a historical/team state is being temporarily previewed. */
  isLayerPreviewActive: boolean;
  /**
   * Temporarily show a historical state in the preview (backs up the real state
   * once). Safe + non-destructive — `endLayerPreview` restores exactly.
   */
  startLayerPreview: (snapshot: LayerHistorySnapshot) => void;
  /** Restore the real state after a preview. */
  endLayerPreview: () => void;
  /**
   * Revert to a historical/team state by APPENDING a new history entry — the
   * changes made after that state are preserved (non-destructive). Undoable.
   */
  revertToHistorySnapshot: (snapshot: LayerHistorySnapshot, label?: string) => void;
  /**
   * Destructively reset to a local historical state: applies the snapshot, then
   * removes all unpublished local history entries that came AFTER `entryId`.
   * Published entries are kept. The cursor moves to `entryId` — no new entry is created.
   */
  resetToLayerHistoryEntry: (entryId: string, snapshot: LayerHistorySnapshot) => void;
  /**
   * Remove every unpublished local history entry and restore the layer state to the
   * last published snapshot (or the baseline if nothing was ever published).
   */
  discardAllLocalLayerChanges: () => void;

  /**
   * Publish the current local layer state to the team. Writes the canonical
   * state (version-locked) and appends an audit entry. Nothing is sent to the
   * team until this is called — all edits stay local until published.
   */
  publishLayerState: (
    projectId: string,
    timelineId: string,
    baseFromCompile?: RenderableComponentData[]
  ) => Promise<PublishResult>;

  /**
   * Fetch the team's canonical (last published) layer state, apply it locally,
   * and record a "Reverted to team base" history entry so the action can be
   * undone with Ctrl+Z. Discards unpublished local edits from the working view.
   */
  revertToTeamBase: (projectId: string, timelineId: string) => Promise<void>;

  /** Last-synced team layer state — the base for a 3-way merge on conflict. */
  mergeBaseSnapshot: LayerStateSnapshot | null;
  setMergeBaseSnapshot: (snapshot: LayerStateSnapshot | null) => void;
  /** Set when a publish hit conflicting concurrent changes (drives the merge dialog). */
  pendingLayerMerge: PendingLayerMerge | null;
  /** Apply the user's conflict choices, then publish the merged layer state. */
  resolveLayerMerge: (
    projectId: string,
    timelineId: string,
    baseFromCompile: RenderableComponentData[] | undefined,
    choices: Record<string, MergeSide>
  ) => Promise<PublishResult>;
  /** Dismiss the merge dialog without publishing (keeps local edits). */
  cancelLayerMerge: () => void;
}

/** Backup of the real layer state while a temporary preview is active. */
let _layerPreviewBackup: LayerHistorySnapshot | null = null;

/** Guards against infinite re-merge loops if a new concurrent publish slips in. */
let _layerMergeRetry = false;

function findNodeInFlatTree(
  nodes: RenderableComponentData[],
  nodeId: string
): RenderableComponentData | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (node.childrenData?.length) {
      const found = findNodeInFlatTree(node.childrenData, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Refresh timeline-owned fields (data, context, effects) on a layer structure
 * from the latest compiled timeline output, matched by node id. Preserves the
 * layer tree's structure (added / removed / reordered nodes) and any layer-only
 * nodes, while letting timeline-tab edits (preset data, timing, layout) flow
 * into the preview. Layer overrides are applied separately, on top of this.
 */
function rebaseChildrenDataOntoBase(
  loaded: RenderableComponentData[],
  base: RenderableComponentData[] | undefined
): RenderableComponentData[] {
  if (!base || base.length === 0) return loaded;

  const baseById = new Map<string, RenderableComponentData>();
  const index = (nodes: RenderableComponentData[]) => {
    for (const n of nodes) {
      baseById.set(n.id, n);
      if (n.childrenData?.length) index(n.childrenData);
    }
  };
  index(base);

  const rebase = (nodes: RenderableComponentData[]): RenderableComponentData[] =>
    nodes.map((node) => {
      const fresh = baseById.get(node.id);
      let next: RenderableComponentData = node;
      if (fresh) {
        // Node exists in the live timeline output → take its timeline-owned
        // fields, keep the layer node's identity + structure.
        next = {
          ...node,
          data: fresh.data,
          context: fresh.context,
          ...(fresh.effects !== undefined ? { effects: fresh.effects } : {}),
        } as RenderableComponentData;
      }
      // Layer-only nodes (not in base) keep their own data/context.
      if (node.childrenData?.length) {
        next = { ...next, childrenData: rebase(node.childrenData) };
      }
      return next;
    });

  return rebase(loaded);
}

function snapshotFromLayerState(s: {
  loadedChildrenData: RenderableComponentData[] | null;
  addedNodes: RenderableComponentData[];
  overrides: Map<string, LayerOverride>;
  childrenOrderByParentId: Map<string, string[]>;
  hiddenLayerIds: Set<string>;
  lockedLayerIds: Set<string>;
}): LayerHistorySnapshot {
  return {
    loadedChildrenData: s.loadedChildrenData
      ? JSON.parse(JSON.stringify(s.loadedChildrenData))
      : null,
    addedNodes: JSON.parse(JSON.stringify(s.addedNodes)),
    overrides: Array.from(s.overrides.entries()),
    childrenOrderByParentId: Array.from(s.childrenOrderByParentId.entries()).map(
      ([k, v]) => [k, [...v]]
    ),
    hiddenLayerIds: Array.from(s.hiddenLayerIds),
    lockedLayerIds: Array.from(s.lockedLayerIds),
  };
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

  stateVersion: 0,
  setStateVersion: (version) => set({ stateVersion: version }),

  rebaseFromBase: true,

  isLayerPreviewActive: false,
  mergeBaseSnapshot: null,
  setMergeBaseSnapshot: (snapshot) => set({ mergeBaseSnapshot: snapshot }),
  pendingLayerMerge: null,

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
    const wasHidden = get().hiddenLayerIds.has(nodeId);
    set((state) => {
      const next = new Set(state.hiddenLayerIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { hiddenLayerIds: next };
    });
    const s = get();
    useLayerHistoryStore.getState().recordChange(wasHidden ? 'Show layer' : 'Hide layer', [{
      layerItemId: makeLayerItemId(nodeId),
      nodeId,
      changeType: 'visibility',
      prevValue: wasHidden,
      nextValue: !wasHidden,
    }], snapshotFromLayerState(s));
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
    const wasLocked = get().lockedLayerIds.has(nodeId);
    set((state) => {
      const next = new Set(state.lockedLayerIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { lockedLayerIds: next };
    });
    const s = get();
    useLayerHistoryStore.getState().recordChange(wasLocked ? 'Unlock layer' : 'Lock layer', [{
      layerItemId: makeLayerItemId(nodeId),
      nodeId,
      changeType: 'lock',
      prevValue: wasLocked,
      nextValue: !wasLocked,
    }], snapshotFromLayerState(s));
  },

  isLayerLocked: (nodeId) => get().lockedLayerIds.has(nodeId),

  setOverride: (nodeId, override) => {
    if (get().lockedLayerIds.has(nodeId)) return;
    const prevOverride = get().overrides.get(nodeId);
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
    const s = get();
    useLayerHistoryStore.getState().recordChange('Override layer', [{
      layerItemId: makeLayerItemId(nodeId),
      nodeId,
      changeType: 'override',
      prevOverride: prevOverride as Record<string, unknown> | undefined,
      nextOverride: s.overrides.get(nodeId) as Record<string, unknown> | undefined,
    }], snapshotFromLayerState(s));
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
  addNode: (node) => {
    const nodeWithId = { ...node, _layerItemId: makeLayerItemId(node.id) } as unknown as RenderableComponentData;
    set((state) => ({ addedNodes: [...state.addedNodes, nodeWithId] }));
    const s = get();
    useLayerHistoryStore.getState().recordChange('Add layer', [{
      layerItemId: makeLayerItemId(node.id),
      nodeId: node.id,
      changeType: 'add_node',
      nodeData: nodeWithId,
    }], snapshotFromLayerState(s));
  },
  removeAddedNode: (id) => set((state) => ({ addedNodes: state.addedNodes.filter((n) => n.id !== id) })),
  reorderAddedNodes: (fromIndex, toIndex) => {
    const prevOrder = get().addedNodes.map((n) => n.id);
    set((state) => {
      const list = [...state.addedNodes];
      const [removed] = list.splice(fromIndex, 1);
      if (removed) list.splice(toIndex, 0, removed);
      return { addedNodes: list };
    });
    const s = get();
    useLayerHistoryStore.getState().recordChange('Reorder added layers', [{
      layerItemId: makeLayerItemId(prevOrder[fromIndex] ?? ''),
      nodeId: prevOrder[fromIndex] ?? '',
      changeType: 'reorder',
      parentId: '__root__',
      prevOrder,
      nextOrder: s.addedNodes.map((n) => n.id),
    }], snapshotFromLayerState(s));
  },

  addChildNode: (baseFromCompile, parentId, node) => {
    const nodeWithId = { ...node, _layerItemId: makeLayerItemId(node.id) } as unknown as RenderableComponentData;
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
            const children = Array.isArray(n.childrenData) ? [...n.childrenData, nodeWithId] : [nodeWithId];
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
        root.push(nodeWithId);
        inserted = true;
      } else if (root.length > 0) {
        insert(root);
      }

      if (!inserted) {
        root.push(nodeWithId);
      }

      return {
        loadedChildrenData: root,
      };
    });
    const s = get();
    useLayerHistoryStore.getState().recordChange('Add child layer', [{
      layerItemId: makeLayerItemId(node.id),
      nodeId: node.id,
      changeType: 'add_child',
      nodeData: nodeWithId,
      parentId,
    }], snapshotFromLayerState(s));
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
    // Capture previous order before mutation
    const prevParent = parentId === '__root__'
      ? (base[0]?.childrenData ?? [])
      : (findNodeInFlatTree(base, parentId)?.childrenData ?? []);
    const prevOrder = prevParent.map((n) => n.id);
    const newTree = replaceParentChildrenInTree(base, parentId, reorderedChildren);
    if (newTree) {
      set({ loadedChildrenData: newTree });
      const s = get();
      useLayerHistoryStore.getState().recordChange('Reorder layers', [{
        layerItemId: makeLayerItemId(parentId),
        nodeId: parentId,
        changeType: 'reorder',
        parentId,
        prevOrder,
        nextOrder: reorderedChildren.map((n) => n.id),
      }], snapshotFromLayerState(s));
    }
  },

  getMergedChildren: (baseFromCompile) => {
    const state = get();
    // Rebase the layer structure onto the LIVE timeline output so timeline-tab
    // edits flow into the preview. Overrides are applied on top, below.
    const loaded = state.loadedChildrenData;
    const base = loaded
      ? state.rebaseFromBase
        ? rebaseChildrenDataOntoBase(loaded, baseFromCompile)
        : loaded
      : baseFromCompile;
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
    // Persist the layer STRUCTURE only when there are structural edits
    // (added / removed / reordered nodes). Overrides are stored separately and
    // re-applied over the live timeline output — never baked in — so timeline
    // edits keep flowing through after a reload.
    const hasStructuralEdits =
      state.loadedChildrenData != null || state.addedNodes.length > 0;

    let childrenData: RenderableComponentData[] | undefined;
    if (hasStructuralEdits) {
      const EMPTY_OVERRIDES = new Map<string, LayerOverride>();
      const base = state.loadedChildrenData ?? baseFromCompile;
      const structBase = base?.length
        ? mergeOverridesIntoChildrenData(
            base,
            EMPTY_OVERRIDES,
            state.childrenOrderByParentId,
            "__root__"
          ) ?? []
        : [];
      const structAdded =
        state.addedNodes.length > 0
          ? mergeOverridesIntoChildrenData(
              state.addedNodes,
              EMPTY_OVERRIDES,
              state.childrenOrderByParentId
            ) ?? []
          : [];
      const combined = [...structBase, ...structAdded];
      if (combined.length) childrenData = combined;
    }

    return {
      ...(childrenData?.length ? { childrenData } : {}),
      overrides: Array.from(state.overrides.entries()),
      trackStates: { ...state.trackStates },
      hiddenLayerIds: Array.from(state.hiddenLayerIds),
      lockedLayerIds: Array.from(state.lockedLayerIds),
    };
  },

  loadLayerState: (snapshot) => {
    const rawChildren = Array.isArray(snapshot.childrenData) && snapshot.childrenData.length > 0
      ? snapshot.childrenData
      : null;
    // Ensure all loaded nodes have _layerItemId
    const loadedChildrenData = rawChildren ? assignLayerItemIds(rawChildren) : null;
    // Legacy detection: an old save baked overrides into childrenData and has no
    // separate `overrides` field — for those we must NOT rebase (it would strip
    // the baked customizations). New saves always carry `overrides`.
    const isLegacyBaked = rawChildren != null && snapshot.overrides === undefined;
    const restoredOverrides = Array.isArray(snapshot.overrides)
      ? new Map(snapshot.overrides as [string, LayerOverride][])
      : new Map<string, LayerOverride>();
    set({
      loadedChildrenData,
      overrides: restoredOverrides,
      addedNodes: [],
      childrenOrderByParentId: new Map(),
      rebaseFromBase: !isLegacyBaked,
      trackStates: snapshot.trackStates && typeof snapshot.trackStates === "object" ? snapshot.trackStates : {},
      hiddenLayerIds: new Set(Array.isArray(snapshot.hiddenLayerIds) ? snapshot.hiddenLayerIds : []),
      lockedLayerIds: new Set(Array.isArray(snapshot.lockedLayerIds) ? snapshot.lockedLayerIds : []),
    });
    // Mark the just-loaded state as the clean published baseline so there are
    // no spurious "unpublished changes" right after a load.
    const baseline = snapshotFromLayerState(get());
    useLayerHistoryStore.getState().initBaseline(hashLayerSnapshot(baseline), baseline);
  },

  resetLayerStateToGenerated: () => {
    // Apply the reset (clear all user edits)
    set({
      overrides: new Map(),
      addedNodes: [],
      childrenOrderByParentId: new Map(),
      loadedChildrenData: null,
    });
    // Record as a history entry — NOT clearHistory — so it can be undone.
    // The snapshot IS the empty/reset state.
    const emptySnapshot: LayerHistorySnapshot = {
      loadedChildrenData: null,
      addedNodes: [],
      overrides: [],
      childrenOrderByParentId: [],
      hiddenLayerIds: Array.from(get().hiddenLayerIds),
      lockedLayerIds: Array.from(get().lockedLayerIds),
    };
    useLayerHistoryStore.getState().recordChange(
      "Reset to timeline",
      [{ layerItemId: "__root__", nodeId: "__root__", changeType: "reset" }],
      emptySnapshot
    );
  },

  removeNode: (nodeId, baseFromCompile) => {
    const state = get();
    // Capture node data before removal for history
    const nodeInAdded = state.addedNodes.find((n) => n.id === nodeId);
    const nodeInBase = !nodeInAdded
      ? findNodeInFlatTree(state.loadedChildrenData ?? baseFromCompile ?? [], nodeId)
      : null;
    const removedNode = nodeInAdded ?? nodeInBase;

    const inAdded = !!nodeInAdded;
    if (inAdded) {
      set((s) => ({
        addedNodes: s.addedNodes.filter((n) => n.id !== nodeId),
        selectedLayerIds: s.selectedLayerIds.filter((id) => id !== nodeId),
      }));
      get().clearOverride(nodeId);
    } else {
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
    }

    const s = get();
    useLayerHistoryStore.getState().recordChange('Remove layer', [{
      layerItemId: makeLayerItemId(nodeId),
      nodeId,
      changeType: 'remove_node',
      ...(removedNode ? { nodeData: removedNode } : {}),
    }], snapshotFromLayerState(s));
  },

  applyHistorySnapshot: (snapshot) => {
    // Direct state restoration — does NOT call recordChange to keep history clean.
    set({
      loadedChildrenData: snapshot.loadedChildrenData,
      addedNodes: snapshot.addedNodes,
      overrides: new Map(snapshot.overrides as [string, LayerOverride][]),
      childrenOrderByParentId: new Map(snapshot.childrenOrderByParentId),
      hiddenLayerIds: new Set(snapshot.hiddenLayerIds),
      lockedLayerIds: new Set(snapshot.lockedLayerIds),
    });
  },

  undoLayerChange: () => {
    const snapshot = useLayerHistoryStore.getState().undo();
    if (!snapshot) return false;
    get().applyHistorySnapshot(snapshot);
    return true;
  },

  redoLayerChange: () => {
    const snapshot = useLayerHistoryStore.getState().redo();
    if (!snapshot) return false;
    get().applyHistorySnapshot(snapshot);
    return true;
  },

  startLayerPreview: (snapshot) => {
    // Back up the real state once (first preview), then show the historical one.
    if (_layerPreviewBackup === null) {
      _layerPreviewBackup = snapshotFromLayerState(get());
    }
    get().applyHistorySnapshot(snapshot);
    set({ isLayerPreviewActive: true });
  },
  endLayerPreview: () => {
    if (_layerPreviewBackup !== null) {
      get().applyHistorySnapshot(_layerPreviewBackup);
      _layerPreviewBackup = null;
    }
    set({ isLayerPreviewActive: false });
  },
  revertToHistorySnapshot: (snapshot, label) => {
    // Make sure we revert from the REAL state, not a transient preview.
    get().endLayerPreview();
    get().applyHistorySnapshot(snapshot);
    const applied = snapshotFromLayerState(get());
    useLayerHistoryStore.getState().appendChange(
      label ?? "Reverted to earlier state",
      [{ layerItemId: "__root__", nodeId: "__root__", changeType: "reset" }],
      applied
    );
  },

  resetToLayerHistoryEntry: (entryId, snapshot) => {
    get().endLayerPreview();
    get().applyHistorySnapshot(snapshot);
    useLayerHistoryStore.getState().resetToHistoryEntry(entryId);
  },

  discardAllLocalLayerChanges: () => {
    const histStore = useLayerHistoryStore.getState();
    const { entries, publishedEntryIds, baselineSnapshot } = histStore;
    const published = entries.filter((e) => publishedEntryIds.has(e.id));
    const lastPublished = published[published.length - 1];
    const snapshotToRestore = lastPublished?.snapshot ?? baselineSnapshot;
    if (snapshotToRestore) {
      get().endLayerPreview();
      get().applyHistorySnapshot(snapshotToRestore);
    }
    histStore.discardAllLocalChanges();
  },

  publishLayerState: async (projectId, timelineId, baseFromCompile) => {
    const historyStore = useLayerHistoryStore.getState();

    // Nothing changed since last publish/load → no-op
    if (!historyStore.hasUnpublishedChanges()) {
      return { ok: false, reason: "nochange" };
    }

    historyStore.setIsPublishing(true);
    try {
      const snapshot = get().getLayerStateSnapshot(baseFromCompile);
      const res = await fetch("/api/project/timeline/layer-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          timelineId,
          ...snapshot,
          version: get().stateVersion,
          clientId: historyStore.clientId ?? undefined,
        }),
      });

      if (res.status === 409) {
        // Concurrent publish — 3-way merge instead of a destructive revert.
        if (_layerMergeRetry) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, reason: "conflict", lastClientId: err.lastClientId };
        }
        let remote: (LayerStateSnapshot & { version?: number }) | null = null;
        try {
          const rr = await fetch(
            `/api/project/timeline/layer-state?projectId=${encodeURIComponent(projectId)}&timelineId=${encodeURIComponent(timelineId)}`
          );
          if (rr.ok) remote = await rr.json();
        } catch {
          // fall through
        }
        if (!remote) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, reason: "conflict", lastClientId: err.lastClientId };
        }
        const mr = mergeLayerSnapshots(get().mergeBaseSnapshot, snapshot, remote);
        const remoteVersion = typeof remote.version === "number" ? remote.version : 0;

        if (mr.conflicts.length > 0) {
          set({
            pendingLayerMerge: {
              conflicts: mr.conflicts,
              autoMerged: mr.autoMerged,
              remoteVersion,
              build: mr.build,
            },
          });
          return { ok: false, reason: "merge", conflicts: mr.conflicts.length };
        }

        // No conflicts → auto-merge + re-publish at the remote version.
        const merged = mr.build({});
        get().loadLayerState(merged); // applies merged + resets baseline (clean)
        get().setStateVersion(remoteVersion);
        // Force "dirty" so the recursive publish actually PUTs the merged state.
        useLayerHistoryStore.getState().setPublishedHash(null);
        _layerMergeRetry = true;
        try {
          const r = await get().publishLayerState(projectId, timelineId, baseFromCompile);
          return r.ok ? { ok: true, merged: true, version: (r as { version?: number }).version ?? remoteVersion + 1 } : r;
        } finally {
          _layerMergeRetry = false;
        }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, reason: "error", message: err.error };
      }

      const result = await res.json().catch(() => ({}));
      const newVersion =
        typeof result.version === "number" ? result.version : get().stateVersion;
      get().setStateVersion(newVersion);
      // Advance the merge base to the just-published state.
      set({ mergeBaseSnapshot: snapshot });

      // Append audit entry + mark current state as the published baseline
      await historyStore.commitPublish(projectId, timelineId);

      return { ok: true, version: newVersion };
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : "Publish failed",
      };
    } finally {
      historyStore.setIsPublishing(false);
    }
  },

  revertToTeamBase: async (projectId, timelineId) => {
    const historyStore = useLayerHistoryStore.getState();

    // Fetch the team canonical (last published) layer state
    let canonical: {
      childrenData?: RenderableComponentData[];
      overrides?: [string, unknown][];
      trackStates?: Record<string, TrackState>;
      hiddenLayerIds?: string[];
      lockedLayerIds?: string[];
      version?: number;
    } | null = null;
    try {
      const res = await fetch(
        `/api/project/timeline/layer-state?projectId=${encodeURIComponent(projectId)}&timelineId=${encodeURIComponent(timelineId)}`
      );
      if (res.ok) canonical = await res.json();
    } catch {
      return; // network failure — leave local state untouched
    }
    if (!canonical) return; // nothing published yet — nothing to revert to

    const rawChildren =
      Array.isArray(canonical.childrenData) && canonical.childrenData.length > 0
        ? assignLayerItemIds(canonical.childrenData)
        : null;
    const isLegacyBaked = rawChildren != null && canonical.overrides === undefined;

    // Apply canonical as the new working base; restore its overlay overrides
    set({
      loadedChildrenData: rawChildren,
      overrides: Array.isArray(canonical.overrides)
        ? new Map(canonical.overrides as [string, LayerOverride][])
        : new Map(),
      addedNodes: [],
      childrenOrderByParentId: new Map(),
      rebaseFromBase: !isLegacyBaked,
      trackStates:
        canonical.trackStates && typeof canonical.trackStates === "object"
          ? canonical.trackStates
          : {},
      hiddenLayerIds: new Set(
        Array.isArray(canonical.hiddenLayerIds) ? canonical.hiddenLayerIds : []
      ),
      lockedLayerIds: new Set(
        Array.isArray(canonical.lockedLayerIds) ? canonical.lockedLayerIds : []
      ),
    });
    if (typeof canonical.version === "number") {
      get().setStateVersion(canonical.version);
    }

    // Record as an undoable entry so Ctrl+Z restores the user's previous edits
    const appliedSnapshot = snapshotFromLayerState(get());
    historyStore.recordChange(
      "Reverted to team base",
      [{ layerItemId: "__root__", nodeId: "__root__", changeType: "reset" }],
      appliedSnapshot
    );
    // Current state now equals the team base → mark synced (no unpublished diff)
    historyStore.markSyncedToTeam();
    // Advance the merge base to the team state.
    set({ mergeBaseSnapshot: get().getLayerStateSnapshot(undefined) });
    // Refresh team audit list for the panel
    historyStore.loadDbHistory();
  },

  resolveLayerMerge: async (projectId, timelineId, baseFromCompile, choices) => {
    const pending = get().pendingLayerMerge;
    if (!pending) return { ok: false, reason: "error", message: "No pending merge" };
    const merged = pending.build(choices);
    get().loadLayerState(merged);
    get().setStateVersion(pending.remoteVersion);
    set({ pendingLayerMerge: null });
    // Force "dirty" so the publish actually PUTs the merged state.
    useLayerHistoryStore.getState().setPublishedHash(null);
    _layerMergeRetry = true;
    try {
      const r = await get().publishLayerState(projectId, timelineId, baseFromCompile);
      return r.ok
        ? { ok: true, merged: true, version: (r as { version?: number }).version ?? pending.remoteVersion + 1 }
        : r;
    } finally {
      _layerMergeRetry = false;
    }
  },

  cancelLayerMerge: () => set({ pendingLayerMerge: null }),
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
