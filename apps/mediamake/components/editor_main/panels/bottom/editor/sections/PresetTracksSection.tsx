"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardPaste,
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
  MIN_SEG_PX,
  TRACK_COLORS,
  formatTimeLabel,
} from "../timeline-layout";
import { blockCornerClass, rowHeightFor, useTimelineDensity } from "../timeline-density";
import { useTimelineViewport } from "../timeline-viewport";
import {
  useRegisterTimelineSection,
  type TimelineTrackRow,
  type TimelineTrackSectionData,
} from "../TimelineShell";
import {
  claimBlockSelection,
  releaseBlockSelection,
} from "../timeline-block-selection";
import { useTimelineBlockFocus } from "@/components/editor_main/stores/timeline-block-focus";
import { useCaptionTrackSelection } from "@/components/editor_main/stores/caption-track-selection";
import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";
import { migratePresetTrackInput } from "@/components/editor/presets/registry/general/migrate-preset-track-input";
import { loadInstanceTree } from "@/components/editor_main/timing/load-instance-tree";
import { resolveTiming } from "@/components/editor_main/timing/resolve-timing";
import { collectIntrinsicDurations } from "@/components/editor_main/timing/stamp-timing";
import {
  absoluteToLocalEffectTime,
  isSceneRelativeEffectPath,
  sceneRelativeEffectAnchors,
  type EffectAnchor,
} from "../media-scene-blocks";
import {
  applySegsToInputData,
  buildTrackGroups,
  canEditSegStructure,
  collectRangeLayouts,
  collectRawRanges,
  deleteArrayRangeItem,
  getAtPath,
  insertClonedArrayItemWithRange,
  parseArrayItemFieldPath,
  parseDirectArrayIndexPath,
  segsFromTrackGroup,
  serializeSegment,
  setAtPath,
  setAtPathValue,
  usesJoinedRangeString,
  type ParsedSegment,
  type RangeKind,
  type SegmentKind,
  type TrackGroup,
} from "../preset-range-utils";
import {
  imageItemPathFromRangePath,
  readTransitionEffects,
  TransitionEdgeIcons,
  TransitionLaneLabel,
  TransitionRangeTrack,
  transitionEdgeFlags,
  type TransitionEdge,
} from "../image-transition-tracks";

const MIN_SPLIT_GAP = 0.05;

function rangeFocusLabel(group: TrackGroup | undefined, segIdx: number): string {
  if (!group) return "Range";
  const short = group.label.includes(".")
    ? (group.label.split(".").pop() ?? group.label)
    : group.label;
  const name = short.trim() || "Range";
  const count = Math.max(group.concretePaths.length, group.currentRanges.length);
  return count > 1 ? `${name} ${segIdx + 1}` : name;
}

function clearRangeFocus(timelineId: string, presetId: string) {
  const focus = useTimelineBlockFocus.getState().focus;
  if (
    focus?.kind === "range" &&
    focus.timelineId === timelineId &&
    focus.presetId === presetId
  ) {
    useTimelineBlockFocus.getState().setFocus(null);
  }
}

interface SegSelection {
  templatePath: string;
  segIdx: number;
}

interface SegClipboard {
  seg: ParsedSegment;
  /** Object copied from an object-array track, so paste keeps the other fields. */
  item?: unknown;
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
  const { compact } = useTimelineDensity();
  const rowHeight = rowHeightFor(compact);
  const { secToPx, totalDuration, pixelsPerSecond } = useTimelineViewport();
  const updatePresetInputData = useTimelineEditsStore(
    (s) => s.updatePresetInputData,
  );
  const editedTimeline = useTimelineEditsStore((s) =>
    s.editedTimelines.get(timelineId),
  );
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const generateOutput = useCompileStore((s) => s.generateOutput);
  const compiledChildren = useCompileStore(
    (s) => s.calculatedMetadata?.props?.childrenData,
  );
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

  const effectAnchors = useMemo(() => {
    if (registryPresetId !== "imageloop" || !timeline) return null;
    const intrinsicDurations = collectIntrinsicDurations(compiledChildren);
    const span = resolveTiming(loadInstanceTree(timeline), {
      intrinsicDurations,
    }).nodes.get(presetId);
    return sceneRelativeEffectAnchors(
      presetInputData,
      span?.absoluteStart ?? 0,
      span?.duration,
    );
  }, [registryPresetId, timeline, compiledChildren, presetId, presetInputData]);

  const anchorsFor = useCallback(
    (templatePath: string): EffectAnchor[] | null => {
      if (!effectAnchors || !isSceneRelativeEffectPath(templatePath)) return null;
      return effectAnchors;
    },
    [effectAnchors],
  );

  const localClock = useCallback(
    (templatePath: string, absolute: number) => {
      const anchors = anchorsFor(templatePath);
      if (!anchors) return absolute;
      return absoluteToLocalEffectTime(absolute, anchors);
    },
    [anchorsFor],
  );

  useEffect(() => {
    if (!registryPresetId || !timeline || !preset) return;
    const migrated = migratePresetTrackInput(registryPresetId, presetInputData);
    if (migrated === presetInputData) return;
    updatePresetInputData(timelineId, presetId, migrated);
    const latest = getEditedTimeline(timelineId) || timeline;
    generateOutput(latest);
  }, [
    registryPresetId,
    presetInputData,
    timeline,
    preset,
    timelineId,
    presetId,
    updatePresetInputData,
    getEditedTimeline,
    generateOutput,
  ]);

  const [segsMap, setSegsMap] = useState<Record<string, ParsedSegment[]>>({});
  const [selectedSeg, setSelectedSeg] = useState<SegSelection | null>(null);
  const [expandedTransition, setExpandedTransition] =
    useState<SegSelection | null>(null);
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

  const trackGroupsRef = useRef(trackGroups);
  trackGroupsRef.current = trackGroups;

  useEffect(() => {
    if (!selectedSeg) {
      releaseBlockSelection(sectionId);
      clearRangeFocus(timelineId, presetId);
      return;
    }
    const group = trackGroupsRef.current.find(
      (item) => item.templatePath === selectedSeg.templatePath,
    );
    if (useCaptionTrackSelection.getState().selection) {
      useCaptionTrackSelection.getState().setSelection(null);
    }
    useTimelineBlockFocus.getState().setFocus({
      kind: "range",
      timelineId,
      presetId,
      label: rangeFocusLabel(group, selectedSeg.segIdx),
      blockKey: `${presetId}:${selectedSeg.templatePath}:${selectedSeg.segIdx}`,
    });
    setSegmentSelectionActive(true);
    claimBlockSelection(sectionId, () => {
      setSelectedSeg(null);
      setExpandedTransition(null);
    });
    return () => {
      setSegmentSelectionActive(false);
      releaseBlockSelection(sectionId);
      clearRangeFocus(timelineId, presetId);
    };
  }, [selectedSeg, sectionId, timelineId, presetId]);

  const rangeFocus = useTimelineBlockFocus((s) => s.focus);
  useEffect(() => {
    if (!selectedSeg) return;
    const key = `${presetId}:${selectedSeg.templatePath}:${selectedSeg.segIdx}`;
    const current = useTimelineBlockFocus.getState().focus;
    if (!current || current.kind !== "range" || current.blockKey !== key) {
      setSelectedSeg(null);
    }
  }, [rangeFocus, selectedSeg, presetId]);

  const selectSeg = useCallback(
    (next: SegSelection) => {
      claimBlockSelection(sectionId, () => {
        setSelectedSeg(null);
        setExpandedTransition(null);
      });
      setSelectedSeg(next);
      setExpandedTransition((cur) => {
        if (!cur) return null;
        if (
          cur.templatePath === next.templatePath &&
          cur.segIdx === next.segIdx
        ) {
          return cur;
        }
        return null;
      });
    },
    [sectionId],
  );

  const toggleTransitionLanes = useCallback((next: SegSelection) => {
    selectSeg(next);
    setExpandedTransition((cur) => {
      if (
        cur &&
        cur.templatePath === next.templatePath &&
        cur.segIdx === next.segIdx
      ) {
        return null;
      }
      return next;
    });
  }, [selectSeg]);

  const clearSelection = useCallback(() => {
    setSelectedSeg(null);
    setExpandedTransition(null);
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

  const playheadHits = useCallback(
    (templatePath: string, seg: ParsedSegment) => {
      const anchors = anchorsFor(templatePath);
      if (!anchors || seg.kind !== "time") return isPlayheadInsideSeg(seg);
      return anchors.some((anchor) =>
        isPlayheadInsideSeg({
          ...seg,
          start: anchor.start + seg.start,
          end: anchor.start + seg.end,
        }),
      );
    },
    [anchorsFor, isPlayheadInsideSeg],
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

  const copySegment = useCallback(
    (group: TrackGroup, segIdx: number, seg: ParsedSegment) => {
      let item: unknown;
      if (!usesJoinedRangeString(group)) {
        const path = group.concretePaths[segIdx];
        const field = path ? parseArrayItemFieldPath(path) : null;
        if (field) {
          const arr = getAtPath(presetInputData, field.arrayPath);
          const raw = Array.isArray(arr) ? arr[field.index] : undefined;
          if (raw && typeof raw === "object") item = structuredClone(raw);
        }
      }
      setClipboard({ seg: { ...seg }, item });
    },
    [presetInputData],
  );

  const deleteSegment = useCallback(
    (group: TrackGroup, segIdx: number) => {
      const adjustSelection = () => {
        const shift = (sel: SegSelection | null) => {
          if (!sel || sel.templatePath !== group.templatePath) return sel;
          if (sel.segIdx === segIdx) return null;
          if (sel.segIdx > segIdx) return { ...sel, segIdx: sel.segIdx - 1 };
          return sel;
        };
        setSelectedSeg(shift);
        setExpandedTransition(shift);
      };

      // Comma-separated string (and data: references): drop that segment's
      // text and keep the field as a string.
      if (usesJoinedRangeString(group)) {
        setSegsMap((prev) => {
          const segs = (prev[group.templatePath] ?? []).filter(
            (_, i) => i !== segIdx,
          );
          commitRef.current(group.templatePath, segs);
          return { ...prev, [group.templatePath]: segs };
        });
        adjustSelection();
        return;
      }

      if (!timeline || !preset) return;
      const path = group.concretePaths[segIdx];
      if (!path) return;
      const nextInputData = deleteArrayRangeItem(presetInputData, path);
      if (!nextInputData) return;
      updatePresetInputData(timelineId, presetId, nextInputData);
      const latestTimeline = getEditedTimeline(timelineId) || timeline;
      generateOutput(latestTimeline);
      adjustSelection();
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

  const commitTransitionDuration = useCallback(
    (itemPath: string, effectIndex: number, edge: TransitionEdge, seconds: number) => {
      if (!timeline || !preset) return;
      const key = edge === "in" ? "inRange" : "outRange";
      const next = setAtPathValue(
        presetInputData,
        `${itemPath}.transitionEffects[${effectIndex}].${key}`,
        seconds,
      );
      updatePresetInputData(timelineId, presetId, next);
      const latestTimeline = getEditedTimeline(timelineId) || timeline;
      generateOutput(latestTimeline);
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
    const group = getGroup(selectedSeg.templatePath);
    if (!group) return;
    const segs = segsMap[selectedSeg.templatePath] ?? [];
    const seg = segs[selectedSeg.segIdx];
    if (!seg) return;
    copySegment(group, selectedSeg.segIdx, seg);
  }, [selectedSeg, segsMap, getGroup, copySegment]);

  const cutSelected = useCallback(() => {
    if (!selectedSeg) return;
    const group = getGroup(selectedSeg.templatePath);
    if (!group) return;
    const segs = segsMap[selectedSeg.templatePath] ?? [];
    const seg = segs[selectedSeg.segIdx];
    if (!seg) return;
    copySegment(group, selectedSeg.segIdx, seg);
    deleteSegment(group, selectedSeg.segIdx);
  }, [selectedSeg, segsMap, getGroup, copySegment, deleteSegment]);

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

  const pasteClipboard = useCallback(
    (explicit?: SegSelection | null) => {
      if (!clipboard) return;
      const preferred = explicit !== undefined ? explicit : selectedSeg;
      const targetTp =
        (preferred && canEditStructure(preferred.templatePath)
          ? preferred.templatePath
          : trackGroups.find((g) => g.kind === "data-reference")
              ?.templatePath) ?? null;
      if (!targetTp) return;
      const group = getGroup(targetTp);
      if (!group || !canEditSegStructure(group)) return;

      const duration = clipboard.seg.end - clipboard.seg.start;
      const existing = segsMap[targetTp] ?? [];
      const kind: SegmentKind = existing[0]?.kind ?? clipboard.seg.kind;
      const start =
        kind === "index"
          ? Math.round(currentTimeSec)
          : Math.max(0, Math.min(totalDuration - 0.01, currentTimeSec));
      const end =
        kind === "index"
          ? start + Math.max(1, Math.round(duration))
          : Math.min(totalDuration, start + Math.max(MIN_SPLIT_GAP, duration));
      if (end <= start) return;
      const pasted: ParsedSegment = { kind, start, end };

      if (usesJoinedRangeString(group)) {
        setSegsMap((prev) => {
          const segs = [...(prev[targetTp] ?? [])];
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
        return;
      }

      if (!timeline || !preset) return;
      const anchorIdx =
        preferred && preferred.templatePath === targetTp
          ? preferred.segIdx
          : Math.max(0, group.concretePaths.length - 1);
      const path = group.concretePaths[anchorIdx];
      if (!path) return;
      const source =
        clipboard.item &&
        typeof clipboard.item === "object" &&
        !Array.isArray(clipboard.item)
          ? clipboard.item
          : undefined;
      const next = insertClonedArrayItemWithRange(
        presetInputData,
        path,
        serializeSegment(pasted),
        source,
      );
      if (!next) return;
      updatePresetInputData(timelineId, presetId, next);
      const latestTimeline = getEditedTimeline(timelineId) || timeline;
      generateOutput(latestTimeline);
      queueMicrotask(() => {
        selectSeg({ templatePath: targetTp, segIdx: anchorIdx + 1 });
      });
    },
    [
      clipboard,
      selectedSeg,
      canEditStructure,
      trackGroups,
      getGroup,
      segsMap,
      currentTimeSec,
      totalDuration,
      selectSeg,
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
            return !!s && playheadHits(preferred.templatePath, s);
          })()
        ) {
          return preferred;
        }
        for (const g of trackGroups) {
          if (!canEditStructure(g.templatePath)) continue;
          const segs = segsMap[g.templatePath] ?? [];
          const fi = segs.findIndex((s) => playheadHits(g.templatePath, s));
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
      if (!orig || !playheadHits(tp, orig)) return;

      const clock =
        orig.kind === "index" ? currentTimeSec : localClock(tp, currentTimeSec);
      const cutAt = orig.kind === "index" ? Math.round(clock) : clock;
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
      playheadHits,
      localClock,
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
        const clock =
          seg.kind === "index" ? currentTimeSec : localClock(tp, currentTimeSec);
        const at = seg.kind === "index" ? Math.round(clock) : clock;
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
    [selectedSeg, getGroup, currentTimeSec, totalDuration, localClock],
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
    const visibleGroups = clubbed
      ? trackGroups.filter((group) => {
          const segs =
            segsMap[group.templatePath] ?? segsFromTrackGroup(group);
          return segs.length > 0;
        })
      : trackGroups;

    const rows = visibleGroups.flatMap((group, ti) => {
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

      const mainRow = {
        id: `${sectionId}:${group.templatePath}`,
        label: (
          <div
            className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
            style={{ height: rowHeight }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-semibold truncate"
                title={group.label}
              >
                {trackTitle}
              </p>
              {compact ? null : (
                <p className="text-[9px] text-muted-foreground/50 truncate">
                  {isPlain
                    ? `${group.key} · ${segs.length} item${segs.length !== 1 ? "s" : ""}`
                    : `ref: ${group.key} · ${segs.length} seg${segs.length !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>
          </div>
        ),
        track: (
          <div
            className="relative border-b border-border/40 hover:bg-muted/5 transition-colors"
            style={{ height: rowHeight }}
            onPointerMove={(e) => handlePointerMove(e, group.templatePath)}
            onPointerUp={(e) => handlePointerUp(e, group.templatePath)}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) clearSelection();
            }}
            onDoubleClick={(e) => {
              if (e.target !== e.currentTarget) return;
              const arrayBacked =
                group.rangeLayout === "array" ||
                group.concretePaths.some(
                  (p) => parseDirectArrayIndexPath(p) !== null,
                );
              if (
                group.kind === "plain-range" &&
                !usesJoinedRangeString(group) &&
                !arrayBacked
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
              const relative = Boolean(anchorsFor(group.templatePath));
              const origin = relative
                ? localClock(group.templatePath, clickSec)
                : clickSec;
              if (!usesJoinedRangeString(group) && arrayBacked) {
                const path =
                  group.concretePaths[group.concretePaths.length - 1];
                if (!path) return;
                const existingKind: SegmentKind =
                  (segsMap[group.templatePath] ?? [])[0]?.kind ?? "time";
                const newSeg: ParsedSegment = {
                  kind: existingKind,
                  start: Math.max(0, origin),
                  end:
                    existingKind === "index"
                      ? Math.round(origin) + 10
                      : relative
                        ? origin + 5
                        : Math.min(totalDuration, origin + 5),
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
                  start: Math.max(0, origin),
                  end:
                    existingKind === "index"
                      ? Math.round(origin) + 10
                      : relative
                        ? origin + 5
                        : Math.min(totalDuration, origin + 5),
                };
                nextSegs.push(newSeg);
                nextSegs.sort((a, b) => a.start - b.start);
                commitRef.current(group.templatePath, nextSegs);
                return { ...prev, [group.templatePath]: nextSegs };
              });
            }}
          >
            {segs.flatMap((seg, si) => {
              const relativeAnchors = anchorsFor(group.templatePath);
              const views =
                relativeAnchors && seg.kind === "time"
                  ? relativeAnchors.map((anchor, anchorIndex) => ({
                      key: `${si}-${anchorIndex}`,
                      start: anchor.start + seg.start,
                      end: anchor.start + seg.end,
                    }))
                  : [{ key: String(si), start: seg.start, end: seg.end }];
              const isSelected =
                selectedSeg?.templatePath === group.templatePath &&
                selectedSeg.segIdx === si;
              const canSplit =
                structureEditable && playheadHits(group.templatePath, seg);
              const canDuplicate = structureEditable;
              const path = group.concretePaths[si];
              const onDelete =
                useJoinedDelete ||
                (path &&
                  (parseArrayItemFieldPath(path) ||
                    parseDirectArrayIndexPath(path)))
                  ? () => deleteSegment(group, si)
                  : null;
              const itemPath = imageItemPathFromRangePath(path);
              const transitions = itemPath
                ? readTransitionEffects(getAtPath(presetInputData, itemPath))
                : [];
              const edges = transitionEdgeFlags(transitions);
              const hasTransition = edges.hasIn || edges.hasOut;
              const laneTarget = {
                templatePath: group.templatePath,
                segIdx: si,
              };

              return views.map((view) => {
                const left = secToPx(view.start);
                const width = Math.max(MIN_SEG_PX, secToPx(view.end - view.start));
                const innerLabel =
                  seg.kind === "index"
                    ? `[${Math.round(seg.start)}–${Math.round(seg.end)}]`
                    : `${formatTimeLabel(view.start)}–${formatTimeLabel(view.end)}`;
                return (
                <SegBlock
                  key={view.key}
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
                    copySegment(group, si, seg);
                  }}
                  onCut={() => {
                    copySegment(group, si, seg);
                    deleteSegment(group, si);
                  }}
                  onPaste={() =>
                    pasteClipboard({
                      templatePath: group.templatePath,
                      segIdx: si,
                    })
                  }
                  canPaste={!!clipboard}
                  overlay={
                    hasTransition ? (
                      <TransitionEdgeIcons
                        hasIn={edges.hasIn}
                        hasOut={edges.hasOut}
                        onToggle={() => toggleTransitionLanes(laneTarget)}
                      />
                    ) : null
                  }
                  onDoubleClick={
                    hasTransition
                      ? () => toggleTransitionLanes(laneTarget)
                      : undefined
                  }
                />
                );
              });
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

      const extraRows: TimelineTrackRow[] = [];
      const openLane = expandedTransition;
      if (openLane && openLane.templatePath === group.templatePath) {
        const seg = segs[openLane.segIdx];
        const path = group.concretePaths[openLane.segIdx];
        const itemPath = imageItemPathFromRangePath(path);
        if (seg && itemPath) {
          const effects = readTransitionEffects(
            getAtPath(presetInputData, itemPath),
          );
          effects.forEach((effect, effectIndex) => {
            extraRows.push({
              id: `${sectionId}:${group.templatePath}:tr:${openLane.segIdx}:${effectIndex}`,
              label: <TransitionLaneLabel effect={effect} />,
              track: (
                <TransitionRangeTrack
                  effect={effect}
                  imageStart={seg.start}
                  imageEnd={seg.end}
                  secToPx={secToPx}
                  pixelsPerSecond={pixelsPerSecond}
                  onCommit={(edge, seconds) =>
                    commitTransitionDuration(
                      itemPath,
                      effectIndex,
                      edge,
                      seconds,
                    )
                  }
                />
              ),
            });
          });
        }
      }

      return [mainRow, ...extraRows];
    });

    return {
      id: sectionId,
      order,
      rows,
    };
  }, [
    trackGroups,
    segsMap,
    clubbed,
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
    playheadHits,
    anchorsFor,
    localClock,
    deleteSegment,
    duplicateSelected,
    splitAtPlayhead,
    selectSeg,
    toggleTransitionLanes,
    expandedTransition,
    commitTransitionDuration,
    clearSelection,
    copySegment,
    pasteClipboard,
    clipboard,
    presetInputData,
    timeline,
    preset,
    timelineId,
    presetId,
    updatePresetInputData,
    getEditedTimeline,
    generateOutput,
    compact,
    rowHeight,
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
  onPaste,
  canPaste,
  overlay,
  onDoubleClick,
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
  onPaste: () => void;
  canPaste: boolean;
  overlay?: React.ReactNode;
  onDoubleClick?: () => void;
}) {
  const { compact } = useTimelineDensity();
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
          onDoubleClick={(e) => {
            if (!onDoubleClick) return;
            e.stopPropagation();
            e.preventDefault();
            onDoubleClick();
          }}
        >
          <div
            className={cn(
              "absolute inset-0 border cursor-grab active:cursor-grabbing flex items-center transition-colors",
              blockCornerClass(compact),
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
          {overlay}
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
        <ContextMenuItem
          onClick={onPaste}
          disabled={!canPaste || !canDuplicate}
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
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
