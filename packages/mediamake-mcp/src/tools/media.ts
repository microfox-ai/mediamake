import type { MediamakeClient } from '../client.js';
import { contentTypeFromMime } from '../util.js';

// The media tools (list_media, search_media, get_media, upload_media) moved to ProjectSync
// (packages/projectsync-mcp), where media belongs to a project. transcribe still uploads a local
// file through this helper.

/**
 * Puts bytes in Mediamake storage: presigned PUT from /api/upload-url, then a
 * media library entry via /api/media-files. Returns the library entry.
 */
export async function uploadBytes(
  client: MediamakeClient,
  bytes: Uint8Array,
  options: {
    fileName: string;
    mimeType: string;
    tags: string[];
    projectId?: string;
    contentSource: string;
    contentSourceUrl?: string;
    analyzeImage?: boolean;
    metadata?: Record<string, unknown>;
  },
) {
  const presigned = await client.get('/api/upload-url', {
    filename: options.fileName,
    contentType: options.mimeType,
  });
  const put = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    // The URL is signed with ACL public-read, so the header must match.
    headers: { 'Content-Type': options.mimeType, 'x-amz-acl': 'public-read' },
    body: bytes,
  });
  if (!put.ok) {
    throw new Error(
      `Upload to storage failed (${put.status}): ${(await put.text()).slice(0, 300)}`,
    );
  }

  const entry = await client.post('/api/media-files', {
    tags: options.tags,
    ...(options.projectId ? { projectId: options.projectId } : {}),
    contentType: contentTypeFromMime(options.mimeType),
    contentMimeType: options.mimeType,
    contentSource: options.contentSource,
    contentSourceUrl: options.contentSourceUrl ?? 'upload',
    fileName: options.fileName,
    fileSize: bytes.byteLength,
    filePath: presigned.publicUrl,
    analyzeImage: options.analyzeImage ?? true,
    ...(options.metadata ? { metadata: options.metadata } : {}),
  });
  return { url: presigned.publicUrl, mediaFile: entry };
}
