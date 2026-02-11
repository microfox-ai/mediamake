import { create } from 'zustand';
import type { Timeline } from './project-store';

// Preset type from timeline
export type Preset = {
  id: string;
  label: string;
  presetId: string;
  presetType: string;
  presetInfo?: any;
  presetInputData?: any;
  disabled?: boolean;
};

// Selected item can be either a Timeline or a Preset
export type SelectedItem = 
  | { type: 'timeline'; item: Timeline }
  | { type: 'preset'; item: Preset; timeline: Timeline };

interface EditorState {
  selectedItem: SelectedItem | null;
  selectItem: (item: SelectedItem | null) => void;
  selectTimeline: (timeline: Timeline) => void;
  selectPreset: (preset: Preset, timeline: Timeline) => void;
  clearSelection: () => void;
}

export const useEditorStore = create<EditorState>(set => ({
  selectedItem: null,
  selectItem: (item) => set({ selectedItem: item }),
  selectTimeline: (timeline) => set({ selectedItem: { type: 'timeline', item: timeline } }),
  selectPreset: (preset, timeline) => set({ selectedItem: { type: 'preset', item: preset, timeline } }),
  clearSelection: () => set({ selectedItem: null }),
}));
