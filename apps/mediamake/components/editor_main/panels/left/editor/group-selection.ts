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

/** Dissolve the scenes, select the blocks that were inside them, and refresh the preview. */
export function ungroupSelectedBlocks(timeline: Timeline, ids: string[]): string[] | null {
  const childIds = useTimelineEditsStore.getState().ungroupPresets(timeline.id, ids);
  if (!childIds) return null;
  const latest = useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
  const children = childIds
    .map((id) => latest.presets?.find((preset) => preset.id === id))
    .filter((preset): preset is NonNullable<typeof preset> => !!preset);
  if (children[0]) {
    useEditorStore.getState().selectPreset(children[0], latest);
    if (children.length > 1) {
      useEditorStore.setState({
        selectedPresetIds: children.map((preset) => preset.id),
        presetAnchorId: children[0].id,
      });
    }
  } else {
    useEditorStore.getState().selectTimeline(latest);
  }
  useCompileStore.getState().generateOutput(latest);
  return childIds;
}
