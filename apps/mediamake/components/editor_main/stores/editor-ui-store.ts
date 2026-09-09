import { create } from 'zustand';

export type FilePanelTab = 'timelines' | 'layers' | 'renders';

interface EditorUIState {
  filePanelTab: FilePanelTab;
  setFilePanelTab: (tab: FilePanelTab) => void;
  editModeEnabled: boolean;
  setEditModeEnabled: (enabled: boolean) => void;
  toggleEditMode: () => void;

  /** Nested focus depth across range inputs (pause compile while > 0). */
  rangeEditDepth: number;
  /** True when committed form/timeline data has incomplete or bad ranges. */
  hasInvalidRanges: boolean;
  beginRangeEdit: () => void;
  endRangeEdit: () => void;
  setHasInvalidRanges: (invalid: boolean) => void;
  /** When true, generateOutput was skipped and should re-run after ranges settle. */
  pendingCompileAfterRanges: boolean;
  setPendingCompileAfterRanges: (pending: boolean) => void;
}

const DEFAULT_FILE_PANEL_TAB: FilePanelTab = 'timelines';
const DEFAULT_EDIT_MODE_ENABLED = true;

export const useEditorUIStore = create<EditorUIState>((set, get) => ({
  filePanelTab: DEFAULT_FILE_PANEL_TAB,
  setFilePanelTab: tab => set({ filePanelTab: tab }),
  editModeEnabled: DEFAULT_EDIT_MODE_ENABLED,
  setEditModeEnabled: enabled => set({ editModeEnabled: enabled }),
  toggleEditMode: () => set(state => ({ editModeEnabled: !state.editModeEnabled })),

  rangeEditDepth: 0,
  hasInvalidRanges: false,
  beginRangeEdit: () =>
    set(state => ({ rangeEditDepth: state.rangeEditDepth + 1 })),
  endRangeEdit: () => {
    set(state => ({
      rangeEditDepth: Math.max(0, state.rangeEditDepth - 1),
    }));
    // Flush deferred compile once all range inputs blur and ranges are valid
    queueMicrotask(() => {
      const ui = get();
      if (ui.rangeEditDepth > 0 || ui.hasInvalidRanges) return;
      if (!ui.pendingCompileAfterRanges) return;
      set({ pendingCompileAfterRanges: false });
      try {
        const { useCompileStore } = require('./compile-store');
        const compile = useCompileStore.getState();
        const timeline = compile.currentTimeline;
        if (timeline) {
          void compile.generateOutput(timeline);
        }
      } catch {
        // ignore
      }
    });
  },
  setHasInvalidRanges: invalid => set({ hasInvalidRanges: invalid }),
  pendingCompileAfterRanges: false,
  setPendingCompileAfterRanges: pending =>
    set({ pendingCompileAfterRanges: pending }),
}));
