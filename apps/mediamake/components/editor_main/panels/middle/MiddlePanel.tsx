"use client";

import { ViewPatternBar } from "../ViewPatternBar";
import { useViewPatternStore } from "../../stores/view-pattern-store";
import { EditPatternContent } from "./editor/EditPatternContent";

// Placeholder component that will be replaced later
function ViewPatternContent() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/20">
      <div className="text-center space-y-2">
        <div className="text-4xl text-muted-foreground">🎬</div>
        <p className="text-sm text-muted-foreground">Preview Area</p>
      </div>
    </div>
  );
}

export function MiddlePanel() {
  const { currentPattern } = useViewPatternStore();

  // For now, render the same component for all patterns
  // This will be replaced with different components later
  const renderPatternContent = () => {
    switch (currentPattern) {
      case 'edit':
        return <EditPatternContent />;
      case 'make':
      case 'media':
      case 'render':
      default:
        return <ViewPatternContent />;
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-background">
      <div className="border-b px-4 py-2">
        <ViewPatternBar />
      </div>
      {renderPatternContent()}
    </div>
  );
}
