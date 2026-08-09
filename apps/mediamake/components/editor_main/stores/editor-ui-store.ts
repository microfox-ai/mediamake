import { create } from 'zustand';

export type FilePanelTab = 'timelines' | 'layers' | 'renders';

interface EditorUIState {
  filePanelTab: FilePanelTab;
  setFilePanelTab: (tab: FilePanelTab) => void;
  editModeEnabled: boolean;
  setEditModeEnabled: (enabled: boolean) => void;
  toggleEditMode: () => void;
}

const DEFAULT_FILE_PANEL_TAB: FilePanelTab = 'timelines';
const DEFAULT_EDIT_MODE_ENABLED = true;

export const useEditorUIStore = create<EditorUIState>(set => ({
  filePanelTab: DEFAULT_FILE_PANEL_TAB,
  setFilePanelTab: tab => set({ filePanelTab: tab }),
  editModeEnabled: DEFAULT_EDIT_MODE_ENABLED,
  setEditModeEnabled: enabled => set({ editModeEnabled: enabled }),
  toggleEditMode: () => set(state => ({ editModeEnabled: !state.editModeEnabled })),
}));
