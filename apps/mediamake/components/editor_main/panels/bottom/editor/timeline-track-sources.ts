import type { ReferenceItem } from "@/components/editor/presets/types";
import type { TimelineAction } from "@/components/editor/presets/actions/types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import type { SelectedItem } from "@/components/editor_main/stores/editor-store";

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
 * Discover every track-bearing source on a timeline.
 * Order: presets → caption references → actions (future track UIs).
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
      label: preset.label || "Preset",
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
