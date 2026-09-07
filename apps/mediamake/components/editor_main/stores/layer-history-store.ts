import { create } from "zustand";
import type { RenderableComponentData } from "@microfox/remotion";
import type {
  LayerChangeType,
  LayerNodeChange,
  LayerHistorySnapshot,
  MergeConflict,
} from "@/lib/editor/layer-types";

// Re-export shared types so consumers can import from one place
export type {
  LayerChangeType,
  LayerNodeChange,
  LayerHistorySnapshot,
  MergeConflict,
};

/** In-memory history entry — snapshot included for undo/redo. */
export interface LayerHistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  changes: LayerNodeChange[];
  snapshot: LayerHistorySnapshot;
  /** Stable hash of `snapshot` — used for dirty / unpublished detection. */
  stateHash: string;
  /** clientId of the user who made this change. */
  clientId: string | null;
}

/**
 * Lightweight entry stored in / fetched from DB (append-only audit trail).
 * One entry is appended per *publish*, not per local edit.
 */
export interface DbLayerHistoryEntry {
  entryId: string;
  projectId: string;
  timelineId: string;
  clientId: string;
  timestamp: number;
  description: string;
  changes: LayerNodeChange[];
  /** Full layer state at this publish — enables team preview / revert to old states. */
  snapshot?: LayerHistorySnapshot;
}

/** Result of computing the merged global state from all users' DB operations. */
export interface GlobalStateResult {
  snapshot: LayerHistorySnapshot;
  conflicts: MergeConflict[];
}

interface LayerHistoryState {
  entries: LayerHistoryEntry[];
  cursor: number;
  maxSize: number;
  /** Snapshot of the layer state at load time — restored when undoing past the first entry. */
  baselineSnapshot: LayerHistorySnapshot | null;
  /**
   * Consecutive override entries on the same node within this window (ms)
   * are squashed into one. Default 800 ms. Set 0 to disable.
   */
  squashMs: number;

  clientId: string | null;
  projectId: string | null;
  timelineId: string | null;

  /**
   * Hash of the working state when the timeline was loaded (cursor === -1).
   * Used as the "current hash" when no history entries exist yet.
   */
  baselineHash: string | null;
  /**
   * Hash of the last state that was published to (or loaded from) the team DB.
   * `currentHash !== publishedHash` ⇒ there are unpublished local changes.
   */
  publishedHash: string | null;
  /** Local entry ids whose changes have been pushed to the team DB at least once. */
  publishedEntryIds: Set<string>;
  isPublishing: boolean;

  /** Team audit history fetched from DB (all users). */
  dbHistory: DbLayerHistoryEntry[];
  isLoadingDbHistory: boolean;
  /** True when the server has older entries beyond what's currently loaded. */
  dbHistoryHasMore: boolean;
  /** Timestamp of the oldest loaded entry — used as the `before` cursor for "load more". */
  dbHistoryOldestTs: number | null;

  /** Last computed merge preview (informational, Team tab). */
  globalState: GlobalStateResult | null;
  isComputingGlobalState: boolean;

  // ── Context ────────────────────────────────────────────────────────────────
  setClientId: (id: string | null) => void;
  setContext: (projectId: string | null, timelineId: string | null) => void;

  // ── Baseline / publish bookkeeping ─────────────────────────────────────────
  /**
   * Reset history and mark the current state as the clean published baseline.
   * Pass `snapshot` so undo can restore to this state when undoing past the first entry.
   */
  initBaseline: (hash: string, snapshot?: LayerHistorySnapshot) => void;
  /** Override only the published hash (used when restoring local WIP over team base). */
  setPublishedHash: (hash: string | null) => void;
  /** Current working-state hash (entry at cursor, or baseline if none). */
  getCurrentHash: () => string | null;
  /** True if the working state differs from the published team state. */
  hasUnpublishedChanges: () => boolean;
  /**
   * Mark the current working state as synced with team (publishedHash = currentHash)
   * and flag the cursor lineage as published. Does NOT write to DB.
   */
  markSyncedToTeam: () => void;
  /**
   * Append one audit entry to the team DB describing the newly-published changes,
   * then mark the lineage published and set publishedHash = currentHash.
   */
  commitPublish: (projectId: string, timelineId: string) => Promise<void>;
  setIsPublishing: (v: boolean) => void;

  // ── Team DB reads ──────────────────────────────────────────────────────────
  loadDbHistory: () => Promise<void>;
  loadMoreDbHistory: () => Promise<void>;
  computeGlobalState: (baseChildren: RenderableComponentData[]) => Promise<void>;

  // ── Local history ──────────────────────────────────────────────────────────
  recordChange: (
    description: string,
    changes: LayerNodeChange[],
    snapshot: LayerHistorySnapshot
  ) => void;
  /**
   * Append a history entry at the END without branching/discarding entries after
   * the cursor. Used by "revert to an old state", so reverting preserves the
   * changes made after the target state (creates a new entry instead).
   */
  appendChange: (
    description: string,
    changes: LayerNodeChange[],
    snapshot: LayerHistorySnapshot
  ) => void;
  /**
   * Destructively trim unpublished local entries that come AFTER the entry with
   * `entryId`, then move the cursor to that entry (no new entry is created).
   * Published entries are kept even if they appear after the target.
   */
  resetToHistoryEntry: (entryId: string) => void;
  /**
   * Remove every unpublished local entry, then move the cursor to the last
   * published entry (or -1 if none). Does NOT apply any snapshot — callers
   * must call discardAllLocalLayerChanges() via layer-state-store instead,
   * which applies the correct snapshot first.
   */
  discardAllLocalChanges: () => void;
  createCheckpoint: (label?: string) => void;
  undo: () => LayerHistorySnapshot | null;
  redo: () => LayerHistorySnapshot | null;
  jumpTo: (index: number) => LayerHistorySnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getEntries: () => LayerHistoryEntry[];
  getCurrentEntry: () => LayerHistoryEntry | null;
  getPreviousEntry: () => LayerHistoryEntry | null;
  clearHistory: () => void;

  /** Restore the persisted history for the current project+timeline (after reload). */
  hydrateHistory: () => boolean;
  /** Remove published entries from the local list to declutter; keeps unpublished work. */
  clearPublishedHistory: () => void;
}

// ─── Hashing ─────────────────────────────────────────────────────────────────
// Snapshots are always built the same way (snapshotFromLayerState), so a plain
// JSON.stringify is a stable, comparable hash. We only ever compare hashes that
// were produced from the same representation, so key-order is consistent.
export function hashLayerSnapshot(snapshot: LayerHistorySnapshot): string {
  return JSON.stringify(snapshot);
}

// ─── Audit-log trimming ──────────────────────────────────────────────────────
// add_node / add_child must keep full nodeData so the merge preview can rebuild
// the tree; everything else only needs {id, componentId, type}.
const KEEP_FULL_NODE_DATA: LayerChangeType[] = ["add_node", "add_child"];

function trimChangesForDb(changes: LayerNodeChange[]): LayerNodeChange[] {
  return changes.map((c) => {
    if (!c.nodeData) return c;
    if (KEEP_FULL_NODE_DATA.includes(c.changeType)) return c;
    return {
      ...c,
      nodeData: {
        id: (c.nodeData as RenderableComponentData).id,
        componentId: (c.nodeData as RenderableComponentData).componentId,
        type: (c.nodeData as RenderableComponentData).type,
      } as unknown as RenderableComponentData,
    };
  });
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useLayerHistoryStore = create<LayerHistoryState>((set, get) => ({
  entries: [],
  cursor: -1,
  maxSize: 100,
  squashMs: 800,

  clientId: null,
  projectId: null,
  timelineId: null,

  baselineSnapshot: null,
  baselineHash: null,
  publishedHash: null,
  publishedEntryIds: new Set(),
  isPublishing: false,

  dbHistory: [],
  isLoadingDbHistory: false,
  dbHistoryHasMore: false,
  dbHistoryOldestTs: null,

  globalState: null,
  isComputingGlobalState: false,

  setClientId: (id) => set({ clientId: id }),
  setContext: (projectId, timelineId) => set({ projectId, timelineId }),

  initBaseline: (hash, snapshot) =>
    set({
      entries: [],
      cursor: -1,
      baselineHash: hash,
      publishedHash: hash,
      publishedEntryIds: new Set(),
      baselineSnapshot: snapshot ?? null,
    }),

  setPublishedHash: (hash) => set({ publishedHash: hash }),

  getCurrentHash: () => {
    const { entries, cursor, baselineHash } = get();
    if (cursor >= 0 && cursor < entries.length) return entries[cursor]!.stateHash;
    return baselineHash;
  },

  hasUnpublishedChanges: () => {
    const { publishedHash } = get();
    return get().getCurrentHash() !== publishedHash;
  },

  markSyncedToTeam: () => {
    const { entries, cursor } = get();
    const currentHash = get().getCurrentHash();
    const lineageIds = entries.slice(0, cursor + 1).map((e) => e.id);
    set((s) => ({
      publishedHash: currentHash,
      publishedEntryIds: new Set([...s.publishedEntryIds, ...lineageIds]),
    }));
  },

  setIsPublishing: (v) => set({ isPublishing: v }),

  commitPublish: async (projectId, timelineId) => {
    const { entries, cursor, publishedEntryIds, clientId } = get();
    const lineage = entries.slice(0, cursor + 1);
    const newly = lineage.filter((e) => !publishedEntryIds.has(e.id));

    const currentEntry = get().getCurrentEntry();
    const changes: LayerNodeChange[] = newly.length
      ? newly.flatMap((e) => e.changes)
      : (currentEntry?.changes ?? []);
    const description = newly.length
      ? `Published ${newly.length} change${newly.length !== 1 ? "s" : ""}`
      : currentEntry
        ? "Republished earlier state"
        : "Published changes";
    // Full state at this publish so the team tab can preview / revert to it.
    const snapshot = currentEntry?.snapshot;

    // Mark synced first so the UI updates immediately
    get().markSyncedToTeam();

    if (projectId && timelineId && clientId) {
      try {
        await fetch("/api/project/timeline/layer-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            timelineId,
            clientId,
            entryId: `pub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            description,
            changes: trimChangesForDb(changes),
            ...(snapshot ? { snapshot } : {}),
          }),
        });
      } catch {
        // Audit log write is best-effort; canonical state PUT already succeeded.
      }
    }
    await get().loadDbHistory();
  },

  loadDbHistory: async () => {
    const { projectId, timelineId } = get();
    if (!projectId || !timelineId) return;
    set({ isLoadingDbHistory: true });
    try {
      const res = await fetch(
        `/api/project/timeline/layer-history?projectId=${encodeURIComponent(projectId)}&timelineId=${encodeURIComponent(timelineId)}&limit=20`
      );
      if (!res.ok) return;
      const data: DbLayerHistoryEntry[] = await res.json();
      const entries = Array.isArray(data) ? data : [];
      set({
        dbHistory: entries,
        dbHistoryHasMore: entries.length === 20,
        dbHistoryOldestTs: entries.length > 0 ? (entries[entries.length - 1]!.timestamp ?? null) : null,
      });
    } catch {
      // non-critical
    } finally {
      set({ isLoadingDbHistory: false });
    }
  },

  loadMoreDbHistory: async () => {
    const { projectId, timelineId, dbHistoryOldestTs, isLoadingDbHistory } = get();
    if (!projectId || !timelineId || isLoadingDbHistory || dbHistoryOldestTs === null) return;
    set({ isLoadingDbHistory: true });
    try {
      const res = await fetch(
        `/api/project/timeline/layer-history?projectId=${encodeURIComponent(projectId)}&timelineId=${encodeURIComponent(timelineId)}&limit=20&before=${dbHistoryOldestTs}`
      );
      if (!res.ok) return;
      const data: DbLayerHistoryEntry[] = await res.json();
      const entries = Array.isArray(data) ? data : [];
      set((s) => ({
        dbHistory: [...s.dbHistory, ...entries],
        dbHistoryHasMore: entries.length === 20,
        dbHistoryOldestTs: entries.length > 0 ? (entries[entries.length - 1]!.timestamp ?? null) : null,
      }));
    } catch {
      // non-critical
    } finally {
      set({ isLoadingDbHistory: false });
    }
  },

  computeGlobalState: async (baseChildren) => {
    const { projectId, timelineId } = get();
    if (!projectId || !timelineId) return;
    set({ isComputingGlobalState: true });
    try {
      const res = await fetch(
        `/api/project/timeline/layer-history?projectId=${encodeURIComponent(projectId)}&timelineId=${encodeURIComponent(timelineId)}&limit=200`
      );
      if (!res.ok) return;
      const ops: DbLayerHistoryEntry[] = await res.json();
      set({ dbHistory: Array.isArray(ops) ? ops : [] });

      const { computeGlobalLayerState } = await import("@/lib/editor/layer-merge");
      const result = computeGlobalLayerState(baseChildren, ops);
      set({ globalState: result });
    } catch (err) {
      console.error("computeGlobalState failed:", err);
    } finally {
      set({ isComputingGlobalState: false });
    }
  },

  recordChange: (description, changes, snapshot) => {
    const now = Date.now();
    const { squashMs, clientId } = get();
    const stateHash = hashLayerSnapshot(snapshot);

    set((s) => {
      const firstChange = changes[0];

      // ── Squash path ──────────────────────────────────────────────────────
      if (squashMs > 0 && firstChange?.changeType === "override" && s.cursor >= 0) {
        const last = s.entries[s.cursor];
        if (
          last &&
          s.cursor === s.entries.length - 1 &&
          last.changes[0]?.changeType === "override" &&
          last.changes[0]?.nodeId === firstChange.nodeId &&
          last.timestamp !== 0 && // never squash into a pinned checkpoint
          now - last.timestamp < squashMs
        ) {
          const squashed: LayerHistoryEntry = {
            ...last,
            stateHash,
            snapshot: JSON.parse(JSON.stringify(snapshot)),
            changes: changes.map((c, i) => {
              const orig = last.changes[i];
              if (orig && c.changeType === "override") {
                return { ...c, prevOverride: orig.prevOverride };
              }
              return JSON.parse(JSON.stringify(c));
            }),
          };
          const newEntries = [...s.entries];
          newEntries[s.cursor] = squashed;
          return { entries: newEntries };
        }
      }

      // ── Normal path ──────────────────────────────────────────────────────
      const entry: LayerHistoryEntry = {
        id: `lh_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        description,
        changes: JSON.parse(JSON.stringify(changes)),
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        stateHash,
        clientId: clientId ?? null,
      };
      const before = s.entries.slice(0, s.cursor + 1);
      let next = [...before, entry];
      if (next.length > s.maxSize) next = next.slice(next.length - s.maxSize);
      return { entries: next, cursor: next.length - 1 };
    });
  },

  appendChange: (description, changes, snapshot) => {
    const now = Date.now();
    const { clientId } = get();
    const entry: LayerHistoryEntry = {
      id: `lh_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now,
      description,
      changes: JSON.parse(JSON.stringify(changes)),
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      stateHash: hashLayerSnapshot(snapshot),
      clientId: clientId ?? null,
    };
    set((s) => {
      // Append at the very END — keep every existing entry (no branching).
      let next = [...s.entries, entry];
      if (next.length > s.maxSize) next = next.slice(next.length - s.maxSize);
      return { entries: next, cursor: next.length - 1 };
    });
  },

  resetToHistoryEntry: (entryId) => {
    set((s) => {
      const targetIdx = s.entries.findIndex((e) => e.id === entryId);
      if (targetIdx < 0) return {};
      // Keep entries up to and including the target plus any published entries after it.
      const kept = s.entries.filter(
        (e, i) => i <= targetIdx || s.publishedEntryIds.has(e.id)
      );
      // Cursor lands on the target entry in the trimmed array.
      const newCursor = kept.findIndex((e) => e.id === entryId);
      return { entries: kept, cursor: newCursor };
    });
  },

  discardAllLocalChanges: () => {
    set((s) => {
      const kept = s.entries.filter((e) => s.publishedEntryIds.has(e.id));
      return { entries: kept, cursor: kept.length - 1 };
    });
  },

  createCheckpoint: (label) => {
    const { entries, cursor } = get();
    if (cursor < 0 || cursor >= entries.length) return;
    const last = entries[cursor];
    if (!last) return;
    const pinned: LayerHistoryEntry = {
      ...last,
      description: label ?? last.description,
      timestamp: 0, // 0 = pinned; squash window check (now - 0) always > squashMs
    };
    const newEntries = [...entries];
    newEntries[cursor] = pinned;
    set({ entries: newEntries });
  },

  undo: () => {
    const { entries, cursor, baselineSnapshot } = get();
    if (cursor < 0) return null;
    if (cursor === 0) {
      // Undo past the first entry — restore the pre-edit baseline state.
      set({ cursor: -1 });
      return baselineSnapshot;
    }
    const entry = entries[cursor - 1];
    if (!entry) return null;
    set({ cursor: cursor - 1 });
    return entry.snapshot;
  },

  redo: () => {
    const { entries, cursor } = get();
    if (cursor >= entries.length - 1) return null;
    const entry = entries[cursor + 1];
    if (!entry) return null;
    set({ cursor: cursor + 1 });
    return entry.snapshot;
  },

  jumpTo: (index) => {
    const { entries } = get();
    if (index < 0 || index >= entries.length) return null;
    const entry = entries[index];
    if (!entry) return null;
    set({ cursor: index });
    return entry.snapshot;
  },

  canUndo: () => get().cursor >= 0,
  canRedo: () => {
    const { cursor, entries } = get();
    return cursor < entries.length - 1;
  },
  getEntries: () => get().entries,
  getCurrentEntry: () => {
    const { entries, cursor } = get();
    return cursor >= 0 && cursor < entries.length ? (entries[cursor] ?? null) : null;
  },
  getPreviousEntry: () => {
    const { entries, cursor } = get();
    const idx = cursor - 1;
    return idx >= 0 ? (entries[idx] ?? null) : null;
  },
  clearHistory: () =>
    set({ entries: [], cursor: -1, baselineHash: null, publishedHash: null, publishedEntryIds: new Set(), baselineSnapshot: null }),

  hydrateHistory: () => {
    const { projectId, timelineId } = get();
    if (typeof window === "undefined" || !projectId || !timelineId) return false;
    try {
      const raw = localStorage.getItem(layerHistoryKey(projectId, timelineId));
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.entries)) return false;
      set({
        entries: data.entries,
        cursor:
          typeof data.cursor === "number" ? data.cursor : data.entries.length - 1,
        baselineHash: data.baselineHash ?? null,
        publishedHash: data.publishedHash ?? null,
        publishedEntryIds: new Set(
          Array.isArray(data.publishedEntryIds) ? data.publishedEntryIds : []
        ),
      });
      return true;
    } catch {
      return false;
    }
  },

  clearPublishedHistory: () => {
    set((s) => {
      const currentId = s.cursor >= 0 ? s.entries[s.cursor]?.id ?? null : null;
      const kept = s.entries.filter((e) => !s.publishedEntryIds.has(e.id));
      const newCursor = currentId ? kept.findIndex((e) => e.id === currentId) : -1;
      return {
        entries: kept,
        // If the current entry was published (removed), fall back to the baseline
        // = the published state, so the working state still reads as clean.
        cursor: newCursor,
        baselineHash: s.publishedHash ?? s.baselineHash,
        publishedEntryIds: new Set<string>(),
      };
    });
  },
}));

// ─── History persistence (survives page reloads) ─────────────────────────────

const LAYER_HISTORY_KEY = "layer-history";
function layerHistoryKey(projectId: string, timelineId: string): string {
  return `${LAYER_HISTORY_KEY}-${projectId}-${timelineId}`;
}

function persistLayerHistory(s: LayerHistoryState): void {
  if (typeof window === "undefined" || !s.projectId || !s.timelineId) return;
  try {
    const data = {
      entries: s.entries,
      cursor: s.cursor,
      baselineHash: s.baselineHash,
      publishedHash: s.publishedHash,
      publishedEntryIds: Array.from(s.publishedEntryIds),
    };
    localStorage.setItem(layerHistoryKey(s.projectId, s.timelineId), JSON.stringify(data));
  } catch {
    // localStorage quota exceeded — history persistence is best-effort.
  }
}

// Auto-save history (debounced) whenever the entries / cursor / publish markers change.
if (typeof window !== "undefined") {
  let _persistTimer: ReturnType<typeof setTimeout> | null = null;
  useLayerHistoryStore.subscribe((state, prev) => {
    if (
      state.entries !== prev.entries ||
      state.cursor !== prev.cursor ||
      state.publishedHash !== prev.publishedHash ||
      state.baselineHash !== prev.baselineHash ||
      state.publishedEntryIds !== prev.publishedEntryIds
    ) {
      if (_persistTimer) clearTimeout(_persistTimer);
      _persistTimer = setTimeout(
        () => persistLayerHistory(useLayerHistoryStore.getState()),
        400
      );
    }
  });
}

// ─── Reactive selector hook ───────────────────────────────────────────────────

/** True when the working state differs from the published team state. */
export function useHasUnpublishedChanges(): boolean {
  return useLayerHistoryStore((s) => {
    const current =
      s.cursor >= 0 && s.cursor < s.entries.length
        ? s.entries[s.cursor]!.stateHash
        : s.baselineHash;
    return current !== s.publishedHash;
  });
}

// ─── _layerItemId utilities ───────────────────────────────────────────────────

export function makeLayerItemId(nodeId: string): string {
  return `li_${nodeId}`;
}

export function assignLayerItemIds(
  nodes: RenderableComponentData[]
): RenderableComponentData[] {
  return nodes.map((node) => {
    const n = node as RenderableComponentData & { _layerItemId?: string };
    const withId = n._layerItemId
      ? node
      : ({
          ...node,
          _layerItemId: makeLayerItemId(node.id),
        } as unknown as RenderableComponentData);
    if (withId.childrenData?.length) {
      return { ...withId, childrenData: assignLayerItemIds(withId.childrenData) };
    }
    return withId;
  });
}

export function getLayerItemId(node: RenderableComponentData): string {
  return (
    (node as RenderableComponentData & { _layerItemId?: string })._layerItemId ?? node.id
  );
}
