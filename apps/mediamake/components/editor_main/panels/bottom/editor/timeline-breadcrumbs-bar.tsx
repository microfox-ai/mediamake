"use client";

import { Fragment, useMemo } from "react";
import type { ReferenceItem } from "@/components/editor/presets/types";
import { loadInstanceTree } from "@/components/editor_main/timing/load-instance-tree";
import { useEditorStore } from "@/components/editor_main/stores/editor-store";
import { useProjectStore } from "@/components/editor_main/stores/project-store";
import { useTimelineEditsStore } from "@/components/editor_main/stores/timeline-edits-store";
import { useCaptionTrackSelection } from "@/components/editor_main/stores/caption-track-selection";
import {
  clearTimelineDepth,
  useTimelineBlockFocus,
} from "@/components/editor_main/stores/timeline-block-focus";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  buildTimelineBreadcrumbs,
  presetBreadcrumbPath,
  type BreadcrumbTarget,
} from "./timeline-breadcrumbs";

function lineLabel(reference: ReferenceItem | undefined, lineIdx: number): string {
  const captions = reference?.value?.captions;
  const line = Array.isArray(captions) ? captions[lineIdx] : undefined;
  const text =
    line && typeof line === "object" && typeof line.text === "string"
      ? line.text.trim()
      : "";
  return text.slice(0, 40) || `Line ${lineIdx + 1}`;
}

function activeTimeline() {
  const selected = useEditorStore.getState().selectedItem;
  const loaded = useProjectStore.getState().loadedTimeline;
  const base =
    selected?.type === "timeline"
      ? selected.item
      : selected && "timeline" in selected
        ? selected.timeline
        : loaded;
  if (!base) return null;
  return useTimelineEditsStore.getState().getEditedTimeline(base.id) || base;
}

function followCrumb(target: BreadcrumbTarget) {
  if (target.type === "line") {
    const caption = useCaptionTrackSelection.getState().selection;
    if (!caption || caption.referenceIndex !== target.referenceIndex) return;
    useCaptionTrackSelection.getState().setSelection({
      timelineId: caption.timelineId,
      referenceIndex: caption.referenceIndex,
      kind: "line",
      lineIdx: target.lineIdx,
    });
    return;
  }

  const timeline = activeTimeline();
  if (!timeline) return;
  clearTimelineDepth();
  const editor = useEditorStore.getState();
  if (target.type === "timeline") {
    editor.selectTimeline(timeline);
    return;
  }
  if (target.type === "preset") {
    const preset = timeline.presets?.find((item) => item.id === target.presetId);
    if (preset) editor.selectPreset(preset, timeline);
    return;
  }
  const references = (timeline.defaultData?.references ?? []) as ReferenceItem[];
  const reference = references[target.referenceIndex];
  if (reference) editor.selectReference(reference, timeline, target.referenceIndex);
}

/** Clickable selection trail shown in the bottom timeline header. */
export function TimelineBreadcrumbs() {
  const selectedItem = useEditorStore((s) => s.selectedItem);
  const loadedTimeline = useProjectStore((s) => s.loadedTimeline);
  const timelineId =
    selectedItem?.type === "timeline"
      ? selectedItem.item.id
      : selectedItem
        ? selectedItem.timeline.id
        : loadedTimeline?.id ?? null;
  const editedTimeline = useTimelineEditsStore((s) =>
    timelineId ? s.editedTimelines.get(timelineId) : undefined,
  );
  const timeline =
    editedTimeline ||
    (selectedItem?.type === "timeline"
      ? selectedItem.item
      : selectedItem?.timeline) ||
    loadedTimeline;
  const caption = useCaptionTrackSelection((s) => s.selection);
  const focus = useTimelineBlockFocus((s) => s.focus);

  const steps = useMemo(() => {
    const references = (timeline?.defaultData?.references ?? []) as ReferenceItem[];
    const captionApplies =
      Boolean(
        caption &&
          timeline &&
          caption.timelineId === timeline.id &&
          references[caption.referenceIndex],
      ) &&
      (selectedItem?.type === "reference"
        ? selectedItem.referenceIndex === caption?.referenceIndex
        : selectedItem?.type !== "preset");
    const blockApplies =
      !captionApplies &&
      Boolean(
        focus &&
          timeline &&
          focus.timelineId === timeline.id &&
          (selectedItem?.type === "preset"
            ? selectedItem.item.id === focus.presetId
            : selectedItem?.type !== "reference"),
      );
    const pathId = blockApplies
      ? focus?.presetId
      : selectedItem?.type === "preset"
        ? selectedItem.item.id
        : null;
    const tree = timeline ? loadInstanceTree(timeline) : null;
    const presetPath =
      tree && pathId ? presetBreadcrumbPath(tree, pathId) : [];

    let reference: { index: number; label: string } | null = null;
    if (selectedItem?.type === "reference") {
      const live = references[selectedItem.referenceIndex];
      reference = {
        index: selectedItem.referenceIndex,
        label: live?.key || selectedItem.item.key || "Reference",
      };
    } else if (captionApplies && caption) {
      reference = {
        index: caption.referenceIndex,
        label: references[caption.referenceIndex]?.key || "Reference",
      };
    }

    const leaf =
      captionApplies && caption
        ? {
            type: "line" as const,
            label: lineLabel(references[caption.referenceIndex], caption.lineIdx),
            lineIdx: caption.lineIdx,
            word: caption.kind === "word",
          }
        : blockApplies && focus
          ? { type: "block" as const, label: focus.label }
          : null;

    return buildTimelineBreadcrumbs({
      selection: selectedItem?.type ?? "none",
      presetPath,
      reference,
      actionLabel:
        selectedItem?.type === "action"
          ? selectedItem.item.label || "Action"
          : null,
      leaf,
    });
  }, [caption, focus, selectedItem, timeline]);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:gap-1">
        {steps.map((step, index) => (
          <Fragment key={step.key}>
            {index > 0 ? (
              <BreadcrumbSeparator className="[&>svg]:size-3" />
            ) : null}
            <BreadcrumbItem className="min-w-0">
              {step.target ? (
                <BreadcrumbLink asChild className="text-xs">
                  <button
                    type="button"
                    className="max-w-[140px] cursor-pointer truncate bg-transparent p-0 text-left"
                    title={step.label}
                    onClick={() => followCrumb(step.target!)}
                  >
                    {step.label}
                  </button>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="max-w-[180px] truncate text-xs" title={step.label}>
                  {step.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
