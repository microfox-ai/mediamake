/**
 * D-ID Worker — AI talking-portrait video generation.
 *
 * Animates a face image to speak either a text script (voiced by D-ID's TTS
 * providers) or a pre-recorded audio clip. Great alternative to HeyGen for
 * portrait-style content.
 *
 * Async pattern: POST /v1/talks → poll GET /v1/talks/{id} until 'done'.
 *
 * Docs: https://docs.d-id.com/reference/createtalk
 *
 * Required env vars:
 *   DID_API_KEY — D-ID API key (Basic auth: base64 of "email:key")
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 8_000;
const MAX_POLL_ATTEMPTS = 80;
const DID_BASE = 'https://api.d-id.com';

const TextScriptSchema = z.object({
  type: z.literal('text'),
  input: z.string().min(1).max(10000),
  provider: z.object({
    type: z.enum(['microsoft', 'amazon', 'elevenlabs', 'afflorithmics']).default('microsoft'),
    voice_id: z.string(),
    /** Language code e.g. "en-US" */
    language: z.string().optional(),
  }),
});

const AudioScriptSchema = z.object({
  type: z.literal('audio'),
  /** Publicly accessible audio URL (MP3, WAV, M4A) */
  audio_url: z.string().url(),
});

const InputSchema = z.object({
  /** Publicly accessible image URL of the face to animate */
  sourceImageUrl: z.string().url(),
  script: z.discriminatedUnion('type', [TextScriptSchema, AudioScriptSchema]),
  /** Driver video URL — determines the facial motion pattern */
  driverUrl: z.string().url().optional(),
  /** Stitch the talking face back into the original image background */
  stitch: z.boolean().optional().default(true),
  /** Output image dimensions override */
  result_format: z.enum(['mp4', 'gif', 'mov']).optional().default('mp4'),
  /** Express micro-expressions mode */
  expressiveDriverUrl: z.string().url().optional(),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['d-id']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  videoUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  talkId: z.string().optional(),
  duration: z.number().optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 900,
  memorySize: 1024,
  group: 'ai-video',
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function didFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  // D-ID uses Basic auth: base64("email:key") OR just the key as Basic header
  const authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`;
  return fetch(`${DID_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'd-id',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.DID_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'DID_API_KEY is not set' };

    // 1. Trigger talk generation
    const body: Record<string, unknown> = {
      source_url: input.sourceImageUrl,
      script: input.script,
      config: {
        stitch: input.stitch,
        result_format: input.result_format,
      },
    };
    if (input.driverUrl) body.driver_url = input.driverUrl;
    if (input.expressiveDriverUrl) body.expressive_driver_url = input.expressiveDriverUrl;

    const triggerRes = await didFetch('/v1/talks', { method: 'POST', body: JSON.stringify(body) }, apiKey);
    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `D-ID trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      id: string;
      status: string;
      error?: { description: string };
    };

    if (triggerData.error) return { status: 'failed', message: triggerData.error.description };

    const talkId = triggerData.id;
    console.log('[d-id] Talk started:', talkId);

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await didFetch(`/v1/talks/${talkId}`, { method: 'GET' }, apiKey);
      if (!pollRes.ok) {
        console.warn(`[d-id] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        id: string;
        status: 'created' | 'started' | 'done' | 'error' | 'rejected';
        result_url?: string;
        duration?: number;
        error?: { kind: string; description: string };
      };

      console.log(`[d-id] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${poll.status}`);

      if (poll.status === 'error' || poll.status === 'rejected') {
        return { status: 'failed', message: poll.error?.description ?? `Talk ${poll.status}`, talkId };
      }
      if (poll.status !== 'done') continue;

      const didVideoUrl = poll.result_url;
      if (!didVideoUrl) return { status: 'failed', message: 'No result_url in done response', talkId };

      // 3. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(didVideoUrl);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download D-ID video', talkId };
      const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

      const fileId = `did_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/d-id`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: videoBuffer,
        contentType: 'video/mp4',
        fileExtension: '.mp4',
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed', talkId };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['d-id'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: 'video/mp4',
        contentSubType: 'ai-generated',
        contentSource: 'd-id',
        metadata: {
          sourceImageUrl: input.sourceImageUrl,
          scriptType: input.script.type,
          script: input.script.type === 'text' ? input.script.input : undefined,
          audioUrl: input.script.type === 'audio' ? input.script.audio_url : undefined,
          stitch: input.stitch,
          duration: poll.duration,
          talkId,
        },
        fileName: `${fileId}.mp4`,
        fileSize: videoBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[d-id] Saved mediaFile', String(result.insertedId));

      return {
        status: 'completed',
        videoUrl: s3Url,
        mediaFileId: String(result.insertedId),
        talkId,
        duration: poll.duration,
      };
    }

    return { status: 'failed', message: 'Polling timed out', talkId };
  },
});
