import type {
  ActionDefinition,
  ActionExecuteContext,
  ActionExecuteResult,
  ActionOutputVariant,
  TimelineAction,
} from "../types";
import { findAudioSrcForTrackName } from "./find-audio-for-track";
import { getActionDefinition } from "../registry";

/** Tag written onto generated effects so re-runs can replace prior output. */
export const ACTION_GENERATED_KEY = "_generatedByActionId";

export async function runTimelineAction(args: {
  timeline: Parameters<typeof findAudioSrcForTrackName>[0];
  action: TimelineAction;
  fetcher?: (url: string, data?: unknown) => Promise<Response>;
}): Promise<{
  outputs: ActionOutputVariant[];
  selectedOutputId: string;
  appliedData?: Record<string, unknown>;
}> {
  const definition = getActionDefinition(args.action.actionId);
  if (!definition) {
    throw new Error(`Unknown action: ${args.action.actionId}`);
  }

  const fetcher =
    args.fetcher ||
    ((url: string, data?: unknown) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data ?? {}),
      }));

  const ctx: ActionExecuteContext = {
    timeline: args.timeline,
    action: args.action,
    inputData: args.action.inputData || {},
    fetcher,
  };

  const result: ActionExecuteResult = await definition.execute(ctx);
  if (!result.outputs?.length) {
    throw new Error("Action produced no outputs");
  }

  const outputs: ActionOutputVariant[] = result.outputs.map((out, index) => ({
    id: `${args.action.id}-out-${index}-${Math.random().toString(36).slice(2, 7)}`,
    label: out.label,
    isFavorite: out.isFavorite ?? index === 0,
    payload: out.payload,
  }));

  const favorite = outputs.find((o) => o.isFavorite) || outputs[0];

  return {
    outputs,
    selectedOutputId: favorite.id,
  };
}

export function applyActionOutputToTargetData(args: {
  definition: ActionDefinition;
  currentData: Record<string, unknown>;
  action: TimelineAction;
  output: ActionOutputVariant;
}): Record<string, unknown> {
  return args.definition.applyOutput({
    currentData: args.currentData,
    action: args.action,
    output: args.output,
  });
}

export { findAudioSrcForTrackName };
