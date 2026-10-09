"use client";

import { create } from "zustand";

/** Caption block selected on the bottom timeline, shared with the smart tab. */
export type CaptionTrackSelection = {
  timelineId: string;
  referenceIndex: number;
  kind: "line" | "word";
  lineIdx: number;
  wordIdx?: number;
};

type CaptionTrackSelectionState = {
  selection: CaptionTrackSelection | null;
  setSelection: (selection: CaptionTrackSelection | null) => void;
};

export const useCaptionTrackSelection = create<CaptionTrackSelectionState>(
  (set) => ({
    selection: null,
    setSelection: (selection) => set({ selection }),
  }),
);

export const PREV_CAPTION_SHORTCUT = "⌥←";
export const NEXT_CAPTION_SHORTCUT = "⌥→";

export function captionEndSec(caption: {
  absoluteStart?: number;
  absoluteEnd?: number;
  start?: number;
  end?: number;
}): number {
  const start = Number(caption?.absoluteStart ?? caption?.start ?? 0) || 0;
  let end = Number(caption?.absoluteEnd ?? caption?.end ?? start) || start;
  if (end <= start) end = start + 0.05;
  return end;
}
