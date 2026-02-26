"use client";

import { forwardRef, useCallback, useMemo, useRef } from "react";
import { Player as RemotionPlayer } from "@remotion/player";
import { Loader2 } from "lucide-react";
import type { InputCompositionProps } from "@microfox/remotion";
import { calculateCompositionLayoutMetadata } from "@microfox/remotion";
import type { Timeline } from "../../../stores/project-store";
import type { PlayerRef } from "@remotion/player";
import { useLayerStateStore, filterHiddenChildrenData } from "../../../stores/layer-state-store";
import { useEditorUIStore } from "../../../stores/editor-ui-store";
import { EditableCompositionLayout } from "./EditableCompositionLayout";

interface TimelinePlayerProps {
  loadedTimeline: Timeline | null;
  generatedOutput: InputCompositionProps | null;
  calculatedMetadata: Awaited<ReturnType<typeof calculateCompositionLayoutMetadata>> | null;
  isGenerating: boolean;
  loop?: boolean;
}

export const TimelinePlayer = forwardRef<PlayerRef, TimelinePlayerProps>(({
  loadedTimeline,
  generatedOutput,
  calculatedMetadata,
  isGenerating,
  loop = true,
}, ref) => {
  const {
    overrides,
    hiddenLayerIds,
    selectedLayerIds,
    addedNodes,
    currentFrame,
    selectLayer,
    clearLayerSelection,
    setCurrentFrame,
    childrenOrderByParentId,
    trackStates,
    getMergedChildren,
    loadedChildrenData,
  } = useLayerStateStore();

  const { filePanelTab, editModeEnabled } = useEditorUIStore();

  const mergedProps = useMemo(() => {
    if (!calculatedMetadata?.props) return null;
    const base = calculatedMetadata.props;
    const mergedChildren = getMergedChildren(base.childrenData) ?? [];
    const visibleChildren = filterHiddenChildrenData(mergedChildren, hiddenLayerIds, trackStates) ?? [];
    const interactionsEnabled = filePanelTab === "layers" && editModeEnabled;
    return {
      ...base,
      childrenData: visibleChildren,
      selectedLayerIds,
      currentFrame,
      editModeEnabled: interactionsEnabled,
      onSelectLayer: (id: string, addToSelection: boolean) => {
        if (!interactionsEnabled) return;
        if (id) {
          selectLayer(id, addToSelection);
        } else {
          clearLayerSelection();
        }
      },
    };
  }, [
    calculatedMetadata?.props,
    overrides,
    addedNodes,
    hiddenLayerIds,
    trackStates,
    selectedLayerIds,
    currentFrame,
    selectLayer,
    clearLayerSelection,
    childrenOrderByParentId,
    getMergedChildren,
    loadedChildrenData,
    filePanelTab,
    editModeEnabled,
  ]);

  const cleanupRef = useRef<(() => void) | null>(null);

  const playerRefCallback = useCallback(
    (instance: PlayerRef | null) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (typeof ref === "function") {
        ref(instance);
      } else if (ref) {
        (ref as React.MutableRefObject<PlayerRef | null>).current = instance;
      }
      if (instance) {
        const handler = () => setCurrentFrame(instance.getCurrentFrame());
        instance.addEventListener("frameupdate", handler);
        setCurrentFrame(instance.getCurrentFrame());
        cleanupRef.current = () =>
          instance.removeEventListener("frameupdate", handler);
      }
    },
    [ref]
  );

  if (!loadedTimeline) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/20">
        <div className="text-center space-y-2">
          <div className="text-4xl text-muted-foreground">🎬</div>
          <p className="text-sm text-muted-foreground">No timeline loaded</p>
          <p className="text-xs text-muted-foreground">Double-click a timeline to load it</p>
        </div>
      </div>
    );
  }

  if (calculatedMetadata && mergedProps) {
    const fps = calculatedMetadata.fps ?? 30;
    const width = calculatedMetadata.width ?? 1920;
    const height = calculatedMetadata.height ?? 1080;
    const durationInFrames =
      calculatedMetadata.durationInFrames && calculatedMetadata.durationInFrames > 0
        ? calculatedMetadata.durationInFrames
        : 20;

    const interactionsEnabled =
      filePanelTab === "layers" && editModeEnabled;
    const showControls =
      filePanelTab === "timelines" || !interactionsEnabled;

    const player: React.CSSProperties = {
      backgroundColor: "#00000030",
      position: "relative",
      height: "100%",
    };

    return (
      <div className="relative w-full h-full bg-black/50 flex items-center justify-center overflow-hidden">
        <RemotionPlayer
          ref={playerRefCallback}
          component={EditableCompositionLayout}
          inputProps={mergedProps}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionHeight={height}
          compositionWidth={width}
          style={player}
          className="w-fit h-full"
          controls={showControls}
          loop={loop}
          acknowledgeRemotionLicense={true}
          overflowVisible
        />
        {isGenerating && (
          <div className="absolute top-0 left-0 right-0 bottom-0 w-full h-full flex items-center justify-center pointer-events-none">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-white/50" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <div className="text-4xl text-muted-foreground">🎬</div>
        <p className="text-sm font-medium">{loadedTimeline.displayName}</p>
        {loadedTimeline.description && (
          <p className="text-xs text-muted-foreground">{loadedTimeline.description}</p>
        )}
        <p className="text-xs text-muted-foreground">No presets to render</p>
      </div>
    </div>
  );
});

TimelinePlayer.displayName = "TimelinePlayer";
