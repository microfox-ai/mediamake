/**
 * Flux Worker — FLUX 1.1 [pro] and FLUX.1 Kontext via Black Forest Labs API.
 *
 * FLUX 1.1 [pro]  — state-of-the-art text-to-image, 6× faster than FLUX.1 [pro]
 * FLUX.1 Kontext  — in-context image generation & editing (accepts a reference image
 *                   and modifies it according to the text prompt)
 *
 * Both models use an async pattern:
 *   POST to trigger → returns {id, polling_url}
 *   GET polling_url → polls until {status: "Ready", result: {sample: url}}
 *
 * Docs: https://docs.bfl.ai/
 *
 * Required env vars:
 *   BFL_API_KEY — Black Forest Labs API key
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 100; // ~5 min
const BFL_BASE = 'https://api.bfl.ai/v1';

const InputSchema = z.object({
  prompt: z.string().min(1),
  /**
   * 'flux-pro-1.1'           — FLUX 1.1 Pro text-to-image (default, fastest + best quality)
   * 'flux-pro-1.1-ultra'     — Ultra high-res text-to-image (2048×2048+)
   * 'flux-kontext-pro'       — In-context editing (provide referenceImageUrl)
   * 'flux-kontext-max'       — Highest quality Kontext editing
   * 'flux-pro'               — Original FLUX.1 [pro]
   */
  model: z.enum(['flux-pro-1.1', 'flux-pro-1.1-ultra', 'flux-kontext-pro', 'flux-kontext-max', 'flux-pro']).default('flux-pro-1.1'),
  /** Required for Kontext models; optional reference/style for others */
  referenceImageUrl: z.string().url().optional(),
  width: z.number().int().min(256).max(2048).multipleOf(32).optional().default(1024),
  height: z.number().int().min(256).max(2048).multipleOf(32).optional().default(1024),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '21:9']).optional(),
  steps: z.number().int().min(1).max(50).optional().default(28),
  guidance: z.number().min(1).max(10).optional().default(3.5),
  seed: z.number().int().optional(),
  /** Safety tolerance 0–6 (0 = strictest, 6 = most permissive) */
  safetyTolerance: z.number().int().min(0).max(6).optional().default(2),
  /** Output format */
  outputFormat: z.enum(['jpeg', 'png']).optional().default('jpeg'),
  /** Prompt upsampling — let the model enhance the prompt automatically */
  promptUpsampling: z.boolean().optional().default(false),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['flux']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  imageUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  requestId: z.string().optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 300,
  memorySize: 1024,
  group: 'ai-image',
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function bflFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(`${BFL_BASE}${path}`, {
    ...init,
    headers: {
      'x-key': apiKey,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

async function fetchReferenceAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch reference image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString('base64');
}

export default createWorker<typeof InputSchema, Output>({
  id: 'flux',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.BFL_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'BFL_API_KEY is not set' };

    const isKontext = input.model.startsWith('flux-kontext');
    if (isKontext && !input.referenceImageUrl) {
      return { status: 'failed', message: 'referenceImageUrl is required for Kontext models' };
    }

    // 1. Build request body
    const body: Record<string, unknown> = {
      prompt: input.prompt,
      steps: input.steps,
      guidance: input.guidance,
      safety_tolerance: input.safetyTolerance,
      output_format: input.outputFormat,
      prompt_upsampling: input.promptUpsampling,
    };

    if (input.seed !== undefined) body.seed = input.seed;

    if (isKontext) {
      // Kontext accepts the reference image as base64
      body.image = await fetchReferenceAsBase64(input.referenceImageUrl!);
    }

    if (input.aspectRatio) {
      // Ultra model prefers aspect_ratio; others prefer width/height
      if (input.model === 'flux-pro-1.1-ultra') {
        body.aspect_ratio = input.aspectRatio;
      } else {
        const dims: Record<string, { width: number; height: number }> = {
          '1:1':  { width: 1024, height: 1024 },
          '16:9': { width: 1360, height: 768  },
          '9:16': { width: 768,  height: 1360 },
          '4:3':  { width: 1152, height: 896  },
          '3:4':  { width: 896,  height: 1152 },
          '21:9': { width: 1536, height: 640  },
        };
        const d = dims[input.aspectRatio];
        if (d) { body.width = d.width; body.height = d.height; }
      }
    } else {
      body.width = input.width;
      body.height = input.height;
    }

    // 2. Trigger generation
    const triggerRes = await bflFetch(`/${input.model}`, { method: 'POST', body: JSON.stringify(body) }, apiKey);
    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `BFL trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as { id: string; polling_url: string };
    const requestId = triggerData.id;
    const pollingUrl = triggerData.polling_url;
    console.log('[flux] Request started:', requestId, 'model:', input.model);

    // 3. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await fetch(pollingUrl, {
        headers: { 'x-key': apiKey },
      });

      if (!pollRes.ok) {
        console.warn(`[flux] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        id: string;
        status: 'Pending' | 'Ready' | 'Error' | 'Content Moderated' | 'Request Moderated';
        result?: { sample?: string; sample_url?: string };
        error?: string;
      };

      console.log(`[flux] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${poll.status}`);

      if (poll.status === 'Error') {
        return { status: 'failed', message: poll.error ?? 'BFL generation error', requestId };
      }
      if (poll.status === 'Content Moderated' || poll.status === 'Request Moderated') {
        return { status: 'failed', message: `Content moderated: ${poll.status}`, requestId };
      }
      if (poll.status !== 'Ready') continue;

      const imageUrl = poll.result?.sample ?? poll.result?.sample_url;
      if (!imageUrl) return { status: 'failed', message: 'No image URL in result', requestId };

      // 4. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(imageUrl);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download generated image', requestId };
      const imageBuffer = Buffer.from(await dlRes.arrayBuffer());

      const ext = input.outputFormat === 'png' ? '.png' : '.jpg';
      const mimeType = input.outputFormat === 'png' ? 'image/png' : 'image/jpeg';
      const fileId = `flux_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-image/flux`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: imageBuffer,
        contentType: mimeType,
        fileExtension: ext,
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed', requestId };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['flux'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'image',
        contentMimeType: mimeType,
        contentSubType: 'ai-generated',
        contentSource: 'flux-bfl',
        metadata: {
          prompt: input.prompt,
          model: input.model,
          referenceImageUrl: input.referenceImageUrl,
          width: input.width,
          height: input.height,
          aspectRatio: input.aspectRatio,
          steps: input.steps,
          guidance: input.guidance,
          seed: input.seed,
          requestId,
        },
        fileName: `${fileId}${ext}`,
        fileSize: imageBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[flux] Saved mediaFile', String(result.insertedId));

      return { status: 'completed', imageUrl: s3Url, mediaFileId: String(result.insertedId), requestId };
    }

    return { status: 'failed', message: 'Polling timed out', requestId: undefined };
  },
});
