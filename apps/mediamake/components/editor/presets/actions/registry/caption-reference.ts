import type { Caption } from "@/app/types/transcription";
import type { ActionExecuteContext } from "../types";
import {
  captionsDocumentId,
  updateCaptionsDocument,
} from "@/lib/captions/captions-client";

export type CaptionReferenceValue = {
  _id?: unknown;
  title?: string;
  description?: string;
  sourceTranscriptionId?: string;
  captions?: unknown[];
};

export function readCaptionReference(
  ctx: ActionExecuteContext,
  actionName: string,
): CaptionReferenceValue {
  const target = ctx.action.target;
  if (target.type !== "reference") {
    throw new Error(`${actionName} only runs on a captions reference`);
  }

  const references = ctx.timeline.defaultData?.references || [];
  const reference = references.find(
    (item: { key?: string }) => item.key === target.referenceKey,
  ) as { type?: string; value?: CaptionReferenceValue } | undefined;

  if (!reference || reference.type !== "captions") {
    throw new Error("Link this action to a captions reference");
  }

  const value = reference.value;
  if (!value || !Array.isArray(value.captions) || value.captions.length === 0) {
    throw new Error("The captions document has no lines");
  }
  return value;
}

/** Keep the captions collection in step with the timeline reference. */
export async function persistCaptionLines(
  value: CaptionReferenceValue,
  captions: unknown[],
) {
  const id = captionsDocumentId(value._id);
  if (!id) return;
  await updateCaptionsDocument(id, {
    title: value.title ?? "",
    description: value.description ?? "",
    captions: captions as Caption[],
  });
}
