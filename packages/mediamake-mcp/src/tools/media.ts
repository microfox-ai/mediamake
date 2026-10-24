import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { contentTypeFromMime, json, mimeFromName, safe } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;

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

export function registerMediaTools(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'list_media',
    {
      title: 'List media',
      description:
        'List files in the Mediamake media library, newest first, with filters.',
      inputSchema: {
        contentType: z.enum(['image', 'video', 'audio', 'document']).optional(),
        tags: z
          .array(z.string())
          .optional()
          .describe('Match any of these tags'),
        projectId: z
          .string()
          .optional()
          .describe('"default" for media with no project'),
        contentSource: z
          .string()
          .optional()
          .describe('e.g. midjourney, upload, url, google-veo, elevenlabs-tts'),
        ids: z.array(z.string()).optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
      annotations: READ,
    },
    safe(async ({ tags, ids, ...rest }) =>
      json(
        await client.get('/api/media-files', {
          ...rest,
          tags: tags?.join(','),
          ids: ids?.join(','),
        }),
      ),
    ),
  );

  server.registerTool(
    'search_media',
    {
      title: 'Search media',
      description:
        'Semantic search over the analysed media library (descriptions, keywords, art style, colours). Good for "moody purple neon cityscape" style queries.',
      inputSchema: {
        q: z.string().min(1),
        projectId: z.string().optional(),
        tags: z.array(z.string()).optional(),
        mediaType: z.string().optional().describe('image, video, audio'),
        aspectRatioType: z.string().optional().describe('e.g. 16:9, 9:16, 1:1'),
        artStyle: z.string().optional(),
        topK: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Number of results, default 10'),
      },
      annotations: READ,
    },
    safe(async ({ tags, ...rest }) =>
      json(
        await client.get('/api/sparkboard/search', {
          ...rest,
          tags: tags?.join(','),
        }),
      ),
    ),
  );

  server.registerTool(
    'get_media',
    {
      title: 'Get media file',
      description: 'Get one media library entry with all its metadata.',
      inputSchema: { id: z.string() },
      annotations: READ,
    },
    safe(async ({ id }) =>
      json(await client.get(`/api/media-files/${encodeURIComponent(id)}`)),
    ),
  );

  server.registerTool(
    'upload_media',
    {
      title: 'Upload media',
      description:
        'Put a file into Mediamake storage and the media library, and return its public URL. Give either a local filePath or a sourceUrl. A sourceUrl is downloaded here and re-uploaded, which also makes short-lived signed links (Suno, Midjourney CDN) permanent and usable for transcription and renders.',
      inputSchema: {
        filePath: z
          .string()
          .optional()
          .describe('Absolute path on the machine running this server'),
        sourceUrl: z.string().url().optional(),
        fileName: z
          .string()
          .optional()
          .describe('Defaults to the file or URL name'),
        mimeType: z
          .string()
          .optional()
          .describe('Defaults to a guess from the extension or the download'),
        tags: z
          .array(z.string())
          .min(1)
          .describe('At least one tag (the library requires it)'),
        projectId: z.string().optional(),
        analyzeImage: z
          .boolean()
          .default(true)
          .describe('Run AI description and keywords on images'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    safe(
      async ({
        filePath,
        sourceUrl,
        fileName,
        mimeType,
        tags,
        projectId,
        analyzeImage,
      }) => {
        if (!filePath === !sourceUrl)
          throw new Error('Pass exactly one of filePath or sourceUrl.');

        let bytes: Uint8Array;
        let name: string;
        let mime: string | undefined = mimeType;
        if (filePath) {
          const info = await stat(filePath);
          if (!info.isFile()) throw new Error(`${filePath} is not a file`);
          bytes = await readFile(filePath);
          name = fileName ?? basename(filePath);
        } else {
          const res = await fetch(sourceUrl!);
          if (!res.ok)
            throw new Error(`Download failed (${res.status}) for ${sourceUrl}`);
          bytes = new Uint8Array(await res.arrayBuffer());
          name =
            fileName ?? (basename(new URL(sourceUrl!).pathname) || 'download');
          const header = res.headers.get('content-type')?.split(';')[0].trim();
          mime ??=
            header && header !== 'application/octet-stream'
              ? header
              : undefined;
        }
        mime ??= mimeFromName(name) ?? 'application/octet-stream';

        const result = await uploadBytes(client, bytes, {
          fileName: name,
          mimeType: mime,
          tags,
          projectId,
          contentSource: sourceUrl ? 'url' : 'upload',
          contentSourceUrl: sourceUrl,
          analyzeImage,
        });
        return json(result);
      },
    ),
  );
}
