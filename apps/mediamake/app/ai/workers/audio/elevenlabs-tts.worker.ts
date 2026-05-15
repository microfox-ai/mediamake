/**
 * ElevenLabs TTS Worker — production text-to-speech via ElevenLabs API.
 *
 * Converts text to speech using a chosen voice and model, uploads the audio
 * to S3, and saves a MediaFile record. Synchronous — no polling needed.
 *
 * Latest models (May 2026):
 *   eleven_v3              — Best quality, most expressive, emotion control (default)
 *   eleven_flash_v2_5      — Ultra-low latency, great for realtime/long text
 *   eleven_multilingual_v2 — 29 languages, best non-English
 *
 * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
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

const ELEVENLABS_BASE = 'https://api.elevenlabs.io';

const InputSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().min(1),
  model: z.enum([
    'eleven_v3',              // Best quality, emotion control (default)
    'eleven_flash_v2_5',      // Ultra-low latency, long text
    'eleven_multilingual_v2', // 29-language support
    'eleven_turbo_v2_5',      // Fast + multilingual
  ]).default('eleven_v3'),
  voiceSettings: z.object({
    stability: z.number().min(0).max(1).optional().default(0.5),
    similarityBoost: z.number().min(0).max(1).optional().default(0.75),
    style: z.number().min(0).max(1).optional().default(0),
    useSpeakerBoost: z.boolean().optional().default(true),
  }).optional().default({}),
  /** Pronunciation dictionary locators — override specific word pronunciations */
  pronunciationDictionaryLocators: z.array(z.object({
    pronunciation_dictionary_id: z.string(),
    version_id: z.string(),
  })).optional(),
  /** Output format: mp3_44100_128 is best quality */
  outputFormat: z.enum([
    'mp3_44100_128',  // Standard quality MP3 (default)
    'mp3_44100_192',  // High quality MP3
    'pcm_44100',      // Raw PCM, lossless
    'ulaw_8000',      // Telephony
  ]).optional().default('mp3_44100_128'),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['elevenlabs-tts']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  audioUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  durationSeconds: z.number().optional(),
  characterCount: z.number().optional(),
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
  id: 'elevenlabs-tts',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'ELEVENLABS_API_KEY is not set' };

    const extMap: Record<string, { ext: string; mime: string }> = {
      mp3_44100_128: { ext: '.mp3', mime: 'audio/mpeg' },
      mp3_44100_192: { ext: '.mp3', mime: 'audio/mpeg' },
      pcm_44100:     { ext: '.pcm', mime: 'audio/pcm' },
      ulaw_8000:     { ext: '.ulaw', mime: 'audio/basic' },
    };
    const { ext, mime } = extMap[input.outputFormat ?? 'mp3_44100_128'];

    const body: Record<string, unknown> = {
      text: input.text,
      model_id: input.model,
      voice_settings: {
        stability: input.voiceSettings?.stability ?? 0.5,
        similarity_boost: input.voiceSettings?.similarityBoost ?? 0.75,
        style: input.voiceSettings?.style ?? 0,
        use_speaker_boost: input.voiceSettings?.useSpeakerBoost ?? true,
      },
    };
    if (input.pronunciationDictionaryLocators?.length) {
      body.pronunciation_dictionary_locators = input.pronunciationDictionaryLocators;
    }

    console.log('[elevenlabs-tts] Synthesizing', input.text.length, 'chars, voice:', input.voiceId, 'model:', input.model);

    const res = await fetch(
      `${ELEVENLABS_BASE}/v1/text-to-speech/${input.voiceId}?output_format=${input.outputFormat ?? 'mp3_44100_128'}`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return { status: 'failed', message: `ElevenLabs TTS failed (${res.status}): ${errText.slice(0, 400)}` };
    }

    // Character count from response header
    const charCountHeader = res.headers.get('xi-request-id');
    void charCountHeader; // informational only

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    if (audioBuffer.length === 0) return { status: 'failed', message: 'Empty audio response' };

    const fileId = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const folder = `mediamake/${input.clientId ?? 'default'}/audio/tts`;

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
      tags: input.tags ?? ['elevenlabs-tts'],
      clientId: input.clientId ?? 'default',
      ...(input.projectId ? { projectId: input.projectId } : {}),
      contentType: 'audio',
      contentMimeType: mime,
      contentSubType: 'tts',
      contentSource: 'elevenlabs-tts',
      metadata: {
        text: input.text,
        voiceId: input.voiceId,
        model: input.model,
        voiceSettings: input.voiceSettings,
        outputFormat: input.outputFormat,
        characterCount: input.text.length,
      },
      fileName: `${fileId}${ext}`,
      fileSize: audioBuffer.length,
      filePath: s3Url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
    console.log('[elevenlabs-tts] Saved', String(result.insertedId), `(${audioBuffer.length} bytes)`);

    return {
      status: 'completed',
      audioUrl: s3Url,
      mediaFileId: String(result.insertedId),
      characterCount: input.text.length,
    };
  },
});
