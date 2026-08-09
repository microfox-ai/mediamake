"use client";

import { ViewPatternBar } from "../ViewPatternBar";
import { useViewPatternStore } from "../../stores/view-pattern-store";
import { useEditorUIStore } from "../../stores/editor-ui-store";
import { EditPatternContent } from "./editor/EditPatternContent";
import { RenderPreviewPanel } from "./editor/RenderPreviewPanel";

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
  const filePanelTab = useEditorUIStore((s) => s.filePanelTab);

  // For now, render the same component for all patterns
  // This will be replaced with different components later
  const renderPatternContent = () => {
    // The Renders tab takes over the preview stage to show the rendered output.
    if (filePanelTab === 'renders') {
      return <RenderPreviewPanel />;
    }
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

  // The Make/Media/Editor/Render pattern tabs are irrelevant while viewing renders,
  // so hide the pattern bar when the Renders tab is active.
  const showPatternBar = filePanelTab !== 'renders';

  return (
    <div className="relative flex h-full flex-col bg-background">
      {showPatternBar && (
        <div className="border-b px-4 py-2">
          <ViewPatternBar />
        </div>
      )}
      {renderPatternContent()}
    </div>
  );
}
