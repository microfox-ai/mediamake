"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftToLine, ArrowRightToLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReferenceItem } from "@/components/editor/presets/types";
import { useTimelineEditsStore } from "../../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../../stores/compile-store";
import { useLayerStateStore } from "../../../../stores/layer-state-store";
import { setCaptionSelectionActive } from "../../../../stores/bottom-selection-gate";
import { useCaptionTrackSelection } from "../../../../stores/caption-track-selection";
import { isEditableKeyboardTarget } from "../../../../stores/block-clipboard-store";
import { isEditorFocusScope } from "../../../../stores/editor-focus-scope";
import { ROW_HEIGHT, MIN_SEG_PX } from "../timeline-layout";
import { useTimelineViewport } from "../timeline-viewport";
import {
  useRegisterTimelineSection,
  type TimelineTrackSectionData,
} from "../TimelineShell";
import {
  claimBlockSelection,
  releaseBlockSelection,
} from "../timeline-block-selection";
import {
  MIN_GAP,
  type CaptionLine,
  type DragTarget,
  applyLineEdge,
  applyWordEdge,
  getLineBounds,
  getWordBounds,
  recomputeLineFromWords,
  setBlockEndAt,
  setBlockStartAt,
  shiftLine,
  trimBlockEndTo,
  trimBlockStartTo,
} from "../caption-timing-utils";

function captionTrackKey(captionsKey: string, count: number): string {
  let hash = 0;
  for (let i = 0; i < captionsKey.length; i++) {
    hash = (Math.imul(31, hash) + captionsKey.charCodeAt(i)) | 0;
  }
  return `${count}:${(hash >>> 0).toString(36)}`;
}

const LINE_COLOR =
  "border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/35 text-blue-200";
const WORD_COLOR =
  "border-violet-500/50 bg-violet-500/20 hover:bg-violet-500/35 text-violet-200";

export interface CaptionsTracksSectionProps {
  sectionId: string;
  order: number;
  timelineId: string;
  referenceIndex: number;
  reference: ReferenceItem;
  /**
   * When set (clubbed/overview), append " - {tag}" to track titles
   * instead of rendering a separate section header.
   */
  sourceTag?: string;
}

/**
 * Registers captions Lines + Words tracks into the shared TimelineShell.
 * Same component is used for focused reference view and timeline overview.
 */
export function CaptionsTracksSection({
  sectionId,
  order,
  timelineId,
  referenceIndex,
  reference,
  sourceTag,
}: CaptionsTracksSectionProps) {
  const clubbed = !!sourceTag;
  const { secToPx, totalDuration, pixelsPerSecond } = useTimelineViewport();
  const updateTimeline = useTimelineEditsStore((s) => s.updateTimeline);
  const editedTimeline = useTimelineEditsStore((s) =>
    s.editedTimelines.get(timelineId),
  );
  const generateOutput = useCompileStore((s) => s.generateOutput);
  const fps = useCompileStore((s) => s.calculatedMetadata?.fps ?? 30);
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const currentTimeSec = currentFrame / fps;

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
  const trackSelection = useCaptionTrackSelection((s) => s.selection);
  const setTrackSelection = useCaptionTrackSelection((s) => s.setSelection);
  const selected =
    trackSelection &&
    trackSelection.timelineId === timelineId &&
    trackSelection.referenceIndex === referenceIndex
      ? trackSelection
      : null;

  const setSelected = useCallback(
    (
      next: {
        kind: "line" | "word";
        lineIdx: number;
        wordIdx?: number;
      } | null,
    ) => {
      if (!next) {
        const current = useCaptionTrackSelection.getState().selection;
        if (
          current?.timelineId === timelineId &&
          current.referenceIndex === referenceIndex
        ) {
          setTrackSelection(null);
        }
        return;
      }
      setTrackSelection({
        timelineId,
        referenceIndex,
        kind: next.kind,
        lineIdx: next.lineIdx,
        wordIdx: next.wordIdx,
      });
    },
    [timelineId, referenceIndex, setTrackSelection],
  );

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
              return `${w.id ?? ""}:${w.text ?? ""}:${wb.start}-${wb.end}`;
            })
            .join(",");
          return `${c.id ?? ""}:${(c.text ?? "").trim()}:${b.start}-${b.end}:${words}`;
        })
        .join("|"),
    [storeCaptions],
  );

  // Apply external caption edits (merge/split) in the same render that sees them.
  // A post-commit effect left the tracks on the previous snapshot until this
  // section remounted (switching references and back).
  const [syncedKey, setSyncedKey] = useState(captionsKey);
  if (!dragRef.current && syncedKey !== captionsKey) {
    setSyncedKey(captionsKey);
    setLocalCaptions(storeCaptions);
  }

  useEffect(() => {
    if (!selected) {
      releaseBlockSelection(sectionId);
      return;
    }
    setCaptionSelectionActive(true);
    claimBlockSelection(sectionId, () => setSelected(null));
    return () => {
      setCaptionSelectionActive(false);
      releaseBlockSelection(sectionId);
    };
  }, [selected, sectionId, setSelected]);

  const selectBlock = useCallback(
    (next: { kind: "line" | "word"; lineIdx: number; wordIdx?: number }) => {
      claimBlockSelection(sectionId, () => setSelected(null));
      setSelected(next);
    },
    [sectionId, setSelected],
  );

  const clearSelection = useCallback(() => {
    setSelected(null);
    releaseBlockSelection(sectionId);
  }, [sectionId]);

  useEffect(() => {
    return () => releaseBlockSelection(sectionId);
  }, [sectionId]);

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
          return applyWordEdge(
            line,
            drag.target.wordIdx,
            drag.target.edge,
            nextStart,
            nextEnd,
          );
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

  const snapSelectedToPlayhead = useCallback(
    (edge: "start" | "end", mode: "move" | "trim" = "move") => {
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
          if (mode === "trim") {
            const trimmed =
              edge === "start"
                ? trimBlockStartTo(start, end, at, 0, totalDuration)
                : trimBlockEndTo(start, end, at, 0, totalDuration);
            if (!trimmed) return prev;
            next[lineIdx] =
              edge === "start"
                ? applyLineEdge(line, "left", trimmed.start, trimmed.end)
                : applyLineEdge(line, "right", trimmed.start, trimmed.end);
          } else {
            const moved =
              edge === "start"
                ? setBlockStartAt(start, end, at, 0, totalDuration)
                : setBlockEndAt(start, end, at, 0, totalDuration);
            next[lineIdx] = shiftLine(line, moved.start - start);
          }
          commitCaptions(next);
          return next;
        }

        const wordIdx = sel.wordIdx;
        if (wordIdx == null) return prev;

        const lineBounds = getLineBounds(line);
        const word = (line.words ?? [])[wordIdx];
        if (!word) return prev;
        const { start, end } = getWordBounds(word, line);

        if (mode === "trim") {
          const trimmed =
            edge === "start"
              ? trimBlockStartTo(
                  start,
                  end,
                  at,
                  lineBounds.start,
                  lineBounds.end,
                )
              : trimBlockEndTo(
                  start,
                  end,
                  at,
                  lineBounds.start,
                  lineBounds.end,
                );
          if (!trimmed) return prev;
          next[lineIdx] = applyWordEdge(
            line,
            wordIdx,
            edge === "start" ? "left" : "right",
            trimmed.start,
            trimmed.end,
          );
        } else {
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
        }
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
      next[sel.lineIdx] = recomputeLineFromWords({ ...line, words });
      commitCaptions(next);
      queueMicrotask(() => setSelected(null));
      return next;
    });
  }, [selected, commitCaptions]);

  useEffect(() => {
    // Clubbed overview: only handle keys when this section has a selection
    if (clubbed && !selected) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isEditorFocusScope("bottom")) return;
      if (
        isEditableKeyboardTarget(e.target) ||
        isEditableKeyboardTarget(document.activeElement)
      ) {
        return;
      }
      if (!selected) return;
      if (e.key === "[" || e.code === "BracketLeft") {
        e.preventDefault();
        snapSelectedToPlayhead(
          "start",
          e.metaKey || e.ctrlKey ? "trim" : "move",
        );
        return;
      }
      if (e.key === "]" || e.code === "BracketRight") {
        e.preventDefault();
        snapSelectedToPlayhead(
          "end",
          e.metaKey || e.ctrlKey ? "trim" : "move",
        );
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clubbed, selected, snapSelectedToPlayhead, deleteSelected]);

  const wordCount = useMemo(
    () => localCaptions.reduce((n, l) => n + (l.words?.length ?? 0), 0),
    [localCaptions],
  );

  const tools = useMemo(() => {
    if (!selected) return undefined;
    return (
      <>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) =>
            snapSelectedToPlayhead(
              "start",
              e.metaKey || e.ctrlKey ? "trim" : "move",
            )
          }
          title="Move start to playhead ([) · Trim/extend start (⌘[)"
        >
          <ArrowLeftToLine className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) =>
            snapSelectedToPlayhead(
              "end",
              e.metaKey || e.ctrlKey ? "trim" : "move",
            )
          }
          title="Move end to playhead (]) · Trim/extend end (⌘])"
        >
          <ArrowRightToLine className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={deleteSelected}
          title="Delete selected (⌫)"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </>
    );
  }, [selected, snapSelectedToPlayhead, deleteSelected]);

  const section: TimelineTrackSectionData = useMemo(() => {
    const refTag = sourceTag || liveReference.key || "captions";
    const linesTitle = sourceTag ? `Lines - ${refTag}` : "Lines";
    const wordsTitle = sourceTag ? `Words - ${refTag}` : "Words";

    const rows = [
      {
        id: `${sectionId}:lines:${captionTrackKey(captionsKey, localCaptions.length)}`,
        label: (
          <div
            className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-semibold truncate"
                title={linesTitle}
              >
                {linesTitle}
              </p>
              <p className="text-[9px] text-muted-foreground/50 truncate">
                {localCaptions.length} captions
              </p>
            </div>
          </div>
        ),
        track: (
          <div
            key={captionsKey}
            className="relative border-b border-border/40 hover:bg-muted/5 transition-colors"
            style={{ height: ROW_HEIGHT }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) clearSelection();
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
                  onSelect={() => selectBlock({ kind: "line", lineIdx })}
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
        id: `${sectionId}:words:${captionTrackKey(captionsKey, localCaptions.length)}`,
        label: (
          <div
            className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-semibold truncate"
                title={wordsTitle}
              >
                {wordsTitle}
              </p>
              <p className="text-[9px] text-muted-foreground/50 truncate">
                {wordCount} words
              </p>
            </div>
          </div>
        ),
        track: (
          <div
            key={`${captionsKey}:words`}
            className="relative border-b border-border/40 hover:bg-muted/5 transition-colors"
            style={{ height: ROW_HEIGHT }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) clearSelection();
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
                      selectBlock({ kind: "word", lineIdx, wordIdx })
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
      rows,
      tools,
    };
  }, [
    sectionId,
    order,
    sourceTag,
    liveReference.key,
    captionsKey,
    localCaptions,
    wordCount,
    secToPx,
    selected,
    totalDuration,
    handlePointerMove,
    handlePointerUp,
    startDrag,
    tools,
    selectBlock,
    clearSelection,
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
