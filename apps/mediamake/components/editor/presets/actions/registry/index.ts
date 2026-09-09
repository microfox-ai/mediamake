import type { ActionDefinition, ActionTarget } from "../types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import type { ReferenceItem } from "@/components/editor/presets/types";
import { shakeEffectRangeGenerator } from "./shake-effect-range-generator";
import { shakeEffectMinorBeats } from "./shake-effect-minor-beats";
import { shakeEffectRange } from "./shake-effect-range";

const ACTION_REGISTRY: ActionDefinition[] = [
  shakeEffectMinorBeats,
  shakeEffectRange,
  shakeEffectRangeGenerator,
];

export function getAllActions(): ActionDefinition[] {
  return ACTION_REGISTRY;
}

export function getActionDefinition(actionId: string): ActionDefinition | undefined {
  return ACTION_REGISTRY.find((a) => a.metadata.id === actionId);
}

export function getSupportedActionsForPreset(
  presetRegistryId: string | undefined,
): ActionDefinition[] {
  if (!presetRegistryId) return [];
  return ACTION_REGISTRY.filter((action) => {
    // Hide deprecated alias from the add dropdown when the new name exists
    if (action.metadata.id === "shakeEffectRangeGenerator") return false;
    const ids = action.metadata.supportedPresetIds;
    if (!ids || ids.length === 0) return true;
    return ids.includes(presetRegistryId);
  });
}

export function getSupportedActionsForReference(
  reference: ReferenceItem | undefined,
): ActionDefinition[] {
  if (!reference) return [];
  return ACTION_REGISTRY.filter((action) => {
    if (action.metadata.id === "shakeEffectRangeGenerator") return false;
    const types = action.metadata.supportedReferenceTypes;
    if (!types || types.length === 0) return false;
    return types.includes(reference.type);
  });
}

export function getSupportedActionsForTarget(
  timeline: Timeline,
  target: ActionTarget,
): ActionDefinition[] {
  if (target.type === "preset") {
    const preset = timeline.presets?.find((p) => p.id === target.presetInstanceId);
    return getSupportedActionsForPreset(preset?.presetId);
  }
  const references = (timeline.defaultData?.references || []) as ReferenceItem[];
  const reference = references.find((r) => r.key === target.referenceKey);
  return getSupportedActionsForReference(reference);
}

export { shakeEffectRangeGenerator, shakeEffectMinorBeats, shakeEffectRange };
