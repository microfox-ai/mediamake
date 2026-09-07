"use client";

import { useState, useMemo } from "react";
import { Save, Loader2, RotateCcw, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewPatternStore } from "../../stores/view-pattern-store";
import { useEditorStore } from "../../stores/editor-store";
import { useEditorUIStore } from "../../stores/editor-ui-store";
import { useProjectStore } from "../../stores/project-store";
import { useCompileStore } from "../../stores/compile-store";
import { useLayerStateStore } from "../../stores/layer-state-store";
import { toast } from "sonner";
import { EditorContent } from "./editor/EditorContent";
import { flattenLayers } from "@/lib/editor/flatten-layers";

export function BottomPanel() {
  const { currentPattern } = useViewPatternStore();
  const { selectedItem } = useEditorStore();
  const { filePanelTab } = useEditorUIStore();
  const { loadedTimeline, currentProjectId } = useProjectStore();
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const publishLayerState = useLayerStateStore((s) => s.publishLayerState);
  const resetLayerStateToGenerated = useLayerStateStore((s) => s.resetLayerStateToGenerated);
  const selectedLayerIds = useLayerStateStore((s) => s.selectedLayerIds);
  const overrides = useLayerStateStore((s) => s.overrides);
  const addedNodes = useLayerStateStore((s) => s.addedNodes);
  const childrenOrderByParentId = useLayerStateStore((s) => s.childrenOrderByParentId);
  const getMergedChildren = useLayerStateStore((s) => s.getMergedChildren);
  const loadedChildrenData = useLayerStateStore((s) => s.loadedChildrenData);
  const seekToFrame = useLayerStateStore((s) => s.seekToFrame);
  const [isSavingLayerState, setIsSavingLayerState] = useState(false);

  const mergedChildren = useMemo(
    () => getMergedChildren(calculatedMetadata?.props?.childrenData),
    [calculatedMetadata?.props?.childrenData, getMergedChildren, overrides, addedNodes, childrenOrderByParentId, loadedChildrenData]
  );

  const layers = useMemo(() => {
    if (!mergedChildren) return [];
    const props = calculatedMetadata?.props;
    const fps = props?.config?.fps ?? 30;
    const w = props?.config?.width ?? 1920;
    const h = props?.config?.height ?? 1080;
    return flattenLayers(mergedChildren, { fps, compositionWidth: w, compositionHeight: h });
  }, [mergedChildren, calculatedMetadata?.props]);

  const selectedLayer = useMemo(
    () => (selectedLayerIds.length > 0 ? layers.find((l) => l.id === selectedLayerIds[0]) : undefined),
    [layers, selectedLayerIds]
  );

  const startFrame = selectedLayer?.timing.startInFrames ?? null;
  const durationFrames = selectedLayer?.timing.durationInFrames ?? null;
  const endFrame =
    startFrame != null && durationFrames != null
      ? Math.max(startFrame, startFrame + Math.max(1, durationFrames) - 1)
      : null;

  const getTitle = () => {
    if (filePanelTab === "timelines") {
      return "Preset timeline";
    }
    if (filePanelTab === "layers") {
      return "Layers timeline";
    }
    if (!selectedItem) {
      return "Timeline";
    }
    if (selectedItem.type === "timeline") {
      return "Timeline";
    }
    if (selectedItem.type === "reference") {
      return selectedItem.item.key || "Reference";
    }
    return selectedItem.item.label || "Preset";
  };

  const handleGoToStart = () => {
    if (startFrame != null) {
      seekToFrame(startFrame);
    }
  };

  const handleGoToEnd = () => {
    if (endFrame != null) {
      seekToFrame(endFrame);
    }
  };

  const handleSaveLayerState = async () => {
    if (!loadedTimeline || !currentProjectId) {
      toast.error("No project or timeline loaded");
      return;
    }
    setIsSavingLayerState(true);
    try {
      const result = await publishLayerState(
        currentProjectId,
        loadedTimeline.id,
        calculatedMetadata?.props?.childrenData
      );
      if (result.ok) {
        toast.success("merged" in result ? "Merged teammate's changes & published" : "Published to team");
      } else if (result.reason === "nochange") {
        toast.info("Already up to date — nothing to publish");
      } else if (result.reason === "merge") {
        toast.info(`${result.conflicts} layer conflict(s) to resolve before publishing.`);
      } else if (result.reason === "conflict") {
        toast.error("Publish conflict — please try again.", { duration: 6000 });
      } else {
        toast.error(result.message ?? "Failed to publish layer state");
      }
    } finally {
      setIsSavingLayerState(false);
    }
  };

  const renderPatternContent = () => {
    switch (currentPattern) {
      case "edit":
        return <EditorContent />;
      case "make":
      case "media":
      case "render":
      default:
        return (
          <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
            Timeline content
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col border-t bg-background">
      {currentPattern === "edit" && filePanelTab === "layers" && (
        <div className="border-b px-4 py-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{getTitle()}</h2>
          {currentPattern === "edit" && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleGoToStart}
                disabled={startFrame == null}
                title="Go to start of selected layer"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGoToEnd}
                disabled={endFrame == null}
                title="Go to end of selected layer"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resetLayerStateToGenerated()}
                title="Reset all layers to timeline output (clear position, timing, and layer edits)"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Reset to timeline</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveLayerState}
                disabled={!loadedTimeline || !currentProjectId || isSavingLayerState}
                title="Save current layers (positions, visibility, etc.) for this timeline"
              >
                {isSavingLayerState ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">Save layer state</span>
              </Button>
            </div>
          )}
        </div>
      )}
      {renderPatternContent()}
    </div>
  );
}
