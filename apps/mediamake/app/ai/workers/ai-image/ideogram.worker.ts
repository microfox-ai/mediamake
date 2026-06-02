/**
 * Ideogram Worker — AI image generation via Ideogram 3.0 API.
 *
 * Ideogram 3.0 (released May 1, 2025) is exceptional at:
 * - Typography / text rendering inside images
 * - Character consistency via Character Reference
 * - Photorealistic images with complex scenes
 *
 * Ideogram's generate endpoint is synchronous — it returns URLs immediately,
 * so no polling loop is needed.
 *
 * Docs: https://developer.ideogram.ai/
 *
 * Required env vars:
 *   IDEOGRAM_API_KEY — Ideogram API key
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const IDEOGRAM_BASE = 'https://api.ideogram.ai';

const StylePresetSchema = z.enum([
  'AUTO', 'GENERAL', 'REALISTIC', 'DESIGN', 'RENDER_3D', 'ANIME',
]);

const InputSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  /** V_3 is Ideogram 3.0 (latest). V_2_TURBO is still available for fast/cheap generations */
  model: z.enum(['V_3', 'V_2', 'V_2_TURBO']).default('V_3'),
  aspectRatio: z.enum([
    'ASPECT_1_1', 'ASPECT_16_9', 'ASPECT_9_16', 'ASPECT_4_3', 'ASPECT_3_4',
    'ASPECT_16_10', 'ASPECT_10_16', 'ASPECT_3_2', 'ASPECT_2_3',
  ]).default('ASPECT_1_1'),
  stylePreset: StylePresetSchema.optional().default('AUTO'),
  /**
   * Character Reference — Ideogram 3.0 unique feature.
   * Provide a URL to a face/character image to maintain visual consistency
   * across multiple generations.
   */
  characterReferenceUrl: z.string().url().optional(),
  /**
   * Style Reference — provide an image to transfer visual style from.
   */
  styleReferenceUrl: z.string().url().optional(),
  /** Rendering quality — QUALITY is recommended for V_3 */
  renderingSpeed: z.enum(['QUALITY', 'DEFAULT', 'TURBO']).optional().default('QUALITY'),
  /** Number of images to generate (1–8 for V_3) */
  numImages: z.number().int().min(1).max(8).default(1),
  seed: z.number().int().optional(),
  /** Magic Prompt — let Ideogram auto-enhance your prompt */
  magicPromptOption: z.enum(['AUTO', 'ON', 'OFF']).optional().default('AUTO'),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['ideogram']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  imageUrls: z.array(z.string()).optional(),
  mediaFileIds: z.array(z.string()).optional(),
  generatedCount: z.number().optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 300,
  memorySize: 1024,
  group: 'ai-image',
};

function ideogramFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(`${IDEOGRAM_BASE}${path}`, {
    ...init,
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'ideogram',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.IDEOGRAM_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'IDEOGRAM_API_KEY is not set' };

    // Build image_request body
    const imageRequest: Record<string, unknown> = {
      prompt: input.prompt,
      model: input.model,
      aspect_ratio: input.aspectRatio,
      style_type: input.stylePreset,
      num_images: input.numImages,
      magic_prompt_option: input.magicPromptOption,
      rendering_speed: input.renderingSpeed,
    };

    if (input.negativePrompt) imageRequest.negative_prompt = input.negativePrompt;
    if (input.seed !== undefined) imageRequest.seed = input.seed;

    // Character reference (Ideogram 3 exclusive)
    if (input.characterReferenceUrl) {
      imageRequest.character_reference = { url: input.characterReferenceUrl };
    }

    // Style reference
    if (input.styleReferenceUrl) {
      imageRequest.style_reference = [{ url: input.styleReferenceUrl }];
    }

    console.log('[ideogram] Generating', input.numImages, 'image(s) with model:', input.model);

    const genRes = await ideogramFetch('/generate', {
      method: 'POST',
      body: JSON.stringify({ image_request: imageRequest }),
    }, apiKey);

    if (!genRes.ok) {
      const errText = await genRes.text();
      return { status: 'failed', message: `Ideogram generate failed (${genRes.status}): ${errText.slice(0, 400)}` };
    }

    const genData = await genRes.json() as {
      data?: Array<{
        url: string;
        seed?: number;
        style_type?: string;
        is_image_safe?: boolean;
        prompt?: string;
      }>;
    };

    const images = genData.data ?? [];
    if (images.length === 0) {
      return { status: 'failed', message: 'No images returned from Ideogram' };
    }

    // Upload all images to S3 and save MediaFile records
    const db = await getDatabase();
    const imageUrls: string[] = [];
    const mediaFileIds: string[] = [];
    const folder = `mediamake/${input.clientId ?? 'default'}/ai-image/ideogram`;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.is_image_safe && img.is_image_safe !== undefined) {
        console.warn(`[ideogram] Image ${i} flagged as not safe, skipping`);
        continue;
      }

      const dlRes = await fetch(img.url);
      if (!dlRes.ok) {
        console.warn(`[ideogram] Failed to download image ${i}: ${dlRes.status}`);
        continue;
      }
      const imageBuffer = Buffer.from(await dlRes.arrayBuffer());
      const mimeType = dlRes.headers.get('content-type') ?? 'image/jpeg';
      const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg';

      const fileId = `ideogram_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;
      const s3Url = await uploadFile({
        id: fileId,
        buffer: imageBuffer,
        contentType: mimeType,
        fileExtension: ext,
        folder,
      });

      if (!s3Url) {
        console.warn(`[ideogram] S3 upload failed for image ${i}`);
        continue;
      }

      const doc: MediaFile = {
        tags: input.tags ?? ['ideogram'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'image',
        contentMimeType: mimeType,
        contentSubType: 'ai-generated',
        contentSource: 'ideogram',
        metadata: {
          prompt: input.prompt,
          resolvedPrompt: img.prompt,
          negativePrompt: input.negativePrompt,
          model: input.model,
          aspectRatio: input.aspectRatio,
          stylePreset: input.stylePreset,
          characterReferenceUrl: input.characterReferenceUrl,
          styleReferenceUrl: input.styleReferenceUrl,
          seed: img.seed ?? input.seed,
          magicPromptOption: input.magicPromptOption,
          index: i,
        },
        fileName: `${fileId}${ext}`,
        fileSize: imageBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      imageUrls.push(s3Url);
      mediaFileIds.push(String(result.insertedId));
      console.log('[ideogram] Saved image', i, String(result.insertedId));
    }

    if (imageUrls.length === 0) {
      return { status: 'failed', message: 'All image uploads failed or were flagged unsafe' };
    }

    return { status: 'completed', imageUrls, mediaFileIds, generatedCount: imageUrls.length };
  },
});
