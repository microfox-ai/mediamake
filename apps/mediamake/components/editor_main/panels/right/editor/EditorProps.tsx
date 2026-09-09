"use client";

import { useEditorStore } from "../../../stores/editor-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { TimelineProps } from "./timeline/TimelineProps";
import { GeneralPresetProps } from "./preset/GeneralPresetProps";
import { LayerPropsPanel } from "./layer/LayerPropsPanel";
import { ReferenceProps } from "./reference/ReferenceProps";
import { ActionProps } from "./action/ActionProps";
import { useEffect } from "react";
import { useCompileStore } from "../../../stores/compile-store";
import { useProjectStore } from "../../../stores/project-store";
import { useEditorUIStore } from "../../../stores/editor-ui-store";

// Preset-specific component registry
const presetComponentMap: Record<string, React.ComponentType<{ preset: any; timeline: any }>> = {
};

export function EditorProps() {
  const { selectedItem } = useEditorStore();
  const { selectedLayerIds } = useLayerStateStore();
  const { setCurrentTimeline } = useCompileStore();
  const { loadedTimeline } = useProjectStore();
  const { filePanelTab } = useEditorUIStore();

  useEffect(() => {
    const timeline = useProjectStore.getState().loadedTimeline;
    if (timeline) {
      setCurrentTimeline(timeline);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally id-only
  }, [loadedTimeline?.id, setCurrentTimeline]);

  let content: React.ReactNode;
  if (filePanelTab === "timelines" && selectedItem?.type === "timeline") {
    content = <TimelineProps timeline={selectedItem.item} />;
  } else if (filePanelTab === "timelines" && selectedItem?.type === "reference") {
    content = (
      <ReferenceProps
        reference={selectedItem.item}
        timeline={selectedItem.timeline}
        referenceIndex={selectedItem.referenceIndex}
      />
    );
  } else if (filePanelTab === "timelines" && selectedItem?.type === "action") {
    content = (
      <ActionProps action={selectedItem.item} timeline={selectedItem.timeline} />
    );
  } else if (filePanelTab === "layers" && selectedLayerIds.length > 0) {
    content = <LayerPropsPanel />;
  } else if (selectedItem?.type === "timeline") {
    content = <TimelineProps timeline={selectedItem.item} />;
  } else if (selectedItem?.type === "reference") {
    content = (
      <ReferenceProps
        reference={selectedItem.item}
        timeline={selectedItem.timeline}
        referenceIndex={selectedItem.referenceIndex}
      />
    );
  } else if (selectedItem?.type === "action") {
    content = (
      <ActionProps action={selectedItem.item} timeline={selectedItem.timeline} />
    );
  } else if (!selectedItem) {
    content = (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
        No item selected
      </div>
    );
  } else {
    const PresetComponent = presetComponentMap[selectedItem.item.presetId];
    content = PresetComponent ? (
      <PresetComponent preset={selectedItem.item} timeline={selectedItem.timeline} />
    ) : (
      <GeneralPresetProps preset={selectedItem.item} timeline={selectedItem.timeline} />
    );
  }
  return content;
}
