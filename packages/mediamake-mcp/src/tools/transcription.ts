import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { json, mimeFromName, safe } from '../util.js';
import { uploadBytes } from './media.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;

const PROVIDER_ROUTES = {
  assembly: '/api/transcribe/assembly',
  'elevenlabs-stt': '/api/transcribe/elevenlabs-stt',
  gemini: '/api/transcribe/gemini',
} as const;

const saveToSchema = z
  .string()
  .optional()
  .describe(
    'Absolute path on this machine to write the captions as JSON, e.g. <lyrics_videos project>/input/lyrics.json. The file is the mediamake caption format lyrics_videos reads directly.',
  );

/** Strip a transcription to what a caller needs; processingData holds the raw provider dump. */
function compactTranscription(t: any, includeWords: boolean) {
  const captions: any[] = Array.isArray(t?.captions) ? t.captions : [];
  return {
    id: t?._id,
    title: t?.title,
    audioUrl: t?.audioUrl,
    language: t?.language,
    status: t?.status,
    tags: t?.tags,
    lyrics: t?.sunoLyrics,
    createdAt: t?.createdAt,
    captionCount: captions.length,
    duration: captions.length
      ? (captions[captions.length - 1].absoluteEnd ??
        captions[captions.length - 1].end)
      : undefined,
    captions: includeWords
      ? captions
      : captions.map(c => ({
          id: c.id,
          text: c.text,
          absoluteStart: c.absoluteStart ?? c.start,
          absoluteEnd: c.absoluteEnd ?? c.end,
        })),
  };
}

async function save(path: string | undefined, captions: unknown) {
  if (!path) return undefined;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(captions, null, 2));
  return path;
}

export function registerTranscriptionTools(
  server: McpServer,
  client: MediamakeClient,
) {
  server.registerTool(
    'transcribe',
    {
      title: 'Transcribe audio',
      description:
        'Transcribe a song or voice track into timed captions (lines with word timings) and save it in the Mediamake transcription library. Pass lyrics when you have them (for example from Suno) so they are stored beside the timed captions. A local filePath is uploaded first. Signed CDN links (Suno) expire: pass them as sourceUrl through upload_media first, or here as filePath after downloading.',
      inputSchema: {
        audioUrl: z.string().url().optional().describe('Public https URL'),
        filePath: z
          .string()
          .optional()
          .describe('Absolute local path; uploaded to Mediamake storage first'),
        provider: z
          .enum(['assembly', 'elevenlabs-stt', 'gemini'])
          .default('assembly'),
        language: z.string().optional().describe('Language code, or "auto"'),
        title: z.string().optional(),
        tags: z.array(z.string()).optional(),
        lyrics: z.string().optional().describe('Known lyrics or script text'),
        includeWords: z
          .boolean()
          .default(false)
          .describe(
            'Return word timings inline (large); saveTo always gets them',
          ),
        saveTo: saveToSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    safe(
      async ({
        audioUrl,
        filePath,
        provider,
        language,
        title,
        tags,
        lyrics,
        includeWords,
        saveTo,
      }) => {
        if (!audioUrl === !filePath)
          throw new Error('Pass exactly one of audioUrl or filePath.');
        let url = audioUrl;
        if (filePath) {
          const name = basename(filePath);
          const uploaded = await uploadBytes(client, await readFile(filePath), {
            fileName: name,
            mimeType: mimeFromName(name) ?? 'audio/mpeg',
            tags: tags?.length ? tags : ['transcription'],
            contentSource: 'upload',
            analyzeImage: false,
          });
          url = uploaded.url;
        }
        const res = await client.post(PROVIDER_ROUTES[provider], {
          audioUrl: url,
          language,
          title,
          tags,
          ...(lyrics ? { sunoLyrics: lyrics } : {}),
        });
        const transcription = res.transcription ?? res;
        const savedTo = await save(
          saveTo,
          transcription.captions ?? res.captions ?? [],
        );
        return json({
          ...compactTranscription(transcription, includeWords),
          savedTo,
        });
      },
    ),
  );

  server.registerTool(
    'list_transcriptions',
    {
      title: 'List transcriptions',
      description:
        'List saved transcriptions, newest first. search matches title, description, keywords, tags and audio URL.',
      inputSchema: {
        search: z.string().optional(),
        tags: z.array(z.string()).optional(),
        language: z.string().optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: READ,
    },
    safe(async ({ tags, ...rest }) =>
      json(
        await client.get('/api/transcriptions', {
          ...rest,
          tags: tags?.join(','),
        }),
      ),
    ),
  );

  server.registerTool(
    'get_transcription',
    {
      title: 'Get transcription',
      description:
        "Get one transcription's captions. Optionally write them to a local lyrics.json.",
      inputSchema: {
        id: z.string(),
        includeWords: z.boolean().default(false),
        saveTo: saveToSchema,
      },
      annotations: READ,
    },
    safe(async ({ id, includeWords, saveTo }) => {
      const { transcription } = await client.get(
        `/api/transcriptions/${encodeURIComponent(id)}`,
      );
      const savedTo = await save(saveTo, transcription.captions ?? []);
      return json({
        ...compactTranscription(transcription, includeWords),
        savedTo,
      });
    }),
  );
}
