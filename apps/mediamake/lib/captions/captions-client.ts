import type { Caption, CaptionsDocument } from '@/app/types/transcription';

export interface CaptionsWriteBody {
  title?: string;
  description?: string;
  captions?: Caption[];
  sourceTranscriptionId?: string;
  sourceCaptionsId?: string;
  projectId?: string;
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return data.error || fallback;
}

/** Hex id from a string, ObjectId, or `{ $oid }` payload. */
export function captionsDocumentId(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  const record = value as {
    $oid?: unknown;
    oid?: unknown;
    toHexString?: () => string;
  };
  if (typeof record.$oid === 'string') return record.$oid.trim();
  if (typeof record.oid === 'string') return record.oid.trim();
  if (typeof record.toHexString === 'function') {
    try {
      return record.toHexString();
    } catch {
      return '';
    }
  }
  return '';
}

function normalizeCaptionsDocument(doc: unknown, fallbackId?: unknown): CaptionsDocument {
  const record =
    doc && typeof doc === 'object' && !Array.isArray(doc)
      ? (doc as CaptionsDocument)
      : ({} as CaptionsDocument);
  const id = captionsDocumentId(fallbackId) || captionsDocumentId(record._id);
  if (!id) {
    throw new Error('Captions document was created without an id');
  }
  return { ...record, _id: id };
}

export async function createCaptionsDocument(
  body: CaptionsWriteBody,
): Promise<CaptionsDocument> {
  const response = await fetch('/api/captions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to create captions'));
  }
  const result = await response.json();
  return normalizeCaptionsDocument(result.captions, result.id);
}

export async function getCaptionsDocument(id: string): Promise<CaptionsDocument> {
  const response = await fetch(`/api/captions/${id}`);
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load captions'));
  }
  const result = await response.json();
  return normalizeCaptionsDocument(result.captions, result.id ?? id);
}

export async function updateCaptionsDocument(
  id: string,
  body: CaptionsWriteBody,
): Promise<CaptionsDocument> {
  const response = await fetch(`/api/captions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to save captions'));
  }
  const result = await response.json();
  return normalizeCaptionsDocument(result.captions, result.id ?? id);
}

/** Unique caption title derived from a transcription or captions source title. */
export function captionTitleFromSource(sourceTitle?: string | null) {
  const base = sourceTitle?.trim() || 'Untitled';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Build a transcription-shaped document in memory.
 * Caption lines always come from the captions document.
 * Every other field on the captions document is copied onto the transcription.
 * The transcription id and any fields that exist only on the transcription stay.
 * Nothing here is written back to the database.
 */
export function mergeCaptionsOntoTranscription(
  transcription: Record<string, unknown>,
  captionsDoc: CaptionsDocument,
): Record<string, unknown> {
  const captionFields = captionsDoc as unknown as Record<string, unknown>;
  const extras: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(captionFields)) {
    if (key === 'captions' || key === '_id' || value === undefined) continue;
    extras[key] = value;
  }

  return {
    ...transcription,
    ...extras,
    _id: transcription._id,
    captions: Array.isArray(captionsDoc.captions) ? captionsDoc.captions : [],
  };
}

function downloadJsonFile(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function mergedTranscriptionFileName(
  transcription: Record<string, unknown>,
  doc: Pick<CaptionsDocument, 'title'>,
) {
  const title =
    (typeof transcription.title === 'string' && transcription.title.trim()) ||
    doc.title ||
    'transcription';
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'transcription'}-merged.json`;
}

/**
 * Download the source transcription with this caption version's lines merged in.
 * The file is built in memory. Nothing is written back to the database.
 */
export async function downloadMergedTranscription(doc: CaptionsDocument) {
  const sourceId = captionsDocumentId(doc.sourceTranscriptionId);
  if (!sourceId) {
    throw new Error('This caption version is not linked to a transcription');
  }

  const response = await fetch(`/api/transcriptions/${sourceId}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load the source transcription');
  }
  const transcription = data.transcription;
  if (!transcription || typeof transcription !== 'object') {
    throw new Error('Source transcription was empty');
  }

  const record = transcription as Record<string, unknown>;
  downloadJsonFile(
    mergedTranscriptionFileName(record, doc),
    mergeCaptionsOntoTranscription(record, doc),
  );
}

export function captionsReferenceValue(
  doc: CaptionsDocument,
  fallbackCaptions?: Caption[],
) {
  return {
    captions: doc.captions ?? fallbackCaptions ?? [],
    _id: captionsDocumentId(doc._id),
    title: doc.title ?? '',
    description: doc.description ?? '',
    ...(captionsDocumentId(doc.sourceTranscriptionId)
      ? { sourceTranscriptionId: captionsDocumentId(doc.sourceTranscriptionId) }
      : {}),
  };
}
