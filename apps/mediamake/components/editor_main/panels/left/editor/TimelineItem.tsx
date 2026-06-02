"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, HashIcon, Copy, Trash2, FolderTree, Link2, Plus, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PresetItem } from "./PresetItem";
import { TimelineAddPresetMenu } from "./TimelineAddPresetMenu";
import { Preset, DatabasePreset, ReferenceItem } from "@/components/editor/presets/types";
import { PresetLibraryDialog } from "./PresetLibraryDialog";
import { Library } from "lucide-react";
import {
    getDefaultDataTypeForReferenceType,
    getDefaultValueForReferenceType,
    getDataTypeById,
    getReferenceTypeOptions,
    predefinedDataTypes,
} from "@/components/editor/presets/dataTypes";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    const [isReferencesOpen, setIsReferencesOpen] = useState(false);
    const [isBlocksOpen, setIsBlocksOpen] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [showPresetLibrary, setShowPresetLibrary] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const renameInputRef = useRef<HTMLInputElement>(null);
    const { loadedTimeline, loadProjectTimelines, currentProjectId, loadTimelineById } = useProjectStore();
    const { selectTimeline, selectReference, selectedItem } = useEditorStore();
    const { getEditedTimeline, reorderPresets, addPresetToTimeline, updateTimeline } = useTimelineEditsStore();
    const { basicBlocksPresets, captionPresets, isLoadingDatabase } = usePresetsStore();
    const session = useSession();
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

    // Get edited timeline if it exists, otherwise use original
    const editedTimeline = getEditedTimeline(timeline.id);
    const loadedOrOriginalTimeline = loadedTimeline?.id === timeline.id ? loadedTimeline : timeline;
    const displayTimeline = editedTimeline || loadedOrOriginalTimeline;

    const isLoaded = loadedTimeline?.id === timeline.id;
    const isSelected = selectedItem?.type === 'timeline' && selectedItem.item.id === timeline.id;
    const presets = displayTimeline.presets || [];
    const references = (displayTimeline.defaultData?.references || []) as ReferenceItem[];

    // Auto-focus the rename input when it becomes visible
    useEffect(() => {
        if (isRenaming) {
            requestAnimationFrame(() => {
                renameInputRef.current?.select();
            });
        }
    }, [isRenaming]);

    const ensureTimelineLoaded = async () => {
        if (loadedTimeline?.id === timeline.id) {
            return loadedTimeline;
        }

        setIsLoadingTimeline(true);
        try {
            const full = await loadTimelineById(timeline.id, session?.clientId);
            return full;
        } finally {
            setIsLoadingTimeline(false);
        }
    };

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Expand immediately so the user sees the section open with skeletons
        if (!isOpen) {
            setIsOpen(true);
        }

        const fullTimeline = await ensureTimelineLoaded();
        if (!fullTimeline) {
            return;
        }

        if (selectedItem?.type !== 'timeline' || selectedItem.item.id !== fullTimeline.id) {
            selectTimeline(fullTimeline);
        }
    };

    const closeTimeline = (e: React.MouseEvent) => {
        e.stopPropagation();
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

    const handleStartRename = () => {
        setRenameValue(displayTimeline.displayName ?? "");
        setIsRenaming(true);
    };

    const handleCommitRename = async () => {
        const trimmed = renameValue.trim();
        if (!trimmed || trimmed === displayTimeline.displayName) {
            setIsRenaming(false);
            return;
        }
        updateTimeline(timeline.id, { displayName: trimmed });
        setIsRenaming(false);
        // Persist to server in the background
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session?.clientId) headers["x-client-id"] = session.clientId;
            await fetch("/api/project/timeline", {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    timeline: {
                        ...(getEditedTimeline(timeline.id) || displayTimeline),
                        displayName: trimmed,
                    },
                }),
            });
        } catch (err) {
            console.error("Failed to save timeline rename", err);
        }
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") { e.preventDefault(); handleCommitRename(); }
        if (e.key === "Escape") { setIsRenaming(false); }
    };

    const handleAddPreset = (preset: Preset | DatabasePreset) => {
        addPresetToTimeline(timeline.id, preset);
    };

    const upsertReferences = (nextReferences: ReferenceItem[]) => {
        updateTimeline(timeline.id, {
            defaultData: {
                ...(displayTimeline.defaultData || {}),
                references: nextReferences,
            },
        });
    };

    const createNewReference = (type: ReferenceItem["type"]) => {
        const referencesList = [...references];
        const nextIndex = referencesList.length + 1;
        const defaultDataType = getDefaultDataTypeForReferenceType(type);
        const newReference: ReferenceItem = {
            key: `reference_${nextIndex}`,
            type,
            dataType: defaultDataType?.id,
            value: getDefaultValueForReferenceType(type),
        };
        const nextReferences = [...referencesList, newReference];
        upsertReferences(nextReferences);
        setIsReferencesOpen(true);
        selectReference(newReference, displayTimeline, nextReferences.length - 1);
    };

    const duplicateReference = (referenceIndex: number) => {
        const sourceReference = references[referenceIndex] as ReferenceItem | undefined;
        if (!sourceReference) {
            return;
        }
        const duplicate: ReferenceItem = {
            ...JSON.parse(JSON.stringify(sourceReference)),
            key: sourceReference.key ? `${sourceReference.key}_copy` : `reference_${referenceIndex + 1}_copy`,
        };
        const nextReferences = [...references];
        nextReferences.splice(referenceIndex + 1, 0, duplicate);
        upsertReferences(nextReferences);
        selectReference(duplicate, displayTimeline, referenceIndex + 1);
    };

    const removeReference = (referenceIndex: number) => {
        const sourceReference = references[referenceIndex];
        if (!sourceReference) {
            return;
        }
        const nextReferences = references.filter((_, index: number) => index !== referenceIndex);
        upsertReferences(nextReferences);
        selectTimeline(displayTimeline);
    };

    const createReferenceFromDataType = (dataTypeId: string) => {
        const selectedDataType = getDataTypeById(dataTypeId);
        const referenceType: ReferenceItem["type"] =
            selectedDataType?.referenceType || "object";

        const referencesList = [...references];
        const nextIndex = referencesList.length + 1;
        const newReference: ReferenceItem = {
            key: `${dataTypeId}_${nextIndex}`,
            type: referenceType,
            dataType: dataTypeId,
            value: getDefaultValueForReferenceType(referenceType),
        };

        const nextReferences = [...referencesList, newReference];
        upsertReferences(nextReferences);
        setIsReferencesOpen(true);
        selectReference(newReference, displayTimeline, nextReferences.length - 1);
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

    const referenceTypeOptions = getReferenceTypeOptions();

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
                                    <HashIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                    {isRenaming ? (
                                        <Input
                                            ref={renameInputRef}
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={handleCommitRename}
                                            onKeyDown={handleRenameKeyDown}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-5 flex-1 min-w-0 text-xs px-1 py-0 border-primary"
                                        />
                                    ) : (
                                        <span className="flex-1 truncate">
                                            {displayTimeline.displayName ?? "Untitled"}
                                        </span>
                                    )}
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={handleStartRename}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Rename
                                </ContextMenuItem>
                                <ContextMenuItem onClick={handleDuplicateTimeline}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate Timeline
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuSub>
                                    <ContextMenuSubTrigger>
                                        <Plus className="h-4 w-4 mr-2" />
                                        New Reference
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                        {referenceTypeOptions.map((option) => (
                                            <ContextMenuItem
                                                key={option.value}
                                                onClick={() => createNewReference(option.value)}
                                            >
                                                {option.label}
                                            </ContextMenuItem>
                                        ))}
                                    </ContextMenuSubContent>
                                </ContextMenuSub>

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
                        {!isLoadingTimeline && (
                            <Collapsible
                                open={isReferencesOpen}
                                onOpenChange={setIsReferencesOpen}
                            >
                                <ContextMenu>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            onClick={() => setIsReferencesOpen((prev) => !prev)}
                                            className="flex items-center gap-2 px-2 h-8 text-xs cursor-pointer hover:bg-accent transition-colors select-none"
                                        >
                                            {isReferencesOpen ? (
                                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                            )}
                                            <FolderTree className="h-3 w-3 text-muted-foreground" />
                                            <span className="flex-1">References</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {references.length}
                                            </span>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuSub>
                                            <ContextMenuSubTrigger>
                                                <Plus className="h-4 w-4 mr-2" />
                                                New Reference
                                            </ContextMenuSubTrigger>
                                            <ContextMenuSubContent>
                                                {referenceTypeOptions.map((option) => (
                                                    <ContextMenuItem
                                                        key={option.value}
                                                        onClick={() => createNewReference(option.value)}
                                                    >
                                                        {option.label}
                                                    </ContextMenuItem>
                                                ))}
                                            </ContextMenuSubContent>
                                        </ContextMenuSub>
                                    </ContextMenuContent>
                                </ContextMenu>
                                <CollapsibleContent>
                                    <div className="ml-5 border-l space-y-1 py-1">
                                        {references.length > 0 ? (
                                            references.map((reference, index: number) => (
                                                <ContextMenu key={`${reference.key || "reference"}-${index}`}>
                                                    <ContextMenuTrigger asChild>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                selectReference(reference, displayTimeline, index);
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-2 px-2 h-7 text-xs cursor-pointer hover:bg-accent transition-colors select-none",
                                                                selectedItem?.type === "reference" &&
                                                                    selectedItem.timeline.id === displayTimeline.id &&
                                                                    selectedItem.referenceIndex === index
                                                                    ? "bg-blue-100 text-blue-950"
                                                                    : "text-muted-foreground",
                                                            )}
                                                        >
                                                            <Link2 className="h-3 w-3" />
                                                            <span className="truncate">
                                                                {reference.key || `reference_${index + 1}`}
                                                            </span>
                                                        </div>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent>
                                                        <ContextMenuItem onClick={() => duplicateReference(index)}>
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            Duplicate
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            onClick={() => removeReference(index)}
                                                            variant="destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </ContextMenuItem>
                                                    </ContextMenuContent>
                                                </ContextMenu>
                                            ))
                                        ) : (
                                            <div className="px-2 py-1 text-[11px] text-muted-foreground">
                                                No references
                                            </div>
                                        )}

                                        <div className="px-1 pt-1">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="flex items-center gap-2 px-2 h-7 text-xs cursor-pointer hover:bg-accent rounded-sm transition-colors select-none text-muted-foreground">
                                                        <Plus className="h-3 w-3" />
                                                        <span>Add Data</span>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" side="left">
                                                    {predefinedDataTypes.length > 0 ? (
                                                        predefinedDataTypes.map((dataType) => (
                                                            <DropdownMenuItem
                                                                key={dataType.id}
                                                                onClick={() => createReferenceFromDataType(dataType.id)}
                                                            >
                                                                {dataType.title}
                                                            </DropdownMenuItem>
                                                        ))
                                                    ) : (
                                                        <DropdownMenuItem disabled>
                                                            No data types available
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {isLoadingTimeline && presets.length === 0 && (
                            <div className="space-y-1 py-2 pl-2">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 px-2 py-1"
                                    >
                                        <Skeleton className="h-4 w-4 rounded" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isLoadingTimeline && presets.length > 1 && (
                            <Collapsible
                                open={isBlocksOpen}
                                onOpenChange={setIsBlocksOpen}
                            >
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center gap-2 px-2 h-8 text-xs cursor-pointer hover:bg-accent transition-colors select-none">
                                        {isBlocksOpen ? (
                                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        <FolderTree className="h-3 w-3 text-muted-foreground" />
                                        <span className="flex-1">Blocks</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {Math.max(presets.length - 1, 0)}
                                        </span>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="ml-5 border-l space-y-1 py-1">
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

                                        <TimelineAddPresetMenu
                                            timeline={timeline}
                                            isHovered={isHovered}
                                            onOpenPresetLibrary={() => setShowPresetLibrary(true)}
                                            label="Add Block"
                                        />
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {!isLoadingTimeline && presets.length === 1 && (
                            <Collapsible
                                open={isBlocksOpen}
                                onOpenChange={setIsBlocksOpen}
                            >
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center gap-2 px-2 h-8 text-xs cursor-pointer hover:bg-accent transition-colors select-none">
                                        {isBlocksOpen ? (
                                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        <FolderTree className="h-3 w-3 text-muted-foreground" />
                                        <span className="flex-1">Blocks</span>
                                        <span className="text-[10px] text-muted-foreground">0</span>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="ml-5 border-l py-1">
                                        <div className="text-xs text-muted-foreground px-2 py-1">
                                            First preset is configured in Timeline Properties
                                        </div>
                                        <TimelineAddPresetMenu
                                            timeline={timeline}
                                            isHovered={isHovered}
                                            onOpenPresetLibrary={() => setShowPresetLibrary(true)}
                                            label="Add Block"
                                        />
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}
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