"use client";

import { PlusIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { Preset, DatabasePreset } from "@/components/editor/presets/types";
import { cn } from "@/lib/utils";
import { AddBlockDropdownMenuItems } from "./AddBlockMenu";
import { Timeline } from "../../../stores/project-store";

interface TimelineAddPresetMenuProps {
    timeline: Timeline;
    isHovered: boolean;
    onOpenPresetLibrary?: () => void;
    label?: string;
}

export function TimelineAddPresetMenu({
    timeline,
    onOpenPresetLibrary,
    label = "Add Item",
}: TimelineAddPresetMenuProps) {
    const { addPresetToTimeline } = useTimelineEditsStore();

    const handleAddPreset = (preset: Preset | DatabasePreset) => {
        addPresetToTimeline(timeline.id, preset);
    };

    return (
        <div
            className={cn(
                "relative group flex items-center gap-2 px-2 py-0 h-8 text-sm cursor-pointer hover:bg-accent transition-colors select-none",
            )}
        >
            <div className="w-2.5 h-2.5" />
            <PlusIcon className="h-3.5 w-3.5" />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <span className="flex-1 text-muted-foreground hover:text-foreground">
                        {label}
                    </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right" className="w-56">
                    <AddBlockDropdownMenuItems
                        onAdd={handleAddPreset}
                        onOpenLibrary={onOpenPresetLibrary}
                    />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
