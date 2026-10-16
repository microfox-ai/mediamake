"use client";

import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Why a timeline chip cannot be dragged on its own. */
export function describeBlockLock(input: {
  sequenced?: boolean;
  lockedTo?: string;
  durationLockedTo?: string;
}): string {
  const target = input.lockedTo?.trim() || input.durationLockedTo?.trim() || "";
  if (input.lockedTo?.trim() && input.sequenced) {
    return `Locked to ${target}. Duration follows that track, and the sequence sets the start.`;
  }
  if (input.lockedTo?.trim()) {
    return `Locked to ${target}. Start and duration follow that track.`;
  }
  if (input.durationLockedTo?.trim()) {
    return `Duration is locked to ${target}.`;
  }
  if (input.sequenced) {
    return "In a sequence. Start is set by the blocks before it.";
  }
  return "Locked";
}

/** Sits on a timeline chip when that row is linked or packed in a sequence. */
export function BlockLockBadge({ reason }: { reason: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="absolute left-0.5 top-0.5 z-20 inline-flex"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Lock className="size-2.5 text-foreground/80" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{reason}</p>
      </TooltipContent>
    </Tooltip>
  );
}
