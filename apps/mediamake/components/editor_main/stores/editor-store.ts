import { create } from 'zustand';
import type { Timeline } from './project-store';
import type { ReferenceItem } from '@/components/editor/presets/types';

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
  | { type: 'preset'; item: Preset; timeline: Timeline }
  | {
      type: 'reference';
      item: ReferenceItem;
      timeline: Timeline;
      referenceIndex: number;
    };

interface EditorState {
  selectedItem: SelectedItem | null;
  selectItem: (item: SelectedItem | null) => void;
  selectTimeline: (timeline: Timeline) => void;
  selectPreset: (preset: Preset, timeline: Timeline) => void;
  selectReference: (
    reference: ReferenceItem,
    timeline: Timeline,
    referenceIndex: number,
  ) => void;
  clearSelection: () => void;
}

export const useEditorStore = create<EditorState>(set => ({
  selectedItem: null,
  selectItem: (item) => set({ selectedItem: item }),
  selectTimeline: (timeline) => set({ selectedItem: { type: 'timeline', item: timeline } }),
  selectPreset: (preset, timeline) => set({ selectedItem: { type: 'preset', item: preset, timeline } }),
  selectReference: (reference, timeline, referenceIndex) =>
    set({
      selectedItem: {
        type: 'reference',
        item: reference,
        timeline,
        referenceIndex,
      },
    }),
  clearSelection: () => set({ selectedItem: null }),
}));
