/**
 * Google Veo Worker — text-to-video and image-to-video via Vertex AI.
 *
 * Latest models (Veo 3.1 family, released Oct 14 2025):
 *   veo-3.1-generate-001  — Up to 60s at 1080p, native audio generation (default)
 *   veo-3.1-fast-001      — Faster, lower cost, 1080p
 *   veo-3.1-lite-001      — Cheapest, good for iteration
 *
 * ⚠️  Old endpoints using veo-2.0-generate-001 are deprecated — deadline June 30 2026.
 *
 * Triggers a long-running Veo generation job, polls until done,
 * downloads the result, uploads to S3, and saves a MediaFile record.
 *
 * Required env vars:
 *   GOOGLE_CLOUD_PROJECT_ID   — GCP project ID
 *   GOOGLE_CLOUD_ACCESS_TOKEN — Short-lived OAuth2 bearer token
 *                               (or mount a service account and refresh here)
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const POLL_INTERVAL_MS = 12_000;
const MAX_POLL_ATTEMPTS = 70; // ~14 min max

const InputSchema = z.object({
  prompt: z.string().min(1),
  imageUrl: z.string().url().optional(),
  duration: z.number().min(1).max(60).default(8), // Veo 3.1 supports up to 60s
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  model: z.enum([
    'veo-3.1-generate-001', // 1080p, up to 60s, native audio — default
    'veo-3.1-fast-001',     // faster + cheaper, 1080p
    'veo-3.1-lite-001',     // cheapest, good for iteration
    'veo-3.0-generate-001', // previous gen, still available
  ]).default('veo-3.1-generate-001'),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['google-veo']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  videoUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  operationName: z.string().optional(),
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

async function getAccessToken(): Promise<string> {
  // Use a provided static token, or fetch from metadata server when running on GCE/Cloud Run
  if (process.env.GOOGLE_CLOUD_ACCESS_TOKEN) {
    return process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
  }
  // Attempt to fetch from GCE metadata server
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } },
  );
  if (!res.ok) throw new Error('Cannot obtain Google Cloud access token');
  const json = await res.json() as { access_token: string };
  return json.access_token;
}

export default createWorker<typeof InputSchema, Output>({
  id: 'google-veo',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const gcpProject = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!gcpProject) {
      return { status: 'failed', message: 'GOOGLE_CLOUD_PROJECT_ID is not set' };
    }

    let accessToken: string;
    try {
      accessToken = await getAccessToken();
    } catch (err) {
      return { status: 'failed', message: `Failed to get access token: ${err instanceof Error ? err.message : String(err)}` };
    }

    const baseUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${gcpProject}/locations/us-central1`;
    const authHeader = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // 1. Trigger long-running generation
    const instance: Record<string, unknown> = { prompt: input.prompt };
    if (input.imageUrl) {
      instance.image = { bytesBase64Encoded: undefined, gcsUri: undefined, url: input.imageUrl };
    }

    const triggerRes = await fetch(
      `${baseUrl}/publishers/google/models/${input.model}:predictLongRunning`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          instances: [instance],
          parameters: {
            durationSeconds: input.duration,
            aspectRatio: input.aspectRatio,
            outputMimeType: 'video/mp4',
            storageUri: undefined,
          },
        }),
      },
    );

    if (!triggerRes.ok) {
      const errText = await triggerRes.text();
      return { status: 'failed', message: `Veo trigger failed (${triggerRes.status}): ${errText.slice(0, 400)}` };
    }

    const triggerData = await triggerRes.json() as { name: string };
    const operationName = triggerData.name;
    console.log('[google-veo] Operation started:', operationName);

    // 2. Poll for completion
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await fetch(
        `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!pollRes.ok) {
        console.warn(`[google-veo] Poll attempt ${attempt + 1} failed (${pollRes.status}), retrying…`);
        continue;
      }

      const poll = await pollRes.json() as {
        done?: boolean;
        error?: { message: string; code: number };
        response?: {
          predictions: Array<{
            video?: { encodedVideo?: string; uri?: string };
            bytesBase64Encoded?: string;
          }>;
        };
      };

      if (poll.error) {
        return { status: 'failed', message: poll.error.message, operationName };
      }
      if (!poll.done) {
        console.log(`[google-veo] Attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS} — not done yet`);
        continue;
      }

      // 3. Extract video bytes
      const prediction = poll.response?.predictions?.[0];
      let videoBuffer: Buffer | undefined;

      if (prediction?.video?.encodedVideo) {
        videoBuffer = Buffer.from(prediction.video.encodedVideo, 'base64');
      } else if (prediction?.bytesBase64Encoded) {
        videoBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
      } else if (prediction?.video?.uri) {
        const dlRes = await fetch(prediction.video.uri, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!dlRes.ok) return { status: 'failed', message: 'Failed to download video from GCS', operationName };
        videoBuffer = Buffer.from(await dlRes.arrayBuffer());
      }

      if (!videoBuffer || videoBuffer.length === 0) {
        return { status: 'failed', message: 'No video data in response', operationName };
      }

      // 4. Upload to S3 and save to MongoDB
      const fileId = `veo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/ai-video/google-veo`;

      const videoUrl = await uploadFile({
        id: fileId,
        buffer: videoBuffer,
        contentType: 'video/mp4',
        fileExtension: '.mp4',
        folder,
      });

      if (!videoUrl) {
        return { status: 'failed', message: 'S3 upload failed', operationName };
      }

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['google-veo'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: 'video/mp4',
        contentSubType: 'ai-generated',
        contentSource: 'google-veo',
        metadata: {
          prompt: input.prompt,
          imageUrl: input.imageUrl,
          duration: input.duration,
          aspectRatio: input.aspectRatio,
          model: input.model,
          operationName,
        },
        fileName: `${fileId}.mp4`,
        fileSize: videoBuffer.length,
        filePath: videoUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[google-veo] Saved mediaFile', String(result.insertedId));

      return { status: 'completed', videoUrl, mediaFileId: String(result.insertedId), operationName };
    }

    return { status: 'failed', message: 'Polling timed out after max attempts', operationName };
  },
});
