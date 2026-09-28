"use client";

import { useMemo } from "react";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import { useProjectStore } from "../../../stores/project-store";
import { findAudioMediaClipsFromTimeline } from "@/components/editor/presets/actions/engine/find-audio-media";
import { TimelineShell } from "./TimelineShell";
import {
  collectTimelineTrackSources,
  timelineFromSelection,
} from "./timeline-track-sources";
import { PresetTracksSection } from "./sections/PresetTracksSection";
import { CaptionsTracksSection } from "./sections/CaptionsTracksSection";
import { ActionTracksSection } from "./sections/ActionTracksSection";

/**
 * Timeline-level bottom panel: renders ALL track sources
 * (presets + caption references + actions) inside one shared shell.
 */
export function TimelineOverviewContent() {
  const { selectedItem } = useEditorStore();
  const loadedTimeline = useProjectStore((s) => s.loadedTimeline);
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);

  const baseTimeline =
    timelineFromSelection(selectedItem) || loadedTimeline;
  const timelineId = baseTimeline?.id ?? null;
  const effectiveTimeline = timelineId
    ? getEditedTimeline(timelineId) || baseTimeline
    : null;

  const sources = useMemo(
    () =>
      effectiveTimeline ? collectTimelineTrackSources(effectiveTimeline) : [],
    [effectiveTimeline],
  );

  const audioClips = useMemo(
    () => findAudioMediaClipsFromTimeline(effectiveTimeline ?? undefined),
    [effectiveTimeline],
  );

  const fps = calculatedMetadata?.fps ?? 30;
  const compiledSec =
    calculatedMetadata?.durationInFrames &&
    calculatedMetadata.durationInFrames > 0
      ? calculatedMetadata.durationInFrames / fps
      : 0;
  const configSec = Number(
    effectiveTimeline?.configuration?.config?.duration || 0,
  );
  const totalDuration = Math.max(1, compiledSec || configSec || 60);

  if (!effectiveTimeline) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          Select a timeline in the left panel to view all tracks.
        </p>
      </div>
    );
  }

  const presetCount = sources.filter((s) => s.kind === "preset").length;
  const captionCount = sources.filter(
    (s) => s.kind === "captions-reference",
  ).length;
  const actionCount = sources.filter((s) => s.kind === "action").length;
  const subtitleParts = [
    presetCount > 0
      ? `${presetCount} preset${presetCount !== 1 ? "s" : ""}`
      : null,
    captionCount > 0
      ? `${captionCount} caption ref${captionCount !== 1 ? "s" : ""}`
      : null,
    actionCount > 0
      ? `${actionCount} action${actionCount !== 1 ? "s" : ""}`
      : null,
  ].filter(Boolean);

  // Action track UIs are placeholders for now — include them so overview
  // shows every source kind, without blocking editing of presets/captions.
  return (
    <TimelineShell
      totalDuration={totalDuration}
      title={effectiveTimeline.displayName || "Timeline"}
      subtitle={
        subtitleParts.length > 0 ? `· ${subtitleParts.join(" · ")}` : undefined
      }
      audioClips={audioClips}
      emptyMessage="This timeline has no presets, caption references, or actions with tracks yet."
    >
      {sources.map((source, index) => {
        if (source.kind === "preset") {
          return (
            <PresetTracksSection
              key={source.id}
              sectionId={source.id}
              order={index}
              timelineId={effectiveTimeline.id}
              presetId={source.presetId}
              label={source.label}
              fallbackTimeline={effectiveTimeline}
              sourceTag={source.label}
            />
          );
        }
        if (source.kind === "captions-reference") {
          return (
            <CaptionsTracksSection
              key={source.id}
              sectionId={source.id}
              order={index}
              timelineId={effectiveTimeline.id}
              referenceIndex={source.referenceIndex}
              reference={source.reference}
              sourceTag={source.key || "captions"}
            />
          );
        }
        if (source.kind === "action") {
          return (
            <ActionTracksSection
              key={source.id}
              sectionId={source.id}
              order={index}
              action={source.action}
              sourceTag={source.label}
            />
          );
        }
        return null;
      })}
    </TimelineShell>
  );
}
