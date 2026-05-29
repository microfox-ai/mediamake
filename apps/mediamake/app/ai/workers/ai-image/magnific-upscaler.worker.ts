/**
 * Magnific Upscaler Worker — AI image upscaling via Freepik/Magnific API.
 *
 * Magnific was acquired/rebranded under Freepik in April 2026.
 * The API supports up to 16× upscaling with creative enhancement,
 * detail generation, and style-aware processing.
 *
 * Async pattern: POST to trigger → poll by task_id until complete.
 *
 * Endpoint: POST /api/image-upscaler-creative (Freepik API)
 * Docs: https://docs.magnific.com/api-reference/image-upscaler-creative
 *
 * Required env vars:
 *   FREEPIK_API_KEY — Freepik/Magnific API key
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 6_000;
const MAX_POLL_ATTEMPTS = 60;
const FREEPIK_BASE = 'https://api.freepik.com';

const InputSchema = z.object({
  imageUrl: z.string().url(),
  /**
   * Scale factor: 2, 4, 8, or 16.
   * Price scales with output pixel count.
   */
  scale: z.number().int().refine(v => [2, 4, 8, 16].includes(v), 'scale must be 2, 4, 8, or 16').default(4),
  /**
   * Creative enhancement level:
   *   0 — Pure upscale, no creative changes
   *   3 — Maximum creative detail generation
   */
  creativity: z.number().int().min(0).max(3).optional().default(2),
  /**
   * How much detail to hallucinate.
   * Higher = sharper, more detailed (may deviate from source).
   */
  detail: z.number().min(0).max(1).optional().default(0.5),
  /**
   * HDR enhancement (0–1):
   * Makes lighting and contrast more dynamic.
   */
  hdr: z.number().min(0).max(1).optional().default(0),
  /** Sharpen (0 = off, 1 = maximum) */
  sharpness: z.number().min(0).max(1).optional().default(0.5),
  /** Fractality — adds fractal detail to textures */
  fractality: z.number().min(0).max(1).optional().default(0),
  /** Optional text prompt to guide what details to add */
  prompt: z.string().optional(),
  outputFormat: z.enum(['jpeg', 'png', 'webp']).optional().default('jpeg'),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['magnific', 'upscaler']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  imageUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  taskId: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 600,
  memorySize: 1024,
  group: 'ai-image',
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function freepikFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(`${FREEPIK_BASE}${path}`, {
    ...init,
    headers: {
      'x-freepik-api-key': apiKey,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'magnific-upscaler',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'FREEPIK_API_KEY is not set' };

    // 1. Trigger upscaling
    const body: Record<string, unknown> = {
      image: { url: input.imageUrl },
      scale: input.scale,
      creativity: input.creativity,
      detail: input.detail,
      hdr: input.hdr,
      sharpness: input.sharpness,
      fractality: input.fractality,
      output_format: input.outputFormat,
    };
    if (input.prompt) body.prompt = input.prompt;

    const triggerRes = await freepikFetch('/api/image-upscaler-creative', {
      method: 'POST',
      body: JSON.stringify(body),
    }, apiKey);

    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Magnific trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      data?: { task_id?: string; id?: string };
      task_id?: string;
    };

    const taskId = triggerData.data?.task_id ?? triggerData.data?.id ?? triggerData.task_id;
    if (!taskId) return { status: 'failed', message: 'No task_id returned from Magnific' };
    console.log('[magnific] Task started:', taskId, `${input.scale}×`);

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await freepikFetch(`/api/image-upscaler-creative/${taskId}`, { method: 'GET' }, apiKey);
      if (!pollRes.ok) {
        console.warn(`[magnific] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        data?: {
          status: 'pending' | 'in_progress' | 'completed' | 'failed';
          output_url?: string;
          webhook_url?: string;
          width?: number;
          height?: number;
          error?: string;
        };
      };

      const d = poll.data;
      if (!d) continue;

      console.log(`[magnific] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${d.status}`);

      if (d.status === 'failed') {
        return { status: 'failed', message: d.error ?? 'Magnific upscaling failed', taskId };
      }
      if (d.status !== 'completed') continue;

      const outputUrl = d.output_url;
      if (!outputUrl) return { status: 'failed', message: 'No output_url in completed response', taskId };

      // 3. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(outputUrl);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download upscaled image', taskId };
      const imageBuffer = Buffer.from(await dlRes.arrayBuffer());

      const mimeMap: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const extMap: Record<string, string> = { jpeg: '.jpg', png: '.png', webp: '.webp' };
      const mime = mimeMap[input.outputFormat ?? 'jpeg'];
      const ext = extMap[input.outputFormat ?? 'jpeg'];

      const fileId = `magnific_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-image/magnific`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: imageBuffer,
        contentType: mime,
        fileExtension: ext,
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed', taskId };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['magnific', 'upscaler'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'image',
        contentMimeType: mime,
        contentSubType: 'upscaled',
        contentSource: 'magnific',
        contentSourceUrl: input.imageUrl,
        metadata: {
          sourceImageUrl: input.imageUrl,
          scale: input.scale,
          creativity: input.creativity,
          detail: input.detail,
          hdr: input.hdr,
          prompt: input.prompt,
          outputWidth: d.width,
          outputHeight: d.height,
          taskId,
        },
        fileName: `${fileId}${ext}`,
        fileSize: imageBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[magnific] Saved mediaFile', String(result.insertedId));

      return {
        status: 'completed',
        imageUrl: s3Url,
        mediaFileId: String(result.insertedId),
        taskId,
        width: d.width,
        height: d.height,
      };
    }

    return { status: 'failed', message: 'Polling timed out', taskId };
  },
});
