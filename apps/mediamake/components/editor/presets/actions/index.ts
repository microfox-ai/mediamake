export type {
  ActionTarget,
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
  stripActionOutputFromTargetData,
  executeAndApply,
  removeTimelineAction,
  confirmRemoveAction,
  confirmRerunAction,
} from "./engine/action-lifecycle";
