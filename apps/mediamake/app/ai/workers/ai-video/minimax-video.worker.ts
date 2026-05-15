/**
 * MiniMax (Hailuo) Video Worker — text-to-video and image-to-video via MiniMax API.
 *
 * Latest models (May 2026):
 *   hailuo-2.3        — Latest Hailuo (2026): enhanced dynamic expression, physics accuracy
 *   hailuo-2.3-fast   — 50% faster, 50% cheaper for batch work
 *   hailuo-02         — Foundation model: 3 variants (768p-6s, 768p-10s, 1080p-6s)
 *   video-01          — Previous flagship (still supported)
 *
 * Also available via fal.ai ($0.28/generation):
 *   Set FAL_API_KEY and use the fal.ai routing.
 *
 * Required env vars:
 *   MINIMAX_API_KEY    — MiniMax API key
 *   MINIMAX_GROUP_ID   — MiniMax group/org ID
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 80;
const MINIMAX_BASE = 'https://api.minimaxi.chat/v1';

const InputSchema = z.object({
  prompt: z.string().min(1),
  /** First-frame image URL for image-to-video mode */
  firstFrameImage: z.string().url().optional(),
  model: z.enum([
    'hailuo-2.3',      // Latest (2026) — best quality + expression (default)
    'hailuo-2.3-fast', // 50% faster, 50% cheaper
    'hailuo-02',       // Foundation model
    'video-01',        // Previous flagship, still supported
    'video-01-live2d', // Live2D animation mode
    'video-01-director',
  ]).default('hailuo-2.3'),
  /** Hailuo 02 only: specific variant */
  hailuo02Variant: z.enum(['768p-6s', '768p-10s', '1080p-6s']).optional(),
  /** Whether to apply subject reference (requires subject image) */
  promptOptimizer: z.boolean().optional().default(true),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['minimax']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  videoUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  taskId: z.string().optional(),
  fileId: z.string().optional(),
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

function minimaxFetch(path: string, init: RequestInit, apiKey: string, groupId: string): Promise<Response> {
  const url = new URL(`${MINIMAX_BASE}${path}`);
  url.searchParams.set('GroupId', groupId);
  return fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'minimax-video',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.MINIMAX_API_KEY;
    const groupId = process.env.MINIMAX_GROUP_ID;
    if (!apiKey || !groupId) {
      return { status: 'failed', message: 'MINIMAX_API_KEY or MINIMAX_GROUP_ID is not set' };
    }

    // 1. Trigger video generation
    const body: Record<string, unknown> = {
      model: input.model,
      prompt: input.prompt,
      prompt_optimizer: input.promptOptimizer,
    };
    if (input.firstFrameImage) {
      body.first_frame_image = input.firstFrameImage;
    }

    const triggerRes = await minimaxFetch('/video_generation', { method: 'POST', body: JSON.stringify(body) }, apiKey, groupId);
    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `MiniMax trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      task_id?: string;
      base_resp?: { status_code: number; status_msg: string };
    };

    if (triggerData.base_resp && triggerData.base_resp.status_code !== 0) {
      return { status: 'failed', message: triggerData.base_resp.status_msg };
    }

    const taskId = triggerData.task_id;
    if (!taskId) return { status: 'failed', message: 'No task_id returned from MiniMax' };
    console.log('[minimax] Task started:', taskId);

    // 2. Poll for completion
    let fileId: string | undefined;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await minimaxFetch(`/query/video_generation?task_id=${taskId}`, { method: 'GET' }, apiKey, groupId);
      if (!pollRes.ok) {
        console.warn(`[minimax] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        status: 'Queueing' | 'Processing' | 'Success' | 'Fail';
        file_id?: string;
        base_resp?: { status_code: number; status_msg: string };
      };

      if (poll.base_resp && poll.base_resp.status_code !== 0) {
        return { status: 'failed', message: poll.base_resp.status_msg, taskId };
      }

      console.log(`[minimax] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${poll.status}`);

      if (poll.status === 'Fail') {
        return { status: 'failed', message: 'MiniMax task failed', taskId };
      }
      if (poll.status !== 'Success') continue;

      fileId = poll.file_id;
      break;
    }

    if (!fileId) {
      return { status: 'failed', message: 'Polling timed out or no file_id returned', taskId };
    }

    // 3. Fetch download URL from MiniMax file API
    const fileRes = await minimaxFetch(`/files/retrieve?file_id=${fileId}`, { method: 'GET' }, apiKey, groupId);
    if (!fileRes.ok) {
      return { status: 'failed', message: `Failed to retrieve file metadata (${fileRes.status})`, taskId, fileId };
    }

    const fileData = await fileRes.json() as {
      file?: { download_url?: string; filename?: string; file_size?: number };
      base_resp?: { status_code: number; status_msg: string };
    };

    if (fileData.base_resp && fileData.base_resp.status_code !== 0) {
      return { status: 'failed', message: fileData.base_resp.status_msg, taskId, fileId };
    }

    const downloadUrl = fileData.file?.download_url;
    if (!downloadUrl) return { status: 'failed', message: 'No download URL for file', taskId, fileId };

    // 4. Download, upload to S3, save to MongoDB
    const dlRes = await fetch(downloadUrl);
    if (!dlRes.ok) return { status: 'failed', message: 'Failed to download MiniMax video', taskId, fileId };
    const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

    const generatedFileId = `minimax_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/minimax`;

    const s3Url = await uploadFile({
      id: generatedFileId,
      buffer: videoBuffer,
      contentType: 'video/mp4',
      fileExtension: '.mp4',
      folder,
    });
    if (!s3Url) return { status: 'failed', message: 'S3 upload failed', taskId, fileId };

    const db = await getDatabase();
    const doc: MediaFile = {
      tags: input.tags ?? ['minimax'],
      clientId: input.clientId ?? 'default',
      ...(input.projectId ? { projectId: input.projectId } : {}),
      contentType: 'video',
      contentMimeType: 'video/mp4',
      contentSubType: 'ai-generated',
      contentSource: 'minimax-video',
      metadata: {
        prompt: input.prompt,
        firstFrameImage: input.firstFrameImage,
        model: input.model,
        promptOptimizer: input.promptOptimizer,
        taskId,
        minimaxFileId: fileId,
        fileSize: fileData.file?.file_size,
      },
      fileName: `${generatedFileId}.mp4`,
      fileSize: videoBuffer.length,
      filePath: s3Url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
    console.log('[minimax] Saved mediaFile', String(result.insertedId));

    return { status: 'completed', videoUrl: s3Url, mediaFileId: String(result.insertedId), taskId, fileId };
  },
});
