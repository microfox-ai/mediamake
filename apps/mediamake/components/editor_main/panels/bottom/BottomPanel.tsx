"use client";

import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewPatternStore } from "../../stores/view-pattern-store";
import { useEditorStore } from "../../stores/editor-store";
import { EditorContent } from "./editor/EditorContent";

// Placeholder component that will be replaced later
function TimelineContent() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
      Timeline content placeholder
    </div>
  );
}

export function BottomPanel() {
  const { currentPattern } = useViewPatternStore();
  const { selectedItem } = useEditorStore();

  // Get the title based on selected item
  const getTitle = () => {
    if (!selectedItem) {
      return "Timeline";
    }
    if (selectedItem.type === 'timeline') {
      return "Timeline";
    }
    return selectedItem.item.label || "Preset";
  };

  // For now, render the same component for all patterns
  // This will be replaced with different components later
  const renderPatternContent = () => {
    switch (currentPattern) {
      case 'edit':
        return <EditorContent />;
      case 'make':
      case 'media':
      case 'render':
      default:
        return <TimelineContent />;
    }
  };

  return (
    <div className="flex h-full flex-col border-t bg-background">
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{getTitle()}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Play className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Pause className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {renderPatternContent()}
    </div>
  );
}
