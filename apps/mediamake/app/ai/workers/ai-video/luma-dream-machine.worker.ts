/**
 * Luma Dream Machine Worker — text-to-video and image-to-video via Luma AI API.
 *
 * Triggers a generation, polls until the state becomes 'completed' or 'failed',
 * downloads the result, uploads to S3, and saves a MediaFile record.
 *
 * Latest models (May 2026):
 *   ray-3.14 — Ray3.14, 1080p, 4× faster than Ray3, 3× cheaper, HDR pipeline (default)
 *   ray-3    — Ray3, first reasoning video model
 *
 * Required env vars:
 *   LUMA_API_KEY — Luma AI API key
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 80;
const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1';

const KeyframeSchema = z.object({
  type: z.enum(['image', 'generation']),
  url: z.string().url().optional(),
  id: z.string().optional(),
});

const InputSchema = z.object({
  prompt: z.string().min(1),
  model: z.enum([
    'ray-3.14',   // Ray3.14 — latest (2026): 1080p, 4× faster, reasoning-driven (default)
    'ray-3',      // Ray3 — first reasoning video model (2025)
    'ray-2',      // Ray2 — previous gen, still solid
    'ray-flash-2',// Ray Flash 2 — fast/affordable
  ]).default('ray-3.14'),
  resolution: z.enum(['540p', '720p', '1080p']).default('720p'),
  duration: z.enum(['5s', '9s']).default('5s'),
  aspectRatio: z.enum(['16:9', '9:16', '4:3', '3:4', '21:9', '9:21', '1:1']).default('16:9'),
  loop: z.boolean().optional().default(false),
  /** Optional keyframes: frame0 = start image, frame1 = end image */
  keyframes: z.object({
    frame0: KeyframeSchema.optional(),
    frame1: KeyframeSchema.optional(),
  }).optional(),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['luma']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  videoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  generationId: z.string().optional(),
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

function lumaFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(`${LUMA_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'luma-dream-machine',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.LUMA_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'LUMA_API_KEY is not set' };

    // 1. Trigger generation
    const body: Record<string, unknown> = {
      prompt: input.prompt,
      model: input.model,
      resolution: input.resolution,
      duration: input.duration,
      aspect_ratio: input.aspectRatio,
      loop: input.loop,
    };

    if (input.keyframes) {
      body.keyframes = {};
      if (input.keyframes.frame0) (body.keyframes as Record<string, unknown>).frame0 = input.keyframes.frame0;
      if (input.keyframes.frame1) (body.keyframes as Record<string, unknown>).frame1 = input.keyframes.frame1;
    }

    const triggerRes = await lumaFetch('/generations/video', { method: 'POST', body: JSON.stringify(body) }, apiKey);
    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Luma trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as { id: string; state: string };
    const generationId = triggerData.id;
    console.log('[luma] Generation started:', generationId);

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await lumaFetch(`/generations/${generationId}`, { method: 'GET' }, apiKey);
      if (!pollRes.ok) {
        console.warn(`[luma] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        id: string;
        state: 'queued' | 'dreaming' | 'completed' | 'failed';
        failure_reason?: string;
        assets?: {
          video?: string;
          thumbnail?: string;
        };
      };

      console.log(`[luma] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — state: ${poll.state}`);

      if (poll.state === 'failed') {
        return { status: 'failed', message: poll.failure_reason ?? 'Generation failed', generationId };
      }
      if (poll.state !== 'completed') continue;

      const lumaVideoUrl = poll.assets?.video;
      if (!lumaVideoUrl) return { status: 'failed', message: 'No video asset in completed generation', generationId };

      // 3. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(lumaVideoUrl);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download Luma video', generationId };
      const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

      const fileId = `luma_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/luma`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: videoBuffer,
        contentType: 'video/mp4',
        fileExtension: '.mp4',
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed', generationId };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['luma'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: 'video/mp4',
        contentSubType: 'ai-generated',
        contentSource: 'luma-dream-machine',
        metadata: {
          prompt: input.prompt,
          model: input.model,
          resolution: input.resolution,
          duration: input.duration,
          aspectRatio: input.aspectRatio,
          loop: input.loop,
          keyframes: input.keyframes,
          generationId,
          thumbnailUrl: poll.assets?.thumbnail,
        },
        fileName: `${fileId}.mp4`,
        fileSize: videoBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[luma] Saved mediaFile', String(result.insertedId));

      return {
        status: 'completed',
        videoUrl: s3Url,
        thumbnailUrl: poll.assets?.thumbnail,
        mediaFileId: String(result.insertedId),
        generationId,
      };
    }

    return { status: 'failed', message: 'Polling timed out', generationId: undefined };
  },
});
