"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Preset } from "../../../stores/editor-store";
import type { Timeline } from "../../../stores/project-store";

interface PresetContentProps {
  preset?: Preset;
  timeline?: Timeline;
}

interface LinkedReferenceRange {
  path: string;
  key: string;
  range: string;
}

function parseReferenceRange(value: unknown): { key: string; range: string } | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:\[([^\]]+)\](?:\[([^\]]+)\])?$/);
  if (!match || !match[2]) return null;
  return { key: match[1], range: match[2] };
}

function parseRangeSegments(range: string): string[] {
  return range
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

type SegmentKind = "time" | "index";

interface ParsedSegment {
  kind: SegmentKind;
  start: number;
  end: number;
}

function parseTimeToSeconds(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  if (normalized.includes(":")) {
    const parts = normalized.split(":").map((part) => part.trim());
    if (parts.some((part) => part.length === 0)) return null;
    const nums = parts.map((part) => Number(part));
    if (nums.some((n) => Number.isNaN(n))) return null;
    if (nums.length === 2) {
      return nums[0] * 60 + nums[1];
    }
    if (nums.length === 3) {
      return nums[0] * 3600 + nums[1] * 60 + nums[2];
    }
    return null;
  }

  const numeric = Number(normalized);
  if (Number.isNaN(numeric)) return null;
  return numeric;
}

function formatSeconds(value: number): string {
  const safe = Math.max(0, value);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toFixed(2).padStart(5, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toFixed(2)
    .padStart(5, "0")}`;
}

function parseSingleSegment(segment: string): ParsedSegment | null {
  const [rawStart, rawEnd] = segment.split("-").map((part) => part.trim());
  if (!rawStart || !rawEnd) return null;

  const isTimeLike = rawStart.includes(":") || rawEnd.includes(":");
  const start = parseTimeToSeconds(rawStart);
  const end = parseTimeToSeconds(rawEnd);

  if (start === null || end === null) return null;

  return {
    kind: isTimeLike ? "time" : "index",
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function parseEditableSegments(range: string): ParsedSegment[] {
  return parseRangeSegments(range)
    .map((segment) => parseSingleSegment(segment))
    .filter((segment): segment is ParsedSegment => Boolean(segment));
}

function serializeSegment(segment: ParsedSegment): string {
  if (segment.kind === "time") {
    return `${formatSeconds(segment.start)}-${formatSeconds(segment.end)}`;
  }
  return `${Math.round(segment.start)}-${Math.round(segment.end)}`;
}

function collectLinkedRanges(input: unknown, path = ""): LinkedReferenceRange[] {
  if (Array.isArray(input)) {
    return input.flatMap((item, index) => collectLinkedRanges(item, `${path}[${index}]`));
  }
  if (input && typeof input === "object") {
    return Object.entries(input).flatMap(([key, val]) => {
      const nextPath = path ? `${path}.${key}` : key;
      return collectLinkedRanges(val, nextPath);
    });
  }
  const parsed = parseReferenceRange(input);
  if (!parsed) return [];
  return [{ path, key: parsed.key, range: parsed.range }];
}

function setAtPath(source: any, path: string, nextValue: string) {
  const tokens: string[] = [];
  path.split(".").forEach((chunk) => {
    const [head, ...rest] = chunk.split("[");
    if (head) tokens.push(head);
    rest.forEach((part) => tokens.push(part.replace("]", "")));
  });

  const clone = structuredClone(source);
  let cursor = clone;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    if (cursor[token] === undefined) {
      cursor[token] = /^\d+$/.test(nextToken) ? [] : {};
    }
    cursor = cursor[token];
  }
  cursor[tokens[tokens.length - 1]] = nextValue;
  return clone;
}

export function PresetContent(_props: PresetContentProps) {
  const { selectedItem } = useEditorStore();
  const { updatePresetInputData, getEditedTimeline } = useTimelineEditsStore();
  const { generateOutput } = useCompileStore();
  const isPresetSelected = selectedItem?.type === "preset";
  const timeline = isPresetSelected ? selectedItem.timeline : undefined;
  const selectedPreset = isPresetSelected ? selectedItem.item : undefined;
  const effectiveTimeline = timeline ? getEditedTimeline(timeline.id) || timeline : undefined;
  const preset = effectiveTimeline?.presets?.find((p) => p.id === selectedPreset?.id) || selectedPreset;
  const presetInputData = preset?.presetInputData || {};
  const linkedRanges = useMemo(
    () => collectLinkedRanges(presetInputData),
    [presetInputData],
  );
  const [selectedLinkPath, setSelectedLinkPath] = useState<string | null>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(80);
  const [localSegments, setLocalSegments] = useState<ParsedSegment[]>([]);
  const dragStateRef = useRef<{
    segmentIndex: number;
    handle: "left" | "right";
    baseline: ParsedSegment[];
    path: string;
  } | null>(null);

  useEffect(() => {
    if (linkedRanges.length === 0) {
      setSelectedLinkPath(null);
      return;
    }
    if (!selectedLinkPath || !linkedRanges.some((link) => link.path === selectedLinkPath)) {
      setSelectedLinkPath(linkedRanges[0].path);
    }
  }, [linkedRanges, selectedLinkPath]);

  const updateRange = (path: string, nextRange: string) => {
    if (!timeline || !preset) return;
    const currentValue = path
      .split(".")
      .reduce((acc: any, part) => {
        if (!acc) return undefined;
        if (!part.includes("[")) return acc[part];
        const [root, idxRaw] = part.split("[");
        const idx = Number((idxRaw || "").replace("]", ""));
        return acc[root]?.[idx];
      }, presetInputData);
    const parsed = parseReferenceRange(currentValue);
    if (!parsed) return;
    const updatedRef = `data:[${parsed.key}][${nextRange}]`;
    const nextInputData = setAtPath(presetInputData, path, updatedRef);
    updatePresetInputData(timeline.id, preset.id, nextInputData);
    const updatedTimeline = getEditedTimeline(timeline.id) || timeline;
    generateOutput(updatedTimeline);
  };
  const selectedLink =
    linkedRanges.find((link) => link.path === selectedLinkPath) || linkedRanges[0];
  const selectedSegments = selectedLink ? parseEditableSegments(selectedLink.range) : [];
  const totalDuration = Math.max(
    1,
    Number(effectiveTimeline?.configuration?.config?.duration || 60),
  );
  const timelineWidth = Math.max(800, totalDuration * pixelsPerSecond);

  useEffect(() => {
    setLocalSegments(selectedSegments);
  }, [selectedLink?.path, selectedLink?.range]);

  const commitSegments = useCallback(
    (path: string, segments: ParsedSegment[]) => {
      if (!path) return;
      const normalized = segments.map((segment) => ({
        ...segment,
        start: Math.max(0, segment.start),
        end: Math.max(segment.start + 0.01, segment.end),
      }));
      updateRange(path, normalized.map((segment) => serializeSegment(segment)).join(","));
    },
    [updateRange],
  );

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag || !selectedLink || drag.path !== selectedLink.path) return;
      const deltaSeconds = event.movementX / pixelsPerSecond;
      setLocalSegments((prev) => {
        const base = prev.length ? [...prev] : [...drag.baseline];
        const target = base[drag.segmentIndex];
        if (!target) return base;
        const minGap = target.kind === "index" ? 1 : 0.01;
        if (drag.handle === "left") {
          const nextStart = Math.min(target.end - minGap, Math.max(0, target.start + deltaSeconds));
          target.start = target.kind === "index" ? Math.round(nextStart) : nextStart;
        } else {
          const bound = target.kind === "time" ? totalDuration : Math.max(target.end + 200, totalDuration);
          const nextEnd = Math.max(target.start + minGap, Math.min(bound, target.end + deltaSeconds));
          target.end = target.kind === "index" ? Math.round(nextEnd) : nextEnd;
        }
        return base.map((segment, index) => (index === drag.segmentIndex ? { ...target } : segment));
      });
    };

    const onMouseUp = () => {
      const drag = dragStateRef.current;
      if (!drag) return;
      dragStateRef.current = null;
      if (selectedLink) {
        commitSegments(selectedLink.path, localSegments);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [commitSegments, localSegments, pixelsPerSecond, selectedLink, totalDuration]);

  const startHandleDrag = (
    event: React.MouseEvent,
    segmentIndex: number,
    handle: "left" | "right",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      segmentIndex,
      handle,
      baseline: localSegments.map((segment) => ({ ...segment })),
      path: selectedLink?.path || "",
    };
  };

  const timelineTicks = useMemo(() => {
    const interval = pixelsPerSecond > 120 ? 1 : pixelsPerSecond > 70 ? 2 : 5;
    const ticks: number[] = [];
    for (let second = 0; second <= totalDuration; second += interval) {
      ticks.push(second);
    }
    return ticks;
  }, [pixelsPerSecond, totalDuration]);

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4">
        <div className="space-y-4">
          {!isPresetSelected || !timeline || !preset ? (
            <div className="h-32 bg-muted/20 rounded-md flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Select a preset to view linked reference ranges.
              </p>
            </div>
          ) : linkedRanges.length === 0 ? (
            <div className="h-24 bg-muted/20 rounded-md flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No timeline-linked references in this preset.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-row gap-2 w-[97vw] justify-between">
                <div className="text-xs text-muted-foreground">
                  {preset.label || "Preset"} &gt; {selectedLink.path} &gt; {selectedLink.key}
                </div>
                <div className="flex flex-wrap gap-2">
                  {linkedRanges.map((link, index) => {
                    const isActive = selectedLink?.path === link.path;
                    return (
                      <button
                        key={`${link.path}-${index}`}
                        type="button"
                        onClick={() => setSelectedLinkPath(link.path)}
                        className={`rounded-md border px-2 py-1 text-xs transition-colors ${isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                          }`}
                      >
                        {link.path}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedLink ? (
                <div className="rounded-md border p-3 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setPixelsPerSecond((prev) => Math.max(20, prev / 1.5))}
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </Button>
                      <Slider
                        min={20}
                        max={260}
                        step={1}
                        value={[pixelsPerSecond]}
                        onValueChange={(values) => setPixelsPerSecond(values[0] || 80)}
                        className="w-28"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setPixelsPerSecond((prev) => Math.min(260, prev * 1.5))}
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md border bg-muted/20">
                    <div className="overflow-x-auto max-w-full">
                      <div className="relative" style={{ width: timelineWidth }}>
                        <div className="sticky top-0 h-8 border-b bg-background/90 backdrop-blur-sm">
                          {timelineTicks.map((tick) => (
                            <div
                              key={`tick-${tick}`}
                              className="absolute top-0 h-full"
                              style={{ left: tick * pixelsPerSecond }}
                            >
                              <div className="h-2 w-px bg-muted-foreground/60" />
                              <span className="absolute top-2 left-1 text-[10px] text-muted-foreground">
                                {tick}s
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2 p-2">
                          {localSegments.map((segment, index) => {
                            const trackMax =
                              segment.kind === "time"
                                ? totalDuration
                                : Math.max(totalDuration, segment.end + 50);
                            const left = (segment.start / trackMax) * timelineWidth;
                            const width = Math.max(
                              8,
                              ((segment.end - segment.start) / trackMax) * timelineWidth,
                            );
                            return (
                              <div key={`segment-track-${index}`} className="relative h-12 border rounded bg-background">
                                <div
                                  className="absolute top-1/2 h-8 -translate-y-1/2 rounded bg-primary/70"
                                  style={{ left, width }}
                                >
                                  <button
                                    type="button"
                                    className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l bg-primary"
                                    onMouseDown={(event) => startHandleDrag(event, index, "left")}
                                  />
                                  <div className="px-3 text-[11px] leading-8 text-primary-foreground truncate select-none">
                                    Segment {index + 1}: {serializeSegment(segment)}
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r bg-primary"
                                    onMouseDown={(event) => startHandleDrag(event, index, "right")}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* <Input
                    value={selectedLink.range}
                    onChange={(e) => updateRange(selectedLink.path, e.target.value)}
                    className="h-8 text-xs"
                    placeholder="HH:MM:SS-HH:MM:SS,HH:MM:SS-HH:MM:SS"
                  />

                  <div className="space-y-3">
                    {localSegments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Range format is not adjustable visually yet. Use the range input above.
                      </p>
                    ) : (
                      localSegments.map((segment, index) => {
                        const maxValue =
                          segment.kind === "time"
                            ? totalDuration
                            : Math.max(100, Math.ceil(segment.end + 50));
                        return (
                          <div key={`segment-${index}`} className="space-y-2 rounded-md border p-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">
                                Segment {index + 1} ({segment.kind})
                              </span>
                              <span className="text-muted-foreground">
                                {serializeSegment(segment)}
                              </span>
                            </div>
                            <Slider
                              min={0}
                              max={maxValue}
                              step={segment.kind === "time" ? 0.01 : 1}
                              value={[segment.start, segment.end]}
                              onValueChange={(values) => {
                                setLocalSegments((prev) => {
                                  const next = [...prev];
                                  if (!next[index] || values.length < 2) return prev;
                                  const [rawStart, rawEnd] = values;
                                  const start = Math.min(rawStart, rawEnd);
                                  const end = Math.max(rawStart, rawEnd);
                                  next[index] = {
                                    ...next[index],
                                    start: segment.kind === "index" ? Math.round(start) : start,
                                    end: segment.kind === "index" ? Math.round(end) : end,
                                  };
                                  return next;
                                });
                              }}
                              onValueCommit={(values) => {
                                const [rawStart, rawEnd] = values;
                                const start = Math.min(rawStart, rawEnd);
                                const end = Math.max(rawStart, rawEnd);
                                const nextSegments = localSegments.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                      ...item,
                                      start: item.kind === "index" ? Math.round(start) : start,
                                      end: item.kind === "index" ? Math.round(end) : end,
                                    }
                                    : item,
                                );
                                setLocalSegments(nextSegments);
                                commitSegments(selectedLink.path, nextSegments);
                              }}
                            />
                          </div>
                        );
                      })
                    )}
                  </div> */}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
