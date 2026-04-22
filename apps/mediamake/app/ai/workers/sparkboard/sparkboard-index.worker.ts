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
    const shouldRunAiAnalysis =
      analyzeImage && (generateDescription || generateKeywords);

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

    const incomingMetadata: Record<string, unknown> =
      metadata && typeof metadata === 'object' ? metadata : {};
    // Start with metadata sent by caller (extension/API analysis response).
    let finalMetadata: Record<string, unknown> = { ...incomingMetadata };
    const mediaSourceUrl = effectiveFilePath;

    // For images, always index into RAG (project + tag namespaces).
    if (contentType === 'image') {
      try {
        if (mediaSourceUrl) {
          if (shouldRunAiAnalysis) {
            console.log('[media-index] Performing AI indexing for image:', mediaSourceUrl);
          } else {
            console.log('[media-index] Indexing image without AI generation:', mediaSourceUrl);
          }
          const aiMetadata = await indexAndAnalyzeImage(mediaSourceUrl, clientId || 'default', {
            platform: contentSource,
            platformUrl: effectiveSourceUrl,
            imageLink: mediaSourceUrl,
            tags,
            projectId: projectId ?? undefined,
            metadata: incomingMetadata as any,
            analyzeImage: shouldRunAiAnalysis,
            generateDescription,
            generateKeywords,
          });

          if (aiMetadata) {
            // Preserve caller-provided analysis metadata from extension/API.
            finalMetadata = {
              ...aiMetadata,
              ...incomingMetadata,
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

    // Explicit guarantee: if worker AI generation is disabled, keep precomputed
    // analysis fields from caller metadata (from separate analyze-image API call).
    if (!shouldRunAiAnalysis) {
      finalMetadata = {
        ...finalMetadata,
        ...incomingMetadata,
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
      contentSourceUrl: sourceUrl || contentSourceUrl || effectiveSourceUrl,
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

