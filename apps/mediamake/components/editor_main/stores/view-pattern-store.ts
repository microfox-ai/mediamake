import { create } from 'zustand';
import { resizableGridHelpers } from './resizable-grid-store';

export type ViewPattern = 'make' | 'media' | 'edit' | 'render';

// Default panel sizes for each view pattern
// Format: [leftPanelSize, centerPanelSize, rightPanelSize]
const PATTERN_PANEL_SIZES: Record<ViewPattern, [number, number, number]> = {
  make: [20, 50, 30],
  media: [25, 50, 25],
  edit: [20, 60, 20],
  render: [15, 70, 15],
};

interface ViewPatternState {
  currentPattern: ViewPattern;
  setPattern: (pattern: ViewPattern) => void;
}

const DEFAULT_PATTERN: ViewPattern = 'edit';

export const useViewPatternStore = create<ViewPatternState>(set => ({
  currentPattern: DEFAULT_PATTERN,
  setPattern: pattern => {
    set({ currentPattern: pattern });
    // Update panel sizes when switching patterns
    const [left, center, right] = PATTERN_PANEL_SIZES[pattern];
    resizableGridHelpers.setHorizontalPanelSizes(left, center, right);
  },
}));
