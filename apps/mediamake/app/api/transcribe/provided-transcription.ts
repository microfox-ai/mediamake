import type { ProcessingData } from "@/app/types/transcription";

type WithLyrics = {
  _id?: unknown;
  sunoLyrics?: string;
  processingData?: ProcessingData;
};

/** User-pasted lyrics or script. Empty text is treated as not given. */
export function readProvidedTranscription(body: {
  userWrittenTranscription?: string | null;
  sunoLyrics?: string | null;
}): string | undefined {
  const raw = body.userWrittenTranscription ?? body.sunoLyrics;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Keep the spoken captions, and store the user's text beside them. */
export function attachProvidedTranscription<T extends WithLyrics>(
  doc: T,
  provided: string | undefined,
): T {
  if (!provided) return doc;
  return {
    ...doc,
    sunoLyrics: provided,
    processingData: {
      ...(doc.processingData ?? {}),
      step1: {
        ...(doc.processingData?.step1 ?? {}),
        sunoLyrics: provided,
        lyrics: provided,
        userWrittenTranscription: provided,
      },
    },
  };
}

/** Mongo `$set` fields for the user's text. An empty string clears it. */
export function providedTranscriptionSet(provided: string) {
  return {
    sunoLyrics: provided,
    "processingData.step1.sunoLyrics": provided,
    "processingData.step1.lyrics": provided,
    "processingData.step1.userWrittenTranscription": provided,
    updatedAt: new Date(),
  };
}

/** Write the user's text onto an existing transcription without touching its captions. */
export async function persistProvidedTranscription<T extends WithLyrics>(
  collection: {
    updateOne: (filter: any, update: any) => Promise<unknown>;
  },
  existing: T,
  provided: string | undefined,
): Promise<T> {
  if (!provided || existing._id == null) return existing;
  await collection.updateOne(
    { _id: existing._id },
    { $set: providedTranscriptionSet(provided) },
  );
  return attachProvidedTranscription(existing, provided);
}
