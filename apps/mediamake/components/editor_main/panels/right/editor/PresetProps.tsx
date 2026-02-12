"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { Preset } from "../../../stores/editor-store";
import type { Timeline } from "../../../stores/project-store";

interface PresetPropsProps {
  preset: Preset;
  timeline: Timeline;
}

export function PresetProps({ preset, timeline }: PresetPropsProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Preset Properties</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{preset.label}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Preset ID</p>
                <p className="text-sm font-mono text-xs">{preset.presetId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm">{preset.presetType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Timeline</p>
                <p className="text-sm">{timeline.displayName}</p>
              </div>
              {preset.disabled !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm">{preset.disabled ? "Disabled" : "Enabled"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
