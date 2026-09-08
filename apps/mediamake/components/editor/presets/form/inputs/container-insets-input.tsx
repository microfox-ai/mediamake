"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlignCenter, Move, X } from "lucide-react";

export const CONTAINER_POSITIONING_OPTIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type ContainerPositioning =
  (typeof CONTAINER_POSITIONING_OPTIONS)[number];

export type ContainerInsetsValue = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  width?: number;
  height?: number;
  positioning?: ContainerPositioning;
};

type NumericKey = "left" | "right" | "top" | "bottom" | "width" | "height";

const ABSOLUTE_CELLS: { key: NumericKey; prefix: string; title: string }[] = [
  { key: "left", prefix: "L", title: "Left" },
  { key: "right", prefix: "R", title: "Right" },
  { key: "top", prefix: "T", title: "Top" },
  { key: "bottom", prefix: "B", title: "Bottom" },
];

/**
 * Container editor with Absolute (L/T/R/B) and Relative (W/H/position) tabs.
 * Empty / cleared keys are omitted (undefined) — distinct from explicit 0.
 */
export function ContainerInsetsInput({
  value,
  onChange,
}: {
  value?: ContainerInsetsValue | null;
  onChange: (next: ContainerInsetsValue | undefined) => void;
}) {
  const insets: ContainerInsetsValue =
    value && typeof value === "object" ? value : {};

  const defaultTab = useMemo(() => {
    const hasAbsolute =
      insets.left !== undefined ||
      insets.right !== undefined ||
      insets.top !== undefined ||
      insets.bottom !== undefined;
    const hasRelative =
      insets.width !== undefined ||
      insets.height !== undefined ||
      insets.positioning !== undefined;
    if (hasRelative && !hasAbsolute) return "relative";
    return "absolute";
  }, []);

  const [tab, setTab] = useState<"absolute" | "relative">(defaultTab);

  const commit = (updated: ContainerInsetsValue) => {
    const hasAny = Object.values(updated).some((v) => v !== undefined);
    onChange(hasAny ? updated : undefined);
  };

  const setNumeric = (key: NumericKey, next: number | undefined) => {
    const updated: ContainerInsetsValue = { ...insets };
    if (next === undefined) {
      delete updated[key];
    } else {
      updated[key] = next;
    }
    commit(updated);
  };

  const setPositioning = (next: ContainerPositioning | undefined) => {
    const updated: ContainerInsetsValue = { ...insets };
    if (!next) {
      delete updated.positioning;
    } else {
      updated.positioning = next;
    }
    commit(updated);
  };

  const parseInput = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (trimmed === "") return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  };

  const renderPrefixedNumber = (
    key: NumericKey,
    prefix: string,
    title: string,
  ) => {
    const current = insets[key];
    const isSet = current !== undefined;
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
          {prefix}
        </span>
        <Input
          type="number"
          value={isSet ? String(current) : ""}
          onChange={(e) => setNumeric(key, parseInput(e.target.value))}
          placeholder="—"
          className="h-8 pl-6 pr-7 text-xs"
          title={`${title} (empty = unset, 0 = zero)`}
        />
        {isSet && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-1/2 h-7 w-6 -translate-y-1/2 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => setNumeric(key, undefined)}
            title={`Clear ${title}`}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as "absolute" | "relative")}
      className="w-full"
    >
      <TabsList className="h-8 w-fit">
        <TabsTrigger value="absolute" className="h-7 gap-1.5 px-2.5 text-xs">
          <Move className="h-3.5 w-3.5" />
          Absolute
        </TabsTrigger>
        <TabsTrigger value="relative" className="h-7 gap-1.5 px-2.5 text-xs">
          <AlignCenter className="h-3.5 w-3.5" />
          Relative
        </TabsTrigger>
      </TabsList>

      <TabsContent value="absolute" className="mt-2">
        <div className="grid grid-cols-2 gap-2">
          {ABSOLUTE_CELLS.map(({ key, prefix, title }) => (
            <div key={key}>{renderPrefixedNumber(key, prefix, title)}</div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="relative" className="mt-2">
        <div className="grid grid-cols-3 gap-2">
          {renderPrefixedNumber("width", "W", "Width")}
          {renderPrefixedNumber("height", "H", "Height")}
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
              P
            </span>
            <Select
              value={insets.positioning || "__unset__"}
              onValueChange={(val) =>
                setPositioning(
                  val === "__unset__"
                    ? undefined
                    : (val as ContainerPositioning),
                )
              }
            >
              <SelectTrigger className="h-8 pl-6 text-xs">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset__">Unset</SelectItem>
                {CONTAINER_POSITIONING_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
