"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { hasTrackShell } from "@/components/editor/presets/form/apply-track-mode";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { useTimelineEditsStore } from "@/components/editor_main/stores/timeline-edits-store";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import type { NodeTiming } from "@/components/editor_main/timing/types";
import {
  clipToWindow,
  nextStartOffset,
  patchMediaAtom,
  placedOrigin,
  readStartOffset,
  presetUsesMediaAtoms,
  sceneBlocksForPreset,
  sceneBlocksFromMediaInput,
  visibleSpan,
  type MediaSceneBlock,
} from "./media-scene-blocks";
import {
  MIN_SEG_PX,
  TRACK_COLORS,
  formatTimeLabel,
} from "./timeline-layout";
import { blockCornerClass, rowHeightFor, useTimelineDensity } from "./timeline-density";
import {
  useRegisterTimelineSection,
  type TimelineTrackRow,
} from "./TimelineShell";
import { useTimelineViewport } from "./timeline-viewport";
import {
  presetFilmstripSegments,
  TimelineFilmstrip,
} from "./timeline-filmstrip";
import type { MediaReferenceLike } from "@/lib/editor/visual-media";
import { BlockLockBadge, describeBlockLock } from "./block-lock-badge";
import { PresetTrackModeControl } from "./track-mode-control";
import { focusTimelineBlock, useTimelineBlockFocus } from "@/components/editor_main/stores/timeline-block-focus";

type DragKind = "move" | "left" | "right";

export interface MediaAtomSource {
  key: string;
  timelineId: string;
  presetId: string;
  input: unknown;
  /** Absolute time where this track's untrimmed content begins. */
  origin: number;
  windowStart: number;
  windowEnd: number;
  sequence: boolean;
  probedItemDurations?: Record<number, number>;
}

function dragWindow(
  kind: DragKind,
  start: number,
  duration: number,
  delta: number,
  minDuration: number,
): { start: number; duration: number } {
  if (kind === "move") return { start: Math.max(0, start + delta), duration };
  if (kind === "left") {
    const next = Math.max(0, Math.min(start + duration - minDuration, start + delta));
    return { start: next, duration: start + duration - next };
  }
  return { start, duration: Math.max(minDuration, duration + delta) };
}

function rowLabel(
  title: string,
  detail: string,
  indent: boolean,
  compact: boolean,
  actions?: ReactNode,
) {
  return (
    <div
      className="relative flex items-center border-b border-border/40 bg-background pr-2"
      style={{ height: rowHeightFor(compact), paddingLeft: indent ? 18 : 8 }}
    >
      <div className={cn("min-w-0 flex-1", actions && "pr-12")}>
        <p className="truncate text-[10px] font-semibold" title={title}>
          {title}
        </p>
        {compact ? null : (
          <p className="truncate text-[9px] text-muted-foreground/50">{detail}</p>
        )}
      </div>
      {actions ? <div className="absolute right-0.5 top-0.5 z-10">{actions}</div> : null}
    </div>
  );
}

function ClipBox({
  start,
  duration,
  label,
  color,
  editable,
  allowMove = editable,
  allowTrimStart = editable,
  locked = false,
  lockReason,
  selected = false,
  secToPx,
  filmstrip,
  onSelect,
  onDragStart,
}: {
  start: number;
  duration: number;
  label: string;
  color: string;
  editable: boolean;
  allowMove?: boolean;
  allowTrimStart?: boolean;
  locked?: boolean;
  lockReason?: string;
  selected?: boolean;
  secToPx: (sec: number) => number;
  filmstrip?: {
    input: unknown;
    references?: MediaReferenceLike[] | null;
    itemIndex?: number;
    contentAtLeft?: number;
    sourceLead?: number;
  };
  onSelect?: () => void;
  onDragStart?: (event: React.PointerEvent, kind: DragKind) => void;
}) {
  const { compact } = useTimelineDensity();
  const { pixelsPerSecond } = useTimelineViewport();
  const left = secToPx(start);
  const width = Math.max(MIN_SEG_PX, secToPx(duration));
  const span = `${formatTimeLabel(start)}–${formatTimeLabel(start + duration)}`;
  const segments = filmstrip
    ? presetFilmstripSegments({
        input: filmstrip.input,
        references: filmstrip.references,
        durationSec: duration,
        contentAtLeft: filmstrip.contentAtLeft,
        itemIndex: filmstrip.itemIndex,
        sourceLead: filmstrip.sourceLead,
      })
    : [];
  return (
    <div
      className={cn(
        "absolute top-1.5 bottom-1.5 flex items-center overflow-hidden border text-[10px]",
        blockCornerClass(compact),
        color,
        allowMove ? "cursor-grab" : "cursor-default",
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-background z-[1]",
      )}
      style={{ left, width }}
      title={`${label} · ${span}`}
      onPointerDown={
        onSelect || (allowMove && onDragStart)
          ? (event) => {
              onSelect?.();
              if (allowMove && onDragStart) onDragStart(event, "move");
            }
          : undefined
      }
    >
      <TimelineFilmstrip segments={segments} pixelsPerSecond={pixelsPerSecond} />
      {allowTrimStart ? (
        <span
          className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize"
          onPointerDown={(event) => {
            event.stopPropagation();
            onDragStart?.(event, "left");
          }}
        />
      ) : null}
      {locked ? (
        <BlockLockBadge reason={lockReason || describeBlockLock({ sequenced: true })} />
      ) : null}
      {width > 36 ? (
        <span
          className={cn(
            "relative z-[1] truncate px-2 select-none",
            segments.length > 0 && "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
            locked && "pl-4",
          )}
        >
          {width > 96 ? `${label} ${span}` : span}
        </span>
      ) : null}
      {editable ? (
        <span
          className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize"
          onPointerDown={(event) => {
            event.stopPropagation();
            onDragStart?.(event, "right");
          }}
        />
      ) : null}
    </div>
  );
}

function sharesItem(blocks: MediaSceneBlock[], block: MediaSceneBlock): boolean {
  return blocks.some(
    (other) => other !== block && other.itemIndex === block.itemIndex,
  );
}

/**
 * Sequence atoms share one read-only row. Aligned atoms each get an editable row.
 */
export function useMediaAtomRows(
  sources: MediaAtomSource[],
): Record<string, TimelineTrackRow[]> {
  const { secToPx, pixelsPerSecond, totalWidth } = useTimelineViewport();
  const focus = useTimelineBlockFocus((s) => s.focus);
  const { compact } = useTimelineDensity();
  const rowHeight = rowHeightFor(compact);
  const updatePresetInputData = useTimelineEditsStore((s) => s.updatePresetInputData);
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const generateOutput = useCompileStore((s) => s.generateOutput);
  const fps = useCompileStore((s) => s.calculatedMetadata?.fps ?? 30);
  const minDuration = 1 / Math.max(fps, 1);
  const [preview, setPreview] = useState<
    Record<string, { start: number; duration: number }>
  >({});
  const dragRef = useRef<{
    sourceKey: string;
    blockId: string;
    itemIndex: number;
    kind: DragKind;
    originX: number;
    start: number;
    duration: number;
    next: { start: number; duration: number } | null;
  } | null>(null);

  const onPointerDown = (
    event: React.PointerEvent,
    sourceKey: string,
    block: MediaSceneBlock,
    kind: DragKind,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      sourceKey,
      blockId: block.id,
      itemIndex: block.itemIndex,
      kind,
      originX: event.clientX,
      start: block.start,
      duration: block.duration,
      next: null,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientX - drag.originX) / pixelsPerSecond;
    const next = dragWindow(drag.kind, drag.start, drag.duration, delta, minDuration);
    drag.next = next;
    setPreview((prev) => ({ ...prev, [`${drag.sourceKey}:${drag.blockId}`]: next }));
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const next = drag.next;
    setPreview((prev) => {
      const copy = { ...prev };
      delete copy[`${drag.sourceKey}:${drag.blockId}`];
      return copy;
    });
    if (!next) return;
    const source = sources.find((item) => item.key === drag.sourceKey);
    if (!source) return;
    const latest = getEditedTimeline(source.timelineId);
    const preset = latest?.presets?.find((item) => item.id === source.presetId);
    const input = preset?.presetInputData ?? source.input;
    const patched = patchMediaAtom(input, drag.itemIndex, {
      start: next.start,
      duration: next.duration,
      cropDelta: drag.kind === "left" ? next.start - drag.start : undefined,
    });
    updatePresetInputData(source.timelineId, source.presetId, patched);
    const refreshed = getEditedTimeline(source.timelineId);
    if (refreshed) generateOutput(refreshed);
  };

  const rows: Record<string, TimelineTrackRow[]> = {};
  for (const source of sources) {
    const layout = sceneBlocksFromMediaInput(source.input, source.probedItemDurations);
    const blocks = layout.blocks;
    if (source.sequence) {
      rows[source.key] = [
        {
          id: `${source.key}:sequence-atoms`,
          label: rowLabel("Clips", "In sequence", true, compact),
          track: (
            <div
              className="relative border-b border-border/40 bg-muted/5"
              style={{ width: totalWidth, height: rowHeight }}
            >
              {blocks.map((block) => {
                const fullStart = source.origin + block.start;
                const clipped = clipToWindow(
                  fullStart,
                  block.duration,
                  source.windowStart,
                  source.windowEnd,
                );
                if (!clipped) return null;
                const timeline = getEditedTimeline(source.timelineId);
                return (
                  <ClipBox
                    key={block.id}
                    start={clipped.start}
                    duration={clipped.duration}
                    label={block.label}
                    color={TRACK_COLORS[2] ?? ""}
                    editable={false}
                    locked
                    secToPx={secToPx}
                    filmstrip={{
                      input: source.input,
                      references: timeline?.defaultData?.references,
                      itemIndex: block.itemIndex,
                      sourceLead: clipped.start - fullStart,
                    }}
                  />
                );
              })}
            </div>
          ),
        },
      ];
      continue;
    }

    rows[source.key] = blocks.map((block, index) => {
      const editable = !sharesItem(blocks, block);
      const shown = preview[`${source.key}:${block.id}`] ?? {
        start: block.start,
        duration: block.duration,
      };
      const color = TRACK_COLORS[(index + 1) % TRACK_COLORS.length] ?? "";
      return {
        id: `${source.key}:atom:${block.id}`,
        label: rowLabel(block.label, editable ? "Aligned" : "Range", true, compact),
        track: (
          <div
            className="relative border-b border-border/40 bg-muted/5"
            style={{ width: totalWidth, height: rowHeight }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerDown={(event) => {
              if (event.target !== event.currentTarget) return;
              const current = useTimelineBlockFocus.getState().focus;
              if (
                current?.kind === "clip" &&
                current.timelineId === source.timelineId &&
                current.presetId === source.presetId
              ) {
                useTimelineBlockFocus.getState().setFocus(null);
              }
            }}
          >
            <ClipBox
              start={source.origin + shown.start}
              duration={shown.duration}
              label={block.label}
              color={color}
              editable={editable}
              filmstrip={{
                input: source.input,
                references: getEditedTimeline(source.timelineId)?.defaultData?.references,
                itemIndex: block.itemIndex,
              }}
              selected={
                focus?.kind === "clip" &&
                focus.timelineId === source.timelineId &&
                focus.blockKey === `${source.presetId}:${block.id}`
              }
              secToPx={secToPx}
              onSelect={() =>
                focusTimelineBlock(`clip:${source.timelineId}:${source.presetId}:${block.id}`, {
                  kind: "clip",
                  timelineId: source.timelineId,
                  presetId: source.presetId,
                  label: block.label,
                  blockKey: `${source.presetId}:${block.id}`,
                })
              }
              onDragStart={
                editable
                  ? (event, kind) => onPointerDown(event, source.key, block, kind)
                  : undefined
              }
            />
          </div>
        ),
      };
    });
  }
  return rows;
}

interface MediaTrackBlockSectionProps {
  sectionId: string;
  order: number;
  timelineId: string;
  presetId: string;
  label: string;
  input: unknown;
  authoredStart: number;
  fullDuration: number;
  parentAbsolute: number;
  timingKind?: NodeTiming["kind"];
  /** This track is packed inside a sequence scene, so its start stays put. */
  packedInSequence?: boolean;
  /** Timeline that owns this preset. Used for the mode tabs and lock targets. */
  timeline?: Timeline;
  probedItemDurations?: Record<number, number>;
  /** Registry preset id. Window tracks skip the per-item atom rows. */
  registryPresetId?: string;
}

/**
 * Editable window for one media track, plus its atom rows.
 * Moving changes start. The right edge changes duration.
 * The left edge stores a negative startOffset and leaves the end where it is.
 */
export function MediaTrackBlockSection({
  sectionId,
  order,
  timelineId,
  presetId,
  label,
  input,
  authoredStart,
  fullDuration,
  parentAbsolute,
  timingKind,
  packedInSequence,
  timeline,
  probedItemDurations,
  registryPresetId,
}: MediaTrackBlockSectionProps) {
  const { secToPx, pixelsPerSecond, totalWidth } = useTimelineViewport();
  const { compact } = useTimelineDensity();
  const rowHeight = rowHeightFor(compact);
  const updateNodeTiming = useTimelineEditsStore((s) => s.updateNodeTiming);
  const updatePresetInputData = useTimelineEditsStore((s) => s.updatePresetInputData);
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const generateOutput = useCompileStore((s) => s.generateOutput);
  const fps = useCompileStore((s) => s.calculatedMetadata?.fps ?? 30);
  const minDuration = 1 / Math.max(fps, 1);
  const offset = readStartOffset(input);
  const base = visibleSpan(authoredStart, Math.max(fullDuration, minDuration), offset);
  const [preview, setPreview] = useState<{ start: number; duration: number } | null>(null);
  const shown = preview ?? base;
  const dragRef = useRef<{
    kind: DragKind;
    originX: number;
    start: number;
    duration: number;
    next: { start: number; duration: number } | null;
  } | null>(null);

  const publish = () => {
    const latest = getEditedTimeline(timelineId);
    if (latest) generateOutput(latest);
  };

  const onPointerDown = (event: React.PointerEvent, kind: DragKind) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      kind,
      originX: event.clientX,
      start: shown.start,
      duration: shown.duration,
      next: null,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientX - drag.originX) / pixelsPerSecond;
    const next = dragWindow(drag.kind, drag.start, drag.duration, delta, minDuration);
    drag.next = next;
    setPreview(next);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    const next = drag?.next ?? null;
    setPreview(null);
    if (!drag || !next) return;
    const leftDelta = next.start - drag.start;
    if (drag.kind === "left") {
      const startOffset = nextStartOffset(offset, fullDuration, leftDelta, minDuration);
      const record =
        input && typeof input === "object" && !Array.isArray(input)
          ? { ...(input as Record<string, unknown>) }
          : {};
      if (startOffset < 0) record.startOffset = startOffset;
      else delete record.startOffset;
      updatePresetInputData(timelineId, presetId, record);
      publish();
      return;
    }
    const relative = Math.max(0, authoredStart + leftDelta - parentAbsolute);
    if (drag.kind === "move") {
      const timing: NodeTiming =
        timingKind === "hug"
          ? { kind: "hug", start: packedInSequence ? 0 : relative }
          : {
              kind: "explicit",
              start: packedInSequence ? 0 : relative,
              duration: fullDuration,
            };
      updateNodeTiming(timelineId, presetId, timing);
      publish();
      return;
    }
    const durationDelta = next.duration - drag.duration;
    const duration = Math.max(minDuration - offset, fullDuration + durationDelta);
    updateNodeTiming(timelineId, presetId, {
      kind: "explicit",
      start: packedInSequence ? 0 : Math.max(0, authoredStart - parentAbsolute),
      duration,
    });
    publish();
  };

  const layout = sceneBlocksForPreset(registryPresetId, input, probedItemDurations);
  const origin = placedOrigin(authoredStart, fullDuration, offset, shown);
  const showAtoms = registryPresetId ? presetUsesMediaAtoms(registryPresetId) : true;
  const atomRows = useMediaAtomRows(
    showAtoms
      ? [
          {
            key: presetId,
            timelineId,
            presetId,
            input,
            origin,
            windowStart: shown.start,
            windowEnd: shown.start + shown.duration,
            sequence: layout.sequence,
            probedItemDurations,
          },
        ]
      : [],
  );
  const canMove = !packedInSequence;
  const rowLocked =
    Boolean(packedInSequence) || timingKind === "lock" || timingKind === "durationLock";
  const lockName =
    input && typeof input === "object" && !Array.isArray(input)
      ? String((input as { lock?: unknown }).lock ?? "").trim()
      : "";
  const rowLockReason = describeBlockLock({
    sequenced: Boolean(packedInSequence),
    lockedTo: timingKind === "lock" ? lockName : undefined,
    durationLockedTo: timingKind === "durationLock" ? lockName : undefined,
  });
  const span = `${formatTimeLabel(shown.start)}–${formatTimeLabel(shown.start + shown.duration)}`;
  const trim = offset < 0 ? ` · head ${formatTimeLabel(-offset)}` : "";
  const detail = `${layout.sequence ? "Sequence" : "Aligned"} · ${span}${trim}`;
  const modeControl =
    timeline && hasTrackShell(input) ? (
      <PresetTrackModeControl timeline={timeline} presetId={presetId} input={input} />
    ) : null;

  useRegisterTimelineSection({
    id: sectionId,
    order,
    rows: [
      {
        id: `${sectionId}:window`,
        label: rowLabel(label, detail, false, compact, modeControl),
        track: (
          <div
            className="relative border-b border-border/40"
            style={{ width: totalWidth, height: rowHeight }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <ClipBox
              start={shown.start}
              duration={shown.duration}
              label={label}
              color={TRACK_COLORS[0] ?? ""}
              editable
              allowMove={canMove}
              allowTrimStart={canMove}
              locked={rowLocked}
              lockReason={rowLockReason}
              secToPx={secToPx}
              filmstrip={{
                input,
                references: timeline?.defaultData?.references,
                contentAtLeft: shown.start - authoredStart,
              }}
              onDragStart={(_event, kind) => onPointerDown(_event, kind)}
            />
          </div>
        ),
      },
      ...(atomRows[presetId] ?? []),
    ],
  });

  return null;
}
