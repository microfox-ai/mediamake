/** Lightweight gate so block shortcuts yield to bottom-panel selections.
 * Uses ref-counts so overview mode (multiple track sections) stays correct.
 */

let segmentSelectionCount = 0;
let captionSelectionCount = 0;

export function setSegmentSelectionActive(active: boolean) {
  if (active) segmentSelectionCount += 1;
  else segmentSelectionCount = Math.max(0, segmentSelectionCount - 1);
}

export function setCaptionSelectionActive(active: boolean) {
  if (active) captionSelectionCount += 1;
  else captionSelectionCount = Math.max(0, captionSelectionCount - 1);
}

export function isBottomTimelineSelectionActive(): boolean {
  return segmentSelectionCount > 0 || captionSelectionCount > 0;
}
