import { z } from "zod";
import type { Caption } from "@/app/types/transcription";
import type { ActionDefinition, ActionExecuteContext, ActionExecuteResult } from "../types";
import { persistCaptionLines, type CaptionReferenceValue } from "./caption-reference";
import { captionsDocumentId } from "@/lib/captions/captions-client";

const inputSchema = z.object({});

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return (data as { error?: string }).error || fallback;
}

function cloneCaptions(captions: Caption[]): Caption[] {
  return JSON.parse(JSON.stringify(captions)) as Caption[];
}

function readResetTarget(ctx: ActionExecuteContext): CaptionReferenceValue {
  const target = ctx.action.target;
  if (target.type !== "reference") {
    throw new Error("Reset captions only runs on a captions reference");
  }

  const references = ctx.timeline.defaultData?.references || [];
  const reference = references.find(
    (item: { key?: string }) => item.key === target.referenceKey,
  ) as { type?: string; value?: CaptionReferenceValue } | undefined;

  if (!reference || reference.type !== "captions") {
    throw new Error("Link this action to a captions reference");
  }

  const value = reference.value;
  if (!captionsDocumentId(value?._id)) {
    throw new Error("Create or link a captions document before resetting");
  }
  return value ?? {};
}

/** Copy the linked transcription's captions onto this captions document. */
export const captionReset: ActionDefinition = {
  metadata: {
    id: "captionReset",
    title: "Reset Captions",
    description:
      "Replace these caption lines with the captions stored on the linked transcription. The transcription document is not changed.",
    supportedReferenceTypes: ["captions"],
    tags: ["caption", "reset", "transcription"],
  },
  inputSchema,
  defaultInputParams: {},
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const value = readResetTarget(ctx);
    const transcriptionId = captionsDocumentId(value.sourceTranscriptionId);
    if (!transcriptionId) {
      throw new Error(
        "Link this captions document to a transcription before resetting",
      );
    }

    const response = await fetch(`/api/transcriptions/${transcriptionId}`);
    if (!response.ok) {
      throw new Error(await readError(response, "Failed to load the transcription"));
    }
    const result = (await response.json()) as {
      transcription?: { captions?: Caption[] };
    };
    const source = result.transcription?.captions;
    if (!Array.isArray(source) || source.length === 0) {
      throw new Error("The linked transcription has no captions to restore");
    }

    const captions = cloneCaptions(source);
    await persistCaptionLines(value, captions);

    return {
      outputs: [
        {
          label:
            captions.length === 1
              ? "Restored 1 caption from the transcription"
              : `Restored ${captions.length} captions from the transcription`,
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
