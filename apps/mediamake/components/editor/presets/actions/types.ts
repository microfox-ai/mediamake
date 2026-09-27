import type { z } from "zod";
import type { Timeline } from "@/components/editor_main/stores/project-store";

/** Where an action is attached. */
export type ActionTarget =
  | { type: "preset"; presetInstanceId: string }
  | { type: "reference"; referenceKey: string };

/**
 * When an action instance is allowed to execute.
 *
 * - `"manual"` (default): UI Run button or an explicit `executeAndApply()` call.
 *   Never invoked by preset compile — compile only reads already-applied data.
 * - `"auto"`: eligible for programmatic batch runners (`runEligibleActions`).
 *   Still never runs inside the compile pipeline unless a caller explicitly
 *   invokes those runners first.
 */
export type ActionRunPolicy = "manual" | "auto";

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
  /**
   * Execution policy. Defaults to `"manual"` when omitted.
   * Preset compile never runs actions regardless of this value.
   */
  runPolicy?: ActionRunPolicy;
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
    /**
     * Default run policy for new instances of this action.
     * Omitting means `"manual"` — UI / explicit programmatic run only.
     */
    defaultRunPolicy?: ActionRunPolicy;
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
