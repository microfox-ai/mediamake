/**
 * HeyGen Avatar Worker — AI talking-head video generation via HeyGen API.
 *
 * API versions (May 2026):
 *   v3 — Agent-first design (current default). Uses POST /v3/video-agents.
 *   v2 — Still operational until Oct 31, 2026. POST /v2/video/generate.
 *
 * This worker defaults to v3 but falls back gracefully to v2 syntax for
 * non-agent use cases (avatar + script + voice).
 *
 * Supports avatar + voice combinations, submits a video generation job,
 * polls until complete, downloads the result, uploads to S3, saves MediaFile.
 *
 * Required env vars:
 *   HEYGEN_API_KEY — HeyGen API key
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 80;
const HEYGEN_BASE = 'https://api.heygen.com';

const VoiceSettingsSchema = z.object({
  voice_id: z.string(),
  speed: z.number().min(0.5).max(1.5).optional().default(1.0),
  pitch: z.number().min(-50).max(50).optional().default(0),
});

const AvatarSettingsSchema = z.object({
  avatar_id: z.string(),
  avatar_style: z.enum(['normal', 'circle', 'closeUp']).optional().default('normal'),
  offset: z.object({ x: z.number(), y: z.number() }).optional(),
});

const InputSchema = z.object({
  /** Script text for the avatar to speak */
  script: z.string().min(1).max(5000),
  avatarSettings: AvatarSettingsSchema,
  voiceSettings: VoiceSettingsSchema,
  /** Background color or image URL */
  background: z.union([
    z.object({ type: z.literal('color'), value: z.string() }),
    z.object({ type: z.literal('image'), url: z.string().url() }),
    z.object({ type: z.literal('video'), url: z.string().url() }),
  ]).optional().default({ type: 'color', value: '#FAFAFA' }),
  /** Output resolution */
  dimension: z.object({
    width: z.number().int().default(1280),
    height: z.number().int().default(720),
  }).optional().default({ width: 1280, height: 720 }),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
  test: z.boolean().optional().default(false),
  /** API version to use. v3 is the current default (agent-first) */
  apiVersion: z.enum(['v3', 'v2']).optional().default('v3'),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['heygen']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  videoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  videoId: z.string().optional(),
  message: z.string().optional(),
  duration: z.number().optional(),
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

function heygenFetch(path: string, init: RequestInit, apiKey: string): Promise<Response> {
  return fetch(`${HEYGEN_BASE}${path}`, {
    ...init,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

function buildBackground(bg: Input['background']): Record<string, unknown> {
  if (bg.type === 'color') return { type: 'color', value: bg.value };
  if (bg.type === 'image') return { type: 'image', url: bg.url };
  return { type: 'video', url: bg.url };
}

export default createWorker<typeof InputSchema, Output>({
  id: 'heygen-avatar',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) return { status: 'failed', message: 'HEYGEN_API_KEY is not set' };

    // 1. Trigger video generation
    // v3 uses /v3/video-agents; v2 uses /v2/video/generate
    const useV3 = input.apiVersion === 'v3';
    const generateEndpoint = useV3 ? '/v3/video-agents' : '/v2/video/generate';

    const body = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: input.avatarSettings.avatar_id,
            avatar_style: input.avatarSettings.avatar_style,
            ...(input.avatarSettings.offset ? { offset: input.avatarSettings.offset } : {}),
          },
          voice: {
            type: 'text',
            input_text: input.script,
            voice_id: input.voiceSettings.voice_id,
            speed: input.voiceSettings.speed,
            pitch: input.voiceSettings.pitch,
          },
          background: buildBackground(input.background),
        },
      ],
      dimension: input.dimension,
      aspect_ratio: input.aspectRatio,
      test: input.test,
    };

    const triggerRes = await heygenFetch(generateEndpoint, { method: 'POST', body: JSON.stringify(body) }, apiKey);
    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `HeyGen trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as {
      error?: string | null;
      data?: { video_id: string };
    };

    if (triggerData.error || !triggerData.data?.video_id) {
      return { status: 'failed', message: triggerData.error ?? 'No video_id returned' };
    }

    const videoId = triggerData.data.video_id;
    console.log('[heygen] Video generation started:', videoId);

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await heygenFetch(`/v1/video_status.get?video_id=${videoId}`, { method: 'GET' }, apiKey);
      if (!pollRes.ok) {
        console.warn(`[heygen] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        error?: string | null;
        data?: {
          status: 'pending' | 'processing' | 'waiting' | 'completed' | 'failed';
          video_url?: string;
          video_url_caption?: string;
          thumbnail_url?: string;
          duration?: number;
          error?: string;
        };
      };

      if (poll.error) return { status: 'failed', message: poll.error, videoId };

      const d = poll.data;
      if (!d) continue;

      console.log(`[heygen] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — status: ${d.status}`);

      if (d.status === 'failed') {
        return { status: 'failed', message: d.error ?? 'HeyGen video generation failed', videoId };
      }
      if (d.status !== 'completed') continue;

      const heygenVideoUrl = d.video_url;
      if (!heygenVideoUrl) return { status: 'failed', message: 'No video URL in completed response', videoId };

      // 3. Download, upload to S3, save to MongoDB
      const dlRes = await fetch(heygenVideoUrl);
      if (!dlRes.ok) return { status: 'failed', message: 'Failed to download HeyGen video', videoId };
      const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

      const fileId = `heygen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/heygen`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: videoBuffer,
        contentType: 'video/mp4',
        fileExtension: '.mp4',
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed', videoId };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['heygen'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: 'video/mp4',
        contentSubType: 'ai-generated',
        contentSource: 'heygen-avatar',
        metadata: {
          script: input.script,
          avatarId: input.avatarSettings.avatar_id,
          avatarStyle: input.avatarSettings.avatar_style,
          voiceId: input.voiceSettings.voice_id,
          background: input.background,
          dimension: input.dimension,
          aspectRatio: input.aspectRatio,
          duration: d.duration,
          thumbnailUrl: d.thumbnail_url,
          videoId,
          test: input.test,
        },
        fileName: `${fileId}.mp4`,
        fileSize: videoBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[heygen] Saved mediaFile', String(result.insertedId));

      return {
        status: 'completed',
        videoUrl: s3Url,
        thumbnailUrl: d.thumbnail_url,
        mediaFileId: String(result.insertedId),
        videoId,
        duration: d.duration,
      };
    }

    return { status: 'failed', message: 'Polling timed out', videoId };
  },
});
