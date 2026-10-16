"use client";

import { useMemo } from "react";
import type { TimelineAction } from "@/components/editor/presets/actions/types";
import { MIN_SEG_PX, formatTimeLabel } from "../timeline-layout";
import { blockCornerClass, rowHeightFor, useTimelineDensity } from "../timeline-density";
import { useTimelineViewport } from "../timeline-viewport";
import {
  actionRangesVisible,
  collectActionTimelineSegments,
} from "../timeline-track-sources";
import {
  useRegisterTimelineSection,
  type TimelineTrackSectionData,
} from "../TimelineShell";

const ACTION_COLOR =
  "border-amber-500/50 bg-amber-500/20 text-amber-200";

export interface ActionTracksSectionProps {
  sectionId: string;
  order: number;
  action: TimelineAction;
  /**
   * When set (clubbed/overview), append " - {tag}" to the track title
   * instead of rendering a separate section header.
   */
  sourceTag?: string;
}

/**
 * Action row on the timeline overview.
 * Renders only when the action carries ranges. Actions with no ranges
 * register an empty section so they take no row.
 */
export function ActionTracksSection({
  sectionId,
  order,
  action,
  sourceTag,
}: ActionTracksSectionProps) {
  const { secToPx } = useTimelineViewport();
  const { compact } = useTimelineDensity();
  const rowHeight = rowHeightFor(compact);
  const name = action.label || action.actionId || "Action";
  const trackTitle = sourceTag ? `Action - ${sourceTag}` : name;
  const segments = useMemo(
    () => collectActionTimelineSegments(action),
    [action],
  );

  const section: TimelineTrackSectionData = useMemo(() => {
    if (segments.length === 0) {
      return { id: sectionId, order, rows: [] };
    }

    return {
      id: sectionId,
      order,
      rows: [
        {
          id: `${sectionId}:ranges`,
          label: (
            <div
              className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
              style={{ height: rowHeight }}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-semibold truncate"
                  title={trackTitle}
                >
                  {trackTitle}
                </p>
                {compact ? null : (
                  <p className="text-[9px] text-muted-foreground/50 truncate">
                    {segments.length} range{segments.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          ),
          track: (
            <div
              className="relative border-b border-border/40 bg-muted/5"
              style={{ height: rowHeight }}
            >
              {segments.map((seg, index) => {
                const left = secToPx(seg.start);
                const width = Math.max(
                  MIN_SEG_PX,
                  secToPx(seg.end - seg.start),
                );
                const label =
                  seg.kind === "index"
                    ? `[${Math.round(seg.start)}–${Math.round(seg.end)}]`
                    : `${formatTimeLabel(seg.start)}–${formatTimeLabel(seg.end)}`;
                return (
                  <div
                    key={`${seg.start}-${seg.end}-${index}`}
                    className={`absolute top-1.5 bottom-1.5 ${blockCornerClass(compact)} border flex items-center overflow-hidden pointer-events-none ${ACTION_COLOR}`}
                    style={{ left, width }}
                    title={label}
                  >
                    {width > 28 && (
                      <span className="px-1.5 text-[9px] font-medium truncate select-none">
                        {label}
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
  }, [sectionId, order, trackTitle, segments, secToPx, compact, rowHeight]);

  useRegisterTimelineSection(section);
  return null;
}

/**
 * Range rows for the selected action, or every action when Actions is selected.
 */
export function LinkedActionTracks({
  actions,
  selected,
  orderBase = 20,
}: {
  actions: TimelineAction[] | undefined;
  selected: {
    type: string;
    item?: { id?: string; key?: string };
  } | null;
  orderBase?: number;
}) {
  const visible = (actions ?? []).filter((action) =>
    actionRangesVisible(action, selected),
  );
  return visible.map((action, index) => (
    <ActionTracksSection
      key={action.id}
      sectionId={`action:${action.id}`}
      order={orderBase + index}
      action={action}
      sourceTag={action.label || action.actionId || "Action"}
    />
  ));
}
