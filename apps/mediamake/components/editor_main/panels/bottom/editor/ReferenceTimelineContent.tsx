"use client";

import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import type { ReferenceItem } from "@/components/editor/presets/types";
import { CaptionsReferenceTimeline } from "./CaptionsReferenceTimeline";

/**
 * Routes the bottom-panel timeline view when a reference is selected.
 * Each reference type can plug in its own timeline editor here.
 */
export function ReferenceTimelineContent() {
  const { selectedItem } = useEditorStore();
  const timelineId =
    selectedItem?.type === "reference" ? selectedItem.timeline.id : null;
  const editedTimeline = useTimelineEditsStore((s) =>
    timelineId ? s.editedTimelines.get(timelineId) : undefined,
  );

  if (!selectedItem || selectedItem.type !== "reference") {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          Select a reference in the left panel to edit its timeline.
        </p>
      </div>
    );
  }

  const { item: reference, timeline, referenceIndex } = selectedItem;
  const effectiveTimeline = editedTimeline || timeline;
  const liveReference =
    (effectiveTimeline.defaultData?.references?.[referenceIndex] as
      | ReferenceItem
      | undefined) || reference;

  if (liveReference.type === "captions") {
    return (
      <CaptionsReferenceTimeline
        reference={liveReference}
        referenceIndex={referenceIndex}
        timelineId={timeline.id}
      />
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <p className="text-sm text-muted-foreground">
        Timeline editing for{" "}
        <span className="font-medium text-foreground">{liveReference.type}</span>{" "}
        references is not available yet. Captions references support word/line
        timing.
      </p>
    </div>
  );
}
