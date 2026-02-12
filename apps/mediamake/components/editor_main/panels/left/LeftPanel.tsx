"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File } from "lucide-react";
import { useViewPatternStore } from "../../stores/view-pattern-store";
import { EditFileTreeContent } from "./editor/EditFileTreePanel";

// Placeholder component that will be replaced later
function FileTreeContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2">
        <h2 className="text-sm font-semibold">File Tree</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span>Filters</span>
          </div>
          <div className="ml-6 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-3 w-3" />
              <span>Blur</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-3 w-3" />
              <span>Color Correction</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-3 w-3" />
              <span>Transform</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function LeftPanel() {
  const { currentPattern } = useViewPatternStore();

  // For now, render the same component for all patterns
  // This will be replaced with different components later
  const renderPatternContent = () => {
    switch (currentPattern) {
      case 'make':
      case 'media':
      case 'edit':
        return <EditFileTreeContent />;
      case 'render':
      default:
        return <EditFileTreeContent />;
    }
  };

  return (
    <div className="flex h-full flex-col border-r bg-background">
      {renderPatternContent()}
    </div>
  );
}
