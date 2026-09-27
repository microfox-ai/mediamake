"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { useTimelineEditsStore } from "../../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../../stores/compile-store";
import { setSegmentSelectionActive } from "../../../../stores/bottom-selection-gate";
import {
  ROW_HEIGHT,
  MIN_SEG_PX,
  TRACK_COLORS,
  formatTimeLabel,
} from "../timeline-layout";
import { useTimelineViewport } from "../timeline-viewport";
import {
  useRegisterTimelineSection,
  type TimelineTrackSectionData,
} from "../TimelineShell";
import {
  applySegsToInputData,
  buildTrackGroups,
  collectRawRanges,
  segsFromTrackGroup,
  type ParsedSegment,
  type RangeKind,
} from "../preset-range-utils";

export interface PresetTracksSectionProps {
  sectionId: string;
  order: number;
  timelineId: string;
  presetId: string;
  label: string;
  /** Used when edits store has no entry yet. */
  fallbackTimeline?: Timeline | null;
  /** Show a section header (used in overview when multiple sources). */
  showHeader?: boolean;
}

/**
 * Registers preset range tracks into the shared TimelineShell.
 * Owns drag/edit state for this preset's ranges.
 */
export function PresetTracksSection({
  sectionId,
  order,
  timelineId,
  presetId,
  label,
  fallbackTimeline,
  showHeader = true,
}: PresetTracksSectionProps) {
  const { secToPx, totalDuration, pixelsPerSecond } = useTimelineViewport();
  const updatePresetInputData = useTimelineEditsStore(
    (s) => s.updatePresetInputData,
  );
  const editedTimeline = useTimelineEditsStore((s) =>
    s.editedTimelines.get(timelineId),
  );
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const generateOutput = useCompileStore((s) => s.generateOutput);

  const timeline = editedTimeline || fallbackTimeline || undefined;
  const preset = timeline?.presets?.find((p) => p.id === presetId);
  const presetInputData = preset?.presetInputData || {};

  const trackGroups = useMemo(
    () => buildTrackGroups(collectRawRanges(presetInputData)),
    [presetInputData],
  );

  const [segsMap, setSegsMap] = useState<Record<string, ParsedSegment[]>>({});
  const [selected, setSelected] = useState<{
    templatePath: string;
    segIdx: number;
  } | null>(null);

  const dragRef = useRef<{
    type: "move" | "left" | "right";
    templatePath: string;
    segIdx: number;
    kind: RangeKind;
    startClientX: number;
    origStart: number;
    origEnd: number;
    segKind: ParsedSegment["kind"];
  } | null>(null);

  const trackGroupsKey = trackGroups
    .map((g) => `${g.templatePath}:${g.currentRanges.join("|")}`)
    .join("||");

  useEffect(() => {
    if (dragRef.current) return;
    const next: Record<string, ParsedSegment[]> = {};
    for (const group of trackGroups) {
      next[group.templatePath] = segsFromTrackGroup(group);
    }
    setSegsMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackGroupsKey]);

  useEffect(() => {
    if (selected) setSegmentSelectionActive(true);
    return () => setSegmentSelectionActive(false);
  }, [selected]);

  const commitRef = useRef<
    (tp: string, segs: ParsedSegment[], changedSegIdx?: number) => void
  >(() => {});

  commitRef.current = (tp, segs, changedSegIdx) => {
    if (!timeline || !preset) return;
    const group = trackGroups.find((g) => g.templatePath === tp);
    if (!group) return;
    const nextInputData = applySegsToInputData(
      presetInputData,
      group,
      segs,
      changedSegIdx,
    );
    updatePresetInputData(timelineId, presetId, nextInputData);
    const latest = getEditedTimeline(timelineId) || timeline;
    generateOutput(latest);
  };

  const startDrag = useCallback(
    (
      e: React.PointerEvent,
      type: "move" | "left" | "right",
      templatePath: string,
      segIdx: number,
      seg: ParsedSegment,
      kind: RangeKind,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        type,
        templatePath,
        segIdx,
        kind,
        startClientX: e.clientX,
        origStart: seg.start,
        origEnd: seg.end,
        segKind: seg.kind,
      };
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, templatePath: string) => {
      const drag = dragRef.current;
      if (!drag || drag.templatePath !== templatePath) return;
      const deltaSec = (e.clientX - drag.startClientX) / pixelsPerSecond;
      const minGap = drag.segKind === "index" ? 1 : 0.01;
      const duration = drag.origEnd - drag.origStart;
      const maxEnd =
        drag.segKind === "time"
          ? totalDuration
          : Math.max(drag.origEnd * 2, totalDuration);

      setSegsMap((prev) => {
        const segs = [...(prev[templatePath] ?? [])];
        const s = segs[drag.segIdx];
        if (!s) return prev;
        let newStart = s.start;
        let newEnd = s.end;
        if (drag.type === "move") {
          newStart = Math.max(
            0,
            Math.min(maxEnd - duration, drag.origStart + deltaSec),
          );
          newEnd = newStart + duration;
          if (drag.segKind === "index") {
            newStart = Math.round(newStart);
            newEnd = Math.round(newEnd);
          }
        } else if (drag.type === "left") {
          newStart = Math.max(
            0,
            Math.min(drag.origEnd - minGap, drag.origStart + deltaSec),
          );
          if (drag.segKind === "index") newStart = Math.round(newStart);
          newEnd = s.end;
        } else {
          newEnd = Math.max(
            drag.origStart + minGap,
            Math.min(maxEnd, drag.origEnd + deltaSec),
          );
          if (drag.segKind === "index") newEnd = Math.round(newEnd);
          newStart = s.start;
        }
        segs[drag.segIdx] = { ...s, start: newStart, end: newEnd };
        return { ...prev, [templatePath]: segs };
      });
    },
    [pixelsPerSecond, totalDuration],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent, templatePath: string) => {
      const drag = dragRef.current;
      if (!drag || drag.templatePath !== templatePath) return;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const segIdx = drag.segIdx;
      const kind = drag.kind;
      dragRef.current = null;
      setSegsMap((prev) => {
        const segs = prev[templatePath] ?? [];
        commitRef.current(
          templatePath,
          segs,
          kind === "plain-range" ? segIdx : undefined,
        );
        return prev;
      });
    },
    [],
  );

  const section: TimelineTrackSectionData = useMemo(() => {
    const rows = trackGroups.map((group, ti) => {
      const segs = segsMap[group.templatePath] ?? [];
      const color = TRACK_COLORS[ti % TRACK_COLORS.length]!;
      const isPlain = group.kind === "plain-range";

      return {
        id: `${sectionId}:${group.templatePath}`,
        label: (
          <div
            className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-semibold truncate"
                title={group.label}
              >
                {group.label}
              </p>
              <p className="text-[9px] text-muted-foreground/50 truncate">
                {isPlain
                  ? `${group.key} · ${segs.length} item${segs.length !== 1 ? "s" : ""}`
                  : `ref: ${group.key} · ${segs.length} seg${segs.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        ),
        track: (
          <div
            className="relative border-b border-border/40 hover:bg-muted/5 transition-colors"
            style={{ height: ROW_HEIGHT }}
            onPointerMove={(e) => handlePointerMove(e, group.templatePath)}
            onPointerUp={(e) => handlePointerUp(e, group.templatePath)}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null);
            }}
          >
            {segs.map((seg, si) => {
              const left = secToPx(seg.start);
              const width = Math.max(MIN_SEG_PX, secToPx(seg.end - seg.start));
              const isSelected =
                selected?.templatePath === group.templatePath &&
                selected.segIdx === si;
              const innerLabel =
                seg.kind === "index"
                  ? `[${Math.round(seg.start)}–${Math.round(seg.end)}]`
                  : `${formatTimeLabel(seg.start)}–${formatTimeLabel(seg.end)}`;

              return (
                <div
                  key={si}
                  className="absolute top-1.5 bottom-1.5 group/seg"
                  style={{
                    left,
                    width: Math.max(MIN_SEG_PX, width),
                    overflow: "visible",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected({
                      templatePath: group.templatePath,
                      segIdx: si,
                    });
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
                      setSelected({
                        templatePath: group.templatePath,
                        segIdx: si,
                      });
                      startDrag(
                        e,
                        "move",
                        group.templatePath,
                        si,
                        seg,
                        group.kind,
                      );
                    }}
                    onPointerMove={(e) =>
                      handlePointerMove(e, group.templatePath)
                    }
                    onPointerUp={(e) =>
                      handlePointerUp(e, group.templatePath)
                    }
                  >
                    {width > 48 && (
                      <span className="px-2 text-[9px] font-medium truncate pointer-events-none select-none">
                        {innerLabel}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-start pl-0.5 opacity-0 group-hover/seg:opacity-100"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      startDrag(
                        e,
                        "left",
                        group.templatePath,
                        si,
                        seg,
                        group.kind,
                      );
                    }}
                    onPointerMove={(e) =>
                      handlePointerMove(e, group.templatePath)
                    }
                    onPointerUp={(e) =>
                      handlePointerUp(e, group.templatePath)
                    }
                  >
                    <div className="w-0.5 h-5 rounded-full bg-white/60" />
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-end pr-0.5 opacity-0 group-hover/seg:opacity-100"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      startDrag(
                        e,
                        "right",
                        group.templatePath,
                        si,
                        seg,
                        group.kind,
                      );
                    }}
                    onPointerMove={(e) =>
                      handlePointerMove(e, group.templatePath)
                    }
                    onPointerUp={(e) =>
                      handlePointerUp(e, group.templatePath)
                    }
                  >
                    <div className="w-0.5 h-5 rounded-full bg-white/60" />
                  </div>
                </div>
              );
            })}
            {segs.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-muted-foreground/25">
                  No range set
                </span>
              </div>
            )}
          </div>
        ),
      };
    });

    return {
      id: sectionId,
      order,
      header:
        showHeader && rows.length > 0
          ? { label: `Preset · ${label}`, track: null }
          : undefined,
      rows,
    };
  }, [
    trackGroups,
    segsMap,
    sectionId,
    order,
    showHeader,
    label,
    secToPx,
    selected,
    handlePointerMove,
    handlePointerUp,
    startDrag,
  ]);

  useRegisterTimelineSection(section);
  return null;
}
