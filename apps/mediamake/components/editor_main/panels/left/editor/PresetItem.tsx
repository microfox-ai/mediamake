"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Copy, Trash2, ArrowUp, ArrowDown, RotateCcw, ClipboardCopy, ClipboardPaste, Group } from "lucide-react";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { useCompileStore } from "../../../stores/compile-store";
import { useProjectStore } from "../../../stores/project-store";
import { type Timeline } from "../../../stores/project-store";
import {
    altShortcutLabel,
    copySelectedItem,
    copySelectedProps,
    deleteSelectedItem,
    duplicateSelectedItem,
    modShortcutLabel,
    moveSelectedItem,
    pasteClipboardItem,
    pasteSelectedProps,
    useBlockClipboardStore,
} from "../../../stores/block-clipboard-store";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AddBlockContextMenuItems, BlocksHeaderAddButton } from "./AddBlockMenu";
import { BlockIcon } from "./block-icon";
import { groupSelectedBlocks } from "./group-selection";
import { canGroupPresets } from "@/components/editor_main/timing/group-presets";
import { DatabasePreset, Preset } from "@/components/editor/presets/types";
import { presetTrackName } from "@/components/editor_main/timing/preset-track-name";

interface PresetItemProps {
    preset: NonNullable<Timeline['presets']>[number];
    timeline: Timeline;
    index: number;
    /** Position among blocks that share this block's parent scene. */
    siblingIndex?: number;
    siblingCount?: number;
    depth?: number;
    /** Block ids in list order, used for a shift-click range. */
    selectionOrder?: string[];
    /** Scene blocks accept children by drop and by the add menu. */
    isScene?: boolean;
    hasChildren?: boolean;
    expanded?: boolean;
    onToggleExpand?: () => void;
    nestHighlight?: boolean;
    onOpenPresetLibrary?: () => void;
}

export function PresetItem({
    preset,
    timeline,
    index,
    siblingIndex,
    siblingCount,
    depth = 0,
    selectionOrder = [],
    isScene = false,
    hasChildren = false,
    expanded = true,
    onToggleExpand,
    nestHighlight = false,
    onOpenPresetLibrary,
}: PresetItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const { selectPreset, focusPreset, togglePresetSelection, selectPresetRange, selectedItem, selectedPresetIds } = useEditorStore();
    const { getEditedTimeline, updatePresetDisabled, addPresetToTimeline } = useTimelineEditsStore();
    const { hasOverridesForPresetItem, clearOverridesForPresetItem } = useLayerStateStore();
    const { generateOutput } = useCompileStore();
    const { loadedTimeline } = useProjectStore();
    const itemClipboard = useBlockClipboardStore((s) => s.itemClipboard);

    // Get edited timeline if it exists, otherwise use original
    const editedTimeline = getEditedTimeline(timeline.id);
    const displayTimeline = editedTimeline || timeline;

    // Get the edited preset from the display timeline
    const displayPreset = displayTimeline.presets?.find(p => p.id === preset.id) || preset;

    const isSelected = selectedItem?.type === 'preset' &&
        selectedItem.timeline.id === timeline.id &&
        (selectedPresetIds.length > 0
            ? selectedPresetIds.includes(preset.id)
            : selectedItem.item.id === preset.id);

    const groupIds = selectedPresetIds.includes(displayPreset.id) ? selectedPresetIds : [];
    const canGroup = canGroupPresets(displayTimeline, groupIds);

    const handleGroup = () => {
        if (!canGroup) return;
        groupSelectedBlocks(displayTimeline, groupIds);
    };

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
        paddingLeft: depth > 0 ? 8 + depth * 14 : undefined,
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.shiftKey) {
            e.preventDefault();
            selectPresetRange(displayPreset, displayTimeline, selectionOrder);
            return;
        }
        if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            togglePresetSelection(displayPreset, displayTimeline);
            return;
        }
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

    const handleAddBlock = (blockPreset: Preset | DatabasePreset) => {
        if (isScene && !expanded) onToggleExpand?.();
        addPresetToTimeline(
            timeline.id,
            blockPreset,
            isScene ? displayPreset.id : undefined,
        );
        if (!isScene || !loadedTimeline) return;
        const finalTimeline = getEditedTimeline(loadedTimeline.id) || loadedTimeline;
        generateOutput(finalTimeline);
    };

    const handleRevertToPreset = () => {
        clearOverridesForPresetItem(preset.id);
        if (loadedTimeline) {
            const finalTimeline = getEditedTimeline(loadedTimeline.id) || loadedTimeline;
            generateOutput(finalTimeline);
        }
    };

    const ensureSelected = () => {
        focusPreset(displayPreset, displayTimeline);
    };

    const handleDuplicate = () => {
        ensureSelected();
        duplicateSelectedItem();
    };

    const handleCopy = () => {
        ensureSelected();
        copySelectedItem();
    };

    const handlePaste = () => {
        ensureSelected();
        pasteClipboardItem();
    };

    const handleCopyProps = () => {
        ensureSelected();
        void copySelectedProps();
    };

    const handlePasteProps = () => {
        ensureSelected();
        void pasteSelectedProps();
    };

    const handleDelete = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        ensureSelected();
        deleteSelectedItem();
    };

    const handleMoveUp = () => {
        ensureSelected();
        moveSelectedItem("up");
    };

    const presets = displayTimeline.presets || [];

    const handleMoveDown = () => {
        ensureSelected();
        moveSelectedItem("down");
    };

    const place = siblingIndex ?? Math.max(0, index - 1);
    const places = siblingCount ?? Math.max(presets.length - 1, 0);
    const canMoveUp = place > 0;
    const canMoveDown = place < places - 1;
    const canPasteItem = itemClipboard?.kind === "preset";
    const showActions = isHovered || isSelected || addMenuOpen;

    const stopDrag = (event: React.PointerEvent) => {
        event.stopPropagation();
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    ref={setNodeRef}
                    style={style}
                    {...attributes}
                    {...listeners}
                    onClick={handleClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={cn(
                        "relative group flex items-center gap-2 px-2 py-0 h-8 text-sm cursor-grab active:cursor-grabbing hover:bg-accent transition-colors select-none",
                        isSelected && "bg-blue-100 hover:bg-blue-100",
                        nestHighlight && "bg-primary/10 ring-1 ring-inset ring-primary"
                    )}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            className="p-0 rounded hover:bg-muted shrink-0"
                            aria-expanded={expanded}
                            aria-label={expanded ? "Collapse block" : "Expand block"}
                            onPointerDown={stopDrag}
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggleExpand?.();
                            }}
                        >
                            {expanded ? (
                                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                            )}
                        </button>
                    ) : (
                        <span className="w-2.5 shrink-0" />
                    )}
                    <BlockIcon
                        presetId={displayPreset.presetId}
                        input={displayPreset.presetInputData}
                        className="h-3.5 w-3.5 shrink-0"
                    />
                    <span className={cn("flex-1 min-w-0 truncate",
                        displayPreset.disabled ? "line-through" : "",
                        (!isSelected || displayPreset.disabled) ? "text-muted-foreground" : isSelected ? "text-black" : "text-foreground")}>
                        {presetTrackName(displayPreset, displayPreset.presetId)}
                    </span>
                    {hasOverridesForPresetItem(displayPreset.id) && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="shrink-0 text-[9px] text-amber-600 font-medium" title="Layer was modified in preview">
                                    Modified
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Layer was moved or resized in preview; not in sync with preset</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {showActions ? (
                        <div className="flex items-center h-full gap-0" onPointerDown={stopDrag}>
                            {isScene && (
                                <BlocksHeaderAddButton
                                    className="flex"
                                    open={addMenuOpen}
                                    onOpenChange={setAddMenuOpen}
                                    onAdd={handleAddBlock}
                                    onOpenLibrary={onOpenPresetLibrary}
                                />
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        onPointerDown={stopDrag}
                                        onClick={handleToggleDisabled}
                                        className="p-0 px-1 h-full flex items-center justify-center text-foreground hover:text-muted-foreground hover:bg-black/10 cursor-pointer"
                                    >
                                        {displayPreset.disabled ? (
                                            <EyeOff className="h-3.5 w-3.5" />
                                        ) : (
                                            <Eye className="h-3.5 w-3.5" />
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{displayPreset.disabled ? "Show this block and everything inside it" : "Hide this block and everything inside it"}</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        onPointerDown={stopDrag}
                                        onClick={handleDelete}
                                        className="p-0 px-1 h-full flex items-center justify-center text-foreground hover:text-destructive hover:bg-black/10 cursor-pointer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Delete block</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    ) : (
                        displayPreset.disabled && (
                            <EyeOff className="h-3.5 w-3.5 shrink-0 mr-0.5" />
                        )
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                <AddBlockContextMenuItems
                    onAdd={handleAddBlock}
                    onOpenLibrary={onOpenPresetLibrary}
                />
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleGroup} disabled={!canGroup}>
                    <Group className="h-4 w-4 mr-2" />
                    Group
                    <ContextMenuShortcut>{modShortcutLabel("G")}</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                {hasOverridesForPresetItem(displayPreset.id) && (
                    <ContextMenuItem onClick={handleRevertToPreset}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Revert to preset
                    </ContextMenuItem>
                )}
                <ContextMenuItem onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                    <ContextMenuShortcut>{modShortcutLabel("C")}</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={handlePaste} disabled={!canPasteItem}>
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    Paste
                    <ContextMenuShortcut>{modShortcutLabel("V")}</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                    <ContextMenuShortcut>{modShortcutLabel("D")}</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleCopyProps}>
                    <ClipboardCopy className="h-4 w-4 mr-2" />
                    Copy props
                    <ContextMenuShortcut>{altShortcutLabel("C")}</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={handlePasteProps}>
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    Paste props
                    <ContextMenuShortcut>{altShortcutLabel("V")}</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleMoveUp} disabled={!canMoveUp}>
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Move Up
                    <ContextMenuShortcut>{modShortcutLabel("↑")}</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={handleMoveDown} disabled={!canMoveDown}>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Move Down
                    <ContextMenuShortcut>{modShortcutLabel("↓")}</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => handleDelete()} variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                    <ContextMenuShortcut>⌫</ContextMenuShortcut>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
