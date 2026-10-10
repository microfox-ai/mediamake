"use client";

import { useEffect, useMemo, useState } from "react";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLayerStateStore } from "@/components/editor_main/stores/layer-state-store";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { useEditorUIStore } from "@/components/editor_main/stores/editor-ui-store";
import {
  fitRangeAtPlayhead,
  formatRangeClock,
  parseTimeRange,
  parseTimeRanges,
} from "../../engine/preset-stdlib";
import { isValidRangeString } from "../../engine/range-validation";
import { JsonEditor } from "../../../player/json-editor";

type EffectType = "pan" | "zoom" | "generic";
type PanDirection = "up" | "down" | "left" | "right";
type ZoomDirection = "in" | "out";
type AnimationType = "ease-in-out" | "ease-out" | "ease-in" | "linear" | "spring";

type AnimationRange = {
  key: string;
  val: string | number;
  prog: number;
};

export type MotionEffectItem = {
  type?: EffectType | string;
  id?: string;
  range?: string;
  pan?: {
    direction?: PanDirection;
    distance?: number;
    loopTimes?: number;
  };
  zoom?: {
    direction?: ZoomDirection;
    depth?: number;
    loopTimes?: number;
  };
  generic?: {
    animationType?: AnimationType;
    animationRanges?: AnimationRange[];
  };
  [key: string]: unknown;
};

function normalizeEffects(value: unknown): MotionEffectItem[] {
  return Array.isArray(value) ? (value as MotionEffectItem[]) : [];
}

function isActiveAtTime(effect: MotionEffectItem, timeSec: number): boolean {
  const range = typeof effect.range === "string" ? effect.range : "";
  if (!range.trim()) return true;
  const parsed = parseTimeRange(range);
  if (!parsed) return true;
  return timeSec >= parsed.start && timeSec <= parsed.end;
}

function parseRangeParts(range: string | undefined): {
  start: string;
  end: string;
} {
  if (!range || !range.trim()) return { start: "", end: "" };
  const segment = range.split(",")[0]?.trim() || "";
  const dash = segment.indexOf("-", 1);
  if (dash === -1) return { start: segment, end: "" };
  return {
    start: segment.slice(0, dash).trim(),
    end: segment.slice(dash + 1).trim(),
  };
}

function joinRange(start: string, end: string): string {
  if (!start.trim() && !end.trim()) return "";
  return `${start.trim()}-${end.trim()}`;
}

function NumberField({
  label,
  value,
  placeholder,
  step = "1",
  min,
  max,
  onChange,
}: {
  label: string;
  value: number | undefined;
  placeholder?: string;
  step?: string;
  min?: number;
  max?: number;
  onChange: (next: number | undefined) => void;
}) {
  return (
    <div className="space-y-0.5 min-w-0">
      <Label className="text-[9px] text-muted-foreground px-0.5">{label}</Label>
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : Number(v));
        }}
        placeholder={placeholder}
        className="h-6 px-1.5 text-[10px]"
      />
    </div>
  );
}

function EffectRangeInputs({
  start,
  end,
  onCommit,
}: {
  start: string;
  end: string;
  onCommit: (start: string, end: string) => void;
}) {
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const beginRangeEdit = useEditorUIStore((s) => s.beginRangeEdit);
  const endRangeEdit = useEditorUIStore((s) => s.endRangeEdit);
  const setHasInvalidRanges = useEditorUIStore((s) => s.setHasInvalidRanges);

  useEffect(() => {
    setDraftStart(start);
    setDraftEnd(end);
  }, [start, end]);

  const commit = () => {
    const next = joinRange(draftStart, draftEnd);
    if (next && !isValidRangeString(next)) {
      setHasInvalidRanges(true);
      endRangeEdit();
      return;
    }
    setHasInvalidRanges(false);
    onCommit(draftStart, draftEnd);
    endRangeEdit();
  };

  return (
    <div className="flex items-center gap-1">
      <Label className="text-[9px] text-muted-foreground shrink-0 w-8">
        range
      </Label>
      <Input
        value={draftStart}
        onFocus={() => beginRangeEdit()}
        onChange={(e) => {
          setDraftStart(e.target.value);
          const next = joinRange(e.target.value, draftEnd);
          if (next && !isValidRangeString(next)) setHasInvalidRanges(true);
        }}
        onBlur={commit}
        placeholder="0:00"
        className="h-6 flex-1 px-1.5 text-[10px] font-mono"
        title="Start (MM:SS)"
      />
      <span className="text-[10px] text-muted-foreground">–</span>
      <Input
        value={draftEnd}
        onFocus={() => beginRangeEdit()}
        onChange={(e) => {
          setDraftEnd(e.target.value);
          const next = joinRange(draftStart, e.target.value);
          if (next && !isValidRangeString(next)) setHasInvalidRanges(true);
        }}
        onBlur={commit}
        placeholder="0:30"
        className="h-6 flex-1 px-1.5 text-[10px] font-mono"
        title="End (MM:SS)"
      />
    </div>
  );
}

function CompactEffectCard({
  effect,
  index,
  onChange,
  onRemove,
}: {
  effect: MotionEffectItem;
  index: number;
  onChange: (next: MotionEffectItem) => void;
  onRemove: () => void;
}) {
  const type: EffectType =
    effect.type === "zoom" || effect.type === "generic" ? effect.type : "pan";
  const pan = effect.pan || {};
  const zoom = effect.zoom || {};
  const generic = effect.generic || {};
  const ranges = generic.animationRanges || [];
  const rangeParts = parseRangeParts(effect.range);

  const setType = (nextType: EffectType) => {
    const next: MotionEffectItem = { ...effect, type: nextType };
    if (nextType === "pan" && !next.pan) {
      next.pan = { direction: "up", distance: 200, loopTimes: 1 };
    }
    if (nextType === "zoom" && !next.zoom) {
      next.zoom = { direction: "in", depth: 1.2, loopTimes: 1 };
    }
    if (nextType === "generic" && !next.generic) {
      next.generic = { animationType: "ease-in-out", animationRanges: [] };
    }
    onChange(next);
  };

  return (
    <div className="rounded-md border bg-muted/20 px-2 py-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground tabular-nums w-4 shrink-0">
          {index + 1}
        </span>
        <Select value={type} onValueChange={(v) => setType(v as EffectType)}>
          <SelectTrigger className="h-6 w-[88px] px-1.5 text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pan" className="text-xs">
              pan
            </SelectItem>
            <SelectItem value="zoom" className="text-xs">
              zoom
            </SelectItem>
            <SelectItem value="generic" className="text-xs">
              generic
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={typeof effect.id === "string" ? effect.id : ""}
          onChange={(e) =>
            onChange({ ...effect, id: e.target.value || undefined })
          }
          placeholder="id"
          className="h-6 flex-1 min-w-0 px-1.5 text-[10px] font-mono"
          title="Effect id"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          title="Remove"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {type === "pan" && (
        <div className="grid grid-cols-3 gap-1">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-[9px] text-muted-foreground px-0.5">
              direction
            </Label>
            <Select
              value={pan.direction || "up"}
              onValueChange={(v) =>
                onChange({
                  ...effect,
                  pan: { ...pan, direction: v as PanDirection },
                })
              }
            >
              <SelectTrigger className="h-6 px-1.5 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["up", "down", "left", "right"] as const).map((dir) => (
                  <SelectItem key={dir} value={dir} className="text-xs">
                    {dir}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumberField
            label="distance"
            value={pan.distance}
            placeholder="200"
            onChange={(distance) =>
              onChange({ ...effect, pan: { ...pan, distance } })
            }
          />
          <NumberField
            label="loops"
            value={pan.loopTimes}
            placeholder="1"
            min={1}
            onChange={(loopTimes) =>
              onChange({ ...effect, pan: { ...pan, loopTimes } })
            }
          />
        </div>
      )}

      {type === "zoom" && (
        <div className="grid grid-cols-3 gap-1">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-[9px] text-muted-foreground px-0.5">
              direction
            </Label>
            <Select
              value={zoom.direction || "in"}
              onValueChange={(v) =>
                onChange({
                  ...effect,
                  zoom: { ...zoom, direction: v as ZoomDirection },
                })
              }
            >
              <SelectTrigger className="h-6 px-1.5 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in" className="text-xs">
                  in
                </SelectItem>
                <SelectItem value="out" className="text-xs">
                  out
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumberField
            label="depth"
            value={zoom.depth}
            placeholder="1.2"
            step="0.1"
            onChange={(depth) =>
              onChange({ ...effect, zoom: { ...zoom, depth } })
            }
          />
          <NumberField
            label="loops"
            value={zoom.loopTimes}
            placeholder="1"
            min={1}
            onChange={(loopTimes) =>
              onChange({ ...effect, zoom: { ...zoom, loopTimes } })
            }
          />
        </div>
      )}

      {type === "generic" && (
        <div className="space-y-1">
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground px-0.5">
              animation
            </Label>
            <Select
              value={generic.animationType || "ease-in-out"}
              onValueChange={(v) =>
                onChange({
                  ...effect,
                  generic: {
                    ...generic,
                    animationType: v as AnimationType,
                  },
                })
              }
            >
              <SelectTrigger className="h-6 px-1.5 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "ease-in-out",
                    "ease-out",
                    "ease-in",
                    "linear",
                    "spring",
                  ] as const
                ).map((name) => (
                  <SelectItem key={name} value={name} className="text-xs">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {ranges.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-[1fr_1fr_52px_24px] gap-1 items-end"
            >
              <div className="space-y-0.5 min-w-0">
                {rowIndex === 0 && (
                  <Label className="text-[9px] text-muted-foreground px-0.5">
                    key
                  </Label>
                )}
                <Input
                  value={row.key}
                  onChange={(e) => {
                    const next = ranges.map((item, i) =>
                      i === rowIndex ? { ...item, key: e.target.value } : item,
                    );
                    onChange({
                      ...effect,
                      generic: { ...generic, animationRanges: next },
                    });
                  }}
                  placeholder="opacity"
                  className="h-6 px-1.5 text-[10px] font-mono"
                />
              </div>
              <div className="space-y-0.5 min-w-0">
                {rowIndex === 0 && (
                  <Label className="text-[9px] text-muted-foreground px-0.5">
                    val
                  </Label>
                )}
                <Input
                  value={row.val ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const trimmed = raw.trim();
                    const asNum = Number(trimmed);
                    const val =
                      trimmed !== "" &&
                      !trimmed.endsWith(".") &&
                      Number.isFinite(asNum)
                        ? asNum
                        : raw;
                    const next = ranges.map((item, i) =>
                      i === rowIndex ? { ...item, val } : item,
                    );
                    onChange({
                      ...effect,
                      generic: { ...generic, animationRanges: next },
                    });
                  }}
                  placeholder="1"
                  className="h-6 px-1.5 text-[10px] font-mono"
                />
              </div>
              <div className="space-y-0.5 min-w-0">
                {rowIndex === 0 && (
                  <Label className="text-[9px] text-muted-foreground px-0.5">
                    prog
                  </Label>
                )}
                <Input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={row.prog ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next = ranges.map((item, i) =>
                      i === rowIndex
                        ? { ...item, prog: v === "" ? 0 : Number(v) }
                        : item,
                    );
                    onChange({
                      ...effect,
                      generic: { ...generic, animationRanges: next },
                    });
                  }}
                  className="h-6 px-1.5 text-[10px]"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  onChange({
                    ...effect,
                    generic: {
                      ...generic,
                      animationRanges: ranges.filter((_, i) => i !== rowIndex),
                    },
                  });
                }}
                title="Remove keyframe"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] text-muted-foreground"
            onClick={() =>
              onChange({
                ...effect,
                generic: {
                  ...generic,
                  animationRanges: [
                    ...ranges,
                    { key: "", val: "", prog: ranges.length === 0 ? 0 : 1 },
                  ],
                },
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" />
            keyframe
          </Button>
        </div>
      )}

      <EffectRangeInputs
        start={rangeParts.start}
        end={rangeParts.end}
        onCommit={(s, e) => {
          const nextRange = joinRange(s, e);
          onChange({
            ...effect,
            range: nextRange || undefined,
          });
        }}
      />
    </div>
  );
}

/**
 * Smart / Full / JSON editor for imageloop motion effects (pan, zoom, generic).
 */
export function EffectsField({
  value,
  onChange,
  title,
  description,
}: {
  value: unknown;
  onChange: (next: MotionEffectItem[]) => void;
  title?: string;
  description?: string;
}) {
  const [tab, setTab] = useState<"smart" | "full" | "json">("smart");
  const effects = normalizeEffects(value);
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const fps = useCompileStore((s) => s.calculatedMetadata?.fps) ?? 30;
  const timeSec = currentFrame / Math.max(fps, 1);

  const activeIndices = useMemo(() => {
    const indices: number[] = [];
    effects.forEach((effect, i) => {
      if (isActiveAtTime(effect, timeSec)) indices.push(i);
    });
    return indices;
  }, [effects, timeSec]);

  const visibleEntries =
    tab === "smart"
      ? activeIndices.map((i) => ({ effect: effects[i], index: i }))
      : effects.map((effect, index) => ({ effect, index }));

  const updateAt = (index: number, next: MotionEffectItem) => {
    const arr = [...effects];
    arr[index] = next;
    onChange(arr);
  };

  const removeAt = (index: number) => {
    onChange(effects.filter((_, i) => i !== index));
  };

  const addEffect = () => {
    const otherStarts = effects.flatMap((effect) =>
      parseTimeRanges(typeof effect.range === "string" ? effect.range : "").map(
        (segment) => segment.start,
      ),
    );
    const fitted = fitRangeAtPlayhead(timeSec, otherStarts);
    onChange([
      ...effects,
      {
        type: "pan",
        id: `fx-${Date.now().toString(36).slice(-5)}`,
        pan: { direction: "up", distance: 200, loopTimes: 1 },
        range: `${formatRangeClock(fitted.start)}-${formatRangeClock(fitted.end)}`,
      },
    ]);
    setTab("full");
  };

  const clearEffects = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{title || "effects"}</Label>
        {description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{description}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {effects.length}
        </span>
        <div className="flex-1" />
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "smart" | "full" | "json")}
        >
          <TabsList className="h-7">
            <TabsTrigger value="smart" className="h-6 px-2 text-[10px]">
              Smart
            </TabsTrigger>
            <TabsTrigger value="full" className="h-6 px-2 text-[10px]">
              Full
            </TabsTrigger>
            <TabsTrigger value="json" className="h-6 px-2 text-[10px]">
              JSON
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={-1}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={clearEffects}
                disabled={effects.length === 0}
                aria-label="Clear all effects"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear all effects</p>
          </TooltipContent>
        </Tooltip>
        {tab !== "json" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={addEffect}
            title="Add effect"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {tab === "json" ? (
        <JsonEditor
          value={effects}
          onChange={(next) => onChange(normalizeEffects(next))}
          height="280px"
          className="border rounded-md overflow-hidden"
        />
      ) : (
        <>
          {tab === "smart" && (
            <p className="text-[10px] text-muted-foreground">
              Active at {timeSec.toFixed(2)}s · {activeIndices.length} of{" "}
              {effects.length}
            </p>
          )}

          {visibleEntries.length === 0 ? (
            <div className="rounded-md border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">
              {tab === "smart"
                ? effects.length === 0
                  ? "No effects yet"
                  : "No effects active at this frame"
                : "No effects"}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-0.5">
              {visibleEntries.map(({ effect, index }) => (
                <CompactEffectCard
                  key={`${index}-${effect.id || effect.type || "fx"}`}
                  effect={effect}
                  index={index}
                  onChange={(next) => updateAt(index, next)}
                  onRemove={() => removeAt(index)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
