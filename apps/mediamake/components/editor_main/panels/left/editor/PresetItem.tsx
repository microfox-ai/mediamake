"use client";

import { useState } from "react";
import { File, Eye, EyeOff, Play, GripVertical, Copy, Trash2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { useCompileStore } from "../../../stores/compile-store";
import { useProjectStore } from "../../../stores/project-store";
import { type Timeline } from "../../../stores/project-store";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PresetItemProps {
    preset: NonNullable<Timeline['presets']>[number];
    timeline: Timeline;
    index: number;
}

export function PresetItem({
    preset,
    timeline,
    index
}: PresetItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const { selectPreset, selectedItem } = useEditorStore();
    const { getEditedTimeline, updatePresetDisabled, removePreset, duplicatePreset, reorderPresets } = useTimelineEditsStore();
    const { hasOverridesForPresetItem, clearOverridesForPresetItem } = useLayerStateStore();
    const { generateOutput } = useCompileStore();
    const { loadedTimeline } = useProjectStore();

    // Get edited timeline if it exists, otherwise use original
    const editedTimeline = getEditedTimeline(timeline.id);
    const displayTimeline = editedTimeline || timeline;

    // Get the edited preset from the display timeline
    const displayPreset = displayTimeline.presets?.find(p => p.id === preset.id) || preset;

    const isSelected = selectedItem?.type === 'preset' &&
        selectedItem.item.id === preset.id &&
        selectedItem.timeline.id === timeline.id;

    // Sortable functionality
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: preset.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        selectPreset(displayPreset, displayTimeline);
    };

    const handleToggleDisabled = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newDisabled = !displayPreset.disabled;
        updatePresetDisabled(timeline.id, preset.id, newDisabled);

        // Get updated timeline after toggle
        const updatedTimeline = getEditedTimeline(timeline.id) || timeline;
        const updatedPreset = updatedTimeline.presets?.find(p => p.id === preset.id);

        // Check if preset metadata allows auto-compile
        // Auto-compile if disableautocompile is false or doesn't exist
        let shouldAutoCompile = true; // Default to auto-compile

        // Try to get metadata from updated preset first
        if (updatedPreset?.presetInfo?.metadata) {
            const metadata = updatedPreset.presetInfo.metadata as any; // Type assertion for custom property
            shouldAutoCompile = metadata.disableautocompile !== true;
        } else if (loadedTimeline) {
            // If preset info is not loaded, try to get it from compile store
            const { presetInfoCache } = useCompileStore.getState();
            const presetInfo = presetInfoCache.get(preset.presetId);
            if (presetInfo?.preset?.metadata) {
                const metadata = presetInfo.preset.metadata as any; // Type assertion for custom property
                shouldAutoCompile = metadata.disableautocompile !== true;
            }
        }

        if (shouldAutoCompile && loadedTimeline) {
            // Get the fully updated timeline
            const finalTimeline = getEditedTimeline(loadedTimeline.id) || loadedTimeline;
            generateOutput(finalTimeline);
        }
    };

    const handleRegenerate = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // TODO: In the future, this should regenerate only this specific preset's output
        // For now, regenerate the entire timeline output
        if (loadedTimeline) {
            const finalTimeline = getEditedTimeline(loadedTimeline.id) || loadedTimeline;
            generateOutput(finalTimeline);
        }
    };

    const handleRevertToPreset = () => {
        clearOverridesForPresetItem(preset.id);
        if (loadedTimeline) {
            const finalTimeline = getEditedTimeline(loadedTimeline.id) || loadedTimeline;
            generateOutput(finalTimeline);
        }
    };

    const handleDuplicate = () => {
        duplicatePreset(timeline.id, preset.id);
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${displayPreset.label}"?`)) {
            removePreset(timeline.id, preset.id);
        }
    };

    const handleMoveUp = () => {
        // Can't move up if it's the first preset (index 0) or if it's the second preset (index 1, since first is special)
        if (index <= 1) return;
        reorderPresets(timeline.id, index, index - 1);
    };

    const presets = displayTimeline.presets || [];

    const handleMoveDown = () => {
        if (index >= presets.length - 1) return;
        reorderPresets(timeline.id, index, index + 1);
    };

    const canMoveUp = index > 1; // Can't move first preset (index 0) or second preset (index 1) up
    const canMoveDown = index < presets.length - 1;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    ref={setNodeRef}
                    style={style}
                    onClick={handleClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={cn(
                        "relative cursor-default group flex items-center gap-2 px-2 py-0 h-8 text-xs cursor-pointer hover:bg-accent transition-colors select-none",
                        isSelected && "bg-blue-100 hover:bg-blue-100"
                    )}
                >
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-muted rounded"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <File className="h-3 w-3" />
                    <span className={cn("flex-1 min-w-0 truncate",
                        displayPreset.disabled ? "line-through" : "",
                        (!isSelected || displayPreset.disabled) ? "text-muted-foreground" : isSelected ? "text-black" : "text-foreground")}>
                        {displayPreset.label}
                    </span>
                    {hasOverridesForPresetItem(displayPreset.id) && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="shrink-0 text-[10px] text-amber-600 font-medium" title="Layer was modified in preview">
                                    Modified
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Layer was moved or resized in preview; not in sync with preset</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {/* Icons that appear on hover */}
                    {isHovered ? (
                        <div className="flex items-center h-full gap-0 transition-opacity">
                            {/* Regenerate Preset (Play) */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        onClick={handleRegenerate}
                                        className="p-0 px-2 h-full flex items-center justify-center text-foreground hover:text-primary hover:bg-black/10 cursor-default"
                                    >
                                        <Play className="h-3 w-3" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Regenerate only this preset</p>
                                </TooltipContent>
                            </Tooltip>

                            {/* Toggle Preset Layer (Eye/EyeOff) */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        onClick={handleToggleDisabled}
                                        className={cn(
                                            "p-0 px-2 h-full flex items-center justify-center hover:bg-black/10",
                                            displayPreset.disabled
                                                ? "text-foreground hover:text-muted-foreground cursor-default"
                                                : "text-foreground hover:text-muted-foreground cursor-default"
                                        )}
                                    >
                                        {displayPreset.disabled ? (
                                            <EyeOff className="h-3 w-3" />
                                        ) : (
                                            <Eye className="h-3 w-3" />
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Toggle preset layer</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 transition-opacity pr-2">
                            {displayPreset.disabled && (
                                <EyeOff className="h-3 w-3" />
                            )}
                        </div>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                {hasOverridesForPresetItem(displayPreset.id) && (
                    <ContextMenuItem onClick={handleRevertToPreset}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Revert to preset
                    </ContextMenuItem>
                )}
                <ContextMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Block
                </ContextMenuItem>
                <ContextMenuItem onClick={handleDelete} variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Block
                </ContextMenuItem>
                <ContextMenuItem onClick={handleMoveUp} disabled={!canMoveUp}>
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Move Up
                </ContextMenuItem>
                <ContextMenuItem onClick={handleMoveDown} disabled={!canMoveDown}>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Move Down
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
