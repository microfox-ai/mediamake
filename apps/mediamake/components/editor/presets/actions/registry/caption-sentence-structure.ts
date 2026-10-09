import { z } from "zod";
import type { ActionDefinition, ActionExecuteContext, ActionExecuteResult } from "../types";

const AGENT_PATH = "/api/studio/chat/agent/autofix/sentence-structure";

const inputSchema = z.object({
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
    .describe("Extra direction for the arrangement"),
});

type CaptionReferenceValue = {
  _id?: string;
  title?: string;
  description?: string;
  sourceTranscriptionId?: string;
  captions?: unknown[];
};

function readCaptionReference(ctx: ActionExecuteContext): CaptionReferenceValue {
  const target = ctx.action.target;
  if (target.type !== "reference") {
    throw new Error("Sentence structure only runs on a captions reference");
  }

  const references = ctx.timeline.defaultData?.references || [];
  const reference = references.find(
    (item: { key?: string }) => item.key === target.referenceKey,
  ) as { type?: string; value?: CaptionReferenceValue } | undefined;

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
  return value;
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return (data as { error?: string; message?: string }).error
    || (data as { message?: string }).message
    || fallback;
}

/** Push the editor's current lines so the agent does not arrange a stale document. */
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
    const last = result[result.length - 1] as { parts?: Array<Record<string, unknown>> } | undefined;
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

function captionsFromOutput(output: Record<string, unknown>): unknown[] {
  const doc = output.captions;
  if (Array.isArray(doc)) return doc;
  if (doc && typeof doc === "object" && Array.isArray((doc as { captions?: unknown[] }).captions)) {
    return (doc as { captions: unknown[] }).captions;
  }
  return [];
}

export const captionSentenceStructure: ActionDefinition = {
  metadata: {
    id: "captionSentenceStructure",
    title: "Sentence Structure",
    description:
      "Arrange this captions reference into motion-graphics cards. Bold words scale by fontScaling. Words and timestamps stay on the source lines.",
    supportedReferenceTypes: ["captions"],
    tags: ["caption", "caption-autofix", "sentence-structure"],
  },
  inputSchema,
  defaultInputParams: {
    frameChoice: "vertical_box",
    lineLength: "medium",
    fontScaling: 2,
    staticFrameChoice: true,
    userRequest: "",
  },
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const parsed = inputSchema.parse(ctx.inputData);
    const value = readCaptionReference(ctx);
    await flushCaptions(value);

    const response = await fetch(AGENT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        captionId: String(value._id),
        ...(value.sourceTranscriptionId
          ? { transcriptionId: String(value.sourceTranscriptionId) }
          : {}),
        frameChoice: parsed.frameChoice,
        lineLength: parsed.lineLength,
        fontScaling: parsed.fontScaling,
        staticFrameChoice: parsed.staticFrameChoice,
        ...(parsed.userRequest?.trim()
          ? { userRequest: parsed.userRequest.trim() }
          : {}),
        applyToDatabase: true,
      }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Sentence structure failed"));
    }

    const output = outputFromAgentResponse(await response.json());
    if (!output || output.success === false) {
      throw new Error(
        typeof output?.summary === "string"
          ? output.summary
          : "Sentence structure returned no arrangement",
      );
    }

    const captions = captionsFromOutput(output);
    if (captions.length === 0) {
      throw new Error("Sentence structure returned no captions");
    }

    const summary =
      typeof output.summary === "string"
        ? output.summary
        : `${parsed.frameChoice} · ${captions.length} cards`;

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
