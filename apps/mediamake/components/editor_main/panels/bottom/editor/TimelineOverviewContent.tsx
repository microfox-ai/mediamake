"use client";

import { useMemo } from "react";
import { useEditorStore } from "../../../stores/editor-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../stores/compile-store";
import { useProjectStore } from "../../../stores/project-store";
import { useCompiledAudioClips } from "./use-compiled-audio-clips";
import { loadInstanceTree } from "@/components/editor_main/timing/load-instance-tree";
import {
  resolveTimelineScope,
  scopeRangePresetIds,
  scopeShownPresetCount,
} from "./timeline-scope";
import { resolveTiming } from "@/components/editor_main/timing/resolve-timing";
import {
  collectIntrinsicDurations,
  collectMediaItemDurations,
} from "@/components/editor_main/timing/stamp-timing";
import type { AppliedNode } from "@/components/editor_main/timing/types";
import { atomContentEnd, presetUsesSceneBlocks } from "./media-scene-blocks";
import { TimelineShell } from "./TimelineShell";
import {
  actionRangesVisible,
  actionTimelineEnd,
  bottomTimelineLane,
  collectActionTimelineSegments,
  collectTimelineTrackSources,
  timelineFromSelection,
} from "./timeline-track-sources";
import { InstanceTimingSection } from "./sections/InstanceTimingSection";
import { PresetTracksSection } from "./sections/PresetTracksSection";
import { CaptionsTracksSection } from "./sections/CaptionsTracksSection";
import { LinkedActionTracks } from "./sections/ActionTracksSection";

/**
 * Timeline-level bottom panel.
 * The timeline and Blocks show preset rows. References and Actions show
 * only their own ranges.
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
  const tree = useMemo(
    () => (effectiveTimeline ? loadInstanceTree(effectiveTimeline) : null),
    [effectiveTimeline],
  );
  const scope = useMemo(
    () => (tree ? resolveTimelineScope(tree, selectedItem) : null),
    [tree, selectedItem],
  );
  const rangePresetIds = useMemo(
    () => (scope ? new Set(scopeRangePresetIds(scope)) : new Set<string>()),
    [scope],
  );
  const lane = bottomTimelineLane(selectedItem);

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
  const actionEnd = useMemo(() => {
    if (!effectiveTimeline) return 0;
    return actionTimelineEnd(
      (effectiveTimeline.actions ?? []).filter((action) =>
        actionRangesVisible(action, selectedItem),
      ),
    );
  }, [effectiveTimeline, selectedItem]);
  const contentEnd = useMemo(() => {
    if (!tree) return 0;
    const intrinsicDurations = collectIntrinsicDurations(compiledChildren);
    const resolved = resolveTiming(tree, { intrinsicDurations });
    let end = 0;
    for (const span of resolved.nodes.values()) {
      const edge = span.absoluteStart + span.duration;
      if (edge > end) end = edge;
    }
    const walk = (node: AppliedNode) => {
      if (presetUsesSceneBlocks(node.presetId)) {
        const origin = resolved.nodes.get(node.id)?.absoluteStart ?? 0;
        end = Math.max(
          end,
          atomContentEnd(
            node.input,
            origin,
            collectMediaItemDurations(compiledChildren, node.id),
            node.presetId,
          ),
        );
      }
      for (const child of node.children) walk(child);
    };
    walk(tree);
    return end;
  }, [tree, compiledChildren]);
  const totalDuration = Math.max(
    1,
    compiledSec || configSec || 60,
    contentEnd,
    actionEnd,
  );

  if (!effectiveTimeline) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          Select a timeline in the left panel to view all tracks.
        </p>
      </div>
    );
  }

  const presetCount =
    lane === "blocks" && tree && scope ? scopeShownPresetCount(tree, scope) : 0;
  const captionCount =
    lane === "references"
      ? sources.filter((s) => s.kind === "captions-reference").length
      : 0;
  const actionCount =
    lane === "actions"
      ? sources.filter(
          (s) =>
            s.kind === "action" &&
            actionRangesVisible(s.action, selectedItem) &&
            collectActionTimelineSegments(s.action).length > 0,
        ).length
      : 0;
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

  return (
    <TimelineShell
      totalDuration={totalDuration}
      subtitle={
        subtitleParts.length > 0 ? `· ${subtitleParts.join(" · ")}` : undefined
      }
      audioClips={audioClips}
      emptyMessage={
        lane === "references"
          ? "This timeline has no reference ranges."
          : lane === "actions"
            ? "This timeline has no action ranges."
            : "This timeline has no blocks to show."
      }
    >
      {lane === "blocks" && scope ? (
        <InstanceTimingSection timeline={effectiveTimeline} order={-1} scope={scope} />
      ) : null}
      {lane === "blocks"
        ? sources.map((source, index) => {
            if (source.kind !== "preset" || !rangePresetIds.has(source.presetId)) {
              return null;
            }
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
          })
        : null}
      {lane === "references"
        ? sources.map((source, index) => {
            if (source.kind !== "captions-reference") return null;
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
          })
        : null}
      {lane === "actions" ? (
        <LinkedActionTracks
          actions={effectiveTimeline.actions}
          selected={selectedItem}
          orderBase={sources.length}
        />
      ) : null}
    </TimelineShell>
  );
}
