"use client";

import { useEditorStore, type SelectedItem } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import type { ReferenceItem } from "@/components/editor/presets/types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { useCompiledAudioClips } from "./use-compiled-audio-clips";
import { TimelineShell } from "./TimelineShell";
import { CaptionsTracksSection } from "./sections/CaptionsTracksSection";
import { LinkedActionTracks } from "./sections/ActionTracksSection";
import {
  actionRangesVisible,
  actionTimelineEnd,
} from "./timeline-track-sources";

/**
 * Routes the bottom-panel timeline view when a reference is selected.
 * Captions use CaptionsTracksSection (same component as timeline overview).
 */
export function ReferenceTimelineContent() {
  const { selectedItem } = useEditorStore();
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);

  const timelineId =
    selectedItem?.type === "reference" ? selectedItem.timeline.id : null;
  const editedTimeline = useTimelineEditsStore((s) =>
    timelineId ? s.editedTimelines.get(timelineId) : undefined,
  );
  const clipTimeline =
    selectedItem?.type === "reference"
      ? editedTimeline || selectedItem.timeline
      : null;
  const audioClips = useCompiledAudioClips(clipTimeline);

  if (!selectedItem || selectedItem.type !== "reference") {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          Select a reference in the left panel to edit its timeline.
        </p>
      </div>
    );
  }

  const { item: reference, timeline, referenceIndex } = selectedItem;
  const effectiveTimeline = editedTimeline || timeline;
  const liveReference =
    (effectiveTimeline.defaultData?.references?.[referenceIndex] as
      | ReferenceItem
      | undefined) || reference;

  const linkedActionEnd = actionTimelineEnd(
    (effectiveTimeline.actions ?? []).filter((action) =>
      actionRangesVisible(action, selectedItem),
    ),
  );

  if (liveReference.type !== "captions") {
    if (linkedActionEnd <= 0) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">
            Timeline editing for{" "}
            <span className="font-medium text-foreground">
              {liveReference.type}
            </span>{" "}
            references is not available yet. Captions references support word/line
            timing.
          </p>
        </div>
      );
    }
    const fps = calculatedMetadata?.fps ?? 30;
    const compiledSec =
      calculatedMetadata?.durationInFrames &&
      calculatedMetadata.durationInFrames > 0
        ? calculatedMetadata.durationInFrames / fps
        : 0;
    const configSec = Number(
      effectiveTimeline.configuration?.config?.duration || 0,
    );
    return (
      <TimelineShell
        totalDuration={Math.max(1, compiledSec || configSec || 60, linkedActionEnd)}
        audioClips={audioClips}
        emptyMessage="This reference has no action ranges."
      >
        <LinkedActionTracks
          actions={effectiveTimeline.actions}
          selected={selectedItem}
        />
      </TimelineShell>
    );
  }

  return (
    <CaptionsReferenceFocused
      reference={liveReference}
      referenceIndex={referenceIndex}
      timelineId={timeline.id}
      effectiveTimeline={effectiveTimeline}
      fps={calculatedMetadata?.fps ?? 30}
      durationInFrames={calculatedMetadata?.durationInFrames}
      linkedActionEnd={linkedActionEnd}
      selected={selectedItem}
      audioClips={audioClips}
    />
  );
}

function CaptionsReferenceFocused({
  reference,
  referenceIndex,
  timelineId,
  effectiveTimeline,
  fps,
  durationInFrames,
  linkedActionEnd,
  selected,
  audioClips,
}: {
  reference: ReferenceItem;
  referenceIndex: number;
  timelineId: string;
  effectiveTimeline: Timeline;
  fps: number;
  durationInFrames?: number;
  linkedActionEnd: number;
  selected: SelectedItem;
  audioClips: ReturnType<typeof useCompiledAudioClips>;
}) {
  const compiledSec =
    durationInFrames && durationInFrames > 0 ? durationInFrames / fps : 0;
  const configSec = Number(
    effectiveTimeline.configuration?.config?.duration || 0,
  );
  const totalDuration = Math.max(
    1,
    compiledSec || configSec || 60,
    linkedActionEnd,
  );

  return (
    <TimelineShell
      totalDuration={totalDuration}
      audioClips={audioClips}
      emptyMessage="This captions reference has no lines yet."
    >
      <CaptionsTracksSection
        sectionId={`ref:${referenceIndex}:${reference.key || "captions"}`}
        order={0}
        timelineId={timelineId}
        referenceIndex={referenceIndex}
        reference={reference}
      />
      <LinkedActionTracks
        actions={effectiveTimeline.actions}
        selected={selected}
      />
    </TimelineShell>
  );
}
