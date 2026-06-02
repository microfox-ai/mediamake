/**
 * Lipsync Worker — sync any face video to any audio via Sync.so API.
 *
 * Sync.so lipsync-2-pro (2026) is the most accurate lip-sync model available.
 * Feed a talking-head video + audio track → get a video with perfectly synced lips.
 *
 * Supports webhooks (set LIPSYNC_WEBHOOK_URL env) or polling.
 *
 * Models:
 *   lipsync-2          — Standard quality (default)
 *   lipsync-2-pro      — Highest accuracy
 *   lipsync-1.9.0-beta — Previous gen, legacy
 *
 * Docs: https://docs.sync.so/api-reference/api/generate-api/create
 *
 * Required env vars:
 *   SYNC_SO_API_KEY — Sync.so API key
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 8_000;
const MAX_POLL_ATTEMPTS = 90;
const SYNC_BASE = 'https://api.sync.so';

const InputSchema = z.object({
  /** URL to the source video (talking head, portrait) */
  videoUrl: z.string().url(),
  /**
   * Audio source — provide a URL to an audio file,
   * OR a TTS config (let Sync.so generate the audio internally).
   */
  audioUrl: z.string().url().optional(),
  /** Inline TTS config (used if audioUrl is not provided) */
  ttsConfig: z.object({
    text: z.string().min(1),
    provider: z.enum(['elevenlabs', 'microsoft', 'amazon']).default('elevenlabs'),
    voiceId: z.string(),
    language: z.string().optional().default('en-US'),
  }).optional(),
  model: z.enum(['lipsync-2', 'lipsync-2-pro', 'lipsync-1.9.0-beta']).default('lipsync-2-pro'),
  /** Face detection mode */
  faceDetection: z.enum(['auto', 'full_face', 'face_crop']).optional().default('auto'),
  /** Whether to sync the whole video or only detected face regions */
  synced_area: z.enum(['face', 'full']).optional().default('face'),
  outputFormat: z.enum(['mp4', 'webm']).optional().default('mp4'),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['lipsync']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  videoUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  generationId: z.string().optional(),
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

function syncFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(`${SYNC_BASE}${path}`, {
    ...init,
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'lipsync',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.SYNC_SO_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'SYNC_SO_API_KEY is not set' };

    if (!input.audioUrl && !input.ttsConfig) {
      return { status: 'failed', message: 'Either audioUrl or ttsConfig must be provided' };
    }

    // Build input array
    const inputArr: Array<Record<string, unknown>> = [
      { type: 'video', url: input.videoUrl },
    ];

    if (input.audioUrl) {
      inputArr.push({ type: 'audio', url: input.audioUrl });
    } else if (input.ttsConfig) {
      inputArr.push({
        type: 'text',
        provider: input.ttsConfig.provider,
        voice_id: input.ttsConfig.voiceId,
        text: input.ttsConfig.text,
        language: input.ttsConfig.language,
      });
    }

    // 1. Trigger generation
    const body: Record<string, unknown> = {
      model: input.model,
      input: inputArr,
      options: {
        output_format: input.outputFormat,
        face_detection: input.faceDetection,
        synced_area: input.synced_area,
      },
    };

    // Optional webhook
    const webhookUrl = process.env.LIPSYNC_WEBHOOK_URL;
    if (webhookUrl) body.webhook_url = webhookUrl;

    const triggerRes = await syncFetch('/v2/generate', { method: 'POST', body: JSON.stringify(body) }, apiKey);
    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Sync.so trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      id: string;
      status: string;
      error?: string;
    };

    if (triggerData.error) return { status: 'failed', message: triggerData.error };

    const generationId = triggerData.id;
    console.log('[lipsync] Generation started:', generationId, 'model:', input.model);

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await syncFetch(`/v2/generate/${generationId}`, { method: 'GET' }, apiKey);
      if (!pollRes.ok) {
        console.warn(`[lipsync] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        id: string;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        output_url?: string;
        error?: string;
        credits_deducted?: number;
      };

      console.log(`[lipsync] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${poll.status}`);

      if (poll.status === 'failed') {
        return { status: 'failed', message: poll.error ?? 'Sync.so generation failed', generationId };
      }
      if (poll.status !== 'completed') continue;

      const outputUrl = poll.output_url;
      if (!outputUrl) return { status: 'failed', message: 'No output_url in completed result', generationId };

      // 3. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(outputUrl);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download lipsync video', generationId };
      const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

      const fileId = `lipsync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/lipsync`;
      const mime = input.outputFormat === 'webm' ? 'video/webm' : 'video/mp4';
      const ext = input.outputFormat === 'webm' ? '.webm' : '.mp4';

      const s3Url = await uploadFile({
        id: fileId,
        buffer: videoBuffer,
        contentType: mime,
        fileExtension: ext,
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed', generationId };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['lipsync'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: mime,
        contentSubType: 'lipsync',
        contentSource: 'sync-so',
        contentSourceUrl: input.videoUrl,
        metadata: {
          videoUrl: input.videoUrl,
          audioUrl: input.audioUrl,
          ttsConfig: input.ttsConfig,
          model: input.model,
          faceDetection: input.faceDetection,
          generationId,
        },
        fileName: `${fileId}${ext}`,
        fileSize: videoBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[lipsync] Saved mediaFile', String(result.insertedId));

      return { status: 'completed', videoUrl: s3Url, mediaFileId: String(result.insertedId), generationId };
    }

    return { status: 'failed', message: 'Polling timed out', generationId };
  },
});
