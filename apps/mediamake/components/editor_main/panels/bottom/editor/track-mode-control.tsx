"use client";

import { useState, type ReactNode } from "react";
import {
  applyTrackMode,
  headerTrackMode,
  hasTrackShell,
  trackModeOf,
} from "@/components/editor/presets/form/apply-track-mode";
import { collectLockTargetNames } from "@/components/editor/presets/form/collect-track-names";
import {
  LockTargetInput,
  LockTargetNamesContext,
} from "@/components/editor/presets/form/inputs/lock-target-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { useTimelineEditsStore } from "@/components/editor_main/stores/timeline-edits-store";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { TRACK_MODE_HINT, TRACK_MODE_ICON } from "./track-mode-icons";

const LockIcon = TRACK_MODE_ICON.lockedTo;
const SequenceIcon = TRACK_MODE_ICON.sequence;
const ParallelIcon = TRACK_MODE_ICON.aligned;
const AutoIcon = TRACK_MODE_ICON.autoRange;

function ModeButton({
  label,
  hint,
  pressed,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          className={cn(
            "flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground",
            pressed && "bg-muted text-black",
          )}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{hint}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TrackModeControl({
  value,
  lockTargets,
  onChange,
  includeAuto = false,
}: {
  value: Record<string, unknown>;
  lockTargets: string[];
  onChange: (next: Record<string, unknown>) => void;
  /** Base scene headers also offer auto range. Other rows keep the three modes. */
  includeAuto?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const mode = includeAuto ? trackModeOf(value) : headerTrackMode(value);
  const lockValue = typeof value.lock === "string" ? value.lock : "";

  return (
    <div className="flex items-center gap-px" onPointerDown={(event) => event.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Lock"
                aria-pressed={mode === "lockedTo"}
                className={cn(
                  "flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  mode === "lockedTo" && "bg-muted text-foreground",
                )}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <LockIcon className="size-2.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{TRACK_MODE_HINT.lockedTo}</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          className="w-56 space-y-2 p-3"
          align="end"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <p className="text-xs text-muted-foreground">Lock to</p>
          <LockTargetNamesContext.Provider value={lockTargets}>
            <LockTargetInput
              size="sm"
              value={lockValue}
              onChange={(lock) => {
                onChange(applyTrackMode(value, "lockedTo", lock, { dropDuration: includeAuto }));
                if (lock.trim()) setOpen(false);
              }}
            />
          </LockTargetNamesContext.Provider>
        </PopoverContent>
      </Popover>
      <ModeButton
        label="Sequence"
        hint={TRACK_MODE_HINT.sequence}
        pressed={mode === "sequence"}
        onClick={() => {
          setOpen(false);
          onChange(applyTrackMode(value, "sequence", undefined, { dropDuration: includeAuto }));
        }}
      >
        <SequenceIcon className="size-2.5" />
      </ModeButton>
      <ModeButton
        label="Parallel"
        hint={TRACK_MODE_HINT.aligned}
        pressed={mode === "aligned"}
        onClick={() => {
          setOpen(false);
          onChange(applyTrackMode(value, "aligned"));
        }}
      >
        <ParallelIcon className="size-2.5" />
      </ModeButton>
      {includeAuto ? (
        <ModeButton
          label="Auto"
          hint={TRACK_MODE_HINT.autoRange}
          pressed={mode === "autoRange"}
          onClick={() => {
            setOpen(false);
            onChange(applyTrackMode(value, "autoRange"));
          }}
        >
          <AutoIcon className="size-2.5" />
        </ModeButton>
      ) : null}
    </div>
  );
}

/** Writes link / sequence / parallel onto one preset from a timeline row header. */
function trackShellValue(
  input: unknown,
  includeAuto: boolean,
): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (hasTrackShell(record)) return record;
  if (!includeAuto) return null;
  return { ...record, trackType: "aligned" };
}

export function PresetTrackModeControl({
  timeline,
  presetId,
  input,
  includeAuto = false,
}: {
  timeline: Timeline;
  presetId: string;
  input: unknown;
  /** Fourth header icon. Used by the base scene row. */
  includeAuto?: boolean;
}) {
  const updatePresetInputData = useTimelineEditsStore((s) => s.updatePresetInputData);
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const generateOutput = useCompileStore((s) => s.generateOutput);
  const value = trackShellValue(input, includeAuto);
  if (!value) return null;
  const source = getEditedTimeline(timeline.id) || timeline;

  return (
    <TrackModeControl
      value={value}
      includeAuto={includeAuto}
      lockTargets={collectLockTargetNames(source, presetId)}
      onChange={(next) => {
        updatePresetInputData(timeline.id, presetId, next);
        const latest = getEditedTimeline(timeline.id);
        if (latest) generateOutput(latest);
      }}
    />
  );
}
