"use client";

import { useMemo } from "react";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import type { ReferenceItem } from "@/components/editor/presets/types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { findAudioMediaClipsFromTimeline } from "@/components/editor/presets/actions/engine/find-audio-media";
import { TimelineShell } from "./TimelineShell";
import { CaptionsTracksSection } from "./sections/CaptionsTracksSection";

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

  if (liveReference.type !== "captions") {
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

  return (
    <CaptionsReferenceFocused
      reference={liveReference}
      referenceIndex={referenceIndex}
      timelineId={timeline.id}
      effectiveTimeline={effectiveTimeline}
      fps={calculatedMetadata?.fps ?? 30}
      durationInFrames={calculatedMetadata?.durationInFrames}
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
}: {
  reference: ReferenceItem;
  referenceIndex: number;
  timelineId: string;
  effectiveTimeline: Timeline;
  fps: number;
  durationInFrames?: number;
}) {
  const audioClips = useMemo(
    () => findAudioMediaClipsFromTimeline(effectiveTimeline),
    [effectiveTimeline],
  );

  const compiledSec =
    durationInFrames && durationInFrames > 0 ? durationInFrames / fps : 0;
  const configSec = Number(
    effectiveTimeline.configuration?.config?.duration || 0,
  );
  const totalDuration = Math.max(1, compiledSec || configSec || 60);

  return (
    <TimelineShell
      totalDuration={totalDuration}
      title={reference.key || "captions"}
      audioClips={audioClips}
      emptyMessage="This captions reference has no lines yet."
    >
      <CaptionsTracksSection
        sectionId={`ref:${referenceIndex}:${reference.key || "captions"}`}
        order={0}
        timelineId={timelineId}
        referenceIndex={referenceIndex}
        reference={reference}
        showHeader={false}
      />
    </TimelineShell>
  );
}
