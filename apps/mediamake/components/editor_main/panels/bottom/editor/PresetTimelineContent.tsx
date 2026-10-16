"use client";

import { useMemo } from "react";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import { useCompiledAudioClips } from "./use-compiled-audio-clips";
import { findNode, loadInstanceTree } from "@/components/editor_main/timing/load-instance-tree";
import { latestSpanEnd, resolveTiming } from "@/components/editor_main/timing/resolve-timing";
import type { AppliedNode } from "@/components/editor_main/timing/types";
import { estimateSequenceDuration } from "@/components/editor_main/timing/sequence-estimate";
import {
  collectIntrinsicDurations,
  collectMediaItemDurations,
} from "@/components/editor_main/timing/stamp-timing";
import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";
import { TimelineShell } from "./TimelineShell";
import { InstanceTimingSection } from "./sections/InstanceTimingSection";
import { PresetTracksSection } from "./sections/PresetTracksSection";
import { MediaSceneBlocksSection } from "./sections/MediaSceneBlocksSection";
import { resolveTimelineScope } from "./timeline-scope";
import {
  atomContentEnd,
  presetUsesSceneBlocks,
  sceneBlocksForPreset,
} from "./media-scene-blocks";
import { presetTrackName } from "@/components/editor_main/timing/preset-track-name";

function parentOf(root: AppliedNode, id: string): AppliedNode | null {
  let found: AppliedNode | null = null;
  const walk = (node: AppliedNode, parent: AppliedNode | null) => {
    if (node.id === id) found = parent;
    for (const child of node.children) walk(child, node);
  };
  walk(root, null);
  return found;
}

/**
 * Focused preset timeline. A scene shows the presets attached to it.
 * A container or atom shows its own sequence, clips, and ranges.
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

  const tree = useMemo(
    () => (effectiveTimeline ? loadInstanceTree(effectiveTimeline) : null),
    [effectiveTimeline],
  );
  const scope = useMemo(
    () => (tree ? resolveTimelineScope(tree, isPresetSelected ? selectedItem : null) : null),
    [tree, isPresetSelected, selectedItem],
  );
  const audioClips = useCompiledAudioClips(effectiveTimeline);

  const fps = calculatedMetadata?.fps ?? 30;
  const compiledChildren = calculatedMetadata?.props?.childrenData;
  const compiledSec =
    calculatedMetadata?.durationInFrames &&
    calculatedMetadata.durationInFrames > 0
      ? calculatedMetadata.durationInFrames / fps
      : 0;
  const configSec = Number(
    effectiveTimeline?.configuration?.config?.duration || 0,
  );
  const intrinsicDurations = useMemo(
    () => collectIntrinsicDurations(compiledChildren),
    [compiledChildren],
  );
  const probedItemDurations = useMemo(
    () => collectMediaItemDurations(compiledChildren, preset?.id ?? ""),
    [compiledChildren, preset?.id],
  );
  const sequenceDuration = useMemo(() => {
    if (!effectiveTimeline || !preset) return undefined;
    return estimateSequenceDuration({
      input: preset.presetInputData,
      presetId: preset.id,
      root: loadInstanceTree(effectiveTimeline),
      compiledChildren,
    });
  }, [effectiveTimeline, preset, compiledChildren]);
  const contentEnd = useMemo(() => {
    if (!effectiveTimeline) return 0;
    const treeEnd = latestSpanEnd(loadInstanceTree(effectiveTimeline), {
      intrinsicDurations,
    });
    const tree = loadInstanceTree(effectiveTimeline);
    const span = preset
      ? resolveTiming(tree, { intrinsicDurations }).nodes.get(preset.id)
      : undefined;
    const origin = span?.absoluteStart ?? 0;
    const layout = sceneBlocksForPreset(
      preset?.presetId,
      preset?.presetInputData,
      probedItemDurations,
    );
    return Math.max(
      treeEnd,
      layout.duration,
      sequenceDuration ?? 0,
      atomContentEnd(preset?.presetInputData, origin, probedItemDurations, preset?.presetId),
    );
  }, [effectiveTimeline, intrinsicDurations, preset?.presetInputData, probedItemDurations, sequenceDuration]);
  const totalDuration = Math.max(
    1,
    compiledSec || configSec || 60,
    contentEnd,
  );

  const placement = useMemo(() => {
    if (!effectiveTimeline || !preset || !presetUsesSceneBlocks(preset.presetId)) return null;
    const tree = loadInstanceTree(effectiveTimeline);
    const node = findNode(tree, preset.id);
    const span = resolveTiming(tree, { intrinsicDurations }).nodes.get(preset.id);
    const layout = sceneBlocksForPreset(preset.presetId, preset.presetInputData, probedItemDurations);
    const full =
      span && span.duration > 0
        ? span.duration
        : sequenceDuration && sequenceDuration > 0
          ? sequenceDuration
          : layout.duration;
    return {
      authoredStart: span?.absoluteStart ?? layout.trackStart,
      fullDuration: full,
      parentAbsolute: span?.parentAbsoluteStart ?? 0,
      timingKind: node?.timing.kind,
      packedInSequence: parentOf(tree, preset.id)?.arrangement === "sequence",
    };
  }, [effectiveTimeline, preset, probedItemDurations, intrinsicDurations, sequenceDuration]);

  const lockSpan = useMemo(() => {
    if (!effectiveTimeline || !preset) return null;
    const layout = sceneBlocksForPreset(preset.presetId, preset.presetInputData, probedItemDurations);
    if (layout.mode !== "lockedTo") return null;
    const span = resolveTiming(loadInstanceTree(effectiveTimeline), {
      intrinsicDurations,
    }).nodes.get(preset.id);
    if (!span || !(span.duration > 0)) return null;
    const input = preset.presetInputData as { lock?: string } | undefined;
    return {
      start: span.absoluteStart,
      duration: span.duration,
      label: input?.lock?.trim() || "Locked",
    };
  }, [effectiveTimeline, preset, probedItemDurations, intrinsicDurations]);

  if (!isPresetSelected || !effectiveTimeline || !preset) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          Select a preset in the left panel to view its timeline ranges.
        </p>
      </div>
    );
  }

  const rowName = presetTrackName(preset, "Track");
  const shellPlacement = getPredefinedPresetById(preset.presetId)?.metadata.placement;
  const drawsOwnSequence =
    scope?.kind === "preset" &&
    (shellPlacement === "atom" || shellPlacement === "container");
  const showInstanceRows = scope?.kind === "scene-children" || drawsOwnSequence;

  return (
    <TimelineShell
      totalDuration={totalDuration}
      audioClips={audioClips}
      emptyMessage="This preset has no timeline-linked ranges. Link a data reference in the right panel."
    >
      {showInstanceRows && scope ? (
        <InstanceTimingSection
          timeline={effectiveTimeline}
          order={0}
          scope={scope}
        />
      ) : null}
      {!showInstanceRows && (presetUsesSceneBlocks(preset.presetId) || lockSpan) ? (
        <MediaSceneBlocksSection
          sectionId={`preset-scenes:${preset.id}`}
          order={0}
          presetInputData={preset.presetInputData}
          lockSpan={lockSpan}
          probedItemDurations={probedItemDurations}
          sequenceDuration={sequenceDuration}
          timelineId={effectiveTimeline.id}
          presetId={preset.id}
          timeline={effectiveTimeline}
          label={rowName}
          authoredStart={placement?.authoredStart}
          fullDuration={placement?.fullDuration}
          parentAbsolute={placement?.parentAbsolute}
          timingKind={placement?.timingKind}
          packedInSequence={placement?.packedInSequence}
          registryPresetId={preset.presetId}
        />
      ) : null}
      {scope?.kind === "preset" ? (
        <PresetTracksSection
          sectionId={`preset:${preset.id}`}
          order={1}
          timelineId={effectiveTimeline.id}
          presetId={preset.id}
          label={presetTrackName(preset, "Preset")}
          fallbackTimeline={effectiveTimeline}
        />
      ) : null}
    </TimelineShell>
  );
}
