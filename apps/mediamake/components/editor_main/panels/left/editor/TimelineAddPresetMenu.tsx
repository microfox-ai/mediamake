"use client";

import { useEffect } from "react";
import { Plus, Library, File, PlusIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { usePresetsStore } from "../../../stores/presets-store";
import { useProjectStore, type Timeline } from "../../../stores/project-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { Preset, DatabasePreset } from "@/components/editor/presets/types";
import { cn } from "@/lib/utils";

interface TimelineAddPresetMenuProps {
    timeline: Timeline;
    isHovered: boolean;
    onOpenPresetLibrary?: () => void;
}

export function TimelineAddPresetMenu({ timeline, isHovered, onOpenPresetLibrary }: TimelineAddPresetMenuProps) {
    const {
        basicBlocksPresets,
        captionPresets,
        fetchDatabasePresets,
        isLoadingDatabase
    } = usePresetsStore();
    const { addPresetToTimeline } = useTimelineEditsStore();

    // Fetch database presets on mount
    useEffect(() => {
        fetchDatabasePresets();
    }, [fetchDatabasePresets]);

    const handleAddPreset = (preset: Preset | DatabasePreset) => {
        addPresetToTimeline(timeline.id, preset);
    };

    return (
        <>
            <div
                className={cn(
                    "relative cursor-default group flex items-center gap-2 px-2 py-0 h-8 text-xs cursor-pointer hover:bg-accent transition-colors select-none"
                )}
            >
                <div className="w-3 h-3" /> {/* Spacer for alignment */}
                <PlusIcon className="h-3 w-3" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <span className="flex-1 text-muted-foreground hover:text-foreground">
                            Add Item
                        </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="left" className="max-w-xs">
                        {/* Basic Blocks Submenu */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                Basic Blocks
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {isLoadingDatabase ? (
                                    <DropdownMenuItem disabled>
                                        Loading...
                                    </DropdownMenuItem>
                                ) : basicBlocksPresets.length > 0 ? (
                                    basicBlocksPresets.map((preset) => (
                                        <DropdownMenuItem
                                            key={preset.metadata.id}
                                            onClick={() => handleAddPreset(preset)}
                                        >
                                            {preset.metadata.title}
                                        </DropdownMenuItem>
                                    ))
                                ) : (
                                    <DropdownMenuItem disabled>
                                        No basic blocks found
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* Caption Presets Submenu */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                Caption Presets
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {isLoadingDatabase ? (
                                    <DropdownMenuItem disabled>
                                        Loading...
                                    </DropdownMenuItem>
                                ) : captionPresets.length > 0 ? (
                                    captionPresets.map((preset) => (
                                        <DropdownMenuItem
                                            key={preset.metadata.id}
                                            onClick={() => handleAddPreset(preset)}
                                        >
                                            {preset.metadata.title}
                                        </DropdownMenuItem>
                                    ))
                                ) : (
                                    <DropdownMenuItem disabled>
                                        No caption presets found
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        {/* Preset Library */}
                        <DropdownMenuItem onClick={() => onOpenPresetLibrary?.()}>
                            <Library className="h-4 w-4 mr-2" />
                            Preset Library
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    );
}
