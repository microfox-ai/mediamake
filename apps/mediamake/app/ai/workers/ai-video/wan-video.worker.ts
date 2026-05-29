/**
 * Wan (Alibaba) Video Worker — text-to-video and image-to-video via Alibaba Cloud Model Studio.
 *
 * Wan 2.1 (launched Feb 2025) and Wan 2.7 are Alibaba's open-source video foundation models.
 * Wan 2.1-VACE (May 2025) adds unified video generation + editing.
 *
 * Models available via Alibaba Cloud Model Studio (dashscope API):
 *   wanx2.1-t2v-turbo    — Text-to-video, fast & affordable
 *   wanx2.1-t2v-plus     — Text-to-video, highest quality (14B params)
 *   wanx2.1-i2v-turbo    — Image-to-video, fast
 *   wanx2.1-i2v-plus     — Image-to-video, highest quality
 *   wanx2.1-vace         — Video generation + editing (first-frame, last-frame, text-based edit)
 *
 * The API is async: POST to submit → poll task status → get result URL.
 *
 * Docs: https://www.alibabacloud.com/help/en/model-studio/wan-vl-api
 *
 * Required env vars:
 *   DASHSCOPE_API_KEY — Alibaba Cloud DashScope API key (sk-...)
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 80;
const DASHSCOPE_BASE = 'https://dashscope-intl.aliyuncs.com/api/v1';

const InputSchema = z.object({
  prompt: z.string().min(1),
  model: z.enum([
    'wanx2.1-t2v-turbo',
    'wanx2.1-t2v-plus',
    'wanx2.1-i2v-turbo',
    'wanx2.1-i2v-plus',
    'wanx2.1-vace',
  ]).default('wanx2.1-t2v-plus'),
  /** Required for image-to-video models (i2v-*) and VACE first-frame */
  imageUrl: z.string().url().optional(),
  /** VACE only: last frame image URL */
  lastFrameImageUrl: z.string().url().optional(),
  /** Video resolution */
  size: z.enum([
    '1280*720',  // 720p landscape
    '720*1280',  // 720p portrait
    '960*960',   // square
    '1920*1080', // 1080p landscape
    '1080*1920', // 1080p portrait
  ]).optional().default('1280*720'),
  /** Duration in seconds */
  duration: z.number().int().min(1).max(10).optional().default(5),
  /** Seed for reproducibility */
  seed: z.number().int().optional(),
  /** Prompt optimizer — let the model enhance the prompt */
  promptOptimizer: z.boolean().optional().default(true),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['wan', 'alibaba']),
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

function dashscopeFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(`${DASHSCOPE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'wan-video',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'DASHSCOPE_API_KEY is not set' };

    const isI2V = input.model.includes('i2v') || Boolean(input.imageUrl);
    if ((input.model.includes('i2v') || input.model === 'wanx2.1-vace') && !input.imageUrl) {
      if (input.model !== 'wanx2.1-vace') {
        return { status: 'failed', message: 'imageUrl is required for image-to-video models' };
      }
    }

    // 1. Trigger generation
    const inputPayload: Record<string, unknown> = {
      prompt: input.prompt,
      size: input.size,
      duration: input.duration,
      prompt_optimizer: input.promptOptimizer,
    };

    if (input.imageUrl) inputPayload.img_url = input.imageUrl;
    if (input.lastFrameImageUrl) inputPayload.img_url_last = input.lastFrameImageUrl;
    if (input.seed !== undefined) inputPayload.seed = input.seed;

    const triggerRes = await dashscopeFetch(`/services/aigc/video-generation/video-synthesis`, {
      method: 'POST',
      body: JSON.stringify({
        model: input.model,
        input: inputPayload,
        parameters: {},
      }),
    }, apiKey);

    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Wan trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      output?: { task_id?: string; task_status?: string };
      code?: string;
      message?: string;
      request_id?: string;
    };

    if (triggerData.code) {
      return { status: 'failed', message: `${triggerData.code}: ${triggerData.message}` };
    }

    const taskId = triggerData.output?.task_id;
    if (!taskId) return { status: 'failed', message: 'No task_id returned from DashScope' };
    console.log('[wan] Task started:', taskId, 'model:', input.model, 'i2v:', isI2V);

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await fetch(
        `${DASHSCOPE_BASE}/tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );

      if (!pollRes.ok) {
        console.warn(`[wan] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        output?: {
          task_id?: string;
          task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
          video_url?: string;
          code?: string;
          message?: string;
          usage?: Record<string, unknown>;
        };
      };

      const taskStatus = poll.output?.task_status;
      console.log(`[wan] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${taskStatus}`);

      if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
        return {
          status: 'failed',
          message: poll.output?.message ?? `Task ${taskStatus}`,
          taskId,
        };
      }
      if (taskStatus !== 'SUCCEEDED') continue;

      const wanVideoUrl = poll.output?.video_url;
      if (!wanVideoUrl) return { status: 'failed', message: 'No video_url in SUCCEEDED response', taskId };

      // 3. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(wanVideoUrl);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download Wan video', taskId };
      const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

      const fileId = `wan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/wan`;

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
        tags: input.tags ?? ['wan', 'alibaba'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: 'video/mp4',
        contentSubType: 'ai-generated',
        contentSource: 'wan-alibaba',
        metadata: {
          prompt: input.prompt,
          model: input.model,
          imageUrl: input.imageUrl,
          lastFrameImageUrl: input.lastFrameImageUrl,
          size: input.size,
          duration: input.duration,
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
      console.log('[wan] Saved mediaFile', String(result.insertedId));

      return { status: 'completed', videoUrl: s3Url, mediaFileId: String(result.insertedId), taskId };
    }

    return { status: 'failed', message: 'Polling timed out', taskId };
  },
});
