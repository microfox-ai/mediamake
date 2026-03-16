import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { openPage } from '@microfox/puppeteer-sls';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import { indexAndAnalyzeImage } from '../../../../lib/sparkboard/sparkboard-lib';
import type { MediaFile } from '../../../types/media';
import type { RagImageMetadata } from '../../../types/media';
import { getMidjourneyQueueCollection } from '../../../api/midjourney-queue/model';
import type { MidjourneyQueueStatus } from '../../../api/midjourney-queue/model';

const InputSchema = z.object({
  queueItemId: z.string().min(1),
  jobId: z.string().min(1),
  prompt: z.string().min(1),
  tags: z.array(z.string()).default([]),
  projectId: z.string().optional().nullable(),
  clientId: z.string().optional().default('default'),
  folder: z.string().optional().nullable(),
});

const OutputSchema = z.object({
  status: z.enum(['saved', 'skipped', 'partial', 'failed']),
  message: z.string().optional(),
  savedCount: z.number().int().nonnegative().default(0),
  mediaFiles: z.array(z.any()).optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 900,
  memorySize: 2048,
  group: 'sparkboard',
};

function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function jobPageUrl(jobId: string, index: number, folder?: string | null): string {
  const f = folder && folder.trim() ? folder.trim() : 'default';
  return `https://www.midjourney.com/jobs/${jobId}?index=${index}&folder=${encodeURIComponent(f)}`;
}

async function downloadCdnImageViaBrowser(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const isOffline = process.env.IS_OFFLINE != null || process.env.SERVERLESS_OFFLINE != null;

  const { page } = await openPage({
    url,
    headless: true,
    isLocal: isOffline,
    waitUntil: 'networkidle2',
  });

  try {
    // openPage navigates, but we want the Response object for bytes.
    const resp = await page.goto(url, { waitUntil: 'networkidle2' });
    if (!resp) {
      throw new Error('No response from browser navigation');
    }
    const status = resp.status();
    if (status >= 400) {
      const text = await resp.text().catch(() => '');
      throw new Error(`HTTP ${status} while fetching image: ${text.slice(0, 200)}`);
    }

    const headers = resp.headers();
    const contentType = headers['content-type'] || 'image/png';
    const buffer = await (resp as unknown as { buffer: () => Promise<Buffer> }).buffer();
    return { buffer, contentType };
  } finally {
    await page.close();
  }
}

export default createWorker<typeof InputSchema, Output>({
  id: 'midjourney-import',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>) => {
    const parsed = InputSchema.parse(input);
    const {
      queueItemId,
      jobId,
      prompt,
      tags = [],
      projectId,
      clientId = 'default',
      folder,
    } = parsed;

    const queueObjectId = toObjectId(queueItemId);
    if (!queueObjectId) {
      return { status: 'failed', message: 'Invalid queueItemId', savedCount: 0 };
    }

    const db = await getDatabase();
    const collection = db.collection<MediaFile>('mediaFiles');

    const saved: MediaFile[] = [];
    const dbFolder = `mediamake/midjourney/${clientId}/${projectId ?? 'default'}`;

    for (let idx = 0; idx < 4; idx++) {
      // Midjourney CDN pattern: {jobId}/0_{index}.png
      const cdnUrl = `https://cdn.midjourney.com/${jobId}/0_${idx}.png`;
      const sourceUrl = jobPageUrl(jobId, idx, folder ?? null);

      // Avoid duplicates (same client + contentSourceUrl + midjourney index)
      const existing = await collection.findOne({
        clientId: clientId || 'default',
        contentSource: 'midjourney',
        contentSourceUrl: sourceUrl,
      } as any);
      if (existing) {
        continue;
      }

      let downloaded: { buffer: Buffer; contentType: string } | null = null;
      try {
        downloaded = await downloadCdnImageViaBrowser(cdnUrl);
      } catch (err) {
        console.warn('[midjourney-import] download failed:', { cdnUrl, err });
        continue;
      }

      const s3Url = await uploadFile({
        id: `midjourney_${jobId}_${idx}_${Date.now()}`,
        buffer: downloaded.buffer,
        imageType: downloaded.contentType,
        contentType: downloaded.contentType,
        folder: dbFolder,
      });
      if (!s3Url) {
        continue;
      }

      // Index/analyze using the S3 URL (publicly accessible)
      let aiMetadata: RagImageMetadata | null = null;
      try {
        aiMetadata = await indexAndAnalyzeImage(s3Url, clientId || 'default', {
          platform: 'midjourney',
          platformUrl: sourceUrl,
          imageLink: s3Url,
          tags,
          projectId: projectId ?? undefined,
          analyzeImage: true,
          generateDescription: false,
          generateKeywords: true,
        });
      } catch (err) {
        console.warn('[midjourney-import] indexAndAnalyzeImage failed:', err);
        aiMetadata = null;
      }

      const mediaFile: MediaFile = {
        tags,
        clientId: clientId || 'default',
        ...(projectId ? { projectId } : {}),
        midjourneyJobId: jobId,
        contentType: 'image',
        contentMimeType: downloaded.contentType,
        contentSubType: 'midjourney',
        contentSource: 'midjourney',
        contentSourceUrl: sourceUrl,
        metadata: {
          prompt,
          midjourneyJobId: jobId,
          midjourneyIndex: idx,
          midjourneyFolder: folder ?? null,
          cdnUrl,
          ...(aiMetadata ? (aiMetadata as unknown as Record<string, unknown>) : {}),
        },
        fileName: `${jobId}_${idx}.png`,
        fileSize: downloaded.buffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await collection.insertOne(mediaFile);
      saved.push(mediaFile);
    }

    if (saved.length === 0) {
      return {
        status: 'skipped',
        message: 'No new images imported (already exists or download failed)',
        savedCount: 0,
      };
    }

    // Mark queue item saved
    const queue = await getMidjourneyQueueCollection();
    const now = new Date().toISOString();
    const update: Partial<{
      status: MidjourneyQueueStatus;
      completedAt: string;
      updatedAt: string;
    }> = {
      status: 'saved',
      completedAt: now,
      updatedAt: now,
    };
    await queue.updateOne({ _id: queueObjectId } as any, { $set: update });

    return {
      status: saved.length === 4 ? 'saved' : 'partial',
      savedCount: saved.length,
      mediaFiles: saved,
    };
  },
});

