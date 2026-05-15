/**
 * ElevenLabs Sound Effects Worker — generate AI sound effects from text description.
 *
 * Describe any sound in natural language ("crackling fire in a hearth",
 * "futuristic UI button click") and receive a rendered audio clip.
 * Synchronous — returns audio bytes immediately.
 *
 * Endpoint: POST /v1/text-to-sound-effects/convert
 * Docs: https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert
 *
 * Required env vars:
 *   ELEVENLABS_API_KEY — ElevenLabs API key
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const InputSchema = z.object({
  /** Natural-language description of the sound e.g. "thunder crack followed by rain" */
  text: z.string().min(1).max(500),
  /** Target duration in seconds (0.5–22). Leave unset for auto. */
  durationSeconds: z.number().min(0.5).max(22).optional(),
  /**
   * How strongly the generation follows the text prompt vs. creative variation.
   * 0 = most creative, 1 = most faithful (default: 0.3)
   */
  promptInfluence: z.number().min(0).max(1).optional().default(0.3),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['elevenlabs-sfx']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  audioUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 120,
  memorySize: 512,
  group: 'audio',
};

export default createWorker<typeof InputSchema, Output>({
  id: 'elevenlabs-sound-fx',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'ELEVENLABS_API_KEY is not set' };

    const body: Record<string, unknown> = {
      text: input.text,
      prompt_influence: input.promptInfluence,
    };
    if (input.durationSeconds !== undefined) {
      body.duration_seconds = input.durationSeconds;
    }

    console.log('[elevenlabs-sfx] Generating sound effect:', input.text.slice(0, 80));

    const res = await fetch('https://api.elevenlabs.io/v1/text-to-sound-effects/convert', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: 'failed', message: `ElevenLabs SFX failed (${res.status}): ${errText.slice(0, 400)}` };
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    if (audioBuffer.length === 0) return { status: 'failed', message: 'Empty audio response' };

    const fileId = `sfx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const folder = `mediamake/${input.clientId ?? 'default'}/audio/sfx`;

    const s3Url = await uploadFile({
      id: fileId,
      buffer: audioBuffer,
      contentType: 'audio/mpeg',
      fileExtension: '.mp3',
      folder,
    });
    if (!s3Url) return { status: 'failed', message: 'S3 upload failed' };

    const db = await getDatabase();
    const doc: MediaFile = {
      tags: input.tags ?? ['elevenlabs-sfx'],
      clientId: input.clientId ?? 'default',
      ...(input.projectId ? { projectId: input.projectId } : {}),
      contentType: 'audio',
      contentMimeType: 'audio/mpeg',
      contentSubType: 'sfx',
      contentSource: 'elevenlabs-sfx',
      metadata: {
        text: input.text,
        durationSeconds: input.durationSeconds,
        promptInfluence: input.promptInfluence,
      },
      fileName: `${fileId}.mp3`,
      fileSize: audioBuffer.length,
      filePath: s3Url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
    console.log('[elevenlabs-sfx] Saved', String(result.insertedId));

    return { status: 'completed', audioUrl: s3Url, mediaFileId: String(result.insertedId) };
  },
});
