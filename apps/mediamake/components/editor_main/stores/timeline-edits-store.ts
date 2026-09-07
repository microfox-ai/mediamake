import { create } from 'zustand';
import type { Timeline } from './project-store';
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
  updatePresetLabel: (timelineId: string, presetId: string, label: string) => void;
  updatePresetInputData: (timelineId: string, presetId: string, inputData: any) => void;
  updatePresetDisabled: (timelineId: string, presetId: string, disabled: boolean) => void;
  updateTimelineConfig: (timelineId: string, config: any) => void;
  updateTimelineDefaultData: (timelineId: string, defaultData: any) => void;
  addPresetToTimeline: (timelineId: string, preset: PresetType | DatabasePreset) => void;
  removePreset: (timelineId: string, presetId: string) => void;
  duplicatePreset: (timelineId: string, presetId: string) => void;
  reorderPresets: (timelineId: string, oldIndex: number, newIndex: number) => void;
  
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

const loadFromStorage = (projectId: string | null): {
  editedTimelines?: Map<string, Timeline>;
  isDirty?: boolean;
  cloudUpdatedAtByTimelineId?: UpdatedAtMap;
  localEditUpdatedAtByTimelineId?: UpdatedAtMap;
  currentProjectId?: string | null;
} | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${projectId || 'default'}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.editedTimelines) {
        parsed.editedTimelines = new Map(parsed.editedTimelines);
      }
      parsed.cloudUpdatedAtByTimelineId = mapFromEntries(parsed.cloudUpdatedAtByTimelineId);
      parsed.localEditUpdatedAtByTimelineId = mapFromEntries(
        parsed.localEditUpdatedAtByTimelineId
      );

      // Legacy migration: global isDirty with edited timelines but no per-timeline timestamps
      if (
        parsed.isDirty &&
        parsed.localEditUpdatedAtByTimelineId.size === 0 &&
        parsed.editedTimelines?.size > 0
      ) {
        const migratedLocal = new Map<string, string>(parsed.localEditUpdatedAtByTimelineId);
        const migratedAt = new Date().toISOString();
        parsed.editedTimelines.forEach((_timeline: Timeline, timelineId: string) => {
          migratedLocal.set(timelineId, migratedAt);
        });
        parsed.localEditUpdatedAtByTimelineId = migratedLocal;
      }

      return parsed;
    }
  } catch (error) {
    console.error('Error loading from storage:', error);
  }
  return null;
};

const saveToStorage = (projectId: string | null, state: Partial<TimelineEditsState>) => {
  if (typeof window === 'undefined') return;
  try {
    const toStore = {
      editedTimelines: Array.from(state.editedTimelines?.entries() || []),
      cloudUpdatedAtByTimelineId: mapToEntries(state.cloudUpdatedAtByTimelineId ?? new Map()),
      localEditUpdatedAtByTimelineId: mapToEntries(
        state.localEditUpdatedAtByTimelineId ?? new Map()
      ),
      currentProjectId: state.currentProjectId,
      isDirty: state.isDirty ?? false,
    };
    localStorage.setItem(`${STORAGE_KEY}-${projectId || 'default'}`, JSON.stringify(toStore));
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
const createHistoryEntry = (timeline: Timeline): HistoryEntry => ({
  timelineId: timeline.id,
  timeline: JSON.parse(JSON.stringify(timeline)), // Deep clone
  timestamp: Date.now(),
  id: `th_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  published: false,
});

// ── Local history persistence (survives reloads), keyed per project ──────────
const TIMELINE_HISTORY_KEY = 'timeline-history';
const timelineHistoryKey = (projectId: string | null) =>
  `${TIMELINE_HISTORY_KEY}-${projectId || 'default'}`;

const persistTimelineHistory = (projectId: string | null, history: HistoryEntry[], historyIndex: number) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(timelineHistoryKey(projectId), JSON.stringify({ history, historyIndex }));
  } catch {
    // quota — best-effort
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
      history: parsed.history,
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

        if (canSquash && atTip && last && last.timelineId === timelineId) {
          // Replace the last entry's snapshot in-place — one entry for the gesture.
          newHistory = [...state.history];
          newHistory[state.historyIndex] = createHistoryEntry(newTimeline);
          newIndex = state.historyIndex;
        } else {
          newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(createHistoryEntry(newTimeline));
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
          cloudUpdatedAtByTimelineId: newCloud,
          localEditUpdatedAtByTimelineId: bumpLocalTimelineEdit(
            timelineId,
            state.localEditUpdatedAtByTimelineId
          ),
          history: newHistory,
          historyIndex: newIndex,
        };
        saveToStorage(state.currentProjectId, newState);
        return newState;
      });

      _tlLastSquashKey = changeKey ?? null;
      _tlLastSquashAt = now;

      // Sync with project store
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(timelineId, updates);
    },

    updatePresetLabel: (timelineId, presetId, label) => {
      const state = get();
      const timeline = state.editedTimelines.get(timelineId);
      
      if (!timeline) {
        // Get from project store if not in edits
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        const originalTimeline = projectState.loadedTimeline?.id === timelineId 
          ? projectState.loadedTimeline 
          : projectState.timelines.find((t: Timeline) => t.id === timelineId);
        
        if (!originalTimeline) return;
        
        const updatedPresets = originalTimeline.presets?.map((p: any) =>
          p.id === presetId ? { ...p, label } : p
        ) || [];

        get().updateTimeline(timelineId, { presets: updatedPresets }, `label:${presetId}`);
        return;
      }

      const updatedPresets = timeline.presets?.map(p =>
        p.id === presetId ? { ...p, label } : p
      ) || [];

      get().updateTimeline(timelineId, { presets: updatedPresets }, `label:${presetId}`);
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
          p.id === presetId ? { ...p, disabled } : p
        ) || [];
        
        get().updateTimeline(timelineId, { presets: updatedPresets });
        return;
      }
      
      const updatedPresets = timeline.presets?.map(p =>
        p.id === presetId ? { ...p, disabled } : p
      ) || [];
      
      get().updateTimeline(timelineId, { presets: updatedPresets });
    },

    updateTimelineConfig: (timelineId, config) => {
      get().updateTimeline(timelineId, { configuration: config }, 'config');
    },

    updateTimelineDefaultData: (timelineId, defaultData) => {
      get().updateTimeline(timelineId, { defaultData }, 'defaultData');
    },

    addPresetToTimeline: (timelineId: string, preset: PresetType | DatabasePreset) => {
      const state = get();
      const timeline = state.editedTimelines.get(timelineId);
      
      // Both PresetType and DatabasePreset have metadata
      const metadata = (preset as PresetType | DatabasePreset).metadata;
      
      if (!timeline) {
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        const originalTimeline = projectState.loadedTimeline?.id === timelineId 
          ? projectState.loadedTimeline 
          : projectState.timelines.find((t: Timeline) => t.id === timelineId);
        
        if (!originalTimeline) {
          console.warn(`Timeline ${timelineId} not found`);
          return;
        }
        
        const existingPresets = originalTimeline.presets || [];
        const count = existingPresets.filter((p: any) => p.presetId === metadata.id).length;
        const newPreset = {
          id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          label: count > 0 ? `${metadata.title} (${count + 1})` : metadata.title,
          presetId: metadata.id,
          presetType: metadata.presetType,
          presetInfo: preset as PresetType | DatabasePreset,
          presetInputData: metadata.defaultInputParams || {},
          disabled: false,
        };
        
        get().updateTimeline(timelineId, { 
          presets: [...existingPresets, newPreset] 
        });
      } else {
        const existingPresets = timeline.presets || [];
        const count = existingPresets.filter((p: any) => p.presetId === metadata.id).length;
        const newPreset = {
          id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          label: count > 0 ? `${metadata.title} (${count + 1})` : metadata.title,
          presetId: metadata.id,
          presetType: metadata.presetType,
          presetInfo: preset as PresetType | DatabasePreset,
          presetInputData: metadata.defaultInputParams || {},
          disabled: false,
        };
        
        get().updateTimeline(timelineId, { 
          presets: [...existingPresets, newPreset] 
        });
      }
    },

    removePreset: (timelineId: string, presetId: string) => {
      const state = get();
      const timeline = state.editedTimelines.get(timelineId);
      
      if (!timeline) {
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        const originalTimeline = projectState.loadedTimeline?.id === timelineId 
          ? projectState.loadedTimeline 
          : projectState.timelines.find((t: Timeline) => t.id === timelineId);
        
        if (!originalTimeline || !originalTimeline.presets) return;
        
        const filteredPresets = originalTimeline.presets.filter((p: any) => p.id !== presetId);
        get().updateTimeline(timelineId, { presets: filteredPresets });
        return;
      }
      
      if (!timeline.presets) return;
      
      const filteredPresets = timeline.presets.filter(p => p.id !== presetId);
      get().updateTimeline(timelineId, { presets: filteredPresets });
    },

    duplicatePreset: (timelineId: string, presetId: string) => {
      const state = get();
      const timeline = state.editedTimelines.get(timelineId);
      
      let sourcePreset: any;
      let allPresets: any[];
      
      if (!timeline) {
        const { useProjectStore } = require('./project-store');
        const projectState = useProjectStore.getState();
        const originalTimeline = projectState.loadedTimeline?.id === timelineId 
          ? projectState.loadedTimeline 
          : projectState.timelines.find((t: Timeline) => t.id === timelineId);
        
        if (!originalTimeline || !originalTimeline.presets) return;
        
        sourcePreset = originalTimeline.presets.find((p: any) => p.id === presetId);
        allPresets = originalTimeline.presets;
      } else {
        if (!timeline.presets) return;
        sourcePreset = timeline.presets.find(p => p.id === presetId);
        allPresets = timeline.presets;
      }
      
      if (!sourcePreset) return;
      
      // Find the index of the source preset
      const sourceIndex = allPresets.findIndex((p: any) => p.id === presetId);
      if (sourceIndex === -1) return;
      
      // Count how many presets with the same presetId exist
      const count = allPresets.filter((p: any) => p.presetId === sourcePreset.presetId).length;
      
      // Create duplicate preset
      const duplicatedPreset = {
        ...sourcePreset,
        id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        label: count > 0 ? `${sourcePreset.label} (Copy)` : `${sourcePreset.label} (Copy)`,
      };
      
      // Insert duplicate right after the source preset
      const newPresets = [...allPresets];
      newPresets.splice(sourceIndex + 1, 0, duplicatedPreset);
      
      get().updateTimeline(timelineId, { presets: newPresets });
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

        set((s) => {
          const ne = new Map(s.editedTimelines);
          ne.set(firstEntry.timelineId, baseline);
          const ns = { historyIndex: -1 as const, editedTimelines: ne };
          saveToStorage(s.currentProjectId, ns);
          return ns;
        });

        const { useProjectStore } = require('./project-store');
        useProjectStore.getState().updateTimeline(firstEntry.timelineId, baseline);
        return true;
      }

      const historyEntry = state.history[newIndex];
      if (!historyEntry) return false;

      set(state => {
        const newState = {
          historyIndex: newIndex,
          editedTimelines: new Map(state.editedTimelines).set(
            historyEntry.timelineId,
            historyEntry.timeline
          ),
          cloudUpdatedAtByTimelineId: new Map(state.cloudUpdatedAtByTimelineId),
          localEditUpdatedAtByTimelineId: bumpLocalTimelineEdit(
            historyEntry.timelineId,
            state.localEditUpdatedAtByTimelineId
          ),
        };

        // Persist to storage
        saveToStorage(state.currentProjectId, newState);

        return newState;
      });

      // Sync with project store
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(
        historyEntry.timelineId,
        historyEntry.timeline
      );

      return true;
    },

    redo: () => {
      const state = get();
      if (!state.canRedo()) return false;
      resetTimelineSquash();

      const newIndex = state.historyIndex + 1;
      const historyEntry = state.history[newIndex];

      if (!historyEntry) return false;

      set(state => {
        const newState = {
          historyIndex: newIndex,
          editedTimelines: new Map(state.editedTimelines).set(
            historyEntry.timelineId,
            historyEntry.timeline
          ),
          cloudUpdatedAtByTimelineId: new Map(state.cloudUpdatedAtByTimelineId),
          localEditUpdatedAtByTimelineId: bumpLocalTimelineEdit(
            historyEntry.timelineId,
            state.localEditUpdatedAtByTimelineId
          ),
        };
        
        // Persist to storage
        saveToStorage(state.currentProjectId, newState);
        
        return newState;
      });
      
      // Sync with project store
      const { useProjectStore } = require('./project-store');
      useProjectStore.getState().updateTimeline(
        historyEntry.timelineId,
        historyEntry.timeline
      );
      
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
      const stored = loadFromStorage(projectId);
      // Restore the local undo/redo history for this project (survives reloads).
      const storedHistory = loadTimelineHistory(projectId);
      if (stored) {
        const editedTimelines = stored.editedTimelines || new Map();
        set({
          editedTimelines,
          cloudUpdatedAtByTimelineId: stored.cloudUpdatedAtByTimelineId || new Map(),
          localEditUpdatedAtByTimelineId: stored.localEditUpdatedAtByTimelineId || new Map(),
          currentProjectId: projectId,
          // Restore the persisted isDirty flag directly.
          // Do NOT recalculate from editedTimelines.size — the map now keeps entries
          // even for clean (already-saved) timelines to avoid UI state resets.
          isDirty: stored.isDirty ?? false,
          ...(storedHistory
            ? { history: storedHistory.history, historyIndex: storedHistory.historyIndex }
            : {}),
        });
        
        // Sync edited timelines back to project store
        if (editedTimelines.size > 0) {
          const { useProjectStore } = require('./project-store');
          const projectStore = useProjectStore.getState();
          
          // Update each edited timeline in the project store
          editedTimelines.forEach((editedTimeline) => {
            projectStore.updateTimeline(editedTimeline.id, editedTimeline);
          });
        }
      } else {
        set({
          currentProjectId: projectId,
          isDirty: false,
          ...(storedHistory
            ? { history: storedHistory.history, historyIndex: storedHistory.historyIndex }
            : {}),
          cloudUpdatedAtByTimelineId: new Map(),
          localEditUpdatedAtByTimelineId: new Map(),
        });
      }
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
          
          // Persist to storage
          saveToStorage(projectId, newState);
          
          return newState;
        });
      } else {
        // Clear all edits
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

    hasUnpublishedChanges: () => get().isDirty,

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
      if (!state.isDirty) {
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
      set({ isPublishing: true });
      try {
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
            presets: timeline.presets,
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
          // Mark this timeline's history up to the current point as published.
          const newHistory = s.history.map((e) =>
            e.timelineId === timelineId && !e.published ? { ...e, published: true } : e
          );
          const ns = {
            editedTimelines: newEdited,
            isDirty: false,
            publishedBaselineById: newBaselines,
            timelineVersionById: newVersions,
            history: newHistory,
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
      // then mark clean since we now match the team's published state.
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
        saveToStorage(s.currentProjectId, {
          editedTimelines: s.editedTimelines,
          currentProjectId: s.currentProjectId,
          isDirty: false,
        });
        return { isDirty: false, publishedBaselineById: newBaselines, timelineVersionById: newVersions };
      });
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
      const t: Timeline = JSON.parse(JSON.stringify(timeline));
      set((s) => {
        const ne = new Map(s.editedTimelines);
        ne.set(t.id, t);
        // Append a new history entry at the END — keep everything after (non-destructive).
        const entry = createHistoryEntry(t);
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
      void label;
    },

    resetToTimelineEntry: (entryId, timeline) => {
      if (!timeline?.id) return;
      get().endTimelinePreview();
      resetTimelineSquash();
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
