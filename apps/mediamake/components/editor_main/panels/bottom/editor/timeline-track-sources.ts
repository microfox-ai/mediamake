import type { ReferenceItem } from "@/components/editor/presets/types";
import type { TimelineAction } from "@/components/editor/presets/actions/types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import type { SelectedItem } from "@/components/editor_main/stores/editor-store";
import { presetTrackName } from "@/components/editor_main/timing/preset-track-name";
import {
  collectRawRanges,
  parseEditableSegments,
  type ParsedSegment,
} from "./preset-range-utils";

/**
 * A pluggable track source on a timeline.
 * Overview mode renders one section per source inside a shared TimelineShell.
 * Focused mode renders a single source.
 */
export type TimelineTrackSource =
  | {
      kind: "preset";
      id: string;
      presetId: string;
      label: string;
    }
  | {
      kind: "captions-reference";
      id: string;
      referenceIndex: number;
      key: string;
      reference: ReferenceItem;
    }
  | {
      kind: "action";
      id: string;
      actionId: string;
      label: string;
      action: TimelineAction;
    };

/**
 * Timed spans stored on an action (input or the selected/favorite output).
 * Empty when the action has no ranges — those actions stay off the timeline.
 */
export function collectActionTimelineSegments(
  action: TimelineAction,
): ParsedSegment[] {
  const selected =
    action.outputs?.find((output) => output.id === action.selectedOutputId) ??
    action.outputs?.find((output) => output.isFavorite);

  const blobs: unknown[] = [action.inputData];
  if (selected?.payload !== undefined) blobs.push(selected.payload);

  const segments: ParsedSegment[] = [];
  for (const blob of blobs) {
    for (const raw of collectRawRanges(blob)) {
      segments.push(...parseEditableSegments(raw.range));
    }
  }
  return segments;
}

/** Latest end among an action's timeline ranges. */
export function actionTimelineEnd(actions: readonly TimelineAction[]): number {
  let end = 0;
  for (const action of actions) {
    for (const segment of collectActionTimelineSegments(action)) {
      if (segment.end > end) end = segment.end;
    }
  }
  return end;
}

/**
 * Action ranges show when that action is selected, or when the preset,
 * block, or reference it targets is selected. A selected timeline does not.
 */
export function actionRangesVisible(
  action: Pick<TimelineAction, "id" | "target">,
  selected: {
    type: string;
    item?: { id?: string; key?: string };
  } | null,
): boolean {
  if (!selected) return false;
  if (selected.type === "action") return selected.item?.id === action.id;
  if (selected.type === "preset") {
    return (
      action.target?.type === "preset" &&
      !!selected.item?.id &&
      selected.item.id === action.target.presetInstanceId
    );
  }
  if (selected.type === "reference") {
    return (
      action.target?.type === "reference" &&
      !!selected.item?.key &&
      selected.item.key === action.target.referenceKey
    );
  }
  return false;
}

/**
 * Discover every track-bearing source on a timeline.
 * Order: presets → caption references → actions.
 */
export function collectTimelineTrackSources(
  timeline: Timeline,
): TimelineTrackSource[] {
  const sources: TimelineTrackSource[] = [];

  for (const preset of timeline.presets ?? []) {
    if (preset.disabled) continue;
    sources.push({
      kind: "preset",
      id: `preset:${preset.id}`,
      presetId: preset.id,
      label: presetTrackName(preset, "Preset"),
    });
  }

  const references = (timeline.defaultData?.references ?? []) as ReferenceItem[];
  references.forEach((ref, index) => {
    if (ref?.type !== "captions") return;
    sources.push({
      kind: "captions-reference",
      id: `ref:${index}:${ref.key || "captions"}`,
      referenceIndex: index,
      key: ref.key || "captions",
      reference: ref,
    });
  });

  for (const action of timeline.actions ?? []) {
    sources.push({
      kind: "action",
      id: `action:${action.id}`,
      actionId: action.id,
      label: action.label || action.actionId || "Action",
      action,
    });
  }

  return sources;
}

/** Resolve the active timeline from editor selection. */
export function timelineFromSelection(
  selectedItem: SelectedItem | null,
): Timeline | null {
  if (!selectedItem) return null;
  if (selectedItem.type === "timeline") return selectedItem.item;
  return selectedItem.timeline ?? null;
}
