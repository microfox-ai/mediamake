"use client";

import { useMemo } from "react";
import type { TimelineAction } from "@/components/editor/presets/actions/types";
import { ROW_HEIGHT } from "../timeline-layout";
import {
  useRegisterTimelineSection,
  type TimelineTrackSectionData,
} from "../TimelineShell";

export interface ActionTracksSectionProps {
  sectionId: string;
  order: number;
  action: TimelineAction;
  showHeader?: boolean;
}

/**
 * Placeholder track section for timeline actions.
 * Ready for a future action-specific track UI — registers a single empty row today.
 */
export function ActionTracksSection({
  sectionId,
  order,
  action,
  showHeader = true,
}: ActionTracksSectionProps) {
  const section: TimelineTrackSectionData = useMemo(
    () => ({
      id: sectionId,
      order,
      header: showHeader
        ? {
            label: `Action · ${action.label || action.actionId}`,
            track: null,
          }
        : undefined,
      rows: [
        {
          id: `${sectionId}:placeholder`,
          label: (
            <div
              className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate">
                  {action.label || action.actionId}
                </p>
                <p className="text-[9px] text-muted-foreground/50 truncate">
                  Action tracks coming soon
                </p>
              </div>
            </div>
          ),
          track: (
            <div
              className="relative border-b border-border/40 bg-muted/5"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-muted-foreground/30">
                  No action tracks yet
                </span>
              </div>
            </div>
          ),
        },
      ],
    }),
    [sectionId, order, showHeader, action.label, action.actionId],
  );

  useRegisterTimelineSection(section);
  return null;
}
