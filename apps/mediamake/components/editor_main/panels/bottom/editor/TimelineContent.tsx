"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { Timeline } from "../../../stores/project-store";

interface TimelineContentProps {
    timeline: Timeline;
}

export function TimelineContent({ timeline }: TimelineContentProps) {
    return (
        <ScrollArea className="flex-1">
            <div className="p-4">
                <div className="h-32 bg-muted/20 rounded-md flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Timeline tracks will appear here</p>
                </div>
            </div>
        </ScrollArea>
    );
}
