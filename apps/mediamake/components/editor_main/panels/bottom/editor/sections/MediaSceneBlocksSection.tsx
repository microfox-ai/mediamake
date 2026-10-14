"use client";

import { useMemo } from "react";
import type { NodeTiming } from "@/components/editor_main/timing/types";
import {
  ROW_HEIGHT,
  MIN_SEG_PX,
  TRACK_COLORS,
  formatTimeLabel,
} from "../timeline-layout";
import { useTimelineViewport } from "../timeline-viewport";
import { sceneBlocksForPreset, trackDisplayName } from "../media-scene-blocks";
import { MediaTrackBlockSection } from "../media-track-rows";
import {
  useRegisterTimelineSection,
  type TimelineTrackSectionData,
} from "../TimelineShell";

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
}: MediaSceneBlocksSectionProps) {
  const { secToPx } = useTimelineViewport();
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
              className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate" title={title}>
                  {title}
                </p>
                <p className="text-[9px] text-muted-foreground/50 truncate">
                  {summary}
                </p>
              </div>
            </div>
          ),
          track: (
            <div
              className="relative border-b border-border/40 bg-muted/5"
              style={{ height: ROW_HEIGHT }}
            >
              {blocks.map((block) => {
                const left = secToPx(block.start);
                const width = Math.max(MIN_SEG_PX, secToPx(block.duration));
                const span = `${formatTimeLabel(block.start)}–${formatTimeLabel(block.start + block.duration)}`;
                return (
                  <div
                    key={block.id}
                    className={`absolute top-1.5 bottom-1.5 rounded border flex items-center overflow-hidden ${color}`}
                    style={{ left, width }}
                    title={`${block.label} · ${span}`}
                  >
                    {width > 36 && (
                      <span className="px-1.5 text-[9px] font-medium truncate select-none">
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
  }, [sectionId, order, layout, blocks, sourceTag, label, presetInputData, secToPx]);

  useRegisterTimelineSection(section);
  return null;
}
