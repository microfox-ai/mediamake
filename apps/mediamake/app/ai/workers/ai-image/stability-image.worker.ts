/**
 * Stability AI Image Worker — Stable Image Ultra, Core, and Fast via Stability AI API.
 *
 * Models available (pricing effective Aug 1, 2025):
 *   stable-image-ultra  — Powered by SD3.5 Large (8B params). Highest quality,
 *                         best prompt adherence. $0.08/image.
 *   stable-image-core   — Fast & affordable. $0.03/image. Great for iteration.
 *   stable-image-fast   — Cheapest option, experimental models. $0.01/image.
 *   sd3.5-large         — SD3.5 Large raw model endpoint.
 *   sd3.5-large-turbo   — 4-step optimized SD3.5 Large. Faster, lower cost.
 *   sd3.5-medium        — 2.5B param version, balanced quality/speed.
 *
 * The v2beta endpoint returns image bytes directly (synchronous),
 * unless using async mode — we use sync for simplicity.
 *
 * Docs: https://platform.stability.ai/docs/api-reference#tag/Generate
 *
 * Required env vars:
 *   STABILITY_API_KEY — Stability AI API key (sk-...)
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const STABILITY_BASE = 'https://api.stability.ai/v2beta/stable-image/generate';

const InputSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  model: z.enum([
    'ultra',          // Stable Image Ultra (SD3.5 Large)
    'core',           // Stable Image Core
    'fast',           // Stable Image Fast
    'sd3.5-large',    // SD3.5 Large raw
    'sd3.5-large-turbo',
    'sd3.5-medium',
  ]).default('ultra'),
  aspectRatio: z.enum([
    '1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21',
    '2:3', '3:2', '5:4', '4:5',
  ]).optional().default('1:1'),
  /** Seed for reproducibility (0 = random) */
  seed: z.number().int().min(0).max(4294967294).optional().default(0),
  /** Output image format */
  outputFormat: z.enum(['jpeg', 'png', 'webp']).optional().default('jpeg'),
  /** Style preset — only applies to core/ultra, ignored for SD3.5 models */
  stylePreset: z.enum([
    'photographic', 'digital-art', 'cinematic', 'anime', 'comic-book',
    'fantasy-art', 'line-art', 'analog-film', 'neon-punk', 'isometric',
    'low-poly', 'origami', 'modeling-compound', 'tile-texture', '3d-model',
    'pixel-art',
  ]).optional(),
  /**
   * Image-to-image: provide a reference image URL + strength.
   * Only supported by ultra, core, and sd3.5 variants.
   */
  imageUrl: z.string().url().optional(),
  /** Denoise strength for img2img (0.0 = preserve original, 1.0 = full repaint) */
  strength: z.number().min(0).max(1).optional().default(0.7),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['stability-ai']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  imageUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  seed: z.number().optional(),
  finishReason: z.string().optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 300,
  memorySize: 1024,
  group: 'ai-image',
};

function getEndpoint(model: Input['model']): string {
  // SD3.5 models use a different endpoint path
  if (model.startsWith('sd3.5')) return 'https://api.stability.ai/v2beta/stable-image/generate/sd3';
  return `${STABILITY_BASE}/${model}`;
}

export default createWorker<typeof InputSchema, Output>({
  id: 'stability-image',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'STABILITY_API_KEY is not set' };

    const endpoint = getEndpoint(input.model);
    const isImg2Img = Boolean(input.imageUrl);

    // Build multipart/form-data since Stability AI's API uses FormData
    const formData = new FormData();
    formData.append('prompt', input.prompt);
    formData.append('aspect_ratio', input.aspectRatio ?? '1:1');
    formData.append('seed', String(input.seed ?? 0));
    formData.append('output_format', input.outputFormat ?? 'jpeg');

    if (input.negativePrompt) formData.append('negative_prompt', input.negativePrompt);
    if (input.stylePreset && !input.model.startsWith('sd3.5')) {
      formData.append('style_preset', input.stylePreset);
    }
    // SD3.5 models can accept a model field within the endpoint
    if (input.model === 'sd3.5-large-turbo') formData.append('model', 'sd3.5-large-turbo');
    if (input.model === 'sd3.5-medium') formData.append('model', 'sd3.5-medium');

    if (isImg2Img && input.imageUrl) {
      // Fetch reference image and append as binary
      const refRes = await fetch(input.imageUrl);
      if (!refRes.ok) return { status: 'failed', message: `Failed to fetch reference image: ${refRes.status}` };
      const refBuffer = await refRes.arrayBuffer();
      const mimeType = refRes.headers.get('content-type') ?? 'image/jpeg';
      formData.append('image', new Blob([refBuffer], { type: mimeType }), 'reference.jpg');
      formData.append('strength', String(input.strength ?? 0.7));
      formData.append('mode', 'image-to-image');
    }

    console.log('[stability] Generating image, model:', input.model, 'img2img:', isImg2Img);

    const genRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'image/*',
      },
      body: formData,
    });

    if (!genRes.ok) {
      const errText = await genRes.text();
      return { status: 'failed', message: `Stability AI failed (${genRes.status}): ${errText.slice(0, 400)}` };
    }

    const finishReason = genRes.headers.get('finish-reason') ?? undefined;
    const seedHeader = genRes.headers.get('seed');
    const resultSeed = seedHeader ? parseInt(seedHeader, 10) : undefined;
    const contentType = genRes.headers.get('content-type') ?? 'image/jpeg';

    if (finishReason === 'CONTENT_FILTERED') {
      return { status: 'failed', message: 'Generation blocked by content filter', finishReason };
    }

    const imageBuffer = Buffer.from(await genRes.arrayBuffer());
    if (imageBuffer.length === 0) return { status: 'failed', message: 'Empty image response' };

    const extMap: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    const ext = extMap[contentType] ?? `.${input.outputFormat ?? 'jpg'}`;
    const fileId = `stability_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const folder = `mediamake/${input.clientId ?? 'default'}/ai-image/stability`;

    const s3Url = await uploadFile({
      id: fileId,
      buffer: imageBuffer,
      contentType,
      fileExtension: ext,
      folder,
    });
    if (!s3Url) return { status: 'failed', message: 'S3 upload failed', finishReason };

    const db = await getDatabase();
    const doc: MediaFile = {
      tags: input.tags ?? ['stability-ai'],
      clientId: input.clientId ?? 'default',
      ...(input.projectId ? { projectId: input.projectId } : {}),
      contentType: 'image',
      contentMimeType: contentType,
      contentSubType: 'ai-generated',
      contentSource: 'stability-ai',
      metadata: {
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        model: input.model,
        aspectRatio: input.aspectRatio,
        stylePreset: input.stylePreset,
        seed: resultSeed ?? input.seed,
        outputFormat: input.outputFormat,
        imageUrl: input.imageUrl,
        strength: input.strength,
        finishReason,
      },
      fileName: `${fileId}${ext}`,
      fileSize: imageBuffer.length,
      filePath: s3Url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
    console.log('[stability] Saved mediaFile', String(result.insertedId));

    return {
      status: 'completed',
      imageUrl: s3Url,
      mediaFileId: String(result.insertedId),
      seed: resultSeed,
      finishReason,
    };
  },
});
