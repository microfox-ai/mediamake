"use client";

import { forwardRef } from "react";
import { Player } from "@microfox/remotion";
import { Loader2 } from "lucide-react";
import type { InputCompositionProps } from "@microfox/remotion";
import { calculateCompositionLayoutMetadata } from "@microfox/remotion";
import type { Timeline } from "../../../stores/project-store";
import type { PlayerRef } from "@remotion/player";

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

  const player: React.CSSProperties = {
    backgroundColor: "#00000030",
    position: "relative",
    height: "100%",
  };

  if (calculatedMetadata) {
    return (
      <div className="relative w-full h-full bg-black/50 flex items-center justify-center">
        {isGenerating && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Generating timeline...</p>
          </div>
        )}
        <Player
          ref={ref}
          inputProps={calculatedMetadata.props}
          durationInFrames={calculatedMetadata?.durationInFrames && calculatedMetadata?.durationInFrames > 0 ? calculatedMetadata?.durationInFrames : 20}
          fps={calculatedMetadata?.fps ?? 30}
          compositionHeight={calculatedMetadata?.height ?? 1920}
          compositionWidth={calculatedMetadata?.width ?? 1920}
          style={player}
          className="w-fit h-full"
          controls={true}
          loop={loop}
          acknowledgeRemotionLicense={true}
        />
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
