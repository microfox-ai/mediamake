/**
 * Kling AI Worker — text-to-video and image-to-video via Kling AI API.
 *
 * Latest models (as of May 2026):
 *   kling-o3           — Newest flagship (Feb 2026): up to 15s, 1080p, native audio
 *   kling-v2.6-pro     — Dec 2025: 1080p at 48 FPS, 10s max, high motion quality
 *   kling-v2.6-std     — Standard quality of v2.6
 *   kling-v2-master    — v2.0, still supported
 *   kling-v1-5         — v1.5, legacy
 *
 * Kling uses JWT auth (API key + secret → HS256-signed token).
 * Triggers a generation task, polls status until success/fail,
 * downloads the output video, uploads to S3, saves a MediaFile record.
 *
 * Required env vars:
 *   KLING_AI_API_KEY    — Kling access key ID
 *   KLING_AI_API_SECRET — Kling access key secret
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { createHmac } from 'node:crypto';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 80;
const KLING_BASE = 'https://api.klingai.com';

const InputSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  imageUrl: z.string().url().optional(),
  imageTailUrl: z.string().url().optional(), // end-frame for i2v
  model: z.enum([
    'kling-o3',        // Latest flagship — 15s, 1080p, native audio (Feb 2026)
    'kling-v2.6-pro',  // 1080p 48FPS, 10s (Dec 2025)
    'kling-v2.6-std',  // Standard quality v2.6
    'kling-v2-master', // v2.0 master
    'kling-v1-5',      // Legacy v1.5
  ]).default('kling-v2.6-pro'),
  mode: z.enum(['std', 'pro']).default('pro'),
  duration: z.enum(['5', '10', '15']).default('10'), // kling-o3 supports 15s
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  cameraControl: z.object({
    type: z.enum(['simple', 'down_back', 'forward_up', 'right_turn_forward', 'left_turn_forward']).optional(),
  }).optional(),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['kling-ai']),
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

/** Build a Kling JWT token from key + secret. */
function buildKlingJwt(apiKey: string, apiSecret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: apiKey,
    exp: now + 1800, // 30 min
    nbf: now - 5,
  })).toString('base64url');
  const signature = createHmac('sha256', apiSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function klingFetch(path: string, init: RequestInit, token: string): Promise<Response> {
  return fetch(`${KLING_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'kling-ai',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.KLING_AI_API_KEY;
    const apiSecret = process.env.KLING_AI_API_SECRET;
    if (!apiKey || !apiSecret) {
      return { status: 'failed', message: 'KLING_AI_API_KEY or KLING_AI_API_SECRET is not set' };
    }

    const token = buildKlingJwt(apiKey, apiSecret);
    const isImageMode = Boolean(input.imageUrl);

    // 1. Trigger generation
    const endpoint = isImageMode ? '/v1/videos/image2video' : '/v1/videos/text2video';
    const body: Record<string, unknown> = {
      model_name: input.model,
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      duration: input.duration,
      aspect_ratio: isImageMode ? undefined : input.aspectRatio,
    };

    if (isImageMode) {
      body.image = input.imageUrl;
      if (input.imageTailUrl) body.image_tail = input.imageTailUrl;
    }

    if (input.cameraControl?.type) {
      body.camera_control = { type: input.cameraControl.type };
    }

    const triggerRes = await klingFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }, token);

    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Kling trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      code: number;
      message: string;
      data?: { task_id: string };
    };

    if (triggerData.code !== 0 || !triggerData.data?.task_id) {
      return { status: 'failed', message: `Kling API error: ${triggerData.message}` };
    }

    const taskId = triggerData.data.task_id;
    console.log('[kling-ai] Task started:', taskId);

    const pollPath = isImageMode
      ? `/v1/videos/image2video/${taskId}`
      : `/v1/videos/text2video/${taskId}`;

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await klingFetch(pollPath, { method: 'GET' }, token);
      if (!pollRes.ok) {
        console.warn(`[kling-ai] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        code: number;
        message: string;
        data?: {
          task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
          task_status_msg?: string;
          task_result?: {
            videos?: Array<{ url: string; duration: string }>;
          };
        };
      };

      if (poll.code !== 0) {
        return { status: 'failed', message: poll.message, taskId };
      }

      const taskData = poll.data!;
      console.log(`[kling-ai] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${taskData.task_status}`);

      if (taskData.task_status === 'failed') {
        return { status: 'failed', message: taskData.task_status_msg ?? 'Task failed', taskId };
      }

      if (taskData.task_status !== 'succeed') continue;

      const videoEntry = taskData.task_result?.videos?.[0];
      if (!videoEntry?.url) {
        return { status: 'failed', message: 'No video URL in result', taskId };
      }

      // 3. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(videoEntry.url);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download Kling video', taskId };
      const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

      const fileId = `kling_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/kling-ai`;

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
        tags: input.tags ?? ['kling-ai'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: 'video/mp4',
        contentSubType: 'ai-generated',
        contentSource: 'kling-ai',
        metadata: {
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          imageUrl: input.imageUrl,
          model: input.model,
          mode: input.mode,
          duration: input.duration,
          aspectRatio: input.aspectRatio,
          taskId,
          klingVideoUrl: videoEntry.url,
        },
        fileName: `${fileId}.mp4`,
        fileSize: videoBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[kling-ai] Saved mediaFile', String(result.insertedId));

      return { status: 'completed', videoUrl: s3Url, mediaFileId: String(result.insertedId), taskId };
    }

    return { status: 'failed', message: 'Polling timed out', taskId };
  },
});
