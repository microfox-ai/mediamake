"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Play, Pause, ArrowLeftToLine, ArrowRightToLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { usePlayerRefStore } from "../../../stores/player-ref-store";
import type { ReferenceItem } from "@/components/editor/presets/types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { findAudioMediaClipsFromTimeline } from "@/components/editor/presets/actions/engine/find-audio-media";
import {
  AudioWaveformTracks,
  AudioWaveformTrackLabels,
} from "./AudioWaveformTracks";

export interface CaptionsReferenceTimelineProps {
  reference: ReferenceItem;
  referenceIndex: number;
  timelineId: string;
  /** Full timeline (edited or original) — used to discover audio media-track clips. */
  timeline?: Timeline;
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
  // Prefer explicit line range so the line can act as a container for words.
  if (line.absoluteStart != null && line.absoluteEnd != null) {
    const start = Number(line.absoluteStart) || 0;
    const end = Number(line.absoluteEnd) || start;
    return { start, end: Math.max(end, start) };
  }
  const words = line.words ?? [];
  if (words.length > 0) {
    const start =
      Number(words[0]?.absoluteStart ?? line.start ?? 0) || 0;
    const end =
      Number(
        words[words.length - 1]?.absoluteEnd ?? line.end ?? start,
      ) || start;
    return { start, end: Math.max(end, start) };
  }
  const start = Number(line.start ?? 0) || 0;
  const end = Number(line.end ?? start) || start;
  return { start, end: Math.max(end, start) };
}

function getWordBounds(
  word: CaptionWord,
  line?: CaptionLine,
): { start: number; end: number } {
  if (word.absoluteStart != null || word.absoluteEnd != null) {
    const start = Number(word.absoluteStart ?? 0) || 0;
    const end = Number(word.absoluteEnd ?? start) || start;
    return { start, end: Math.max(end, start) };
  }
  // Relative start/end are offsets within the line
  const lineStart = line ? getLineBounds(line).start : 0;
  const start = lineStart + (Number(word.start) || 0);
  const end = lineStart + (Number(word.end ?? word.start) || 0);
  return { start, end: Math.max(end, start) };
}

/** Sync relative start/end/duration from absolute word timings; keep line range. */
function recomputeLineFromWords(line: CaptionLine): CaptionLine {
  const lineBounds = getLineBounds(line);
  const words = (line.words ?? []).map((w) => ({ ...w }));

  if (words.length === 0) {
    return {
      ...line,
      absoluteStart: lineBounds.start,
      absoluteEnd: lineBounds.end,
      start: lineBounds.start,
      end: lineBounds.end,
      duration: Math.max(0, lineBounds.end - lineBounds.start),
    };
  }

  const normalized = words.map((w) => {
    const { start, end } = getWordBounds(w, line);
    // Clamp every word inside the line range
    const clampedStart = Math.max(
      lineBounds.start,
      Math.min(start, lineBounds.end - MIN_GAP),
    );
    const clampedEnd = Math.min(
      lineBounds.end,
      Math.max(end, clampedStart + MIN_GAP),
    );
    return {
      ...w,
      absoluteStart: clampedStart,
      absoluteEnd: clampedEnd,
      start: clampedStart - lineBounds.start,
      end: clampedEnd - lineBounds.start,
      duration: Math.max(0, clampedEnd - clampedStart),
    };
  });

  return {
    ...line,
    absoluteStart: lineBounds.start,
    absoluteEnd: lineBounds.end,
    start: lineBounds.start,
    end: lineBounds.end,
    duration: Math.max(0, lineBounds.end - lineBounds.start),
    text: normalized.map((w) => w.text ?? "").join(" ").trim() || line.text,
    words: normalized,
  };
}

function shiftLine(line: CaptionLine, delta: number): CaptionLine {
  const { start, end } = getLineBounds(line);
  const words = (line.words ?? []).map((w) => {
    const b = getWordBounds(w, line);
    return {
      ...w,
      absoluteStart: b.start + delta,
      absoluteEnd: b.end + delta,
    };
  });
  return recomputeLineFromWords({
    ...line,
    absoluteStart: start + delta,
    absoluteEnd: end + delta,
    words,
  });
}

/**
 * Resize a line edge. The first word (left) or last word (right) always
 * meets the new line bound — extending or compressing with the line.
 * Words may overlap each other; only MIN_GAP on the edge word is enforced.
 */
function applyLineEdge(
  line: CaptionLine,
  edge: "left" | "right",
  nextStart: number,
  nextEnd: number,
): CaptionLine {
  const words = (line.words ?? []).map((w) => ({ ...w }));
  let start = nextStart;
  let end = Math.max(nextEnd, start + MIN_GAP);

  if (words.length === 0) {
    return recomputeLineFromWords({
      ...line,
      absoluteStart: start,
      absoluteEnd: end,
    });
  }

  if (edge === "left") {
    start = Math.min(start, end - MIN_GAP);
    const first = words[0]!;
    const { end: origFirstEnd } = getWordBounds(first, line);
    // Glue first-word start to line start; shrink end only if needed for MIN_GAP
    const firstEnd = Math.max(origFirstEnd, start + MIN_GAP);
    words[0] = {
      ...first,
      absoluteStart: start,
      absoluteEnd: Math.min(firstEnd, end),
    };
    // Ensure first word still has MIN_GAP inside the line
    if ((words[0].absoluteEnd as number) - start < MIN_GAP) {
      words[0].absoluteEnd = start + MIN_GAP;
    }

    return recomputeLineFromWords({
      ...line,
      absoluteStart: start,
      absoluteEnd: end,
      words,
    });
  }

  // right edge
  end = Math.max(end, start + MIN_GAP);
  const last = words[words.length - 1]!;
  const { start: origLastStart } = getWordBounds(last, line);
  const lastStart = Math.min(origLastStart, end - MIN_GAP);
  words[words.length - 1] = {
    ...last,
    absoluteStart: Math.max(lastStart, start),
    absoluteEnd: end,
  };
  if (end - (words[words.length - 1].absoluteStart as number) < MIN_GAP) {
    words[words.length - 1].absoluteStart = end - MIN_GAP;
  }

  return recomputeLineFromWords({
    ...line,
    absoluteStart: start,
    absoluteEnd: end,
    words,
  });
}

/**
 * Edit a word edge/move. Words may overlap; only constraint is staying
 * inside the parent line range.
 */
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

  const lineBounds = getLineBounds(line);
  let start = nextStart;
  let end = nextEnd;

  if (edge === "move") {
    const dur = Math.max(MIN_GAP, end - start);
    start = Math.max(
      lineBounds.start,
      Math.min(lineBounds.end - dur, start),
    );
    end = start + dur;
  } else if (edge === "left") {
    const curEnd = getWordBounds(word, line).end;
    end = Math.min(curEnd, lineBounds.end);
    start = Math.max(
      lineBounds.start,
      Math.min(end - MIN_GAP, start),
    );
  } else {
    const curStart = getWordBounds(word, line).start;
    start = Math.max(curStart, lineBounds.start);
    end = Math.min(
      lineBounds.end,
      Math.max(start + MIN_GAP, end),
    );
  }

  // Hard clamp to line scope
  start = Math.max(lineBounds.start, start);
  end = Math.min(lineBounds.end, end);
  if (end - start < MIN_GAP) {
    if (edge === "left") start = Math.max(lineBounds.start, end - MIN_GAP);
    else end = Math.min(lineBounds.end, start + MIN_GAP);
  }

  words[wordIdx] = {
    ...word,
    absoluteStart: start,
    absoluteEnd: end,
  };

  return recomputeLineFromWords({ ...line, words });
}

/** Move a block so its start lands on `at`, preserving duration. */
function setBlockStartAt(
  start: number,
  end: number,
  at: number,
  minStart = 0,
  maxEnd = Infinity,
): { start: number; end: number } {
  const dur = Math.max(MIN_GAP, end - start);
  let newStart = at;
  let newEnd = newStart + dur;
  if (newEnd > maxEnd) {
    newEnd = maxEnd;
    newStart = Math.max(minStart, newEnd - dur);
  }
  if (newStart < minStart) {
    newStart = minStart;
    newEnd = newStart + dur;
  }
  return { start: newStart, end: newEnd };
}

/** Move a block so its end lands on `at`, preserving duration. */
function setBlockEndAt(
  start: number,
  end: number,
  at: number,
  minStart = 0,
  maxEnd = Infinity,
): { start: number; end: number } {
  const dur = Math.max(MIN_GAP, end - start);
  let newEnd = at;
  let newStart = newEnd - dur;
  if (newStart < minStart) {
    newStart = minStart;
    newEnd = newStart + dur;
  }
  if (newEnd > maxEnd) {
    newEnd = maxEnd;
    newStart = Math.max(minStart, newEnd - dur);
  }
  return { start: newStart, end: newEnd };
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
  timeline: timelineProp,
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

  const effectiveTimeline = editedTimeline || timelineProp;

  const audioClips = useMemo(
    () => findAudioMediaClipsFromTimeline(effectiveTimeline),
    [effectiveTimeline],
  );

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
    /** Snapshot at pointer-down — all moves are applied from this, not from live state */
    origCaptions: CaptionLine[];
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
              const wb = getWordBounds(w, c);
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
      // Deep-clone so subsequent moves always start from this baseline
      const origCaptions: CaptionLine[] = localCaptions.map((c) => ({
        ...c,
        words: (c.words ?? []).map((w) => ({ ...w })),
      }));
      dragRef.current = {
        target,
        startClientX: e.clientX,
        origStart,
        origEnd,
        minBound,
        maxBound,
        origCaptions,
      };
    },
    [localCaptions],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const deltaSec = (e.clientX - drag.startClientX) / pixelsPerSecond;
      const duration = drag.origEnd - drag.origStart;

      // Always derive from drag-start snapshot so deltas do not compound
      const next: CaptionLine[] = drag.origCaptions.map((c) => ({
        ...c,
        words: (c.words ?? []).map((w) => ({ ...w })),
      }));
      const { target } = drag;

      if (target.kind === "line") {
        const line = next[target.lineIdx];
        if (!line) return;

        if (target.edge === "move") {
          const newStart = Math.max(
            drag.minBound,
            Math.min(drag.maxBound - duration, drag.origStart + deltaSec),
          );
          next[target.lineIdx] = shiftLine(line, newStart - drag.origStart);
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
        setLocalCaptions(next);
        return;
      }

      // word
      const line = next[target.lineIdx];
      if (!line) return;
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
      setLocalCaptions(next);
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

  // ── [ / ] — snap selected block start/end to playhead ─────────────────────

  const snapSelectedToPlayhead = useCallback(
    (edge: "start" | "end") => {
      if (!selected) return;
      const sel = selected;
      const at = currentTimeSec;
      const lineIdx = sel.lineIdx;

      setLocalCaptions((prev) => {
        const next: CaptionLine[] = prev.map((c) => ({
          ...c,
          words: (c.words ?? []).map((w) => ({ ...w })),
        }));
        const line = next[lineIdx];
        if (!line) return prev;

        if (sel.kind === "line") {
          const { start, end } = getLineBounds(line);
          const moved =
            edge === "start"
              ? setBlockStartAt(start, end, at, 0, totalDuration)
              : setBlockEndAt(start, end, at, 0, totalDuration);
          next[lineIdx] = shiftLine(line, moved.start - start);
          commitCaptions(next);
          return next;
        }

        const wordIdx = sel.wordIdx;
        if (wordIdx == null) return prev;

        // word — keep within line scope
        const lineBounds = getLineBounds(line);
        const words = line.words ?? [];
        const word = words[wordIdx];
        if (!word) return prev;
        const { start, end } = getWordBounds(word, line);
        const moved =
          edge === "start"
            ? setBlockStartAt(
                start,
                end,
                at,
                lineBounds.start,
                lineBounds.end,
              )
            : setBlockEndAt(
                start,
                end,
                at,
                lineBounds.start,
                lineBounds.end,
              );
        next[lineIdx] = applyWordEdge(
          line,
          wordIdx,
          "move",
          moved.start,
          moved.end,
        );
        commitCaptions(next);
        return next;
      });
    },
    [selected, currentTimeSec, totalDuration, commitCaptions],
  );

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    const sel = selected;

    setLocalCaptions((prev) => {
      if (sel.kind === "line") {
        const next = prev.filter((_, i) => i !== sel.lineIdx);
        commitCaptions(next);
        queueMicrotask(() => setSelected(null));
        return next;
      }

      const wordIdx = sel.wordIdx;
      if (wordIdx == null) return prev;
      const next: CaptionLine[] = prev.map((c) => ({
        ...c,
        words: (c.words ?? []).map((w) => ({ ...w })),
      }));
      const line = next[sel.lineIdx];
      if (!line) return prev;
      const words = [...(line.words ?? [])];
      if (wordIdx < 0 || wordIdx >= words.length) return prev;
      words.splice(wordIdx, 1);
      // Keep line timing; only remove the word
      next[sel.lineIdx] = recomputeLineFromWords({ ...line, words });
      commitCaptions(next);
      queueMicrotask(() => setSelected(null));
      return next;
    });
  }, [selected, commitCaptions]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable ||
          el.closest("[contenteditable=true]"))
      ) {
        return;
      }
      if (!selected) return;
      if (e.key === "[" || e.code === "BracketLeft") {
        e.preventDefault();
        snapSelectedToPlayhead("start");
        return;
      }
      if (e.key === "]" || e.code === "BracketRight") {
        e.preventDefault();
        snapSelectedToPlayhead("end");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, snapSelectedToPlayhead, deleteSelected]);

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
        {/* Edit tools */}
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-6 w-6", !selected && "opacity-40")}
            disabled={!selected}
            onClick={() => snapSelectedToPlayhead("start")}
            title="Set start at playhead ([)"
          >
            <ArrowLeftToLine className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-6 w-6", !selected && "opacity-40")}
            disabled={!selected}
            onClick={() => snapSelectedToPlayhead("end")}
            title="Set end at playhead (])"
          >
            <ArrowRightToLine className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-6 w-6", !selected && "opacity-40")}
            disabled={!selected}
            onClick={deleteSelected}
            title="Delete selected (⌫)"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <div className="h-4 w-px bg-border mx-1" />
        <span className="text-[10px] text-muted-foreground/40 hidden sm:block">
          Drag edges to adjust · [ ] snap · Ctrl+scroll zoom
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
            <AudioWaveformTrackLabels clips={audioClips} rowHeight={ROW_HEIGHT} />
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
                  // Lines may overlap — only clamp to the timeline extent
                  const minBound = 0;
                  const maxBound = totalDuration;
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
                          minBound,
                          maxBound,
                        )
                      }
                      onLeftDown={(e) =>
                        startDrag(
                          e,
                          { kind: "line", lineIdx, edge: "left" },
                          start,
                          end,
                          minBound,
                          maxBound,
                        )
                      }
                      onRightDown={(e) =>
                        startDrag(
                          e,
                          { kind: "line", lineIdx, edge: "right" },
                          start,
                          end,
                          minBound,
                          maxBound,
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
                  const lineBounds = getLineBounds(line);

                  return words.map((word, wordIdx) => {
                    const { start, end } = getWordBounds(word, line);
                    const left = secToPx(start);
                    const width = Math.max(MIN_SEG_PX, secToPx(end - start));
                    const isSelected =
                      selected?.kind === "word" &&
                      selected.lineIdx === lineIdx &&
                      selected.wordIdx === wordIdx;
                    // Words may overlap; only constrained to the parent line
                    const minBound = lineBounds.start;
                    const maxBound = lineBounds.end;

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
                            minBound,
                            maxBound,
                          )
                        }
                        onLeftDown={(e) =>
                          startDrag(
                            e,
                            { kind: "word", lineIdx, wordIdx, edge: "left" },
                            start,
                            end,
                            minBound,
                            maxBound,
                          )
                        }
                        onRightDown={(e) =>
                          startDrag(
                            e,
                            { kind: "word", lineIdx, wordIdx, edge: "right" },
                            start,
                            end,
                            minBound,
                            maxBound,
                          )
                        }
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                      />
                    );
                  });
                })}
              </div>

              <AudioWaveformTracks
                clips={audioClips}
                secToPx={secToPx}
                totalWidth={totalWidth}
                rowHeight={ROW_HEIGHT}
                renderLabels={false}
              />

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

