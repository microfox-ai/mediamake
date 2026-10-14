"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronRight, ChevronDown, HashIcon, Copy, Trash2, FolderTree, Link2, Plus, Pencil, Zap, ArrowUp, ArrowDown, ClipboardCopy, ClipboardPaste } from "lucide-react";
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
    ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { useProjectStore, type Timeline } from "../../../stores/project-store";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import {
    findNode,
    listBlockRows,
    loadInstanceTree,
    parentOfNode,
} from "@/components/editor_main/timing/load-instance-tree";
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
import { useSession } from "@/components/session-provider";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PresetItem } from "./PresetItem";
import { TimelineAddPresetMenu } from "./TimelineAddPresetMenu";
import { AddBlockContextMenuItems, BlocksHeaderAddButton } from "./AddBlockMenu";
import { Preset, DatabasePreset, ReferenceItem } from "@/components/editor/presets/types";
import { PresetLibraryDialog } from "./PresetLibraryDialog";
import {
    getDefaultDataTypeForReferenceType,
    getDefaultValueForReferenceType,
    getDataTypeById,
    getReferenceTypeOptions,
    predefinedDataTypes,
} from "@/components/editor/presets/dataTypes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    DragOverEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface TimelineItemProps {
    timeline: Timeline;
}

function pointerAfter(event: DragEndEvent): boolean {
    const translated = event.active.rect.current.translated;
    const over = event.over?.rect;
    if (!translated || !over) return true;
    return translated.top + translated.height / 2 > over.top + over.height / 2;
}

/** True when this timeline has unpublished local history entries at/before the cursor. */
function hasLocalHistoryChanges(
    history: Array<{ timelineId: string; published?: boolean; timeline?: { id?: string } }>,
    historyIndex: number,
    timelineId: string,
): boolean {
    if (historyIndex < 0) return false;
    for (let i = 0; i <= historyIndex; i++) {
        const entry = history[i];
        if (!entry || entry.published) continue;
        const entryTlId = entry.timelineId || entry.timeline?.id;
        if (entryTlId === timelineId) return true;
    }
    return false;
}

export function TimelineItem({ timeline }: TimelineItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isReferencesOpen, setIsReferencesOpen] = useState(false);
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [isBlocksOpen, setIsBlocksOpen] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [showPresetLibrary, setShowPresetLibrary] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const renameInputRef = useRef<HTMLInputElement>(null);
    const { loadedTimeline, loadProjectTimelines, currentProjectId, loadTimelineById } = useProjectStore();
    const { selectTimeline, selectReference, selectAction, selectedItem } = useEditorStore();
    const { getEditedTimeline, moveInstanceNode, addPresetToTimeline, updateTimeline } = useTimelineEditsStore();
    const generateOutput = useCompileStore((s) => s.generateOutput);
    const [nestTargetId, setNestTargetId] = useState<string | null>(null);
    const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(() => new Set());
    const itemClipboard = useBlockClipboardStore((s) => s.itemClipboard);
    const isUnsynced = useTimelineEditsStore((state) =>
        hasLocalHistoryChanges(state.history, state.historyIndex, timeline.id)
    );
    const session = useSession();
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

    // Get edited timeline if it exists, otherwise use original
    const editedTimeline = getEditedTimeline(timeline.id);
    const loadedOrOriginalTimeline = loadedTimeline?.id === timeline.id ? loadedTimeline : timeline;
    const displayTimeline = editedTimeline || loadedOrOriginalTimeline;

    const isLoaded = loadedTimeline?.id === timeline.id;
    const isSelected = selectedItem?.type === 'timeline' && selectedItem.item.id === timeline.id;
    const presets = displayTimeline.presets || [];
    const blockRows = useMemo(() => {
        const tree = loadInstanceTree(displayTimeline);
        const byId = new Map(presets.map((preset) => [preset.id, preset]));
        const rows = listBlockRows(tree).flatMap((row) => {
            const preset = byId.get(row.id);
            const node = findNode(tree, row.id);
            const parent = parentOfNode(tree, row.id);
            if (!preset || !node || !parent) return [];
            return [{
                preset,
                depth: row.depth,
                isScene: node.role === "scene",
                hasChildren: node.children.length > 0,
                siblingIndex: parent.children.findIndex((child) => child.id === row.id),
                siblingCount: parent.children.length,
            }];
        });
        const listed = new Set(rows.map((row) => row.preset.id));
        for (const preset of presets) {
            if (listed.has(preset.id) || preset.id === tree.id) continue;
            rows.push({
                preset,
                depth: 0,
                isScene: preset.presetId === "scene",
                hasChildren: false,
                siblingIndex: 0,
                siblingCount: 1,
            });
        }
        return rows;
    }, [displayTimeline, presets]);
    const visibleBlockRows = useMemo(() => {
        let hiddenBelow: number | null = null;
        return blockRows.filter((row) => {
            if (hiddenBelow !== null) {
                if (row.depth > hiddenBelow) return false;
                hiddenBelow = null;
            }
            if (row.hasChildren && collapsedBlockIds.has(row.preset.id)) {
                hiddenBelow = row.depth;
            }
            return true;
        });
    }, [blockRows, collapsedBlockIds]);

    const expandBlock = (id: string) => {
        setCollapsedBlockIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const toggleBlock = (id: string) => {
        setCollapsedBlockIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    const references = (displayTimeline.defaultData?.references || []) as ReferenceItem[];
    const actions = displayTimeline.actions || [];

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
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function publishTreeMove(moved: boolean) {
        if (!moved) return;
        const latest = getEditedTimeline(timeline.id) || displayTimeline;
        generateOutput(latest);
    }

    function handleDragOver(event: DragOverEvent) {
        const overId = event.over ? String(event.over.id) : "";
        const activeId = String(event.active.id);
        if (!overId || overId === activeId) {
            setNestTargetId(null);
            return;
        }
        const tree = loadInstanceTree(displayTimeline);
        const overNode = findNode(tree, overId);
        const activeNode = findNode(tree, activeId);
        const cycle = Boolean(activeNode && findNode(activeNode, overId));
        setNestTargetId(overNode?.role === "scene" && !cycle ? overId : null);
    }

    function handleDragEnd(event: DragEndEvent) {
        setNestTargetId(null);
        const overId = event.over ? String(event.over.id) : "";
        const activeId = String(event.active.id);
        if (!overId || overId === activeId) return;
        const tree = loadInstanceTree(displayTimeline);
        const overNode = findNode(tree, overId);
        const activeNode = findNode(tree, activeId);
        if (!overNode || !activeNode) return;
        const cycle = Boolean(findNode(activeNode, overId));
        if (overNode.role === "scene" && !cycle) {
            expandBlock(overId);
            publishTreeMove(moveInstanceNode(timeline.id, activeId, overId));
            return;
        }
        const parent = parentOfNode(tree, overId) ?? tree;
        const siblingIds = parent.children
            .map((child) => child.id)
            .filter((id) => id !== activeId);
        const overIndex = siblingIds.indexOf(overId);
        const index = overIndex < 0 ? siblingIds.length : overIndex + (pointerAfter(event) ? 1 : 0);
        publishTreeMove(moveInstanceNode(timeline.id, activeId, parent.id, index));
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
                                            className="h-2.5 w-2.5 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                                    )}
                                    <HashIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    {isRenaming ? (
                                        <Input
                                            ref={renameInputRef}
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={handleCommitRename}
                                            onKeyDown={handleRenameKeyDown}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-5 flex-1 min-w-0 text-sm px-1 py-0 border-primary"
                                        />
                                    ) : (
                                        <span className="flex-1 truncate">
                                            {displayTimeline.displayName ?? "Untitled"}
                                        </span>
                                    )}
                                    {isUnsynced && (
                                        <span
                                            className="h-2 w-2 rounded-full bg-blue-500 shrink-0"
                                            title="Unpublished local changes"
                                        />
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
                    <div className="ml-3 space-y-1 border-l">
                        {!isLoadingTimeline && (
                            <Collapsible
                                open={isReferencesOpen}
                                onOpenChange={setIsReferencesOpen}
                            >
                                <ContextMenu>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            onClick={() => setIsReferencesOpen((prev) => !prev)}
                                            className="flex items-center gap-2 px-2 h-8 text-sm cursor-pointer hover:bg-accent transition-colors select-none"
                                        >
                                            {isReferencesOpen ? (
                                                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                                            )}
                                            <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="flex-1">References</span>
                                            <span className="text-xs text-muted-foreground">
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
                                    <div className="ml-3.5 border-l py-0.5 space-y-1">
                                        {references.length > 0 ? (
                                            references.map((reference, index: number) => {
                                                const isRefSelected =
                                                    selectedItem?.type === "reference" &&
                                                    selectedItem.timeline.id === displayTimeline.id &&
                                                    selectedItem.referenceIndex === index;
                                                return (
                                                <ContextMenu key={`${reference.key || "reference"}-${index}`}>
                                                    <ContextMenuTrigger asChild>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                selectReference(reference, displayTimeline, index);
                                                            }}
                                                            className={cn(
                                                                "group/ref flex items-center gap-2 px-2 h-8 text-sm cursor-pointer hover:bg-accent transition-colors select-none",
                                                                isRefSelected
                                                                    ? "bg-blue-100 text-blue-950"
                                                                    : "text-muted-foreground",
                                                            )}
                                                        >
                                                            <Link2 className="h-3.5 w-3.5" />
                                                            <span className="truncate flex-1">
                                                                {reference.key || `reference_${index + 1}`}
                                                            </span>
                                                            {isRefSelected && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                selectReference(reference, displayTimeline, index);
                                                                                deleteSelectedItem();
                                                                            }}
                                                                            className="p-0.5 hover:text-destructive"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Delete reference</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent className="w-56">
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectReference(reference, displayTimeline, index);
                                                                copySelectedItem();
                                                            }}
                                                        >
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            Copy
                                                            <ContextMenuShortcut>{modShortcutLabel("C")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            disabled={itemClipboard?.kind !== "reference"}
                                                            onClick={() => {
                                                                selectReference(reference, displayTimeline, index);
                                                                pasteClipboardItem();
                                                            }}
                                                        >
                                                            <ClipboardPaste className="h-4 w-4 mr-2" />
                                                            Paste
                                                            <ContextMenuShortcut>{modShortcutLabel("V")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectReference(reference, displayTimeline, index);
                                                                duplicateSelectedItem();
                                                            }}
                                                        >
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            Duplicate
                                                            <ContextMenuShortcut>{modShortcutLabel("D")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuSeparator />
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectReference(reference, displayTimeline, index);
                                                                void copySelectedProps();
                                                            }}
                                                        >
                                                            <ClipboardCopy className="h-4 w-4 mr-2" />
                                                            Copy props
                                                            <ContextMenuShortcut>{altShortcutLabel("C")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectReference(reference, displayTimeline, index);
                                                                void pasteSelectedProps();
                                                            }}
                                                        >
                                                            <ClipboardPaste className="h-4 w-4 mr-2" />
                                                            Paste props
                                                            <ContextMenuShortcut>{altShortcutLabel("V")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuSeparator />
                                                        <ContextMenuItem
                                                            disabled={index <= 0}
                                                            onClick={() => {
                                                                selectReference(reference, displayTimeline, index);
                                                                moveSelectedItem("up");
                                                            }}
                                                        >
                                                            <ArrowUp className="h-4 w-4 mr-2" />
                                                            Move Up
                                                            <ContextMenuShortcut>{modShortcutLabel("↑")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            disabled={index >= references.length - 1}
                                                            onClick={() => {
                                                                selectReference(reference, displayTimeline, index);
                                                                moveSelectedItem("down");
                                                            }}
                                                        >
                                                            <ArrowDown className="h-4 w-4 mr-2" />
                                                            Move Down
                                                            <ContextMenuShortcut>{modShortcutLabel("↓")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuSeparator />
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectReference(reference, displayTimeline, index);
                                                                deleteSelectedItem();
                                                            }}
                                                            variant="destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                            <ContextMenuShortcut>⌫</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                    </ContextMenuContent>
                                                </ContextMenu>
                                                );
                                            })
                                        ) : (
                                            <div className="px-2 py-1 text-sm text-muted-foreground">
                                                No references
                                            </div>
                                        )}

                                        <div className="px-1 pt-1">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="flex items-center gap-2 px-2 h-8 text-sm cursor-pointer hover:bg-accent rounded-sm transition-colors select-none text-muted-foreground">
                                                        <Plus className="h-3.5 w-3.5" />
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

                        {!isLoadingTimeline && (
                            <Collapsible
                                open={isActionsOpen}
                                onOpenChange={setIsActionsOpen}
                            >
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center gap-2 px-2 h-8 text-sm cursor-pointer hover:bg-accent transition-colors select-none">
                                        {isActionsOpen ? (
                                            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                                        )}
                                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="flex-1">Actions</span>
                                        <span className="text-xs text-muted-foreground">
                                            {actions.length}
                                        </span>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="ml-3.5 border-l py-0.5 space-y-1">
                                        {actions.length > 0 ? (
                                            actions.map((action, actionIndex) => {
                                                const isActionSelected =
                                                    selectedItem?.type === "action" &&
                                                    selectedItem.item.id === action.id &&
                                                    selectedItem.timeline.id === displayTimeline.id;
                                                return (
                                                <ContextMenu key={action.id}>
                                                    <ContextMenuTrigger asChild>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                selectAction(action, displayTimeline);
                                                            }}
                                                            className={cn(
                                                                "group/action flex items-center gap-2 px-2 h-8 text-sm cursor-pointer hover:bg-accent transition-colors select-none",
                                                                isActionSelected
                                                                    ? "bg-blue-100 text-blue-950"
                                                                    : "text-muted-foreground",
                                                            )}
                                                        >
                                                            <Zap className="h-3.5 w-3.5" />
                                                            <span className="truncate flex-1">
                                                                {action.label}
                                                            </span>
                                                            {action.status === "error" && (
                                                                <span className="text-[9px] text-destructive">err</span>
                                                            )}
                                                            {isActionSelected && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                selectAction(action, displayTimeline);
                                                                                deleteSelectedItem();
                                                                            }}
                                                                            className="p-0.5 hover:text-destructive"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Delete action</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent className="w-56">
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectAction(action, displayTimeline);
                                                                copySelectedItem();
                                                            }}
                                                        >
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            Copy
                                                            <ContextMenuShortcut>{modShortcutLabel("C")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            disabled={itemClipboard?.kind !== "action"}
                                                            onClick={() => {
                                                                selectAction(action, displayTimeline);
                                                                pasteClipboardItem();
                                                            }}
                                                        >
                                                            <ClipboardPaste className="h-4 w-4 mr-2" />
                                                            Paste
                                                            <ContextMenuShortcut>{modShortcutLabel("V")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectAction(action, displayTimeline);
                                                                duplicateSelectedItem();
                                                            }}
                                                        >
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            Duplicate
                                                            <ContextMenuShortcut>{modShortcutLabel("D")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuSeparator />
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectAction(action, displayTimeline);
                                                                void copySelectedProps();
                                                            }}
                                                        >
                                                            <ClipboardCopy className="h-4 w-4 mr-2" />
                                                            Copy props
                                                            <ContextMenuShortcut>{altShortcutLabel("C")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectAction(action, displayTimeline);
                                                                void pasteSelectedProps();
                                                            }}
                                                        >
                                                            <ClipboardPaste className="h-4 w-4 mr-2" />
                                                            Paste props
                                                            <ContextMenuShortcut>{altShortcutLabel("V")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuSeparator />
                                                        <ContextMenuItem
                                                            disabled={actionIndex <= 0}
                                                            onClick={() => {
                                                                selectAction(action, displayTimeline);
                                                                moveSelectedItem("up");
                                                            }}
                                                        >
                                                            <ArrowUp className="h-4 w-4 mr-2" />
                                                            Move Up
                                                            <ContextMenuShortcut>{modShortcutLabel("↑")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            disabled={actionIndex >= actions.length - 1}
                                                            onClick={() => {
                                                                selectAction(action, displayTimeline);
                                                                moveSelectedItem("down");
                                                            }}
                                                        >
                                                            <ArrowDown className="h-4 w-4 mr-2" />
                                                            Move Down
                                                            <ContextMenuShortcut>{modShortcutLabel("↓")}</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                        <ContextMenuSeparator />
                                                        <ContextMenuItem
                                                            onClick={() => {
                                                                selectAction(action, displayTimeline);
                                                                deleteSelectedItem();
                                                            }}
                                                            variant="destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                            <ContextMenuShortcut>⌫</ContextMenuShortcut>
                                                        </ContextMenuItem>
                                                    </ContextMenuContent>
                                                </ContextMenu>
                                                );
                                            })
                                        ) : (
                                            <div className="px-2 py-1 text-sm text-muted-foreground">
                                                Add from a preset or reference
                                            </div>
                                        )}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {isLoadingTimeline && presets.length === 0 && (
                            <div className="py-1 pl-1.5">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-1 px-1.5 py-0.5"
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
                                <div className="group/blocks flex items-center gap-2 px-2 h-8 text-sm hover:bg-accent transition-colors select-none">
                                    <ContextMenu>
                                        <CollapsibleTrigger asChild>
                                            <ContextMenuTrigger asChild>
                                                <div className="flex flex-1 items-center gap-2 min-w-0 h-full cursor-pointer">
                                                    {isBlocksOpen ? (
                                                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                                                    )}
                                                    <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="flex-1">Blocks</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {Math.max(presets.length - 1, 0)}
                                                    </span>
                                                </div>
                                            </ContextMenuTrigger>
                                        </CollapsibleTrigger>
                                        <ContextMenuContent className="w-56">
                                            <AddBlockContextMenuItems
                                                onAdd={handleAddPreset}
                                                onOpenLibrary={() => setShowPresetLibrary(true)}
                                            />
                                        </ContextMenuContent>
                                    </ContextMenu>
                                    <BlocksHeaderAddButton
                                        onAdd={handleAddPreset}
                                        onOpenLibrary={() => setShowPresetLibrary(true)}
                                    />
                                </div>
                                <CollapsibleContent>
                                    <div className="ml-3.5 border-l py-0.5 space-y-1">
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragOver={handleDragOver}
                                            onDragEnd={handleDragEnd}
                                            onDragCancel={() => setNestTargetId(null)}
                                        >
                                            <SortableContext
                                                items={visibleBlockRows.map((row) => row.preset.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {visibleBlockRows.map((row) => (
                                                    <PresetItem
                                                        key={row.preset.id}
                                                        preset={row.preset}
                                                        timeline={timeline}
                                                        index={row.siblingIndex + 1}
                                                        siblingIndex={row.siblingIndex}
                                                        siblingCount={row.siblingCount}
                                                        depth={row.depth}
                                                        selectionOrder={visibleBlockRows.map((item) => item.preset.id)}
                                                        isScene={row.isScene}
                                                        hasChildren={row.hasChildren}
                                                        expanded={!collapsedBlockIds.has(row.preset.id)}
                                                        onToggleExpand={() => toggleBlock(row.preset.id)}
                                                        nestHighlight={nestTargetId === row.preset.id}
                                                        onOpenPresetLibrary={() => setShowPresetLibrary(true)}
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
                                <div className="group/blocks flex items-center gap-2 px-2 h-8 text-sm hover:bg-accent transition-colors select-none">
                                    <ContextMenu>
                                        <CollapsibleTrigger asChild>
                                            <ContextMenuTrigger asChild>
                                                <div className="flex flex-1 items-center gap-2 min-w-0 h-full cursor-pointer">
                                                    {isBlocksOpen ? (
                                                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                                                    )}
                                                    <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="flex-1">Blocks</span>
                                                    <span className="text-xs text-muted-foreground">0</span>
                                                </div>
                                            </ContextMenuTrigger>
                                        </CollapsibleTrigger>
                                        <ContextMenuContent className="w-56">
                                            <AddBlockContextMenuItems
                                                onAdd={handleAddPreset}
                                                onOpenLibrary={() => setShowPresetLibrary(true)}
                                            />
                                        </ContextMenuContent>
                                    </ContextMenu>
                                    <BlocksHeaderAddButton
                                        onAdd={handleAddPreset}
                                        onOpenLibrary={() => setShowPresetLibrary(true)}
                                    />
                                </div>
                                <CollapsibleContent>
                                    <div className="ml-3.5 border-l py-0.5 space-y-1">
                                        <div className="text-sm text-muted-foreground px-2 py-1">
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