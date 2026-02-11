import { create } from 'zustand';

export type FilePanelTab = 'timelines' | 'layers';

interface EditorUIState {
  filePanelTab: FilePanelTab;
  setFilePanelTab: (tab: FilePanelTab) => void;
}

const DEFAULT_FILE_PANEL_TAB: FilePanelTab = 'timelines';

export const useEditorUIStore = create<EditorUIState>(set => ({
  filePanelTab: DEFAULT_FILE_PANEL_TAB,
  setFilePanelTab: tab => set({ filePanelTab: tab }),
}));
