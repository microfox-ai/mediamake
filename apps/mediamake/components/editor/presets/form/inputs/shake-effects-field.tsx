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
import { Switch } from "@/components/ui/switch";
import { useLayerStateStore } from "@/components/editor_main/stores/layer-state-store";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { useEditorUIStore } from "@/components/editor_main/stores/editor-ui-store";
import { parseTimeRange } from "../../engine/preset-stdlib";
import { isValidRangeString } from "../../engine/range-validation";
import { JsonEditor } from "../../../player/json-editor";
import { cn } from "@/lib/utils";

export type ShakeEffectItem = {
  id?: string;
  range?: string;
  shake?: {
    amplitude?: number;
    frequency?: number;
    decay?: boolean;
    axis?: "x" | "y" | "both";
  };
  /** Preserved action tags / legacy fields */
  [key: string]: unknown;
};

function normalizeEffects(value: unknown): ShakeEffectItem[] {
  return Array.isArray(value) ? (value as ShakeEffectItem[]) : [];
}

function isActiveAtTime(effect: ShakeEffectItem, timeSec: number): boolean {
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

/** Local draft range inputs — pause compile while focused; commit only when valid. */
function ShakeRangeInputs({
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

function CompactShakeCard({
  effect,
  index,
  onChange,
  onRemove,
}: {
  effect: ShakeEffectItem;
  index: number;
  onChange: (next: ShakeEffectItem) => void;
  onRemove: () => void;
}) {
  const shake = effect.shake || {};
  const rangeParts = parseRangeParts(effect.range);

  const patchShake = (
    patch: Partial<NonNullable<ShakeEffectItem["shake"]>>,
  ) => {
    onChange({
      ...effect,
      shake: { ...shake, ...patch },
    });
  };

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
          className="h-6 w-20 px-1.5 text-[10px] font-mono"
          title="Effect id"
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

      <div className="grid grid-cols-4 gap-1">
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">amp</Label>
          <Input
            type="number"
            step="0.1"
            value={shake.amplitude ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              patchShake({
                amplitude: v === "" ? undefined : Number(v),
              });
            }}
            placeholder="0.5"
            className="h-6 px-1.5 text-[10px]"
          />
        </div>
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">freq</Label>
          <Input
            type="number"
            step="0.1"
            value={shake.frequency ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              patchShake({
                frequency: v === "" ? undefined : Number(v),
              });
            }}
            placeholder="0.5"
            className="h-6 px-1.5 text-[10px]"
          />
        </div>
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">decay</Label>
          <div className="h-6 flex items-center px-1">
            <Switch
              checked={shake.decay ?? true}
              onCheckedChange={(checked) => patchShake({ decay: checked })}
              className="scale-75 origin-left"
            />
          </div>
        </div>
        <div className="space-y-0.5 min-w-0">
          <Label className="text-[9px] text-muted-foreground px-0.5">axis</Label>
          <Select
            value={shake.axis || "both"}
            onValueChange={(v) =>
              patchShake({ axis: v as "x" | "y" | "both" })
            }
          >
            <SelectTrigger className="h-6 px-1.5 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both" className="text-xs">
                both
              </SelectItem>
              <SelectItem value="x" className="text-xs">
                x
              </SelectItem>
              <SelectItem value="y" className="text-xs">
                y
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ShakeRangeInputs
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
 * Smart / Full / JSON editor for plain shake effect arrays.
 * - Smart: effects active at the current player frame
 * - Full: compact list of every shake effect
 * - JSON: raw array editor
 */
export function ShakeEffectsField({
  value,
  onChange,
  title,
  description,
}: {
  value: unknown;
  onChange: (next: ShakeEffectItem[]) => void;
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

  const updateAt = (index: number, next: ShakeEffectItem) => {
    const { type: _type, ...rest } = next as ShakeEffectItem & {
      type?: string;
    };
    const arr = [...effects];
    arr[index] = rest;
    onChange(arr);
  };

  const removeAt = (index: number) => {
    onChange(effects.filter((_, i) => i !== index));
  };

  const addEffect = () => {
    onChange([
      ...effects,
      {
        id: `shake-${Date.now().toString(36).slice(-5)}`,
        shake: {
          amplitude: 0.5,
          frequency: 0.5,
          decay: true,
          axis: "both",
        },
        range: "",
      },
    ]);
    setTab("full");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{title || "shakeEffects"}</Label>
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
        {tab !== "json" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={addEffect}
            title="Add shake effect"
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
                  ? "No shake effects yet"
                  : "No shake effects active at this frame"
                : "No shake effects"}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-0.5">
              {visibleEntries.map(({ effect, index }) => (
                <CompactShakeCard
                  key={`${index}-${effect.id || "shake"}`}
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
