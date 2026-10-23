"use client";

import { Trash2 } from "lucide-react";
import {
  catalogEntry,
  catalogForTarget,
  copyTransitionToOtherEdge,
  type ClipTransition,
  type TransitionTarget,
} from "@microfox/remotion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function ClipTransitionInspector({
  transitions,
  selectedId,
  target,
  clipDuration,
  disabled,
  onChange,
}: {
  transitions: ClipTransition[];
  selectedId: string | null;
  target: TransitionTarget | null;
  clipDuration: number;
  disabled?: boolean;
  onChange: (next: ClipTransition[]) => void;
}) {
  const selected = transitions.find((transition) => transition.id === selectedId);
  if (!selected || !target) return null;
  const entries = catalogForTarget(target);
  const sameEdge = transitions.filter(
    (transition) => transition.edge === selected.edge && transition.id !== selected.id,
  );

  const patch = (partial: Partial<ClipTransition>) => {
    onChange(
      transitions.map((transition) =>
        transition.id === selected.id ? { ...transition, ...partial } : transition,
      ),
    );
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">
          Transition · {selected.edge === "in" ? "start" : "end"}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={disabled}
          title="Remove transition"
          onClick={() =>
            onChange(transitions.filter((transition) => transition.id !== selected.id))
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {entries.map((entry) => {
          const active = entry.id === selected.type;
          return (
            <button
              key={`${entry.channel}-${entry.id}`}
              type="button"
              disabled={disabled}
              className={cn(
                "rounded-md border px-1.5 py-1 text-[10px] leading-tight",
                active
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
              onClick={() => patch({ type: entry.id })}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Duration</Label>
          <Input
            type="number"
            min={0.05}
            max={clipDuration > 0 ? clipDuration : undefined}
            step={0.05}
            value={selected.duration}
            disabled={disabled}
            className="h-8"
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              const cap = clipDuration > 0 ? clipDuration : next;
              patch({ duration: Math.max(0.05, Math.min(cap, next)) });
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Easing</Label>
          <Select
            value={selected.easing}
            disabled={disabled}
            onValueChange={(value) => {
              if (value === "linear" || value === "spring" || value === "bezier") {
                patch({ easing: value });
              }
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="bezier">Bezier</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase text-muted-foreground">Amount</Label>
          <span className="text-[10px] text-muted-foreground">{selected.amount.toFixed(2)}</span>
        </div>
        <Slider
          min={0}
          max={2}
          step={0.05}
          value={[selected.amount]}
          disabled={disabled}
          onValueChange={([value]) => {
            if (typeof value === "number") patch({ amount: value });
          }}
        />
      </div>
      {sameEdge.length > 0 ? (
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Also on this edge</Label>
          {sameEdge.map((transition) => (
            <div key={transition.id} className="flex items-center gap-2 text-[11px]">
              <span className="min-w-0 flex-1 truncate">
                {catalogEntry(transition.type, target)?.label ?? transition.type}
              </span>
              <span className="text-muted-foreground">{transition.duration.toFixed(2)}s</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={disabled}
                title="Remove"
                onClick={() =>
                  onChange(transitions.filter((item) => item.id !== transition.id))
                }
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-full text-xs"
        disabled={disabled}
        onClick={() => onChange(copyTransitionToOtherEdge(transitions, selected.id))}
      >
        Apply to both ends
      </Button>
    </div>
  );
}
