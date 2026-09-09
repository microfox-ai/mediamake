import type { Timeline } from "@/components/editor_main/stores/project-store";
import { useTimelineEditsStore } from "@/components/editor_main/stores/timeline-edits-store";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import type { ActionTarget, TimelineAction } from "../types";
import { getActionDefinition } from "../registry";
import {
  ACTION_GENERATED_KEY,
  applyActionOutputToTargetData,
  runTimelineAction,
} from "./run-action";

export function getTargetData(
  timeline: Timeline,
  target: ActionTarget,
): Record<string, unknown> {
  if (target.type === "preset") {
    const preset = timeline.presets?.find((p) => p.id === target.presetInstanceId);
    return { ...(preset?.presetInputData || {}) };
  }
  const references = timeline.defaultData?.references || [];
  const ref = references.find((r: any) => r.key === target.referenceKey);
  if (ref?.value && typeof ref.value === "object" && !Array.isArray(ref.value)) {
    return { ...(ref.value as Record<string, unknown>) };
  }
  return {};
}

export function writeTargetData(
  timelineId: string,
  timeline: Timeline,
  target: ActionTarget,
  data: Record<string, unknown>,
) {
  const edits = useTimelineEditsStore.getState();
  if (target.type === "preset") {
    edits.updatePresetInputData(timelineId, target.presetInstanceId, data);
    return;
  }
  const references = [...(timeline.defaultData?.references || [])];
  const index = references.findIndex((r: any) => r.key === target.referenceKey);
  if (index === -1) return;
  references[index] = { ...references[index], value: data };
  edits.updateTimeline(timelineId, {
    defaultData: {
      ...(timeline.defaultData || {}),
      references,
    },
  });
}

/** Remove shakeEffects tagged by this action from preset/reference input data. */
export function stripActionOutputFromTargetData(
  currentData: Record<string, unknown>,
  actionId: string,
): Record<string, unknown> {
  const next = { ...currentData };
  const idPrefix = `action-${actionId}-`;
  const isOwned = (effect: any) =>
    effect?.[ACTION_GENERATED_KEY] === actionId ||
    (typeof effect?.id === "string" && effect.id.startsWith(idPrefix));

  const existingShake = Array.isArray(next.shakeEffects)
    ? (next.shakeEffects as any[])
    : [];
  if (existingShake.length > 0) {
    const kept = existingShake.filter(
      (effect) => !isOwned(effect) && effect?.type !== "beat-shake",
    );
    next.shakeEffects = kept;
  }

  // Also scrub legacy action shakes left on effects[]
  if (Array.isArray(next.effects)) {
    const effects = next.effects as any[];
    const keptEffects = effects.filter((effect) => {
      if (isOwned(effect)) return false;
      if (
        effect?.type === "shake" ||
        effect?.type === "beat-shake" ||
        effect?.type === "beat-zoom" ||
        effect?.type === "beat-exposure"
      ) {
        return false;
      }
      return true;
    });
    if (keptEffects.length !== effects.length) {
      next.effects = keptEffects;
    }
  }

  return next;
}

function recompileTimeline(timelineId: string) {
  const edits = useTimelineEditsStore.getState();
  const latest = edits.getEditedTimeline(timelineId);
  if (!latest) return;
  const compileStore = useCompileStore.getState();
  if (compileStore.currentTimeline?.id === latest.id) {
    useCompileStore.setState({ currentTimeline: latest });
  }
  void compileStore.generateOutput(latest);
}

export async function executeAndApply(
  timelineId: string,
  actionId: string,
): Promise<void> {
  const edits = useTimelineEditsStore.getState();
  const timeline = edits.getEditedTimeline(timelineId);
  if (!timeline) throw new Error("Timeline not found");

  const action = (timeline.actions || []).find((a) => a.id === actionId);
  if (!action) throw new Error("Action not found");

  // Ephemeral status — avoid history/localStorage/player host re-render mid-run
  edits.updateAction(
    timelineId,
    actionId,
    { status: "running", error: undefined },
    { skipHistory: true },
  );

  try {
    const { outputs, selectedOutputId } = await runTimelineAction({
      timeline,
      action,
    });
    const selected = outputs.find((o) => o.id === selectedOutputId) || outputs[0];
    const definition = getActionDefinition(action.actionId);
    if (!definition) throw new Error("Action definition missing");

    const refreshed = edits.getEditedTimeline(timelineId) || timeline;
    const currentData = getTargetData(refreshed, action.target);
    const nextData = applyActionOutputToTargetData({
      definition,
      currentData,
      action: { ...action, outputs, selectedOutputId },
      output: selected,
    });
    writeTargetData(timelineId, refreshed, action.target, nextData);

    // Single persisted action update after apply (outputs can be large)
    edits.updateAction(timelineId, actionId, {
      outputs,
      selectedOutputId,
      lastRunAt: new Date().toISOString(),
      status: "done",
      error: undefined,
    });

    // Preset writes already bump presetsHash → useTimelineRenderer auto-compiles.
    // Reference writes do not, so compile explicitly.
    if (action.target.type === "reference") {
      recompileTimeline(timelineId);
    }
  } catch (err) {
    edits.updateAction(
      timelineId,
      actionId,
      {
        status: "error",
        error: err instanceof Error ? err.message : "Action failed",
      },
      { skipHistory: true },
    );
    throw err;
  }
}

export function removeTimelineAction(
  timelineId: string,
  actionId: string,
  options: { deleteOutputs: boolean },
) {
  const edits = useTimelineEditsStore.getState();
  const timeline = edits.getEditedTimeline(timelineId);
  if (!timeline) return;

  const action = (timeline.actions || []).find((a) => a.id === actionId);
  if (!action) {
    edits.removeAction(timelineId, actionId);
    return;
  }

  if (options.deleteOutputs) {
    const currentData = getTargetData(timeline, action.target);
    const nextData = stripActionOutputFromTargetData(currentData, actionId);
    writeTargetData(timelineId, timeline, action.target, nextData);
  }

  edits.removeAction(timelineId, actionId);

  // Only recompile when composition data may have changed
  if (options.deleteOutputs) {
    if (action.target.type === "reference") {
      recompileTimeline(timelineId);
    }
    // preset: presetsHash effect handles compile
  }
}

/** Confirm remove; ask whether to also delete generated/applied outputs. */
export function confirmRemoveAction(label: string): {
  proceed: boolean;
  deleteOutputs: boolean;
} {
  if (!window.confirm(`Remove action "${label}"?`)) {
    return { proceed: false, deleteOutputs: false };
  }
  const deleteOutputs = window.confirm(
    "Also delete the generated/applied outputs from the linked preset/reference?",
  );
  return { proceed: true, deleteOutputs };
}

/**
 * Confirm re-run when the action already produced outputs.
 * Cancel aborts; OK proceeds (re-run replaces prior applied outputs).
 */
export function confirmRerunAction(action: TimelineAction): boolean {
  const hasPrior =
    Boolean(action.lastRunAt) || (action.outputs?.length ?? 0) > 0;
  if (!hasPrior) return true;
  return window.confirm(
    `Re-run "${action.label}"?\n\nThis will delete/replace previously generated/applied outputs on the linked preset/reference.`,
  );
}
