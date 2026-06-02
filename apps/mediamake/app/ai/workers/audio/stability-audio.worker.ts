/**
 * Stability Audio Worker — AI music and sound generation via Stability AI.
 *
 * Stable Audio 2.5 (March 2026) generates:
 *   - Full music tracks (up to 3 min) with lyrics/instrumentation
 *   - Ambient soundscapes
 *   - Sound effects
 *
 * Async pattern: POST to trigger → poll until 'complete' → download + upload to S3.
 *
 * Endpoint: POST https://api.stability.ai/v2beta/audio/stable-audio/generate
 *
 * Required env vars:
 *   STABILITY_API_KEY — Stability AI API key (same key as image generation)
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 8_000;
const MAX_POLL_ATTEMPTS = 60;

const InputSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  /** Duration in seconds (0.5–180 for Stable Audio 2.5) */
  seconds: z.number().min(0.5).max(180).optional().default(30),
  /** Output format */
  outputFormat: z.enum(['mp3', 'wav']).optional().default('mp3'),
  /** Seed for reproducibility */
  seed: z.number().int().optional(),
  /** Steps (more = higher quality, slower). 1–150. */
  steps: z.number().int().min(1).max(150).optional().default(100),
  /** Config scale — how closely the output follows the prompt */
  cfgScale: z.number().min(1).max(15).optional().default(7),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['stability-audio']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  audioUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  seed: z.number().optional(),
  finishReason: z.string().optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 600,
  memorySize: 512,
  group: 'audio',
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default createWorker<typeof InputSchema, Output>({
  id: 'stability-audio',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'STABILITY_API_KEY is not set' };

    const form = new FormData();
    form.append('prompt', input.prompt);
    form.append('seconds_total', String(input.seconds ?? 30));
    form.append('output_format', input.outputFormat ?? 'mp3');
    form.append('steps', String(input.steps ?? 100));
    form.append('cfg_scale', String(input.cfgScale ?? 7));
    if (input.negativePrompt) form.append('negative_prompt', input.negativePrompt);
    if (input.seed !== undefined) form.append('seed', String(input.seed));

    console.log('[stability-audio] Generating', input.seconds, 's of audio:', input.prompt.slice(0, 60));

    const triggerRes = await fetch('https://api.stability.ai/v2beta/audio/stable-audio/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      body: form,
    });

    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Stability Audio trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      id?: string;
      // Some endpoints return audio directly when sync
      audio?: string; // base64
      finish_reason?: string;
      seed?: number;
    };

    // Check if the response already contains audio (sync path)
    if (triggerData.audio) {
      const audioBuffer = Buffer.from(triggerData.audio, 'base64');
      return await saveAudio(audioBuffer, input, triggerData.seed, triggerData.finish_reason ?? 'SUCCESS');
    }

    const generationId = triggerData.id;
    if (!generationId) return { status: 'failed', message: 'No generation ID returned' };
    console.log('[stability-audio] Generation started:', generationId);

    // Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await fetch(
        `https://api.stability.ai/v2beta/audio/stable-audio/result/${generationId}`,
        { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'audio/*' } },
      );

      if (pollRes.status === 202) {
        console.log(`[stability-audio] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — still processing`);
        continue;
      }
      if (!pollRes.ok) {
        console.warn(`[stability-audio] Poll failed (${pollRes.status})`);
        continue;
      }

      const finishReason = pollRes.headers.get('finish-reason') ?? 'SUCCESS';
      const seedHeader = pollRes.headers.get('seed');
      const resultSeed = seedHeader ? parseInt(seedHeader, 10) : undefined;

      if (finishReason === 'CONTENT_FILTERED') {
        return { status: 'failed', message: 'Content filtered by Stability AI' };
      }

      const audioBuffer = Buffer.from(await pollRes.arrayBuffer());
      return await saveAudio(audioBuffer, input, resultSeed, finishReason);
    }

    return { status: 'failed', message: 'Polling timed out' };

    async function saveAudio(
      audioBuffer: Buffer,
      inp: Input,
      seed: number | undefined,
      finishReason: string,
    ): Promise<Output> {
      if (audioBuffer.length === 0) return { status: 'failed', message: 'Empty audio buffer' };

      const ext = inp.outputFormat === 'wav' ? '.wav' : '.mp3';
      const mime = inp.outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';
      const fileId = `stability_audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${inp.clientId ?? 'default'}/audio/stability`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: audioBuffer,
        contentType: mime,
        fileExtension: ext,
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed' };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: inp.tags ?? ['stability-audio'],
        clientId: inp.clientId ?? 'default',
        ...(inp.projectId ? { projectId: inp.projectId } : {}),
        contentType: 'audio',
        contentMimeType: mime,
        contentSubType: 'ai-generated',
        contentSource: 'stability-audio',
        metadata: {
          prompt: inp.prompt,
          negativePrompt: inp.negativePrompt,
          seconds: inp.seconds,
          steps: inp.steps,
          cfgScale: inp.cfgScale,
          seed,
          outputFormat: inp.outputFormat,
          finishReason,
        },
        fileName: `${fileId}${ext}`,
        fileSize: audioBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[stability-audio] Saved', String(result.insertedId));

      return {
        status: 'completed',
        audioUrl: s3Url,
        mediaFileId: String(result.insertedId),
        seed,
        finishReason,
      };
    }
  },
});
