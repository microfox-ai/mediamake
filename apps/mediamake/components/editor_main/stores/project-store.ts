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
  loadTimelineById: (timelineId: string, clientId?: string) => Promise<Timeline | null>;
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

      const params = new URLSearchParams({
        projectId,
        summary: 'true',
        page: '1',
        limit: '100',
      });

      const response = await fetch(`/api/project/timeline?${params.toString()}`, { headers });
      if (!response.ok) {
        throw new Error('Failed to load timelines');
      }

      const data = await response.json();
      const timelines = Array.isArray(data) ? data : (data.timelines || []);

      set({ timelines, currentProjectId: projectId });
    } catch (error) {
      console.error('Error loading project timelines:', error);
      set({ timelines: [], currentProjectId: projectId });
    }
  },
  loadTimelineById: async (timelineId: string, clientId?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (clientId) {
        headers['x-client-id'] = clientId;
      }

      const response = await fetch(`/api/project/timeline?id=${timelineId}`, { headers });
      if (!response.ok) {
        throw new Error('Failed to load timeline');
      }

      const timeline: Timeline = await response.json();

      set(state => {
        const exists = state.timelines.some(t => t.id === timeline.id);
        const updatedTimelines = exists
          ? state.timelines.map(t => (t.id === timeline.id ? { ...t, ...timeline } : t))
          : [...state.timelines, timeline];

        return {
          timelines: updatedTimelines,
          loadedTimeline: timeline,
        };
      });

      return timeline;
    } catch (error) {
      console.error('Error loading timeline by id:', error);
      return null;
    }
  },
  setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),
}));
