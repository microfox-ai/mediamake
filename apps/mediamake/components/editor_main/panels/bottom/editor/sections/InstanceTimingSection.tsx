"use client";

import { useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { AddBlockContextMenuItems } from "@/components/editor_main/panels/left/editor/AddBlockMenu";
import { hasTrackShell } from "@/components/editor/presets/form/apply-track-mode";
import { BlockLockBadge, describeBlockLock } from "../block-lock-badge";
import { PresetTrackModeControl } from "../track-mode-control";
import { isCaptionPreset } from "@/components/editor_main/timing/caption-audio-lock";
import { cn } from "@/lib/utils";
import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { useEditorStore } from "@/components/editor_main/stores/editor-store";
import { useTimelineEditsStore } from "@/components/editor_main/stores/timeline-edits-store";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import {
  findNode,
  loadInstanceTree,
} from "@/components/editor_main/timing/load-instance-tree";
import { resolveTiming } from "@/components/editor_main/timing/resolve-timing";
import {
  collectIntrinsicDurations,
  collectMediaItemDurations,
} from "@/components/editor_main/timing/stamp-timing";
import type {
  AppliedNode,
  NodeTiming,
  ResolvedSpan,
} from "@/components/editor_main/timing/types";
import {
  nextStartOffset,
  placedOrigin,
  readStartOffset,
  presetUsesMediaAtoms,
  presetUsesSceneBlocks,
  sceneBlocksForPreset,
  trackDisplayName,
  visibleSpan,
} from "../media-scene-blocks";
import { useMediaAtomRows, type MediaAtomSource } from "../media-track-rows";
import {
  collectRawRanges,
  parseEditableSegments,
} from "../preset-range-utils";
import { ROW_HEIGHT, TRACK_COLORS, formatTimeLabel } from "../timeline-layout";
import {
  blockCornerClass,
  rowHeightFor,
  useTimelineDensity,
} from "../timeline-density";
import {
  useRegisterTimelineSection,
  type TimelineTrackRow,
} from "../TimelineShell";
import { useTimelineViewport } from "../timeline-viewport";
import { presetFilmstripSegments, TimelineFilmstrip } from "../timeline-filmstrip";
import {
  scopeInstanceRows,
  type TimelineScope,
} from "../timeline-scope";

const BLOCK_DRAG_TYPE = "application/x-mediamake-block";

interface InstanceTimingSectionProps {
  timeline: Timeline;
  order: number;
  /** Which sequence rows to draw, and whether media clips expand under them. */
  scope: TimelineScope;
}

type DragKind = "move" | "left" | "right";

function parentById(root: AppliedNode): Map<string, AppliedNode | null> {
  const map = new Map<string, AppliedNode | null>();
  const walk = (node: AppliedNode, parent: AppliedNode | null) => {
    map.set(node.id, parent);
    for (const child of node.children) walk(child, node);
  };
  walk(root, null);
  return map;
}

/** Sequence length is the sum of child spans. Zero means the children have no length yet. */
function summedChildDuration(
  node: AppliedNode,
  spans: Map<string, ResolvedSpan>,
): number | undefined {
  let sum = 0;
  let any = false;
  for (const child of node.children) {
    if (child.disabled || child.role === "modifier") continue;
    const span = spans.get(child.id);
    if (!span || !(span.duration > 0)) continue;
    sum += span.duration;
    any = true;
  }
  return any ? sum : undefined;
}

function itemListCount(raw: unknown): number | null {
  if (Array.isArray(raw)) return raw.length;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const items = (raw as { items?: unknown }).items;
    if (Array.isArray(items)) return items.length;
  }
  return null;
}

function clipCount(input: unknown): number {
  if (!input || typeof input !== "object" || Array.isArray(input)) return 0;
  const record = input as Record<string, unknown>;
  const media = itemListCount(record.mediaItems);
  if (media !== null) return media;
  const images = itemListCount(record.images);
  if (images !== null) return images;
  return 0;
}

function rangeCount(input: unknown): number {
  return collectRawRanges(input).reduce(
    (sum, raw) => sum + parseEditableSegments(raw.range).length,
    0,
  );
}

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Parent scene, then what this row contains. */
function rowMembership(node: AppliedNode, parent: AppliedNode | null): string | null {
  const parentName = parent ? trackDisplayName(parent.input, parent.name) : "";
  const placement = getPredefinedPresetById(node.presetId)?.metadata.placement;
  let detail = "";
  if (node.role === "scene") {
    const scenes = node.children.filter(
      (child) => child.role === "scene" && !child.disabled,
    ).length;
    detail = countLabel(scenes, "scene", "scenes");
  } else if (placement === "atom") {
    detail = countLabel(rangeCount(node.input), "range", "ranges");
  } else if (placement === "container") {
    detail = `${countLabel(clipCount(node.input), "clip", "clips")}, ${countLabel(rangeCount(node.input), "range", "ranges")}`;
  }
  if (parentName && detail) return `(${parentName} | ${detail})`;
  if (detail) return `(${detail})`;
  if (parentName) return `(${parentName})`;
  return null;
}

/**
 * One row per scene and track. Locked spans cannot be dragged.
 * A drag writes parent-relative start and duration onto the instance.
 */
export function InstanceTimingSection({ timeline, order, scope }: InstanceTimingSectionProps) {
  const { secToPx, pixelsPerSecond, totalWidth } = useTimelineViewport();
  const { compact } = useTimelineDensity();
  const selectPreset = useEditorStore((s) => s.selectPreset);
  const updateNodeTiming = useTimelineEditsStore((s) => s.updateNodeTiming);
  const updatePresetInputData = useTimelineEditsStore((s) => s.updatePresetInputData);
  const reparentInstanceNode = useTimelineEditsStore((s) => s.reparentInstanceNode);
  const addPresetToTimeline = useTimelineEditsStore((s) => s.addPresetToTimeline);
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const generateOutput = useCompileStore((s) => s.generateOutput);
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const fps = calculatedMetadata?.fps ?? 30;
  const compiledChildren = calculatedMetadata?.props?.childrenData;
  const intrinsicDurations = useMemo(
    () => collectIntrinsicDurations(compiledChildren),
    [compiledChildren],
  );

  const tree = useMemo(() => loadInstanceTree(timeline), [timeline]);
  const resolved = useMemo(
    () => resolveTiming(tree, { intrinsicDurations }),
    [tree, intrinsicDurations],
  );
  const rows = useMemo(() => scopeInstanceRows(tree, scope), [tree, scope]);
  const parents = useMemo(() => parentById(tree), [tree]);

  const [preview, setPreview] = useState<
    Record<string, { start: number; duration: number }>
  >({});
  const dragRef = useRef<{
    id: string;
    kind: DragKind;
    originX: number;
    start: number;
    duration: number;
    parentAbsolute: number;
    next: { start: number; duration: number } | null;
    media?: {
      authoredStart: number;
      fullDuration: number;
      startOffset: number;
      input: unknown;
    };
  } | null>(null);

  const minDuration = 1 / Math.max(fps, 1);

  const selectRow = (id: string) => {
    const preset = timeline.presets?.find((item) => item.id === id);
    if (preset) selectPreset(preset, timeline);
  };

  const atomSources = useMemo(() => {
    const sources: MediaAtomSource[] = [];
    if (scope.kind !== "preset" || !scope.expandClips) return sources;
    for (const { node } of rows) {
      if (!presetUsesMediaAtoms(node.presetId)) continue;
      const probed = collectMediaItemDurations(compiledChildren, node.id);
      const media = sceneBlocksForPreset(node.presetId, node.input, probed);
      if (media.mode !== "sequence" && media.mode !== "aligned") continue;
      const span = resolved.nodes.get(node.id);
      const parent = parents.get(node.id) ?? null;
      const parentAbsolute =
        span?.parentAbsoluteStart ??
        (parent ? resolved.nodes.get(parent.id)?.absoluteStart : 0) ??
        0;
      const authored =
        span?.absoluteStart ??
        parentAbsolute + ("start" in node.timing ? node.timing.start : 0);
      const full = span && span.duration > 0 ? span.duration : media.duration;
      if (!(full > 0)) continue;
      const offset = readStartOffset(node.input);
      const base = visibleSpan(authored, full, offset);
      const shown = preview[node.id] ?? base;
      sources.push({
        key: node.id,
        timelineId: timeline.id,
        presetId: node.id,
        input: node.input,
        origin: placedOrigin(authored, full, offset, shown),
        windowStart: shown.start,
        windowEnd: shown.start + shown.duration,
        sequence: media.sequence,
        probedItemDurations: probed,
      });
    }
    return sources;
  }, [scope, rows, compiledChildren, resolved, parents, preview, timeline.id]);
  const atomRows = useMediaAtomRows(atomSources);

  const commit = (id: string, timing: NodeTiming) => {
    updateNodeTiming(timeline.id, id, timing);
    const latest = getEditedTimeline(timeline.id) || timeline;
    generateOutput(latest);
  };

  const onPointerDown = (
    event: React.PointerEvent,
    id: string,
    kind: DragKind,
    start: number,
    duration: number,
    parentAbsolute: number,
    media?: {
      authoredStart: number;
      fullDuration: number;
      startOffset: number;
      input: unknown;
    },
  ) => {
    if (event.detail === 2) {
      event.preventDefault();
      event.stopPropagation();
      selectRow(id);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      kind,
      originX: event.clientX,
      start,
      duration,
      parentAbsolute,
      next: null,
      media,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientX - drag.originX) / pixelsPerSecond;
    let start = drag.start;
    let duration = drag.duration;
    if (drag.kind === "move") {
      start = Math.max(0, drag.start + delta);
    } else if (drag.kind === "left") {
      const next = Math.max(0, Math.min(drag.start + drag.duration - minDuration, drag.start + delta));
      duration = drag.start + drag.duration - next;
      start = next;
    } else {
      duration = Math.max(minDuration, drag.duration + delta);
    }
    drag.next = { start, duration };
    setPreview((prev) => ({ ...prev, [drag.id]: { start, duration } }));
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const next = drag.next;
    setPreview((prev) => {
      const copy = { ...prev };
      delete copy[drag.id];
      return copy;
    });
    if (!next) return;
    if (drag.media) {
      const leftDelta = next.start - drag.start;
      if (drag.kind === "left") {
        const startOffset = nextStartOffset(
          drag.media.startOffset,
          drag.media.fullDuration,
          leftDelta,
          minDuration,
        );
        const record =
          drag.media.input && typeof drag.media.input === "object" && !Array.isArray(drag.media.input)
            ? { ...(drag.media.input as Record<string, unknown>) }
            : {};
        if (startOffset < 0) record.startOffset = startOffset;
        else delete record.startOffset;
        updatePresetInputData(timeline.id, drag.id, record);
        generateOutput(getEditedTimeline(timeline.id) || timeline);
        return;
      }
      const node = findNode(tree, drag.id);
      const parent = parents.get(drag.id);
      const relative = Math.max(0, drag.media.authoredStart + (drag.kind === "move" ? leftDelta : 0) - drag.parentAbsolute);
      if (drag.kind === "move" && node?.timing.kind === "hug") {
        commit(drag.id, { kind: "hug", start: parent?.arrangement === "sequence" ? 0 : relative });
        return;
      }
      const duration =
        drag.kind === "right"
          ? Math.max(minDuration - drag.media.startOffset, drag.media.fullDuration + (next.duration - drag.duration))
          : drag.media.fullDuration;
      commit(drag.id, {
        kind: "explicit",
        start: parent?.arrangement === "sequence" ? 0 : relative,
        duration,
      });
      return;
    }
    const node = findNode(tree, drag.id);
    if (!node) return;
    const parent = parents.get(drag.id);
    const relativeStart = Math.max(0, next.start - drag.parentAbsolute);
    if (node.timing.kind === "autoRange") return;
    if (node.timing.kind === "hug") {
      commit(drag.id, { kind: "hug", start: relativeStart });
      return;
    }
    if (parent?.arrangement === "sequence") {
      commit(drag.id, {
        kind: "explicit",
        start: 0,
        duration: next.duration,
      });
      return;
    }
    commit(drag.id, {
      kind: "explicit",
      start: relativeStart,
      duration: next.duration,
    });
  };

  const trackRows: TimelineTrackRow[] = rows.flatMap(({ node, depth }, index) => {
    const span = resolved.nodes.get(node.id);
    const parent = parents.get(node.id) ?? null;
    const parentAbsolute =
      span?.parentAbsoluteStart ??
      (parent ? resolved.nodes.get(parent.id)?.absoluteStart : 0) ??
      0;
    const locked =
      node.timing.kind === "lock" || node.timing.kind === "durationLock";
    const hug = node.timing.kind === "hug";
    const autoRange = node.timing.kind === "autoRange";
    const sequenced = parent?.arrangement === "sequence";
    const probedItems = presetUsesMediaAtoms(node.presetId)
      ? collectMediaItemDurations(compiledChildren, node.id)
      : undefined;
    const mediaScenes = presetUsesSceneBlocks(node.presetId)
      ? sceneBlocksForPreset(node.presetId, node.input, probedItems)
      : null;
    const windowMedia = Boolean(
      mediaScenes && (mediaScenes.sequence || mediaScenes.mode === "aligned"),
    );
    const sceneWindow =
      node.presetId === "scene" && !locked && !autoRange && (span?.duration ?? 0) > 0;
    const useWindow = windowMedia || sceneWindow;
    const mediaOffset = useWindow ? readStartOffset(node.input) : 0;
    const authoredAbsolute =
      span?.absoluteStart ??
      parentAbsolute + ("start" in node.timing ? node.timing.start : 0);
    const fullDuration =
      span && span.duration > 0 ? span.duration : (mediaScenes?.duration ?? 0);
    const visible =
      useWindow && fullDuration > 0
        ? visibleSpan(authoredAbsolute, fullDuration, mediaOffset)
        : null;
    const childDuration =
      mediaScenes?.sequence && mediaScenes.duration > 0
        ? mediaScenes.duration
        : node.role === "scene" && node.arrangement === "sequence"
          ? summedChildDuration(node, resolved.nodes)
          : undefined;
    const shown =
      preview[node.id] ??
      visible ??
      (span
        ? { start: span.absoluteStart, duration: span.duration }
        : childDuration
          ? {
              start: authoredAbsolute,
              duration: childDuration,
            }
          : null);
    const color = TRACK_COLORS[index % TRACK_COLORS.length];
    const note = resolved.diagnostics.find((item) => item.nodeId === node.id);
    const canMove = !locked && !sequenced && !autoRange;
    const canTrimStart = !locked && !sequenced && !autoRange && (!hug || useWindow);
    const canTrimEnd = !locked && !autoRange && (!hug || windowMedia);
    const mediaDrag =
      useWindow && fullDuration > 0
        ? {
            authoredStart: authoredAbsolute,
            fullDuration,
            startOffset: mediaOffset,
            input: node.input,
          }
        : undefined;
    const rowName = trackDisplayName(node.input, node.name);
    const lockTargetName =
      node.timing.kind === "lock" || node.timing.kind === "durationLock"
        ? trackDisplayName(
            findNode(tree, node.timing.refId)?.input,
            findNode(tree, node.timing.refId)?.name || node.timing.refId,
          )
        : "";
    const lockReason =
      locked || sequenced
        ? describeBlockLock({
            sequenced,
            lockedTo: node.timing.kind === "lock" ? lockTargetName : undefined,
            durationLockedTo: node.timing.kind === "durationLock" ? lockTargetName : undefined,
          })
        : "";
    const isBaseSceneRow =
      scope.kind === "scene-children" &&
      scope.includeTimelineSources &&
      node.id === scope.sceneId;
    const membership = compact || isBaseSceneRow ? null : rowMembership(node, parent);
    const rowHeight = compact || isBaseSceneRow ? rowHeightFor(true) : ROW_HEIGHT;
    const narrow = rowHeight < ROW_HEIGHT;
    const spanLabel = shown
      ? `${formatTimeLabel(shown.start)}–${formatTimeLabel(shown.start + shown.duration)}${
          mediaOffset < 0 ? ` · head ${formatTimeLabel(-mediaOffset)}` : ""
        }`
      : null;
    const filmstripSegments = shown
      ? presetFilmstripSegments({
          input: node.input,
          references: timeline.defaultData?.references,
          durationSec: shown.duration,
          contentAtLeft: useWindow ? shown.start - authoredAbsolute : 0,
        })
      : [];

    const placeChild = (childId: string) => {
      if (!childId || childId === node.id || node.role !== "scene") return;
      const moving = findNode(tree, childId);
      if (moving && findNode(moving, node.id)) return;
      reparentInstanceNode(timeline.id, childId, node.id);
      const latest = getEditedTimeline(timeline.id) || timeline;
      generateOutput(latest);
    };
    const labelBody = (
        <div
          className="relative flex min-w-0 flex-col justify-center gap-0.5 border-b border-border/40 bg-background pr-2"
          style={{ height: rowHeight, paddingLeft: 8 + depth * 10 }}
          draggable={node.id !== tree.id}
          onPointerDown={(event) => {
            if (event.detail !== 2) return;
            event.preventDefault();
            event.stopPropagation();
            selectRow(node.id);
          }}
          onDragStart={(event) => {
            if ((event.target as HTMLElement).closest("button")) {
              event.preventDefault();
              return;
            }
            event.dataTransfer.setData(BLOCK_DRAG_TYPE, node.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={
            node.role === "scene"
              ? (event) => {
                  if (!event.dataTransfer.types.includes(BLOCK_DRAG_TYPE)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  event.currentTarget.classList.add("bg-primary/10");
                }
              : undefined
          }
          onDragLeave={(event) => {
            event.currentTarget.classList.remove("bg-primary/10");
          }}
          onDrop={
            node.role === "scene"
              ? (event) => {
                  event.preventDefault();
                  event.currentTarget.classList.remove("bg-primary/10");
                  placeChild(event.dataTransfer.getData(BLOCK_DRAG_TYPE));
                }
              : undefined
          }
        >
          <div className={cn("flex min-w-0 items-center gap-1", hasTrackShell(node.input) || isBaseSceneRow ? (isBaseSceneRow ? "pr-[4.25rem]" : "pr-12") : undefined)}>
            {locked ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex shrink-0" onPointerDown={(event) => event.stopPropagation()}>
                    <Lock className="size-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{lockReason}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
            <span className="truncate text-xs cursor-grab" title={note?.message}>
              {rowName}
            </span>
          </div>
          {membership ? (
            <span
              className="truncate text-[10px] leading-none text-muted-foreground"
              title={membership}
            >
              {membership}
            </span>
          ) : null}
          {hasTrackShell(node.input) || isBaseSceneRow || isCaptionPreset(node.presetId) ? (
            <div className="absolute right-0.5 top-0.5 z-10">
              <PresetTrackModeControl
                timeline={timeline}
                presetId={node.id}
                input={node.input}
                includeAuto={isBaseSceneRow}
              />
            </div>
          ) : null}
        </div>
    );
    const sceneRow: TimelineTrackRow = {
      id: `instance:${node.id}`,
      label:
        node.role === "scene" ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>{labelBody}</ContextMenuTrigger>
            <ContextMenuContent className="w-56">
              <AddBlockContextMenuItems
                onAdd={(preset) => {
                  addPresetToTimeline(timeline.id, preset, node.id);
                  const latest = getEditedTimeline(timeline.id) || timeline;
                  generateOutput(latest);
                }}
              />
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          labelBody
        ),
      track: (
        <div
          className="relative border-b border-border/40"
          style={{ width: totalWidth, height: rowHeight }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {shown ? (
            <div
              className={cn(
                "absolute top-1.5 bottom-1.5 flex items-center overflow-hidden border px-1 text-[10px]",
                blockCornerClass(narrow, "rounded-md"),
                color,
                locked ? "cursor-default opacity-80" : "cursor-grab",
              )}
              style={{
                left: secToPx(shown.start),
                width: Math.max(4, secToPx(shown.duration)),
              }}
              title={
                locked
                  ? `Locked${node.timing.kind === "lock" || node.timing.kind === "durationLock" ? ` to ${node.timing.refId}` : ""}`
                  : note?.message
              }
              onPointerDown={(event) => {
                if (event.detail === 2 || canMove) {
                  onPointerDown(
                    event,
                    node.id,
                    "move",
                    shown.start,
                    shown.duration,
                    parentAbsolute,
                    mediaDrag,
                  );
                }
              }}
            >
              <TimelineFilmstrip
                segments={filmstripSegments}
                pixelsPerSecond={pixelsPerSecond}
              />
              {canTrimStart ? (
                <span
                  className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize"
                  onPointerDown={(event) =>
                    onPointerDown(
                      event,
                      node.id,
                      "left",
                      shown.start,
                      shown.duration,
                      parentAbsolute,
                      mediaDrag,
                    )
                  }
                />
              ) : null}
              {locked || sequenced ? <BlockLockBadge reason={lockReason} /> : null}
              <span
                className={cn(
                  "relative z-[1] truncate px-2",
                  filmstripSegments.length > 0 && "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
                  (locked || sequenced) && "pl-4",
                )}
              >
                {spanLabel ?? rowName}
              </span>
              {canTrimEnd ? (
                <span
                  className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
                  onPointerDown={(event) =>
                    onPointerDown(
                      event,
                      node.id,
                      "right",
                      shown.start,
                      shown.duration,
                      parentAbsolute,
                      mediaDrag,
                    )
                  }
                />
              ) : null}
            </div>
          ) : (
            <div
              className="flex h-full items-center px-2 text-[10px] text-muted-foreground"
              onPointerDown={(event) => {
                if (event.detail !== 2) return;
                event.preventDefault();
                event.stopPropagation();
                selectRow(node.id);
              }}
            >
              {note?.message ?? "No duration"}
            </div>
          )}
        </div>
      ),
    };
    const packSequence =
      scope.kind === "scene-children" &&
      node.id === scope.sceneId &&
      node.arrangement === "sequence";
    if (!packSequence) return [sceneRow];
    const sequenceChildren = node.children.filter(
      (child) => child.role !== "modifier" && !child.disabled,
    );
    const sequenceHeight = rowHeightFor(compact);
    const sequenceRow: TimelineTrackRow = {
      id: `instance:${node.id}:sequence`,
      label: (
        <div
          className="flex items-center border-b border-border/40 bg-background pr-2"
          style={{ height: sequenceHeight, paddingLeft: 18 }}
        >
          <span className="truncate text-[10px] text-muted-foreground">
            {sequenceChildren.length === 1
              ? "1 block"
              : `${sequenceChildren.length} blocks`}
          </span>
        </div>
      ),
      track: (
        <div
          className="relative border-b border-border/40 bg-muted/5"
          style={{ width: totalWidth, height: sequenceHeight }}
        >
          {sequenceChildren.map((child, childIndex) => {
            const childSpan = resolved.nodes.get(child.id);
            if (!childSpan || !(childSpan.duration > 0)) return null;
            const title = trackDisplayName(child.input, child.name);
            const childTarget =
              child.timing.kind === "lock" || child.timing.kind === "durationLock"
                ? trackDisplayName(
                    findNode(tree, child.timing.refId)?.input,
                    findNode(tree, child.timing.refId)?.name || child.timing.refId,
                  )
                : "";
            const reason = describeBlockLock({
              sequenced: true,
              lockedTo: child.timing.kind === "lock" ? childTarget : undefined,
              durationLockedTo:
                child.timing.kind === "durationLock" ? childTarget : undefined,
            });
            const childColor = TRACK_COLORS[childIndex % TRACK_COLORS.length];
            const spanText = `${formatTimeLabel(childSpan.absoluteStart)}–${formatTimeLabel(childSpan.absoluteStart + childSpan.duration)}`;
            const childSegments = presetFilmstripSegments({
              input: child.input,
              references: timeline.defaultData?.references,
              durationSec: childSpan.duration,
            });
            return (
              <div
                key={child.id}
                className={cn(
                  "absolute top-1.5 bottom-1.5 flex items-center overflow-hidden border px-1 text-[10px]",
                  blockCornerClass(compact, "rounded-md"),
                  childColor,
                  "cursor-pointer",
                )}
                style={{
                  left: secToPx(childSpan.absoluteStart),
                  width: Math.max(4, secToPx(childSpan.duration)),
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  selectRow(child.id);
                }}
              >
                <TimelineFilmstrip segments={childSegments} pixelsPerSecond={pixelsPerSecond} />
                <BlockLockBadge reason={reason} />
                <span
                  className={cn(
                    "relative z-[1] truncate px-2 pl-4",
                    childSegments.length > 0 && "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
                  )}
                  title={`${title} · ${spanText}`}
                >
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      ),
    };
    return [sceneRow, sequenceRow];
  });

  useRegisterTimelineSection({
    id: `instance-timing:${timeline.id}`,
    order,
    rows: trackRows.flatMap((row) => {
      const id = row.id.slice("instance:".length);
      return [row, ...(atomRows[id] ?? [])];
    }),
  });

  return null;
}
