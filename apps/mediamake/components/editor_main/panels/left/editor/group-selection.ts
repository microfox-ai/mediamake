import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { useEditorStore } from "@/components/editor_main/stores/editor-store";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { useTimelineEditsStore } from "@/components/editor_main/stores/timeline-edits-store";
import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";

/** Group the ids, select the new scene, and refresh the preview. */
export function groupSelectedBlocks(timeline: Timeline, ids: string[]): string | null {
  const scenePreset = getPredefinedPresetById("scene");
  if (!scenePreset) return null;
  const sceneId = useTimelineEditsStore.getState().groupPresets(timeline.id, ids, {
    presetInfo: scenePreset,
  });
  if (!sceneId) return null;
  const latest = useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
  const created = latest.presets?.find((preset) => preset.id === sceneId);
  if (created) useEditorStore.getState().selectPreset(created, latest);
  useCompileStore.getState().generateOutput(latest);
  return sceneId;
}
