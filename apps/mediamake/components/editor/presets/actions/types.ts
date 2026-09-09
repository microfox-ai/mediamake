import type { z } from "zod";
import type { Timeline } from "@/components/editor_main/stores/project-store";

/** Where an action is attached. */
export type ActionTarget =
  | { type: "preset"; presetInstanceId: string }
  | { type: "reference"; referenceKey: string };

/** One generated variant the user can pick / apply. */
export interface ActionOutputVariant {
  id: string;
  label: string;
  isFavorite?: boolean;
  /** Action-specific payload (e.g. imageloop shakeEffects[]). */
  payload: unknown;
}

/** Persisted action instance on a timeline. */
export interface TimelineAction {
  id: string;
  actionId: string;
  label: string;
  target: ActionTarget;
  inputData: Record<string, unknown>;
  outputs: ActionOutputVariant[];
  /** Currently selected / applied output id. */
  selectedOutputId?: string;
  /** Set after first successful run. */
  lastRunAt?: string;
  status?: "idle" | "running" | "done" | "error";
  error?: string;
}

export interface ActionExecuteContext {
  timeline: Timeline;
  action: TimelineAction;
  inputData: Record<string, unknown>;
  fetcher: (url: string, data?: unknown) => Promise<Response>;
}

export interface ActionExecuteResult {
  outputs: Array<{
    label: string;
    payload: unknown;
    isFavorite?: boolean;
  }>;
}

export interface ActionDefinition {
  metadata: {
    id: string;
    title: string;
    description?: string;
    /** Preset registry ids this action supports (e.g. imageloop). Empty = any preset. */
    supportedPresetIds?: string[];
    /** Reference types this action supports. Empty = none for references. */
    supportedReferenceTypes?: Array<
      | "media"
      | "medias"
      | "captions"
      | "string"
      | "number"
      | "boolean"
      | "object"
      | "objects"
    >;
    tags?: string[];
  };
  inputSchema: z.ZodTypeAny;
  defaultInputParams: Record<string, unknown>;
  execute: (ctx: ActionExecuteContext) => Promise<ActionExecuteResult>;
  /**
   * Apply a selected output payload onto the target's data.
   * Returns the next presetInputData / reference value.
   */
  applyOutput: (args: {
    currentData: Record<string, unknown>;
    action: TimelineAction;
    output: ActionOutputVariant;
  }) => Record<string, unknown>;
}
