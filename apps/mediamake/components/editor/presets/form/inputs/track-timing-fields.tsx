"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sceneBlocksFromMediaInput } from "@/components/editor_main/panels/bottom/editor/media-scene-blocks";
import { LockTargetInput } from "./lock-target-input";

export type TrackTimingMode = "lockedTo" | "sequence" | "aligned" | "autoRange";

export interface AutoRangeEstimate {
  start: number;
  duration: number;
}

function modeOf(value: Record<string, unknown>): TrackTimingMode {
  if (value.trackType === "lockedTo") return "lockedTo";
  if (typeof value.lock === "string" && value.lock.trim()) return "lockedTo";
  if (value.trackType === "sequence") return "sequence";
  if (value.trackType === "autoRange") return "autoRange";
  return "aligned";
}

function formatEstimate(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

const ALL_MODES: TrackTimingMode[] = ["lockedTo", "sequence", "aligned", "autoRange"];

function modesFrom(modes: string[] | undefined): TrackTimingMode[] {
  const allowed = (modes ?? ALL_MODES).filter((mode): mode is TrackTimingMode =>
    ALL_MODES.includes(mode as TrackTimingMode),
  );
  return allowed.length > 0 ? allowed : ALL_MODES;
}

/**
 * Lock, sequence, and aligned are one control. A preset offers auto range only when its schema includes it.
 * Lock hides start and duration. Sequence shows a calculated length.
 * Image loop sequence asks for a total duration or a per-image duration.
 * Aligned shows an editable start and duration.
 */
export function TrackTimingFields({
  value,
  onChange,
  sequenceDuration,
  autoRange,
  modes,
  sequenceLengthChoice,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Sum of child lengths. Shown disabled on the sequence tab. */
  sequenceDuration?: number;
  /** Earliest child start and span through the latest child end. */
  autoRange?: AutoRangeEstimate;
  /** Track types this preset offers. Media tracks omit auto range. */
  modes?: string[];
  /**
   * Sequence must be given a total duration or a per-image duration.
   * Both inputs are editable. Media tracks leave this off and show the estimate.
   */
  sequenceLengthChoice?: boolean;
}) {
  const available = modesFrom(modes);
  const selected = modeOf(value);
  const mode = available.includes(selected) ? selected : available[0];
  const mediaRange =
    available.includes("autoRange") && value.mediaItems
      ? sceneBlocksFromMediaInput({ ...value, trackType: "autoRange" })
      : undefined;
  const rangeEstimate =
    autoRange ??
    (mediaRange && mediaRange.duration > 0
      ? { start: mediaRange.trackStart, duration: mediaRange.duration }
      : undefined);
  const start = typeof value.start === "number" && Number.isFinite(value.start) ? value.start : 0;
  const duration =
    typeof value.duration === "number" && Number.isFinite(value.duration) ? value.duration : "";

  const setMode = (next: TrackTimingMode) => {
    const patch: Record<string, unknown> = { ...value, trackType: next };
    if (next !== "lockedTo") delete patch.lock;
    // Sequence length comes from children (or a new duration the user types).
    // Drop the previous aligned length so it does not stay as the track duration.
    if (next === "sequence") delete patch.duration;
    onChange(patch);
  };

  const setStart = (raw: string) => {
    const parsed = raw.trim() === "" ? 0 : Number(raw);
    onChange({ ...value, start: Number.isFinite(parsed) ? parsed : 0 });
  };

  const setDuration = (raw: string) => {
    const parsed = raw.trim() === "" ? undefined : Number(raw);
    const patch: Record<string, unknown> = { ...value };
    if (parsed === undefined || !Number.isFinite(parsed)) delete patch.duration;
    else patch.duration = parsed;
    onChange(patch);
  };

  const setPerImageDuration = (raw: string) => {
    const parsed = raw.trim() === "" ? undefined : Number(raw);
    const patch: Record<string, unknown> = { ...value };
    if (parsed === undefined || !Number.isFinite(parsed)) delete patch.perImageDuration;
    else patch.perImageDuration = parsed;
    onChange(patch);
  };

  const perImage =
    typeof value.perImageDuration === "number" && Number.isFinite(value.perImageDuration)
      ? value.perImageDuration
      : "";
  const sequenceHasLength =
    (typeof duration === "number" && duration > 0) ||
    (typeof perImage === "number" && perImage > 0);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Track type</Label>
      <Tabs value={mode} onValueChange={(next) => setMode(next as TrackTimingMode)}>
        <TabsList className={`grid w-full ${available.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
          {available.includes("lockedTo") ? (
            <TabsTrigger value="lockedTo" className="px-1 text-xs">Lock</TabsTrigger>
          ) : null}
          {available.includes("sequence") ? (
            <TabsTrigger value="sequence" className="px-1 text-xs">Sequence</TabsTrigger>
          ) : null}
          {available.includes("aligned") ? (
            <TabsTrigger value="aligned" className="px-1 text-xs">Aligned</TabsTrigger>
          ) : null}
          {available.includes("autoRange") ? (
            <TabsTrigger value="autoRange" className="px-1 text-xs">Auto range</TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value="lockedTo" className="space-y-2">
          <Label className="text-xs text-muted-foreground">Lock to</Label>
          <LockTargetInput
            value={typeof value.lock === "string" ? value.lock : ""}
            onChange={(lock) => onChange({ ...value, trackType: "lockedTo", lock })}
          />
        </TabsContent>
        <TabsContent value="sequence" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="number"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {sequenceLengthChoice ? "Duration" : "Est. duration"}
              </Label>
              <Input
                type="number"
                value={sequenceLengthChoice ? duration : formatEstimate(sequenceDuration)}
                disabled={!sequenceLengthChoice}
                readOnly={!sequenceLengthChoice}
                onChange={
                  sequenceLengthChoice
                    ? (event) => setDuration(event.target.value)
                    : undefined
                }
              />
            </div>
          </div>
          {sequenceLengthChoice ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Per image duration</Label>
              <Input
                type="number"
                value={perImage}
                onChange={(event) => setPerImageDuration(event.target.value)}
              />
              {sequenceHasLength ? null : (
                <p className="text-xs text-muted-foreground">
                  Sequence needs a duration or a per-image duration.
                </p>
              )}
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="aligned">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="number"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <Input
                type="number"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </div>
          </div>
        </TabsContent>
        {available.includes("autoRange") ? <TabsContent value="autoRange">
          <p className="mb-2 text-xs text-muted-foreground">
            Start is the earliest item. Duration runs through the latest item end.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="number"
                value={formatEstimate(rangeEstimate?.start)}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <Input
                type="number"
                value={formatEstimate(rangeEstimate?.duration)}
                disabled
                readOnly
              />
            </div>
          </div>
        </TabsContent> : null}
      </Tabs>
    </div>
  );
}
