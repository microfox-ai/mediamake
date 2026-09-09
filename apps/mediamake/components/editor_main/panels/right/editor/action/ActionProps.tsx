"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ActionEditor } from "@/components/editor/presets/actions/form/ActionSection";
import type { TimelineAction } from "@/components/editor/presets/actions/types";
import type { Timeline } from "../../../../stores/project-store";
import { useTimelineEditsStore } from "../../../../stores/timeline-edits-store";
import { getActionDefinition } from "@/components/editor/presets/actions/registry";

interface ActionPropsPanelProps {
  action: TimelineAction;
  timeline: Timeline;
}

export function ActionProps({ action, timeline }: ActionPropsPanelProps) {
  const storeAction = useTimelineEditsStore(
    (s) =>
      s.editedTimelines
        .get(timeline.id)
        ?.actions?.find((a) => a.id === action.id),
  );
  const current = storeAction || action;
  const definition = getActionDefinition(current.actionId);

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-md font-semibold">{current.label}</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Action
            </Badge>
            {definition && (
              <Badge variant="outline" className="text-xs">
                {definition.metadata.id}
              </Badge>
            )}
            {current.status && (
              <Badge
                variant={
                  current.status === "error"
                    ? "destructive"
                    : current.status === "done"
                      ? "default"
                      : "outline"
                }
                className="text-xs"
              >
                {current.status}
              </Badge>
            )}
          </div>
        </div>

        <ActionEditor timeline={timeline} action={current} showTargetLink />
      </div>
    </ScrollArea>
  );
}
