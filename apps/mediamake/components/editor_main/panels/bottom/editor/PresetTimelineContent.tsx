"use client";

import { useMemo } from "react";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import { findAudioMediaClipsFromTimeline } from "@/components/editor/presets/actions/engine/find-audio-media";
import { TimelineShell } from "./TimelineShell";
import { PresetTracksSection } from "./sections/PresetTracksSection";

/**
 * Focused preset timeline — single source of truth via PresetTracksSection.
 */
export function PresetTimelineContent() {
  const { selectedItem } = useEditorStore();
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);

  const isPresetSelected = selectedItem?.type === "preset";
  const timeline = isPresetSelected ? selectedItem.timeline : null;
  const selectedPreset = isPresetSelected ? selectedItem.item : null;

  const effectiveTimeline = timeline
    ? getEditedTimeline(timeline.id) || timeline
    : null;
  const preset =
    effectiveTimeline?.presets?.find((p) => p.id === selectedPreset?.id) ||
    selectedPreset;

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

  if (!isPresetSelected || !effectiveTimeline || !preset) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          Select a preset in the left panel to view its timeline ranges.
        </p>
      </div>
    );
  }

  return (
    <TimelineShell
      totalDuration={totalDuration}
      title={preset.label || "Preset"}
      audioClips={audioClips}
      emptyMessage="This preset has no timeline-linked ranges. Link a data reference in the right panel."
    >
      <PresetTracksSection
        sectionId={`preset:${preset.id}`}
        order={0}
        timelineId={effectiveTimeline.id}
        presetId={preset.id}
        label={preset.label || "Preset"}
        fallbackTimeline={effectiveTimeline}
        showHeader={false}
      />
    </TimelineShell>
  );
}
