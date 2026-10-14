"use client";

import { create } from "zustand";
import { claimBlockSelection } from "@/components/editor_main/panels/bottom/editor/timeline-block-selection";
import { useCaptionTrackSelection } from "./caption-track-selection";

/** A range or clip chosen on the bottom timeline, under its preset. */
export type TimelineBlockFocus = {
  kind: "range" | "clip";
  timelineId: string;
  presetId: string;
  label: string;
  blockKey: string;
};

type TimelineBlockFocusState = {
  focus: TimelineBlockFocus | null;
  setFocus: (focus: TimelineBlockFocus | null) => void;
};

export const useTimelineBlockFocus = create<TimelineBlockFocusState>((set) => ({
  focus: null,
  setFocus: (focus) => set({ focus }),
}));

/** Drop caption and range/clip selection when the primary selection changes. */
export function clearTimelineDepth() {
  if (useCaptionTrackSelection.getState().selection) {
    useCaptionTrackSelection.getState().setSelection(null);
  }
  if (useTimelineBlockFocus.getState().focus) {
    useTimelineBlockFocus.getState().setFocus(null);
  }
}

/** Select one range or clip and release whatever block was selected before. */
export function focusTimelineBlock(ownerId: string, focus: TimelineBlockFocus) {
  claimBlockSelection(ownerId, () => {
    const current = useTimelineBlockFocus.getState().focus;
    if (current?.blockKey === focus.blockKey && current.kind === focus.kind) {
      useTimelineBlockFocus.getState().setFocus(null);
    }
  });
  if (useCaptionTrackSelection.getState().selection) {
    useCaptionTrackSelection.getState().setSelection(null);
  }
  useTimelineBlockFocus.getState().setFocus(focus);
}
