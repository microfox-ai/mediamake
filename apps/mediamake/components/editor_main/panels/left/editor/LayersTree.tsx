"use client";

import { useMemo, useState, useEffect } from "react";
import { File, ChevronRight, ChevronDown, Eye, EyeOff, ChevronsLeft, ChevronsRight, Lock, Unlock, Image, Video, Plus, GripVertical, Type, Music, ArrowUp, ArrowDown, Copy, Trash2, Edit2, History, Users, Loader2 } from "lucide-react";
import { LayerHistoryPanel } from "./LayerHistoryPanel";
import { useLayerHistoryStore } from "../../../stores/layer-history-store";
import {
  flattenLayers,
  filterEditableLayers,
  isLayerActiveAtFrame,
  buildLayerTree,
  type LayerTreeNode,
} from "@/lib/editor/flatten-layers";
import type { RenderableComponentData } from "@microfox/remotion";
import { useCompileStore } from "../../../stores/compile-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { useProjectStore } from "../../../stores/project-store";
import { useEditorUIStore } from "../../../stores/editor-ui-store";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createImageLayer,
  createAudioLayer,
  createTextLayer,
  createVideoLayer,
  createLayoutNode,
} from "@/lib/editor/layer-templates";
const PREVIEW_TEXT_MAX = 28;

function findNodeInTree(
  nodes: RenderableComponentData[] | undefined,
  id: string
): RenderableComponentData | null {
  if (!nodes?.length) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeInTree(node.childrenData, id);
    if (found) return found;
  }
  return null;
}

function cloneNodeWithNewIds(node: RenderableComponentData): RenderableComponentData {
  const suffix = `copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const cloneRecursive = (n: RenderableComponentData): RenderableComponentData => {
    const cloned: RenderableComponentData = {
      ...n,
      id: `${n.id}-${suffix}`,
    };
    if (n.childrenData && n.childrenData.length > 0) {
      cloned.childrenData = n.childrenData.map((child) => cloneRecursive(child));
    }
    return cloned;
  };
  return cloneRecursive(node);
}

function findParentAndSiblings(
  tree: LayerTreeNode[],
  nodeId: string,
  parent: LayerTreeNode | null = null
): { parentId: string; siblingIds: string[] } | null {
  for (const node of tree) {
    if (node.id === nodeId) {
      if (parent === null) return { parentId: "__root__", siblingIds: tree.map((n) => n.id) };
      return { parentId: parent.id, siblingIds: parent.children.map((c) => c.id) };
    }
    const found = findParentAndSiblings(node.children, nodeId, node);
    if (found) return found;
  }
  return null;
}

function LayerIconAndLabel({ node }: { node: LayerTreeNode }) {
  if (node.componentId === "TextAtom") {
    const text =
      node.previewText != null && node.previewText !== ""
        ? node.previewText.length > PREVIEW_TEXT_MAX
          ? node.previewText.slice(0, PREVIEW_TEXT_MAX) + "…"
          : node.previewText
        : node.label || node.id;
    return (
      <>
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground"
          title="Text"
        >
          T
        </span>
        <span className="min-w-0 truncate">{text}</span>
      </>
    );
  }
  if (node.componentId === "ImageAtom") {
    return (
      <>
        <Image className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{node.label || node.id}</span>
      </>
    );
  }
  if (node.componentId === "VideoAtom") {
    return (
      <>
        <Video className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{node.label || node.id}</span>
      </>
    );
  }
  return (
    <>
      <File className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{node.label || node.id}</span>
    </>
  );
}

/**
 * Layers tree shows output layers (childrenData of generated output).
 * Excludes audio and base scene layers.
 * Syncs with preview: selection, current frame for active/dim.
 * Shows nested structure with accordion expand/collapse.
 */
export function LayersTree() {
  const { calculatedMetadata } = useCompileStore();
  const { currentProjectId, loadedTimeline } = useProjectStore();
  const {
    overrides,
    selectedLayerIds,
    hiddenLayerIds,
    lockedLayerIds,
    addedNodes,
    addNode,
    removeAddedNode,
    reorderAddedNodes,
    currentFrame,
    selectLayer,
    toggleLayerHidden,
    toggleLayerLocked,
    seekToFrame,
    childrenOrderByParentId,
    setChildrenOrder,
    getMergedChildren,
    loadedChildrenData,
    setParentChildrenOrder,
    addChildNode,
    removeNode,
    revertToTeamBase,
  } = useLayerStateStore();
  const { editModeEnabled, toggleEditMode } = useEditorUIStore();
  const [isReverting, setIsReverting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Expand all nodes by default for better visibility
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // We'll populate this after layers are computed
    return initial;
  });
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const historyCount = useLayerHistoryStore((s) => s.entries.length);

  const mergedChildren = useMemo(
    () => getMergedChildren(calculatedMetadata?.props?.childrenData),
    [calculatedMetadata?.props?.childrenData, getMergedChildren, overrides, addedNodes, childrenOrderByParentId, loadedChildrenData]
  );

  const layers = useMemo(() => {
    if (!mergedChildren) return [];
    const fps = calculatedMetadata?.fps ?? 30;
    const w = calculatedMetadata?.width ?? 1920;
    const h = calculatedMetadata?.height ?? 1080;
    return filterEditableLayers(
      flattenLayers(mergedChildren, {
        fps,
        compositionWidth: w,
        compositionHeight: h,
      })
    );
  }, [
    mergedChildren,
    calculatedMetadata?.fps,
    calculatedMetadata?.width,
    calculatedMetadata?.height,
  ]);

  const layerTree = useMemo(() => {
    return buildLayerTree(layers);
  }, [layers]);

  const addedNodeIds = useMemo(
    () => new Set(addedNodes.map((n) => n.id)),
    [addedNodes]
  );

  const createLayerAtCurrentFrame = (
    template: () => Parameters<typeof addNode>[0]
  ): Parameters<typeof addNode>[0] => {
    const node = template();
    const fps = calculatedMetadata?.fps ?? 30;
    const startInFrames = currentFrame;
    const start = startInFrames / fps;
    const existingTiming = (node.context as any)?.timing ?? {};
    const durationSec =
      typeof existingTiming.duration === "number" ? existingTiming.duration : 10;
    const durationInFrames =
      typeof existingTiming.durationInFrames === "number"
        ? existingTiming.durationInFrames
        : Math.round(durationSec * fps);

    node.context = {
      ...(node.context ?? {}),
      timing: {
        ...existingTiming,
        start,
        duration: durationSec,
        startInFrames,
        durationInFrames,
      },
    };

    return node;
  };

  const handleAddLayer = (
    template: () => Parameters<typeof addNode>[0]
  ) => {
    addNode(createLayerAtCurrentFrame(template));
  };

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData("application/x-layer-id", nodeId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(nodeId);
  };
  const handleDragLeave = () => setDragOverId(null);
  const handleDrop = (e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const draggedId = e.dataTransfer.getData("application/x-layer-id");
    if (!draggedId || draggedId === targetNodeId) return;

    if (addedNodeIds.has(draggedId) && addedNodeIds.has(targetNodeId)) {
      const fromIndex = addedNodes.findIndex((n) => n.id === draggedId);
      const toIndex = addedNodes.findIndex((n) => n.id === targetNodeId);
      if (fromIndex !== -1 && toIndex !== -1) reorderAddedNodes(fromIndex, toIndex);
      return;
    }

    if (!addedNodeIds.has(draggedId) && !addedNodeIds.has(targetNodeId)) {
      const draggedInfo = findParentAndSiblings(layerTree, draggedId);
      const targetInfo = findParentAndSiblings(layerTree, targetNodeId);
      if (draggedInfo && targetInfo && draggedInfo.parentId === targetInfo.parentId) {
        const { parentId, siblingIds } = draggedInfo;
        const base = loadedChildrenData ?? calculatedMetadata?.props?.childrenData ?? [];
        if (!base.length) return;
        const parentChildren =
          parentId === "__root__"
            ? (base[0]?.childrenData ?? [])
            : (findNodeInTree(base, parentId)?.childrenData ?? []);
        const fromIdx = parentChildren.findIndex((n) => n.id === draggedId);
        const targetIdx = parentChildren.findIndex((n) => n.id === targetNodeId);
        if (fromIdx === -1 || targetIdx === -1 || fromIdx === targetIdx) return;
        const isFirstRowInList = targetNodeId === siblingIds[siblingIds.length - 1];
        const insertIndex = isFirstRowInList ? 0 : targetIdx + 1;
        const reordered = [...parentChildren];
        const [removed] = reordered.splice(fromIdx, 1);
        const insertIdx = fromIdx < insertIndex ? insertIndex - 1 : insertIndex;
        reordered.splice(insertIdx, 0, removed);
        setParentChildrenOrder(parentId, reordered, base);
      }
    }
  };

  // Auto-expand all parent nodes on first load
  useEffect(() => {
    if (expandedIds.size === 0 && layerTree.length > 0) {
      const allParentIds = new Set<string>();
      const collectParentIds = (nodes: LayerTreeNode[]) => {
        for (const node of nodes) {
          if (node.children.length > 0) {
            allParentIds.add(node.id);
            collectParentIds(node.children);
          }
        }
      };
      collectParentIds(layerTree);
      setExpandedIds(allParentIds);
    }
  }, [layerTree, expandedIds.size]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderLayerNode = (node: LayerTreeNode, depth: number = 0) => {
    const isActive = isLayerActiveAtFrame(node, currentFrame);
    if (!isActive) return null;
    const isSelected = selectedLayerIds.includes(node.id);
    const isHidden = hiddenLayerIds.has(node.id);
    const isLocked = lockedLayerIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const indent = depth * 16;
    const startFrame = node.timing.startInFrames ?? 0;
    const durationFrames = node.timing.durationInFrames ?? 1;
    const endFrame = Math.max(startFrame, startFrame + Math.max(1, durationFrames) - 1);

    const controls = (
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          className="p-1 rounded hover:bg-accent"
          title={isHidden ? "Show layer" : "Hide layer"}
          onClick={(e) => {
            e.stopPropagation();
            toggleLayerHidden(node.id);
          }}
        >
          {isHidden ? (
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Eye className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        <button
          type="button"
          className="p-1 rounded hover:bg-accent"
          title={isLocked ? "Unlock layer" : "Lock layer"}
          onClick={(e) => {
            e.stopPropagation();
            toggleLayerLocked(node.id);
          }}
        >
          {isLocked ? (
            <Unlock className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>
    );

    const rowClick = (e: React.MouseEvent) => selectLayer(node.id, e.ctrlKey || e.metaKey);
    const rowKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectLayer(node.id, e.ctrlKey || e.metaKey);
      }
    };
    const isAddedNode = addedNodeIds.has(node.id);
    const rowClassName = cn(
      "flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm min-w-0",
      "hover:bg-accent cursor-pointer",
      isHidden && "opacity-40",
      isSelected && "bg-primary/20 font-medium",
      dragOverId === node.id && "ring-1 ring-primary/50"
    );
    const rowTitle = `${node.label} (active: ${node.timing.startInFrames ?? 0}-${(node.timing.startInFrames ?? 0) + (node.timing.durationInFrames ?? 0)})`;

    const parentInfo = findParentAndSiblings(layerTree, node.id);
    const siblingIds = parentInfo?.siblingIds ?? [];
    const indexInSiblings = siblingIds.indexOf(node.id);
    const hasSiblings = siblingIds.length > 1 && indexInSiblings !== -1;
    const canMoveUp = hasSiblings && indexInSiblings < siblingIds.length - 1;
    const canMoveDown = hasSiblings && indexInSiblings > 0;
    const canAddInside = node.type === "layout" || hasChildren;

    const dragProps = {
      draggable: hasSiblings,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, node.id),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, node.id),
      onDragLeave: handleDragLeave,
      onDrop: (e: React.DragEvent) => handleDrop(e, node.id),
    };

    const handleMove = (direction: "up" | "down") => {
      if (!parentInfo || !hasSiblings) return;
      const { parentId } = parentInfo;
      const fromIdx = indexInSiblings;
      if (fromIdx === -1) return;

      const delta = direction === "up" ? 1 : -1;
      // Optionally restrict to siblings active at current frame so we swap with the visible neighbor
      const activeSiblingIds = siblingIds.filter((id) => {
        const layer = layers.find((l) => l.id === id);
        return layer && isLayerActiveAtFrame(layer, currentFrame);
      });
      const useIds = activeSiblingIds.length >= 2 ? activeSiblingIds : siblingIds;
      const indexInUse = useIds.indexOf(node.id);
      const toIdxInUse = indexInUse + (direction === "up" ? 1 : -1);
      if (toIdxInUse < 0 || toIdxInUse >= useIds.length) return;
      const swapTargetId = useIds[toIdxInUse];

      // Root-level added nodes: reorder within addedNodes list
      if (isAddedNode && parentId === "__root__") {
        const addedIds = addedNodes.map((n) => n.id);
        const fromAddedIdx = addedIds.indexOf(node.id);
        if (fromAddedIdx === -1) return;
        const toAddedIdx = fromAddedIdx + delta;
        if (toAddedIdx < 0 || toAddedIdx >= addedIds.length) return;
        reorderAddedNodes(fromAddedIdx, toAddedIdx);
        return;
      }

      // Compiled or nested: reorder within this parent's children only (sibling swap at any level; no nesting change)
      const base = loadedChildrenData ?? calculatedMetadata?.props?.childrenData ?? [];
      if (!base.length) return;
      const parentChildren =
        parentId === "__root__"
          ? (base[0]?.childrenData ?? [])
          : (findNodeInTree(base, parentId)?.childrenData ?? []);
      if (!parentChildren.length) return;
      const fromIdxInParent = parentChildren.findIndex((n) => n.id === node.id);
      const toIdxInParent = parentChildren.findIndex((n) => n.id === swapTargetId);
      if (fromIdxInParent === -1 || toIdxInParent === -1) return;
      const reordered = [...parentChildren];
      const [removed] = reordered.splice(fromIdxInParent, 1);
      reordered.splice(toIdxInParent, 0, removed);
      setParentChildrenOrder(parentId, reordered, base);
    };

    const handleAddChild = (template: () => Parameters<typeof addNode>[0]) => {
      const child = createLayerAtCurrentFrame(template);
      addChildNode(calculatedMetadata?.props?.childrenData, node.id, child);
    };

    const handleDuplicate = () => {
      if (!mergedChildren) return;
      const source = findNodeInTree(mergedChildren, node.id);
      if (!source) return;
      const clone = cloneNodeWithNewIds(source);

      if (isAddedNode && (!parentInfo || parentInfo.parentId === "__root__")) {
        const fromIndex = addedNodes.findIndex((n) => n.id === node.id);
        const cloneIndex = addedNodes.length;
        addNode(clone);
        if (fromIndex !== -1) {
          const toIndex = fromIndex + 1;
          if (toIndex <= cloneIndex) {
            reorderAddedNodes(cloneIndex, toIndex);
          }
        }
        return;
      }

      const parentId = parentInfo?.parentId ?? "__root__";
      addChildNode(calculatedMetadata?.props?.childrenData, parentId, clone);

      if (siblingIds.length > 0) {
        const fromIdx = siblingIds.indexOf(node.id);
        if (fromIdx !== -1) {
          const reordered = [...siblingIds];
          const insertIdx = fromIdx + 1;
          reordered.splice(insertIdx, 0, clone.id);
          setChildrenOrder(parentId, reordered);
        }
      }
    };

    const rowBody =
      !hasChildren ? (
        // Leaf node - no collapse/expand
        <div
          key={node.id}
          style={{ paddingLeft: `${indent}px` }}
          className="flex items-center"
          {...dragProps}
        >
          <span className="shrink-0 text-muted-foreground/60 cursor-grab active:cursor-grabbing" title="Drag to reorder">
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <div
            role="button"
            tabIndex={0}
            onClick={rowClick}
            onKeyDown={rowKeyDown}
            className={rowClassName}
            title={rowTitle}
          >
            <LayerIconAndLabel node={node} />
          </div>
          {controls}
        </div>
      ) : (
        // Parent node with children - collapsible
        <Collapsible
          key={node.id}
          open={isExpanded}
          onOpenChange={() => toggleExpanded(node.id)}
        >
          <div style={{ paddingLeft: `${indent}px` }} className="flex flex-col" {...dragProps}>
            <div className="flex items-center">
              <span className="shrink-0 text-muted-foreground/60 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="p-1 hover:bg-accent rounded shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <div
                role="button"
                tabIndex={0}
                onClick={rowClick}
                onKeyDown={rowKeyDown}
                className={rowClassName}
                title={rowTitle}
              >
                <LayerIconAndLabel node={node} />
              </div>
              {controls}
            </div>
            <CollapsibleContent className="ml-4">
              <div className="space-y-0.5">
                {node.children
                  .slice()
                  .reverse()
                  .map((child) => renderLayerNode(child, depth + 1))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );

    return (
      <ContextMenu key={node.id}>
        <ContextMenuTrigger asChild>{rowBody}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              seekToFrame(startFrame);
            }}
          >
            <ChevronsLeft className="h-3 w-3" />
            Go to start
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              seekToFrame(endFrame);
            }}
          >
            <ChevronsRight className="h-3 w-3" />
            Go to end
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={!canMoveUp}
            onClick={() => handleMove("up")}
          >
            <ArrowUp className="h-3 w-3" />
            Move up
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!canMoveDown}
            onClick={() => handleMove("down")}
          >
            <ArrowDown className="h-3 w-3" />
            Move down
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDuplicate}>
            <Copy className="h-3 w-3" />
            Duplicate layer
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => removeNode(node.id, calculatedMetadata?.props?.childrenData)}
          >
            <Trash2 className="h-3 w-3" />
            Delete layer
          </ContextMenuItem>
          {canAddInside && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Plus className="h-3 w-3" />
                  Add layer to container
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => handleAddChild(createImageLayer)}>
                    <Image className="h-3.5 w-3.5 mr-2" />
                    Image
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAddChild(createAudioLayer)}>
                    <Music className="h-3.5 w-3.5 mr-2" />
                    Audio
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAddChild(createTextLayer)}>
                    <Type className="h-3.5 w-3.5 mr-2" />
                    Text
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAddChild(createVideoLayer)}>
                    <Video className="h-3.5 w-3.5 mr-2" />
                    Video
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAddChild(createLayoutNode)}>
                    <File className="h-3.5 w-3.5 mr-2" />
                    Layout
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  if (layers.length === 0 && !showHistory) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Same toolbar so History is always reachable */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 shrink-0">
          <span className="text-sm font-medium">Output layers</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 shrink-0"
            title="View layer history"
            onClick={() => setShowHistory(true)}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <File className="h-4 w-4" />
            <span>No layers</span>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Load a timeline and generate output to see layers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 shrink-0">
        <span className="text-sm font-medium">
          {showHistory ? "Layer History" : "Output layers"}
        </span>
        <div className="flex items-center gap-1">
          {/* Revert to team base — pulls the last published team state into local */}
          {!showHistory && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 shrink-0"
              disabled={isReverting || !currentProjectId || !loadedTimeline}
              title="Revert to team base — discards unpublished local edits and loads the last published team state. Undoable (Ctrl+Z)."
              onClick={async () => {
                if (!currentProjectId || !loadedTimeline) return;
                setIsReverting(true);
                try {
                  await revertToTeamBase(currentProjectId, loadedTimeline.id);
                } finally {
                  setIsReverting(false);
                }
              }}
            >
              {isReverting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Users className="h-3.5 w-3.5" />
              )}
            </Button>
          )}

          {/* History toggle */}
          <Button
            type="button"
            size="sm"
            variant={showHistory ? "default" : "outline"}
            className="h-8 w-8 p-0 shrink-0 relative"
            title={showHistory ? "Back to layers" : "View layer history"}
            onClick={() => setShowHistory((v) => !v)}
          >
            <History className="h-3.5 w-3.5" />
            {historyCount > 0 && !showHistory && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground leading-none">
                {historyCount > 99 ? "99+" : historyCount}
              </span>
            )}
          </Button>

          {/* Add layer — only shown in layers view */}
          {!showHistory && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    title="Add layer at root"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAddLayer(createImageLayer)}>
                    <Image className="h-3.5 w-3.5 mr-2" />
                    Image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddLayer(createAudioLayer)}>
                    <Music className="h-3.5 w-3.5 mr-2" />
                    Audio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddLayer(createTextLayer)}>
                    <Type className="h-3.5 w-3.5 mr-2" />
                    Text
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddLayer(createVideoLayer)}>
                    <Video className="h-3.5 w-3.5 mr-2" />
                    Video
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddLayer(createLayoutNode)}>
                    <File className="h-3.5 w-3.5 mr-2" />
                    Layout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                size="sm"
                variant={editModeEnabled ? "default" : "outline"}
                className="h-8 w-8 p-0 shrink-0"
                title={editModeEnabled ? "Disable canvas editing" : "Enable canvas editing"}
                onClick={toggleEditMode}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {showHistory ? (
        <LayerHistoryPanel />
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
          <div className="space-y-0.5">
            {layerTree
              .slice()
              .reverse()
              .map((node) => renderLayerNode(node, 0))}
          </div>
        </div>
      )}
    </div>
  );
}
