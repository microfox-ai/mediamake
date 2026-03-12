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
import { SearchQuerySchema } from '../../../../../lib/sparkboard/types';
import dedent from 'dedent';

/**
 * RAG Image Attacher Agent - /rag-image-attacher
 * Generates image search queries for each sentence and performs RAG search to find suitable images
 */

const aiRouter = new AiRouter();

// Image search query schema
const ImageSearchQuerySchema = z.object({
  searchQuery: z
    .string()
    .describe('The search query to find suitable images for this sentence'),
  //   filterKeyword: z.string()
  //   .optional()
  //   .describe('The keyword to filter the search results'),
});

// RAG search result schema
const RagSearchResultSchema = z.object({
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
  selectedImage: RagSearchResultSchema.optional().describe(
    'The selected image from RAG search',
  ),
  alternativeImages: z
    .array(RagSearchResultSchema)
    .optional()
    .describe('Alternative images from the search'),
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

// Helper function to perform RAG search
async function performRagSearch(
  searchQuery: string,
  clientId: string,
  additionalParams: {
    artStyle?: string;
    keywords?: string;
    aspectRatioType?: string;
    mediaType?: string;
    tags?: string;
  } = {},
): Promise<any[]> {
  try {
    // Build search parameters (projectId for namespace-scoped search; optional tags for tag namespaces)
    const searchParams = {
      q: searchQuery,
      projectId: clientId,
      searchType: 'clientFiles',
      topK: '5',
      ...additionalParams,
    };

    // Validate parameters
    const validatedParams = SearchQuerySchema.parse(searchParams);

    const url = new URL('/api/sparkboard/search', process.env.NEXT_PUBLIC_APP_URL);
    Object.entries(validatedParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `RAG search failed with status ${response.status}:`,
        errorText,
      );
      return [];
    }

    const responseData = await response.json();
    return responseData.data?.results || [];
  } catch (error) {
    console.error('RAG search error:', error);
    return [];
  }
}

const ragImageAttacherAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader:
          'Generating image search queries and finding suitable images...',
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

            // Perform RAG search with the generated query
            const searchResults = await performRagSearch(
              searchQuery.searchQuery,
              clientId,
              {
                // keywords: searchQuery.keywords,
                tags:
                  tags && tags.length > 1
                    ? tags.join(',')
                    : tags?.[0] || undefined,
              },
            );

            // Select the best image from search results
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
                reasoning: selectedImage
                  ? `Selected image with score ${selectedImage.score} based on search query: "${searchQuery.searchQuery}"`
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
      console.error('Error analyzing transcription for images:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'analyzeTranscriptionForImages',
    name: 'Analyze Transcription for Images',
    description:
      'Analyzes sentence-split transcripts to generate image search queries and find suitable images through RAG search. Attaches image metadata including colors, keywords, and tags to each sentence.',
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
        'rag-search',
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

export default ragImageAttacherAgent;
