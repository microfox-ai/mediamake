"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { Preset } from "../../../stores/editor-store";
import type { Timeline } from "../../../stores/project-store";

interface PresetContentProps {
  preset?: Preset;
  timeline?: Timeline;
}

export function PresetContent(_props: PresetContentProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        <div className="h-32 bg-muted/20 rounded-md flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Preset timeline tracks will appear here
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
