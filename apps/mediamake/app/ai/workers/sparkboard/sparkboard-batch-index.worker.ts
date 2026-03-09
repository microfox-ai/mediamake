import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import {
  IndexingRequestSchema,
  IndexingStatusSchema,
  type IndexRequest,
  type IndexingStatus,
} from '../../../../lib/sparkboard/types';
import { mapSiteLinkToPlatform } from '../../../../lib/sparkboard/mappers';
import { indexPaginator } from '../../../../lib/sparkboard/redis';
import { processSiteLink } from '../../../../lib/sparkboard/batchIndexer';
import { getDatabase } from '../../../../lib/mongodb';
import type { MediaFile, RagImageMetadata } from '../../../types/media';

const InputSchema = IndexingRequestSchema.extend({
  topK: z.number().min(1).max(100).optional(),
  // Optional custom indexingId; when provided, we can also derive clientId from it
  indexingId: z.string().optional(),
});

const OutputSchema = z.object({
  indexingId: z.string(),
  message: z.string(),
  lastStatus: IndexingStatusSchema.optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 900,
  memorySize: 2048,
  visibilityTimeout: 5400,
  group: 'sparkboard',
};

function buildLastStatus(
  indexingId: string,
  progress: number,
  isFullyIndexed: boolean,
): IndexingStatus {
  return {
    success: true,
    data: {
      indexing: {
        progress,
        isFullyIndexed,
      },
    },
  };
}

export default createWorker<typeof InputSchema, Output>({
  id: 'sparkboard-batch-index',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input, ctx }: WorkerHandlerParams<Input, Output>) => {
    const parsed = InputSchema.parse(input);
    const {
      siteLinks,
      indexingLimit,
      tags = [],
      dbFolder,
      projectId,
      projectDisplayName,
      indexingId: inputIndexingId,
    } = parsed;

    const projectIdForIndex = projectId ?? 'stocksearch';
    const randomSuffix = Math.random().toString(36).slice(2, 11);
    const indexingId =
      inputIndexingId ||
      (ctx.jobId as string) ||
      `index_${projectIdForIndex}_${randomSuffix}`;

    const clientIdFromIndexing =
      indexingId.split('_')[0] && indexingId.includes('_')
        ? indexingId.split('_')[0]
        : 'default';

    const paginator = indexPaginator(indexingId);
    await paginator.startNewIndexing({
      imageCount: 0,
      maxSize: indexingLimit,
    });

    // Prepare database collection for saving media files
    const db = await getDatabase();
    const collection = db.collection<MediaFile>('mediaFiles');

    let totalImages = 0;
    const limit = indexingLimit;

    for (let i = 0; i < siteLinks.length; i++) {
      const siteLink = siteLinks[i];
      const { platform, platformId, platformUrl } = mapSiteLinkToPlatform(siteLink);
      const indexRequest: IndexRequest = {
        siteLink,
        platform,
        platformId,
        platformUrl,
        projectId: projectId ?? 'default',
        projectDisplayName,
        indexingLimit: limit,
        indexingId,
        dbFolder: dbFolder ?? 'mediamake/scraped/default',
        userTags: tags,
      };

      const { newImageCount, processedDocs } = await processSiteLink(indexRequest);
      totalImages += newImageCount;

      // Save processed docs as mediaFiles in MongoDB
      if (processedDocs.length > 0) {
        for (const doc of processedDocs) {
          const metadata = doc.metadata as RagImageMetadata;

          // Build tags from indexRequest and metadata
          const allTags = new Set<string>();
          (indexRequest.userTags ?? []).forEach((t: string) => t && allTags.add(t));
          (metadata.userTags ?? []).forEach(t => t && allTags.add(t));
          const tagsArray = Array.from(allTags);

          // Determine content type
          let contentType: MediaFile['contentType'] = 'unknown';
          if (metadata.mediaType) {
            switch (metadata.mediaType.toLowerCase()) {
              case 'image':
                contentType = 'image';
                break;
              case 'video':
                contentType = 'video';
                break;
              case 'audio':
                contentType = 'audio';
                break;
              default:
                contentType = 'unknown';
            }
          } else if (metadata.mimeType) {
            if (metadata.mimeType.startsWith('image/')) contentType = 'image';
            else if (metadata.mimeType.startsWith('video/')) contentType = 'video';
            else if (metadata.mimeType.startsWith('audio/')) contentType = 'audio';
          }

          const filePath = metadata.src || `sparkboard/${doc.id}`;
          const fileName = doc.id || (metadata.src ? metadata.src.split('/').pop() || `sparkboard-${Date.now()}` : `sparkboard-${Date.now()}`);

          // Avoid duplicates for the same client/fileName
          const existing = await collection.findOne({
            fileName,
            clientId: clientIdFromIndexing,
          });
          if (existing) {
            continue;
          }

          const mediaFile: MediaFile = {
            tags: tagsArray,
            clientId: clientIdFromIndexing,
            ...(projectId ? { projectId } : {}),
            contentMimeType: metadata.mimeType || 'image/jpeg',
            contentSubType: 'indexed',
            contentSource: metadata.platform || 'web',
            contentSourceUrl:
              metadata.pagePermalink || metadata.platformUrl || metadata.src || undefined,
            fileName,
            fileSize: 0,
            contentType,
            metadata: {
              ...metadata,
            },
            filePath,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await collection.insertOne(mediaFile);
        }
      }

      const currentStatus = await paginator.getCurrentStatus();
      const currentCount = currentStatus?.progress?.imageCount ?? totalImages;
      const maxSize = currentStatus?.progress?.maxSize ?? limit;
      const progressPct =
        maxSize > 0 ? Math.min(100, Math.round((currentCount / maxSize) * 100)) : 0;
      const isFullyIndexed = currentCount >= maxSize;

      await ctx.jobStore?.update({
        status: isFullyIndexed ? 'completed' : 'running',
        metadata: {
          ...(parsed as Record<string, unknown>),
          indexingId,
          progress: progressPct,
        },
        progressMessage: isFullyIndexed
          ? 'Sparkboard indexing completed'
          : `Sparkboard indexing (${progressPct}%)`,
        ...(isFullyIndexed ? { completedAt: new Date().toISOString() } : {}),
      });
    }

    const finalStatus = await paginator.getCurrentStatus();
    const finalCount = finalStatus?.progress?.imageCount ?? totalImages;
    const maxSize = finalStatus?.progress?.maxSize ?? limit;
    const progressPct =
      maxSize > 0 ? Math.min(100, Math.round((finalCount / maxSize) * 100)) : 100;
    const lastStatus = buildLastStatus(indexingId, progressPct, true);

    return {
      indexingId,
      message: 'Sparkboard indexing completed successfully',
      lastStatus,
    };
  },
});
