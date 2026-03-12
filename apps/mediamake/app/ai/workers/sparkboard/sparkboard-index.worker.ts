import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../../../../lib/mongodb';
import { indexAndAnalyzeImage } from '../../../../lib/sparkboard/sparkboard-lib';
import type { MediaFile } from '../../../types/media';

const InputSchema = z.object({
  tags: z.array(z.string()).min(1),
  projectId: z.string().optional().nullable(),
  clientId: z.string().optional().default('default'),
  contentType: z.enum(['image', 'video', 'audio', 'document', 'unknown']),
  contentMimeType: z.string(),
  contentSubType: z.string().optional().default('unknown'),
  contentSource: z.string(),
  contentSourceUrl: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  fileName: z.string(),
  fileSize: z.number().int().nonnegative(),
  filePath: z.string().url(),
  analyzeImage: z.boolean().optional().default(true),
  generateDescription: z.boolean().optional().default(true),
  generateKeywords: z.boolean().optional().default(true),
});

const OutputSchema = z.object({
  status: z.enum(['created', 'skipped']),
  message: z.string().optional(),
  mediaFile: z.any().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 900,
  memorySize: 1024,
  group: 'sparkboard',
};

export default createWorker<typeof InputSchema, Output>({
  id: 'sparkboard-index',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>) => {
    const {
      tags,
      projectId,
      clientId = 'default',
      contentType,
      contentMimeType,
      contentSubType,
      contentSource,
      contentSourceUrl,
      metadata,
      fileName,
      fileSize,
      filePath,
      analyzeImage = true,
      generateDescription = true,
      generateKeywords = true,
    } = input;

    const db = await getDatabase();
    const collection = db.collection<MediaFile>('mediaFiles');

    // Start with the provided metadata
    let finalMetadata: Record<string, unknown> = metadata || {};
    const mediaSourceUrl = filePath;

    // For images, always index into RAG (project + tag namespaces).
    if (contentType === 'image') {
      try {
        if (mediaSourceUrl) {
          console.log('[media-index] Performing AI indexing for image:', mediaSourceUrl);
          const aiMetadata = await indexAndAnalyzeImage(mediaSourceUrl, clientId || 'default', {
            platform: contentSource,
            platformUrl: mediaSourceUrl,
            imageLink: mediaSourceUrl,
            tags,
            projectId: projectId ?? undefined,
            analyzeImage,
            generateDescription,
            generateKeywords,
          });

          if (aiMetadata) {
            finalMetadata = {
              ...finalMetadata,
              ...aiMetadata,
            };
            console.log('[media-index] Indexing completed, metadata updated');
          } else {
            console.log('[media-index] Indexing completed with no AI metadata');
          }
          // Always persist src and platformId for RAG delete to find this doc in namespaces
          finalMetadata.src = finalMetadata.src ?? mediaSourceUrl;
          finalMetadata.platformId = finalMetadata.platformId ?? contentSource ?? 'upload';
        } else {
          console.log('[media-index] No mediaSourceUrl provided, skipping AI analysis');
        }
      } catch (error) {
        console.error('[media-index] Error during AI analysis/indexing:', error);
        // Continue with creation even if AI analysis fails; still set src/platformId for RAG delete
        finalMetadata.src = finalMetadata.src ?? mediaSourceUrl;
        finalMetadata.platformId = finalMetadata.platformId ?? contentSource ?? 'upload';
      }
    } else if (contentType === 'video') {
      console.log('[media-index] Video analysis not yet supported, skipping AI analysis');
    }

    // Check if media file with same URL already exists for this client
    const existingFile = await collection.findOne({
      filePath,
      clientId: clientId || 'default',
    });

    if (existingFile) {
      console.log(
        '[media-index] Media file with URL already exists, skipping creation:',
        contentSourceUrl,
      );
      return {
        status: 'skipped',
        message: 'Media file already exists',
        mediaFile: existingFile,
      };
    }

    console.log('[media-index] Storing media file with tags:', tags);
    const mediaFile: MediaFile = {
      _id: new ObjectId(), // pre-generate id so we can return it immediately
      tags,
      clientId: clientId || 'default',
      ...(projectId ? { projectId } : {}),
      contentType,
      contentMimeType,
      contentSubType: contentSubType || 'unknown',
      contentSource,
      contentSourceUrl,
      metadata: finalMetadata,
      fileName,
      fileSize,
      filePath,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collection.insertOne(mediaFile);

    return {
      status: 'created',
      mediaFile,
    };
  },
});

