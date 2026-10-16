"use client";

import { useMemo } from "react";
import type { NodeTiming } from "@/components/editor_main/timing/types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { cn } from "@/lib/utils";
import { hasTrackShell } from "@/components/editor/presets/form/apply-track-mode";
import {
  MIN_SEG_PX,
  TRACK_COLORS,
  formatTimeLabel,
} from "../timeline-layout";
import { blockCornerClass, rowHeightFor, useTimelineDensity } from "../timeline-density";
import { useTimelineViewport } from "../timeline-viewport";
import { presetFilmstripSegments, TimelineFilmstrip } from "../timeline-filmstrip";
import { sceneBlocksForPreset, trackDisplayName } from "../media-scene-blocks";
import { MediaTrackBlockSection } from "../media-track-rows";
import { BlockLockBadge, describeBlockLock } from "../block-lock-badge";
import { PresetTrackModeControl } from "../track-mode-control";
import {
  useRegisterTimelineSection,
  type TimelineTrackSectionData,
} from "../TimelineShell";
import {
  focusTimelineBlock,
  useTimelineBlockFocus,
} from "@/components/editor_main/stores/timeline-block-focus";

interface MediaSceneBlocksSectionProps {
  sectionId: string;
  order: number;
  presetInputData: unknown;
  sourceTag?: string;
  /** When the track is locked, draw one block with this span. */
  lockSpan?: { start: number; duration: number; label: string } | null;
  /** Probed file lengths keyed by media item index. */
  probedItemDurations?: Record<number, number>;
  /**
   * Compiled sequence length. Used when items have no range of their own,
   * so one audio file still draws as the scene.
   */
  sequenceDuration?: number;
  timelineId?: string;
  presetId?: string;
  /** Edited timeline, so the header can switch link / sequence / parallel. */
  timeline?: Timeline;
  label?: string;
  /** Absolute start of the untrimmed track. */
  authoredStart?: number;
  fullDuration?: number;
  parentAbsolute?: number;
  timingKind?: NodeTiming["kind"];
  packedInSequence?: boolean;
  /** Registry preset id, so a waveform or HTML block uses its own scene layout. */
  registryPresetId?: string;
}

/**
 * One row of the scenes a media track actually places.
 * Sequence scenes sit back to back; their row is the sum of the children.
 * Aligned scenes sit on the same starts as their ranges.
 */
export function MediaSceneBlocksSection(props: MediaSceneBlocksSectionProps) {
  const layout = useMemo(
    () =>
      sceneBlocksForPreset(
        props.registryPresetId,
        props.presetInputData,
        props.probedItemDurations,
      ),
    [props.registryPresetId, props.presetInputData, props.probedItemDurations],
  );
  const interactive =
    Boolean(props.timelineId && props.presetId) &&
    (layout.mode === "sequence" || layout.mode === "aligned") &&
    (props.fullDuration ?? layout.duration) > 0;
  if (interactive && props.timelineId && props.presetId) {
    return (
      <MediaTrackBlockSection
        sectionId={props.sectionId}
        order={props.order}
        timelineId={props.timelineId}
        presetId={props.presetId}
        label={trackDisplayName(
          props.presetInputData,
          props.label || props.sourceTag || "Track",
        )}
        input={props.presetInputData}
        authoredStart={props.authoredStart ?? layout.trackStart}
        fullDuration={props.fullDuration && props.fullDuration > 0 ? props.fullDuration : layout.duration}
        parentAbsolute={props.parentAbsolute ?? 0}
        timingKind={props.timingKind}
        packedInSequence={props.packedInSequence}
        timeline={props.timeline}
        probedItemDurations={props.probedItemDurations}
        registryPresetId={props.registryPresetId}
      />
    );
  }
  return <StaticMediaScenes {...props} />;
}

function StaticMediaScenes({
  sectionId,
  order,
  presetInputData,
  sourceTag,
  lockSpan,
  probedItemDurations,
  sequenceDuration,
  label,
  registryPresetId,
  timeline,
  timelineId,
  presetId,
}: MediaSceneBlocksSectionProps) {
  const { secToPx, pixelsPerSecond } = useTimelineViewport();
  const { compact } = useTimelineDensity();
  const rowHeight = rowHeightFor(compact);
  const focus = useTimelineBlockFocus((s) => s.focus);
  const layout = useMemo(
    () => sceneBlocksForPreset(registryPresetId, presetInputData, probedItemDurations),
    [registryPresetId, presetInputData, probedItemDurations],
  );
  const blocks = useMemo(() => {
    if (layout.mode === "lockedTo" && lockSpan && lockSpan.duration > 0) {
      return [
        {
          id: "lock",
          label: lockSpan.label,
          start: lockSpan.start,
          duration: lockSpan.duration,
        },
      ];
    }
    if (layout.blocks.length > 0) return layout.blocks;
    if (
      layout.sequence &&
      typeof sequenceDuration === "number" &&
      sequenceDuration > 0
    ) {
      return [
        {
          id: "sequence",
          label: "Sequence",
          start: 0,
          duration: sequenceDuration,
        },
      ];
    }
    return layout.blocks;
  }, [layout, lockSpan, sequenceDuration]);

  const section: TimelineTrackSectionData = useMemo(() => {
    if (blocks.length === 0) {
      return { id: sectionId, order, rows: [] };
    }

    const title = trackDisplayName(presetInputData, label?.trim() || sourceTag || "Track");
    const color = TRACK_COLORS[2];
    const showLock = layout.mode === "lockedTo" || layout.sequence;
    const lockReason =
      layout.mode === "lockedTo"
        ? describeBlockLock({
            lockedTo: blocks[0]?.label || lockSpan?.label || "another track",
          })
        : describeBlockLock({ sequenced: true });
    const sequenceLength =
      layout.duration > 0
        ? layout.duration
        : blocks.reduce((max, block) => Math.max(max, block.start + block.duration), 0);
    const summary = layout.mode === "lockedTo"
      ? `locked · ${blocks[0]?.label ?? ""}`
      : layout.sequence
        ? `sequence · ${formatTimeLabel(sequenceLength)} from children`
        : layout.mode === "autoRange"
          ? `auto range · ${formatTimeLabel(layout.trackStart)}–${formatTimeLabel(layout.trackStart + layout.duration)}`
          : `${blocks.length} scene${blocks.length === 1 ? "" : "s"}`;

    return {
      id: sectionId,
      order,
      rows: [
        {
          id: `${sectionId}:scenes`,
          label: (
            <div
              className="relative flex items-center gap-1 px-2 border-b border-border/40 bg-background"
              style={{ height: rowHeight }}
            >
              <div className="flex-1 min-w-0 pr-12">
                <p className="text-[10px] font-semibold truncate" title={title}>
                  {title}
                </p>
                {compact ? null : (
                  <p className="text-[9px] text-muted-foreground/50 truncate">
                    {summary}
                  </p>
                )}
              </div>
              {timeline && timelineId && presetId && hasTrackShell(presetInputData) ? (
                <div className="absolute right-0.5 top-0.5 z-10">
                  <PresetTrackModeControl
                    timeline={timeline}
                    presetId={presetId}
                    input={presetInputData}
                  />
                </div>
              ) : null}
            </div>
          ),
          track: (
            <div
              className="relative border-b border-border/40 bg-muted/5"
              style={{ height: rowHeight }}
              onPointerDown={(event) => {
                if (event.target !== event.currentTarget || !timelineId || !presetId) return;
                const current = useTimelineBlockFocus.getState().focus;
                if (
                  current?.kind === "clip" &&
                  current.timelineId === timelineId &&
                  current.presetId === presetId
                ) {
                  useTimelineBlockFocus.getState().setFocus(null);
                }
              }}
            >
              {blocks.map((block) => {
                const left = secToPx(block.start);
                const width = Math.max(MIN_SEG_PX, secToPx(block.duration));
                const span = `${formatTimeLabel(block.start)}–${formatTimeLabel(block.start + block.duration)}`;
                const segments = presetFilmstripSegments({
                  input: presetInputData,
                  references: timeline?.defaultData?.references,
                  durationSec: block.duration,
                  itemIndex: "itemIndex" in block ? block.itemIndex : undefined,
                });
                const selected =
                  Boolean(timelineId && presetId) &&
                  focus?.kind === "clip" &&
                  focus.timelineId === timelineId &&
                  focus.blockKey === `${presetId}:${block.id}`;
                return (
                  <div
                    key={block.id}
                    className={cn(
                      "absolute top-1.5 bottom-1.5 flex items-center overflow-hidden border",
                      blockCornerClass(compact),
                      color,
                      selected && "ring-2 ring-primary ring-offset-1 ring-offset-background z-[1]",
                    )}
                    style={{ left, width }}
                    title={`${block.label} · ${span}`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      if (!timelineId || !presetId) return;
                      focusTimelineBlock(`scene:${sectionId}:${block.id}`, {
                        kind: "clip",
                        timelineId,
                        presetId,
                        label: block.label,
                        blockKey: `${presetId}:${block.id}`,
                      });
                    }}
                  >
                    <TimelineFilmstrip segments={segments} pixelsPerSecond={pixelsPerSecond} />
                    {showLock ? <BlockLockBadge reason={lockReason} /> : null}
                    {width > 36 && (
                      <span
                        className={cn(
                          "relative z-[1] px-1.5 text-[9px] font-medium truncate select-none",
                          segments.length > 0 && "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
                        )}
                      >
                        {width > 96 ? `${block.label} ${span}` : span}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        },
      ],
    };
  }, [sectionId, order, layout, blocks, sourceTag, label, presetInputData, secToPx, pixelsPerSecond, timeline, timelineId, presetId, compact, rowHeight, focus]);

  useRegisterTimelineSection(section);
  return null;
}
