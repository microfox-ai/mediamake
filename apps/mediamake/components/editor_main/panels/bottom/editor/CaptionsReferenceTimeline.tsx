"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { usePlayerRefStore } from "../../../stores/player-ref-store";
import type { ReferenceItem } from "@/components/editor/presets/types";

export interface CaptionsReferenceTimelineProps {
  reference: ReferenceItem;
  referenceIndex: number;
  timelineId: string;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const RULER_HEIGHT = 28;
const ROW_HEIGHT = 48;
const LABEL_WIDTH = 140;
const MIN_SEG_PX = 4;
const MIN_GAP = 0.01;
const MAX_PPS = 2000;

const LINE_COLOR =
  "border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/35 text-blue-200";
const WORD_COLOR =
  "border-violet-500/50 bg-violet-500/20 hover:bg-violet-500/35 text-violet-200";

// ─── Caption helpers ──────────────────────────────────────────────────────────

type CaptionWord = {
  id?: string;
  text?: string;
  start?: number;
  end?: number;
  absoluteStart?: number;
  absoluteEnd?: number;
  duration?: number;
  confidence?: number;
  [key: string]: unknown;
};

type CaptionLine = {
  id?: string;
  text?: string;
  start?: number;
  end?: number;
  absoluteStart?: number;
  absoluteEnd?: number;
  duration?: number;
  words?: CaptionWord[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type DragTarget =
  | { kind: "line"; lineIdx: number; edge: "move" | "left" | "right" }
  | { kind: "word"; lineIdx: number; wordIdx: number; edge: "move" | "left" | "right" };

function formatTimeLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  if (sec < 1 && sec > 0) return `${sec.toFixed(1)}s`;
  return `${s}s`;
}

function getLineBounds(line: CaptionLine): { start: number; end: number } {
  const words = line.words ?? [];
  if (words.length > 0) {
    const start = words[0]?.absoluteStart ?? line.absoluteStart ?? 0;
    const end =
      words[words.length - 1]?.absoluteEnd ?? line.absoluteEnd ?? start;
    return { start: Number(start) || 0, end: Math.max(Number(end) || 0, Number(start) || 0) };
  }
  const start = Number(line.absoluteStart ?? line.start ?? 0) || 0;
  const end = Number(line.absoluteEnd ?? line.end ?? start) || start;
  return { start, end: Math.max(end, start) };
}

function getWordBounds(word: CaptionWord): { start: number; end: number } {
  const start = Number(word.absoluteStart ?? word.start ?? 0) || 0;
  const end = Number(word.absoluteEnd ?? word.end ?? start) || start;
  return { start, end: Math.max(end, start) };
}

/** Sync relative start/end/duration from absolute word timings. */
function recomputeLineFromWords(line: CaptionLine): CaptionLine {
  const words = (line.words ?? []).map((w) => ({ ...w }));
  if (words.length === 0) {
    const { start, end } = getLineBounds(line);
    return {
      ...line,
      absoluteStart: start,
      absoluteEnd: end,
      start,
      end,
      duration: Math.max(0, end - start),
    };
  }

  const absoluteStart = getWordBounds(words[0]!).start;
  const absoluteEnd = getWordBounds(words[words.length - 1]!).end;

  return {
    ...line,
    absoluteStart,
    absoluteEnd,
    start: absoluteStart,
    end: absoluteEnd,
    duration: Math.max(0, absoluteEnd - absoluteStart),
    text: words.map((w) => w.text ?? "").join(" ").trim() || line.text,
    words: words.map((w) => {
      const { start, end } = getWordBounds(w);
      return {
        ...w,
        absoluteStart: start,
        absoluteEnd: end,
        start: start - absoluteStart,
        end: end - absoluteStart,
        duration: Math.max(0, end - start),
      };
    }),
  };
}

function shiftLine(line: CaptionLine, delta: number): CaptionLine {
  const words = (line.words ?? []).map((w) => {
    const { start, end } = getWordBounds(w);
    return {
      ...w,
      absoluteStart: start + delta,
      absoluteEnd: end + delta,
    };
  });
  const { start, end } = getLineBounds(line);
  return recomputeLineFromWords({
    ...line,
    absoluteStart: start + delta,
    absoluteEnd: end + delta,
    words,
  });
}

function applyLineEdge(
  line: CaptionLine,
  edge: "left" | "right",
  nextStart: number,
  nextEnd: number,
): CaptionLine {
  const words = [...(line.words ?? [])].map((w) => ({ ...w }));
  const { start: curStart, end: curEnd } = getLineBounds(line);

  if (words.length === 0) {
    return recomputeLineFromWords({
      ...line,
      absoluteStart: nextStart,
      absoluteEnd: nextEnd,
    });
  }

  if (edge === "left") {
    const first = words[0]!;
    const { end: firstEnd } = getWordBounds(first);
    words[0] = {
      ...first,
      absoluteStart: Math.min(nextStart, firstEnd - MIN_GAP),
      absoluteEnd: firstEnd,
    };
    // If shrinking/growing the line start, keep remaining words fixed unless
    // the new start would push past them — recomputeLineFromWords handles bounds.
    return recomputeLineFromWords({
      ...line,
      absoluteStart: nextStart,
      absoluteEnd: curEnd,
      words,
    });
  }

  const last = words[words.length - 1]!;
  const { start: lastStart } = getWordBounds(last);
  words[words.length - 1] = {
    ...last,
    absoluteStart: lastStart,
    absoluteEnd: Math.max(nextEnd, lastStart + MIN_GAP),
  };
  return recomputeLineFromWords({
    ...line,
    absoluteStart: curStart,
    absoluteEnd: nextEnd,
    words,
  });
}

function applyWordEdge(
  line: CaptionLine,
  wordIdx: number,
  edge: "move" | "left" | "right",
  nextStart: number,
  nextEnd: number,
): CaptionLine {
  const words = (line.words ?? []).map((w) => ({ ...w }));
  const word = words[wordIdx];
  if (!word) return line;

  if (edge === "move") {
    const dur = Math.max(MIN_GAP, nextEnd - nextStart);
    words[wordIdx] = {
      ...word,
      absoluteStart: nextStart,
      absoluteEnd: nextStart + dur,
    };
  } else if (edge === "left") {
    words[wordIdx] = {
      ...word,
      absoluteStart: nextStart,
      absoluteEnd: getWordBounds(word).end,
    };
  } else {
    words[wordIdx] = {
      ...word,
      absoluteStart: getWordBounds(word).start,
      absoluteEnd: nextEnd,
    };
  }

  return recomputeLineFromWords({ ...line, words });
}

// ─── Segment block ────────────────────────────────────────────────────────────

function TimingBlock({
  left,
  width,
  color,
  isSelected,
  label,
  onSelect,
  onMoveDown,
  onLeftDown,
  onRightDown,
  onPointerMove,
  onPointerUp,
}: {
  left: number;
  width: number;
  color: string;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
  onMoveDown: (e: React.PointerEvent) => void;
  onLeftDown: (e: React.PointerEvent) => void;
  onRightDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="absolute top-1.5 bottom-1.5 group/seg"
      style={{ left, width: Math.max(MIN_SEG_PX, width), overflow: "visible" }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        className={cn(
          "absolute inset-0 rounded border cursor-grab active:cursor-grabbing flex items-center transition-colors",
          color,
          isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background z-[1]",
        )}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
          onMoveDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {width > 36 && (
          <span className="px-2 text-[9px] font-medium truncate pointer-events-none select-none">
            {label}
          </span>
        )}
      </div>
      <div
        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-start pl-0.5 opacity-0 group-hover/seg:opacity-100 transition-opacity"
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
          onLeftDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="w-0.5 h-5 rounded-full bg-white/60" />
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-end pr-0.5 opacity-0 group-hover/seg:opacity-100 transition-opacity"
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
          onRightDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="w-0.5 h-5 rounded-full bg-white/60" />
      </div>
    </div>
  );
}

// ─── Captions timeline ────────────────────────────────────────────────────────

export function CaptionsReferenceTimeline({
  reference,
  referenceIndex,
  timelineId,
}: CaptionsReferenceTimelineProps) {
  const updateTimeline = useTimelineEditsStore((s) => s.updateTimeline);
  const editedTimeline = useTimelineEditsStore((s) =>
    s.editedTimelines.get(timelineId),
  );
  const { generateOutput } = useCompileStore();
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const setCurrentFrame = useLayerStateStore((s) => s.setCurrentFrame);
  const playerRef = usePlayerRefStore((s) => s.playerRef);

  const fps = calculatedMetadata?.fps ?? 30;
  const currentTimeSec = currentFrame / fps;

  const liveReference =
    (editedTimeline?.defaultData?.references?.[referenceIndex] as ReferenceItem | undefined) ||
    reference;

  const storeCaptions: CaptionLine[] = useMemo(
    () =>
      Array.isArray(liveReference?.value?.captions)
        ? liveReference.value.captions
        : [],
    [liveReference?.value?.captions],
  );

  const [localCaptions, setLocalCaptions] = useState<CaptionLine[]>(storeCaptions);
  const dragRef = useRef<{
    target: DragTarget;
    startClientX: number;
    origStart: number;
    origEnd: number;
    minBound: number;
    maxBound: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from store when not dragging
  const captionsKey = useMemo(
    () =>
      storeCaptions
        .map((c) => {
          const b = getLineBounds(c);
          const words = (c.words ?? [])
            .map((w) => {
              const wb = getWordBounds(w);
              return `${wb.start}-${wb.end}`;
            })
            .join(",");
          return `${c.id ?? ""}:${b.start}-${b.end}:${words}`;
        })
        .join("|"),
    [storeCaptions],
  );

  useEffect(() => {
    if (dragRef.current) return;
    setLocalCaptions(storeCaptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captionsKey]);

  const compiledSec =
    calculatedMetadata?.durationInFrames && calculatedMetadata.durationInFrames > 0
      ? calculatedMetadata.durationInFrames / fps
      : 0;
  const lastCaptionEnd =
    localCaptions.length > 0
      ? getLineBounds(localCaptions[localCaptions.length - 1]!).end
      : 0;
  const totalDuration = Math.max(1, compiledSec || lastCaptionEnd || 60);

  // ── Zoom / layout ─────────────────────────────────────────────────────────

  const [containerWidth, setContainerWidth] = useState(800);
  const trackRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRightRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 800;
      setContainerWidth(Math.max(1, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const minPps = useMemo(
    () => Math.max(0.05, containerWidth / totalDuration),
    [containerWidth, totalDuration],
  );
  const [pixelsPerSecond, setPixelsPerSecond] = useState(80);

  useEffect(() => {
    setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p)));
  }, [minPps]);

  const totalWidth = Math.max(containerWidth, totalDuration * pixelsPerSecond);
  const secToPx = useCallback((s: number) => s * pixelsPerSecond, [pixelsPerSecond]);
  const pxToSec = useCallback((px: number) => px / pixelsPerSecond, [pixelsPerSecond]);

  const ppsToSlider = useCallback(
    (pps: number) => {
      if (minPps >= MAX_PPS) return 0;
      const t =
        (Math.log(pps) - Math.log(minPps)) / (Math.log(MAX_PPS) - Math.log(minPps));
      return Math.round(Math.min(100, Math.max(0, t * 100)));
    },
    [minPps],
  );
  const sliderToPps = useCallback(
    (v: number) =>
      Math.exp(Math.log(minPps) + (v / 100) * (Math.log(MAX_PPS) - Math.log(minPps))),
    [minPps],
  );

  const fitToView = useCallback(() => setPixelsPerSecond(minPps), [minPps]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const f = e.deltaY < 0 ? 1.2 : 1 / 1.2;
        setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p * f)));
      }
    },
    [minPps],
  );

  // ── Commit ────────────────────────────────────────────────────────────────

  const commitCaptions = useCallback(
    (next: CaptionLine[]) => {
      const latest =
        useTimelineEditsStore.getState().getEditedTimeline(timelineId) ||
        editedTimeline;
      if (!latest) return;
      const refs = [...(latest.defaultData?.references || [])];
      const current = refs[referenceIndex];
      if (!current) return;
      refs[referenceIndex] = {
        ...current,
        value: { ...(current.value || {}), captions: next },
      };
      updateTimeline(timelineId, {
        defaultData: { ...(latest.defaultData || {}), references: refs },
      });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const fresh =
          useTimelineEditsStore.getState().getEditedTimeline(timelineId) || latest;
        generateOutput(fresh);
      }, 500);
    },
    [timelineId, referenceIndex, editedTimeline, updateTimeline, generateOutput],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // ── Selection ─────────────────────────────────────────────────────────────

  const [selected, setSelected] = useState<{
    kind: "line" | "word";
    lineIdx: number;
    wordIdx?: number;
  } | null>(null);

  // ── Drag ──────────────────────────────────────────────────────────────────

  const startDrag = useCallback(
    (
      e: React.PointerEvent,
      target: DragTarget,
      origStart: number,
      origEnd: number,
      minBound: number,
      maxBound: number,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        target,
        startClientX: e.clientX,
        origStart,
        origEnd,
        minBound,
        maxBound,
      };
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const deltaSec = (e.clientX - drag.startClientX) / pixelsPerSecond;
      const duration = drag.origEnd - drag.origStart;

      setLocalCaptions((prev) => {
        const next = prev.map((c) => ({ ...c, words: (c.words ?? []).map((w) => ({ ...w })) }));
        const { target } = drag;

        if (target.kind === "line") {
          const line = next[target.lineIdx];
          if (!line) return prev;

          if (target.edge === "move") {
            let newStart = Math.max(
              drag.minBound,
              Math.min(drag.maxBound - duration, drag.origStart + deltaSec),
            );
            const shifted = shiftLine(line, newStart - drag.origStart);
            next[target.lineIdx] = shifted;
          } else if (target.edge === "left") {
            const newStart = Math.max(
              drag.minBound,
              Math.min(drag.origEnd - MIN_GAP, drag.origStart + deltaSec),
            );
            next[target.lineIdx] = applyLineEdge(line, "left", newStart, drag.origEnd);
          } else {
            const newEnd = Math.min(
              drag.maxBound,
              Math.max(drag.origStart + MIN_GAP, drag.origEnd + deltaSec),
            );
            next[target.lineIdx] = applyLineEdge(line, "right", drag.origStart, newEnd);
          }
          return next;
        }

        // word
        const line = next[target.lineIdx];
        if (!line) return prev;
        let newStart = drag.origStart;
        let newEnd = drag.origEnd;

        if (target.edge === "move") {
          newStart = Math.max(
            drag.minBound,
            Math.min(drag.maxBound - duration, drag.origStart + deltaSec),
          );
          newEnd = newStart + duration;
        } else if (target.edge === "left") {
          newStart = Math.max(
            drag.minBound,
            Math.min(drag.origEnd - MIN_GAP, drag.origStart + deltaSec),
          );
        } else {
          newEnd = Math.min(
            drag.maxBound,
            Math.max(drag.origStart + MIN_GAP, drag.origEnd + deltaSec),
          );
        }

        next[target.lineIdx] = applyWordEdge(
          line,
          target.wordIdx,
          target.edge,
          newStart,
          newEnd,
        );
        return next;
      });
    },
    [pixelsPerSecond],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragRef.current = null;
      setLocalCaptions((prev) => {
        commitCaptions(prev);
        return prev;
      });
    },
    [commitCaptions],
  );

  // ── Scroll / ruler ────────────────────────────────────────────────────────

  const rulerInnerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelScrollRef = useRef<HTMLDivElement>(null);

  const syncRulerScroll = useCallback((scrollLeft: number) => {
    if (rulerInnerRef.current) {
      rulerInnerRef.current.style.transform = `translateX(${-scrollLeft}px)`;
    }
  }, []);

  const onScroll = useCallback(() => {
    const s = scrollRef.current;
    if (!s) return;
    syncRulerScroll(s.scrollLeft);
    if (labelScrollRef.current) labelScrollRef.current.scrollTop = s.scrollTop;
  }, [syncRulerScroll]);

  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const sec = Math.max(0, Math.min(totalDuration, pxToSec(px)));
      const frame = Math.round(sec * fps);
      playerRef.current?.seekTo(frame);
      setCurrentFrame(frame);
    },
    [pxToSec, fps, totalDuration, playerRef, setCurrentFrame],
  );

  const rulerTicks = useMemo(() => {
    const minPx = 40;
    const rawSec = minPx / pixelsPerSecond;
    const nice = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const interval = nice.find((i) => i >= rawSec) ?? 300;
    const ticks: { sec: number; major: boolean }[] = [];
    let idx = 0;
    for (let t = 0; t <= totalDuration + 0.001; t = parseFloat((t + interval).toFixed(6))) {
      ticks.push({ sec: t, major: idx % 5 === 0 });
      idx++;
    }
    return ticks;
  }, [pixelsPerSecond, totalDuration]);

  const playheadPx = secToPx(currentTimeSec);

  const wordCount = useMemo(
    () => localCaptions.reduce((n, c) => n + (c.words?.length ?? 0), 0),
    [localCaptions],
  );

  // ── Empty ─────────────────────────────────────────────────────────────────

  if (localCaptions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          This captions reference has no lines yet. Add captions in the right panel.
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 bg-background select-none" onWheel={handleWheel}>
      {/* Control bar */}
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b bg-muted/10">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => playerRef.current?.play()}
          title="Play"
        >
          <Play className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => playerRef.current?.pause()}
          title="Pause"
        >
          <Pause className="h-3 w-3" />
        </Button>
        <span className="text-xs font-mono text-muted-foreground min-w-[52px]">
          {formatTimeLabel(currentTimeSec)}
        </span>
        <span className="text-xs text-muted-foreground/40">/</span>
        <span className="text-xs font-mono text-muted-foreground/40">
          {formatTimeLabel(totalDuration)}
        </span>
        <div className="h-4 w-px bg-border mx-1" />
        <span
          className="text-xs text-muted-foreground truncate max-w-[200px]"
          title={liveReference.key}
        >
          {liveReference.key || "captions"}
        </span>
        <span className="text-[10px] text-muted-foreground/50">
          · {localCaptions.length} line{localCaptions.length !== 1 ? "s" : ""} · {wordCount}{" "}
          word{wordCount !== 1 ? "s" : ""}
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground/40 hidden sm:block">
          Drag edges to adjust timing · Ctrl+scroll to zoom
        </span>
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={fitToView}
          title="Fit full timeline in view"
        >
          Fit
        </Button>
        <div className="h-4 w-px bg-border" />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() =>
            setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p / 1.3)))
          }
          title="Zoom out"
        >
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[ppsToSlider(pixelsPerSecond)]}
          onValueChange={(v) => setPixelsPerSecond(sliderToPps(v[0] ?? 0))}
          className="w-24"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() =>
            setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p * 1.3)))
          }
          title="Zoom in"
        >
          <ZoomIn className="h-3 w-3" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Labels */}
        <div
          className="shrink-0 border-r border-border/60 flex flex-col bg-background"
          style={{ width: LABEL_WIDTH }}
        >
          <div
            className="shrink-0 border-b border-border/40 bg-muted/20"
            style={{ height: RULER_HEIGHT }}
          />
          <div className="flex-1 overflow-y-hidden" ref={labelScrollRef}>
            {[
              { key: "lines", label: "Lines", sub: `${localCaptions.length} captions` },
              { key: "words", label: "Words", sub: `${wordCount} words` },
            ].map((row) => (
              <div
                key={row.key}
                className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
                style={{ height: ROW_HEIGHT }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold truncate">{row.label}</p>
                  <p className="text-[9px] text-muted-foreground/50 truncate">{row.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        <div className="flex flex-col flex-1 min-w-0" ref={trackRightRef}>
          <div
            className="shrink-0 overflow-hidden border-b border-border/40 bg-muted/20 cursor-pointer relative"
            style={{ height: RULER_HEIGHT }}
          >
            <div
              ref={rulerInnerRef}
              className="absolute top-0 left-0 bottom-0 will-change-transform"
              style={{ width: totalWidth, minWidth: "100%" }}
              onClick={handleRulerClick}
            >
              {rulerTicks.map(({ sec, major }) => (
                <div key={sec} className="absolute top-0 bottom-0" style={{ left: secToPx(sec) }}>
                  <div
                    className={cn(
                      "w-px",
                      major ? "h-3 bg-muted-foreground/50" : "h-1.5 bg-muted-foreground/20",
                    )}
                  />
                  {major && (
                    <span className="absolute top-3 left-0.5 text-[9px] text-muted-foreground/60 whitespace-nowrap pointer-events-none">
                      {formatTimeLabel(sec)}
                    </span>
                  )}
                </div>
              ))}
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{ left: playheadPx }}
              >
                <div
                  className="absolute -translate-x-1/2 top-0"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "8px solid hsl(var(--primary))",
                  }}
                />
                <div className="absolute top-2 -translate-x-px w-px h-4 bg-primary/70" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto" ref={scrollRef} onScroll={onScroll}>
            <div className="relative" style={{ width: totalWidth, minWidth: "100%" }}>
              {/* Lines track */}
              <div
                className="relative border-b border-border/40 hover:bg-muted/5 transition-colors"
                style={{ height: ROW_HEIGHT }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) setSelected(null);
                }}
              >
                {localCaptions.map((line, lineIdx) => {
                  const { start, end } = getLineBounds(line);
                  const left = secToPx(start);
                  const width = Math.max(MIN_SEG_PX, secToPx(end - start));
                  const isSelected =
                    selected?.kind === "line" && selected.lineIdx === lineIdx;
                  const prevEnd =
                    lineIdx > 0
                      ? getLineBounds(localCaptions[lineIdx - 1]!).end
                      : 0;
                  const nextStart =
                    lineIdx < localCaptions.length - 1
                      ? getLineBounds(localCaptions[lineIdx + 1]!).start
                      : totalDuration;
                  const label =
                    (line.text || "").trim().slice(0, 40) ||
                    `Line ${lineIdx + 1}`;

                  return (
                    <TimingBlock
                      key={line.id ?? `line-${lineIdx}`}
                      left={left}
                      width={width}
                      color={LINE_COLOR}
                      isSelected={isSelected}
                      label={label}
                      onSelect={() => setSelected({ kind: "line", lineIdx })}
                      onMoveDown={(e) =>
                        startDrag(
                          e,
                          { kind: "line", lineIdx, edge: "move" },
                          start,
                          end,
                          prevEnd,
                          nextStart,
                        )
                      }
                      onLeftDown={(e) =>
                        startDrag(
                          e,
                          { kind: "line", lineIdx, edge: "left" },
                          start,
                          end,
                          prevEnd,
                          nextStart,
                        )
                      }
                      onRightDown={(e) =>
                        startDrag(
                          e,
                          { kind: "line", lineIdx, edge: "right" },
                          start,
                          end,
                          prevEnd,
                          nextStart,
                        )
                      }
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    />
                  );
                })}
              </div>

              {/* Words track */}
              <div
                className="relative border-b border-border/40 hover:bg-muted/5 transition-colors"
                style={{ height: ROW_HEIGHT }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) setSelected(null);
                }}
              >
                {localCaptions.flatMap((line, lineIdx) => {
                  const words = line.words ?? [];
                  const prevLineEnd =
                    lineIdx > 0
                      ? getLineBounds(localCaptions[lineIdx - 1]!).end
                      : 0;
                  const nextLineStart =
                    lineIdx < localCaptions.length - 1
                      ? getLineBounds(localCaptions[lineIdx + 1]!).start
                      : totalDuration;

                  return words.map((word, wordIdx) => {
                    const { start, end } = getWordBounds(word);
                    const left = secToPx(start);
                    const width = Math.max(MIN_SEG_PX, secToPx(end - start));
                    const isSelected =
                      selected?.kind === "word" &&
                      selected.lineIdx === lineIdx &&
                      selected.wordIdx === wordIdx;
                    const prevEnd =
                      wordIdx > 0
                        ? getWordBounds(words[wordIdx - 1]!).end
                        : prevLineEnd;
                    const nextStart =
                      wordIdx < words.length - 1
                        ? getWordBounds(words[wordIdx + 1]!).start
                        : nextLineStart;

                    return (
                      <TimingBlock
                        key={word.id ?? `w-${lineIdx}-${wordIdx}`}
                        left={left}
                        width={width}
                        color={WORD_COLOR}
                        isSelected={isSelected}
                        label={(word.text || "").trim() || `w${wordIdx + 1}`}
                        onSelect={() =>
                          setSelected({ kind: "word", lineIdx, wordIdx })
                        }
                        onMoveDown={(e) =>
                          startDrag(
                            e,
                            { kind: "word", lineIdx, wordIdx, edge: "move" },
                            start,
                            end,
                            prevEnd,
                            nextStart,
                          )
                        }
                        onLeftDown={(e) =>
                          startDrag(
                            e,
                            { kind: "word", lineIdx, wordIdx, edge: "left" },
                            start,
                            end,
                            prevEnd,
                            nextStart,
                          )
                        }
                        onRightDown={(e) =>
                          startDrag(
                            e,
                            { kind: "word", lineIdx, wordIdx, edge: "right" },
                            start,
                            end,
                            prevEnd,
                            nextStart,
                          )
                        }
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                      />
                    );
                  });
                })}
              </div>

              <div
                className="absolute top-0 bottom-0 w-px bg-primary/70 pointer-events-none z-20"
                style={{ left: playheadPx }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

