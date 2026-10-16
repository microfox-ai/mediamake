"use client";

import {
  AudioLines,
  Box,
  Captions,
  Clapperboard,
  Code2,
  Film,
  Images,
  Timer,
  Type,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sceneModeOf, TRACK_MODE_HINT, TRACK_MODE_ICON } from "@/components/editor_main/panels/bottom/editor/track-mode-icons";

function functionIcon(presetId: string): LucideIcon {
  if (presetId === "broll") return Clapperboard;
  if (presetId === "media-track" || presetId === "video-stitch-sequence") return Film;
  if (presetId === "imageloop" || presetId === "imageloop-sound" || presetId === "lottie-showcase") {
    return Images;
  }
  if (
    presetId === "text-atom" ||
    presetId === "atom:TextAtom" ||
    presetId === "text-overlay" ||
    presetId === "textbase"
  ) {
    return Type;
  }
  if (presetId === "atom:ImageAtom") return Images;
  if (presetId === "atom:VideoAtom") return Film;
  if (
    presetId === "atom:AudioAtom" ||
    presetId === "waveform-audio" ||
    presetId.toLowerCase().includes("waveform")
  ) {
    return AudioLines;
  }
  if (presetId === "second-counter") return Timer;
  if (presetId === "htmlBlockAtom" || presetId === "atom:HTMLBlockAtom") return Code2;
  if (
    presetId.startsWith("sub-") ||
    presetId.includes("caption") ||
    presetId === "subtitles-plain"
  ) {
    return Captions;
  }
  return Box;
}

export function BlockIcon({
  presetId,
  input,
  className,
}: {
  presetId: string;
  input: unknown;
  className?: string;
}) {
  const scene = presetId === "scene" || presetId === "base-scene";
  const mode = scene ? sceneModeOf(input) : null;
  const Icon = mode ? TRACK_MODE_ICON[mode] : functionIcon(presetId);
  const icon = <Icon className={className} />;
  if (!mode) return icon;
  const lockTarget =
    mode === "lockedTo" && input && typeof input === "object" && !Array.isArray(input)
      ? String((input as { lock?: unknown }).lock ?? "").trim()
      : "";
  const hint =
    mode === "lockedTo" && lockTarget
      ? `Locked to ${lockTarget}. Start and duration follow that track.`
      : TRACK_MODE_HINT[mode];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">{icon}</span>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{hint}</p>
      </TooltipContent>
    </Tooltip>
  );
}
