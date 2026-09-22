"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Plus,
  Trash2,
  Play,
  Pause,
  Scissors,
  Copy,
  ClipboardPaste,
  CopyPlus,
  ClipboardX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { usePlayerRefStore } from "../../../stores/player-ref-store";

// ─── Types ────────────────────────────────────────────────────────────────────

/** How the range is encoded in the preset input data. */
type RangeKind = "data-reference" | "plain-range";

/** A single collected range field before grouping. */
interface RawRange {
  /** Full dot-bracket path in presetInputData, e.g. "images[0].rangeString" */
  path: string;
  /** For data-reference: the reference key. For plain-range: the field name. */
  key: string;
  /** The current raw range string value. */
  range: string;
  kind: RangeKind;
}

/**
 * A track row in the timeline.
 *
 * data-reference tracks  — one concrete path holds a comma-joined multi-segment string,
 *                          e.g. "data:[captions][00:00-05.00,06:00-10.00]".
 *                          All segment edits are written back to that single path.
 *
 * plain-range tracks     — multiple concrete paths, each holding one range string,
 *                          e.g. images[0].rangeString = "01:00-02:00",
 *                               images[1].rangeString = "02:00-03:00".
 *                          Editing segment i writes ONLY to concretePaths[i].
 */
interface TrackGroup {
  /** Array-index-normalised path, used as the segsMap key, e.g. "images[].rangeString". */
  templatePath: string;
  /** Human-readable label. */
  label: string;
  kind: RangeKind;
  /** For data-reference: the reference key.  For plain-range: the leaf field name. */
  key: string;
  /** Ordered concrete paths — one entry per segment in the group. */
  concretePaths: string[];
  /** Current raw range string for each concrete path. */
  currentRanges: string[];
}

type SegmentKind = "time" | "index";

interface ParsedSegment {
  kind: SegmentKind;
  start: number;
  end: number;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function parseReferenceRange(value: unknown): { key: string; range: string } | null {
  if (typeof value !== "string") return null;
  // Accept both "data:[key][range]" (has range) and "data:[key]" (no range yet — 0 segments).
  const m = value.match(/^data:\[([^\]]+)\](?:\[([^\]]*)\])?$/);
  if (!m) return null;
  // m[2] may be undefined (no brackets) or "" (empty brackets — legacy broken value)
  return { key: m[1]!, range: m[2] ?? "" };
}

function parseTimeToSeconds(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => p.trim());
    if (parts.some((p) => !p)) return null;
    const nums = parts.map(Number);
    if (nums.some(Number.isNaN)) return null;
    if (nums.length === 2) return nums[0]! * 60 + nums[1]!;
    if (nums.length === 3) return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
    return null;
  }
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function formatSeconds(v: number): string {
  const safe = Math.max(0, v);
  const m = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(m).padStart(2, "0")}:${sec.toFixed(2).padStart(5, "0")}`;
}

function formatTimeLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  if (sec < 1 && sec > 0) return `${sec.toFixed(1)}s`;
  return `${s}s`;
}

function parseSingleSegment(raw: string): ParsedSegment | null {
  const trimmed = raw.trim();
  // Find first dash that isn't inside a colon-time group
  let dashIdx = -1;
  for (let i = 1; i < trimmed.length; i++) {
    if (trimmed[i] === "-") { dashIdx = i; break; }
  }
  if (dashIdx === -1) return null;
  const rawStart = trimmed.slice(0, dashIdx).trim();
  const rawEnd = trimmed.slice(dashIdx + 1).trim();
  if (!rawStart || !rawEnd) return null;
  const isTimeLike = rawStart.includes(":") || rawEnd.includes(":");
  const start = parseTimeToSeconds(rawStart);
  const end = parseTimeToSeconds(rawEnd);
  if (start === null || end === null) return null;
  return { kind: isTimeLike ? "time" : "index", start: Math.min(start, end), end: Math.max(start, end) };
}

function parseEditableSegments(range: string): ParsedSegment[] {
  return range.split(",").map((s) => s.trim()).filter(Boolean)
    .map(parseSingleSegment).filter((s): s is ParsedSegment => s !== null);
}

function serializeSegment(seg: ParsedSegment): string {
  if (seg.kind === "time") return `${formatSeconds(seg.start)}-${formatSeconds(seg.end)}`;
  return `${Math.round(seg.start)}-${Math.round(seg.end)}`;
}

/**
 * Field names whose value is (or might be) a plain range string.
 * Heuristic: if the leaf key matches, AND the value parses as a range segment, we collect it.
 */
const RANGE_FIELD_NAMES = new Set([
  "range", "rangestring", "timerange", "rangestr", "timerangestring",
]);

function isRangeLikeName(name: string): boolean {
  const n = name.toLowerCase().replace(/[-_]/g, "");
  return RANGE_FIELD_NAMES.has(n) || n.endsWith("range") || n.startsWith("rangestr");
}

/**
 * Recursively walk presetInputData and collect every field that holds a range value.
 * Detects both `data:[key][range]` references and plain `MM:SS-MM:SS` / `N-N` strings.
 */
function collectRawRanges(input: unknown, path = "", fieldName = ""): RawRange[] {
  if (Array.isArray(input)) {
    return input.flatMap((item, i) => collectRawRanges(item, `${path}[${i}]`, fieldName));
  }
  if (input && typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).flatMap(([k, v]) =>
      collectRawRanges(v, path ? `${path}.${k}` : k, k)
    );
  }
  if (typeof input === "string" && input.length > 0) {
    // 1. data:[key][range] reference
    const ref = parseReferenceRange(input);
    if (ref) return [{ path, key: ref.key, range: ref.range, kind: "data-reference" }];

    // 2. Plain range string on a recognisable field name
    if (isRangeLikeName(fieldName) && parseSingleSegment(input) !== null) {
      return [{ path, key: fieldName, range: input, kind: "plain-range" }];
    }
  }
  return [];
}

/**
 * Replace concrete array indices with `[]` to get a template path.
 * "images[0].rangeString" → "images[].rangeString"
 */
function toTemplatePath(path: string): string {
  return path.replace(/\[\d+\]/g, "[]");
}

/**
 * Group flat RawRanges into TrackGroups.
 *
 * data-reference ranges are always their own group (one path per field).
 * plain-range ranges with the same template path are merged into one group,
 * giving one timeline row with multiple segments (one per array item).
 */
function buildTrackGroups(raw: RawRange[]): TrackGroup[] {
  const groups = new Map<string, TrackGroup>();

  for (const r of raw) {
    const tp = toTemplatePath(r.path);

    if (r.kind === "data-reference") {
      // Each data-ref field is always its own track (path is the unique key)
      const existing = groups.get(r.path);
      if (existing) {
        // Shouldn't happen, but merge anyway
        existing.currentRanges[0] = r.range;
      } else {
        groups.set(r.path, {
          templatePath: r.path, // no de-indexing for data refs; they're already unique
          label: r.path,
          kind: "data-reference",
          key: r.key,
          concretePaths: [r.path],
          currentRanges: [r.range],
        });
      }
    } else {
      // plain-range: group by template path
      const existing = groups.get(tp);
      if (existing) {
        existing.concretePaths.push(r.path);
        existing.currentRanges.push(r.range);
      } else {
        // Derive a cleaner label: "images[].rangeString" → "images › rangeString"
        const label = tp.replace(/\[\]/g, "[ ]");
        groups.set(tp, {
          templatePath: tp,
          label,
          kind: "plain-range",
          key: r.key,
          concretePaths: [r.path],
          currentRanges: [r.range],
        });
      }
    }
  }

  return Array.from(groups.values());
}

function setAtPath(source: any, path: string, nextValue: string | undefined): any {
  const tokens: string[] = [];
  path.split(".").forEach((chunk) => {
    const [head, ...rest] = chunk.split("[");
    if (head) tokens.push(head);
    rest.forEach((part) => tokens.push(part.replace("]", "")));
  });
  const clone = structuredClone(source);
  let cursor = clone;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i]!;
    const nextToken = tokens[i + 1];
    if (cursor[token] === undefined) cursor[token] = /^\d+$/.test(nextToken ?? "") ? [] : {};
    cursor = cursor[token];
  }
  const lastKey = tokens[tokens.length - 1]!;
  if (nextValue === undefined) delete cursor[lastKey];
  else cursor[lastKey] = nextValue;
  return clone;
}

function getAtPath(source: any, path: string): any {
  const tokens: string[] = [];
  path.split(".").forEach((chunk) => {
    const [head, ...rest] = chunk.split("[");
    if (head) tokens.push(head);
    rest.forEach((part) => tokens.push(part.replace("]", "")));
  });
  let cursor = source;
  for (const token of tokens) {
    if (cursor == null) return undefined;
    cursor = cursor[token];
  }
  return cursor;
}

/** Parse `images[2].rangeString` → array path, index, leaf field. */
function parseArrayItemFieldPath(
  path: string
): { arrayPath: string; index: number; fieldPath: string } | null {
  const m = path.match(/^(.*)\[(\d+)\]\.(.+)$/);
  if (!m) return null;
  return { arrayPath: m[1]!, index: Number(m[2]), fieldPath: m[3]! };
}

/**
 * Clone the array item at `concretePath`'s index, set its range field, and insert
 * it immediately after. Used for plain-range split/duplicate.
 */
function insertClonedArrayItemWithRange(
  inputData: any,
  concretePath: string,
  newRange: string,
): any | null {
  const parsed = parseArrayItemFieldPath(concretePath);
  if (!parsed) return null;
  const arr = getAtPath(inputData, parsed.arrayPath);
  if (!Array.isArray(arr) || parsed.index < 0 || parsed.index >= arr.length) return null;

  const clone = structuredClone(inputData);
  const cloneArr = getAtPath(clone, parsed.arrayPath) as any[];
  const itemClone = structuredClone(cloneArr[parsed.index]);
  // Set the leaf field on the cloned item (fieldPath may be nested: "a.b")
  const fieldTokens = parsed.fieldPath.split(".");
  let cur: any = itemClone;
  for (let i = 0; i < fieldTokens.length - 1; i++) {
    cur = cur[fieldTokens[i]!];
    if (cur == null) return null;
  }
  cur[fieldTokens[fieldTokens.length - 1]!] = newRange;
  cloneArr.splice(parsed.index + 1, 0, itemClone);
  return clone;
}


// ─── Layout constants ─────────────────────────────────────────────────────────

const RULER_HEIGHT = 28;
const ROW_HEIGHT = 48;
const LABEL_WIDTH = 160;
const MIN_SEG_PX = 4;

const TRACK_COLORS = [
  "border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/35 text-blue-200",
  "border-violet-500/50 bg-violet-500/20 hover:bg-violet-500/35 text-violet-200",
  "border-emerald-500/50 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200",
  "border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/35 text-amber-200",
  "border-rose-500/50 bg-rose-500/20 hover:bg-rose-500/35 text-rose-200",
  "border-cyan-500/50 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200",
];

// ─── Segment selection / clipboard ────────────────────────────────────────────

interface SegSelection {
  templatePath: string;
  segIdx: number;
}

interface SegClipboard {
  seg: ParsedSegment;
}

const MIN_SPLIT_GAP = 0.05;

// ─── Segment block ────────────────────────────────────────────────────────────

interface SegBlockProps {
  left: number;
  width: number;
  color: string;
  isSelected: boolean;
  /** Label shown inside the block, e.g. the array index or time range */
  innerLabel: string;
  canDuplicate: boolean;
  canSplit: boolean;
  onSelect: () => void;
  onMoveDown: (e: React.PointerEvent) => void;
  onLeftDown: (e: React.PointerEvent) => void;
  onRightDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onDelete: (() => void) | null;
  onDuplicate: () => void;
  onSplit: () => void;
  onCopy: () => void;
  onCut: () => void;
}

function SegBlock({
  left, width, color, isSelected, innerLabel,
  canDuplicate, canSplit,
  onSelect, onMoveDown, onLeftDown, onRightDown,
  onPointerMove, onPointerUp, onDelete,
  onDuplicate, onSplit, onCopy, onCut,
}: SegBlockProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="absolute top-1.5 bottom-1.5 group/seg"
          style={{ left, width: Math.max(MIN_SEG_PX, width), overflow: "visible" }}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {/* Body */}
          <div
            className={cn(
              "absolute inset-0 rounded border cursor-grab active:cursor-grabbing flex items-center transition-colors",
              color,
              isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background z-[1]",
            )}
            onPointerDown={(e) => { e.stopPropagation(); onSelect(); onMoveDown(e); }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {width > 48 && (
              <span className="px-2 text-[9px] font-medium truncate pointer-events-none select-none">
                {innerLabel}
              </span>
            )}
          </div>

          {/* Left resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-start pl-0.5 opacity-0 group-hover/seg:opacity-100 transition-opacity"
            onPointerDown={(e) => { e.stopPropagation(); onSelect(); onLeftDown(e); }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className="w-0.5 h-5 rounded-full bg-white/60" />
          </div>

          {/* Right resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-end pr-0.5 opacity-0 group-hover/seg:opacity-100 transition-opacity"
            onPointerDown={(e) => { e.stopPropagation(); onSelect(); onRightDown(e); }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className="w-0.5 h-5 rounded-full bg-white/60" />
          </div>

          {/* Delete button — only on data-reference tracks (plain-range items belong to form objects) */}
          {onDelete && (
            <button
              type="button"
              className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center z-20 opacity-0 group-hover/seg:opacity-100 transition-opacity hover:bg-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Remove segment"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onSplit} disabled={!canSplit}>
          <Scissors className="h-4 w-4" />
          Split at playhead
          <ContextMenuShortcut>⌘\</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicate} disabled={!canDuplicate}>
          <CopyPlus className="h-4 w-4" />
          Duplicate
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onCut}>
          <ClipboardX className="h-4 w-4" />
          Cut
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopy}>
          <Copy className="h-4 w-4" />
          Copy
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
              <ContextMenuShortcut>⌫</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PresetTimelineContent() {
  const { selectedItem } = useEditorStore();
  const { updatePresetInputData, getEditedTimeline } = useTimelineEditsStore();
  const { generateOutput } = useCompileStore();
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const setCurrentFrame = useLayerStateStore((s) => s.setCurrentFrame);
  const playerRef = usePlayerRefStore((s) => s.playerRef);

  const fps = calculatedMetadata?.fps ?? 30;
  const currentTimeSec = currentFrame / fps;

  const selType = (selectedItem as any)?.type as string | undefined;
  const isPresetSelected = selType === "preset";
  const timeline = isPresetSelected ? (selectedItem as any).timeline : undefined;
  const selectedPreset = isPresetSelected ? (selectedItem as any).item : undefined;

  const effectiveTimeline = timeline ? getEditedTimeline(timeline.id) || timeline : undefined;
  const preset = effectiveTimeline?.presets?.find((p: any) => p.id === selectedPreset?.id) || selectedPreset;
  const presetInputData = preset?.presetInputData || {};

  // Prefer the ACTUAL compiled length (durationInFrames) so the ruler/fit reflect
  // the real timeline — not a hard-coded 1-minute fallback when config.duration
  // is 0 / auto. Fall back to the configured duration, then 60s.
  const compiledSec =
    calculatedMetadata?.durationInFrames && calculatedMetadata.durationInFrames > 0
      ? calculatedMetadata.durationInFrames / fps
      : 0;
  const configSec = Number(effectiveTimeline?.configuration?.config?.duration || 0);
  const totalDuration = Math.max(1, compiledSec || configSec || 60);

  // ─── Collect ranges & build track groups ────────────────────────────────────

  const rawRanges = useMemo(() => collectRawRanges(presetInputData), [presetInputData]);
  const trackGroups = useMemo(() => buildTrackGroups(rawRanges), [rawRanges]);

  // ─── Container width (for dynamic min zoom) ──────────────────────────────

  const [containerWidth, setContainerWidth] = useState(800);
  const trackRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRightRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 800;
      setContainerWidth(Math.max(1, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Zoom (log-scale) ──────────────────────────────────────────────────────

  /** Minimum pps so the whole timeline fits exactly in the visible area. */
  const minPps = useMemo(
    () => Math.max(0.05, containerWidth / totalDuration),
    [containerWidth, totalDuration]
  );
  const MAX_PPS = 2000;

  const [pixelsPerSecond, setPixelsPerSecond] = useState(80);

  // Re-clamp when limits shift (e.g. totalDuration or window width changes).
  useEffect(() => {
    setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p)));
  }, [minPps]);

  const totalWidth = Math.max(containerWidth, totalDuration * pixelsPerSecond);

  const secToPx = useCallback((s: number) => s * pixelsPerSecond, [pixelsPerSecond]);
  const pxToSec = useCallback((px: number) => px / pixelsPerSecond, [pixelsPerSecond]);

  // Log-scale conversion so the slider feels linear at every zoom level.
  const ppsToSlider = useCallback(
    (pps: number) => {
      if (minPps >= MAX_PPS) return 0;
      const t = (Math.log(pps) - Math.log(minPps)) / (Math.log(MAX_PPS) - Math.log(minPps));
      return Math.round(Math.min(100, Math.max(0, t * 100)));
    },
    [minPps]
  );
  const sliderToPps = useCallback(
    (v: number) =>
      Math.exp(Math.log(minPps) + (v / 100) * (Math.log(MAX_PPS) - Math.log(minPps))),
    [minPps]
  );

  const fitToView = useCallback(() => {
    setPixelsPerSecond(minPps);
  }, [minPps]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const f = e.deltaY < 0 ? 1.2 : 1 / 1.2;
        setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p * f)));
      }
    },
    [minPps]
  );

  // ─── Segment state (keyed by templatePath) ───────────────────────────────

  /**
   * segsMap[templatePath] = array of ParsedSegments.
   *
   * data-reference groups:  segments are from the single multi-segment range string.
   * plain-range groups:     one segment per concrete path (array item).
   */
  const [segsMap, setSegsMap] = useState<Record<string, ParsedSegment[]>>({});

  const dragRef = useRef<{
    type: "move" | "left" | "right";
    templatePath: string;
    segIdx: number;
    kind: RangeKind;
    startClientX: number;
    origStart: number;
    origEnd: number;
    segKind: SegmentKind;
  } | null>(null);

  // Sync external → local on data change (not during drag)
  const trackGroupsKey = trackGroups
    .map((g) => `${g.templatePath}:${g.currentRanges.join("|")}`)
    .join("||");

  useEffect(() => {
    if (dragRef.current) return;
    const next: Record<string, ParsedSegment[]> = {};
    for (const group of trackGroups) {
      if (group.kind === "data-reference") {
        // All segments from the single range string
        next[group.templatePath] = parseEditableSegments(group.currentRanges[0] ?? "");
      } else {
        // One segment per concrete path
        next[group.templatePath] = group.currentRanges
          .map((r) => parseSingleSegment(r))
          .filter((s): s is ParsedSegment => s !== null);
      }
    }
    setSegsMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackGroupsKey]);

  // ─── Commit helper (stable ref to prevent stale closures) ────────────────

  const commitRef = useRef<(tp: string, segs: ParsedSegment[], changedSegIdx?: number) => void>(
    () => { }
  );

  commitRef.current = (tp: string, segs: ParsedSegment[], changedSegIdx?: number) => {
    if (!timeline || !preset) return;
    const group = trackGroups.find((g) => g.templatePath === tp);
    if (!group) return;

    let nextInputData = structuredClone(presetInputData);

    if (group.kind === "data-reference") {
      const path = group.concretePaths[0]!;
      const rangeStr = segs.map(serializeSegment).join(",");
      // When all segments are deleted keep the data-reference but drop the range brackets,
      // i.e. "data:[captions]" — NOT "data:[captions][]" which is unparseable.
      const newVal = rangeStr
        ? `data:[${group.key}][${rangeStr}]`
        : `data:[${group.key}]`;
      nextInputData = setAtPath(nextInputData, path, newVal);
    } else {
      // plain-range: each segment maps 1-to-1 with a concrete path
      if (changedSegIdx !== undefined) {
        // Commit only the changed segment's path
        const path = group.concretePaths[changedSegIdx];
        const seg = segs[changedSegIdx];
        if (path && seg) {
          nextInputData = setAtPath(nextInputData, path, serializeSegment(seg));
        }
      } else {
        // Commit all
        segs.forEach((seg, i) => {
          const path = group.concretePaths[i];
          if (path) nextInputData = setAtPath(nextInputData, path, serializeSegment(seg));
        });
      }
    }

    updatePresetInputData(timeline.id, preset.id, nextInputData);
    const latestTimeline = getEditedTimeline(timeline.id) || timeline;
    generateOutput(latestTimeline);
  };

  // ─── Drag logic (pointer capture, absolute delta) ─────────────────────────

  const startDrag = useCallback(
    (
      e: React.PointerEvent,
      type: "move" | "left" | "right",
      templatePath: string,
      segIdx: number,
      seg: ParsedSegment,
      kind: RangeKind,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        type,
        templatePath,
        segIdx,
        kind,
        startClientX: e.clientX,
        origStart: seg.start,
        origEnd: seg.end,
        segKind: seg.kind,
      };
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, templatePath: string) => {
      const drag = dragRef.current;
      if (!drag || drag.templatePath !== templatePath) return;

      const deltaX = e.clientX - drag.startClientX;
      const deltaSec = deltaX / pixelsPerSecond;
      const minGap = drag.segKind === "index" ? 1 : 0.01;
      const duration = drag.origEnd - drag.origStart;
      const maxEnd = drag.segKind === "time" ? totalDuration : Math.max(drag.origEnd * 2, totalDuration);

      setSegsMap((prev) => {
        const segs = [...(prev[templatePath] ?? [])];
        const s = segs[drag.segIdx];
        if (!s) return prev;

        let newStart = s.start;
        let newEnd = s.end;

        if (drag.type === "move") {
          newStart = Math.max(0, Math.min(maxEnd - duration, drag.origStart + deltaSec));
          newEnd = newStart + duration;
          if (drag.segKind === "index") { newStart = Math.round(newStart); newEnd = Math.round(newEnd); }
        } else if (drag.type === "left") {
          newStart = Math.max(0, Math.min(drag.origEnd - minGap, drag.origStart + deltaSec));
          if (drag.segKind === "index") newStart = Math.round(newStart);
          newEnd = s.end;
        } else {
          newEnd = Math.max(drag.origStart + minGap, Math.min(maxEnd, drag.origEnd + deltaSec));
          if (drag.segKind === "index") newEnd = Math.round(newEnd);
          newStart = s.start;
        }

        segs[drag.segIdx] = { ...s, start: newStart, end: newEnd };
        return { ...prev, [templatePath]: segs };
      });
    },
    [pixelsPerSecond, totalDuration]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent, templatePath: string) => {
    const drag = dragRef.current;
    if (!drag || drag.templatePath !== templatePath) return;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const segIdx = drag.segIdx;
    const kind = drag.kind;
    dragRef.current = null;
    setSegsMap((prev) => {
      const segs = prev[templatePath] ?? [];
      // Commit to store: for plain-range pass the changed index
      commitRef.current(templatePath, segs, kind === "plain-range" ? segIdx : undefined);
      return prev;
    });
  }, []);

  // ─── Selection / clipboard ────────────────────────────────────────────────

  const [selectedSeg, setSelectedSeg] = useState<SegSelection | null>(null);
  const [clipboard, setClipboard] = useState<SegClipboard | null>(null);

  // ─── Add / delete segments ─────────────────────────────────────────────────

  const addSegment = useCallback(
    (group: TrackGroup, clickSec: number) => {
      if (group.kind === "plain-range") return; // can't add array items from timeline
      setSegsMap((prev) => {
        const segs = [...(prev[group.templatePath] ?? [])];
        const existingKind: SegmentKind = segs[0]?.kind ?? "time";
        const newSeg: ParsedSegment = {
          kind: existingKind,
          start: Math.max(0, clickSec),
          end: existingKind === "index"
            ? Math.round(clickSec) + 10
            : Math.min(totalDuration, clickSec + 5),
        };
        segs.push(newSeg);
        segs.sort((a, b) => a.start - b.start);
        commitRef.current(group.templatePath, segs);
        return { ...prev, [group.templatePath]: segs };
      });
    },
    [totalDuration]
  );

  const deleteSegment = useCallback((group: TrackGroup, segIdx: number) => {
    if (group.kind === "plain-range") {
      // Clear the range string on that array item
      if (!timeline || !preset) return;
      const path = group.concretePaths[segIdx];
      if (!path) return;
      const nextInputData = setAtPath(presetInputData, path, "");
      updatePresetInputData(timeline.id, preset.id, nextInputData);
      const latestTimeline = getEditedTimeline(timeline.id) || timeline;
      generateOutput(latestTimeline);
      setSelectedSeg((sel) =>
        sel?.templatePath === group.templatePath && sel.segIdx === segIdx ? null : sel
      );
      return;
    }
    setSegsMap((prev) => {
      const segs = (prev[group.templatePath] ?? []).filter((_, i) => i !== segIdx);
      commitRef.current(group.templatePath, segs);
      return { ...prev, [group.templatePath]: segs };
    });
    setSelectedSeg((sel) => {
      if (!sel || sel.templatePath !== group.templatePath) return sel;
      if (sel.segIdx === segIdx) return null;
      if (sel.segIdx > segIdx) return { ...sel, segIdx: sel.segIdx - 1 };
      return sel;
    });
  }, [timeline, preset, presetInputData, updatePresetInputData, getEditedTimeline, generateOutput]);

  // ─── Clipboard / edit ops ─────────────────────────────────────────────────

  const getGroup = useCallback(
    (tp: string) => trackGroups.find((g) => g.templatePath === tp),
    [trackGroups]
  );

  const canMutateMultiSeg = useCallback(
    (tp: string) => getGroup(tp)?.kind === "data-reference",
    [getGroup]
  );

  /** True when the track can grow/split segments (data-ref multi-seg OR plain array items). */
  const canEditSegStructure = useCallback(
    (tp: string) => {
      const g = getGroup(tp);
      if (!g) return false;
      if (g.kind === "data-reference") return true;
      // plain-range: only when paths look like array items we can clone
      return g.concretePaths.some((p) => parseArrayItemFieldPath(p) !== null);
    },
    [getGroup]
  );

  const isPlayheadInsideSeg = useCallback(
    (seg: ParsedSegment) => {
      const minGap = seg.kind === "index" ? 1 : MIN_SPLIT_GAP;
      return (
        currentTimeSec > seg.start &&
        currentTimeSec < seg.end &&
        currentTimeSec - seg.start >= minGap * 0.5 &&
        seg.end - currentTimeSec >= minGap * 0.5
      );
    },
    [currentTimeSec]
  );

  const copySelected = useCallback(() => {
    if (!selectedSeg) return;
    const segs = segsMap[selectedSeg.templatePath] ?? [];
    const seg = segs[selectedSeg.segIdx];
    if (!seg) return;
    setClipboard({ seg: { ...seg } });
  }, [selectedSeg, segsMap]);

  const cutSelected = useCallback(() => {
    if (!selectedSeg) return;
    const group = getGroup(selectedSeg.templatePath);
    if (!group) return;
    const segs = segsMap[selectedSeg.templatePath] ?? [];
    const seg = segs[selectedSeg.segIdx];
    if (!seg) return;
    setClipboard({ seg: { ...seg } });
    deleteSegment(group, selectedSeg.segIdx);
  }, [selectedSeg, segsMap, getGroup, deleteSegment]);

  const duplicateSelected = useCallback((sel?: SegSelection | null) => {
    const target = sel !== undefined ? sel : selectedSeg;
    if (!target || !canEditSegStructure(target.templatePath)) return;
    const group = getGroup(target.templatePath);
    if (!group) return;

    if (group.kind === "data-reference") {
      setSegsMap((prev) => {
        const segs = [...(prev[target.templatePath] ?? [])];
        const orig = segs[target.segIdx];
        if (!orig) return prev;
        const duration = orig.end - orig.start;
        const newStart =
          orig.kind === "index"
            ? Math.round(orig.end)
            : Math.min(totalDuration - 0.01, orig.end);
        const newEnd =
          orig.kind === "index"
            ? newStart + Math.max(1, Math.round(duration))
            : Math.min(totalDuration, newStart + duration);
        if (newEnd <= newStart) return prev;
        const dup: ParsedSegment = { kind: orig.kind, start: newStart, end: newEnd };
        segs.splice(target.segIdx + 1, 0, dup);
        segs.sort((a, b) => a.start - b.start);
        const newIdx = segs.findIndex(
          (s) => s.start === dup.start && s.end === dup.end && s.kind === dup.kind
        );
        commitRef.current(target.templatePath, segs);
        queueMicrotask(() => {
          setSelectedSeg({
            templatePath: target.templatePath,
            segIdx: newIdx >= 0 ? newIdx : segs.length - 1,
          });
        });
        return { ...prev, [target.templatePath]: segs };
      });
      return;
    }

    // plain-range: clone the array item and place the duplicate range after the original
    if (!timeline || !preset) return;
    const segs = segsMap[target.templatePath] ?? [];
    const orig = segs[target.segIdx];
    const path = group.concretePaths[target.segIdx];
    if (!orig || !path) return;
    const duration = orig.end - orig.start;
    const newStart =
      orig.kind === "index"
        ? Math.round(orig.end)
        : Math.min(totalDuration - 0.01, orig.end);
    const newEnd =
      orig.kind === "index"
        ? newStart + Math.max(1, Math.round(duration))
        : Math.min(totalDuration, newStart + duration);
    if (newEnd <= newStart) return;
    const dup: ParsedSegment = { kind: orig.kind, start: newStart, end: newEnd };
    const next = insertClonedArrayItemWithRange(
      presetInputData,
      path,
      serializeSegment(dup),
    );
    if (!next) return;
    updatePresetInputData(timeline.id, preset.id, next);
    const latestTimeline = getEditedTimeline(timeline.id) || timeline;
    generateOutput(latestTimeline);
    queueMicrotask(() => {
      setSelectedSeg({ templatePath: target.templatePath, segIdx: target.segIdx + 1 });
    });
  }, [
    selectedSeg,
    canEditSegStructure,
    getGroup,
    totalDuration,
    timeline,
    preset,
    segsMap,
    presetInputData,
    updatePresetInputData,
    getEditedTimeline,
    generateOutput,
  ]);

  const pasteClipboard = useCallback(() => {
    const targetTp =
      (selectedSeg && canMutateMultiSeg(selectedSeg.templatePath)
        ? selectedSeg.templatePath
        : trackGroups.find((g) => g.kind === "data-reference")?.templatePath) ?? null;
    if (!targetTp || !clipboard) return;
    const group = getGroup(targetTp);
    if (!group || group.kind !== "data-reference") return;

    setSegsMap((prev) => {
      const segs = [...(prev[targetTp] ?? [])];
      const duration = clipboard.seg.end - clipboard.seg.start;
      const kind: SegmentKind = segs[0]?.kind ?? clipboard.seg.kind;
      const start =
        kind === "index"
          ? Math.round(currentTimeSec)
          : Math.max(0, Math.min(totalDuration - 0.01, currentTimeSec));
      const end =
        kind === "index"
          ? start + Math.max(1, Math.round(duration))
          : Math.min(totalDuration, start + Math.max(MIN_SPLIT_GAP, duration));
      if (end <= start) return prev;
      const pasted: ParsedSegment = { kind, start, end };
      segs.push(pasted);
      segs.sort((a, b) => a.start - b.start);
      const newIdx = segs.findIndex(
        (s) => s.start === pasted.start && s.end === pasted.end && s.kind === pasted.kind
      );
      commitRef.current(targetTp, segs);
      queueMicrotask(() => {
        setSelectedSeg({ templatePath: targetTp, segIdx: newIdx >= 0 ? newIdx : segs.length - 1 });
      });
      return { ...prev, [targetTp]: segs };
    });
  }, [selectedSeg, canMutateMultiSeg, trackGroups, clipboard, getGroup, currentTimeSec, totalDuration]);

  const splitAtPlayhead = useCallback(
    (sel?: SegSelection | null) => {
      const preferred = sel !== undefined ? sel : selectedSeg;

      const resolveTarget = (): SegSelection | null => {
        if (
          preferred &&
          canEditSegStructure(preferred.templatePath) &&
          (() => {
            const s = (segsMap[preferred.templatePath] ?? [])[preferred.segIdx];
            return !!s && isPlayheadInsideSeg(s);
          })()
        ) {
          return preferred;
        }
        for (const g of trackGroups) {
          if (!canEditSegStructure(g.templatePath)) continue;
          const segs = segsMap[g.templatePath] ?? [];
          const fi = segs.findIndex((s) => isPlayheadInsideSeg(s));
          if (fi >= 0) return { templatePath: g.templatePath, segIdx: fi };
        }
        return null;
      };

      const resolved = resolveTarget();
      if (!resolved) return;
      const { templatePath: tp, segIdx: idx } = resolved;
      const group = getGroup(tp);
      if (!group) return;
      const orig = (segsMap[tp] ?? [])[idx];
      if (!orig || !isPlayheadInsideSeg(orig)) return;

      const cutAt = orig.kind === "index" ? Math.round(currentTimeSec) : currentTimeSec;
      if (cutAt <= orig.start || cutAt >= orig.end) return;

      const left: ParsedSegment = { ...orig, end: cutAt };
      const right: ParsedSegment = { ...orig, start: cutAt };

      if (group.kind === "data-reference") {
        setSegsMap((prev) => {
          const segs = [...(prev[tp] ?? [])];
          segs.splice(idx, 1, left, right);
          commitRef.current(tp, segs);
          queueMicrotask(() => {
            setSelectedSeg({ templatePath: tp, segIdx: idx + 1 });
          });
          return { ...prev, [tp]: segs };
        });
        return;
      }

      // plain-range: shorten current item, clone sibling for the right half
      if (!timeline || !preset) return;
      const path = group.concretePaths[idx];
      if (!path) return;
      let next = setAtPath(presetInputData, path, serializeSegment(left));
      next = insertClonedArrayItemWithRange(next, path, serializeSegment(right));
      if (!next) return;
      updatePresetInputData(timeline.id, preset.id, next);
      const latestTimeline = getEditedTimeline(timeline.id) || timeline;
      generateOutput(latestTimeline);
      queueMicrotask(() => {
        setSelectedSeg({ templatePath: tp, segIdx: idx + 1 });
      });
    },
    [
      selectedSeg,
      trackGroups,
      segsMap,
      isPlayheadInsideSeg,
      canEditSegStructure,
      currentTimeSec,
      getGroup,
      timeline,
      preset,
      presetInputData,
      updatePresetInputData,
      getEditedTimeline,
      generateOutput,
    ]
  );

  const canSplitSelected = useMemo(() => {
    // Enable whenever the playhead sits inside any editable segment
    return trackGroups.some((g) => {
      if (!canEditSegStructure(g.templatePath)) return false;
      return (segsMap[g.templatePath] ?? []).some(isPlayheadInsideSeg);
    });
  }, [trackGroups, segsMap, isPlayheadInsideSeg, canEditSegStructure]);

  const canDuplicateSelected = useMemo(() => {
    if (!selectedSeg) return false;
    return canEditSegStructure(selectedSeg.templatePath);
  }, [selectedSeg, canEditSegStructure]);

  const canPaste = useMemo(
    () => !!clipboard && trackGroups.some((g) => g.kind === "data-reference"),
    [clipboard, trackGroups]
  );

  // Keyboard shortcuts when timeline panel is mounted
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable ||
          el.closest("[contenteditable=true]"))
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        if (!selectedSeg) return;
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        if (!selectedSeg) return;
        e.preventDefault();
        cutSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        if (!clipboard) return;
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && (e.key === "\\" || e.code === "Backslash")) {
        e.preventDefault();
        splitAtPlayhead();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedSeg) {
        const group = getGroup(selectedSeg.templatePath);
        if (!group) return;
        e.preventDefault();
        deleteSegment(group, selectedSeg.segIdx);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    duplicateSelected,
    copySelected,
    cutSelected,
    pasteClipboard,
    splitAtPlayhead,
    selectedSeg,
    clipboard,
    getGroup,
    deleteSegment,
  ]);

  // Clear selection when preset switches
  useEffect(() => {
    setSelectedSeg(null);
  }, [preset?.id]);

  // ─── Scroll sync ───────────────────────────────────────────────────────────

  const rulerRef = useRef<HTMLDivElement>(null);
  const rulerInnerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelScrollRef = useRef<HTMLDivElement>(null);

  // Sync the ruler to the track area's horizontal scroll. We translate the inner
  // content (reliable across browsers) rather than setting scrollLeft on an
  // overflow-hidden element.
  const syncRulerScroll = useCallback((scrollLeft: number) => {
    if (rulerInnerRef.current) {
      rulerInnerRef.current.style.transform = `translateX(${-scrollLeft}px)`;
    }
  }, []);

  const onScroll = useCallback(() => {
    const s = scrollRef.current;
    if (!s) return;
    syncRulerScroll(s.scrollLeft);
    if (labelScrollRef.current) labelScrollRef.current.scrollTop = s.scrollTop;
  }, [syncRulerScroll]);

  // ── Stable refs (avoid stale closures in scroll-to-playhead) ─────────────
  const pixelsPerSecondRef = useRef(pixelsPerSecond);
  const currentTimeSecRef = useRef(currentTimeSec);
  useEffect(() => { pixelsPerSecondRef.current = pixelsPerSecond; }, [pixelsPerSecond]);
  useEffect(() => { currentTimeSecRef.current = currentTimeSec; }, [currentTimeSec]);

  /**
   * Scroll so the playhead sits at ~35 % from the left edge.
   * Uses refs so the snapshot is always current, regardless of when called.
   */
  const scrollToPlayhead = useCallback(() => {
    requestAnimationFrame(() => {
      const s = scrollRef.current;
      if (!s) return;
      const px = currentTimeSecRef.current * pixelsPerSecondRef.current;
      const target = Math.max(0, px - s.clientWidth * 0.35);
      s.scrollLeft = target;
      syncRulerScroll(target);
    });
  }, [syncRulerScroll]);

  // On mount → jump to playhead
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToPlayhead(); }, []);

  // When track data changes (preset switch, segment edit) → keep playhead in view
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToPlayhead(); }, [trackGroupsKey]);

  // When zoom changes → anchor view on the playhead, not on position 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToPlayhead(); }, [pixelsPerSecond]);

  // During playback → follow the playhead if it drifts outside the middle 70 % of the view
  const prevFrameRef = useRef(currentFrame);
  useEffect(() => {
    if (currentFrame === prevFrameRef.current) return;
    prevFrameRef.current = currentFrame;
    const s = scrollRef.current;
    if (!s) return;
    const px = secToPx(currentTimeSec);
    const visL = s.scrollLeft + s.clientWidth * 0.15;
    const visR = s.scrollLeft + s.clientWidth * 0.85;
    if (px < visL || px > visR) {
      const target = Math.max(0, px - s.clientWidth * 0.35);
      s.scrollLeft = target;
      syncRulerScroll(target);
    }
  }, [currentFrame, currentTimeSec, secToPx, syncRulerScroll]);

  // ─── Ruler click → seek ──────────────────────────────────────────────────

  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const sec = Math.max(0, Math.min(totalDuration, pxToSec(px)));
      const frame = Math.round(sec * fps);
      playerRef.current?.seekTo(frame);
      setCurrentFrame(frame);
    },
    [pxToSec, fps, totalDuration, playerRef, setCurrentFrame]
  );

  // ─── Ruler ticks ──────────────────────────────────────────────────────────

  const rulerTicks = useMemo(() => {
    const minPx = 40;
    const rawSec = minPx / pixelsPerSecond;
    const nice = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const interval = nice.find((i) => i >= rawSec) ?? 300;
    const ticks: { sec: number; major: boolean }[] = [];
    let idx = 0;
    for (let t = 0; t <= totalDuration + 0.001; t = parseFloat((t + interval).toFixed(6))) {
      ticks.push({ sec: t, major: idx % 5 === 0 });
      idx++;
    }
    return ticks;
  }, [pixelsPerSecond, totalDuration]);

  const playheadPx = secToPx(currentTimeSec);

  // ─── Empty states ──────────────────────────────────────────────────────────

  if (!isPresetSelected || !timeline || !preset) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          Select a preset in the left panel to view its timeline ranges.
        </p>
      </div>
    );
  }

  if (trackGroups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          This preset has no timeline-linked ranges. Link a data reference in the right panel.
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 bg-background select-none" onWheel={handleWheel}>

      {/* ── Control bar ── */}
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b bg-muted/10">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => playerRef.current?.play()} title="Play">
          <Play className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => playerRef.current?.pause()} title="Pause">
          <Pause className="h-3 w-3" />
        </Button>
        <span className="text-xs font-mono text-muted-foreground min-w-[52px]">{formatTimeLabel(currentTimeSec)}</span>
        <span className="text-xs text-muted-foreground/40">/</span>
        <span className="text-xs font-mono text-muted-foreground/40">{formatTimeLabel(totalDuration)}</span>
        <div className="h-4 w-px bg-border mx-1" />
        <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={preset.label}>
          {preset.label || "Preset"}
        </span>
        <div className="flex-1" />

        {/* Timeline edit tools — immediately left of zoom */}
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-6 w-6", !canSplitSelected && "opacity-40")}
            disabled={!canSplitSelected}
            onClick={() => splitAtPlayhead()}
            title="Split at playhead (⌘\)"
          >
            <Scissors className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-6 w-6", !selectedSeg && "opacity-40")}
            disabled={!selectedSeg}
            onClick={cutSelected}
            title="Cut (⌘X)"
          >
            <ClipboardX className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-6 w-6", !selectedSeg && "opacity-40")}
            disabled={!selectedSeg}
            onClick={copySelected}
            title="Copy (⌘C)"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-6 w-6", !canPaste && "opacity-40")}
            disabled={!canPaste}
            onClick={pasteClipboard}
            title="Paste at playhead (⌘V)"
          >
            <ClipboardPaste className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-6 w-6", !canDuplicateSelected && "opacity-40")}
            disabled={!canDuplicateSelected}
            onClick={() => duplicateSelected()}
            title="Duplicate (⌘D)"
          >
            <CopyPlus className="h-3 w-3" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border mx-1" />
        <span className="text-[10px] text-muted-foreground/40 hidden sm:block">Ctrl+scroll to zoom</span>
        <div className="h-4 w-px bg-border mx-1" />
        {/* Fit = show whole timeline at once */}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={fitToView}
          title="Fit full timeline in view (min zoom)"
        >
          Fit
        </Button>
        <div className="h-4 w-px bg-border" />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p / 1.3)))}
          title="Zoom out"
        >
          <ZoomOut className="h-3 w-3" />
        </Button>
        {/* Log-scale slider: 0 = fit-in-view, 100 = max zoom */}
        <Slider
          min={0}
          max={100}
          step={1}
          value={[ppsToSlider(pixelsPerSecond)]}
          onValueChange={(v) => setPixelsPerSecond(sliderToPps(v[0] ?? 0))}
          className="w-24"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setPixelsPerSecond((p) => Math.min(MAX_PPS, Math.max(minPps, p * 1.3)))}
          title="Zoom in"
        >
          <ZoomIn className="h-3 w-3" />
        </Button>
      </div>

      {/* ── Timeline body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Fixed label column */}
        <div className="shrink-0 border-r border-border/60 flex flex-col bg-background" style={{ width: LABEL_WIDTH }}>
          {/* Ruler placeholder */}
          <div className="shrink-0 border-b border-border/40 bg-muted/20" style={{ height: RULER_HEIGHT }} />
          {/* Track labels */}
          <div className="flex-1 overflow-y-hidden" ref={labelScrollRef}>
            {trackGroups.map((group, ti) => {
              const segs = segsMap[group.templatePath] ?? [];
              const isPlain = group.kind === "plain-range";
              return (
                <div
                  key={group.templatePath}
                  className="flex items-center gap-1 px-2 border-b border-border/40 bg-background"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-semibold truncate"
                      title={group.label}
                    >
                      {group.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground/50 truncate">
                      {isPlain
                        ? `${group.key} · ${segs.length} item${segs.length !== 1 ? "s" : ""}`
                        : `ref: ${group.key} · ${segs.length} seg${segs.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  {!isPlain && (
                    <button
                      type="button"
                      className="shrink-0 p-0.5 rounded hover:bg-accent text-muted-foreground/40 hover:text-primary transition-colors"
                      title="Add segment at playhead"
                      onClick={() => addSegment(group, currentTimeSec)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                  {isPlain && (
                    <span className="shrink-0 text-[8px] text-muted-foreground/30 uppercase tracking-wide" title="Add/remove items via the right panel form">
                      form
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: ruler + tracks — ref used by ResizeObserver for dynamic min zoom */}
        <div className="flex flex-col flex-1 min-w-0" ref={trackRightRef}>

          {/* Ruler */}
          <div
            className="shrink-0 overflow-hidden border-b border-border/40 bg-muted/20 cursor-pointer relative"
            style={{ height: RULER_HEIGHT }}
            ref={rulerRef}
          >
            <div
              ref={rulerInnerRef}
              className="absolute top-0 left-0 bottom-0 will-change-transform"
              style={{ width: totalWidth, minWidth: "100%" }}
              onClick={handleRulerClick}
            >
              {rulerTicks.map(({ sec, major }) => (
                <div key={sec} className="absolute top-0 bottom-0" style={{ left: secToPx(sec) }}>
                  <div className={cn("w-px", major ? "h-3 bg-muted-foreground/50" : "h-1.5 bg-muted-foreground/20")} />
                  {major && (
                    <span className="absolute top-3 left-0.5 text-[9px] text-muted-foreground/60 whitespace-nowrap pointer-events-none">
                      {formatTimeLabel(sec)}
                    </span>
                  )}
                </div>
              ))}
              {/* Playhead on ruler */}
              <div className="absolute top-0 bottom-0 pointer-events-none z-10" style={{ left: playheadPx }}>
                <div
                  className="absolute -translate-x-1/2 top-0"
                  style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "8px solid hsl(var(--primary))" }}
                />
                <div className="absolute top-2 -translate-x-px w-px h-4 bg-primary/70" />
              </div>
            </div>
          </div>

          {/* Track rows */}
          <div className="flex-1 overflow-auto" ref={scrollRef} onScroll={onScroll}>
            <div className="relative" style={{ width: totalWidth, minWidth: "100%" }}>
              {trackGroups.map((group, ti) => {
                const segs = segsMap[group.templatePath] ?? [];
                const color = TRACK_COLORS[ti % TRACK_COLORS.length]!;
                const isPlain = group.kind === "plain-range";

                return (
                  <div
                    key={group.templatePath}
                    className="relative border-b border-border/40 hover:bg-muted/5 transition-colors"
                    style={{ height: ROW_HEIGHT }}
                    onPointerMove={(e) => handlePointerMove(e, group.templatePath)}
                    onPointerUp={(e) => handlePointerUp(e, group.templatePath)}
                    onPointerDown={(e) => {
                      // Clear selection only when clicking empty track (not a segment)
                      if (e.target === e.currentTarget) setSelectedSeg(null);
                    }}
                    onDoubleClick={(e) => {
                      if (isPlain) return;
                      const containerLeft = scrollRef.current?.getBoundingClientRect().left ?? 0;
                      const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
                      const px = e.clientX - containerLeft + scrollLeft;
                      addSegment(group, pxToSec(px));
                    }}
                  >
                    {segs.map((seg, si) => {
                      const left = secToPx(seg.start);
                      const width = Math.max(MIN_SEG_PX, secToPx(seg.end - seg.start));
                      const isSelected =
                        selectedSeg?.templatePath === group.templatePath &&
                        selectedSeg.segIdx === si;
                      // For plain-range, show the concrete path index as a hint
                      const innerLabel = isPlain
                        ? (() => {
                          const cp = group.concretePaths[si] ?? "";
                          // Extract the array index: "images[2].rangeString" → "[2]"
                          const idxMatch = cp.match(/\[(\d+)\]/);
                          const idx = idxMatch ? `[${idxMatch[1]}] ` : "";
                          return `${idx}${formatTimeLabel(seg.start)}–${formatTimeLabel(seg.end)}`;
                        })()
                        // For index-kind segments show item indices, not time labels
                        : seg.kind === "index"
                          ? `[${Math.round(seg.start)}–${Math.round(seg.end)}]`
                          : `${formatTimeLabel(seg.start)}–${formatTimeLabel(seg.end)}`;

                      const canDup = canEditSegStructure(group.templatePath);
                      const canSplitThis = canDup && isPlayheadInsideSeg(seg);

                      return (
                        <SegBlock
                          key={si}
                          left={left}
                          width={width}
                          color={color}
                          isSelected={isSelected}
                          innerLabel={innerLabel}
                          canDuplicate={canDup}
                          canSplit={canSplitThis}
                          onSelect={() =>
                            setSelectedSeg({ templatePath: group.templatePath, segIdx: si })
                          }
                          onMoveDown={(e) => startDrag(e, "move", group.templatePath, si, seg, group.kind)}
                          onLeftDown={(e) => startDrag(e, "left", group.templatePath, si, seg, group.kind)}
                          onRightDown={(e) => startDrag(e, "right", group.templatePath, si, seg, group.kind)}
                          onPointerMove={(e) => handlePointerMove(e, group.templatePath)}
                          onPointerUp={(e) => handlePointerUp(e, group.templatePath)}
                          onDelete={() => deleteSegment(group, si)}
                          onDuplicate={() =>
                            duplicateSelected({ templatePath: group.templatePath, segIdx: si })
                          }
                          onSplit={() =>
                            splitAtPlayhead({ templatePath: group.templatePath, segIdx: si })
                          }
                          onCopy={() => {
                            setSelectedSeg({ templatePath: group.templatePath, segIdx: si });
                            setClipboard({ seg: { ...seg } });
                          }}
                          onCut={() => {
                            setClipboard({ seg: { ...seg } });
                            deleteSegment(group, si);
                          }}
                        />
                      );
                    })}

                    {segs.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-muted-foreground/25">
                          {isPlain ? "No range set" : "Double-click to add a segment"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Playhead line through all tracks */}
              <div
                className="absolute top-0 bottom-0 w-px bg-primary/70 pointer-events-none z-20"
                style={{ left: playheadPx }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
