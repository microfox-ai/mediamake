import { z } from "zod";
import type { ActionDefinition, ActionExecuteResult } from "../types";
import { persistCaptionLines, readCaptionReference } from "./caption-reference";

const inputSchema = z.object({});

function emptyMetadata(caption: unknown): unknown {
  if (!caption || typeof caption !== "object" || Array.isArray(caption)) {
    return caption;
  }
  return { ...(caption as Record<string, unknown>), metadata: {} };
}

/** Drop generated metadata, including htmlText. Words, text, and timestamps stay. */
export function cleanCaptionMetadata(captions: unknown[]): unknown[] {
  return captions.map(emptyMetadata);
}

export const captionClean: ActionDefinition = {
  metadata: {
    id: "captionClean",
    title: "Clean Captions",
    description:
      "Empty metadata on every caption line, including htmlText, keywords, and split parts. Words, text, and timestamps stay.",
    supportedReferenceTypes: ["captions"],
    tags: ["caption", "metadata", "htmlText", "reset"],
  },
  inputSchema,
  defaultInputParams: {},
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const value = readCaptionReference(ctx, "Clean captions");
    const captions = cleanCaptionMetadata(value.captions ?? []);
    await persistCaptionLines(value, captions);
    return {
      outputs: [
        {
          label:
            captions.length === 1
              ? "Cleared metadata · 1 caption"
              : `Cleared metadata · ${captions.length} captions`,
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
