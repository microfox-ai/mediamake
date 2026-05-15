/**
 * Pika Labs Worker — text-to-video and image-to-video via fal.ai (Pika 2.2).
 *
 * As of Dec 2025, Pika's official API is powered by fal.ai.
 * The primary model is Pika 2.2 (720p / 1080p, 5-10s, MP4).
 *
 * fal.ai uses a queue-based async pattern:
 *   POST /fal-ai/pika-v2-2 → {request_id, response_url, status_url}
 *   GET  status_url         → polls until status === 'COMPLETED'
 *
 * Docs: https://fal.ai/models/fal-ai/pika-v2-2
 *
 * Required env vars:
 *   FAL_API_KEY — fal.ai API key (used for Pika 2.2 and other fal-hosted models)
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 120;
const FAL_QUEUE_BASE = 'https://queue.fal.run';

const InputSchema = z.object({
  promptText: z.string().min(1),
  negativePrompt: z.string().optional(),
  /** Starting image URL for image-to-video */
  imageUrl: z.string().url().optional(),
  /** Ending image URL for end-frame conditioning */
  imageEndUrl: z.string().url().optional(),
  /** fal.ai model ID — Pika 2.2 is the latest */
  model: z.enum(['fal-ai/pika-v2-2', 'fal-ai/pika-v2-2-i2v']).default('fal-ai/pika-v2-2'),
  resolution: z.enum(['720p', '1080p']).optional().default('1080p'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '3:4']).default('16:9'),
  duration: z.number().int().min(5).max(10).default(5),
  /** Camera motion controls */
  cameraMotion: z.object({
    pan: z.number().min(-2).max(2).optional(),
    tilt: z.number().min(-2).max(2).optional(),
    rotate: z.number().min(-2).max(2).optional(),
    zoom: z.number().min(-2).max(2).optional(),
  }).optional(),
  seed: z.number().int().optional(),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['pika']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  videoUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  jobId: z.string().optional(),
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

function falFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'pika-labs',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'FAL_API_KEY is not set' };

    // Determine which model endpoint to use
    const modelId = input.imageUrl ? 'fal-ai/pika-v2-2-i2v' : input.model;

    // 1. Submit to fal.ai queue
    const body: Record<string, unknown> = {
      prompt: input.promptText,
      negative_prompt: input.negativePrompt,
      resolution: input.resolution,
      aspect_ratio: input.aspectRatio,
      duration: input.duration,
    };
    if (input.imageUrl) body.image_url = input.imageUrl;
    if (input.imageEndUrl) body.end_image_url = input.imageEndUrl;
    if (input.seed !== undefined) body.seed = input.seed;
    if (input.cameraMotion) body.camera_motion = input.cameraMotion;

    const triggerRes = await falFetch(`${FAL_QUEUE_BASE}/${modelId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, apiKey);

    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Pika/fal trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      request_id: string;
      status_url: string;
      response_url: string;
    };

    const jobId = triggerData.request_id;
    const statusUrl = triggerData.status_url;
    const responseUrl = triggerData.response_url;
    if (!jobId) return { status: 'failed', message: 'No request_id returned from fal.ai' };
    console.log('[pika] Request submitted:', jobId, 'model:', modelId);

    // 2. Poll status
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await falFetch(statusUrl, { method: 'GET' }, apiKey);
      if (!pollRes.ok) {
        console.warn(`[pika] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
        error?: string;
        logs?: Array<{ message: string }>;
        queue_position?: number;
      };

      console.log(`[pika] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${poll.status}${poll.queue_position !== undefined ? ` (queue: ${poll.queue_position})` : ''}`);

      if (poll.status === 'FAILED') {
        return { status: 'failed', message: poll.error ?? 'fal.ai task failed', jobId };
      }
      if (poll.status !== 'COMPLETED') continue;

      // 3. Fetch result from response_url
      const resultRes = await falFetch(responseUrl, { method: 'GET' }, apiKey);
      if (!resultRes.ok) return { status: 'failed', message: 'Failed to fetch result from fal.ai', jobId };

      const result = await resultRes.json() as {
        video?: { url: string; content_type?: string; file_name?: string; file_size?: number };
      };

      const pikaVideoUrl = result.video?.url;
      if (!pikaVideoUrl) return { status: 'failed', message: 'No video URL in fal.ai result', jobId };

      // 4. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(pikaVideoUrl);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download Pika video', jobId };
      const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

      const fileId = `pika_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/pika`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: videoBuffer,
        contentType: 'video/mp4',
        fileExtension: '.mp4',
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed', jobId };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['pika'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: 'video/mp4',
        contentSubType: 'ai-generated',
        contentSource: 'pika-labs',
        metadata: {
          promptText: input.promptText,
          negativePrompt: input.negativePrompt,
          imageUrl: input.imageUrl,
          model: modelId,
          resolution: input.resolution,
          aspectRatio: input.aspectRatio,
          duration: input.duration,
          cameraMotion: input.cameraMotion,
          seed: input.seed,
          jobId,
        },
        fileName: `${fileId}.mp4`,
        fileSize: videoBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertResult = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[pika] Saved mediaFile', String(insertResult.insertedId));

      return { status: 'completed', videoUrl: s3Url, mediaFileId: String(insertResult.insertedId), jobId };
    }

    return { status: 'failed', message: 'Polling timed out', jobId };
  },
});
