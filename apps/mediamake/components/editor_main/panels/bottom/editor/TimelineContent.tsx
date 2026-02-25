"use client";

import type { Timeline } from "../../../stores/project-store";
import { useCompileStore } from "../../../stores/compile-store";
import { LayeredTimeline } from "./LayeredTimeline";

interface TimelineContentProps {
    timeline: Timeline;
}

export function TimelineContent({ timeline }: TimelineContentProps) {
    const { calculatedMetadata } = useCompileStore();

    if (!calculatedMetadata) {
        return (
            <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
                Double-click a timeline in the left panel to load and see layers here.
            </div>
        );
    }

    return <LayeredTimeline />;
}
