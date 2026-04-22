import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../../../../lib/mongodb';
import { indexAndAnalyzeImage } from '../../../../lib/sparkboard/sparkboard-lib';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const InputSchema = z.object({
  tags: z.array(z.string()).min(1),
  projectId: z.string().optional().nullable(),
  clientId: z.string().optional().default('default'),
  contentType: z.enum(['image', 'video', 'audio', 'document', 'unknown']),
  contentMimeType: z.string().optional().default('image/jpeg'),
  contentSubType: z.string().optional().default('unknown'),
  contentSource: z.string(),
  contentSourceUrl: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  filePath: z.string().url().optional(),
  uploadFolder: z.string().optional(),
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
      sourceUrl,
      metadata,
      fileName,
      fileSize,
      filePath,
      uploadFolder,
      analyzeImage = true,
      generateDescription = true,
      generateKeywords = true,
    } = input;

    const db = await getDatabase();
    const collection = db.collection<MediaFile>('mediaFiles');

    // Resolve source and destination file paths.
    const effectiveSourceUrl = sourceUrl || contentSourceUrl || filePath;
    if (!effectiveSourceUrl) {
      throw new Error('sourceUrl/contentSourceUrl/filePath is required');
    }

    let effectiveFilePath = filePath || '';
    let effectiveMimeType = contentMimeType || 'image/jpeg';
    let effectiveFileName = fileName || '';
    let effectiveFileSize = fileSize ?? 0;

    if (!effectiveFilePath) {
      const response = await fetch(effectiveSourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MediaIndexWorker/1.0)',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch source file: ${response.status}`);
      }

      const sourceType = response.headers.get('content-type') || effectiveMimeType;
      effectiveMimeType = sourceType.split(';')[0].trim().toLowerCase() || 'image/jpeg';

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      effectiveFileSize = buffer.byteLength;

      const extFromMime = effectiveMimeType.split('/')[1] || 'jpg';
      const fallbackFileName = `upload-${Date.now()}.${extFromMime}`;
      effectiveFileName = fileName || fallbackFileName;

      const folder =
        uploadFolder ||
        `mediamake/${clientId || 'default'}/${projectId || 'general'}/${contentSource || 'upload'}`;

      const uploaded = await uploadFile({
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        buffer,
        imageType: effectiveMimeType,
        contentType: effectiveMimeType,
        fileExtension: extFromMime,
        folder,
      });
      if (!uploaded) {
        throw new Error('Failed to upload source file to S3');
      }
      effectiveFilePath = uploaded;
    }

    // Start with the provided metadata
    let finalMetadata: Record<string, unknown> = metadata || {};
    const mediaSourceUrl = effectiveFilePath;

    // For images, always index into RAG (project + tag namespaces).
    if (contentType === 'image') {
      try {
        if (mediaSourceUrl) {
          console.log('[media-index] Performing AI indexing for image:', mediaSourceUrl);
          const aiMetadata = await indexAndAnalyzeImage(mediaSourceUrl, clientId || 'default', {
            platform: contentSource,
            platformUrl: effectiveSourceUrl,
            imageLink: mediaSourceUrl,
            tags,
            projectId: projectId ?? undefined,
            metadata: finalMetadata as any,
            analyzeImage,
            generateDescription,
            generateKeywords,
          });

          if (aiMetadata) {
            // When AI is disabled, preserve any precomputed analysis metadata from the API.
            finalMetadata = {
              ...aiMetadata,
              ...finalMetadata,
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

    // Check if media file already exists for this client by uploaded file path
    // or by source reference (when the same web image is re-submitted).
    const existingFilter: Record<string, unknown> = {
      clientId: clientId || 'default',
      $or: [
        { filePath: effectiveFilePath },
        ...(contentSourceUrl ? [{ contentSource: contentSource, contentSourceUrl }] : []),
      ],
    };
    const existingFile = await collection.findOne(existingFilter as any);

    if (existingFile) {
      const shouldUpdateMetadata =
        finalMetadata &&
        typeof finalMetadata === 'object' &&
        Object.keys(finalMetadata).length > 0;

      if (shouldUpdateMetadata) {
        const mergedMetadata = {
          ...((existingFile.metadata as Record<string, unknown>) || {}),
          ...finalMetadata,
        };
        await collection.updateOne(
          { _id: existingFile._id } as any,
          {
            $set: {
              metadata: mergedMetadata,
              updatedAt: new Date(),
            },
          },
        );
        return {
          status: 'skipped',
          message: 'Media file already exists; metadata updated',
          mediaFile: {
            ...existingFile,
            metadata: mergedMetadata,
            updatedAt: new Date(),
          },
        };
      }

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
      contentMimeType: effectiveMimeType,
      contentSubType: contentSubType || 'unknown',
      contentSource,
      contentSourceUrl: contentSourceUrl || effectiveSourceUrl,
      metadata: finalMetadata,
      fileName: effectiveFileName || `upload-${Date.now()}`,
      fileSize: effectiveFileSize,
      filePath: effectiveFilePath,
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

