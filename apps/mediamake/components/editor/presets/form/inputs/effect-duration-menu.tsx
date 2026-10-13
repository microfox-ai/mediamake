"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLayerStateStore } from "@/components/editor_main/stores/layer-state-store";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { formatRangeClock } from "../../engine/preset-stdlib";

const DURATION_OPTIONS = [
  { id: "10s", label: "10secs", seconds: 10 },
  { id: "30s", label: "30secs", seconds: 30 },
  { id: "1m", label: "1min", seconds: 60 },
  { id: "track", label: "entire track", seconds: null },
] as const;

function positiveNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Plus button that asks how long the new effect should run.
 * The range always starts at the playhead.
 */
export function EffectDurationMenu({
  title,
  onPick,
}: {
  title: string;
  onPick: (range: string) => void;
}) {
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const fps = useCompileStore((s) => s.calculatedMetadata?.fps) ?? 30;
  const durationInFrames = useCompileStore(
    (s) => s.calculatedMetadata?.durationInFrames,
  );
  const configDuration = useCompileStore((s) =>
    positiveNumber(s.currentTimeline?.configuration?.config?.duration),
  );

  const trackEndSec =
    typeof durationInFrames === "number" && durationInFrames > 0
      ? durationInFrames / Math.max(fps, 1)
      : configDuration;

  const pick = (seconds: number | null) => {
    const start = Math.max(0, currentFrame / Math.max(fps, 1));
    const end =
      seconds == null
        ? Math.max(start, trackEndSec ?? start)
        : start + seconds;
    onPick(`${formatRangeClock(start)}-${formatRangeClock(end)}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title={title}
          aria-label={title}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {DURATION_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            className="text-xs"
            disabled={option.seconds == null && trackEndSec == null}
            onSelect={() => pick(option.seconds)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
