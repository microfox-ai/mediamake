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
      "Selected / active caption uses the timeline selection, or the caption under the playhead when nothing is selected. All captions rearranges the whole reference.",
    ),
  flow: z
    .enum(["singular", "mixed"])
    .default("singular")
    .describe(
      "singular uses one layout for every card. mixed is reserved and currently runs as singular.",
    ),
  layout: z
    .enum(["vertical_box", "horizontal_box", "square_box"])
    .default("vertical_box")
    .describe(
      "vertical_box: 3–5 lines. horizontal_box: 1–2 lines. square_box: 2–3 lines.",
    ),
  fontScaling: z
    .number()
    .positive()
    .default(2)
    .describe("How many times larger bold words are drawn than normal words"),
  maxCharacters: z
    .enum(["any", "15-25", "25to35", "35to45", "45+"])
    .default("any")
    .describe(
      "Effective characters per line. Bold words count as letters × font scaling.",
    ),
  userRequest: z
    .string()
    .optional()
    .describe("Extra direction for the arrangement"),
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
  value: CaptionReferenceValue;
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

  const value = reference.value;
  if (!value?._id) {
    throw new Error("Create or link a captions document before arranging");
  }
  if (!Array.isArray(value.captions) || value.captions.length === 0) {
    throw new Error("Add captions before arranging them");
  }
  return { value, referenceIndex };
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

async function flushCaptions(value: CaptionReferenceValue) {
  const response = await fetch(`/api/captions/${value._id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: value.title ?? "",
      description: value.description ?? "",
      captions: value.captions ?? [],
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to save captions before arranging"));
  }
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
      "Split lines and choose highlights for the selected or active caption. Choose All captions to rearrange the whole reference.",
    supportedReferenceTypes: ["captions"],
    tags: ["caption", "split-and-highlight", "htmlText"],
  },
  inputSchema,
  defaultInputParams: {
    scope: SCOPE_SELECTED,
    flow: "singular",
    layout: "vertical_box",
    fontScaling: 2,
    maxCharacters: "any",
    userRequest: "",
  },
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const parsed = inputSchema.parse(ctx.inputData);
    const { value, referenceIndex } = readCaptionReference(ctx);
    const selectedIndices =
      parsed.scope === SCOPE_ALL
        ? undefined
        : selectedOrActiveIndices(ctx, value, referenceIndex);

    await flushCaptions(value);

    const response = await fetch(AGENT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        captionId: String(value._id),
        ...(value.sourceTranscriptionId
          ? { transcriptionId: String(value.sourceTranscriptionId) }
          : {}),
        ...(selectedIndices ? { selectedIndices } : {}),
        flow: parsed.flow,
        layout: parsed.layout,
        fontScaling: parsed.fontScaling,
        maxCharacters: parsed.maxCharacters,
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
          ? `All captions · ${captions.length} cards`
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
