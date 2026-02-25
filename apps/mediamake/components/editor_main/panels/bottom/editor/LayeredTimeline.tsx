"use client";

import { useMemo, useCallback, useRef, useState } from "react";
import { Eye, EyeOff, Lock, Unlock, VolumeX, Volume2, Magnet, Scissors } from "lucide-react";
import {
  flattenLayers,
  filterEditableLayers,
  filterLeafLayers,
  type FlatLayer,
} from "@/lib/editor/flatten-layers";
import { useCompileStore } from "../../../stores/compile-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import type { RenderableComponentData } from "@microfox/remotion";
import { usePlayerRefStore } from "../../../stores/player-ref-store";
import { cn } from "@/lib/utils";

const formatTime = (frame: number, fps: number): string => {
  const minutes = Math.floor(frame / fps / 60);
  const seconds = Math.floor((frame / fps) % 60);
  const frameAfterSec = Math.round(frame % fps);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(frameAfterSec).padStart(2, "0")}`;
};

const TRACK_HEIGHT = 28;
const RULER_HEIGHT = 24;

function TimelineClipBlock({
  layer,
  isSelected,
  stateLocked,
  onPointerDown,
  onClick,
  onTrimLeftPointerDown,
  onTrimRightPointerDown,
  title,
}: {
  layer: FlatLayer;
  isSelected: boolean;
  stateLocked: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: () => void;
  onTrimLeftPointerDown: (e: React.PointerEvent) => void;
  onTrimRightPointerDown: (e: React.PointerEvent) => void;
  title: string;
}) {
  const isText = layer.componentId === "TextAtom";
  const isImage = layer.componentId === "ImageAtom";
  const isVideo = layer.componentId === "VideoAtom";
  const previewText = layer.previewText;
  const previewSrc = layer.previewSrc;

  const labelFallback = layer.label || layer.id;
  const displayLabel = isText && (previewText?.trim()) ? String(previewText).trim().slice(0, 80) : labelFallback;
  const showThumb = (isImage || isVideo) && previewSrc;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(e) => { if (!stateLocked) onPointerDown(e); }}
        onClick={onClick}
        className={cn(
          "absolute top-1 bottom-1 left-0 right-0 rounded overflow-hidden flex items-center text-[10px] border cursor-pointer transition-colors",
          isSelected
            ? "border-primary bg-primary/25 text-primary-foreground z-10"
            : "border-border bg-muted/60 hover:bg-muted"
        )}
        style={{ minWidth: 20 }}
        title={title}
      >
        {showThumb ? (
          <div className="absolute inset-0 flex items-stretch bg-muted/80">
            {isVideo ? (
              <video
                src={previewSrc}
                className="w-full h-full object-cover"
                style={{ objectFit: "cover", minWidth: "100%", minHeight: "100%" }}
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <div
                className="w-full h-full bg-center"
                style={{
                  backgroundImage: `url(${previewSrc})`,
                  backgroundSize: "auto 100%",
                  backgroundRepeat: "repeat-x",
                }}
              />
            )}
            <span className="absolute bottom-0 left-0 right-0 py-0.5 px-1 bg-black/60 text-white truncate text-[9px]">
              {labelFallback}
            </span>
          </div>
        ) : (
          <span className="truncate pl-1 pr-4 w-full" title={displayLabel}>
            {displayLabel}
          </span>
        )}
      </div>
      {!stateLocked && (
        <>
          <div
            className="absolute top-1 bottom-1 left-0 w-1.5 rounded-l cursor-ew-resize bg-background/80 border border-r-0 border-border z-20 opacity-0 hover:opacity-100"
            onPointerDown={(e) => onTrimLeftPointerDown(e)}
            title="Trim start"
          />
          <div
            className="absolute top-1 bottom-1 right-0 w-1.5 rounded-r cursor-ew-resize bg-background/80 border border-l-0 border-border z-20 opacity-0 hover:opacity-100"
            onPointerDown={(e) => onTrimRightPointerDown(e)}
            title="Trim end"
          />
        </>
      )}
    </>
  );
}

function Playhead({ durationInFrames, fps }: { durationInFrames: number, fps: number }) {
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const pct = Math.min(100, Math.max(0, (currentFrame / durationInFrames) * 100));
  return (
    <div className="absolute top-0 left-[140px] right-0 bottom-0 pointer-events-none z-20" aria-hidden>
      <div className="absolute top-0 bottom-0 w-0.5 bg-primary" style={{ left: `${pct}%` }} />
    </div>
  );
}

export function LayeredTimeline() {
  const { calculatedMetadata } = useCompileStore();
  const playerRef = usePlayerRefStore((s) => s.playerRef);
  const {
    overrides,
    addedNodes,
    selectedLayerIds,
    selectLayer,
    setCurrentFrame,
    setOverride,
    hiddenLayerIds,
    childrenOrderByParentId,
    trackStates,
    setTrackState,
    addNode,
    getMergedChildren,
    loadedChildrenData,
  } = useLayerStateStore();

  const mergedChildren = useMemo(
    () => getMergedChildren(calculatedMetadata?.props?.childrenData),
    [calculatedMetadata?.props?.childrenData, getMergedChildren, overrides, addedNodes, childrenOrderByParentId, loadedChildrenData]
  );

  const layers = useMemo(() => {
    if (!mergedChildren) return [];
    const fps = calculatedMetadata?.fps ?? 30;
    const w = calculatedMetadata?.width ?? 1920;
    const h = calculatedMetadata?.height ?? 1080;
    const allLayers = filterEditableLayers(
      flattenLayers(mergedChildren, { fps, compositionWidth: w, compositionHeight: h })
    );
    return filterLeafLayers(allLayers).filter((l) => !hiddenLayerIds.has(l.id));
  }, [
    mergedChildren,
    calculatedMetadata?.fps,
    calculatedMetadata?.width,
    calculatedMetadata?.height,
    hiddenLayerIds,
  ]);

  const durationInFrames = useMemo(
    () =>
      calculatedMetadata?.durationInFrames && calculatedMetadata.durationInFrames > 0
        ? calculatedMetadata.durationInFrames
        : 1,
    [calculatedMetadata?.durationInFrames]
  );
  const fps = calculatedMetadata?.fps ?? 30;

  const groupedTracks = useMemo(() => {
    const videoLayers = layers.filter((l) => l.componentId !== "AudioAtom");
    const audioLayers = layers.filter((l) => l.componentId === "AudioAtom");

    /**
     * Assign layers to track rows in DOM / JSON order:
     * - Iterate layers in the order provided (matches left sidebar tree order)
     * - Place each layer into the highest row where it does not overlap in time
     *   (regardless of parent container)
     * - If it overlaps in all existing rows, create a new lower row
     * - After packing, sort rows by the *largest* original index (latest DOM position)
     *   of any layer in the row, so stacks follow "later in DOM = visually above".
     */
    const assignRows = (
      list: FlatLayer[],
      prefix: "V" | "A"
    ): { trackId: string; stateKey: string; zIndex: number; rowIndex: number; layers: FlatLayer[] }[] => {
      const indexMap = new Map<string, number>();
      list.forEach((layer, idx) => {
        indexMap.set(layer.id, idx);
      });

      // Certain "background" image layers should stay anchored on their own
      // bottom row and never be merged with later DOM layers, even if they
      // don't overlap in time. We treat as background any ImageAtom that:
      // - is a direct child of a top-level layout/scene (depth === 1)
      // - starts at frame 0.
      const pinnedLayerIds = new Set<string>();
      for (const layer of list) {
        if (
          layer.componentId === "ImageAtom" &&
          layer.depth === 1 &&
          (layer.timing.startInFrames ?? 0) === 0
        ) {
          pinnedLayerIds.add(layer.id);
        }
      }

      const rows: FlatLayer[][] = [];

      for (const layer of list) {
        const start = layer.timing.startInFrames ?? 0;
        const dur = Math.max(1, layer.timing.durationInFrames ?? 1);
        const end = start + dur;

        let placed = false;
        // Try to stack onto the highest (visually top) existing row first,
        // so non-overlapping clips combine into upper stacks instead of
        // always filling from the bottom.
        for (let idx = rows.length - 1; idx >= 0; idx--) {
          const row = rows[idx];
          let overlaps = false;

          for (const other of row) {
            // Never merge anything into a row that contains a pinned layer,
            // and never merge a pinned layer into an existing row.
            if (pinnedLayerIds.has(other.id) || pinnedLayerIds.has(layer.id)) {
              overlaps = true;
              break;
            }

            const oStart = other.timing.startInFrames ?? 0;
            const oDur = Math.max(1, other.timing.durationInFrames ?? 1);
            const oEnd = oStart + oDur;
            // Overlap if they intersect in time
            if (!(end <= oStart || start >= oEnd)) {
              overlaps = true;
              break;
            }
          }

          if (!overlaps) {
            row.push(layer);
            placed = true;
            break;
          }
        }

        if (!placed) {
          rows.push([layer]);
        }
      }

      // Sort rows by the largest DOM index of any layer in the row.
      // We intentionally sort DESC so that rows containing the latest DOM layers
      // end up visually on top (higher V indices).
      const withOrder = rows.map((rowLayers, rowIndex) => {
        const maxIndex = rowLayers.reduce((max, l) => {
          const idx = indexMap.get(l.id) ?? -1;
          return idx > max ? idx : max;
        }, -1);
        return { rowLayers, rowIndex, maxIndex };
      });

      withOrder.sort((a, b) => b.maxIndex - a.maxIndex);

      return withOrder.map(({ rowLayers }, rowIndex) => {
        const representative = rowLayers[0];
        const z = representative?.boundaries?.zIndex ?? 0;
        const idSuffix = `${rowIndex}`;
        return {
          trackId: `${prefix}${idSuffix}`,
          stateKey: `${prefix}${idSuffix}`,
          zIndex: z,
          rowIndex,
          layers: rowLayers,
        };
      });
    };

    const vRows = assignRows(videoLayers, "V");
    const aRows = assignRows(audioLayers, "A");
    const vKeys = vRows.length > 0 ? vRows.map((_, idx) => idx) : [0];
    const aKeys = aRows.length > 0 ? aRows.map((_, idx) => idx) : [0];
    return { vRows, aRows, vKeys, aKeys };
  }, [layers]);

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [dragStartFrame, setDragStartFrame] = useState(0);
  const [trimMode, setTrimMode] = useState<"left" | "right" | null>(null);
  const [trimLayerId, setTrimLayerId] = useState<string | null>(null);
  const [snappingEnabled, setSnappingEnabled] = useState(true);

  const SNAP_THRESHOLD = Math.round(fps * 0.2); // approx 200ms

  const getSnappedFrame = useCallback((targetFrame: number, ignoreLayerId?: string) => {
    if (!snappingEnabled) return targetFrame;
    const currentFrame = useLayerStateStore.getState().currentFrame;
    let closestFrame = targetFrame;
    let minDiff = SNAP_THRESHOLD;

    const snapPoints = new Set<number>();
    snapPoints.add(currentFrame);
    snapPoints.add(0);
    snapPoints.add(durationInFrames);

    for (const layer of layers) {
      if (layer.id === ignoreLayerId) continue;
      const start = layer.timing.startInFrames ?? 0;
      const end = start + (layer.timing.durationInFrames ?? 1);
      snapPoints.add(start);
      snapPoints.add(end);
    }

    for (const point of snapPoints) {
      const diff = Math.abs(point - targetFrame);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = point;
      }
    }
    return closestFrame;
  }, [snappingEnabled, layers, durationInFrames, SNAP_THRESHOLD]);

  const handleSplit = useCallback(() => {
    if (selectedLayerIds.length !== 1) return;
    const currentFrame = useLayerStateStore.getState().currentFrame;
    const layerId = selectedLayerIds[0];
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    const start = layer.timing.startInFrames ?? 0;
    const duration = layer.timing.durationInFrames ?? 1;
    const end = start + duration;

    // Must be inside the clip
    if (currentFrame <= start || currentFrame >= end) return;

    // helper
    const findNodeById = (nodes: RenderableComponentData[] | undefined, id: string): RenderableComponentData | null => {
      if (!nodes?.length) return null;
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNodeById(node.childrenData, id);
        if (found) return found;
      }
      return null;
    };

    const node = findNodeById(mergedChildren, layerId);
    if (!node) return;

    const leftDuration = currentFrame - start;
    const rightDuration = end - currentFrame;
    
    // 1. Modify existing clip duration to end at currentFrame
    setOverride(layerId, {
      context: { timing: { startInFrames: start, durationInFrames: leftDuration } },
    });

    // 2. Create right clip
    const newId = `${node.id}-split-${Date.now()}`;
    const rightNode: RenderableComponentData = JSON.parse(JSON.stringify(node));
    rightNode.id = newId;
    rightNode.context = rightNode.context || {};
    rightNode.context.timing = rightNode.context.timing || {};
    rightNode.context.timing.startInFrames = currentFrame;
    rightNode.context.timing.durationInFrames = rightDuration;

    // Hardcode its absolute boundaries so it stays exactly where it was rendered
    rightNode.data = rightNode.data || {};
    rightNode.data.boundaries = layer.boundaries;
    if ((rightNode.data as any).containerProps) {
       (rightNode.data as any).containerProps.style = {
           ...((rightNode.data as any).containerProps.style || {}),
           position: "absolute",
           left: `${layer.boundaries.left}px`,
           top: `${layer.boundaries.top}px`,
           width: `${layer.boundaries.width}px`,
           height: `${layer.boundaries.height}px`,
       };
    }

    const isMedia = rightNode.componentId === "VideoAtom" || rightNode.componentId === "AudioAtom" || rightNode.componentId === "ImageAtom";
    if (isMedia && rightNode.data) {
       const existingStartFrom = (rightNode.data as any).startFrom ?? 0;
       (rightNode.data as any).startFrom = existingStartFrom + (leftDuration / fps);
    }

    addNode(rightNode);
    selectLayer(newId, false);
  }, [selectedLayerIds, layers, mergedChildren, setOverride, addNode, selectLayer, fps]);

  const handleLayerClick = useCallback(
    (layer: FlatLayer) => {
      selectLayer(layer.id, false);
      const start = layer.timing.startInFrames ?? 0;
      playerRef.current?.seekTo(start);
      setCurrentFrame(start);
    },
    [selectLayer, playerRef, setCurrentFrame]
  );

  const frameToPct = useCallback(
    (frame: number) => Math.min(100, Math.max(0, (frame / durationInFrames) * 100)),
    [durationInFrames]
  );

  const pctToFrame = useCallback(
    (pct: number) => Math.round((pct / 100) * durationInFrames),
    [durationInFrames]
  );

  const handleBlockPointerDown = useCallback(
    (e: React.PointerEvent, layer: FlatLayer) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDraggingLayerId(layer.id);
      setDragStartFrame(layer.timing.startInFrames ?? 0);
    },
    []
  );

  const handleBlockPointerMove = useCallback(
    (e: React.PointerEvent, layer: FlatLayer) => {
      if (draggingLayerId !== layer.id) return;
      const el = trackAreaRef.current;
      const container = tracksContainerRef.current;
      if (!el || !container) return;
      const rect = el.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      let newStart = Math.max(0, Math.min(durationInFrames - (layer.timing.durationInFrames ?? 1), pctToFrame(pct)));
      const duration = layer.timing.durationInFrames ?? 1;

      if (snappingEnabled) {
        const snappedStart = getSnappedFrame(newStart, layer.id);
        const snappedEnd = getSnappedFrame(newStart + duration, layer.id) - duration;
        if (Math.abs(snappedStart - newStart) <= Math.abs(snappedEnd - newStart)) {
          newStart = snappedStart;
        } else {
          newStart = snappedEnd;
        }
      }

      // Vertical drag
      const containerRect = container.getBoundingClientRect();
      const y = e.clientY - containerRect.top + container.scrollTop;
      const isAudio = layer.componentId === "AudioAtom";
      
      let newZIndex = layer.boundaries?.zIndex ?? 0;
      const videoTracksHeight = groupedTracks.vRows.length * TRACK_HEIGHT;
      if (isAudio) {
        if (y >= videoTracksHeight + 4) {
           const aIndex = Math.floor((y - videoTracksHeight - 4) / TRACK_HEIGHT);
           if (aIndex >= 0 && aIndex < groupedTracks.aRows.length) {
              newZIndex = groupedTracks.aRows[aIndex].zIndex;
           } else if (aIndex >= groupedTracks.aRows.length) {
              newZIndex = (groupedTracks.aRows[groupedTracks.aRows.length - 1]?.zIndex ?? 0) + 1;
           }
        } else if (y < videoTracksHeight) {
           newZIndex = (groupedTracks.aRows[0]?.zIndex ?? 0) - 1;
        }
      } else {
        if (y < videoTracksHeight) {
           const vIndex = Math.floor(y / TRACK_HEIGHT);
           if (vIndex >= 0 && vIndex < groupedTracks.vRows.length) {
              newZIndex = groupedTracks.vRows[vIndex].zIndex;
           }
        } else {
           newZIndex = (groupedTracks.vRows[groupedTracks.vRows.length - 1]?.zIndex ?? 0) - 1;
        }
      }

      setOverride(layer.id, {
        data: {
           boundaries: {
              ...(layer.boundaries as any),
              zIndex: newZIndex
           }
        },
        context: { timing: { startInFrames: newStart, durationInFrames: duration } },
      });
      setCurrentFrame(newStart);
      playerRef.current?.seekTo(newStart);
    },
    [draggingLayerId, setOverride, setCurrentFrame, playerRef, pctToFrame, durationInFrames, groupedTracks]
  );

  const handleBlockPointerUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore if release fails (e.g. target no longer in document)
      }
      setDraggingLayerId(null);
      setTrimMode(null);
      setTrimLayerId(null);
    },
    []
  );

  const handleTrimLeftPointerDown = useCallback(
    (e: React.PointerEvent, layer: FlatLayer) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setTrimMode("left");
      setTrimLayerId(layer.id);
    },
    []
  );

  const handleTrimRightPointerDown = useCallback(
    (e: React.PointerEvent, layer: FlatLayer) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setTrimMode("right");
      setTrimLayerId(layer.id);
    },
    []
  );

    const handleTrimMove = useCallback(
    (e: React.PointerEvent, layer: FlatLayer) => {
      const currentFrame = useLayerStateStore.getState().currentFrame;
      if (trimMode === null || trimLayerId !== layer.id) return;
      const el = trackAreaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const frame = pctToFrame(pct);
      const start = layer.timing.startInFrames ?? 0;
      const duration = layer.timing.durationInFrames ?? 1;
      const end = start + duration;
      if (trimMode === "left") {
        let newStart = Math.max(0, Math.min(end - 1, frame));
        if (snappingEnabled) {
           const snappedStart = getSnappedFrame(newStart, layer.id);
           if (snappedStart < end) newStart = snappedStart;
        }
        const newDuration = end - newStart;
        setOverride(layer.id, {
          context: { timing: { startInFrames: newStart, durationInFrames: newDuration } },
        });
        if (currentFrame >= newStart && currentFrame < newStart + newDuration) {
          setCurrentFrame(currentFrame);
        } else {
          setCurrentFrame(newStart);
          playerRef.current?.seekTo(newStart);
        }
      } else {
        let newEnd = Math.max(start + 1, Math.min(durationInFrames, frame));
        if (snappingEnabled) {
           const snappedEnd = getSnappedFrame(newEnd, layer.id);
           if (snappedEnd > start) newEnd = snappedEnd;
        }
        const newDuration = newEnd - start;
        setOverride(layer.id, {
          context: { timing: { startInFrames: start, durationInFrames: newDuration } },
        });
        if (currentFrame >= start && currentFrame < newEnd) {
          setCurrentFrame(currentFrame);
        } else {
          playerRef.current?.seekTo(Math.min(currentFrame, newEnd - 1));
        }
      }
    },
    [trimMode, trimLayerId, setOverride, pctToFrame, setCurrentFrame, playerRef, durationInFrames, snappingEnabled, getSnappedFrame]
  );

  if (!calculatedMetadata || layers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
        No layers to display. Load a timeline to see tracks.
      </div>
    );
  }

  const renderTrackRow = (trackId: string, stateKey: string, type: "video" | "audio", trackLayers: FlatLayer[], displayLabel?: string) => {
    const state = trackStates[stateKey] || { hidden: false, muted: false, solo: false, locked: false };
    const label = displayLabel ?? stateKey;
    return (
      <div
        key={trackId}
        className="flex shrink-0 border-b border-border/50 hover:bg-muted/10 relative"
        style={{ height: TRACK_HEIGHT }}
      >
        <div
          className="shrink-0 w-[140px] border-r flex items-center px-2 text-xs truncate bg-background z-30"
          title={label}
        >
          <span className="flex-1 font-medium">{label}</span>
          <div className="flex items-center gap-0.5">
            {type === "video" && (
              <button
                type="button"
                className="p-1 rounded hover:bg-accent"
                onClick={() => setTrackState(stateKey, { hidden: !state.hidden })}
                title={state.hidden ? "Show track" : "Hide track"}
              >
                {state.hidden ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            )}
            {type === "audio" && (
              <>
                <button
                  type="button"
                  className={cn("p-1 rounded hover:bg-accent", state.muted && "text-destructive")}
                  onClick={() => setTrackState(stateKey, { muted: !state.muted })}
                  title={state.muted ? "Unmute track" : "Mute track"}
                >
                  {state.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                <button
                  type="button"
                  className={cn("p-1 rounded font-bold text-[10px]", state.solo ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground hover:bg-accent")}
                  onClick={() => setTrackState(stateKey, { solo: !state.solo })}
                  title={state.solo ? "Unsolo track" : "Solo track"}
                >
                  S
                </button>
              </>
            )}
            <button
              type="button"
              className="p-1 rounded hover:bg-accent"
              onClick={() => setTrackState(stateKey, { locked: !state.locked })}
              title={state.locked ? "Unlock track" : "Lock track"}
            >
              {state.locked ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Unlock className="h-3 w-3 text-muted-foreground" />}
            </button>
          </div>
        </div>
        <div
          className="flex-1 relative min-w-0 bg-muted/5"
        >
          {trackLayers.map((layer) => {
            const start = layer.timing.startInFrames ?? 0;
            const duration = Math.max(1, layer.timing.durationInFrames ?? 10);
            const leftPct = frameToPct(start);
            const widthPct = frameToPct(start + duration) - leftPct;
            const isSelected = selectedLayerIds.includes(layer.id);

            return (
              <div
                key={layer.id}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${Math.min(leftPct, 99)}%`,
                  width: `${Math.max(2, widthPct)}%`,
                }}
                onPointerMove={(e) => {
                  if (state.locked) return;
                  if (draggingLayerId === layer.id) handleBlockPointerMove(e, layer);
                  if (trimLayerId === layer.id && trimMode) handleTrimMove(e, layer);
                }}
                onPointerUp={handleBlockPointerUp}
                onPointerLeave={handleBlockPointerUp}
              >
                <TimelineClipBlock
                  layer={layer}
                  isSelected={isSelected}
                  stateLocked={state.locked}
                  onPointerDown={(e) => handleBlockPointerDown(e, layer)}
                  onClick={() => handleLayerClick(layer)}
                  onTrimLeftPointerDown={(e) => handleTrimLeftPointerDown(e, layer)}
                  onTrimRightPointerDown={(e) => handleTrimRightPointerDown(e, layer)}
                  title={`${layer.label} (${start}–${start + duration})`}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 relative">
      {/* Time ruler */}
      <div className="flex shrink-0 border-b bg-muted/20" style={{ height: RULER_HEIGHT }}>
        <div className="shrink-0 w-[140px] border-r flex items-center px-2 text-[10px] font-medium text-muted-foreground justify-between">
          <span>Time</span>
          <div className="flex gap-1">
            <button
              className={cn("p-1 rounded text-muted-foreground hover:bg-accent", snappingEnabled && "bg-accent text-accent-foreground")}
              onClick={() => setSnappingEnabled((s) => !s)}
              title="Snap (Magnet)"
            >
              <Magnet className="w-3 h-3" />
            </button>
            <button 
              className={cn("p-1 hover:bg-accent rounded text-muted-foreground", selectedLayerIds.length !== 1 && "opacity-50 cursor-not-allowed")} 
              title="Split (Razor)"
              onClick={handleSplit}
              disabled={selectedLayerIds.length !== 1}
            >
              <Scissors className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div ref={trackAreaRef} className="flex-1 relative">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 w-px bg-border"
              style={{ left: `${t * 100}%` }}
            />
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <span
              key={`label-${t}`}
              className="absolute top-0.5 text-[10px] text-muted-foreground"
              style={{ left: `${t * 100}%`, transform: "translateX(-50%)" }}
            >
              {formatTime(Math.round(t * durationInFrames), fps)}
            </span>
          ))}
        </div>
      </div>

      {/* Tracks + playhead container */}
      <div className="flex-1 overflow-auto relative min-h-0 flex flex-col pb-4 bg-background" ref={tracksContainerRef}>
        {groupedTracks.vRows.map((row, i) =>
          renderTrackRow(row.trackId, row.stateKey, "video", row.layers, `V${groupedTracks.vRows.length - 1 - i}`)
        )}
        
        {groupedTracks.aRows.length > 0 && (
          <div className="h-1 bg-muted/20 border-y shrink-0" />
        )}
        
        {groupedTracks.aRows.map((row, i) =>
          renderTrackRow(row.trackId, row.stateKey, "audio", row.layers, `A${groupedTracks.aRows.length - 1 - i}`)
        )}

        {/* Playhead: positioned over track area */}
        <Playhead durationInFrames={durationInFrames} fps={fps} />
      </div>
    </div>
  );
}
