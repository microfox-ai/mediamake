"use client";

import { useMemo, useState } from "react";
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
import { parseTimeRange } from "../../engine/preset-stdlib";
import { JsonEditor } from "../../../player/json-editor";

export type TransitionTiming = "in" | "out" | "in&out";
export type TransitionAnimation =
  | "blur"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "scale-in";
export type TransitionAnimationType = "linear" | "spring" | "bezier";

export type TransitionEffectItem = {
  id?: string;
  timing?: TransitionTiming;
  animation?: TransitionAnimation;
  impact?: number;
  animationType?: TransitionAnimationType;
  inRange?: number;
  outRange?: number;
  [key: string]: unknown;
};

const ANIMATIONS: TransitionAnimation[] = [
  "fade",
  "blur",
  "slide-left",
  "slide-right",
  "slide-up",
  "slide-down",
  "scale-in",
];

const ANIMATION_TYPES: { value: TransitionAnimationType; label: string }[] = [
  { value: "linear", label: "linear" },
  { value: "spring", label: "spring + clamp" },
  { value: "bezier", label: "bezier + clamp" },
];

function normalizeEffects(value: unknown): TransitionEffectItem[] {
  return Array.isArray(value) ? (value as TransitionEffectItem[]) : [];
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isActiveAtTime(
  effect: TransitionEffectItem,
  timeSec: number,
  hostRange?: string,
): boolean {
  if (!hostRange?.trim()) return true;
  const parsed = parseTimeRange(hostRange);
  if (!parsed) return true;
  const timing = effect.timing || "in&out";
  const inRange = numberOr(effect.inRange, 0.5);
  const outRange = numberOr(effect.outRange, 0.5);
  if (
    (timing === "in" || timing === "in&out") &&
    timeSec >= parsed.start &&
    timeSec <= parsed.start + inRange
  ) {
    return true;
  }
  if (
    (timing === "out" || timing === "in&out") &&
    timeSec >= parsed.end - outRange &&
    timeSec <= parsed.end
  ) {
    return true;
  }
  return false;
}

function CompactTransitionCard({
  effect,
  index,
  onChange,
  onRemove,
}: {
  effect: TransitionEffectItem;
  index: number;
  onChange: (next: TransitionEffectItem) => void;
  onRemove: () => void;
}) {
  const timing = effect.timing || "in&out";
  const animation = effect.animation || "fade";
  const animationType = effect.animationType || "linear";

  return (
    <div className="rounded-md border bg-muted/20 px-2 py-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground tabular-nums w-4 shrink-0">
          {index + 1}
        </span>
        <Input
          value={typeof effect.id === "string" ? effect.id : ""}
          onChange={(e) =>
            onChange({ ...effect, id: e.target.value || undefined })
          }
          placeholder="id"
          className="h-6 w-24 px-1.5 text-[10px] font-mono"
          title="Transition id"
        />
        <div className="flex-1" />
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

      <div className="grid grid-cols-2 gap-1">
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">
            timing
          </Label>
          <Select
            value={timing}
            onValueChange={(v) =>
              onChange({ ...effect, timing: v as TransitionTiming })
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
              <SelectItem value="in&out" className="text-xs">
                in & out
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">
            animation
          </Label>
          <Select
            value={animation}
            onValueChange={(v) =>
              onChange({ ...effect, animation: v as TransitionAnimation })
            }
          >
            <SelectTrigger className="h-6 px-1.5 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIMATIONS.map((name) => (
                <SelectItem key={name} value={name} className="text-xs">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">
            impact
          </Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            value={effect.impact ?? 1}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...effect,
                impact: v === "" ? undefined : Number(v),
              });
            }}
            className="h-6 px-1.5 text-[10px]"
          />
        </div>
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">
            animationType
          </Label>
          <Select
            value={animationType}
            onValueChange={(v) =>
              onChange({
                ...effect,
                animationType: v as TransitionAnimationType,
              })
            }
          >
            <SelectTrigger className="h-6 px-1.5 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIMATION_TYPES.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">
            inRange (s)
          </Label>
          <Input
            type="number"
            step="0.05"
            min={0}
            value={effect.inRange ?? 0.5}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...effect,
                inRange: v === "" ? undefined : Number(v),
              });
            }}
            className="h-6 px-1.5 text-[10px]"
          />
        </div>
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">
            outRange (s)
          </Label>
          <Input
            type="number"
            step="0.05"
            min={0}
            value={effect.outRange ?? 0.5}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...effect,
                outRange: v === "" ? undefined : Number(v),
              });
            }}
            className="h-6 px-1.5 text-[10px]"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Smart / Full / JSON editor for per-image transition effects.
 * Same layout as shake effects, meant to sit inside the image popup.
 */
export function TransitionEffectsField({
  value,
  onChange,
  title,
  description,
  hostRange,
}: {
  value: unknown;
  onChange: (next: TransitionEffectItem[]) => void;
  title?: string;
  description?: string;
  /** Image range string, used by the Smart tab. */
  hostRange?: string;
}) {
  const [tab, setTab] = useState<"smart" | "full" | "json">("smart");
  const effects = normalizeEffects(value);
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const fps = useCompileStore((s) => s.calculatedMetadata?.fps) ?? 30;
  const timeSec = currentFrame / Math.max(fps, 1);

  const activeIndices = useMemo(() => {
    const indices: number[] = [];
    effects.forEach((effect, i) => {
      if (isActiveAtTime(effect, timeSec, hostRange)) indices.push(i);
    });
    return indices;
  }, [effects, timeSec, hostRange]);

  const visibleEntries =
    tab === "smart"
      ? activeIndices.map((i) => ({ effect: effects[i]!, index: i }))
      : effects.map((effect, index) => ({ effect, index }));

  const updateAt = (index: number, next: TransitionEffectItem) => {
    const arr = [...effects];
    arr[index] = next;
    onChange(arr);
  };

  const removeAt = (index: number) => {
    onChange(effects.filter((_, i) => i !== index));
  };

  const addEffect = () => {
    onChange([
      ...effects,
      {
        id: `tr-${Date.now().toString(36).slice(-5)}`,
        timing: "in&out",
        animation: "fade",
        impact: 1,
        animationType: "linear",
        inRange: 0.5,
        outRange: 0.5,
      },
    ]);
    setTab("full");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {title || "transitionEffects"}
        </Label>
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
                onClick={() => onChange([])}
                disabled={effects.length === 0}
                aria-label="Clear all transition effects"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear all transition effects</p>
          </TooltipContent>
        </Tooltip>
        {tab !== "json" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={addEffect}
            title="Add transition"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {tab === "json" ? (
        <JsonEditor
          value={effects}
          onChange={(next) => onChange(normalizeEffects(next))}
          height="220px"
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
                  ? "No transition effects yet"
                  : "No transition effects active at this frame"
                : "No transition effects"}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
              {visibleEntries.map(({ effect, index }) => (
                <CompactTransitionCard
                  key={`${index}-${effect?.id || "tr"}`}
                  effect={effect!}
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
