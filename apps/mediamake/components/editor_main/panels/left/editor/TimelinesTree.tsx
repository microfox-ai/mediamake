"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectStore } from "../../../stores/project-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { TimelineItem } from "./TimelineItem";

export function TimelinesTree() {
    const { timelines } = useProjectStore();
    // Subscribe to edits store to trigger re-renders when edits change
    const editedTimelines = useTimelineEditsStore(state => state.editedTimelines);

    return (
        <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-1 space-y-1">
                {timelines.map((timeline) => (
                    <TimelineItem key={timeline.id} timeline={timeline} />
                ))}
            </div>
        </ScrollArea>
    );
}
