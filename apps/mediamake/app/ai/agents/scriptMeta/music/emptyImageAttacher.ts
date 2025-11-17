import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { TranscriptionSentence } from '@microfox/datamotion';
import { saveTranscriptionMetadata } from '../helpers';
import {
  ScriptMetaInputSchema,
  ScriptMetaOutputSchema,
  SentenceSchema,
  TranscriptionInfoSchema,
} from '../zod';
import { getDatabase } from '@/lib/mongodb';
import dedent from 'dedent';

/**
 * Empty Image Attacher Agent - /empty-image-attacher
 * Generates image search queries for each sentence and finds random images matching the provided tags
 */

const aiRouter = new AiRouter();

// Image search query schema
const ImageSearchQuerySchema = z.object({
  searchQuery: z
    .string()
    .describe('The search query to find suitable images for this sentence'),
});

// Random image result schema
const RandomImageResultSchema = z.object({
  id: z.union([z.string(), z.number()]),
  score: z.number(),
  src: z.string().nullable(),
  dominantColor: z.string().nullable().optional(),
  secondaryColor: z.string().nullable().optional(),
  accentColor: z.string().nullable().optional(),
  keywords: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
  aspectRatio: z.number().nullable().optional(),
  artStyle: z.array(z.string()).nullable().optional(),
});

// Image metadata schema for sentence
const ImageMetadataSchema = z.object({
  searchQuery: z.string().describe('The search query used to find the image'),
  selectedImage: RandomImageResultSchema.optional().describe(
    'The selected random image',
  ),
  alternativeImages: z
    .array(RandomImageResultSchema)
    .optional()
    .describe('Alternative random images'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence level in the image selection (0-1)'),
  reasoning: z
    .string()
    .optional()
    .describe('Reasoning for why this image was selected'),
});

// Create the complete schema by extending the base schemas
const ImageSentenceSchema = SentenceSchema.extend({
  metadata: ImageMetadataSchema,
});

const ImageTranscriptionSchema = ScriptMetaOutputSchema.extend({
  sentences: z.array(ImageSentenceSchema),
});

// Helper function to get random images from database
async function getRandomImages(
  searchQuery: string,
  clientId: string,
  tags?: string[],
): Promise<any[]> {
  try {
    const db = await getDatabase();
    const collection = db.collection('mediaFiles');

    // Build query for images only
    const query: any = {
      clientId: clientId,
      contentType: 'image',
    };

    // Add tag filtering if provided
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    // Get random sample of images
    const pipeline = [
      { $match: query },
      { $sample: { size: 5 } }, // Get 5 random images
    ];

    const randomImages = await collection.aggregate(pipeline).toArray();

    // Transform to match the expected format
    return randomImages.map((image, index) => ({
      id: image._id,
      score: 0.8 - index * 0.1, // Decreasing score for alternatives
      metadata: {
        src: image.filePath,
        dominantColor: image.metadata?.dominantColor || null,
        secondaryColor: image.metadata?.secondaryColor || null,
        accentColor: image.metadata?.accentColor || null,
        keywords: image.metadata?.keywords || null,
        userTags: image.tags || null,
        description: image.metadata?.description || null,
        altText: image.metadata?.altText || null,
        platform: image.metadata?.platform || null,
        aspectRatio: image.metadata?.aspectRatio || null,
        artStyle: image.metadata?.artStyle || null,
      },
    }));
  } catch (error) {
    console.error('Random image fetch error:', error);
    return [];
  }
}

const emptyImageAttacherAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Generating image search queries and finding random images...',
      });

      const { userRequest, tags } = ctx.request.params as {
        userRequest?: string;
        tags?: string[];
      };

      // Get client ID from context
      const clientId = ctx.request.clientId || 'default';

      // Get sentences from context state (loaded by middleware)
      const sentencesToAnalyze = ctx.state?.sentences || [];

      if (!sentencesToAnalyze || sentencesToAnalyze.length === 0) {
        throw new Error('No sentences available for analysis');
      }

      // Analyze each sentence for image search queries
      const analysisResults = await Promise.all(
        sentencesToAnalyze.map(async (sentence: string, index: number) => {
          try {
            const existing_metadata = ctx.state?.metadatas?.[index];
            // Generate search query for the sentence
            const searchQueryResult = await generateObject({
              model: google('gemini-2.5-flash'),
              schema: ImageSearchQuerySchema,
              prompt: `Generate an image search query for this sentence:

Sentence: "${sentence}"
${existing_metadata?.keyword ? `\nSelected Dominant Keywords: ${existing_metadata?.keyword}` : ''}
Please analyze this sentence and provide a search query that would find suitable images for this 

Consider:
- What visual elements would best represent this sentence?
- What mood or atmosphere should the image convey?
- What style would be most appropriate?

The search query should be descriptive and specific enough to find relevant images.
${userRequest ? `Please consider the user's specific request: ${userRequest}` : ''}`,
              maxRetries: 2,
            });

            const searchQuery = searchQueryResult.object;

            // Get random images with the generated query and tags
            const searchResults = await getRandomImages(
              searchQuery.searchQuery,
              clientId,
              tags,
            );

            // Select the first image as selected, rest as alternatives
            const selectedImage =
              searchResults.length > 0 ? searchResults[0] : null;
            const alternativeImages = searchResults.slice(1, 3); // Take 2 alternatives

            return {
              sentenceIndex: index,
              originalText: sentence,
              metadata: {
                searchQuery: searchQuery.searchQuery,
                selectedImage: selectedImage
                  ? {
                      id: selectedImage.id,
                      score: selectedImage.score,
                      src: selectedImage.metadata?.src || null,
                      dominantColor:
                        selectedImage.metadata?.dominantColor || null,
                      secondaryColor:
                        selectedImage.metadata?.secondaryColor || null,
                      accentColor: selectedImage.metadata?.accentColor || null,
                      keywords: selectedImage.metadata?.keywords || null,
                      tags: selectedImage.metadata?.userTags || null,
                      description: selectedImage.metadata?.description || null,
                      altText: selectedImage.metadata?.altText || null,
                      platform: selectedImage.metadata?.platform || null,
                      aspectRatio: selectedImage.metadata?.aspectRatio || null,
                      artStyle: selectedImage.metadata?.artStyle || null,
                    }
                  : undefined,
                alternativeImages: alternativeImages.map(img => ({
                  id: img.id,
                  score: img.score,
                  src: img.metadata?.src || null,
                  dominantColor: img.metadata?.dominantColor || null,
                  secondaryColor: img.metadata?.secondaryColor || null,
                  accentColor: img.metadata?.accentColor || null,
                  keywords: img.metadata?.keywords || null,
                  tags: img.metadata?.userTags || null,
                  description: img.metadata?.description || null,
                  altText: img.metadata?.altText || null,
                  platform: img.metadata?.platform || null,
                  aspectRatio: img.metadata?.aspectRatio || null,
                  artStyle: img.metadata?.artStyle || null,
                })),
                confidence: selectedImage ? 0.8 : 0.3,
                reasoning: selectedImage
                  ? `Selected random image with score ${selectedImage.score} based on search query: "${searchQuery.searchQuery}"`
                  : 'No suitable images found',
              },
              usage: searchQueryResult.usage,
            };
          } catch (error) {
            console.error(`Error analyzing sentence ${index}:`, error);
            // Fallback metadata for failed analysis
            return {
              sentenceIndex: index,
              originalText: sentence,
              metadata: {
                searchQuery: sentence,
                selectedImage: undefined,
                alternativeImages: [],
                confidence: 0.3,
                reasoning:
                  'Analysis failed, using sentence as fallback search query',
              },
              usage: {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                cachedInputTokens: 0,
                reasoningTokens: 0,
              },
            };
          }
        }),
      );

      const result = {
        sentences: analysisResults,
        transcriptionInfo: ctx.state?.transcriptionInfo,
        totalSentences: sentencesToAnalyze.length,
      } as z.infer<typeof ImageTranscriptionSchema>;

      // Update the database with the metadata using the transcription from state
      const transcription = ctx.state?.transcription;
      if (transcription) {
        await saveTranscriptionMetadata(
          transcription,
          result.sentences,
          ctx.state?.transcriptionInfo,
          ctx.state?.selectedIndices, // Pass selected indices to update only selected captions
        );
      }

      return result;
    } catch (error) {
      console.error('Error analyzing transcription for random images:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'analyzeTranscriptionForRandomImages',
    name: 'Attache Random images to sentences',
    description:
      'Analyzes sentence-split transcripts to generate image search queries and find random images matching the provided tags. Attaches image metadata including colors, keywords, and tags to each sentence.',
    inputSchema: ScriptMetaInputSchema.extend({
      tags: z
        .array(z.string())
        .optional()
        .describe('Additional tags to filter search results'),
    }),
    outputSchema: ImageTranscriptionSchema,
    metadata: {
      category: 'transcription',
      tags: [
        'image-search',
        'random-images',
        'sentence-metadata',
        'metadata',
        'analysis',
        'images',
        'visual-content',
        'database',
      ],
      hidden: true,
    },
  });

export default emptyImageAttacherAgent;
