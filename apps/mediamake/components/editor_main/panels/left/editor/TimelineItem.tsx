"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, HashIcon, Copy, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { useProjectStore, type Timeline } from "../../../stores/project-store";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { usePresetsStore } from "../../../stores/presets-store";
import { useSession } from "@/components/session-provider";
import { cn } from "@/lib/utils";
import { PresetItem } from "./PresetItem";
import { TimelineAddPresetMenu } from "./TimelineAddPresetMenu";
import { Preset, DatabasePreset } from "@/components/editor/presets/types";
import { PresetLibraryDialog } from "./PresetLibraryDialog";
import { Library } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface TimelineItemProps {
    timeline: Timeline;
}

export function TimelineItem({ timeline }: TimelineItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [showPresetLibrary, setShowPresetLibrary] = useState(false);
    const { loadTimeline, loadedTimeline, loadProjectTimelines, currentProjectId } = useProjectStore();
    const { selectTimeline, selectedItem } = useEditorStore();
    const { getEditedTimeline, reorderPresets, addPresetToTimeline } = useTimelineEditsStore();
    const { basicBlocksPresets, captionPresets, isLoadingDatabase } = usePresetsStore();
    const session = useSession();

    // Get edited timeline if it exists, otherwise use original
    const editedTimeline = getEditedTimeline(timeline.id);
    const displayTimeline = editedTimeline || timeline;

    const isLoaded = loadedTimeline?.id === timeline.id;
    const isSelected = selectedItem?.type === 'timeline' && selectedItem.item.id === timeline.id;
    const presets = displayTimeline.presets || [];

    const handleClick = (e: React.MouseEvent) => {
        if (isOpen) {
            if (loadedTimeline?.id != timeline.id) {
                loadTimeline(timeline);
            }
            if (selectedItem?.type != 'timeline' || selectedItem.item.id !== timeline.id) {
                selectTimeline(timeline);
            }
            return;
        }
        e.stopPropagation();
        loadTimeline(timeline);
        selectTimeline(timeline);
        setIsOpen(_open => !_open);
    };

    const closeTimeline = () => {
        setIsOpen(false);
    };

    const handleDuplicateTimeline = async () => {
        if (!currentProjectId) {
            alert("Please create or load a project first");
            return;
        }

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.clientId) {
                headers['x-client-id'] = session.clientId;
            }
            const response = await fetch("/api/project/timeline", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    projectId: currentProjectId,
                    sourceTimelineId: timeline.id,
                    displayName: `${displayTimeline.displayName} (Copy)`,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to duplicate timeline");
            }

            // Reload timelines
            await loadProjectTimelines(currentProjectId, session?.clientId);
        } catch (error) {
            console.error("Error duplicating timeline:", error);
            alert(error instanceof Error ? error.message : "Failed to duplicate timeline. Please try again.");
        }
    };

    const handleDeleteTimeline = async () => {
        if (!confirm(`Are you sure you want to delete "${displayTimeline.displayName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/project/timeline?id=${timeline.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete timeline");
            }

            // Reload timelines
            if (currentProjectId) {
                await loadProjectTimelines(currentProjectId);
            }
        } catch (error) {
            console.error("Error deleting timeline:", error);
            alert("Failed to delete timeline. Please try again.");
        }
    };

    const handleAddPreset = (preset: Preset | DatabasePreset) => {
        addPresetToTimeline(timeline.id, preset);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id && presets) {
            const oldIndex = presets.findIndex((preset) => preset.id === active.id);
            const newIndex = presets.findIndex((preset) => preset.id === over?.id);

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex > 0 && newIndex > 0) {
                // Only allow reordering of presets after the first one (index > 0)
                reorderPresets(timeline.id, oldIndex, newIndex);
            }
        }
    }

    return (
        <>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className="relative cursor-default group"
                    >
                        <ContextMenu>
                            <ContextMenuTrigger asChild>
                                <div
                                    onClick={handleClick}
                                    className={cn(
                                        "h-8 flex items-center gap-2 px-2 text-sm rounded-sm cursor-pointer hover:bg-accent transition-colors select-none w-full",
                                        isLoaded && "bg-accent text-accent-foreground",
                                        isSelected && "bg-blue-100 hover:bg-blue-100"
                                    )}
                                >
                                    {isOpen ? (
                                        <ChevronDown
                                            onClick={closeTimeline}
                                            className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <HashIcon className="h-3 w-3 text-muted-foreground" />
                                    <span className="flex-1">
                                        {displayTimeline.displayName ?? "Untitled"}
                                    </span>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={handleDuplicateTimeline}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate Timeline
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                {/* Add Basic Block Submenu */}
                                <ContextMenuSub>
                                    <ContextMenuSubTrigger>
                                        Add Basic Block
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                        {isLoadingDatabase ? (
                                            <ContextMenuItem disabled>
                                                Loading...
                                            </ContextMenuItem>
                                        ) : basicBlocksPresets.length > 0 ? (
                                            basicBlocksPresets.map((preset) => (
                                                <ContextMenuItem
                                                    key={preset.metadata.id}
                                                    onClick={() => handleAddPreset(preset)}
                                                >
                                                    {preset.metadata.title}
                                                </ContextMenuItem>
                                            ))
                                        ) : (
                                            <ContextMenuItem disabled>
                                                No basic blocks found
                                            </ContextMenuItem>
                                        )}
                                    </ContextMenuSubContent>
                                </ContextMenuSub>

                                {/* Add Caption Block Submenu */}
                                <ContextMenuSub>
                                    <ContextMenuSubTrigger>
                                        Add Caption Block
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                        {isLoadingDatabase ? (
                                            <ContextMenuItem disabled>
                                                Loading...
                                            </ContextMenuItem>
                                        ) : captionPresets.length > 0 ? (
                                            captionPresets.map((preset) => (
                                                <ContextMenuItem
                                                    key={preset.metadata.id}
                                                    onClick={() => handleAddPreset(preset)}
                                                >
                                                    {preset.metadata.title}
                                                </ContextMenuItem>
                                            ))
                                        ) : (
                                            <ContextMenuItem disabled>
                                                No caption presets found
                                            </ContextMenuItem>
                                        )}
                                    </ContextMenuSubContent>
                                </ContextMenuSub>

                                {/* Add From Library */}
                                <ContextMenuItem onClick={() => setShowPresetLibrary(true)}>
                                    <Library className="h-4 w-4 mr-2" />
                                    Add From Library
                                </ContextMenuItem>

                                <ContextMenuSeparator />

                                <ContextMenuItem
                                    onClick={handleDeleteTimeline}
                                    variant="destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Timeline
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="ml-4 space-y-1 border-l">
                        {presets.length > 1 && (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={presets.slice(1).map(preset => preset.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {presets.slice(1).map((preset, index) => (
                                        <PresetItem
                                            key={`${preset.presetId}-${index + 1}`}
                                            preset={preset}
                                            timeline={timeline}
                                            index={index + 1}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                        {presets.length === 1 && (
                            <div className="text-xs text-muted-foreground px-2 py-1">
                                First preset is configured in Timeline Properties
                            </div>
                        )}
                        {/* Add Item */}
                        <TimelineAddPresetMenu
                            timeline={timeline}
                            isHovered={isHovered}
                            onOpenPresetLibrary={() => setShowPresetLibrary(true)}
                        />
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Preset Library Dialog */}
            <PresetLibraryDialog
                open={showPresetLibrary}
                onOpenChange={setShowPresetLibrary}
                timeline={displayTimeline}
                onAddPreset={handleAddPreset}
            />
        </>
    );
}
