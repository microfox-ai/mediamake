"use client";

import { useEditorStore } from "../../../stores/editor-store";
import { useEditorUIStore } from "../../../stores/editor-ui-store";
import { TimelineContent } from "./TimelineContent";
import { PresetTimelineContent } from "./PresetTimelineContent";
import { ReferenceTimelineContent } from "./ReferenceTimelineContent";
import { TimelineOverviewContent } from "./TimelineOverviewContent";

export function EditorContent() {
  const { selectedItem } = useEditorStore();
  const { filePanelTab } = useEditorUIStore();

  // Timelines tab: focused preset/reference editors, or full overview when timeline selected
  if (filePanelTab === "timelines") {
    if (selectedItem?.type === "reference") {
      return <ReferenceTimelineContent />;
    }
    if (selectedItem?.type === "preset") {
      return <PresetTimelineContent />;
    }
    // timeline | action | null → aggregate all track sources at timeline level
    return <TimelineOverviewContent />;
  }

  // Layers tab: show the layers timeline for the current timeline (from selection)
  if (filePanelTab === "layers") {
    if (!selectedItem) {
      return (
        <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
          No item selected
        </div>
      );
    }

    if (selectedItem.type === "timeline") {
      return <TimelineContent timeline={selectedItem.item} />;
    }

    // When a preset is selected, still show the layers timeline for its parent timeline
    return <TimelineContent timeline={selectedItem.timeline} />;
  }

  // Fallback (should not normally hit): preserve previous behavior
  if (!selectedItem) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
        No item selected
      </div>
    );
  }

  if (selectedItem.type === "timeline") {
    return <TimelineContent timeline={selectedItem.item} />;
  }

  return <PresetTimelineContent />;
}
