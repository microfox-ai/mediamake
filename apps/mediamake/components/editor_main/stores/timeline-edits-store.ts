import { create } from 'zustand';
import type { Timeline } from './project-store';
import type { AppliedNode, NodeTiming } from '@/components/editor_main/timing/types';
import {
  applyTimingToPresetInput,
  collectSubtreeIds,
  findNode,
  idsRemovedWith,
  insertPresetNode,
  pruneNodes,
  loadInstanceTree,
  mapNodeDisabled,
  mapNodeTiming,
  moveNode,
  moveNodes,
  orderPresetsLikeTree,
  outermostIds,
  parentOfNode,
  presetAnchorPlacement,
  sceneRenderId,
} from '@/components/editor_main/timing/load-instance-tree';
import { inheritParentLock } from '@/components/editor/presets/form/apply-track-mode';
import {
  groupSelectedPresets,
  ungroupSelectedPresets,
  type GroupSceneSeed,
} from '@/components/editor_main/timing/group-presets';
import {
  copyTrackName,
  defaultTrackName,
  presetTrackName,
  uniqueTrackName,
  withTrackName,
} from '@/components/editor_main/timing/preset-track-name';
import { DatabasePreset, Preset as PresetType } from '@/components/editor/presets/types';
import {
  getUnsyncedTimelineIds,
  isTimelineUnsyncedWithCloud,
  mapFromEntries,
  mapToEntries,
  type UpdatedAtMap,
} from './timeline-sync';
import { summarizeTimelineDiff } from '@/lib/editor/diff-utils';
import { mergeTimelines, type TimelineConflict, type MergeSide } from '@/lib/editor/timeline-merge';
import {
  applyCaptionSnapshots,
  captionIdsChanged,
  captionSnapshotsFromTimeline,
  clearLocalCaptionOwnership,
  rememberLocalCaptions,
  scheduleCaptionWriteBack,
  seedCaptionOwnershipFromHistory,
  timelineWithoutCaptionBodies,
  type LocalCaptionSnapshot,
} from '@/lib/captions/caption-local-history';

export type { TimelineConflict, MergeSide };

/** Pending merge state surfaced to the conflict-resolution dialog. */
export interface PendingTimelineMerge {
  timelineId: string;
  conflicts: TimelineConflict[];
  autoMerged: string[];
  remoteVersion: number;
  build: (choices: Record<string, MergeSide>) => Timeline;
}

// History entry for undo/redo
interface HistoryEntry {
  timelineId: string;
  timeline: Timeline;
  timestamp: number;
  /** Stable id for the entry (used to track which entries have been published). */
  id?: string;
  /** True once this entry's state has been published to the team. */
  published?: boolean;
  /**
   * Caption documents at this step. Lines are stored separately from the timeline,
   * so local undo keeps them here and restores them with the step.
   */
  captions?: LocalCaptionSnapshot[];
  /** Caption document ids whose lines changed in this step. */
  captionEditIds?: string[];
}

/** Lightweight team audit entry for timeline publishes (mirrors layer team history). */
export interface DbTimelineHistoryEntry {
  entryId: string;
  projectId: string;
  timelineId: string;
  clientId: string;
  timestamp: number;
  description: string;
  changes: Array<{ type: string; summary: string }>;
  /** Full timeline at this publish — enables team preview / revert to old states. */
  snapshot?: Timeline;
}

/** Outcome of a manual timeline publish. */
export type TimelinePublishResult =
  | { ok: true; version: number }
  | { ok: true; merged: true; version: number } // auto-merged a concurrent publish
  | { ok: false; reason: 'conflict'; lastClientId?: string }
  | { ok: false; reason: 'merge'; conflicts: number } // needs manual conflict resolution (dialog)
  | { ok: false; reason: 'nochange' }
  | { ok: false; reason: 'error'; message?: string };

interface TimelineEditsState {
  // Current state
  editedTimelines: Map<string, Timeline>; // timelineId -> edited timeline
  isDirty: boolean; // Whether there are unsaved changes
  cloudUpdatedAtByTimelineId: UpdatedAtMap;
  localEditUpdatedAtByTimelineId: UpdatedAtMap;
  
  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number; // Current position in history (-1 means no history)
  maxHistorySize: number;
  
  // Current project ID for persistence
  currentProjectId: string | null;
  
  // Actions
  /**
   * @param changeKey - when set, consecutive calls with the same key within the
   *   squash window collapse into one history entry (e.g. "input:<presetId>").
   *   Omit for discrete actions (add/remove/reorder) that should never squash.
   */
  updateTimeline: (timelineId: string, updates: Partial<Timeline>, changeKey?: string) => void;
  updatePresetInputData: (timelineId: string, presetId: string, inputData: any) => void;
  updatePresetDisabled: (timelineId: string, presetId: string, disabled: boolean) => void;
  /** Swap a block onto another preset in place. The block id, parent and order stay. */
  replacePresetDefinition: (
    timelineId: string,
    presetId: string,
    preset: PresetType | DatabasePreset,
    inputData: any,
  ) => void;
  updateNodeTiming: (timelineId: string, nodeId: string, timing: NodeTiming) => void;
  reparentInstanceNode: (timelineId: string, nodeId: string, parentId: string) => void;
  /** Place `nodeId` under a scene. `index` is the position after the node is removed. */
  moveInstanceNode: (
    timelineId: string,
    nodeId: string,
    parentId: string,
    index?: number,
  ) => boolean;
  /**
   * Place these blocks under a scene, in tree order, at `index` after they are removed.
   * A selected child of a selected block stays inside that block.
   */
  moveInstanceNodes: (
    timelineId: string,
    nodeIds: readonly string[],
    parentId: string,
    index?: number,
  ) => boolean;
  /** Wrap same-parent presets in a new aligned scene. Returns the scene id, or null. */
  groupPresets: (timelineId: string, ids: string[], seed: GroupSceneSeed) => string | null;
  /**
   * Dissolve scene blocks. Children take the scene's place.
   * Returns the lifted block ids, or null when nothing was ungrouped.
   */
  ungroupPresets: (timelineId: string, ids: string[]) => string[] | null;
  updateTimelineConfig: (timelineId: string, config: any) => void;
  updateTimelineDefaultData: (timelineId: string, defaultData: any) => void;
  addPresetToTimeline: (
    timelineId: string,
    preset: PresetType | DatabasePreset,
    parentId?: string,
  ) => string | null;
  removePreset: (timelineId: string, presetId: string) => void;
  duplicatePreset: (timelineId: string, presetId: string) => string | null;
  /**
   * Insert a preset copy next to `anchorId`.
   * A copy of a block inside a group stays in that group.
   * Returns the placed preset id.
   */
  placePresetCopy: (
    timelineId: string,
    preset: NonNullable<Timeline['presets']>[number],
    anchorId: string | null,
    placement?: 'beside' | 'into-or-beside',
    actions?: NonNullable<Timeline['actions']>,
  ) => string | null;
  reorderPresets: (timelineId: string, oldIndex: number, newIndex: number) => void;
  addActionToTimeline: (
    timelineId: string,
    action: {
      actionId: string;
      label: string;
      target: import('@/components/editor/presets/actions/types').ActionTarget;
      inputData?: Record<string, unknown>;
      /** Defaults to `"manual"` — UI / explicit run only; never at compile time. */
      runPolicy?: import('@/components/editor/presets/actions/types').ActionRunPolicy;
    },
  ) => import('@/components/editor/presets/actions/types').TimelineAction | null;
  updateAction: (
    timelineId: string,
    actionId: string,
    updates: Partial<import('@/components/editor/presets/actions/types').TimelineAction>,
    options?: { skipHistory?: boolean },
  ) => void;
  removeAction: (timelineId: string, actionId: string) => void;
  
  // History actions
  undo: () => boolean; // Returns true if undo was successful
  redo: () => boolean; // Returns true if redo was successful
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Persistence
  saveToDatabase: (timelineId: string) => Promise<void>;
  saveAllTimelinesToDatabase: () => Promise<string[]>;
  loadFromPersistence: (projectId: string) => void;
  clearEdits: (projectId?: string) => void;
  registerCloudTimelines: (timelines: Timeline[]) => void;
  
  // State management
  setCurrentProjectId: (projectId: string | null) => void;
  getEditedTimeline: (timelineId: string) => Timeline | null;

  // ── Multi-user publish parity (mirrors the layer system) ─────────────────
  clientId: string | null;
  currentTimelineId: string | null;
  isPublishing: boolean;
  dbHistory: DbTimelineHistoryEntry[];
  isLoadingDbHistory: boolean;
  dbHistoryHasMore: boolean;
  dbHistoryOldestTs: number | null;
  /** Last team-published timeline per id, to diff against when publishing (advances on publish). */
  publishedBaselineById: Map<string, Timeline>;
  /** Original loaded timeline per id (stable for the session) — used for the oldest local diff. */
  loadBaselineById: Map<string, Timeline>;
  /**
   * The server `version` last SYNCED for each timeline (from the authoritative
   * load GET or a successful publish). This is what the optimistic lock checks.
   * Crucially it is NOT changed by local edits / undo / redo — those stay local
   * and must never cause a publish conflict.
   */
  timelineVersionById: Map<string, number>;

  setClientId: (id: string | null) => void;
  setTimelineContext: (timelineId: string | null) => void;
  /** Record the synced server version for a timeline (from load / publish). */
  setTimelineVersion: (timelineId: string, version: number) => void;
  /** Record the team-published baseline for a timeline (used to diff on publish). */
  setTimelinePublishedBaseline: (timelineId: string, timeline: Timeline) => void;
  /** True when the loaded timeline has edits not yet published to the team. */
  hasUnpublishedChanges: () => boolean;
  /** Publish current timeline edits with optimistic locking + audit entry. */
  publishTimeline: (timelineId: string) => Promise<TimelinePublishResult>;
  /** Discard local timeline edits and load the team's published timeline. Undoable. */
  revertTimelineToTeamBase: (timelineId: string) => Promise<void>;
  /** Fetch the team timeline audit trail for the history panel. */
  loadTimelineDbHistory: () => Promise<void>;
  loadMoreTimelineDbHistory: () => Promise<void>;

  /** True while a historical/team timeline is being temporarily previewed. */
  isTimelinePreviewActive: boolean;
  /** Temporarily show a historical timeline in the player (recompiles). Non-destructive. */
  startTimelinePreview: (timeline: Timeline) => void;
  /** Restore the real timeline after a preview. */
  endTimelinePreview: () => void;
  /**
   * Revert to a historical/team timeline by APPENDING a new history entry — the
   * changes made after that state are preserved (non-destructive). Undoable.
   */
  revertToTimelineState: (timeline: Timeline, label?: string) => void;
  /**
   * Destructively reset to a local historical timeline state: trims unpublished
   * entries AFTER `entryId`, moves the cursor to that entry. No new entry is created.
   */
  resetToTimelineEntry: (entryId: string, timeline: Timeline) => void;
  /**
   * Remove every unpublished local history entry for `timelineId` and restore the
   * timeline to the last published snapshot (or the load-time baseline if nothing
   * was published). No new entry is created.
   */
  discardAllLocalTimelineChanges: (timelineId: string) => void;

  /** Remove published entries from the local list to declutter; keeps unpublished work. */
  clearPublishedHistory: () => void;

  /** Set when a publish hit a conflict that needs manual resolution (drives the dialog). */
  pendingTimelineMerge: PendingTimelineMerge | null;
  /** Apply the user's conflict choices, then publish the merged timeline. */
  resolveTimelineMerge: (choices: Record<string, MergeSide>) => Promise<TimelinePublishResult>;
  /** Dismiss the merge dialog without publishing (keeps local edits). */
  cancelTimelineMerge: () => void;
  isTimelineUnsynced: (timelineId: string) => boolean;
  getUnsyncedTimelineIds: () => string[];
  hasAnyUnsyncedTimelines: () => boolean;
}

const TEAM_HISTORY_KEY = 'timeline-edit-history';

// Persistence helpers
const STORAGE_KEY = 'timeline-edits-storage';
/** localStorage value used when the snapshot itself is stored in IndexedDB. */
const IDB_POINTER = 'indexeddb';
const IDB_NAME = 'mediamake-timeline-edits';
const IDB_STORE = 'snapshots';

const editsStorageKey = (projectId: string | null) =>
  `${STORAGE_KEY}-${projectId || 'default'}`;

/** Bumped on every persist so a late IndexedDB read cannot overwrite a newer edit. */
let _editsWriteGeneration = 0;
let _warnedQuotaRecovery = false;

function warnQuotaRecovery(message: string) {
  if (_warnedQuotaRecovery) return;
  _warnedQuotaRecovery = true;
  console.warn(message);
}

type StoredEdits = {
  editedTimelines?: Map<string, Timeline>;
  isDirty?: boolean;
  cloudUpdatedAtByTimelineId?: UpdatedAtMap;
  localEditUpdatedAtByTimelineId?: UpdatedAtMap;
  currentProjectId?: string | null;
  /** localStorage only holds a pointer; the snapshot is in IndexedDB. */
  deferred?: boolean;
};

function normalizeStoredEdits(parsed: unknown): StoredEdits | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as {
    storage?: string;
    editedTimelines?: Map<string, Timeline> | [string, Timeline][];
    isDirty?: boolean;
    cloudUpdatedAtByTimelineId?: [string, string][] | UpdatedAtMap | null;
    localEditUpdatedAtByTimelineId?: [string, string][] | UpdatedAtMap | null;
    currentProjectId?: string | null;
  };
  if (record.storage === IDB_POINTER) return { deferred: true };
  const editedTimelines =
    record.editedTimelines instanceof Map
      ? record.editedTimelines
      : new Map(record.editedTimelines ?? []);
  let localEditUpdatedAtByTimelineId = mapFromEntries(
    record.localEditUpdatedAtByTimelineId instanceof Map
      ? Array.from(record.localEditUpdatedAtByTimelineId.entries())
      : record.localEditUpdatedAtByTimelineId,
  );
  const cloudUpdatedAtByTimelineId = mapFromEntries(
    record.cloudUpdatedAtByTimelineId instanceof Map
      ? Array.from(record.cloudUpdatedAtByTimelineId.entries())
      : record.cloudUpdatedAtByTimelineId,
  );

  // Legacy migration: global isDirty with edited timelines but no per-timeline timestamps
  if (record.isDirty && localEditUpdatedAtByTimelineId.size === 0 && editedTimelines.size > 0) {
    const migratedAt = new Date().toISOString();
    localEditUpdatedAtByTimelineId = new Map(localEditUpdatedAtByTimelineId);
    editedTimelines.forEach((_timeline, timelineId) => {
      localEditUpdatedAtByTimelineId.set(timelineId, migratedAt);
    });
  }

  return {
    editedTimelines,
    isDirty: record.isDirty,
    cloudUpdatedAtByTimelineId,
    localEditUpdatedAtByTimelineId,
    currentProjectId: record.currentProjectId,
  };
}

const loadFromStorage = (projectId: string | null): StoredEdits | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(editsStorageKey(projectId));
    if (!stored) return null;
    return normalizeStoredEdits(JSON.parse(stored));
  } catch (error) {
    console.error('Error loading from storage:', error);
  }
  return null;
};

/** True when any history entry at/before the cursor is still unpublished. */
const hasUnpublishedAtCursor = (history: HistoryEntry[], historyIndex: number): boolean => {
  if (historyIndex < 0) return false;
  for (let i = 0; i <= historyIndex; i++) {
    if (!history[i]?.published) return true;
  }
  return false;
};

/** Resolve the timeline id for a history entry (supports older entries missing timelineId). */
const historyEntryTimelineId = (entry: HistoryEntry | undefined): string | undefined =>
  entry?.timelineId || entry?.timeline?.id;

/** True when a specific timeline has unpublished local history at/before the cursor. */
const hasUnpublishedForTimeline = (
  history: HistoryEntry[],
  historyIndex: number,
  timelineId: string
): boolean => {
  if (historyIndex < 0) return false;
  for (let i = 0; i <= historyIndex; i++) {
    const entry = history[i];
    if (!entry || entry.published) continue;
    if (historyEntryTimelineId(entry) === timelineId) return true;
  }
  return false;
};

/** Mark unpublished entries for `timelineId` at/before the cursor as published. */
const markTimelinePublishedUpToCursor = (
  history: HistoryEntry[],
  historyIndex: number,
  timelineId: string
): HistoryEntry[] =>
  history.map((entry, index) => {
    if (index > historyIndex || entry.published) return entry;
    if (historyEntryTimelineId(entry) !== timelineId) return entry;
    return { ...entry, timelineId, published: true };
  });

/** Drop bulky action output payloads from a timeline (already applied to presets/refs). */
const stripActionOutputsFromTimeline = (timeline: Timeline): Timeline => {
  if (!timeline.actions?.length) return timeline;
  return {
    ...timeline,
    actions: timeline.actions.map((a) =>
      a.outputs?.length ? { ...a, outputs: [] } : a,
    ),
  };
};

/** Drop preset definitions and duplicated node inputs. Both are restored on load. */
function slimNode(node: AppliedNode, presetIds: Set<string>): AppliedNode {
  return {
    ...node,
    input: presetIds.has(node.id) ? {} : node.input,
    children: node.children.map((child) => slimNode(child, presetIds)),
  };
}

function compactTimelineForStorage(timeline: Timeline): Timeline {
  const withoutOutputs = stripActionOutputsFromTimeline(timeline);
  const presets = withoutOutputs.presets?.map((preset) => {
    if (!preset.presetInfo) return preset;
    const { presetInfo: _presetInfo, ...rest } = preset;
    return rest;
  });
  const nodes = withoutOutputs.nodes
    ? slimNode(withoutOutputs.nodes, new Set((presets ?? []).map((preset) => preset.id)))
    : withoutOutputs.nodes;
  if (presets === withoutOutputs.presets && nodes === withoutOutputs.nodes) return withoutOutputs;
  return { ...withoutOutputs, presets, nodes };
}

function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String((error as { name: unknown }).name) : '';
  const code = 'code' in error ? (error as { code: unknown }).code : undefined;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22;
}

/** Returns false when the write was rejected for quota. Other failures propagate. */
function writeLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaError(error)) return false;
    throw error;
  }
}

/** Undo snapshots are the usual thing filling the 5MB origin quota. */
function freeTimelineHistoryStorage() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${TIMELINE_HISTORY_KEY}-`) || key === TEAM_HISTORY_KEY) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // Storage can throw if it is disabled. The edit save still tries IndexedDB.
  }
}

let editsDbPromise: Promise<IDBDatabase> | null = null;

function openEditsDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable'));
  if (!editsDbPromise) {
    editsDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        editsDbPromise = null;
        reject(request.error);
      };
    });
  }
  return editsDbPromise;
}

function idbPut(key: string, value: unknown): Promise<void> {
  return openEditsDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

let idbWriteQueue: Promise<void> = Promise.resolve();

/** Keep only the newest oversized snapshot. Older writes are skipped once a newer edit exists. */
function enqueueOversizedEdits(key: string, value: unknown, generation: number) {
  idbWriteQueue = idbWriteQueue
    .catch(() => undefined)
    .then(async () => {
      if (generation !== _editsWriteGeneration) return;
      try {
        await idbPut(key, value);
        if (generation !== _editsWriteGeneration) return;
        localStorage.setItem(key, JSON.stringify({ storage: IDB_POINTER, savedAt: Date.now() }));
      } catch (error) {
        if (isQuotaError(error)) return;
        console.error('Error saving timeline edits:', error);
      }
    });
}

function idbGet(key: string): Promise<unknown> {
  return openEditsDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const request = tx.objectStore(IDB_STORE).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

const saveToStorage = (projectId: string | null, state: Partial<TimelineEditsState>) => {
  if (typeof window === 'undefined') return;
  _editsWriteGeneration += 1;
  const generation = _editsWriteGeneration;
  try {
    // Merge with existing storage so partial updates (undo/redo) don't wipe
    // isDirty / timestamp maps when those fields are omitted from `state`.
    const existing = loadFromStorage(projectId);
    const edited = state.editedTimelines ?? existing?.editedTimelines ?? new Map();
    const toStore = {
      editedTimelines: Array.from(edited.entries()).map(([id, timeline]) => [
        id,
        compactTimelineForStorage(timeline),
      ]),
      cloudUpdatedAtByTimelineId: mapToEntries(
        state.cloudUpdatedAtByTimelineId ?? existing?.cloudUpdatedAtByTimelineId ?? new Map()
      ),
      localEditUpdatedAtByTimelineId: mapToEntries(
        state.localEditUpdatedAtByTimelineId ??
          existing?.localEditUpdatedAtByTimelineId ??
          new Map()
      ),
      currentProjectId: state.currentProjectId ?? existing?.currentProjectId ?? projectId,
      isDirty: state.isDirty ?? existing?.isDirty ?? false,
    };
    const key = editsStorageKey(projectId);
    const json = JSON.stringify(toStore);
    if (writeLocalStorage(key, json)) return;

    // The previous value stays allocated until it is removed, so a smaller
    // replacement can still throw. Drop undo history, then the old snapshot.
    freeTimelineHistoryStorage();
    if (writeLocalStorage(key, json)) {
      warnQuotaRecovery('Timeline storage was full. Cleared local undo history so the latest edits could be saved.');
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    if (writeLocalStorage(key, json)) {
      warnQuotaRecovery('Timeline storage was full. Replaced the previous local copy with a smaller one.');
      return;
    }

    warnQuotaRecovery('Timeline storage was full. Saved the latest edits in IndexedDB instead.');
    enqueueOversizedEdits(key, toStore, generation);
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
};

const bumpLocalTimelineEdit = (
  timelineId: string,
  localEditUpdatedAtByTimelineId: UpdatedAtMap
): UpdatedAtMap => {
  const next = new Map(localEditUpdatedAtByTimelineId);
  next.set(timelineId, new Date().toISOString());
  return next;
};

const getProjectTimelines = (): Timeline[] => {
  const { useProjectStore } = require('./project-store');
  return useProjectStore.getState().timelines as Timeline[];
};

// Helper to create a history entry
const createHistoryEntry = (
  timeline: Timeline,
  previous?: Timeline | null,
  inheritCaptionEditIds?: string[],
): HistoryEntry => {
  const clone = JSON.parse(JSON.stringify(timeline)) as Timeline;
  const captions = captionSnapshotsFromTimeline(clone);
  const captionEditIds = new Set(captionIdsChanged(previous, clone));
  for (const id of inheritCaptionEditIds ?? []) captionEditIds.add(id);
  return {
    timelineId: timeline.id,
    timeline: clone,
    captions,
    captionEditIds: [...captionEditIds],
    timestamp: Date.now(),
    id: `th_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    published: false,
  };
};

let recompileUnsubscribe: (() => void) | null = null;
let recompileTimelineId: string | null = null;

/** Compile the restored timeline so caption-only undo shows up in the player. */
const recompileTimeline = (timelineId: string) => {
  recompileTimelineId = timelineId;
  const run = () => {
    try {
      const { useCompileStore } = require('./compile-store');
      const compile = useCompileStore.getState();
      if (compile.isGenerating) {
        if (!recompileUnsubscribe) {
          recompileUnsubscribe = useCompileStore.subscribe(
            (state: { isGenerating: boolean }) => {
              if (state.isGenerating) return;
              recompileUnsubscribe?.();
              recompileUnsubscribe = null;
              run();
            },
          );
        }
        return;
      }
      const id = recompileTimelineId;
      if (!id) return;
      const latest = useTimelineEditsStore.getState().getEditedTimeline(id);
      if (!latest) {
        recompileTimelineId = null;
        return;
      }
      void compile.generateOutput(latest);
      const stillQueued = recompileTimelineId !== id;
      const started = useCompileStore.getState().isGenerating;
      if (!started) {
        if (recompileTimelineId === id) recompileTimelineId = null;
        return;
      }
      if (!stillQueued) {
        recompileTimelineId = null;
        return;
      }
      if (!recompileUnsubscribe) {
        recompileUnsubscribe = useCompileStore.subscribe(
          (state: { isGenerating: boolean }) => {
            if (state.isGenerating) return;
            recompileUnsubscribe?.();
            recompileUnsubscribe = null;
            run();
          },
        );
      }
    } catch {
      recompileTimelineId = null;
    }
  };
  run();
};

const syncRestoredCaptions = (
  previous: Timeline | null | undefined,
  next: Timeline,
) => {
  const changed = captionIdsChanged(previous, next);
  if (changed.length === 0) return;
  const ids = new Set(changed);
  rememberLocalCaptions(next, ids);
  scheduleCaptionWriteBack(next, ids);
  recompileTimeline(next.id);
};

// ── Local history persistence (survives reloads), keyed per project ──────────
const TIMELINE_HISTORY_KEY = 'timeline-history';
const timelineHistoryKey = (projectId: string | null) =>
  `${TIMELINE_HISTORY_KEY}-${projectId || 'default'}`;

const persistTimelineHistory = (projectId: string | null, history: HistoryEntry[], historyIndex: number) => {
  if (typeof window === 'undefined') return;
  try {
  const key = timelineHistoryKey(projectId);
  const compactHistory = history.map((entry) => {
    const captions = entry.captions?.length
      ? entry.captions
      : captionSnapshotsFromTimeline(entry.timeline);
    return {
      ...entry,
      captions,
      timeline: compactTimelineForStorage(timelineWithoutCaptionBodies(entry.timeline, captions)),
    };
  });
  const payload = JSON.stringify({ history: compactHistory, historyIndex });
  if (writeLocalStorage(key, payload)) return;
  // Remove the previous snapshot first. Browsers keep it allocated during setItem.
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  if (writeLocalStorage(key, payload)) return;
  const keepFrom = Math.max(0, Math.floor(compactHistory.length / 2));
  const trimmed = compactHistory.slice(keepFrom);
  const nextIndex = Math.max(-1, historyIndex - keepFrom);
  if (!writeLocalStorage(key, JSON.stringify({ history: trimmed, historyIndex: nextIndex }))) {
    try {
      localStorage.removeItem(key);
    } catch {
      // In-memory undo still works for this session.
    }
  }
  } catch {
    // In-memory undo still works for this session.
  }
};

const loadTimelineHistory = (projectId: string | null): { history: HistoryEntry[]; historyIndex: number } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(timelineHistoryKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.history)) return null;
    return {
      history: parsed.history.map((entry: HistoryEntry) => ({
        ...entry,
        timeline: applyCaptionSnapshots(entry.timeline, entry.captions),
      })),
      historyIndex: typeof parsed.historyIndex === 'number' ? parsed.historyIndex : parsed.history.length - 1,
    };
  } catch {
    return null;
  }
};

// ── History squashing (mirrors the layer override squashing) ─────────────────
// Consecutive edits with the SAME change key (e.g. editing one preset's inputs)
// collapse into a single history entry. The preset editors debounce ~800ms, so
// a tight window would miss them — instead we squash the whole run of same-field
// edits until a DIFFERENT field/action breaks the chain. A generous idle cap
// avoids merging edits separated by long pauses.
const TIMELINE_SQUASH_IDLE_MS = 30_000;
let _tlLastSquashKey: string | null = null;
let _tlLastSquashAt = 0;
/** Break the squash chain so the next edit starts a fresh history entry. */
const resetTimelineSquash = () => {
  _tlLastSquashKey = null;
  _tlLastSquashAt = 0;
};

/** Guards against infinite re-merge loops if a new concurrent publish slips in. */
let _tlMergeRetry = false;

/** Backup of the real timeline state while a temporary preview is active. */
let _tlPreviewBackup:
  | { timelineId: string; edited: Timeline | undefined; loaded: Timeline | null; isDirty: boolean }
  | null = null;

function presetsWithParent(
  presets: Timeline['presets'],
  nodeId: string,
  parentId: string,
  rootId: string,
): Timeline['presets'] {
  return (presets ?? []).map((preset) => {
    if (preset.id !== nodeId) return preset;
    const input =
      preset.presetInputData &&
      typeof preset.presetInputData === 'object' &&
      !Array.isArray(preset.presetInputData)
        ? { ...(preset.presetInputData as Record<string, unknown>) }
        : {};
    if (parentId === rootId) delete input.parentId;
    else input.parentId = parentId;
    return { ...preset, presetInputData: input };
  });
}

function resolveTimelineForEdit(timelineId: string): Timeline | undefined {
  const edited = useTimelineEditsStore.getState().editedTimelines.get(timelineId);
  if (edited) return edited;
  const { useProjectStore } = require('./project-store');
  const projectState = useProjectStore.getState();
  if (projectState.loadedTimeline?.id === timelineId) return projectState.loadedTimeline;
  return projectState.timelines.find((timeline: Timeline) => timeline.id === timelineId);
}

export const useTimelineEditsStore = create<TimelineEditsState>((set, get) => {
  // Initialize from storage if available
  const stored = loadFromStorage(null);

  const initialState: TimelineEditsState = {
    editedTimelines: stored?.editedTimelines || new Map(),
    isDirty: stored?.isDirty ?? false,
    cloudUpdatedAtByTimelineId: stored?.cloudUpdatedAtByTimelineId || new Map(),
    localEditUpdatedAtByTimelineId: stored?.localEditUpdatedAtByTimelineId || new Map(),
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,
    currentProjectId: stored?.currentProjectId || null,

    // Multi-user publish parity
    clientId: null,
    currentTimelineId: null,
    isPublishing: false,
    dbHistory: [],
    isLoadingDbHistory: false,
    dbHistoryHasMore: false,
    dbHistoryOldestTs: null,
    publishedBaselineById: new Map(),
    loadBaselineById: new Map(),
    timelineVersionById: new Map(),
    isTimelinePreviewActive: false,
    pendingTimelineMerge: null,

    updateTimeline: (timelineId, updates, changeKey) => {
      const state = get();
      const currentTimeline = state.editedTimelines.get(timelineId);
      let previousTimeline: Timeline | null = currentTimeline ?? null;

      if (!currentTimeline) {
        // If timeline not in edits, we need to get it from project store
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        const originalTimeline = projectState.loadedTimeline?.id === timelineId
          ? projectState.loadedTimeline
          : projectState.timelines.find((t: Timeline) => t.id === timelineId);

        if (!originalTimeline) {
          console.warn(`Timeline ${timelineId} not found`);
          return;
        }

        previousTimeline = originalTimeline;
        // Initialize with original timeline
        const newTimeline = { ...originalTimeline, ...updates };
        state.editedTimelines.set(timelineId, newTimeline);
      } else {
        // Update existing edited timeline
        const newTimeline = { ...currentTimeline, ...updates };
        state.editedTimelines.set(timelineId, newTimeline);
      }

      // Add to history (squashing consecutive same-key edits into the last entry)
      const newTimeline = state.editedTimelines.get(timelineId)!;
      const changedCaptionIds = captionIdsChanged(previousTimeline, newTimeline);
      if (changedCaptionIds.length > 0) {
        const captionIds = new Set(changedCaptionIds);
        rememberLocalCaptions(newTimeline, captionIds);
        scheduleCaptionWriteBack(newTimeline, captionIds);
      }
      const now = Date.now();
      const canSquash =
        changeKey != null &&
        _tlLastSquashKey === changeKey &&
        now - _tlLastSquashAt < TIMELINE_SQUASH_IDLE_MS;

      set(state => {
        const atTip = state.historyIndex === state.history.length - 1;
        const last = state.history[state.historyIndex];
        let newHistory: HistoryEntry[];
        let newIndex: number;

        const squashing =
          canSquash &&
          atTip &&
          last &&
          last.timelineId === timelineId &&
          // Never squash into an already-published entry — that would re-dirty it.
          !last.published;
        const entry = createHistoryEntry(
          newTimeline,
          squashing && last ? last.timeline : previousTimeline,
          squashing && last ? last.captionEditIds : undefined,
        );
        if (squashing) {
          // Replace the last entry's snapshot in-place — one entry for the gesture.
          newHistory = [...state.history];
          newHistory[state.historyIndex] = entry;
          newIndex = state.historyIndex;
        } else {
          newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(entry);
          if (newHistory.length > state.maxHistorySize) {
            newHistory.shift();
          }
          newIndex = newHistory.length - 1;
        }
        
        const newCloud = new Map(state.cloudUpdatedAtByTimelineId);
        if (!newCloud.has(timelineId)) {
          const { useProjectStore } = require('./project-store');
          const originalTimeline = useProjectStore
            .getState()
            .timelines.find((timeline: Timeline) => timeline.id === timelineId);
          if (originalTimeline?.updatedAt) {
            newCloud.set(timelineId, originalTimeline.updatedAt);
          }
        }

        const newState = {
          editedTimelines: new Map(state.editedTimelines),
          isDirty: true,
          cloudUpdatedAtByTimelineId: newCloud,
          localEditUpdatedAtByTimelineId: bumpLocalTimelineEdit(
            timelineId,
            state.localEditUpdatedAtByTimelineId
          ),
          history: newHistory,
          historyIndex: newIndex,
        };
        saveToStorage(state.currentProjectId, newState);
        persistTimelineHistory(state.currentProjectId, newHistory, newIndex);
        return newState;
      });

      _tlLastSquashKey = changeKey ?? null;
      _tlLastSquashAt = now;

      // Sync with project store
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(timelineId, updates);
    },

    updatePresetInputData: (timelineId, presetId, inputData) => {
      const state = get();
      const timeline = state.editedTimelines.get(timelineId);
      
      if (!timeline) {
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        const originalTimeline = projectState.loadedTimeline?.id === timelineId 
          ? projectState.loadedTimeline 
          : projectState.timelines.find((t: Timeline) => t.id === timelineId);
        
        if (!originalTimeline) return;
        
        const updatedPresets = originalTimeline.presets?.map((p: any) =>
          p.id === presetId ? { ...p, presetInputData: inputData } : p
        ) || [];

        get().updateTimeline(timelineId, { presets: updatedPresets }, `input:${presetId}`);
        return;
      }

      const updatedPresets = timeline.presets?.map(p =>
        p.id === presetId ? { ...p, presetInputData: inputData } : p
      ) || [];

      get().updateTimeline(timelineId, { presets: updatedPresets }, `input:${presetId}`);
    },

    updatePresetDisabled: (timelineId, presetId, disabled) => {
      const timeline = resolveTimelineForEdit(timelineId);
      if (!timeline) return;
      const ids = new Set(collectSubtreeIds(loadInstanceTree(timeline), presetId));
      const presets = (timeline.presets ?? []).map((preset) =>
        ids.has(preset.id) ? { ...preset, disabled } : preset,
      );
      const nodes = timeline.nodes
        ? mapNodeDisabled(timeline.nodes, ids, disabled)
        : undefined;
      get().updateTimeline(timelineId, nodes ? { presets, nodes } : { presets });
    },

    replacePresetDefinition: (timelineId, presetId, preset, inputData) => {
      const timeline = resolveTimelineForEdit(timelineId);
      if (!timeline?.presets) return;
      const presets = timeline.presets.map((item) =>
        item.id === presetId
          ? {
              ...item,
              presetId: preset.metadata.id,
              presetType: preset.metadata.presetType,
              presetInfo: preset,
              presetInputData: inputData,
            }
          : item,
      );
      get().updateTimeline(timelineId, { presets }, `replace:${presetId}`);
    },

    updateNodeTiming: (timelineId, nodeId, timing) => {
      const timeline = resolveTimelineForEdit(timelineId);
      if (!timeline) return;
      const nodes = mapNodeTiming(loadInstanceTree(timeline), nodeId, timing);
      const presets = timeline.presets?.map((preset) =>
        preset.id === nodeId
          ? {
              ...preset,
              presetInputData: applyTimingToPresetInput(preset.presetInputData, timing),
            }
          : preset,
      );
      get().updateTimeline(timelineId, { nodes, presets }, `timing:${nodeId}`);
    },

    moveInstanceNode: (timelineId, nodeId, parentId, index = Number.MAX_SAFE_INTEGER) => {
      return get().moveInstanceNodes(timelineId, [nodeId], parentId, index);
    },

    moveInstanceNodes: (timelineId, nodeIds, parentId, index = Number.MAX_SAFE_INTEGER) => {
      const timeline = resolveTimelineForEdit(timelineId);
      if (!timeline) return false;
      const current = loadInstanceTree(timeline);
      const moving = outermostIds(current, nodeIds).filter((id) => {
        if (id === current.id || id === parentId) return false;
        const node = findNode(current, id);
        return Boolean(node && !findNode(node, parentId));
      });
      if (moving.length === 0) return false;
      const nodes = moveNodes(current, moving, parentId, index);
      if (nodes === current) return false;
      const parent = findNode(current, parentId);
      let presets = timeline.presets;
      for (const nodeId of moving) {
        const previousParent = parentOfNode(current, nodeId);
        presets = presetsWithParent(presets, nodeId, parentId, current.id);
        if (previousParent?.id !== parentId && parent?.role === "scene") {
          presets = (presets ?? []).map((preset) => {
            if (preset.id !== nodeId) return preset;
            return {
              ...preset,
              presetInputData: inheritParentLock(preset.presetInputData, parent.input),
            };
          });
        }
      }
      // Sibling order inside a group is the flat list order when `nodes` is absent.
      presets = orderPresetsLikeTree(presets, nodes) ?? presets;
      get().updateTimeline(
        timelineId,
        { nodes, presets },
        `reparent:${moving.join(",")}`,
      );
      return true;
    },

    reparentInstanceNode: (timelineId, nodeId, parentId) => {
      get().moveInstanceNode(timelineId, nodeId, parentId);
    },

    groupPresets: (timelineId, ids, seed) => {
      const timeline = resolveTimelineForEdit(timelineId);
      if (!timeline) return null;
      const sceneId = `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = groupSelectedPresets(timeline, ids, seed, sceneId);
      if (!result) return null;
      get().updateTimeline(timelineId, { presets: result.presets, nodes: result.nodes });
      return result.sceneId;
    },

    ungroupPresets: (timelineId, ids) => {
      const timeline = resolveTimelineForEdit(timelineId);
      if (!timeline) return null;
      const result = ungroupSelectedPresets(timeline, ids);
      if (!result) return null;
      const removed = new Set(result.removedIds);
      const actions = (timeline.actions || []).filter(
        (action) =>
          !(action.target?.type === 'preset' && removed.has(action.target.presetInstanceId)),
      );
      get().updateTimeline(timelineId, {
        presets: result.presets,
        nodes: result.nodes,
        ...(actions.length !== (timeline.actions || []).length ? { actions } : {}),
      });
      return result.childIds;
    },

    updateTimelineConfig: (timelineId, config) => {
      get().updateTimeline(timelineId, { configuration: config }, 'config');
    },

    updateTimelineDefaultData: (timelineId, defaultData) => {
      get().updateTimeline(timelineId, { defaultData }, 'defaultData');
    },

    addPresetToTimeline: (timelineId, preset, parentId) => {
      const source = resolveTimelineForEdit(timelineId);
      const metadata = (preset as PresetType | DatabasePreset).metadata;
      if (!source) {
        console.warn(`Timeline ${timelineId} not found`);
        return null;
      }

      const existingPresets = source.presets || [];
      const defaults = { ...(metadata.defaultInputParams || {}) };
      const seeded =
        typeof defaults.trackName === "string" && defaults.trackName.trim()
          ? defaults.trackName.trim()
          : defaultTrackName(metadata.title, metadata.id);
      const trackName = uniqueTrackName(existingPresets, seeded);
      const parentNode = parentId ? findNode(loadInstanceTree(source), parentId) : undefined;
      const seededInput = withTrackName(defaults, trackName);
      const presetInputData =
        parentNode?.role === "scene"
          ? inheritParentLock(seededInput, parentNode.input)
          : seededInput;
      const newPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        presetId: metadata.id,
        presetType: metadata.presetType,
        presetInfo: preset as PresetType | DatabasePreset,
        presetInputData,
        disabled: false,
      };
      const presets = [...existingPresets, newPreset];
      if (!parentId) {
        get().updateTimeline(timelineId, { presets });
        return newPreset.id;
      }

      const tree = loadInstanceTree({ ...source, presets });
      const nodes = moveNode(tree, newPreset.id, parentId, Number.MAX_SAFE_INTEGER);
      if (nodes === tree) {
        get().updateTimeline(timelineId, { presets });
        return newPreset.id;
      }
      get().updateTimeline(timelineId, {
        presets: presetsWithParent(presets, newPreset.id, parentId, tree.id),
        nodes,
      });
      return newPreset.id;
    },

    removePreset: (timelineId: string, presetId: string) => {
      const timeline = resolveTimelineForEdit(timelineId);
      if (!timeline?.presets) return;
      const tree = loadInstanceTree(timeline);
      const baseId = timeline.presets[0]?.id;
      const drop = new Set(
        idsRemovedWith(tree, [presetId]).filter((id) => id !== baseId),
      );
      if (drop.size === 0) return;
      get().updateTimeline(timelineId, {
        presets: timeline.presets.filter((preset) => !drop.has(preset.id)),
        actions: (timeline.actions || []).filter(
          (action) =>
            !(
              action.target?.type === 'preset' &&
              drop.has(action.target.presetInstanceId)
            ),
        ),
        ...(timeline.nodes ? { nodes: pruneNodes(tree, drop) } : {}),
      });
    },

    placePresetCopy: (timelineId, preset, anchorId, placement = 'beside', actions) => {
      const timeline = resolveTimelineForEdit(timelineId);
      if (!timeline || !preset?.id) return null;
      const tree = loadInstanceTree(timeline);
      const { parentId, index } = presetAnchorPlacement(tree, anchorId, placement);
      const parent = findNode(tree, parentId) ?? tree;
      const attached = presetsWithParent([preset], preset.id, parentId, tree.id)?.[0] ?? preset;
      const input = inheritParentLock(attached.presetInputData, parent.input);
      const renderId = sceneRenderId(parent);
      if (renderId) input.attachedToId = renderId;
      else delete input.attachedToId;
      const placed = { ...attached, presetInputData: input };
      const presets = [...(timeline.presets ?? [])];
      const anchorIndex = anchorId ? presets.findIndex((item) => item.id === anchorId) : -1;
      if (anchorIndex >= 0) presets.splice(anchorIndex + 1, 0, placed);
      else presets.push(placed);
      const nodes = insertPresetNode(tree, placed, presets, parentId, index);
      const ordered = orderPresetsLikeTree(presets, nodes) ?? presets;
      get().updateTimeline(timelineId, {
        presets: ordered,
        nodes,
        ...(actions && actions.length > 0
          ? { actions: [...(timeline.actions ?? []), ...actions] }
          : {}),
      });
      return placed.id;
    },

    duplicatePreset: (timelineId, presetId) => {
      const timeline = resolveTimelineForEdit(timelineId);
      if (!timeline?.presets) return null;
      const sourcePreset = timeline.presets.find((preset) => preset.id === presetId);
      if (!sourcePreset || sourcePreset.presetId === 'base-scene') return null;

      const trackName = copyTrackName(
        timeline.presets,
        presetTrackName(sourcePreset, sourcePreset.presetId),
      );
      const { label: _legacyLabel, ...sourceWithoutLabel } = sourcePreset;
      const duplicatedPreset = {
        ...sourceWithoutLabel,
        id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        presetInputData: withTrackName(sourcePreset.presetInputData, trackName),
      };
      const duplicatedActions = (timeline.actions || [])
        .filter(
          (action) =>
            action.target?.type === 'preset' &&
            action.target.presetInstanceId === presetId,
        )
        .map((action, index) => ({
          ...JSON.parse(JSON.stringify(action)),
          id: `action-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
          target: { type: 'preset' as const, presetInstanceId: duplicatedPreset.id },
        }));

      return get().placePresetCopy(
        timelineId,
        duplicatedPreset,
        presetId,
        'beside',
        duplicatedActions,
      );
    },

    reorderPresets: (timelineId: string, oldIndex: number, newIndex: number) => {
      const state = get();
      const timeline = state.editedTimelines.get(timelineId);
      
      if (!timeline) {
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        const originalTimeline = projectState.loadedTimeline?.id === timelineId 
          ? projectState.loadedTimeline 
          : projectState.timelines.find((t: Timeline) => t.id === timelineId);
        
        if (!originalTimeline || !originalTimeline.presets) return;
        
        const presets = [...originalTimeline.presets];
        const [movedPreset] = presets.splice(oldIndex, 1);
        presets.splice(newIndex, 0, movedPreset);
        
        get().updateTimeline(timelineId, { presets });
        return;
      }
      
      if (!timeline.presets) return;
      
      const presets = [...timeline.presets];
      const [movedPreset] = presets.splice(oldIndex, 1);
      presets.splice(newIndex, 0, movedPreset);
      
      get().updateTimeline(timelineId, { presets });
    },

    addActionToTimeline: (timelineId, action) => {
      const resolveTimeline = (): Timeline | null => {
        const edited = get().editedTimelines.get(timelineId);
        if (edited) return edited;
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        return (
          (projectState.loadedTimeline?.id === timelineId
            ? projectState.loadedTimeline
            : projectState.timelines.find((t: Timeline) => t.id === timelineId)) || null
        );
      };

      const source = resolveTimeline();
      if (!source) return null;

      const created = {
        id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        actionId: action.actionId,
        label: action.label,
        target: action.target,
        inputData: action.inputData || {},
        // Manual by default — compile never runs actions; UI Run or executeAndApply does.
        runPolicy: action.runPolicy ?? ('manual' as const),
        outputs: [],
        status: 'idle' as const,
      };

      get().updateTimeline(timelineId, {
        actions: [...(source.actions || []), created],
      });

      return created;
    },

    updateAction: (timelineId, actionId, updates, options) => {
      const resolveTimeline = (): Timeline | null => {
        const edited = get().editedTimelines.get(timelineId);
        if (edited) return edited;
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        return (
          (projectState.loadedTimeline?.id === timelineId
            ? projectState.loadedTimeline
            : projectState.timelines.find((t: Timeline) => t.id === timelineId)) || null
        );
      };

      const source = resolveTimeline();
      if (!source) return;

      const actions = (source.actions || []).map((a) =>
        a.id === actionId ? { ...a, ...updates, id: a.id, actionId: a.actionId } : a,
      );

      // Status-only / ephemeral patches: update in-memory edits without deep-cloning
      // the full timeline into undo history or writing localStorage. Also skip syncing
      // to the project store so the Remotion player host does not re-render.
      if (options?.skipHistory) {
        const nextTimeline = { ...source, actions };
        set((state) => {
          const editedTimelines = new Map(state.editedTimelines);
          editedTimelines.set(timelineId, nextTimeline);
          return { editedTimelines };
        });
        return;
      }

      get().updateTimeline(timelineId, { actions }, `action:${actionId}`);
    },

    removeAction: (timelineId, actionId) => {
      const resolveTimeline = (): Timeline | null => {
        const edited = get().editedTimelines.get(timelineId);
        if (edited) return edited;
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        return (
          (projectState.loadedTimeline?.id === timelineId
            ? projectState.loadedTimeline
            : projectState.timelines.find((t: Timeline) => t.id === timelineId)) || null
        );
      };

      const source = resolveTimeline();
      if (!source) return;

      get().updateTimeline(timelineId, {
        actions: (source.actions || []).filter((a) => a.id !== actionId),
      });
    },

    undo: () => {
      const state = get();
      if (!state.canUndo()) return false;
      resetTimelineSquash();

      const newIndex = state.historyIndex - 1;

      if (newIndex === -1) {
        // Undo past the first entry — restore the load-time baseline for this timeline.
        const firstEntry = state.history[state.historyIndex];
        if (!firstEntry) return false;
        const baseline = state.loadBaselineById.get(firstEntry.timelineId);
        if (!baseline) return false;
        const previous = state.editedTimelines.get(firstEntry.timelineId);

        set((s) => {
          const ne = new Map(s.editedTimelines);
          ne.set(firstEntry.timelineId, baseline);
          const ns = {
            historyIndex: -1 as const,
            editedTimelines: ne,
            isDirty: false,
          };
          saveToStorage(s.currentProjectId, ns);
          persistTimelineHistory(s.currentProjectId, s.history, -1);
          return ns;
        });

        const { useProjectStore } = require('./project-store');
        useProjectStore.getState().updateTimeline(firstEntry.timelineId, baseline);
        syncRestoredCaptions(previous, baseline);
        return true;
      }

      const historyEntry = state.history[newIndex];
      if (!historyEntry) return false;
      const restored = applyCaptionSnapshots(historyEntry.timeline, historyEntry.captions);
      const previous = state.editedTimelines.get(historyEntry.timelineId);

      set(state => {
        const newState = {
          historyIndex: newIndex,
          editedTimelines: new Map(state.editedTimelines).set(
            historyEntry.timelineId,
            restored
          ),
          isDirty: hasUnpublishedAtCursor(state.history, newIndex),
          cloudUpdatedAtByTimelineId: new Map(state.cloudUpdatedAtByTimelineId),
          localEditUpdatedAtByTimelineId: bumpLocalTimelineEdit(
            historyEntry.timelineId,
            state.localEditUpdatedAtByTimelineId
          ),
        };

        // Persist to storage
        saveToStorage(state.currentProjectId, newState);
        persistTimelineHistory(state.currentProjectId, state.history, newIndex);

        return newState;
      });

      // Sync with project store
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(
        historyEntry.timelineId,
        restored
      );
      syncRestoredCaptions(previous, restored);

      return true;
    },

    redo: () => {
      const state = get();
      if (!state.canRedo()) return false;
      resetTimelineSquash();

      const newIndex = state.historyIndex + 1;
      const historyEntry = state.history[newIndex];

      if (!historyEntry) return false;
      const restored = applyCaptionSnapshots(historyEntry.timeline, historyEntry.captions);
      const previous = state.editedTimelines.get(historyEntry.timelineId);

      set(state => {
        const newState = {
          historyIndex: newIndex,
          editedTimelines: new Map(state.editedTimelines).set(
            historyEntry.timelineId,
            restored
          ),
          isDirty: hasUnpublishedAtCursor(state.history, newIndex),
          cloudUpdatedAtByTimelineId: new Map(state.cloudUpdatedAtByTimelineId),
          localEditUpdatedAtByTimelineId: bumpLocalTimelineEdit(
            historyEntry.timelineId,
            state.localEditUpdatedAtByTimelineId
          ),
        };
        
        // Persist to storage
        saveToStorage(state.currentProjectId, newState);
        persistTimelineHistory(state.currentProjectId, state.history, newIndex);
        
        return newState;
      });
      
      // Sync with project store
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(
        historyEntry.timelineId,
        restored
      );
      syncRestoredCaptions(previous, restored);
      
      return true;
    },

    canUndo: () => {
      const state = get();
      return state.historyIndex >= 0;
    },

    canRedo: () => {
      const state = get();
      return state.historyIndex < state.history.length - 1;
    },

    saveToDatabase: async (timelineId) => {
      const state = get();
      let editedTimeline = state.editedTimelines.get(timelineId);

      if (!editedTimeline) {
        editedTimeline = getProjectTimelines().find(
          (timeline) => timeline.id === timelineId
        );
      }

      if (!editedTimeline) {
        console.warn(`No edited timeline found for ${timelineId}`);
        return;
      }
      
      try {
        // The API expects the timeline ID in the body, not the URL
        // Prepare the update payload - only include fields that should be updated
        const updatePayload = {
          id: timelineId,
          displayName: editedTimeline.displayName,
          description: editedTimeline.description,
          configuration: editedTimeline.configuration,
          defaultData: editedTimeline.defaultData,
          presets: editedTimeline.presets,
          nodes: editedTimeline.nodes,
          actions: editedTimeline.actions ?? [],
        };
        
        const response = await fetch('/api/project/timeline', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Failed to save timeline (${response.status})`;
          console.error('Save timeline error:', errorMessage, errorData);
          throw new Error(errorMessage);
        }
        
        const savedTimeline = await response.json();
        console.log('✅ Timeline saved successfully:', savedTimeline);

        // The canonical saved version to keep in memory.
        // Prefer the API response (it may include server-set fields like updatedAt),
        // fall back to what we sent if the API returns something unexpected.
        const canonicalTimeline: Timeline =
          savedTimeline && typeof savedTimeline === 'object' && savedTimeline.id
            ? savedTimeline
            : editedTimeline;

        // Keep the entry in editedTimelines (updated with saved data).
        // Deleting it would cause components to fall back to the stale `timeline` prop
        // that was captured at selection time, making the UI appear to revert.
        set(state => {
          const newEdited = new Map(state.editedTimelines);
          newEdited.set(timelineId, canonicalTimeline);
          const newCloud = new Map(state.cloudUpdatedAtByTimelineId);
          const newLocal = new Map(state.localEditUpdatedAtByTimelineId);
          const cloudAt = canonicalTimeline.updatedAt ?? new Date().toISOString();
          newCloud.set(timelineId, cloudAt);
          newLocal.delete(timelineId);
          const newState = {
            editedTimelines: newEdited,
            cloudUpdatedAtByTimelineId: newCloud,
            localEditUpdatedAtByTimelineId: newLocal,
          };

          // Persist to storage
          saveToStorage(state.currentProjectId, newState);

          return newState;
        });

        // Update project store so other parts of the UI (left sidebar etc.) see the latest.
        const { useProjectStore } = require('./project-store');
        useProjectStore.getState().updateTimeline(timelineId, canonicalTimeline);
      } catch (error) {
        console.error('Error saving timeline:', error);
        throw error;
      }
    },

    saveAllTimelinesToDatabase: async () => {
      const unsyncedIds = get().getUnsyncedTimelineIds();
      const savedNames: string[] = [];

      for (const timelineId of unsyncedIds) {
        const editedTimeline = get().editedTimelines.get(timelineId);
        const cloudTimeline = getProjectTimelines().find((t) => t.id === timelineId);
        const timelineName =
          editedTimeline?.displayName?.trim() ||
          cloudTimeline?.displayName?.trim() ||
          timelineId;
        await get().saveToDatabase(timelineId);
        savedNames.push(timelineName);
      }

      return savedNames;
    },

    loadFromPersistence: (projectId) => {
      clearLocalCaptionOwnership();
      const stored = loadFromStorage(projectId);
      // Restore the local undo/redo history for this project (survives reloads).
      const storedHistory = loadTimelineHistory(projectId);
      const restoredHistory = storedHistory?.history ?? [];
      const restoredIndex =
        typeof storedHistory?.historyIndex === 'number' ? storedHistory.historyIndex : -1;
      // Recover dirty state from history when storage was wiped by a partial save
      // (edits recorded history but never flipped isDirty).
      const dirtyFromHistory = hasUnpublishedAtCursor(restoredHistory, restoredIndex);
      const applyStored = (loaded: StoredEdits) => {
        const editedTimelines = loaded.editedTimelines || new Map();
        set({
          editedTimelines,
          cloudUpdatedAtByTimelineId: loaded.cloudUpdatedAtByTimelineId || new Map(),
          localEditUpdatedAtByTimelineId: loaded.localEditUpdatedAtByTimelineId || new Map(),
          currentProjectId: projectId,
          // Prefer explicit dirty flag; fall back to unpublished history recovery.
          // Do NOT recalculate from editedTimelines.size — the map now keeps entries
          // even for clean (already-saved) timelines to avoid UI state resets.
          isDirty: (loaded.isDirty ?? false) || dirtyFromHistory,
          ...(storedHistory
            ? { history: restoredHistory, historyIndex: restoredIndex }
            : {}),
        });

        if (editedTimelines.size > 0) {
          const { useProjectStore } = require('./project-store');
          const projectStore = useProjectStore.getState();
          editedTimelines.forEach((editedTimeline) => {
            projectStore.updateTimeline(editedTimeline.id, editedTimeline);
          });
        }
        seedCaptionOwnershipFromHistory(restoredHistory, restoredIndex, editedTimelines);
      };

      if (stored && !stored.deferred) {
        applyStored(stored);
        return;
      }

      if (stored?.deferred) {
        set({
          editedTimelines: new Map(),
          currentProjectId: projectId,
          isDirty: true,
          ...(storedHistory
            ? { history: restoredHistory, historyIndex: restoredIndex }
            : { history: [], historyIndex: -1 }),
          cloudUpdatedAtByTimelineId: new Map(),
          localEditUpdatedAtByTimelineId: new Map(),
        });
      } else {
        set({
          currentProjectId: projectId,
          isDirty: dirtyFromHistory,
          ...(storedHistory
            ? { history: restoredHistory, historyIndex: restoredIndex }
            : {}),
          cloudUpdatedAtByTimelineId: new Map(),
          localEditUpdatedAtByTimelineId: new Map(),
        });
      }

      seedCaptionOwnershipFromHistory(restoredHistory, restoredIndex, new Map());

      // localStorage was over quota, so the snapshot is in IndexedDB (or the
      // pointer write failed and only IndexedDB has it).
      if (typeof indexedDB === 'undefined') return;
      const generation = _editsWriteGeneration;
      void idbGet(editsStorageKey(projectId))
        .then((raw) => {
          if (generation !== _editsWriteGeneration) return;
          const loaded = normalizeStoredEdits(raw);
          if (!loaded || loaded.deferred || !loaded.editedTimelines?.size) return;
          applyStored(loaded);
        })
        .catch((error) => {
          console.error('Error loading timeline edits from IndexedDB:', error);
        });
    },

    registerCloudTimelines: (timelines) => {
      set((state) => {
        const newCloud = new Map(state.cloudUpdatedAtByTimelineId);
        timelines.forEach((timeline) => {
          if (!timeline.updatedAt) return;
          if (!state.localEditUpdatedAtByTimelineId.has(timeline.id)) {
            newCloud.set(timeline.id, timeline.updatedAt);
          } else if (!newCloud.has(timeline.id)) {
            newCloud.set(timeline.id, timeline.updatedAt);
          }
        });

        const newState = {
          cloudUpdatedAtByTimelineId: newCloud,
        };
        saveToStorage(state.currentProjectId, {
          ...state,
          ...newState,
        });
        return newState;
      });
    },

    clearEdits: (projectId) => {
      if (projectId) {
        // Clear edits for specific project
        set(state => {
          const newEdited = new Map(state.editedTimelines);
          // Filter out timelines from this project
          const { useProjectStore } = require('./project-store');
          const projectState = useProjectStore.getState();
          projectState.timelines.forEach((timeline: Timeline) => {
            if (timeline.projectId === projectId) {
              newEdited.delete(timeline.id);
            }
          });
          const newState = {
            editedTimelines: newEdited,
            cloudUpdatedAtByTimelineId: (() => {
              const next = new Map(state.cloudUpdatedAtByTimelineId);
              projectState.timelines.forEach((timeline: Timeline) => {
                if (timeline.projectId === projectId) {
                  next.delete(timeline.id);
                }
              });
              return next;
            })(),
            localEditUpdatedAtByTimelineId: (() => {
              const next = new Map(state.localEditUpdatedAtByTimelineId);
              projectState.timelines.forEach((timeline: Timeline) => {
                if (timeline.projectId === projectId) {
                  next.delete(timeline.id);
                }
              });
              return next;
            })(),
          history: [],
          historyIndex: -1,
        };
          clearLocalCaptionOwnership();

          // Persist to storage
          saveToStorage(projectId, newState);

          return newState;
        });
      } else {
        // Clear all edits
        clearLocalCaptionOwnership();
        set({
          editedTimelines: new Map(),
          cloudUpdatedAtByTimelineId: new Map(),
          localEditUpdatedAtByTimelineId: new Map(),
          history: [],
          historyIndex: -1,
        });
      }
    },

    setCurrentProjectId: (projectId) => {
      const state = get();
      set({ currentProjectId: projectId });
      // Load persistence for this project
      state.loadFromPersistence(projectId || '');
      
      // Sync edited timelines with project store after loading
      const editedTimelines = state.editedTimelines;
      if (editedTimelines.size > 0) {
        const { useProjectStore } = require('./project-store');
        const projectStore = useProjectStore.getState();
        
        // Update each edited timeline in the project store
        editedTimelines.forEach((editedTimeline) => {
          projectStore.updateTimeline(editedTimeline.id, editedTimeline);
        });
      }
    },

    getEditedTimeline: (timelineId) => {
      const state = get();
      return state.editedTimelines.get(timelineId) || null;
    },

    // ── Multi-user publish parity ────────────────────────────────────────────

    setClientId: (id) => set({ clientId: id }),

    setTimelineContext: (timelineId) => set({ currentTimelineId: timelineId }),

    setTimelineVersion: (timelineId, version) =>
      set((s) => {
        const next = new Map(s.timelineVersionById);
        next.set(timelineId, version);
        return { timelineVersionById: next };
      }),

    setTimelinePublishedBaseline: (timelineId, timeline) =>
      set((s) => {
        const clone = JSON.parse(JSON.stringify(timeline));
        const published = new Map(s.publishedBaselineById);
        published.set(timelineId, clone);
        // Set the stable load baseline only once per timeline (first load wins
        // until the timeline is reloaded / project switched).
        const load = new Map(s.loadBaselineById);
        if (!load.has(timelineId)) load.set(timelineId, clone);
        return { publishedBaselineById: published, loadBaselineById: load };
      }),

    hasUnpublishedChanges: () => {
      const s = get();
      return s.isDirty || hasUnpublishedAtCursor(s.history, s.historyIndex);
    },

    loadTimelineDbHistory: async () => {
      const s = get();
      let projectId = s.currentProjectId;
      let timelineId = s.currentTimelineId;
      if (!projectId || !timelineId) {
        const { useProjectStore } = require('./project-store');
        const ps = useProjectStore.getState();
        projectId = projectId || ps.currentProjectId;
        timelineId = timelineId || ps.loadedTimeline?.id || null;
      }
      if (!projectId || !timelineId) return;
      set({ isLoadingDbHistory: true });
      try {
        const res = await fetch(
          `/api/project/timeline/edit-history?projectId=${encodeURIComponent(projectId)}&timelineId=${encodeURIComponent(timelineId)}&limit=20`,
          { headers: s.clientId ? { 'x-client-id': s.clientId } : undefined }
        );
        if (res.ok) {
          const data: DbTimelineHistoryEntry[] = await res.json();
          const entries = Array.isArray(data) ? data : [];
          set({
            dbHistory: entries,
            dbHistoryHasMore: entries.length === 20,
            dbHistoryOldestTs: entries.length > 0 ? (entries[entries.length - 1]!.timestamp ?? null) : null,
          });
        }
      } catch {
        // non-critical
      } finally {
        set({ isLoadingDbHistory: false });
      }
    },

    loadMoreTimelineDbHistory: async () => {
      const s = get();
      if (s.isLoadingDbHistory || s.dbHistoryOldestTs === null) return;
      let projectId = s.currentProjectId;
      let timelineId = s.currentTimelineId;
      if (!projectId || !timelineId) {
        const { useProjectStore } = require('./project-store');
        const ps = useProjectStore.getState();
        projectId = projectId || ps.currentProjectId;
        timelineId = timelineId || ps.loadedTimeline?.id || null;
      }
      if (!projectId || !timelineId) return;
      set({ isLoadingDbHistory: true });
      try {
        const res = await fetch(
          `/api/project/timeline/edit-history?projectId=${encodeURIComponent(projectId)}&timelineId=${encodeURIComponent(timelineId)}&limit=20&before=${s.dbHistoryOldestTs}`,
          { headers: s.clientId ? { 'x-client-id': s.clientId } : undefined }
        );
        if (res.ok) {
          const data: DbTimelineHistoryEntry[] = await res.json();
          const entries = Array.isArray(data) ? data : [];
          set((prev) => ({
            dbHistory: [...prev.dbHistory, ...entries],
            dbHistoryHasMore: entries.length === 20,
            dbHistoryOldestTs: entries.length > 0 ? (entries[entries.length - 1]!.timestamp ?? null) : null,
          }));
        }
      } catch {
        // non-critical
      } finally {
        set({ isLoadingDbHistory: false });
      }
    },

    publishTimeline: async (timelineId) => {
      const state = get();
      const hasLocalUnpublished =
        state.isDirty ||
        hasUnpublishedForTimeline(state.history, state.historyIndex, timelineId) ||
        hasUnpublishedAtCursor(state.history, state.historyIndex);
      if (!hasLocalUnpublished) {
        return { ok: false, reason: 'nochange' };
      }

      const { useProjectStore } = require('./project-store');
      const projectStore = useProjectStore.getState();
      const timeline: Timeline | undefined =
        state.editedTimelines.get(timelineId) ??
        (projectStore.loadedTimeline?.id === timelineId
          ? projectStore.loadedTimeline
          : projectStore.timelines.find((t: Timeline) => t.id === timelineId));

      if (!timeline) {
        return { ok: false, reason: 'error', message: 'Timeline not found' };
      }

      // Use the SYNCED server version (from load / last publish) — never the
      // version baked into the (possibly stale / undone) edited timeline. This
      // is what prevents false conflicts from local edit/undo cycles.
      const loadedVersion =
        projectStore.loadedTimeline?.id === timelineId
          ? projectStore.loadedTimeline.version
          : undefined;
      const version =
        state.timelineVersionById.get(timelineId) ?? loadedVersion ?? timeline.version ?? 0;
      // Break any in-flight squash chain before the network round-trip so a
      // late form debounce cannot rewrite the published tip as unpublished.
      resetTimelineSquash();
      set({ isPublishing: true });
      try {
        // Sibling order, especially inside a group, lives on the instance tree.
        // Publish that tree, and the flat list in the same order, so the reload
        // does not fall back to an older arrangement.
        const visible = loadInstanceTree(timeline);
        const res = await fetch('/api/project/timeline', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(state.clientId ? { 'x-client-id': state.clientId } : {}),
          },
          body: JSON.stringify({
            id: timelineId,
            displayName: timeline.displayName,
            description: timeline.description,
            configuration: timeline.configuration,
            defaultData: timeline.defaultData,
            presets: orderPresetsLikeTree(timeline.presets, visible) ?? timeline.presets,
            nodes: visible,
            actions: timeline.actions ?? [],
            version,
            clientId: state.clientId ?? undefined,
          }),
        });

        if (res.status === 409) {
          // Concurrent publish — instead of forcing a destructive revert, do a
          // 3-way merge (auto-merge non-conflicting presets, ask the user only
          // for true conflicts).
          if (_tlMergeRetry) {
            const err = await res.json().catch(() => ({}));
            return { ok: false, reason: 'conflict', lastClientId: err.lastClientId };
          }
          let remote: Timeline | null = null;
          try {
            const rr = await fetch(
              `/api/project/timeline?id=${encodeURIComponent(timelineId)}`,
              { headers: state.clientId ? { 'x-client-id': state.clientId } : undefined }
            );
            if (rr.ok) remote = await rr.json();
          } catch {
            // fall through
          }
          if (!remote || !remote.id) {
            const err = await res.json().catch(() => ({}));
            return { ok: false, reason: 'conflict', lastClientId: err.lastClientId };
          }
          const mergeBase =
            state.publishedBaselineById.get(timelineId) ??
            state.loadBaselineById.get(timelineId) ??
            null;
          const mr = mergeTimelines(mergeBase, timeline, remote);
          const remoteVersion = typeof remote.version === 'number' ? remote.version : 0;

          if (mr.conflicts.length > 0) {
            // Needs manual resolution → open the dialog.
            set({
              pendingTimelineMerge: {
                timelineId,
                conflicts: mr.conflicts,
                autoMerged: mr.autoMerged,
                remoteVersion,
                build: mr.build,
              },
            });
            return { ok: false, reason: 'merge', conflicts: mr.conflicts.length };
          }

          // No conflicts → auto-merge and re-publish at the remote version.
          const merged = mr.build({});
          set((s) => {
            const ne = new Map(s.editedTimelines);
            ne.set(timelineId, merged);
            const nv = new Map(s.timelineVersionById);
            nv.set(timelineId, remoteVersion);
            return { editedTimelines: ne, isDirty: true, timelineVersionById: nv };
          });
          projectStore.updateTimeline(timelineId, merged);
          _tlMergeRetry = true;
          try {
            const r = await get().publishTimeline(timelineId);
            return r.ok ? { ok: true, merged: true, version: (r as { version?: number }).version ?? remoteVersion + 1 } : r;
          } finally {
            _tlMergeRetry = false;
          }
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, reason: 'error', message: err.error };
        }

        const saved = await res.json().catch(() => ({}));
        const newVersion =
          saved && typeof saved.version === 'number' ? saved.version : version + 1;
        const canonical: Timeline =
          saved && typeof saved === 'object' && saved.id
            ? saved
            : { ...timeline, version: newVersion };

        // Compute the detailed diff of this publish vs the previous published
        // baseline, so the team audit shows exactly what changed in which preset.
        const baseline = state.publishedBaselineById.get(timelineId);
        const details = summarizeTimelineDiff(baseline, timeline);
        const auditChanges =
          details.length > 0
            ? details.map((d) => ({ type: d.type, summary: d.summary }))
            : [
                {
                  type: 'timeline',
                  summary: `${timeline.presets?.length ?? 0} preset${(timeline.presets?.length ?? 0) !== 1 ? 's' : ''}`,
                },
              ];
        const description =
          details.length > 0
            ? `Published ${details.length} change${details.length !== 1 ? 's' : ''}`
            : 'Published timeline';

        // Persist canonical locally + mark clean + advance the baseline + sync version
        set((s) => {
          const newEdited = new Map(s.editedTimelines);
          newEdited.set(timelineId, canonical);
          const newBaselines = new Map(s.publishedBaselineById);
          newBaselines.set(timelineId, JSON.parse(JSON.stringify(canonical)));
          const newVersions = new Map(s.timelineVersionById);
          newVersions.set(timelineId, newVersion);
          // Mark this timeline's history up to the current cursor as published.
          const newHistory = markTimelinePublishedUpToCursor(
            s.history,
            s.historyIndex,
            timelineId
          );
          const stillDirty = hasUnpublishedAtCursor(newHistory, s.historyIndex);
          const newCloud = new Map(s.cloudUpdatedAtByTimelineId);
          const cloudAt = canonical.updatedAt ?? new Date().toISOString();
          newCloud.set(timelineId, cloudAt);
          const newLocal = new Map(s.localEditUpdatedAtByTimelineId);
          newLocal.delete(timelineId);
          const ns = {
            editedTimelines: newEdited,
            isDirty: stillDirty,
            publishedBaselineById: newBaselines,
            timelineVersionById: newVersions,
            history: newHistory,
            cloudUpdatedAtByTimelineId: newCloud,
            localEditUpdatedAtByTimelineId: newLocal,
          };
          saveToStorage(s.currentProjectId, ns);
          persistTimelineHistory(s.currentProjectId, newHistory, s.historyIndex);
          return ns;
        });
        projectStore.updateTimeline(timelineId, canonical);
        resetTimelineSquash();

        // Append the team audit entry + refresh the team list in the BACKGROUND so
        // the publish loader (isPublishing) stops as soon as the timeline is saved,
        // even if the audit/refresh requests are slow.
        const auditProjectId = timeline.projectId ?? state.currentProjectId ?? undefined;
        void (async () => {
          try {
            await fetch('/api/project/timeline/edit-history', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(state.clientId ? { 'x-client-id': state.clientId } : {}),
              },
              body: JSON.stringify({
                projectId: auditProjectId,
                timelineId,
                clientId: state.clientId ?? undefined,
                entryId: `tpub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
                timestamp: Date.now(),
                description,
                changes: auditChanges,
                // Full published timeline so the team tab can preview / revert to it.
                snapshot: canonical,
              }),
            });
          } catch {
            // audit is best-effort
          }
          try {
            await get().loadTimelineDbHistory();
          } catch {
            // non-critical
          }
        })();

        return { ok: true, version: newVersion };
      } catch (error) {
        return {
          ok: false,
          reason: 'error',
          message: error instanceof Error ? error.message : 'Publish failed',
        };
      } finally {
        set({ isPublishing: false });
      }
    },

    revertTimelineToTeamBase: async (timelineId) => {
      const { clientId } = get();
      let canonical: Timeline | null = null;
      try {
        const res = await fetch(
          `/api/project/timeline?id=${encodeURIComponent(timelineId)}`,
          { headers: clientId ? { 'x-client-id': clientId } : undefined }
        );
        if (res.ok) canonical = await res.json();
      } catch {
        return; // network failure — leave local edits untouched
      }
      if (!canonical || !canonical.id) return;

      // Apply as an undoable edit (updateTimeline pushes history + syncs stores),
      // then mark that tip published since we now match the team's published state.
      get().updateTimeline(timelineId, canonical);
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(timelineId, canonical);
      // Persist the clean flag + advance the publish baseline + sync version.
      set((s) => {
        const newBaselines = new Map(s.publishedBaselineById);
        newBaselines.set(timelineId, JSON.parse(JSON.stringify(canonical)));
        const newVersions = new Map(s.timelineVersionById);
        if (typeof canonical!.version === 'number') {
          newVersions.set(timelineId, canonical!.version);
        }
        const newHistory = markTimelinePublishedUpToCursor(
          s.history,
          s.historyIndex,
          timelineId
        );
        const stillDirty = hasUnpublishedAtCursor(newHistory, s.historyIndex);
        const newLocal = new Map(s.localEditUpdatedAtByTimelineId);
        newLocal.delete(timelineId);
        const cloudAt = canonical!.updatedAt ?? new Date().toISOString();
        const newCloud = new Map(s.cloudUpdatedAtByTimelineId);
        newCloud.set(timelineId, cloudAt);
        const ns = {
          isDirty: stillDirty,
          publishedBaselineById: newBaselines,
          timelineVersionById: newVersions,
          history: newHistory,
          localEditUpdatedAtByTimelineId: newLocal,
          cloudUpdatedAtByTimelineId: newCloud,
        };
        saveToStorage(s.currentProjectId, {
          editedTimelines: s.editedTimelines,
          currentProjectId: s.currentProjectId,
          ...ns,
        });
        persistTimelineHistory(s.currentProjectId, newHistory, s.historyIndex);
        return ns;
      });
      resetTimelineSquash();
      get().loadTimelineDbHistory();
    },

    startTimelinePreview: (timeline) => {
      if (!timeline?.id) return;
      const { useProjectStore } = require('./project-store');
      const ps = useProjectStore.getState();
      const s = get();
      // Back up the real state once (first preview in a session of holding).
      if (!_tlPreviewBackup) {
        _tlPreviewBackup = {
          timelineId: timeline.id,
          edited: s.editedTimelines.get(timeline.id),
          loaded: ps.loadedTimeline,
          isDirty: s.isDirty,
        };
      }
      const preview: Timeline = JSON.parse(JSON.stringify(timeline));
      // Apply WITHOUT touching history / isDirty.
      set((st) => {
        const ne = new Map(st.editedTimelines);
        ne.set(preview.id, preview);
        return { editedTimelines: ne, isTimelinePreviewActive: true };
      });
      ps.loadTimeline(preview);
      // Force the middle-panel video to re-render the previewed timeline. The
      // edited timeline now resolves to `preview`, so generateOutput compiles it.
      try {
        const { useCompileStore } = require('./compile-store');
        useCompileStore.getState().generateOutput(preview);
      } catch {
        // compile store not available (SSR) — ignore
      }
    },

    endTimelinePreview: () => {
      if (!_tlPreviewBackup) {
        set({ isTimelinePreviewActive: false });
        return;
      }
      const b = _tlPreviewBackup;
      _tlPreviewBackup = null;
      set((st) => {
        const ne = new Map(st.editedTimelines);
        if (b.edited) ne.set(b.timelineId, b.edited);
        else ne.delete(b.timelineId);
        return { editedTimelines: ne, isDirty: b.isDirty, isTimelinePreviewActive: false };
      });
      const { useProjectStore } = require('./project-store');
      if (b.loaded) useProjectStore.getState().loadTimeline(b.loaded);
      // Re-render the video back to the real (restored) timeline.
      const restored = b.edited ?? b.loaded ?? undefined;
      if (restored) {
        try {
          const { useCompileStore } = require('./compile-store');
          useCompileStore.getState().generateOutput(restored);
        } catch {
          // ignore
        }
      }
    },

    revertToTimelineState: (timeline, label) => {
      if (!timeline?.id) return;
      // Restore the real state first if a preview is active.
      get().endTimelinePreview();
      resetTimelineSquash();
      const previous = get().editedTimelines.get(timeline.id);
      const t: Timeline = JSON.parse(JSON.stringify(timeline));
      set((s) => {
        const ne = new Map(s.editedTimelines);
        ne.set(t.id, t);
        // Append a new history entry at the END — keep everything after (non-destructive).
        const entry = createHistoryEntry(t, previous);
        const newHistory = [...s.history, entry];
        if (newHistory.length > s.maxHistorySize) newHistory.shift();
        const ns = {
          editedTimelines: ne,
          isDirty: true,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
        saveToStorage(s.currentProjectId, ns);
        return ns;
      });
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(t.id, t);
      syncRestoredCaptions(previous, t);
      void label;
    },

    resetToTimelineEntry: (entryId, timeline) => {
      if (!timeline?.id) return;
      get().endTimelinePreview();
      resetTimelineSquash();
      const previous = get().editedTimelines.get(timeline.id);
      const t: Timeline = JSON.parse(JSON.stringify(timeline));
      set((s) => {
        const targetIdx = s.history.findIndex((e) => e.id === entryId);
        if (targetIdx < 0) return {};
        const ne = new Map(s.editedTimelines);
        ne.set(t.id, t);
        // Keep entries up to the target plus any already-published ones after it.
        const kept = s.history.filter(
          (e, i) => i <= targetIdx || e.published === true
        );
        // Cursor lands on the target in the trimmed array.
        const newIndex = kept.findIndex((e) => e.id === entryId);
        const ns = {
          editedTimelines: ne,
          isDirty: true,
          history: kept,
          historyIndex: newIndex,
        };
        saveToStorage(s.currentProjectId, ns);
        persistTimelineHistory(s.currentProjectId, ns.history, ns.historyIndex);
        return ns;
      });
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(t.id, t);
      syncRestoredCaptions(previous, t);
    },

    discardAllLocalTimelineChanges: (timelineId) => {
      get().endTimelinePreview();
      resetTimelineSquash();
      const state = get();
      const kept = state.history.filter((e) => e.published === true);
      const lastPublishedForTl = kept.filter((e) => e.timelineId === timelineId);
      const lastPublished = lastPublishedForTl[lastPublishedForTl.length - 1];
      const baseline = lastPublished?.timeline ?? state.loadBaselineById.get(timelineId);
      if (!baseline) return;
      const previous = state.editedTimelines.get(timelineId);
      const ne = new Map(state.editedTimelines);
      ne.set(timelineId, baseline);
      const ns = {
        history: kept,
        historyIndex: kept.length - 1,
        editedTimelines: ne,
        isDirty: false,
      };
      set(ns);
      saveToStorage(state.currentProjectId, ns);
      persistTimelineHistory(state.currentProjectId, ns.history, ns.historyIndex);
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(timelineId, baseline);
      syncRestoredCaptions(previous, baseline);
    },

    clearPublishedHistory: () => {
      set((s) => {
        const currentEntry = s.history[s.historyIndex];
        const kept = s.history.filter((e) => !e.published);
        let newIndex = currentEntry ? kept.indexOf(currentEntry) : -1;
        if (newIndex < 0) newIndex = kept.length - 1;
        persistTimelineHistory(s.currentProjectId, kept, newIndex);
        return { history: kept, historyIndex: newIndex };
      });
    },

    resolveTimelineMerge: async (choices) => {
      const pending = get().pendingTimelineMerge;
      if (!pending) return { ok: false, reason: 'error', message: 'No pending merge' };
      const merged = pending.build(choices);
      const { timelineId, remoteVersion } = pending;
      set((s) => {
        const ne = new Map(s.editedTimelines);
        ne.set(timelineId, merged);
        const nv = new Map(s.timelineVersionById);
        nv.set(timelineId, remoteVersion);
        return {
          editedTimelines: ne,
          isDirty: true,
          timelineVersionById: nv,
          pendingTimelineMerge: null,
        };
      });
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(timelineId, merged);
      _tlMergeRetry = true;
      try {
        const r = await get().publishTimeline(timelineId);
        return r.ok ? { ok: true, merged: true, version: (r as { version?: number }).version ?? remoteVersion + 1 } : r;
      } finally {
        _tlMergeRetry = false;
      }
    },

    cancelTimelineMerge: () => set({ pendingTimelineMerge: null }),
    isTimelineUnsynced: (timelineId) => {
      const state = get();
      const cloudTimelineUpdatedAt = getProjectTimelines().find(
        (timeline) => timeline.id === timelineId
      )?.updatedAt;
      return isTimelineUnsyncedWithCloud(
        timelineId,
        state.cloudUpdatedAtByTimelineId,
        state.localEditUpdatedAtByTimelineId,
        cloudTimelineUpdatedAt
      );
    },

    getUnsyncedTimelineIds: () => {
      const state = get();
      return getUnsyncedTimelineIds(
        getProjectTimelines(),
        state.cloudUpdatedAtByTimelineId,
        state.localEditUpdatedAtByTimelineId
      );
    },

    hasAnyUnsyncedTimelines: () => {
      return get().getUnsyncedTimelineIds().length > 0;
    },
  };

  return initialState;
});

// ── Auto-persist local history (debounced) so it survives reloads ────────────
if (typeof window !== 'undefined') {
  let _tlHistTimer: ReturnType<typeof setTimeout> | null = null;
  useTimelineEditsStore.subscribe((state, prev) => {
    if (state.history !== prev.history || state.historyIndex !== prev.historyIndex) {
      if (_tlHistTimer) clearTimeout(_tlHistTimer);
      _tlHistTimer = setTimeout(() => {
        const s = useTimelineEditsStore.getState();
        persistTimelineHistory(s.currentProjectId, s.history, s.historyIndex);
      }, 400);
    }
  });
}
