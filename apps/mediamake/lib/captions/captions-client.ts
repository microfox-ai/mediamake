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
  return result.captions as CaptionsDocument;
}

export async function getCaptionsDocument(id: string): Promise<CaptionsDocument> {
  const response = await fetch(`/api/captions/${id}`);
  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load captions'));
  }
  const result = await response.json();
  return result.captions as CaptionsDocument;
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
  return result.captions as CaptionsDocument;
}

export function captionsReferenceValue(
  doc: CaptionsDocument,
  fallbackCaptions?: Caption[],
) {
  return {
    captions: doc.captions ?? fallbackCaptions ?? [],
    _id: doc._id?.toString() ?? '',
    title: doc.title ?? '',
    description: doc.description ?? '',
    ...(doc.sourceTranscriptionId
      ? { sourceTranscriptionId: doc.sourceTranscriptionId }
      : {}),
  };
}
