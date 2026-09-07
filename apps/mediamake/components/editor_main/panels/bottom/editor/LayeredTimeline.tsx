"use client";

import { useMemo, useCallback, useRef, useState, useEffect } from "react";
import {
  Eye, EyeOff, Lock, Unlock, VolumeX, Volume2,
  Magnet, Scissors, ZoomIn, ZoomOut, Play, Pause,
} from "lucide-react";
import {
  flattenLayers,
  filterEditableLayers,
  filterLeafLayers,
  layerPathKey,
  type FlatLayer,
} from "@/lib/editor/flatten-layers";
import { useCompileStore } from "../../../stores/compile-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import type { RenderableComponentData } from "@microfox/remotion";
import { usePlayerRefStore } from "../../../stores/player-ref-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// ─── Constants ───────────────────────────────────────────────────────────────

const TRACK_HEIGHT = 36;
const RULER_HEIGHT = 30;
const LABEL_WIDTH = 160;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (frame: number, fps: number): string => {
  const totalSec = frame / fps;
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.floor(totalSec % 60);
  const frames = Math.round(frame % fps);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(frames).padStart(2, "0")}`;
};

const formatSecondsTick = (sec: number): string => {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  if (minutes > 0) return `${minutes}:${String(seconds.toFixed(seconds % 1 === 0 ? 0 : 1)).padStart(2, "0")}`;
  return `${seconds % 1 === 0 ? seconds : seconds.toFixed(1)}s`;
};

// ─── Clip color by component type ─────────────────────────────────────────────

const CLIP_STYLE: Record<string, { clip: string; clipSel: string; label: string }> = {
  TextAtom: {
    clip: "border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/25",
    clipSel: "border-blue-400 bg-blue-500/35",
    label: "text-blue-200",
  },
  ImageAtom: {
    clip: "border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/25",
    clipSel: "border-emerald-400 bg-emerald-500/35",
    label: "text-emerald-200",
  },
  VideoAtom: {
    clip: "border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25",
    clipSel: "border-amber-400 bg-amber-500/35",
    label: "text-amber-200",
  },
  AudioAtom: {
    clip: "border-violet-500/50 bg-violet-500/15 hover:bg-violet-500/25",
    clipSel: "border-violet-400 bg-violet-500/35",
    label: "text-violet-200",
  },
};
const DEFAULT_CLIP_STYLE = {
  clip: "border-border/50 bg-muted/30 hover:bg-muted/50",
  clipSel: "border-primary bg-primary/25",
  label: "text-muted-foreground",
};

function getClipStyle(componentId: string) {
  return CLIP_STYLE[componentId] ?? DEFAULT_CLIP_STYLE;
}

// ─── TimelineClipBlock ────────────────────────────────────────────────────────

function TimelineClipBlock({
  layer,
  isSelected,
  stateLocked,
  onPointerDown,
  onClick,
  onTrimLeftPointerDown,
  onTrimRightPointerDown,
}: {
  layer: FlatLayer;
  isSelected: boolean;
  stateLocked: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: () => void;
  onTrimLeftPointerDown: (e: React.PointerEvent) => void;
  onTrimRightPointerDown: (e: React.PointerEvent) => void;
}) {
  const style = getClipStyle(layer.componentId);
  const isText = layer.componentId === "TextAtom";
  const isMedia = layer.componentId === "ImageAtom" || layer.componentId === "VideoAtom";
  const previewText = layer.previewText;
  const previewSrc = layer.previewSrc;
  const displayLabel = isText && previewText?.trim()
    ? String(previewText).trim().slice(0, 80)
    : (layer.label || layer.id);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(e) => { if (!stateLocked) onPointerDown(e); }}
        onClick={onClick}
        className={cn(
          "absolute inset-y-1 rounded border text-[10px] overflow-hidden cursor-pointer transition-colors",
          isSelected ? style.clipSel : style.clip,
          stateLocked && "opacity-60 cursor-default",
        )}
        style={{ minWidth: 4 }}
      >
        {isMedia && previewSrc ? (
          <div className="absolute inset-0">
            {layer.componentId === "VideoAtom" ? (
              <video src={previewSrc} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            ) : (
              <div
                className="w-full h-full"
                style={{ backgroundImage: `url(${previewSrc})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }}
              />
            )}
            <span className="absolute bottom-0 left-0 right-0 py-0.5 px-1 bg-black/60 text-white truncate text-[9px]">
              {layer.label || layer.id}
            </span>
          </div>
        ) : (
          <span className={cn("flex items-center h-full truncate px-1.5", style.label)}>
            {displayLabel}
          </span>
        )}
      </div>

      {!stateLocked && (
        <>
          <div
            className="absolute inset-y-1.5 left-0 w-1.5 rounded-l cursor-ew-resize bg-white/5 hover:bg-white/20 z-20 opacity-0 hover:opacity-100 transition-opacity"
            onPointerDown={(e) => { e.stopPropagation(); onTrimLeftPointerDown(e); }}
          />
          <div
            className="absolute inset-y-1.5 right-0 w-1.5 rounded-r cursor-ew-resize bg-white/5 hover:bg-white/20 z-20 opacity-0 hover:opacity-100 transition-opacity"
            onPointerDown={(e) => { e.stopPropagation(); onTrimRightPointerDown(e); }}
          />
        </>
      )}
    </>
  );
}

// ─── Main LayeredTimeline ──────────────────────────────────────────────────────

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
    currentFrame,
  } = useLayerStateStore();

  const mergedChildren = useMemo(
    () => getMergedChildren(calculatedMetadata?.props?.childrenData),
    [calculatedMetadata?.props?.childrenData, getMergedChildren, overrides, addedNodes, childrenOrderByParentId, loadedChildrenData]
  );

  const fps = calculatedMetadata?.fps ?? 30;
  const durationInFrames = useMemo(
    () => (calculatedMetadata?.durationInFrames && calculatedMetadata.durationInFrames > 0)
      ? calculatedMetadata.durationInFrames : 1,
    [calculatedMetadata?.durationInFrames]
  );

  const layers = useMemo(() => {
    if (!mergedChildren) return [];
    const w = calculatedMetadata?.width ?? 1920;
    const h = calculatedMetadata?.height ?? 1080;
    const all = filterEditableLayers(flattenLayers(mergedChildren, { fps, compositionWidth: w, compositionHeight: h }));
    return filterLeafLayers(all).filter((l) => !hiddenLayerIds.has(l.id));
  }, [mergedChildren, fps, calculatedMetadata?.width, calculatedMetadata?.height, hiddenLayerIds]);

  // ─── Zoom & pixel conversion ────────────────────────────────────────────────

  const totalSeconds = durationInFrames / fps;

  // Measure the right-side track column with a callback ref so the observer is
  // set up regardless of when the element first mounts (e.g. after the
  // early-return guard is lifted once calculatedMetadata loads).
  const [containerWidth, setContainerWidth] = useState(800);
  const _roRef = useRef<ResizeObserver | null>(null);
  const trackRightRef = useCallback((el: HTMLDivElement | null) => {
    _roRef.current?.disconnect();
    _roRef.current = null;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 800;
      setContainerWidth(Math.max(1, w));
    });
    ro.observe(el);
    _roRef.current = ro;
  }, []);

  // Minimum pps: the zoom level at which the whole video fits in the visible area.
  const MAX_PPS = 400;
  const minPps = useMemo(
    () => Math.max(0.05, containerWidth / Math.max(1, totalSeconds)),
    [containerWidth, totalSeconds],
  );

  // Start at "fit" (whole video visible) and re-clamp whenever limits shift.
  const [pixelsPerSecond, setPixelsPerSecond] = useState(() => minPps);
  useEffect(() => {
    setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p)));
  }, [minPps]);

  const totalWidth = Math.max(containerWidth, totalSeconds * pixelsPerSecond);

  // Log-scale so the slider feels linear across the full zoom range.
  const ppsToSlider = useCallback(
    (pps: number) => {
      if (minPps >= MAX_PPS) return 0;
      const t = (Math.log(pps) - Math.log(minPps)) / (Math.log(MAX_PPS) - Math.log(minPps));
      return Math.round(Math.min(100, Math.max(0, t * 100)));
    },
    [minPps],
  );
  const sliderToPps = useCallback(
    (v: number) => Math.exp(Math.log(minPps) + (v / 100) * (Math.log(MAX_PPS) - Math.log(minPps))),
    [minPps],
  );

  const fitToView = useCallback(() => setPixelsPerSecond(minPps), [minPps]);

  const frameToPx = useCallback((frame: number) => (frame / fps) * pixelsPerSecond, [fps, pixelsPerSecond]);
  const pxToFrame = useCallback((px: number) => Math.round((px / pixelsPerSecond) * fps), [fps, pixelsPerSecond]);

  // ─── Scroll refs & sync ──────────────────────────────────────────────────────

  const labelColRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const rulerInnerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  // Sync the ruler horizontally by translating its inner content (reliable across
  // browsers, unlike setting scrollLeft on an overflow-hidden element).
  const syncRulerScroll = useCallback((scrollLeft: number) => {
    if (rulerInnerRef.current) {
      rulerInnerRef.current.style.transform = `translateX(${-scrollLeft}px)`;
    }
  }, []);

  const onScroll = useCallback(() => {
    const s = scrollRef.current;
    if (!s) return;
    syncRulerScroll(s.scrollLeft);
    if (labelColRef.current) labelColRef.current.scrollTop = s.scrollTop;
  }, [syncRulerScroll]);

  // Auto-scroll playhead into view when it moves
  const prevFrameRef = useRef(currentFrame);
  useEffect(() => {
    if (currentFrame === prevFrameRef.current) return;
    prevFrameRef.current = currentFrame;
    const s = scrollRef.current;
    if (!s) return;
    const px = frameToPx(currentFrame);
    if (px < s.scrollLeft + 40 || px > s.scrollLeft + s.clientWidth - 40) {
      s.scrollLeft = Math.max(0, px - s.clientWidth * 0.35);
    }
  }, [currentFrame, frameToPx]);

  // ─── Track grouping ──────────────────────────────────────────────────────────

  const groupedTracks = useMemo(() => {
    const videoLayers = layers.filter((l) => l.componentId !== "AudioAtom");
    const audioLayers = layers.filter((l) => l.componentId === "AudioAtom");

    const assignRows = (list: FlatLayer[], prefix: "V" | "A") => {
      const indexMap = new Map<string, number>();
      list.forEach((l, idx) => indexMap.set(l.id, idx));

      const pinnedIds = new Set<string>();
      for (const l of list) {
        if (l.componentId === "ImageAtom" && l.depth === 1 && (l.timing.startInFrames ?? 0) === 0) {
          pinnedIds.add(l.id);
        }
      }

      const rows: FlatLayer[][] = [];
      for (const layer of list) {
        const start = layer.timing.startInFrames ?? 0;
        const dur = Math.max(1, layer.timing.durationInFrames ?? 1);
        const end = start + dur;
        let placed = false;
        for (let idx = rows.length - 1; idx >= 0; idx--) {
          const row = rows[idx];
          let overlaps = false;
          for (const other of row) {
            if (pinnedIds.has(other.id) || pinnedIds.has(layer.id)) { overlaps = true; break; }
            const oStart = other.timing.startInFrames ?? 0;
            const oEnd = oStart + Math.max(1, other.timing.durationInFrames ?? 1);
            if (!(end <= oStart || start >= oEnd)) { overlaps = true; break; }
          }
          if (!overlaps) { row.push(layer); placed = true; break; }
        }
        if (!placed) rows.push([layer]);
      }

      const withOrder = rows.map((rowLayers, rowIndex) => {
        const maxIdx = rowLayers.reduce((max, l) => Math.max(max, indexMap.get(l.id) ?? -1), -1);
        return { rowLayers, rowIndex, maxIdx };
      });
      withOrder.sort((a, b) => b.maxIdx - a.maxIdx);

      return withOrder.map(({ rowLayers }, rowIndex) => ({
        trackId: `${prefix}${rowIndex}`,
        stateKey: `${prefix}${rowIndex}`,
        zIndex: rowLayers[0]?.boundaries?.zIndex ?? 0,
        rowIndex,
        layers: rowLayers,
      }));
    };

    return { vRows: assignRows(videoLayers, "V"), aRows: assignRows(audioLayers, "A") };
  }, [layers]);

  // ─── Ruler ───────────────────────────────────────────────────────────────────

  const rulerTicks = useMemo(() => {
    const interval = pixelsPerSecond > 200 ? 0.5
      : pixelsPerSecond > 100 ? 1
      : pixelsPerSecond > 50 ? 2
      : pixelsPerSecond > 25 ? 5 : 10;
    const ticks: number[] = [];
    for (let t = 0; t <= totalSeconds + 0.001; t += interval) {
      ticks.push(parseFloat(t.toFixed(3)));
    }
    return { ticks, interval };
  }, [pixelsPerSecond, totalSeconds]);

  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // getBoundingClientRect() already accounts for the parent's scrollLeft,
    // so no need to add scrollLeft separately.
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const frame = Math.max(0, Math.min(durationInFrames - 1, pxToFrame(px)));
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  }, [durationInFrames, pxToFrame, playerRef, setCurrentFrame]);

  // ─── Snapping ──────────────────────────────────────────────────────────────

  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const SNAP_THRESHOLD = Math.round(fps * 0.2);

  const getSnappedFrame = useCallback((targetFrame: number, ignoreId?: string) => {
    if (!snappingEnabled) return targetFrame;
    const snapPoints = new Set<number>([0, durationInFrames, useLayerStateStore.getState().currentFrame]);
    for (const l of layers) {
      if (l.id === ignoreId) continue;
      const s = l.timing.startInFrames ?? 0;
      snapPoints.add(s);
      snapPoints.add(s + (l.timing.durationInFrames ?? 1));
    }
    let closest = targetFrame;
    let minDiff = SNAP_THRESHOLD;
    for (const p of snapPoints) {
      const d = Math.abs(p - targetFrame);
      if (d < minDiff) { minDiff = d; closest = p; }
    }
    return closest;
  }, [snappingEnabled, layers, durationInFrames, SNAP_THRESHOLD]);

  // ─── Drag state ────────────────────────────────────────────────────────────

  const dragStateRef = useRef<{
    type: "move" | "trim-left" | "trim-right";
    layerId: string;
    startClientX: number;
    startFrame: number;  // original startInFrames
    startDuration: number;
  } | null>(null);

  const [dragging, setDragging] = useState<string | null>(null);

  const handleBlockPointerDown = useCallback((e: React.PointerEvent, layer: FlatLayer) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      type: "move",
      layerId: layer.id,
      startClientX: e.clientX,
      startFrame: layer.timing.startInFrames ?? 0,
      startDuration: Math.max(1, layer.timing.durationInFrames ?? 1),
    };
    setDragging(layer.id);
  }, []);

  const handleTrimLeftPointerDown = useCallback((e: React.PointerEvent, layer: FlatLayer) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      type: "trim-left",
      layerId: layer.id,
      startClientX: e.clientX,
      startFrame: layer.timing.startInFrames ?? 0,
      startDuration: Math.max(1, layer.timing.durationInFrames ?? 1),
    };
    setDragging(layer.id);
  }, []);

  const handleTrimRightPointerDown = useCallback((e: React.PointerEvent, layer: FlatLayer) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      type: "trim-right",
      layerId: layer.id,
      startClientX: e.clientX,
      startFrame: layer.timing.startInFrames ?? 0,
      startDuration: Math.max(1, layer.timing.durationInFrames ?? 1),
    };
    setDragging(layer.id);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag) return;

    const deltaX = e.clientX - drag.startClientX;
    const deltaFrames = Math.round((deltaX / pixelsPerSecond) * fps);

    if (drag.type === "move") {
      let newStart = Math.max(0, Math.min(durationInFrames - drag.startDuration, drag.startFrame + deltaFrames));
      if (snappingEnabled) {
        const snappedStart = getSnappedFrame(newStart, drag.layerId);
        const snappedEnd = getSnappedFrame(newStart + drag.startDuration, drag.layerId) - drag.startDuration;
        newStart = Math.abs(snappedStart - newStart) <= Math.abs(snappedEnd - newStart)
          ? snappedStart : snappedEnd;
      }
      setOverride(drag.layerId, {
        context: { timing: { startInFrames: newStart, durationInFrames: drag.startDuration } },
      });
      playerRef.current?.seekTo(newStart);
      setCurrentFrame(newStart);

    } else if (drag.type === "trim-left") {
      const end = drag.startFrame + drag.startDuration;
      let newStart = Math.max(0, Math.min(end - 1, drag.startFrame + deltaFrames));
      if (snappingEnabled) {
        const snapped = getSnappedFrame(newStart, drag.layerId);
        if (snapped < end) newStart = snapped;
      }
      const newDur = end - newStart;
      setOverride(drag.layerId, {
        context: { timing: { startInFrames: newStart, durationInFrames: newDur } },
      });
      playerRef.current?.seekTo(newStart);
      setCurrentFrame(newStart);

    } else if (drag.type === "trim-right") {
      let newEnd = Math.max(drag.startFrame + 1, Math.min(durationInFrames, drag.startFrame + drag.startDuration + deltaFrames));
      if (snappingEnabled) {
        const snapped = getSnappedFrame(newEnd, drag.layerId);
        if (snapped > drag.startFrame) newEnd = snapped;
      }
      const newDur = newEnd - drag.startFrame;
      setOverride(drag.layerId, {
        context: { timing: { startInFrames: drag.startFrame, durationInFrames: newDur } },
      });
    }
  }, [pixelsPerSecond, fps, durationInFrames, snappingEnabled, getSnappedFrame, setOverride, playerRef, setCurrentFrame]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    dragStateRef.current = null;
    setDragging(null);
  }, []);

  // ─── Click layer ──────────────────────────────────────────────────────────

  const handleLayerClick = useCallback((layer: FlatLayer) => {
    selectLayer(layer.id, false);
    const start = layer.timing.startInFrames ?? 0;
    playerRef.current?.seekTo(start);
    setCurrentFrame(start);
  }, [selectLayer, playerRef, setCurrentFrame]);

  // ─── Split ──────────────────────────────────────────────────────────────────

  const handleSplit = useCallback(() => {
    if (selectedLayerIds.length !== 1) return;
    const cf = useLayerStateStore.getState().currentFrame;
    const layerId = selectedLayerIds[0];
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;
    const start = layer.timing.startInFrames ?? 0;
    const dur = layer.timing.durationInFrames ?? 1;
    if (cf <= start || cf >= start + dur) return;

    const findNode = (nodes: RenderableComponentData[] | undefined, id: string): RenderableComponentData | null => {
      if (!nodes) return null;
      for (const n of nodes) {
        if (n.id === id) return n;
        const found = findNode(n.childrenData, id);
        if (found) return found;
      }
      return null;
    };

    const node = findNode(mergedChildren, layerId);
    if (!node) return;

    setOverride(layerId, { context: { timing: { startInFrames: start, durationInFrames: cf - start } } });

    const newId = `${node.id}-split-${Date.now()}`;
    const right: RenderableComponentData = JSON.parse(JSON.stringify(node));
    right.id = newId;
    right.context = { ...(right.context ?? {}), timing: { startInFrames: cf, durationInFrames: start + dur - cf } };
    right.data = right.data ?? {};
    right.data.boundaries = layer.boundaries;
    const isMedia = ["VideoAtom", "AudioAtom", "ImageAtom"].includes(right.componentId);
    if (isMedia) (right.data as any).startFrom = ((right.data as any).startFrom ?? 0) + (cf - start) / fps;
    addNode(right);
    selectLayer(newId, false);
  }, [selectedLayerIds, layers, mergedChildren, setOverride, addNode, selectLayer, fps]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!calculatedMetadata || layers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
        No layers to display. Load a timeline to see tracks.
      </div>
    );
  }

  const playheadPx = frameToPx(currentFrame);

  const renderTrackLabel = (trackId: string, stateKey: string, type: "video" | "audio", displayLabel: string) => {
    const state = trackStates[stateKey] || { hidden: false, muted: false, solo: false, locked: false };
    return (
      <div
        key={trackId}
        className="shrink-0 flex items-center gap-1 px-2 border-b border-border/40 bg-background"
        style={{ height: TRACK_HEIGHT }}
      >
        <span className="flex-1 text-xs font-medium truncate text-muted-foreground">{displayLabel}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          {type === "video" && (
            <button
              type="button"
              className={cn("p-0.5 rounded hover:bg-accent/60 transition-colors", state.hidden && "text-muted-foreground/40")}
              onClick={() => setTrackState(stateKey, { hidden: !state.hidden })}
              title={state.hidden ? "Show" : "Hide"}
            >
              {state.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
            </button>
          )}
          {type === "audio" && (
            <>
              <button
                type="button"
                className={cn("p-0.5 rounded hover:bg-accent/60 transition-colors", state.muted && "text-destructive")}
                onClick={() => setTrackState(stateKey, { muted: !state.muted })}
                title={state.muted ? "Unmute" : "Mute"}
              >
                {state.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3 text-muted-foreground" />}
              </button>
              <button
                type="button"
                className={cn("p-0.5 rounded text-[9px] font-bold", state.solo ? "text-yellow-400 bg-yellow-400/10" : "text-muted-foreground hover:bg-accent/60")}
                onClick={() => setTrackState(stateKey, { solo: !state.solo })}
                title={state.solo ? "Unsolo" : "Solo"}
              >
                S
              </button>
            </>
          )}
          <button
            type="button"
            className="p-0.5 rounded hover:bg-accent/60 transition-colors"
            onClick={() => setTrackState(stateKey, { locked: !state.locked })}
            title={state.locked ? "Unlock" : "Lock"}
          >
            {state.locked
              ? <Lock className="h-3 w-3 text-amber-400" />
              : <Unlock className="h-3 w-3 text-muted-foreground" />}
          </button>
        </div>
      </div>
    );
  };

  const renderTrackRow = (trackId: string, stateKey: string, type: "video" | "audio", trackLayers: FlatLayer[]) => {
    const state = trackStates[stateKey] || { hidden: false, muted: false, solo: false, locked: false };
    return (
      <div
        key={trackId}
        className="relative shrink-0 border-b border-border/40"
        style={{ height: TRACK_HEIGHT }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {trackLayers.map((layer) => {
          const start = layer.timing.startInFrames ?? 0;
          const dur = Math.max(1, layer.timing.durationInFrames ?? 10);
          const left = frameToPx(start);
          const width = Math.max(4, frameToPx(dur));
          const isSelected = selectedLayerIds.includes(layer.id);

          return (
            <div
              key={layerPathKey(layer)}
              className="absolute top-0 bottom-0"
              style={{ left, width }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <TimelineClipBlock
                layer={layer}
                isSelected={isSelected}
                stateLocked={state.locked}
                onPointerDown={(e) => handleBlockPointerDown(e, layer)}
                onClick={() => handleLayerClick(layer)}
                onTrimLeftPointerDown={(e) => handleTrimLeftPointerDown(e, layer)}
                onTrimRightPointerDown={(e) => handleTrimRightPointerDown(e, layer)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background select-none">
      {/* ── Top control bar ── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b bg-muted/10">
        {/* Play/Pause */}
        <Button size="icon" variant="ghost" className="h-6 w-6"
          onClick={() => playerRef.current?.play()} title="Play">
          <Play className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6"
          onClick={() => playerRef.current?.pause()} title="Pause">
          <Pause className="h-3 w-3" />
        </Button>

        {/* Current time */}
        <span className="text-xs font-mono text-muted-foreground min-w-[64px]">
          {formatTime(currentFrame, fps)}
        </span>
        <span className="text-xs text-muted-foreground/40">/</span>
        <span className="text-xs font-mono text-muted-foreground/60">
          {formatTime(durationInFrames, fps)}
        </span>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Snap */}
        <button
          className={cn("p-1 rounded text-muted-foreground hover:bg-accent transition-colors", snappingEnabled && "bg-accent text-accent-foreground")}
          onClick={() => setSnappingEnabled((s) => !s)}
          title="Snap to grid"
        >
          <Magnet className="h-3 w-3" />
        </button>

        {/* Split */}
        <button
          className={cn("p-1 rounded text-muted-foreground hover:bg-accent transition-colors", selectedLayerIds.length !== 1 && "opacity-40 cursor-not-allowed")}
          onClick={handleSplit}
          disabled={selectedLayerIds.length !== 1}
          title="Split at playhead"
        >
          <Scissors className="h-3 w-3" />
        </button>

        <div className="flex-1" />

        {/* Zoom */}
        <Button
          size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-muted-foreground"
          onClick={fitToView} title="Fit full timeline in view"
        >
          Fit
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6"
          onClick={() => setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p / 1.5)))} title="Zoom out">
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Slider
          min={0} max={100} step={1}
          value={[ppsToSlider(pixelsPerSecond)]}
          onValueChange={(v) => setPixelsPerSecond(sliderToPps(v[0] ?? 0))}
          className="w-24"
        />
        <Button size="icon" variant="ghost" className="h-6 w-6"
          onClick={() => setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p * 1.5)))} title="Zoom in">
          <ZoomIn className="h-3 w-3" />
        </Button>
      </div>

      {/* ── Main timeline body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Fixed label column */}
        <div
          className="shrink-0 border-r border-border/60 flex flex-col bg-background"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Ruler placeholder */}
          <div
            className="shrink-0 border-b border-border/40 bg-muted/20"
            style={{ height: RULER_HEIGHT }}
          />
          {/* Labels — vertically synced with scrollRef */}
          <div className="flex-1 overflow-y-hidden" ref={labelColRef}>
            {groupedTracks.vRows.map((row, i) =>
              renderTrackLabel(row.trackId, row.stateKey, "video", `V${groupedTracks.vRows.length - 1 - i}`)
            )}
            {groupedTracks.aRows.length > 0 && (
              <div className="shrink-0 h-px bg-border/60" />
            )}
            {groupedTracks.aRows.map((row, i) =>
              renderTrackLabel(row.trackId, row.stateKey, "audio", `A${groupedTracks.aRows.length - 1 - i}`)
            )}
          </div>
        </div>

        {/* Right side: ruler + tracks — ref used by ResizeObserver for dynamic min zoom */}
        <div className="flex flex-col flex-1 min-w-0" ref={trackRightRef}>

          {/* Ruler row (not scrollable; inner is synced via scrollLeft) */}
          <div
            className="shrink-0 overflow-hidden border-b border-border/40 bg-muted/20 cursor-pointer relative"
            style={{ height: RULER_HEIGHT }}
            ref={rulerRef}
          >
            <div
              ref={rulerInnerRef}
              className="absolute inset-0 will-change-transform"
              style={{ width: totalWidth, minWidth: "100%" }}
              onClick={handleRulerClick}
            >
              {rulerTicks.ticks.map((tick) => {
                const px = tick * pixelsPerSecond;
                const isMajor = tick % (rulerTicks.interval * 5) < 0.001 || rulerTicks.interval >= 5;
                return (
                  <div
                    key={tick}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: px }}
                  >
                    <div className={cn("w-px", isMajor ? "h-3 bg-muted-foreground/50" : "h-1.5 bg-muted-foreground/25")} />
                    {isMajor && (
                      <span className="absolute top-3 text-[9px] text-muted-foreground/70 translate-x-1 whitespace-nowrap">
                        {formatSecondsTick(tick)}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Playhead triangle on ruler */}
              <div
                className="absolute top-0 z-10 pointer-events-none"
                style={{ left: playheadPx }}
              >
                <div className="relative">
                  <div
                    className="absolute w-0 h-0 -translate-x-1/2"
                    style={{
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "8px solid hsl(var(--primary))",
                    }}
                  />
                  <div className="absolute top-2 -translate-x-1/2 w-px h-5 bg-primary/70" />
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable track area */}
          <div
            className="flex-1 overflow-auto relative"
            ref={scrollRef}
            onScroll={onScroll}
          >
            <div
              className="relative"
              style={{ width: totalWidth, minWidth: "100%" }}
              ref={trackAreaRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Video tracks */}
              {groupedTracks.vRows.map((row, i) =>
                renderTrackRow(row.trackId, row.stateKey, "video", row.layers)
              )}

              {/* Audio divider */}
              {groupedTracks.aRows.length > 0 && (
                <div className="h-px bg-border/60 shrink-0" />
              )}

              {/* Audio tracks */}
              {groupedTracks.aRows.map((row) =>
                renderTrackRow(row.trackId, row.stateKey, "audio", row.layers)
              )}

              {/* Playhead vertical line */}
              <div
                className="absolute top-0 bottom-0 w-px bg-primary/80 pointer-events-none z-20"
                style={{ left: playheadPx }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
