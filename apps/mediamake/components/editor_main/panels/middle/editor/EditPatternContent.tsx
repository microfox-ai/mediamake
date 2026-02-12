"use client";

import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../../stores/project-store";
import { useTimelineRenderer } from "./useTimelineRenderer";
import { TimelinePlayer } from "./TimelinePlayer";
import { TimelineControlBar } from "./TimelineControlBar";
import { OutputJsonDialog } from "./OutputJsonDialog";
import type { PlayerRef } from "@remotion/player";

export function EditPatternContent() {
  const { loadedTimeline } = useProjectStore();
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [loop, setLoop] = useState(true);
  const playerRef = useRef<PlayerRef | null>(null);
  const savedPlayerStateRef = useRef<{ frame: number; isPlaying: boolean } | null>(null);
  const previousCalculatedMetadataRef = useRef<any>(null);

  const {
    generatedOutput,
    calculatedMetadata,
    isGenerating,
  } = useTimelineRenderer(loadedTimeline);

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
          loop={loop}
        />
      </div>

      {/* Bottom Control Bar */}
      <TimelineControlBar
        generatedOutput={generatedOutput}
        calculatedMetadata={calculatedMetadata}
        playerRef={playerRef}
        loop={loop}
        onLoopChange={setLoop}
        onShowJson={() => setShowOutputDialog(true)}
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
