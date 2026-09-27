/** Lightweight gate so block shortcuts yield to bottom-panel selections. */

let segmentSelectionActive = false;
let captionSelectionActive = false;

export function setSegmentSelectionActive(active: boolean) {
  segmentSelectionActive = active;
}

export function setCaptionSelectionActive(active: boolean) {
  captionSelectionActive = active;
}

export function isBottomTimelineSelectionActive(): boolean {
  return segmentSelectionActive || captionSelectionActive;
}
