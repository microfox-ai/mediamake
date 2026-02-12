import { create } from 'zustand';

interface ResizableGridState {
  // Horizontal panels (FilterTree, Preview, Props) - sizes in percentage
  leftPanelSize: number; // FilterTree - default 25%
  centerPanelSize: number; // Preview - default 50%
  rightPanelSize: number; // Props - default 25%

  // Vertical panel (Timeline) - size in percentage of vertical space
  timelinePanelSize: number; // Timeline - default 20%

  // Actions
  setLeftPanelSize: (size: number) => void;
  setCenterPanelSize: (size: number) => void;
  setRightPanelSize: (size: number) => void;
  setTimelinePanelSize: (size: number) => void;
  resetPanelSizes: () => void;
  // Helper to set all three horizontal panel sizes at once
  setHorizontalPanelSizes: (
    left: number,
    center: number,
    right: number,
  ) => void;
}

const DEFAULT_LEFT_SIZE = 20;
const DEFAULT_CENTER_SIZE = 50;
const DEFAULT_RIGHT_SIZE = 30;
const DEFAULT_TIMELINE_SIZE = 30; // 30% of vertical space

export const useResizableGridStore = create<ResizableGridState>(set => ({
  // Initial state
  leftPanelSize: DEFAULT_LEFT_SIZE,
  centerPanelSize: DEFAULT_CENTER_SIZE,
  rightPanelSize: DEFAULT_RIGHT_SIZE,
  timelinePanelSize: DEFAULT_TIMELINE_SIZE,

  // Actions
  setLeftPanelSize: size => set({ leftPanelSize: size }),
  setCenterPanelSize: size => set({ centerPanelSize: size }),
  setRightPanelSize: size => set({ rightPanelSize: size }),
  setTimelinePanelSize: size => set({ timelinePanelSize: size }),
  resetPanelSizes: () =>
    set({
      leftPanelSize: DEFAULT_LEFT_SIZE,
      centerPanelSize: DEFAULT_CENTER_SIZE,
      rightPanelSize: DEFAULT_RIGHT_SIZE,
      timelinePanelSize: DEFAULT_TIMELINE_SIZE,
    }),
  // Helper to set all three horizontal panel sizes at once
  setHorizontalPanelSizes: (left, center, right) =>
    set({
      leftPanelSize: left,
      centerPanelSize: center,
      rightPanelSize: right,
    }),
}));

// Export helper functions that can be accessed from other stores
// These get the store state directly without using the hook
export const resizableGridHelpers = {
  setHorizontalPanelSizes: (left: number, center: number, right: number) => {
    useResizableGridStore
      .getState()
      .setHorizontalPanelSizes(left, center, right);
  },
  setLeftPanelSize: (size: number) => {
    useResizableGridStore.getState().setLeftPanelSize(size);
  },
  setCenterPanelSize: (size: number) => {
    useResizableGridStore.getState().setCenterPanelSize(size);
  },
  setRightPanelSize: (size: number) => {
    useResizableGridStore.getState().setRightPanelSize(size);
  },
  setTimelinePanelSize: (size: number) => {
    useResizableGridStore.getState().setTimelinePanelSize(size);
  },
  resetPanelSizes: () => {
    useResizableGridStore.getState().resetPanelSizes();
  },
};
