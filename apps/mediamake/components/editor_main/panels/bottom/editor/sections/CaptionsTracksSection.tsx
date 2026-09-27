"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ReferenceItem } from "@/components/editor/presets/types";
import { useTimelineEditsStore } from "../../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../../stores/compile-store";
import { setCaptionSelectionActive } from "../../../../stores/bottom-selection-gate";
import {
  ROW_HEIGHT,
  MIN_SEG_PX,
} from "../timeline-layout";
import { useTimelineViewport } from "../timeline-viewport";
import {
  useRegisterTimelineSection,
  type TimelineTrackSectionData,
} from "../TimelineShell";

const LINE_COLOR =
  "border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/35 text-blue-200";
const WORD_COLOR =
  "border-violet-500/50 bg-violet-500/20 hover:bg-violet-500/35 text-violet-200";
const MIN_GAP = 0.01;

type CaptionWord = {
  id?: string;
  text?: string;
  start?: number;
  end?: number;
  absoluteStart?: number;
  absoluteEnd?: number;
  duration?: number;
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
  [key: string]: unknown;
};

type DragTarget =
  | { kind: "line"; lineIdx: number; edge: "move" | "left" | "right" }
  | {
      kind: "word";
      lineIdx: number;
      wordIdx: number;
      edge: "move" | "left" | "right";
    };

function getLineBounds(line: CaptionLine): { start: number; end: number } {
  if (line.absoluteStart != null && line.absoluteEnd != null) {
    const start = Number(line.absoluteStart) || 0;
    const end = Number(line.absoluteEnd) || start;
    return { start, end: Math.max(end, start) };
  }
  const words = line.words ?? [];
  if (words.length > 0) {
    const start = Number(words[0]?.absoluteStart ?? line.start ?? 0) || 0;
    const end =
      Number(words[words.length - 1]?.absoluteEnd ?? line.end ?? start) ||
      start;
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
  const lineStart = line ? getLineBounds(line).start : 0;
  const start = lineStart + (Number(word.start) || 0);
  const end = lineStart + (Number(word.end ?? word.start) || 0);
  return { start, end: Math.max(end, start) };
}

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
      duration: clampedEnd - clampedStart,
    };
  });
  return {
    ...line,
    words: normalized,
    absoluteStart: lineBounds.start,
    absoluteEnd: lineBounds.end,
    start: lineBounds.start,
    end: lineBounds.end,
    duration: lineBounds.end - lineBounds.start,
  };
}

function shiftLine(line: CaptionLine, delta: number): CaptionLine {
  const b = getLineBounds(line);
  const start = Math.max(0, b.start + delta);
  const end = Math.max(start + MIN_GAP, b.end + delta);
  const shifted: CaptionLine = {
    ...line,
    absoluteStart: start,
    absoluteEnd: end,
    start,
    end,
    duration: end - start,
    words: (line.words ?? []).map((w) => {
      const wb = getWordBounds(w, line);
      return {
        ...w,
        absoluteStart: wb.start + (start - b.start),
        absoluteEnd: wb.end + (start - b.start),
      };
    }),
  };
  return recomputeLineFromWords(shifted);
}

function applyLineEdge(
  line: CaptionLine,
  edge: "left" | "right" | "move",
  nextStart: number,
  nextEnd: number,
): CaptionLine {
  if (edge === "move") {
    const b = getLineBounds(line);
    return shiftLine(line, nextStart - b.start);
  }
  const updated: CaptionLine = {
    ...line,
    absoluteStart: nextStart,
    absoluteEnd: nextEnd,
    start: nextStart,
    end: nextEnd,
    duration: nextEnd - nextStart,
  };
  return recomputeLineFromWords(updated);
}

function applyWordEdge(
  line: CaptionLine,
  wordIdx: number,
  nextStart: number,
  nextEnd: number,
): CaptionLine {
  const words = [...(line.words ?? [])];
  const w = words[wordIdx];
  if (!w) return line;
  words[wordIdx] = {
    ...w,
    absoluteStart: nextStart,
    absoluteEnd: nextEnd,
  };
  return recomputeLineFromWords({ ...line, words });
}

export interface CaptionsTracksSectionProps {
  sectionId: string;
  order: number;
  timelineId: string;
  referenceIndex: number;
  reference: ReferenceItem;
  showHeader?: boolean;
}

/**
 * Registers captions Lines + Words tracks into the shared TimelineShell.
 */
export function CaptionsTracksSection({
  sectionId,
  order,
  timelineId,
  referenceIndex,
  reference,
  showHeader = true,
}: CaptionsTracksSectionProps) {
  const { secToPx, totalDuration, pixelsPerSecond } = useTimelineViewport();
  const updateTimeline = useTimelineEditsStore((s) => s.updateTimeline);
  const editedTimeline = useTimelineEditsStore((s) =>
    s.editedTimelines.get(timelineId),
  );
  const generateOutput = useCompileStore((s) => s.generateOutput);

  const liveReference =
    (editedTimeline?.defaultData?.references?.[referenceIndex] as
      | ReferenceItem
      | undefined) || reference;

  const storeCaptions: CaptionLine[] = useMemo(
    () =>
      Array.isArray(liveReference?.value?.captions)
        ? liveReference.value.captions
        : [],
    [liveReference?.value?.captions],
  );

  const [localCaptions, setLocalCaptions] =
    useState<CaptionLine[]>(storeCaptions);
  const [selected, setSelected] = useState<{
    kind: "line" | "word";
    lineIdx: number;
    wordIdx?: number;
  } | null>(null);

  const dragRef = useRef<{
    target: DragTarget;
    startClientX: number;
    origStart: number;
    origEnd: number;
    minBound: number;
    maxBound: number;
    origCaptions: CaptionLine[];
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (selected) setCaptionSelectionActive(true);
    return () => setCaptionSelectionActive(false);
  }, [selected]);

  const commitCaptions = useCallback(
    (next: CaptionLine[]) => {
      const base =
        editedTimeline ||
        useTimelineEditsStore.getState().editedTimelines.get(timelineId);
      const refs = [
        ...((base?.defaultData?.references as ReferenceItem[]) || []),
      ];
      const current = refs[referenceIndex] || liveReference;
      refs[referenceIndex] = {
        ...current,
        value: { ...(current.value || {}), captions: next },
      };
      updateTimeline(timelineId, {
        defaultData: { ...(base?.defaultData || {}), references: refs },
      });
      const latest =
        useTimelineEditsStore.getState().editedTimelines.get(timelineId) ||
        base;
      if (latest) generateOutput(latest);
    },
    [
      editedTimeline,
      timelineId,
      referenceIndex,
      liveReference,
      updateTimeline,
      generateOutput,
    ],
  );

  const scheduleCommit = useCallback(
    (next: CaptionLine[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => commitCaptions(next), 120);
    },
    [commitCaptions],
  );

  const startDrag = useCallback(
    (
      e: React.PointerEvent,
      target: DragTarget,
      start: number,
      end: number,
      minBound: number,
      maxBound: number,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        target,
        startClientX: e.clientX,
        origStart: start,
        origEnd: end,
        minBound,
        maxBound,
        origCaptions: localCaptions,
      };
    },
    [localCaptions],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = (e.clientX - drag.startClientX) / pixelsPerSecond;
      const duration = drag.origEnd - drag.origStart;
      let nextStart = drag.origStart;
      let nextEnd = drag.origEnd;

      if (drag.target.edge === "move") {
        nextStart = Math.max(
          drag.minBound,
          Math.min(drag.maxBound - duration, drag.origStart + delta),
        );
        nextEnd = nextStart + duration;
      } else if (drag.target.edge === "left") {
        nextStart = Math.max(
          drag.minBound,
          Math.min(drag.origEnd - MIN_GAP, drag.origStart + delta),
        );
        nextEnd = drag.origEnd;
      } else {
        nextEnd = Math.max(
          drag.origStart + MIN_GAP,
          Math.min(drag.maxBound, drag.origEnd + delta),
        );
        nextStart = drag.origStart;
      }

      const next = drag.origCaptions.map((line, i) => {
        if (drag.target.kind === "line" && i === drag.target.lineIdx) {
          return applyLineEdge(line, drag.target.edge, nextStart, nextEnd);
        }
        if (drag.target.kind === "word" && i === drag.target.lineIdx) {
          return applyWordEdge(line, drag.target.wordIdx, nextStart, nextEnd);
        }
        return line;
      });
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
        scheduleCommit(prev);
        return prev;
      });
    },
    [scheduleCommit],
  );

  const wordCount = useMemo(
    () => localCaptions.reduce((n, l) => n + (l.words?.length ?? 0), 0),
    [localCaptions],
  );

  const section: TimelineTrackSectionData = useMemo(() => {
    const rows = [
      {
        id: `${sectionId}:lines`,
        label: (
          <div
            className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate">Lines</p>
              <p className="text-[9px] text-muted-foreground/50 truncate">
                {localCaptions.length} captions
              </p>
            </div>
          </div>
        ),
        track: (
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
              const labelText =
                (line.text || "").trim().slice(0, 40) || `Line ${lineIdx + 1}`;

              return (
                <TimingBlock
                  key={line.id ?? `line-${lineIdx}`}
                  left={left}
                  width={width}
                  color={LINE_COLOR}
                  isSelected={isSelected}
                  label={labelText}
                  onSelect={() => setSelected({ kind: "line", lineIdx })}
                  onMoveDown={(e) =>
                    startDrag(
                      e,
                      { kind: "line", lineIdx, edge: "move" },
                      start,
                      end,
                      0,
                      totalDuration,
                    )
                  }
                  onLeftDown={(e) =>
                    startDrag(
                      e,
                      { kind: "line", lineIdx, edge: "left" },
                      start,
                      end,
                      0,
                      totalDuration,
                    )
                  }
                  onRightDown={(e) =>
                    startDrag(
                      e,
                      { kind: "line", lineIdx, edge: "right" },
                      start,
                      end,
                      0,
                      totalDuration,
                    )
                  }
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
              );
            })}
          </div>
        ),
      },
      {
        id: `${sectionId}:words`,
        label: (
          <div
            className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate">Words</p>
              <p className="text-[9px] text-muted-foreground/50 truncate">
                {wordCount} words
              </p>
            </div>
          </div>
        ),
        track: (
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
                        lineBounds.start,
                        lineBounds.end,
                      )
                    }
                    onLeftDown={(e) =>
                      startDrag(
                        e,
                        { kind: "word", lineIdx, wordIdx, edge: "left" },
                        start,
                        end,
                        lineBounds.start,
                        lineBounds.end,
                      )
                    }
                    onRightDown={(e) =>
                      startDrag(
                        e,
                        { kind: "word", lineIdx, wordIdx, edge: "right" },
                        start,
                        end,
                        lineBounds.start,
                        lineBounds.end,
                      )
                    }
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  />
                );
              });
            })}
          </div>
        ),
      },
    ];

    return {
      id: sectionId,
      order,
      header: showHeader
        ? {
            label: `Captions · ${liveReference.key || "captions"}`,
            track: null,
          }
        : undefined,
      rows,
    };
  }, [
    sectionId,
    order,
    showHeader,
    liveReference.key,
    localCaptions,
    wordCount,
    secToPx,
    selected,
    totalDuration,
    handlePointerMove,
    handlePointerUp,
    startDrag,
  ]);

  useRegisterTimelineSection(section);
  return null;
}

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
          isSelected &&
            "ring-2 ring-primary ring-offset-1 ring-offset-background z-[1]",
        )}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
          onMoveDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {width > 28 && (
          <span className="px-1.5 text-[9px] font-medium truncate pointer-events-none select-none">
            {label}
          </span>
        )}
      </div>
      <div
        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 opacity-0 group-hover/seg:opacity-100"
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
          onLeftDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 opacity-0 group-hover/seg:opacity-100"
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
          onRightDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
