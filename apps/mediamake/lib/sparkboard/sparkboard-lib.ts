import { z } from 'zod';
import { indexSingleMedia } from './singleMedia';
import type { RagImageMetadata, RagAudioMetadata } from '@/app/types/media';
export type { RagImageMetadata };

const RequestBodySchema = z.object({
  src: z.string().url('Must be a valid URL'),
  srcType: z.enum(['image', 'video', 'audio']),
  platform: z.string().optional(),
  platformId: z.string().optional(),
  platformUrl: z.string().optional(),
  pageLink: z.string().optional(),
  imageLink: z.string().optional(),
  indexingId: z.string().optional(),
  promptUsed: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const ResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  message: z.string().optional(),
  doc: z
    .object({
      id: z.string(),
      metadata: z.any(),
      doc: z.string(),
    })
    .optional(),
});

export type AnalysisRequestBody = z.infer<typeof RequestBodySchema>;
export type AnalysisResponse = z.infer<typeof ResponseSchema>;

/**
 * Index and analyze an image locally (no external Sparkboard API).
 */
export async function indexAndAnalyzeImage(
  imageUrl: string,
  clientId: string,
  additionalData?: Partial<AnalysisRequestBody> & {
    projectId?: string | null;
    metadata?: Partial<RagImageMetadata>;
    analyzeImage?: boolean;
    generateDescription?: boolean;
    generateKeywords?: boolean;
  },
): Promise<RagImageMetadata | null> {
  try {
    const projectIdForNs = additionalData?.projectId ?? undefined;
    const projectIdForIndexId = additionalData?.projectId ?? 'stocksearch';
    const randomSuffix = Math.random().toString(36).slice(2, 11);
    const indexingId = `${clientId}_${projectIdForIndexId}_${randomSuffix}`;

    const result = await indexSingleMedia({
      src: imageUrl,
      srcType: 'image',
      projectId: projectIdForNs,
      platformId: 'upload',
      platform: 'upload',
      platformUrl: 'upload',
      indexingId,
      tags: additionalData?.tags ?? [],
      pageLink: additionalData?.pageLink,
      imageLink: additionalData?.imageLink,
      promptUsed: additionalData?.promptUsed,
      metadata: additionalData?.metadata,
      analyzeImage: additionalData?.analyzeImage ?? true,
      generateDescription: additionalData?.generateDescription ?? true,
      generateKeywords: additionalData?.generateKeywords ?? true,
    });
    return result.doc.metadata;
  } catch (error) {
    console.error('indexAndAnalyzeImage error:', error);
    return null;
  }
}

/**
 * Index an audio file locally (no external Sparkboard API).
 */
export async function indexAudio(
  audioUrl: string,
  clientId: string,
  metadata: RagAudioMetadata,
  additionalData?: Partial<AnalysisRequestBody>,
): Promise<RagImageMetadata | null> {
  try {
    const result = await indexSingleMedia({
      src: audioUrl,
      srcType: 'audio',
      projectId: clientId,
      platform: metadata.platform ?? 'MediaMake',
      platformId: metadata.platformId ?? 'mediamake/audio-analysis-agent',
      platformUrl: metadata.platformUrl ?? audioUrl,
      indexingId: clientId,
      promptUsed: metadata.promptUsed,
      tags: metadata.userTags ?? additionalData?.tags ?? [],
      metadata: {
        description: metadata.description ?? null,
        keywords: metadata.keywords ?? [],
        audienceKeywords: metadata.audienceKeywords ?? [],
      },
      ...additionalData,
    });
    return result.doc.metadata;
  } catch (error) {
    console.error('indexAudio error:', error);
    return null;
  }
}

export function hasDescription(metadata: unknown): boolean {
  return (
    metadata != null &&
    typeof metadata === 'object' &&
    'description' in metadata &&
    !!(metadata as { description?: unknown }).description
  );
}
