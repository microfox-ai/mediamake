"use client";

import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../../stores/project-store";
import { useTimelineRenderer } from "./useTimelineRenderer";
import { TimelinePlayer } from "./TimelinePlayer";
import { TimelineControlBar } from "./TimelineControlBar";
import { OutputJsonDialog } from "./OutputJsonDialog";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { usePlayerRefStore } from "../../../stores/player-ref-store";
import type { PlayerRef } from "@remotion/player";

const LAYER_STATE_STORAGE_PREFIX = "layer-state";

export function EditPatternContent() {
  const { loadedTimeline, currentProjectId } = useProjectStore();
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [loop, setLoop] = useState(true);
  const playerRef = useRef<PlayerRef | null>(null);
  const savedPlayerStateRef = useRef<{ frame: number; isPlaying: boolean } | null>(null);
  const previousCalculatedMetadataRef = useRef<any>(null);
  const { setSeekToFrame, loadLayerState } = useLayerStateStore();
  const setPlayerRef = usePlayerRefStore((s) => s.setPlayerRef);

  // Load layer edits when timeline or project changes
  useEffect(() => {
    if (!loadedTimeline || !currentProjectId) {
      loadLayerState({
        trackStates: {},
        hiddenLayerIds: [],
        lockedLayerIds: [],
      });
      return;
    }
    const projectId = currentProjectId;
    const timelineId = loadedTimeline.id;
    let cancelled = false;
    const key = `${LAYER_STATE_STORAGE_PREFIX}-${projectId}-${timelineId}`;
    (async () => {
      try {
        const res = await fetch(
          `/api/project/timeline/layer-state?projectId=${encodeURIComponent(projectId)}&timelineId=${encodeURIComponent(timelineId)}`
        );
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          const snapshot =
            data != null && typeof data === "object"
              ? {
                  childrenData: Array.isArray(data.childrenData) ? data.childrenData : undefined,
                  trackStates: data.trackStates && typeof data.trackStates === "object" ? data.trackStates : {},
                  hiddenLayerIds: Array.isArray(data.hiddenLayerIds) ? data.hiddenLayerIds : [],
                  lockedLayerIds: Array.isArray(data.lockedLayerIds) ? data.lockedLayerIds : [],
                }
              : { trackStates: {} as Record<string, never>, hiddenLayerIds: [], lockedLayerIds: [] };
          loadLayerState(snapshot);
          if (typeof window !== "undefined" && data != null) {
            try {
              localStorage.setItem(key, JSON.stringify(snapshot));
            } catch (_) {}
          }
          return;
        }
      } catch (_) {
        if (cancelled) return;
      }
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data = JSON.parse(stored);
            if (!cancelled && data != null && typeof data === "object") {
              loadLayerState({
                childrenData: Array.isArray(data.childrenData) ? data.childrenData : undefined,
                trackStates: data.trackStates && typeof data.trackStates === "object" ? data.trackStates : {},
                hiddenLayerIds: Array.isArray(data.hiddenLayerIds) ? data.hiddenLayerIds : [],
                lockedLayerIds: Array.isArray(data.lockedLayerIds) ? data.lockedLayerIds : [],
              });
            }
            return;
          }
        } catch (_) {}
      }
      if (!cancelled) {
        loadLayerState({ trackStates: {}, hiddenLayerIds: [], lockedLayerIds: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadedTimeline?.id, currentProjectId, loadLayerState]);

  // Share player ref with bottom panel and other consumers (Zustand store)
  useEffect(() => {
    setPlayerRef(playerRef);
    return () => setPlayerRef({ current: null });
  }, [setPlayerRef]);

  const {
    generatedOutput,
    calculatedMetadata,
    isGenerating,
    generationError,
  } = useTimelineRenderer(loadedTimeline);

  // Register a seek callback so other panels (e.g. LayersTree) can jump the Player.
  useEffect(() => {
    setSeekToFrame((frame: number) => {
      playerRef.current?.seekTo(frame);
    });
    return () => {
      setSeekToFrame(() => {});
    };
  }, [setSeekToFrame]);


  // Preserve player position when output regenerates
  useEffect(() => {
    const { current } = playerRef;
    if (!current) return;

    // Save player state before metadata changes
    if (previousCalculatedMetadataRef.current && calculatedMetadata) {
      try {
        const currentFrame = current.getCurrentFrame();
        const isPlaying = current.isPlaying() ?? false;
        savedPlayerStateRef.current = { frame: currentFrame, isPlaying };
      } catch (error) {
        // Player might not be ready yet, ignore
      }
    }

    // Restore player state after new metadata is available
    if (calculatedMetadata && savedPlayerStateRef.current && !isGenerating) {
      // Use setTimeout to ensure player is ready
      const timeoutId = setTimeout(() => {
        try {
          const { current: player } = playerRef;
          if (!player || !savedPlayerStateRef.current) return;

          const { frame, isPlaying } = savedPlayerStateRef.current;

          // Restore frame position
          player.seekTo(frame);

          // Restore play state
          if (isPlaying) {
            player.play();
          } else {
            player.pause();
          }

          // Clear saved state after restoring
          savedPlayerStateRef.current = null;
        } catch (error) {
          // Player might not be ready yet, ignore
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    // Update previous metadata reference
    previousCalculatedMetadataRef.current = calculatedMetadata;
  }, [calculatedMetadata, isGenerating]);

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Main Player Area */}
      <div className="flex-1 flex items-center justify-center">
        <TimelinePlayer
          ref={playerRef}
          loadedTimeline={loadedTimeline}
          generatedOutput={generatedOutput}
          calculatedMetadata={calculatedMetadata}
          isGenerating={isGenerating}
          generationError={generationError}
          loop={loop}
        />
      </div>

      {/* Bottom Control Bar */}
      <TimelineControlBar
        generatedOutput={generatedOutput}
        calculatedMetadata={calculatedMetadata}
        loop={loop}
        onLoopChange={setLoop}
        onShowJson={() => setShowOutputDialog(true)}
        isGenerating={isGenerating}
      />

      {/* Output JSON Dialog */}
      <OutputJsonDialog
        open={showOutputDialog}
        onOpenChange={setShowOutputDialog}
        generatedOutput={generatedOutput}
      />
    </div>
  );
}
