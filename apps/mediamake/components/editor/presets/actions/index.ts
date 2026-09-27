export type {
  ActionTarget,
  ActionRunPolicy,
  ActionOutputVariant,
  TimelineAction,
  ActionDefinition,
  ActionExecuteContext,
  ActionExecuteResult,
} from "./types";

export {
  getAllActions,
  getActionDefinition,
  getSupportedActionsForPreset,
  getSupportedActionsForReference,
  getSupportedActionsForTarget,
} from "./registry";

export {
  runTimelineAction,
  applyActionOutputToTargetData,
  findAudioSrcForTrackName,
  ACTION_GENERATED_KEY,
} from "./engine/run-action";

export {
  getActionRunPolicy,
  stripActionOutputFromTargetData,
  executeAndApply,
  runEligibleActions,
  removeTimelineAction,
  confirmRemoveAction,
  confirmRerunAction,
} from "./engine/action-lifecycle";
export type { RunEligibleActionsOptions } from "./engine/action-lifecycle";
