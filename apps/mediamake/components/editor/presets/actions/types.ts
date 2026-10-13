import type { z } from "zod";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import type { AudioAnalysisClientDoc } from "@/lib/audio-analysis-types";

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
  /** Live status while a browser step or worker poll is in progress. */
  progressMessage?: string;
}

/**
 * Browser-side helpers available to every action.
 * Workers return ids; use these to poll status and load the stored payload,
 * or to run a step entirely in the browser (fetch, decode, analyze).
 */
export interface ActionBrowser {
  reportProgress: (message: string) => void;
  /**
   * Dispatch a workflow worker and poll until it finishes.
   * Same status loop as the billing page.
   */
  runWorker: (args: {
    workerId: string;
    input: Record<string, unknown>;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
  }) => Promise<{ jobId: string; status: string; output: unknown }>;
  /** Fetch JSON. Throws with the response error message when the status is not ok. */
  fetchJson: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
  /** Load a stored audio-analysis document by id. */
  fetchAudioAnalysis: (analysisId: string) => Promise<AudioAnalysisClientDoc>;
  /**
   * Start analyze-audio, poll until the job completes, then load the Mongo document.
   * The worker response contains `analysisId`, not the frame list.
   */
  analyzeAudioOnServer: (audioSrc: string) => Promise<AudioAnalysisClientDoc>;
  /** Decode and analyze audio locally, the same way the timeline builds a waveform. */
  analyzeAudioInBrowser: (audioSrc: string) => Promise<AudioAnalysisClientDoc>;
}

export interface ActionExecuteContext {
  timeline: Timeline;
  action: TimelineAction;
  inputData: Record<string, unknown>;
  fetcher: (url: string, data?: unknown) => Promise<Response>;
  /** Poll workers, fetch stored documents, or run a step in the browser. */
  browser: ActionBrowser;
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
