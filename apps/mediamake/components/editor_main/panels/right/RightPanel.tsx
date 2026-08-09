"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useViewPatternStore } from "../../stores/view-pattern-store";
import { useEditorUIStore } from "../../stores/editor-ui-store";
import { EditorProps } from "./editor/EditorProps";
import { RenderDetailsPanel } from "./editor/RenderDetailsPanel";

// Placeholder component that will be replaced later
function PropsContent() {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prop1">Property 1</Label>
          <Input id="prop1" placeholder="Enter value" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prop2">Property 2</Label>
          <Input id="prop2" placeholder="Enter value" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prop3">Property 3</Label>
          <Input id="prop3" placeholder="Enter value" />
        </div>
      </div>
    </ScrollArea>
  );
}

export function RightPanel() {
  const { currentPattern } = useViewPatternStore();
  const filePanelTab = useEditorUIStore((s) => s.filePanelTab);

  // For now, render the same component for all patterns
  // This will be replaced with different components later
  const renderPatternContent = () => {
    // The Renders tab shows full render details (reused from the render pages).
    if (filePanelTab === 'renders') {
      return <RenderDetailsPanel />;
    }
    switch (currentPattern) {
      case 'edit':
        return (
          <div className="flex h-full flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-auto">
              <EditorProps />
            </div>
          </div>
        );
      case 'make':
      case 'media':
      case 'render':
      default:
        return <PropsContent />;
    }
  };

  return (
    <div className="flex h-full flex-col border-l bg-background">
      {renderPatternContent()}
    </div>
  );
}
