import { create } from 'zustand';
import type { Timeline } from './project-store';
import type { ReferenceItem } from '@/components/editor/presets/types';
import type { TimelineAction } from '@/components/editor/presets/actions/types';

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
    }
  | { type: 'action'; item: TimelineAction; timeline: Timeline };

interface EditorState {
  selectedItem: SelectedItem | null;
  /** Block ids in the current multi-selection. The primary block is `selectedItem`. */
  selectedPresetIds: string[];
  /** Block used as the start of a shift-click range. */
  presetAnchorId: string | null;
  selectItem: (item: SelectedItem | null) => void;
  selectTimeline: (timeline: Timeline) => void;
  selectPreset: (preset: Preset, timeline: Timeline) => void;
  /** Point single-block actions at this block without dropping the rest of the selection. */
  focusPreset: (preset: Preset, timeline: Timeline) => void;
  /** Cmd/Ctrl-click: add or remove one block without clearing the others. */
  togglePresetSelection: (preset: Preset, timeline: Timeline) => void;
  /** Shift-click: select every block from the anchor through `preset`, in `orderedIds` order. */
  selectPresetRange: (preset: Preset, timeline: Timeline, orderedIds: string[]) => void;
  selectReference: (
    reference: ReferenceItem,
    timeline: Timeline,
    referenceIndex: number,
  ) => void;
  selectAction: (action: TimelineAction, timeline: Timeline) => void;
  clearSelection: () => void;
}

const noPresets = { selectedPresetIds: [] as string[], presetAnchorId: null as string | null };

export const useEditorStore = create<EditorState>((set) => ({
  selectedItem: null,
  selectedPresetIds: [],
  presetAnchorId: null,
  selectItem: (item) =>
    set({
      selectedItem: item,
      ...(item?.type === 'preset'
        ? { selectedPresetIds: [item.item.id], presetAnchorId: item.item.id }
        : noPresets),
    }),
  selectTimeline: (timeline) =>
    set({ selectedItem: { type: 'timeline', item: timeline }, ...noPresets }),
  selectPreset: (preset, timeline) =>
    set({
      selectedItem: { type: 'preset', item: preset, timeline },
      selectedPresetIds: [preset.id],
      presetAnchorId: preset.id,
    }),
  focusPreset: (preset, timeline) =>
    set((state) => {
      const inGroup =
        state.selectedItem?.type === 'preset' &&
        state.selectedItem.timeline.id === timeline.id &&
        state.selectedPresetIds.includes(preset.id);
      if (!inGroup) {
        return {
          selectedItem: { type: 'preset', item: preset, timeline },
          selectedPresetIds: [preset.id],
          presetAnchorId: preset.id,
        };
      }
      return { selectedItem: { type: 'preset', item: preset, timeline } };
    }),
  togglePresetSelection: (preset, timeline) =>
    set((state) => {
      const sameTimeline =
        state.selectedItem?.type === 'preset' && state.selectedItem.timeline.id === timeline.id;
      const current = sameTimeline ? state.selectedPresetIds : [];
      const next = current.includes(preset.id)
        ? current.filter((id) => id !== preset.id)
        : [...current, preset.id];
      if (next.length === 0) {
        return { selectedItem: { type: 'timeline', item: timeline }, ...noPresets };
      }
      const primary =
        (next.includes(preset.id) ? preset : undefined) ??
        timeline.presets?.find((item) => item.id === next[next.length - 1]) ??
        preset;
      return {
        selectedItem: { type: 'preset', item: primary, timeline },
        selectedPresetIds: next,
        presetAnchorId: primary.id,
      };
    }),
  selectPresetRange: (preset, timeline, orderedIds) =>
    set((state) => {
      const anchor =
        state.presetAnchorId && orderedIds.includes(state.presetAnchorId)
          ? state.presetAnchorId
          : preset.id;
      const from = orderedIds.indexOf(anchor);
      const to = orderedIds.indexOf(preset.id);
      const ids =
        from < 0 || to < 0
          ? [preset.id]
          : orderedIds.slice(Math.min(from, to), Math.max(from, to) + 1);
      return {
        selectedItem: { type: 'preset', item: preset, timeline },
        selectedPresetIds: ids,
        presetAnchorId: anchor,
      };
    }),
  selectReference: (reference, timeline, referenceIndex) =>
    set({
      selectedItem: {
        type: 'reference',
        item: reference,
        timeline,
        referenceIndex,
      },
      ...noPresets,
    }),
  selectAction: (action, timeline) =>
    set({ selectedItem: { type: 'action', item: action, timeline }, ...noPresets }),
  clearSelection: () => set({ selectedItem: null, ...noPresets }),
}));
