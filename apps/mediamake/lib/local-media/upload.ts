import { generateAndUploadVideoThumbnail } from '@/lib/video-thumbnail-upload';
import type { LocalMediaRecord } from './types';

export interface CloudCopy {
  url: string;
  mediaId?: string;
}

/**
 * Uploads a local file to cloud storage (same presigned flow as the upload
 * dialog) and creates its media library entry. AI image analysis is skipped
 * so this stays fast enough to run right before a render.
 */
export async function uploadLocalFileToCloud(
  record: LocalMediaRecord,
  file: File,
  {
    clientId,
    signal,
    onProgress,
  }: {
    clientId?: string;
    signal?: AbortSignal;
    onProgress?: (loaded: number, total: number) => void;
  } = {},
): Promise<CloudCopy> {
  const contentType = file.type || record.mimeType || 'application/octet-stream';
  const presigned = await fetch(
    `/api/upload-url?filename=${encodeURIComponent(record.name)}&contentType=${encodeURIComponent(contentType)}`,
    { signal },
  );
  if (!presigned.ok) throw new Error(`Could not get an upload URL for ${record.name}`);
  const { uploadUrl, publicUrl } = (await presigned.json()) as {
    uploadUrl: string;
    publicUrl: string;
  };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-amz-acl', 'public-read');
    xhr.upload.onprogress = (event) =>
      onProgress?.(event.loaded, event.lengthComputable ? event.total : file.size);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload of ${record.name} failed (HTTP ${xhr.status})`));
    xhr.onerror = () => reject(new Error(`Upload of ${record.name} failed (network error)`));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });

  let thumbnail: string | undefined;
  if (record.contentType === 'video') {
    thumbnail = (await generateAndUploadVideoThumbnail(file, signal).catch(() => null)) ?? undefined;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (clientId) headers['x-client-id'] = clientId;
  const created = await fetch('/api/media-files', {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      tags: record.tags,
      ...(record.projectId ? { projectId: record.projectId } : {}),
      contentType: record.contentType,
      contentMimeType: contentType,
      contentSubType: 'upload',
      contentSource: 'upload',
      contentSourceUrl: 'upload',
      fileName: record.name,
      fileSize: file.size,
      filePath: publicUrl,
      analyzeImage: false,
      metadata: {
        src: publicUrl,
        ...(thumbnail ? { thumbnail } : {}),
        ...(record.metadata.duration ? { duration: record.metadata.duration } : {}),
        ...(record.metadata.width ? { width: record.metadata.width } : {}),
        ...(record.metadata.height ? { height: record.metadata.height } : {}),
      },
    }),
  });
  // The file is uploaded either way; a failed library entry only means it
  // won't show under Cloud. Don't fail the caller's render over it.
  let mediaId: string | undefined;
  if (created.ok) {
    const body = await created.json().catch(() => null);
    mediaId = body?._id ?? undefined;
  } else {
    console.warn('[local-media] uploaded but could not create the library entry', record.name);
  }
  return { url: publicUrl, mediaId: mediaId ? String(mediaId) : undefined };
}
