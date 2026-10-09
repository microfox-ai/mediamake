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
