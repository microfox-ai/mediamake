/**
 * Udio Worker — AI music generation via Udio official API (v4, 2026).
 *
 * Udio v4 (2026) is a licensed platform (UMG settlement Q2 2026).
 * Supports: custom lyrics mode, style-based generation, stem separation.
 *
 * Async pattern: POST to trigger → poll until 'completed' → download + upload to S3.
 *
 * Docs: https://udioapi.pro/docs
 *
 * Required env vars:
 *   UDIO_API_KEY — Udio API key
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 8_000;
const MAX_POLL_ATTEMPTS = 90;
const UDIO_BASE = 'https://udioapi.pro/api';

const InputSchema = z.object({
  /** Describe the music: style, mood, instruments e.g. "epic orchestral trailer music, intense" */
  prompt: z.string().min(1),
  /** Custom lyrics — leave empty for instrumental or auto-generated lyrics */
  lyrics: z.string().optional(),
  /** Extend an existing track from a prior generation ID */
  extendFromTrackId: z.string().optional(),
  /** Use stem separation to return individual stems (drums, bass, melody, etc.) */
  stems: z.boolean().optional().default(false),
  /** Generation quality */
  quality: z.enum(['standard', 'high']).optional().default('high'),
  /** Number of variations (1–4) */
  variations: z.number().int().min(1).max(4).optional().default(2),
  seed: z.number().int().optional(),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['udio']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  audioUrls: z.array(z.string()).optional(),
  mediaFileIds: z.array(z.string()).optional(),
  trackIds: z.array(z.string()).optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 900,
  memorySize: 512,
  group: 'audio',
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function udioFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(`${UDIO_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export default createWorker<typeof InputSchema, Output>({
  id: 'udio',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.UDIO_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'UDIO_API_KEY is not set' };

    // 1. Trigger generation
    const body: Record<string, unknown> = {
      prompt: input.prompt,
      quality: input.quality,
      variations: input.variations,
      stems: input.stems,
    };
    if (input.lyrics) body.lyrics = input.lyrics;
    if (input.extendFromTrackId) body.extend_from_track_id = input.extendFromTrackId;
    if (input.seed !== undefined) body.seed = input.seed;

    const triggerRes = await udioFetch('/generate', { method: 'POST', body: JSON.stringify(body) }, apiKey);
    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Udio trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      id?: string;
      work_id?: string;
      status?: string;
    };

    const workId = triggerData.id ?? triggerData.work_id;
    if (!workId) return { status: 'failed', message: 'No work ID returned from Udio' };
    console.log('[udio] Work started:', workId);

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await udioFetch(`/generate/status?workId=${workId}`, { method: 'GET' }, apiKey);
      if (!pollRes.ok) {
        console.warn(`[udio] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        status: 'pending' | 'processing' | 'completed' | 'error';
        error?: string;
        tracks?: Array<{
          id: string;
          audio_url: string;
          title?: string;
          duration?: number;
          image_url?: string;
          stems?: Record<string, string>;
        }>;
      };

      console.log(`[udio] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${poll.status}`);

      if (poll.status === 'error') {
        return { status: 'failed', message: poll.error ?? 'Udio generation failed', trackIds: [workId] };
      }
      if (poll.status !== 'completed') continue;

      const tracks = poll.tracks ?? [];
      if (tracks.length === 0) return { status: 'failed', message: 'No tracks in completed result' };

      // 3. Download each track, upload to S3, save MediaFile
      const db = await getDatabase();
      const audioUrls: string[] = [];
      const mediaFileIds: string[] = [];
      const trackIds: string[] = [];
      const folder = `mediamake/${input.clientId ?? 'default'}/audio/udio`;

      for (const track of tracks) {
        if (!track.audio_url) continue;

        const dlRes = await fetch(track.audio_url);
        if (!dlRes.ok) { console.warn('[udio] Failed to download track', track.id); continue; }
        const audioBuffer = Buffer.from(await dlRes.arrayBuffer());

        const fileId = `udio_${track.id}_${Date.now()}`;
        const s3Url = await uploadFile({
          id: fileId,
          buffer: audioBuffer,
          contentType: 'audio/mpeg',
          fileExtension: '.mp3',
          folder,
        });
        if (!s3Url) { console.warn('[udio] S3 upload failed for track', track.id); continue; }

        const doc: MediaFile = {
          tags: input.tags ?? ['udio'],
          clientId: input.clientId ?? 'default',
          ...(input.projectId ? { projectId: input.projectId } : {}),
          contentType: 'audio',
          contentMimeType: 'audio/mpeg',
          contentSubType: 'ai-generated',
          contentSource: 'udio',
          metadata: {
            prompt: input.prompt,
            lyrics: input.lyrics,
            quality: input.quality,
            trackId: track.id,
            title: track.title,
            duration: track.duration,
            imageUrl: track.image_url,
            stems: track.stems,
            workId,
          },
          fileName: `${fileId}.mp3`,
          fileSize: audioBuffer.length,
          filePath: s3Url,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
        audioUrls.push(s3Url);
        mediaFileIds.push(String(result.insertedId));
        trackIds.push(track.id);
        console.log('[udio] Saved track', track.id, String(result.insertedId));
      }

      if (audioUrls.length === 0) return { status: 'failed', message: 'All track uploads failed' };

      return { status: 'completed', audioUrls, mediaFileIds, trackIds };
    }

    return { status: 'failed', message: 'Polling timed out' };
  },
});
