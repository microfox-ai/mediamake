import { create } from 'zustand';
import type { Timeline } from './project-store';
import { DatabasePreset, Preset as PresetType } from '@/components/editor/presets/types';

// History entry for undo/redo
interface HistoryEntry {
  timelineId: string;
  timeline: Timeline;
  timestamp: number;
}

interface TimelineEditsState {
  // Current state
  editedTimelines: Map<string, Timeline>; // timelineId -> edited timeline
  isDirty: boolean; // Whether there are unsaved changes
  
  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number; // Current position in history (-1 means no history)
  maxHistorySize: number;
  
  // Current project ID for persistence
  currentProjectId: string | null;
  
  // Actions
  updateTimeline: (timelineId: string, updates: Partial<Timeline>) => void;
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
  loadFromPersistence: (projectId: string) => void;
  clearEdits: (projectId?: string) => void;
  
  // State management
  setCurrentProjectId: (projectId: string | null) => void;
  markClean: () => void;
  getEditedTimeline: (timelineId: string) => Timeline | null;
}

// Persistence helpers
const STORAGE_KEY = 'timeline-edits-storage';

const loadFromStorage = (projectId: string | null): Partial<TimelineEditsState> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${projectId || 'default'}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert array back to Map
      if (parsed.editedTimelines) {
        parsed.editedTimelines = new Map(parsed.editedTimelines);
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
      currentProjectId: state.currentProjectId,
      isDirty: (state.editedTimelines?.size || 0) > 0, // Calculate isDirty based on edited timelines
      // Don't persist history to avoid storage bloat
    };
    localStorage.setItem(`${STORAGE_KEY}-${projectId || 'default'}`, JSON.stringify(toStore));
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
};

// Helper to create a history entry
const createHistoryEntry = (timeline: Timeline): HistoryEntry => ({
  timelineId: timeline.id,
  timeline: JSON.parse(JSON.stringify(timeline)), // Deep clone
  timestamp: Date.now(),
});

export const useTimelineEditsStore = create<TimelineEditsState>((set, get) => {
  // Initialize from storage if available
  const stored = loadFromStorage(null);
  
  // Calculate isDirty based on whether there are edited timelines
  const hasEdits = (stored?.editedTimelines?.size || 0) > 0;
  
  const initialState: TimelineEditsState = {
    editedTimelines: stored?.editedTimelines || new Map(),
    isDirty: stored?.isDirty || hasEdits, // Use stored isDirty or calculate from edits
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,
    currentProjectId: stored?.currentProjectId || null,

    updateTimeline: (timelineId, updates) => {
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
      
      // Add to history
      const newTimeline = state.editedTimelines.get(timelineId)!;
      const historyEntry = createHistoryEntry(newTimeline);
      
      set(state => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyEntry);
        
        // Limit history size
        if (newHistory.length > state.maxHistorySize) {
          newHistory.shift();
        } else {
          // Only increment index if we didn't remove from front
          state.historyIndex = newHistory.length - 1;
        }
        
        const newState = {
          editedTimelines: new Map(state.editedTimelines),
          isDirty: true,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
        
        // Persist to storage
        saveToStorage(state.currentProjectId, newState);
        
        return newState;
      });
      
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
        
        get().updateTimeline(timelineId, { presets: updatedPresets });
        return;
      }
      
      const updatedPresets = timeline.presets?.map(p =>
        p.id === presetId ? { ...p, label } : p
      ) || [];
      
      get().updateTimeline(timelineId, { presets: updatedPresets });
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
        
        get().updateTimeline(timelineId, { presets: updatedPresets });
        return;
      }
      
      const updatedPresets = timeline.presets?.map(p =>
        p.id === presetId ? { ...p, presetInputData: inputData } : p
      ) || [];
      
      get().updateTimeline(timelineId, { presets: updatedPresets });
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
      get().updateTimeline(timelineId, { configuration: config });
    },

    updateTimelineDefaultData: (timelineId, defaultData) => {
      get().updateTimeline(timelineId, { defaultData });
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
      
      const newIndex = state.historyIndex - 1;
      const historyEntry = state.history[newIndex];
      
      if (!historyEntry) return false;
      
      set(state => {
        const newState = {
          historyIndex: newIndex,
          editedTimelines: new Map(state.editedTimelines).set(
            historyEntry.timelineId,
            historyEntry.timeline
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
      return state.historyIndex > 0;
    },

    canRedo: () => {
      const state = get();
      return state.historyIndex < state.history.length - 1;
    },

    saveToDatabase: async (timelineId) => {
      const state = get();
      const editedTimeline = state.editedTimelines.get(timelineId);
      
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
        
        // Mark as clean for this timeline
        set(state => {
          const newEdited = new Map(state.editedTimelines);
          newEdited.delete(timelineId); // Remove from edits since it's saved
          const newState = {
            editedTimelines: newEdited,
            isDirty: newEdited.size > 0,
          };
          
          // Persist to storage
          saveToStorage(state.currentProjectId, newState);
          
          return newState;
        });
        
        // Update project store
        const { useProjectStore } = require('./project-store');
        useProjectStore.getState().updateTimeline(timelineId, editedTimeline);
      } catch (error) {
        console.error('Error saving timeline:', error);
        throw error;
      }
    },

    loadFromPersistence: (projectId) => {
      const stored = loadFromStorage(projectId);
      const hasEdits = (stored?.editedTimelines?.size || 0) > 0;
      if (stored) {
        const editedTimelines = stored.editedTimelines || new Map();
        set({
          editedTimelines: editedTimelines,
          currentProjectId: projectId,
          isDirty: stored.isDirty || hasEdits, // Restore isDirty from storage
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
        });
      }
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
            isDirty: newEdited.size > 0,
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
          isDirty: false,
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

    markClean: () => {
      set({ isDirty: false });
    },

    getEditedTimeline: (timelineId) => {
      const state = get();
      return state.editedTimelines.get(timelineId) || null;
    },
  };
  
  return initialState;
});
