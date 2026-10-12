import { z } from "zod";
import type { ActionDefinition, ActionExecuteContext, ActionExecuteResult } from "../types";
import { useLayerStateStore } from "@/components/editor_main/stores/layer-state-store";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { useCaptionTrackSelection } from "@/components/editor_main/stores/caption-track-selection";

const AGENT_PATH = "/api/studio/chat/agent/script-meta/music/split-and-highlight";

const SCOPE_SELECTED = "Selected / active caption";
const SCOPE_ALL = "All captions";

const inputSchema = z.object({
  scope: z
    .enum([SCOPE_SELECTED, SCOPE_ALL])
    .default(SCOPE_SELECTED)
    .describe(
      "Selected / active caption uses the timeline selection, or the caption under the playhead when nothing is selected. All captions rewrites htmlText on every line in this captions document.",
    ),
  frameChoice: z
    .enum(["vertical_box", "horizontal_box", "square_box"])
    .default("vertical_box")
    .describe(
      "Frame for every card. vertical_box is 3:4. horizontal_box is 16:9. square_box is 1:1.",
    ),
  lineLength: z
    .enum(["short", "medium", "large"])
    .default("medium")
    .describe(
      "How many words sit on a line. Meaning and punctuation still decide the break.",
    ),
  fontScaling: z
    .number()
    .positive()
    .default(2)
    .describe("How many times larger bold words are drawn than normal words"),
  staticFrameChoice: z
    .boolean()
    .default(true)
    .describe(
      "Defaults to true. Every card uses the same frame. A later pass can turn this off so each card picks its own frame.",
    ),
  userRequest: z
    .string()
    .optional()
    .describe("Extra direction for line breaks and highlights"),
});

type CaptionReferenceValue = {
  _id?: string;
  title?: string;
  description?: string;
  sourceTranscriptionId?: string;
  captions?: Array<{
    absoluteStart?: number;
    absoluteEnd?: number;
    start?: number;
    end?: number;
  }>;
};

function readCaptionReference(ctx: ActionExecuteContext): {
  id: string;
  referenceIndex: number;
} {
  const target = ctx.action.target;
  if (target.type !== "reference") {
    throw new Error("Split and highlight only runs on a captions reference");
  }

  const references = ctx.timeline.defaultData?.references || [];
  const referenceIndex = references.findIndex(
    (item: { key?: string }) => item.key === target.referenceKey,
  );
  const reference = references[referenceIndex] as
    | { type?: string; value?: CaptionReferenceValue }
    | undefined;

  if (!reference || reference.type !== "captions") {
    throw new Error("Link this action to a captions reference");
  }

  const id = reference.value?._id;
  if (!id) {
    throw new Error("Create or link a captions document before highlighting");
  }
  return { id: String(id), referenceIndex };
}

async function fetchCaptionsDocument(id: string): Promise<CaptionReferenceValue> {
  const response = await fetch(`/api/captions/${id}`);
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to load the captions document"));
  }
  const data = (await response.json()) as { captions?: CaptionReferenceValue };
  const doc = data.captions;
  if (!doc || !Array.isArray(doc.captions) || doc.captions.length === 0) {
    throw new Error("The captions document has no lines");
  }
  return { ...doc, _id: doc._id ?? id };
}

function captionWindow(caption: {
  absoluteStart?: number;
  absoluteEnd?: number;
  start?: number;
  end?: number;
}) {
  const start = Number(caption?.absoluteStart ?? caption?.start ?? 0) || 0;
  let end = Number(caption?.absoluteEnd ?? caption?.end ?? start) || start;
  if (end <= start) end = start + 0.05;
  return { start, end };
}

/** Timeline selection wins. Otherwise every caption the playhead is inside. */
function selectedOrActiveIndices(
  ctx: ActionExecuteContext,
  value: CaptionReferenceValue,
  referenceIndex: number,
): number[] {
  const captions = value.captions ?? [];
  const selection = useCaptionTrackSelection.getState().selection;
  if (
    selection &&
    selection.timelineId === ctx.timeline.id &&
    selection.referenceIndex === referenceIndex &&
    selection.lineIdx >= 0 &&
    selection.lineIdx < captions.length
  ) {
    return [selection.lineIdx];
  }

  const fps = useCompileStore.getState().calculatedMetadata?.fps ?? 30;
  const time = useLayerStateStore.getState().currentFrame / fps;
  const active = captions.flatMap((caption, index) => {
    const { start, end } = captionWindow(caption);
    return time >= start && time < end ? [index] : [];
  });
  if (active.length === 0) {
    throw new Error("No caption is selected or active at the playhead");
  }
  return active;
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return (
    (data as { error?: string; message?: string }).error ||
    (data as { message?: string }).message ||
    fallback
  );
}

function outputFromAgentResponse(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== "object") return null;
  if (Array.isArray(result)) {
    const last = result[result.length - 1] as
      | { parts?: Array<Record<string, unknown>> }
      | undefined;
    const parts = last?.parts ?? [];
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (typeof part?.type === "string" && part.type.startsWith("tool-") && part.output) {
        return part.output as Record<string, unknown>;
      }
    }
    return null;
  }
  return result as Record<string, unknown>;
}

export const captionSplitHighlight: ActionDefinition = {
  metadata: {
    id: "captionSplitHighlight",
    title: "Split and Highlight",
    description:
      "Rewrite htmlText on the selected or active caption in this captions document. Choose All captions to rewrite every line. Cards, words, and timestamps stay.",
    supportedReferenceTypes: ["captions"],
    tags: ["caption", "split-and-highlight", "htmlText"],
  },
  inputSchema,
  defaultInputParams: {
    scope: SCOPE_SELECTED,
    frameChoice: "vertical_box",
    lineLength: "medium",
    fontScaling: 2,
    staticFrameChoice: true,
    userRequest: "",
  },
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const parsed = inputSchema.parse(ctx.inputData);
    const { id, referenceIndex } = readCaptionReference(ctx);
    const value = await fetchCaptionsDocument(id);
    const selectedIndices =
      parsed.scope === SCOPE_ALL
        ? undefined
        : selectedOrActiveIndices(ctx, value, referenceIndex);

    const response = await fetch(AGENT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        captionId: String(value._id),
        ...(selectedIndices ? { selectedIndices } : {}),
        frameChoice: parsed.frameChoice,
        lineLength: parsed.lineLength,
        fontScaling: parsed.fontScaling,
        staticFrameChoice: parsed.staticFrameChoice,
        ...(parsed.userRequest?.trim()
          ? { userRequest: parsed.userRequest.trim() }
          : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Split and highlight failed"));
    }

    const output = outputFromAgentResponse(await response.json());
    const captions = Array.isArray(output?.captions) ? output.captions : [];
    if (captions.length === 0) {
      throw new Error(
        typeof output?.summary === "string"
          ? output.summary
          : "Split and highlight returned no captions",
      );
    }

    const summary =
      typeof output?.summary === "string"
        ? output.summary
        : parsed.scope === SCOPE_ALL
          ? `htmlText · ${captions.length} captions`
          : `Caption ${ (selectedIndices?.[0] ?? 0) + 1 }`;

    return {
      outputs: [
        {
          label: summary,
          isFavorite: true,
          payload: { captions },
        },
      ],
    };
  },
  applyOutput: ({ currentData, output }) => {
    const payload = output.payload as { captions?: unknown[] };
    if (!Array.isArray(payload?.captions) || payload.captions.length === 0) {
      return currentData;
    }
    return {
      ...currentData,
      captions: payload.captions,
    };
  },
};
