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
import dedent from 'dedent';

/**
 * Transcription Meta Agent - /transcription-meta
 * Geerate Ai metadata for each sentence in the transcription (with word highlights)
 */

const aiRouter = new AiRouter();

// Keyword-specific metadata schema
const KeywordMetadataSchema = z.object({
  keyword: z
    .string()
    .describe('The most impactful keyword or keyords in the sentence'),
  strength: z
    .number()
    .min(1)
    .max(10)
    .describe('The emotional/impact strength of the keyword (1-10 scale)'),
  splitParts: z
    .array(z.string())
    .describe('The parts of the sentence split into'),
  keywordFeel: z
    .enum([
      'joyful',
      'melancholic',
      'energetic',
      'calm',
      'dramatic',
      'romantic',
      'aggressive',
      'hopeful',
      'nostalgic',
      'mysterious',
      'triumphant',
      'sorrowful',
      'playful',
      'intense',
      'peaceful',
    ])
    .describe('The emotional feel/mood of the keyword'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence level in the analysis (0-1)'),
});

// Create the complete schema by extending the base schemas
const KeywordSentenceSchema = SentenceSchema.extend({
  metadata: KeywordMetadataSchema,
});

const KeywordTranscriptionSchema = ScriptMetaOutputSchema.extend({
  sentences: z.array(KeywordSentenceSchema),
});

const musicKeywordAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Analyzing transcription metadata...',
      });

      const { userRequest } = ctx.request.params as {
        userRequest?: string;
      };

      // Get sentences from context state (loaded by middleware)
      const sentencesToAnalyze = ctx.state?.sentences || [];

      if (!sentencesToAnalyze || sentencesToAnalyze.length === 0) {
        throw new Error('No sentences available for analysis');
      }

      // Analyze each sentence for metadata
      const analysisResults = await Promise.all(
        sentencesToAnalyze.map(async (sentence: string, index: number) => {
          try {
            const result = await generateObject({
              model: google('gemini-2.5-flash'),
              schema: KeywordMetadataSchema,
              prompt: `Analyze this sentence for lyricography metadata:

Sentence: "${sentence}"
${userRequest ? `\nUser Request: ${userRequest}` : ''}

Please analyze this sentence and provide:
1. The most impactful keyword that would be impactful in that scentence ( it can also be a noun - name, place, thing, etc, verb, etc..)
2. The emotional strength/power of that keyword (1-10 scale)
3. The emotional feel/mood of the keyword
4. Your confidence in this analysis

For keyword:
- It can be a singl word 
- It can be multiple words only if they are together placed.

For Split Parts:
- Assume you are requested to write the scentenc on a screen in stylised form, divide the one scenten into parts to suit the needs.
- Take the keyword into consideration as well, keyowords are usually shown twice the size of the other words.
- Not every scentence need to be split, as some scentences are single words or very short.
- try your best to split evenly, but take the expression of the scentence into consideration.
- MOST IMPORTANT: SPlit it so it is easy to read by human.
${userRequest ? `\nPlease consider the user's specific request: ${userRequest}` : ''}

Consider:
- What is the most emotionally resonant word in this sentence?
- How strong is the emotional impact of that keyword?
- What emotional tone does this keyword convey?
- How confident are you in this analysis?`,
              maxRetries: 2,
            });

            return {
              sentenceIndex: index,
              originalText: sentence,
              metadata: result.object,
              usage: result.usage,
            };
          } catch (error) {
            console.error(`Error analyzing sentence ${index}:`, error);
            // Fallback metadata for failed analysis
            return {
              sentenceIndex: index,
              originalText: sentence,
              metadata: {
                keyword: sentence.split(' ')[0] || 'unknown',
                strength: 5,
                keywordFeel: 'calm' as const,
                confidence: 0.3,
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
      } as z.infer<typeof KeywordTranscriptionSchema>;

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
      console.error('Error analyzing transcription metadata:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'analyzeTranscriptionMusicMetadata',
    name: 'Detect Keywords and Emotions in Scentences',
    description:
      'Analyzes sentence-split transcripts to generate metadata for lyricography, including keyword identification, emotional strength, feel, and split recommendations. Can work with transcriptionId or direct sentences. Updates database directly when transcriptionId is provided.',
    inputSchema: ScriptMetaInputSchema,
    outputSchema: KeywordTranscriptionSchema,
    metadata: {
      category: 'transcription',
      tags: [
        'lyricography',
        'sentence-metadata',
        'metadata',
        'analysis',
        'emotion',
        'keywords',
        'database',
      ],
      hidden: true,
    },
  });

export default musicKeywordAgent;
