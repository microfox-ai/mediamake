/**
 * ElevenLabs Instant Voice Clone Worker
 *
 * Creates a cloned voice from 1–25 audio sample files (URLs).
 * Optimal: 1–2 minutes of clean speech, no background noise or reverb.
 * Returns a `voice_id` immediately (synchronous — no polling needed).
 *
 * The cloned voice can then be used in elevenlabs-tts.worker.ts.
 *
 * Endpoint: POST /v1/voices/ivc/create (multipart form)
 * Docs: https://elevenlabs.io/docs/api-reference/voice-cloning/instant
 *
 * Required env vars:
 *   ELEVENLABS_API_KEY — ElevenLabs API key (Pro+ plan required)
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';

const InputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  /**
   * URLs to audio samples. 1–25 files, each ≤10 MB.
   * MP3, WAV, M4A, OGG supported.
   * Best results: 1–2 min of clean, single-speaker speech.
   */
  sampleUrls: z.array(z.string().url()).min(1).max(25),
  /** Labels for categorization */
  labels: z.record(z.string(), z.string()).optional(),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  voiceId: z.string().optional(),
  voiceName: z.string().optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 300,
  memorySize: 1024,
  group: 'audio',
};

export default createWorker<typeof InputSchema, Output>({
  id: 'elevenlabs-voice-clone',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'ELEVENLABS_API_KEY is not set' };

    console.log('[voice-clone] Downloading', input.sampleUrls.length, 'audio samples…');

    // Download each sample then build multipart FormData
    const form = new FormData();
    form.append('name', input.name);
    if (input.description) form.append('description', input.description);
    if (input.labels) form.append('labels', JSON.stringify(input.labels));

    for (let i = 0; i < input.sampleUrls.length; i++) {
      const url = input.sampleUrls[i];
      const dlRes = await fetch(url);
      if (!dlRes.ok) {
        return { status: 'failed', message: `Failed to download sample ${i + 1}: HTTP ${dlRes.status}` };
      }
      const buffer = await dlRes.arrayBuffer();
      const contentType = dlRes.headers.get('content-type') ?? 'audio/mpeg';
      // Infer extension from content-type or URL
      const urlPath = new URL(url).pathname;
      const ext = urlPath.split('.').pop() ?? 'mp3';
      form.append('files', new Blob([buffer], { type: contentType }), `sample_${i + 1}.${ext}`);
    }

    console.log('[voice-clone] Submitting clone request for voice:', input.name);

    const res = await fetch('https://api.elevenlabs.io/v1/voices/ivc/create', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { status: 'failed', message: `ElevenLabs voice clone failed (${res.status}): ${errText.slice(0, 400)}` };
    }

    const data = await res.json() as {
      voice_id: string;
      name: string;
      status?: string;
    };

    if (!data.voice_id) return { status: 'failed', message: 'No voice_id in response' };

    console.log('[voice-clone] Created voice:', data.voice_id, '—', data.name);

    return {
      status: 'completed',
      voiceId: data.voice_id,
      voiceName: data.name,
    };
  },
});
