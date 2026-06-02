/**
 * Google Nanobanana (Gemini Image) Worker
 *
 * "Nanobanana" is Google's Gemini-based image generation platform — the
 * direct successor to deprecated Imagen 3/4 (shut down June 24, 2026).
 *
 * Nanobanana 2 (released Feb 26 2026) is built on Gemini 3.1 Flash Image
 * and supports generation, editing, inpainting, and style transfer.
 *
 * This worker calls the Gemini API generateContent with IMAGE response
 * modality — it's synchronous so no polling is needed. The returned
 * base64 images are decoded, uploaded to S3, and saved as MediaFile records.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/image-generation
 *
 * Required env vars:
 *   GEMINI_API_KEY          — Google AI Studio API key (easiest path)
 *   --- OR ---
 *   GOOGLE_CLOUD_PROJECT_ID + GOOGLE_CLOUD_ACCESS_TOKEN for Vertex AI path
 *
 * Model IDs (set NANOBANANA_MODEL to override):
 *   gemini-3.1-flash-image-generation   — Nanobanana 2, fast + affordable (default)
 *   gemini-3-pro-image-generation        — Nanobanana Pro, highest quality
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const DEFAULT_MODEL = 'gemini-3.1-flash-image-generation';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const InputSchema = z.object({
  prompt: z.string().min(1),
  /** Optional reference image URL for editing/style transfer mode */
  referenceImageUrl: z.string().url().optional(),
  /** 'generate' = text-to-image, 'edit' = guided editing with referenceImageUrl */
  mode: z.enum(['generate', 'edit']).default('generate'),
  /** Number of images to generate (1–4) */
  numberOfImages: z.number().int().min(1).max(4).default(1),
  /** Aspect ratio expressed as widthFraction:heightFraction */
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).default('1:1'),
  /** Negative prompt — things to exclude */
  negativePrompt: z.string().optional(),
  /** Override the model. Defaults to env NANOBANANA_MODEL or gemini-3.1-flash-image-generation */
  model: z.string().optional(),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['nanobanana', 'google-image']),
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

function resolveAspectRatioDimensions(ratio: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    '1:1':  { width: 1024, height: 1024 },
    '16:9': { width: 1344, height: 768  },
    '9:16': { width: 768,  height: 1344 },
    '4:3':  { width: 1152, height: 896  },
    '3:4':  { width: 896,  height: 1152 },
  };
  return map[ratio] ?? { width: 1024, height: 1024 };
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch reference image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type') ?? 'image/jpeg';
  return { base64: buffer.toString('base64'), mimeType };
}

export default createWorker<typeof InputSchema, Output>({
  id: 'google-nanobanana',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'GEMINI_API_KEY is not set' };

    const model = input.model ?? process.env.NANOBANANA_MODEL ?? DEFAULT_MODEL;
    const dims = resolveAspectRatioDimensions(input.aspectRatio);

    // Build the request parts
    const parts: Array<Record<string, unknown>> = [{ text: input.prompt }];

    if (input.mode === 'edit' && input.referenceImageUrl) {
      const { base64, mimeType } = await fetchImageAsBase64(input.referenceImageUrl);
      // Insert reference image before the text prompt so the model sees context first
      parts.unshift({
        inlineData: { mimeType, data: base64 },
      });
    }

    if (input.negativePrompt) {
      parts.push({ text: `\n\nDo NOT include: ${input.negativePrompt}` });
    }

    const requestBody: Record<string, unknown> = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        candidateCount: input.numberOfImages,
        imageGenerationConfig: {
          numberOfImages: input.numberOfImages,
          aspectRatio: input.aspectRatio,
          imageSize: `${dims.width}x${dims.height}`,
        },
      },
    };

    console.log('[nanobanana] Generating with model:', model, 'mode:', input.mode, 'count:', input.numberOfImages);

    const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: 'failed', message: `Gemini API error (${res.status}): ${errText.slice(0, 500)}` };
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            inlineData?: { mimeType: string; data: string };
          }>;
        };
      }>;
      error?: { message: string };
    };

    if (data.error) return { status: 'failed', message: data.error.message };

    // Collect all image parts across candidates
    const imageParts: Array<{ mimeType: string; data: string }> = [];
    for (const candidate of data.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.inlineData?.data) {
          imageParts.push(part.inlineData);
        }
      }
    }

    if (imageParts.length === 0) {
      return { status: 'failed', message: 'No images returned from Gemini API' };
    }

    const db = await getDatabase();
    const imageUrls: string[] = [];
    const mediaFileIds: string[] = [];
    const folder = `mediamake/${input.clientId ?? 'default'}/ai-image/nanobanana`;

    for (let i = 0; i < imageParts.length; i++) {
      const { mimeType, data: base64Data } = imageParts[i];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg';
      const fileId = `nanobanana_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: imageBuffer,
        contentType: mimeType,
        fileExtension: ext,
        folder,
      });

      if (!s3Url) {
        console.warn(`[nanobanana] S3 upload failed for image ${i}`);
        continue;
      }

      const doc: MediaFile = {
        tags: input.tags ?? ['nanobanana', 'google-image'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'image',
        contentMimeType: mimeType,
        contentSubType: 'ai-generated',
        contentSource: 'google-nanobanana',
        metadata: {
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          referenceImageUrl: input.referenceImageUrl,
          mode: input.mode,
          aspectRatio: input.aspectRatio,
          model,
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
      console.log('[nanobanana] Saved image', i, String(result.insertedId));
    }

    if (imageUrls.length === 0) {
      return { status: 'failed', message: 'All image uploads failed' };
    }

    return {
      status: 'completed',
      imageUrls,
      mediaFileIds,
      generatedCount: imageUrls.length,
    };
  },
});
