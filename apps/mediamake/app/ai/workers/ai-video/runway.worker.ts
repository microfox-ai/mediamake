/**
 * RunwayML Worker — image-to-video (Gen-3 Alpha Turbo) via Runway API.
 *
 * Submits a generation task, polls for completion, downloads the video,
 * uploads it to S3, and saves a MediaFile record.
 *
 * Latest models (May 2026):
 *   gen4_5_turbo — Gen-4.5 Turbo (released Feb 10 2026) — default
 *   gen4_turbo   — Gen-4 Turbo, flexible 2-10s durations
 *
 * Required env vars:
 *   RUNWAY_API_KEY — RunwayML API key (Bearer token)
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 8_000;
const MAX_POLL_ATTEMPTS = 90;
const RUNWAY_BASE = 'https://api.dev.runwayml.com/v1';

const InputSchema = z.object({
  promptText: z.string().min(1),
  promptImage: z.string().url().optional(),
  model: z.enum([
    'gen4_5_turbo', // Gen-4.5 Turbo — latest (Feb 2026), best quality
    'gen4_turbo',   // Gen-4 Turbo — flexible durations
    'gen3a_turbo',  // Gen-3 Alpha Turbo — legacy
  ]).default('gen4_5_turbo'),
  duration: z.number().int().min(5).max(10).default(10),
  ratio: z.enum(['1280:768', '768:1280', '1104:832', '832:1104', '960:960', '1584:672']).default('1280:768'),
  seed: z.number().int().optional(),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['runway']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  videoUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  taskId: z.string().optional(),
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

function runwayFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(`${RUNWAY_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'runway',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'RUNWAY_API_KEY is not set' };

    // 1. Submit task
    const body: Record<string, unknown> = {
      model: input.model,
      promptText: input.promptText,
      duration: input.duration,
      ratio: input.ratio,
    };
    if (input.promptImage) body.promptImage = input.promptImage;
    if (input.seed !== undefined) body.seed = input.seed;

    const triggerRes = await runwayFetch('/image_to_video', { method: 'POST', body: JSON.stringify(body) }, apiKey);

    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Runway trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as { id: string };
    const taskId = triggerData.id;
    console.log('[runway] Task submitted:', taskId);

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await runwayFetch(`/tasks/${taskId}`, { method: 'GET' }, apiKey);
      if (!pollRes.ok) {
        console.warn(`[runway] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        id: string;
        status: 'PENDING' | 'THROTTLED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
        failure?: string;
        failureCode?: string;
        output?: string[];
        progress?: number;
      };

      console.log(`[runway] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${poll.status} (${Math.round((poll.progress ?? 0) * 100)}%)`);

      if (poll.status === 'FAILED' || poll.status === 'CANCELLED') {
        return { status: 'failed', message: poll.failure ?? poll.failureCode ?? 'Task failed', taskId };
      }
      if (poll.status !== 'SUCCEEDED') continue;

      const outputUrl = poll.output?.[0];
      if (!outputUrl) return { status: 'failed', message: 'No output URL in response', taskId };

      // 3. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(outputUrl);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download Runway video', taskId };
      const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

      const fileId = `runway_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/runway`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: videoBuffer,
        contentType: 'video/mp4',
        fileExtension: '.mp4',
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed', taskId };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['runway'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: 'video/mp4',
        contentSubType: 'ai-generated',
        contentSource: 'runway',
        metadata: {
          promptText: input.promptText,
          promptImage: input.promptImage,
          model: input.model,
          duration: input.duration,
          ratio: input.ratio,
          seed: input.seed,
          taskId,
        },
        fileName: `${fileId}.mp4`,
        fileSize: videoBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[runway] Saved mediaFile', String(result.insertedId));

      return { status: 'completed', videoUrl: s3Url, mediaFileId: String(result.insertedId), taskId };
    }

    return { status: 'failed', message: 'Polling timed out', taskId: undefined };
  },
});
