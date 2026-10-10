"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardX,
  Copy,
  CopyPlus,
  Scissors,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { useTimelineEditsStore } from "../../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../../stores/compile-store";
import { useLayerStateStore } from "../../../../stores/layer-state-store";
import { setSegmentSelectionActive } from "../../../../stores/bottom-selection-gate";
import { isEditableKeyboardTarget } from "../../../../stores/block-clipboard-store";
import { isEditorFocusScope } from "../../../../stores/editor-focus-scope";
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
  claimBlockSelection,
  releaseBlockSelection,
} from "../timeline-block-selection";
import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";
import {
  applySegsToInputData,
  buildTrackGroups,
  canEditSegStructure,
  collectRangeLayouts,
  collectRawRanges,
  insertClonedArrayItemWithRange,
  parseArrayItemFieldPath,
  segsFromTrackGroup,
  serializeSegment,
  setAtPath,
  usesJoinedRangeString,
  type ParsedSegment,
  type RangeKind,
  type SegmentKind,
  type TrackGroup,
} from "../preset-range-utils";

const MIN_SPLIT_GAP = 0.05;

interface SegSelection {
  templatePath: string;
  segIdx: number;
}

interface SegClipboard {
  seg: ParsedSegment;
}

export interface PresetTracksSectionProps {
  sectionId: string;
  order: number;
  timelineId: string;
  presetId: string;
  label: string;
  /** Used when edits store has no entry yet. */
  fallbackTimeline?: Timeline | null;
  /**
   * When set (clubbed/overview), append " - {tag}" to track titles
   * instead of rendering a separate section header.
   */
  sourceTag?: string;
}

/**
 * Registers preset range tracks into the shared TimelineShell.
 * Same component is used for focused preset view and timeline overview.
 */
export function PresetTracksSection({
  sectionId,
  order,
  timelineId,
  presetId,
  label,
  fallbackTimeline,
  sourceTag,
}: PresetTracksSectionProps) {
  const clubbed = !!sourceTag;
  const { secToPx, totalDuration, pixelsPerSecond } = useTimelineViewport();
  const updatePresetInputData = useTimelineEditsStore(
    (s) => s.updatePresetInputData,
  );
  const editedTimeline = useTimelineEditsStore((s) =>
    s.editedTimelines.get(timelineId),
  );
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const generateOutput = useCompileStore((s) => s.generateOutput);
  const fps = useCompileStore((s) => s.calculatedMetadata?.fps ?? 30);
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const currentTimeSec = currentFrame / fps;

  const timeline = editedTimeline || fallbackTimeline || undefined;
  const preset = timeline?.presets?.find((p) => p.id === presetId);
  const presetInputData = preset?.presetInputData || {};

  const registryPresetId = (preset as { presetId?: string } | undefined)
    ?.presetId;
  const rangeLayouts = useMemo(() => {
    if (!registryPresetId) return undefined;
    return collectRangeLayouts(
      getPredefinedPresetById(registryPresetId)?.presetParams,
    );
  }, [registryPresetId]);

  const trackGroups = useMemo(
    () => buildTrackGroups(collectRawRanges(presetInputData), rangeLayouts),
    [presetInputData, rangeLayouts],
  );

  const [segsMap, setSegsMap] = useState<Record<string, ParsedSegment[]>>({});
  const [selectedSeg, setSelectedSeg] = useState<SegSelection | null>(null);
  const [clipboard, setClipboard] = useState<SegClipboard | null>(null);

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
    if (!selectedSeg) {
      releaseBlockSelection(sectionId);
      return;
    }
    setSegmentSelectionActive(true);
    claimBlockSelection(sectionId, () => setSelectedSeg(null));
    return () => {
      setSegmentSelectionActive(false);
      releaseBlockSelection(sectionId);
    };
  }, [selectedSeg, sectionId]);

  const selectSeg = useCallback(
    (next: SegSelection) => {
      claimBlockSelection(sectionId, () => setSelectedSeg(null));
      setSelectedSeg(next);
    },
    [sectionId],
  );

  const clearSelection = useCallback(() => {
    setSelectedSeg(null);
    releaseBlockSelection(sectionId);
  }, [sectionId]);

  useEffect(() => {
    return () => releaseBlockSelection(sectionId);
  }, [sectionId]);

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

  const getGroup = useCallback(
    (tp: string) => trackGroups.find((g) => g.templatePath === tp),
    [trackGroups],
  );

  const canMutateMultiSeg = useCallback(
    (tp: string) => getGroup(tp)?.kind === "data-reference",
    [getGroup],
  );

  const canEditStructure = useCallback(
    (tp: string) => {
      const g = getGroup(tp);
      return g ? canEditSegStructure(g) : false;
    },
    [getGroup],
  );

  const isPlayheadInsideSeg = useCallback(
    (seg: ParsedSegment) => {
      const minGap = seg.kind === "index" ? 1 : MIN_SPLIT_GAP;
      return (
        currentTimeSec > seg.start &&
        currentTimeSec < seg.end &&
        currentTimeSec - seg.start >= minGap * 0.5 &&
        seg.end - currentTimeSec >= minGap * 0.5
      );
    },
    [currentTimeSec],
  );

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

  const deleteSegment = useCallback(
    (group: TrackGroup, segIdx: number) => {
      const useJoinedSegs = usesJoinedRangeString(group);

      if (useJoinedSegs) {
        setSegsMap((prev) => {
          const segs = (prev[group.templatePath] ?? []).filter(
            (_, i) => i !== segIdx,
          );
          commitRef.current(group.templatePath, segs);
          return { ...prev, [group.templatePath]: segs };
        });
        setSelectedSeg((sel) => {
          if (!sel || sel.templatePath !== group.templatePath) return sel;
          if (sel.segIdx === segIdx) return null;
          if (sel.segIdx > segIdx) return { ...sel, segIdx: sel.segIdx - 1 };
          return sel;
        });
        return;
      }

      if (!timeline || !preset) return;
      const path = group.concretePaths[segIdx];
      if (!path) return;
      const nextInputData = setAtPath(presetInputData, path, "");
      updatePresetInputData(timelineId, presetId, nextInputData);
      const latestTimeline = getEditedTimeline(timelineId) || timeline;
      generateOutput(latestTimeline);
      setSelectedSeg((sel) =>
        sel?.templatePath === group.templatePath && sel.segIdx === segIdx
          ? null
          : sel,
      );
    },
    [
      timeline,
      preset,
      presetInputData,
      timelineId,
      presetId,
      updatePresetInputData,
      getEditedTimeline,
      generateOutput,
    ],
  );

  const copySelected = useCallback(() => {
    if (!selectedSeg) return;
    const segs = segsMap[selectedSeg.templatePath] ?? [];
    const seg = segs[selectedSeg.segIdx];
    if (!seg) return;
    setClipboard({ seg: { ...seg } });
  }, [selectedSeg, segsMap]);

  const cutSelected = useCallback(() => {
    if (!selectedSeg) return;
    const group = getGroup(selectedSeg.templatePath);
    if (!group) return;
    const segs = segsMap[selectedSeg.templatePath] ?? [];
    const seg = segs[selectedSeg.segIdx];
    if (!seg) return;
    setClipboard({ seg: { ...seg } });
    deleteSegment(group, selectedSeg.segIdx);
  }, [selectedSeg, segsMap, getGroup, deleteSegment]);

  const duplicateSelected = useCallback(
    (sel?: SegSelection | null) => {
      const target = sel !== undefined ? sel : selectedSeg;
      if (!target || !canEditStructure(target.templatePath)) return;
      const group = getGroup(target.templatePath);
      if (!group) return;

      const useJoinedSegs = usesJoinedRangeString(group);

      if (useJoinedSegs) {
        setSegsMap((prev) => {
          const segs = [...(prev[target.templatePath] ?? [])];
          const orig = segs[target.segIdx];
          if (!orig) return prev;
          const duration = orig.end - orig.start;
          const newStart =
            orig.kind === "index"
              ? Math.round(orig.end)
              : Math.min(totalDuration - 0.01, orig.end);
          const newEnd =
            orig.kind === "index"
              ? newStart + Math.max(1, Math.round(duration))
              : Math.min(totalDuration, newStart + duration);
          if (newEnd <= newStart) return prev;
          const dup: ParsedSegment = {
            kind: orig.kind,
            start: newStart,
            end: newEnd,
          };
          segs.splice(target.segIdx + 1, 0, dup);
          segs.sort((a, b) => a.start - b.start);
          const newIdx = segs.findIndex(
            (s) =>
              s.start === dup.start &&
              s.end === dup.end &&
              s.kind === dup.kind,
          );
          commitRef.current(target.templatePath, segs);
          queueMicrotask(() => {
            selectSeg({
              templatePath: target.templatePath,
              segIdx: newIdx >= 0 ? newIdx : segs.length - 1,
            });
          });
          return { ...prev, [target.templatePath]: segs };
        });
        return;
      }

      if (!timeline || !preset) return;
      const segs = segsMap[target.templatePath] ?? [];
      const orig = segs[target.segIdx];
      const path = group.concretePaths[target.segIdx];
      if (!orig || !path) return;
      const duration = orig.end - orig.start;
      const newStart =
        orig.kind === "index"
          ? Math.round(orig.end)
          : Math.min(totalDuration - 0.01, orig.end);
      const newEnd =
        orig.kind === "index"
          ? newStart + Math.max(1, Math.round(duration))
          : Math.min(totalDuration, newStart + duration);
      if (newEnd <= newStart) return;
      const dup: ParsedSegment = {
        kind: orig.kind,
        start: newStart,
        end: newEnd,
      };
      const next = insertClonedArrayItemWithRange(
        presetInputData,
        path,
        serializeSegment(dup),
      );
      if (!next) return;
      updatePresetInputData(timelineId, presetId, next);
      const latestTimeline = getEditedTimeline(timelineId) || timeline;
      generateOutput(latestTimeline);
      queueMicrotask(() => {
        selectSeg({
          templatePath: target.templatePath,
          segIdx: target.segIdx + 1,
        });
      });
    },
    [
      selectedSeg,
      canEditStructure,
      getGroup,
      totalDuration,
      timeline,
      preset,
      segsMap,
      presetInputData,
      timelineId,
      presetId,
      updatePresetInputData,
      getEditedTimeline,
      generateOutput,
      selectSeg,
    ],
  );

  const pasteClipboard = useCallback(() => {
    const targetTp =
      (selectedSeg && canMutateMultiSeg(selectedSeg.templatePath)
        ? selectedSeg.templatePath
        : trackGroups.find((g) => g.kind === "data-reference")
            ?.templatePath) ?? null;
    if (!targetTp || !clipboard) return;
    const group = getGroup(targetTp);
    if (!group || group.kind !== "data-reference") return;

    setSegsMap((prev) => {
      const segs = [...(prev[targetTp] ?? [])];
      const duration = clipboard.seg.end - clipboard.seg.start;
      const kind: SegmentKind = segs[0]?.kind ?? clipboard.seg.kind;
      const start =
        kind === "index"
          ? Math.round(currentTimeSec)
          : Math.max(0, Math.min(totalDuration - 0.01, currentTimeSec));
      const end =
        kind === "index"
          ? start + Math.max(1, Math.round(duration))
          : Math.min(
              totalDuration,
              start + Math.max(MIN_SPLIT_GAP, duration),
            );
      if (end <= start) return prev;
      const pasted: ParsedSegment = { kind, start, end };
      segs.push(pasted);
      segs.sort((a, b) => a.start - b.start);
      const newIdx = segs.findIndex(
        (s) =>
          s.start === pasted.start &&
          s.end === pasted.end &&
          s.kind === pasted.kind,
      );
      commitRef.current(targetTp, segs);
      queueMicrotask(() => {
        selectSeg({
          templatePath: targetTp,
          segIdx: newIdx >= 0 ? newIdx : segs.length - 1,
        });
      });
      return { ...prev, [targetTp]: segs };
    });
  }, [
    selectedSeg,
    canMutateMultiSeg,
    trackGroups,
    clipboard,
    getGroup,
    currentTimeSec,
    totalDuration,
    selectSeg,
  ]);

  const splitAtPlayhead = useCallback(
    (sel?: SegSelection | null) => {
      const preferred = sel !== undefined ? sel : selectedSeg;

      const resolveTarget = (): SegSelection | null => {
        if (
          preferred &&
          canEditStructure(preferred.templatePath) &&
          (() => {
            const s = (segsMap[preferred.templatePath] ?? [])[
              preferred.segIdx
            ];
            return !!s && isPlayheadInsideSeg(s);
          })()
        ) {
          return preferred;
        }
        for (const g of trackGroups) {
          if (!canEditStructure(g.templatePath)) continue;
          const segs = segsMap[g.templatePath] ?? [];
          const fi = segs.findIndex((s) => isPlayheadInsideSeg(s));
          if (fi >= 0) return { templatePath: g.templatePath, segIdx: fi };
        }
        return null;
      };

      const resolved = resolveTarget();
      if (!resolved) return;
      const { templatePath: tp, segIdx: idx } = resolved;
      const group = getGroup(tp);
      if (!group) return;
      const orig = (segsMap[tp] ?? [])[idx];
      if (!orig || !isPlayheadInsideSeg(orig)) return;

      const cutAt =
        orig.kind === "index" ? Math.round(currentTimeSec) : currentTimeSec;
      if (cutAt <= orig.start || cutAt >= orig.end) return;

      const left: ParsedSegment = { ...orig, end: cutAt };
      const right: ParsedSegment = { ...orig, start: cutAt };

      if (usesJoinedRangeString(group)) {
        setSegsMap((prev) => {
          const segs = [...(prev[tp] ?? [])];
          segs.splice(idx, 1, left, right);
          commitRef.current(tp, segs);
          queueMicrotask(() => {
            selectSeg({ templatePath: tp, segIdx: idx + 1 });
          });
          return { ...prev, [tp]: segs };
        });
        return;
      }

      if (!timeline || !preset) return;
      const path = group.concretePaths[idx];
      if (!path) return;
      let next = setAtPath(presetInputData, path, serializeSegment(left));
      next = insertClonedArrayItemWithRange(
        next,
        path,
        serializeSegment(right),
      );
      if (!next) return;
      updatePresetInputData(timelineId, presetId, next);
      const latestTimeline = getEditedTimeline(timelineId) || timeline;
      generateOutput(latestTimeline);
      queueMicrotask(() => {
        selectSeg({ templatePath: tp, segIdx: idx + 1 });
      });
    },
    [
      selectedSeg,
      trackGroups,
      segsMap,
      isPlayheadInsideSeg,
      canEditStructure,
      currentTimeSec,
      getGroup,
      timeline,
      preset,
      presetInputData,
      timelineId,
      presetId,
      updatePresetInputData,
      getEditedTimeline,
      generateOutput,
      selectSeg,
    ],
  );

  const snapSelectedSegToPlayhead = useCallback(
    (edge: "start" | "end", mode: "move" | "trim" = "move") => {
      if (!selectedSeg) return;
      const tp = selectedSeg.templatePath;
      const idx = selectedSeg.segIdx;
      const group = getGroup(tp);
      if (!group) return;

      setSegsMap((prev) => {
        const segs = [...(prev[tp] ?? [])];
        const seg = segs[idx];
        if (!seg) return prev;
        const minGap = seg.kind === "index" ? 1 : 0.01;
        const dur = Math.max(minGap, seg.end - seg.start);
        const at =
          seg.kind === "index" ? Math.round(currentTimeSec) : currentTimeSec;
        const maxEnd =
          seg.kind === "time"
            ? totalDuration
            : Math.max(seg.end * 2, totalDuration, at + dur);

        let newStart = seg.start;
        let newEnd = seg.end;

        if (mode === "trim") {
          if (edge === "start") {
            const maxStart = newEnd - minGap;
            if (maxStart < 0) return prev;
            const nextStart = Math.max(0, Math.min(at, maxStart));
            if (Math.abs(nextStart - seg.start) < 1e-9) return prev;
            newStart = nextStart;
          } else {
            const minEnd = newStart + minGap;
            if (minEnd > maxEnd) return prev;
            const nextEnd = Math.min(maxEnd, Math.max(at, minEnd));
            if (Math.abs(nextEnd - seg.end) < 1e-9) return prev;
            newEnd = nextEnd;
          }
        } else if (edge === "start") {
          newStart = at;
          newEnd = newStart + dur;
          if (newEnd > maxEnd) {
            newEnd = maxEnd;
            newStart = Math.max(0, newEnd - dur);
          }
          if (newStart < 0) {
            newStart = 0;
            newEnd = dur;
          }
        } else {
          newEnd = at;
          newStart = newEnd - dur;
          if (newStart < 0) {
            newStart = 0;
            newEnd = dur;
          }
          if (newEnd > maxEnd) {
            newEnd = maxEnd;
            newStart = Math.max(0, newEnd - dur);
          }
        }

        if (seg.kind === "index") {
          newStart = Math.round(newStart);
          newEnd = Math.round(newEnd);
          if (newEnd - newStart < 1) {
            if (edge === "start") newStart = newEnd - 1;
            else newEnd = newStart + 1;
          }
        }
        segs[idx] = { ...seg, start: newStart, end: newEnd };
        commitRef.current(
          tp,
          segs,
          group.kind === "plain-range" ? idx : undefined,
        );
        return { ...prev, [tp]: segs };
      });
    },
    [selectedSeg, getGroup, currentTimeSec, totalDuration],
  );

  const deleteSelectedSeg = useCallback(() => {
    if (!selectedSeg) return;
    const group = getGroup(selectedSeg.templatePath);
    if (!group) return;
    deleteSegment(group, selectedSeg.segIdx);
  }, [selectedSeg, getGroup, deleteSegment]);

  useEffect(() => {
    // Clubbed overview: only the section with an active selection /
    // clipboard should handle keys — avoids N sections all splitting/pasting.
    if (clubbed && !selectedSeg && !clipboard) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Segment shortcuts only while the bottom timeline is focused
      if (!isEditorFocusScope("bottom")) return;
      if (
        isEditableKeyboardTarget(e.target) ||
        isEditableKeyboardTarget(document.activeElement)
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "d") {
        if (!selectedSeg) return;
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        if (!selectedSeg) return;
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        if (!selectedSeg) return;
        e.preventDefault();
        cutSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        if (!clipboard) return;
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && (e.key === "\\" || e.code === "Backslash")) {
        // Overview requires a selection so only one section splits
        if (clubbed && !selectedSeg) return;
        e.preventDefault();
        splitAtPlayhead();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedSeg) {
        e.preventDefault();
        deleteSelectedSeg();
        return;
      }
      if ((e.key === "[" || e.code === "BracketLeft") && selectedSeg) {
        e.preventDefault();
        snapSelectedSegToPlayhead("start", mod ? "trim" : "move");
        return;
      }
      if ((e.key === "]" || e.code === "BracketRight") && selectedSeg) {
        e.preventDefault();
        snapSelectedSegToPlayhead("end", mod ? "trim" : "move");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    clubbed,
    selectedSeg,
    clipboard,
    duplicateSelected,
    copySelected,
    cutSelected,
    pasteClipboard,
    splitAtPlayhead,
    deleteSelectedSeg,
    snapSelectedSegToPlayhead,
  ]);

  const section: TimelineTrackSectionData = useMemo(() => {
    const rows = trackGroups.map((group, ti) => {
      const segs = segsMap[group.templatePath] ?? [];
      const color = TRACK_COLORS[ti % TRACK_COLORS.length]!;
      const isPlain = group.kind === "plain-range";
      const structureEditable = canEditSegStructure(group);
      const useJoinedDelete = usesJoinedRangeString(group);
      const shortLabel = group.label.includes(".")
        ? (group.label.split(".").pop() ?? group.label)
        : group.label;
      const trackTitle = sourceTag
        ? `${shortLabel} - ${sourceTag}`
        : group.label;

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
                {trackTitle}
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
              if (e.target === e.currentTarget) clearSelection();
            }}
            onDoubleClick={(e) => {
              if (e.target !== e.currentTarget) return;
              if (
                group.kind === "plain-range" &&
                !usesJoinedRangeString(group) &&
                group.rangeLayout !== "array"
              )
                return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickSec = Math.max(
                0,
                Math.min(
                  totalDuration,
                  (e.clientX - rect.left) / pixelsPerSecond,
                ),
              );
              if (group.rangeLayout === "array") {
                const path =
                  group.concretePaths[group.concretePaths.length - 1];
                if (!path) return;
                const existingKind: SegmentKind =
                  (segsMap[group.templatePath] ?? [])[0]?.kind ?? "time";
                const newSeg: ParsedSegment = {
                  kind: existingKind,
                  start: Math.max(0, clickSec),
                  end:
                    existingKind === "index"
                      ? Math.round(clickSec) + 10
                      : Math.min(totalDuration, clickSec + 5),
                };
                const next = insertClonedArrayItemWithRange(
                  presetInputData,
                  path,
                  serializeSegment(newSeg),
                );
                if (!next || !timeline || !preset) return;
                updatePresetInputData(timelineId, presetId, next);
                const latestTimeline =
                  getEditedTimeline(timelineId) || timeline;
                generateOutput(latestTimeline);
                return;
              }
              setSegsMap((prev) => {
                const nextSegs = [...(prev[group.templatePath] ?? [])];
                const existingKind: SegmentKind = nextSegs[0]?.kind ?? "time";
                const newSeg: ParsedSegment = {
                  kind: existingKind,
                  start: Math.max(0, clickSec),
                  end:
                    existingKind === "index"
                      ? Math.round(clickSec) + 10
                      : Math.min(totalDuration, clickSec + 5),
                };
                nextSegs.push(newSeg);
                nextSegs.sort((a, b) => a.start - b.start);
                commitRef.current(group.templatePath, nextSegs);
                return { ...prev, [group.templatePath]: nextSegs };
              });
            }}
          >
            {segs.map((seg, si) => {
              const left = secToPx(seg.start);
              const width = Math.max(MIN_SEG_PX, secToPx(seg.end - seg.start));
              const isSelected =
                selectedSeg?.templatePath === group.templatePath &&
                selectedSeg.segIdx === si;
              const innerLabel =
                seg.kind === "index"
                  ? `[${Math.round(seg.start)}–${Math.round(seg.end)}]`
                  : `${formatTimeLabel(seg.start)}–${formatTimeLabel(seg.end)}`;
              const canSplit =
                structureEditable && isPlayheadInsideSeg(seg);
              const canDuplicate = structureEditable;
              const onDelete = useJoinedDelete
                ? () => deleteSegment(group, si)
                : group.concretePaths[si] &&
                    parseArrayItemFieldPath(group.concretePaths[si]!)
                  ? () => deleteSegment(group, si)
                  : null;

              return (
                <SegBlock
                  key={si}
                  left={left}
                  width={width}
                  color={color}
                  isSelected={isSelected}
                  innerLabel={innerLabel}
                  canDuplicate={canDuplicate}
                  canSplit={canSplit}
                  onSelect={() =>
                    selectSeg({
                      templatePath: group.templatePath,
                      segIdx: si,
                    })
                  }
                  onMoveDown={(e) =>
                    startDrag(
                      e,
                      "move",
                      group.templatePath,
                      si,
                      seg,
                      group.kind,
                    )
                  }
                  onLeftDown={(e) =>
                    startDrag(
                      e,
                      "left",
                      group.templatePath,
                      si,
                      seg,
                      group.kind,
                    )
                  }
                  onRightDown={(e) =>
                    startDrag(
                      e,
                      "right",
                      group.templatePath,
                      si,
                      seg,
                      group.kind,
                    )
                  }
                  onPointerMove={(e) =>
                    handlePointerMove(e, group.templatePath)
                  }
                  onPointerUp={(e) =>
                    handlePointerUp(e, group.templatePath)
                  }
                  onDelete={onDelete}
                  onDuplicate={() =>
                    duplicateSelected({
                      templatePath: group.templatePath,
                      segIdx: si,
                    })
                  }
                  onSplit={() =>
                    splitAtPlayhead({
                      templatePath: group.templatePath,
                      segIdx: si,
                    })
                  }
                  onCopy={() => {
                    selectSeg({
                      templatePath: group.templatePath,
                      segIdx: si,
                    });
                    setClipboard({ seg: { ...seg } });
                  }}
                  onCut={() => {
                    setClipboard({ seg: { ...seg } });
                    deleteSegment(group, si);
                  }}
                />
              );
            })}
            {segs.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-muted-foreground/25">
                  No range set · double-click to add
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
      rows,
    };
  }, [
    trackGroups,
    segsMap,
    sectionId,
    order,
    sourceTag,
    label,
    secToPx,
    selectedSeg,
    handlePointerMove,
    handlePointerUp,
    startDrag,
    totalDuration,
    pixelsPerSecond,
    isPlayheadInsideSeg,
    deleteSegment,
    duplicateSelected,
    splitAtPlayhead,
    selectSeg,
    clearSelection,
    presetInputData,
    timeline,
    preset,
    timelineId,
    presetId,
    updatePresetInputData,
    getEditedTimeline,
    generateOutput,
  ]);

  useRegisterTimelineSection(section);
  return null;
}

function SegBlock({
  left,
  width,
  color,
  isSelected,
  innerLabel,
  canDuplicate,
  canSplit,
  onSelect,
  onMoveDown,
  onLeftDown,
  onRightDown,
  onPointerMove,
  onPointerUp,
  onDelete,
  onDuplicate,
  onSplit,
  onCopy,
  onCut,
}: {
  left: number;
  width: number;
  color: string;
  isSelected: boolean;
  innerLabel: string;
  canDuplicate: boolean;
  canSplit: boolean;
  onSelect: () => void;
  onMoveDown: (e: React.PointerEvent) => void;
  onLeftDown: (e: React.PointerEvent) => void;
  onRightDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onDelete: (() => void) | null;
  onDuplicate: () => void;
  onSplit: () => void;
  onCopy: () => void;
  onCut: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="absolute top-1.5 bottom-1.5 group/seg"
          style={{
            left,
            width: Math.max(MIN_SEG_PX, width),
            overflow: "visible",
          }}
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
              onSelect();
              onLeftDown(e);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className="w-0.5 h-5 rounded-full bg-white/60" />
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-end pr-0.5 opacity-0 group-hover/seg:opacity-100"
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
          {onDelete && (
            <button
              type="button"
              className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center z-20 opacity-0 group-hover/seg:opacity-100 transition-opacity hover:bg-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Remove segment"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onSplit} disabled={!canSplit}>
          <Scissors className="h-4 w-4" />
          Split at playhead
          <ContextMenuShortcut>⌘\</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicate} disabled={!canDuplicate}>
          <CopyPlus className="h-4 w-4" />
          Duplicate
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onCut}>
          <ClipboardX className="h-4 w-4" />
          Cut
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopy}>
          <Copy className="h-4 w-4" />
          Copy
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
              <ContextMenuShortcut>⌫</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
