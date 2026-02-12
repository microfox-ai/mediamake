"use client";

import { useEditorStore } from "../../../stores/editor-store";
import { TimelineProps } from "./TimelineProps";
import { GeneralPresetProps } from "./GeneralPresetProps";
import { useEffect } from "react";
import { useCompileStore } from "../../../stores/compile-store";
import { useProjectStore } from "../../../stores/project-store";

// Preset-specific component registry
// In the future, you can add preset-specific components here
// Example: import { TextOverlayPresetProps } from "./presetProps/text-overlay";
const presetComponentMap: Record<string, React.ComponentType<{ preset: any; timeline: any }>> = {
  // Add preset-specific components here
  // 'text-overlay': TextOverlayPresetProps,
  // 'waveform': WaveformPresetProps,
};

export function EditorProps() {
  const { selectedItem } = useEditorStore();
  const { setCurrentTimeline, generateOutput } = useCompileStore();
  const { loadedTimeline } = useProjectStore();

  // Sync compile store with loaded timeline
  useEffect(() => {
    if (loadedTimeline) {
      setCurrentTimeline(loadedTimeline);
    }
  }, [loadedTimeline, setCurrentTimeline]);

  if (!selectedItem) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
        No item selected
      </div>
    );
  }

  if (selectedItem.type === 'timeline') {
    return <TimelineProps timeline={selectedItem.item} />;
  }

  // For preset selection, try to find preset-specific component
  const PresetComponent = presetComponentMap[selectedItem.item.presetId];

  if (PresetComponent) {
    return <PresetComponent preset={selectedItem.item} timeline={selectedItem.timeline} />;
  }

  // Fallback to general preset props
  return <GeneralPresetProps preset={selectedItem.item} timeline={selectedItem.timeline} />;
}
