import { create } from 'zustand';
import { DatabasePreset, Preset } from '@/components/editor/presets/types';

// Timeline type based on the JSON structure
export interface Timeline {
  id: string;
  projectId: string;
  displayName: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  configuration?: any;
  defaultData?: any;
  presets?: Array<{
    id: string;
    label: string;
    presetId: string;
    presetType: string;
    presetInfo?: Preset | DatabasePreset;
    presetInputData?: any;
    disabled?: boolean;
  }>;
}

interface ProjectState {
  timelines: Timeline[];
  loadedTimeline: Timeline | null;
  currentProjectId: string | null;
  loadTimeline: (timeline: Timeline) => void;
  clearTimeline: () => void;
  setTimelines: (timelines: Timeline[]) => void;
  updateTimeline: (timelineId: string, updates: Partial<Timeline>) => void;
  loadProjectTimelines: (projectId: string, clientId?: string) => Promise<void>;
  setCurrentProjectId: (projectId: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  timelines: [],
  loadedTimeline: null,
  currentProjectId: null,
  loadTimeline: timeline => set({ loadedTimeline: timeline }),
  clearTimeline: () => set({ loadedTimeline: null }),
  setTimelines: timelines => set({ timelines }),
  updateTimeline: (timelineId, updates) => set(state => ({
    timelines: state.timelines.map(t => 
      t.id === timelineId ? { ...t, ...updates } : t
    ),
    loadedTimeline: state.loadedTimeline?.id === timelineId 
      ? { ...state.loadedTimeline, ...updates }
      : state.loadedTimeline,
  })),
  loadProjectTimelines: async (projectId: string, clientId?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (clientId) {
        headers['x-client-id'] = clientId;
      }
      const response = await fetch(`/api/project/timeline?projectId=${projectId}`, { headers });
      if (!response.ok) {
        throw new Error('Failed to load timelines');
      }
      const timelines = await response.json();
      set({ timelines, currentProjectId: projectId });
    } catch (error) {
      console.error('Error loading project timelines:', error);
      set({ timelines: [], currentProjectId: projectId });
    }
  },
  setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),
}));
