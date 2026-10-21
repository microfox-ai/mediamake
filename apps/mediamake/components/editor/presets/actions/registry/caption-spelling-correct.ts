import { z } from "zod";
import type { ActionDefinition, ActionExecuteResult } from "../types";
import { persistCaptionLines, readCaptionReference } from "./caption-reference";
import { captionsDocumentId } from "@/lib/captions/captions-client";
import { getReferenceLyrics } from "@/app/ai/agents/autofix/lib/lyricsReference";
import type { Transcription } from "@/app/types/transcription";

const AGENT_PATH = "/api/studio/chat/agent/autofix/caption-spelling";

const inputSchema = z.object({
  userRequest: z
    .string()
    .optional()
    .describe("Extra direction for the wording fixes"),
});

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
      if (
        typeof part?.type === "string" &&
        part.type.startsWith("tool-") &&
        part.output
      ) {
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
  if (
    doc &&
    typeof doc === "object" &&
    Array.isArray((doc as { captions?: unknown[] }).captions)
  ) {
    return (doc as { captions: unknown[] }).captions;
  }
  return [];
}

export const captionSpellingCorrect: ActionDefinition = {
  metadata: {
    id: "captionSpellingCorrect",
    title: "Spelling Correct",
    description:
      "Fix wording on this captions document using the lyrics saved on the linked transcription. Runs only when those lyrics exist. The transcription document is left unchanged.",
    supportedReferenceTypes: ["captions"],
    tags: ["caption", "caption-autofix", "spelling"],
  },
  inputSchema,
  defaultInputParams: {
    userRequest: "",
  },
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const parsed = inputSchema.parse(ctx.inputData);
    const value = readCaptionReference(ctx, "Spelling correct");
    const transcriptionId = captionsDocumentId(value.sourceTranscriptionId);
    if (!transcriptionId) {
      throw new Error(
        "Link this captions document to a transcription before correcting spelling",
      );
    }
    const captionId = captionsDocumentId(value._id);
    if (!captionId) {
      throw new Error("Create or link a captions document before correcting spelling");
    }

    const transcriptionResponse = await fetch(`/api/transcriptions/${transcriptionId}`);
    if (!transcriptionResponse.ok) {
      throw new Error(
        await readError(transcriptionResponse, "Failed to load the linked transcription"),
      );
    }
    const transcriptionResult = (await transcriptionResponse.json()) as {
      transcription?: Partial<Transcription>;
    };
    if (!getReferenceLyrics(transcriptionResult.transcription)) {
      throw new Error(
        "Spelling correct only runs when the linked transcription has lyrics",
      );
    }

    await persistCaptionLines(value, value.captions ?? []);

    const response = await fetch(AGENT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        captionId,
        transcriptionId,
        ...(parsed.userRequest?.trim()
          ? { userRequest: parsed.userRequest.trim() }
          : {}),
        applyToDatabase: true,
      }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Spelling correct failed"));
    }

    const output = outputFromAgentResponse(await response.json());
    if (!output || output.success === false) {
      throw new Error(
        typeof output?.summary === "string"
          ? output.summary
          : typeof output?.error === "string"
            ? output.error
            : "Spelling correct returned no wording",
      );
    }

    const captions = captionsFromOutput(output);
    if (captions.length === 0) {
      throw new Error("Spelling correct returned no captions");
    }

    const summary =
      typeof output.summary === "string" ? output.summary : "Spelling corrected";

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
