import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { saveTranscriptionMetadata } from '../helpers';
import {
  ScriptMetaInputSchema,
  ScriptMetaOutputSchema,
  SentenceSchema,
} from '../zod';
import {
  extractKeywordsFromHtmlText,
  parseCaptionHtmlText,
} from '@/lib/captions/html-text';

/**
 * Transcription Meta Agent - /transcription-meta
 * Generate AI metadata for each sentence (htmlText for highlights + line breaks)
 */

const aiRouter = new AiRouter();

// Keyword-specific metadata schema — htmlText is the source of truth going forward
const KeywordMetadataSchema = z.object({
  htmlText: z
    .string()
    .describe(
      'HTML version of the sentence. Wrap impactful word(s) in <b>...</b>. Use <br/> to split into readable on-screen lines. Keep all original words in order; do not invent or drop words.',
    ),
  strength: z
    .number()
    .min(1)
    .max(10)
    .describe('The emotional/impact strength of the highlighted words (1-10 scale)'),
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
    .describe('The emotional feel/mood of the highlighted words'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence level in the analysis (0-1)'),
});

// Create the complete schema by extending the base schemas
const KeywordSentenceSchema = SentenceSchema.extend({
  metadata: KeywordMetadataSchema.extend({
    // Derived for legacy consumers (image attachers, older presets)
    keyword: z.string().optional(),
    splitParts: z.array(z.string()).optional(),
  }),
});

const KeywordTranscriptionSchema = ScriptMetaOutputSchema.extend({
  sentences: z.array(KeywordSentenceSchema),
});

function fallbackHtmlText(sentence: string): string {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return `<b>${words[0]}</b>`;
  // Bold first word as a safe fallback
  return `<b>${words[0]}</b> ${words.slice(1).join(' ')}`;
}

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
              prompt: `Analyze this sentence for lyricography metadata and return htmlText.

Sentence: "${sentence}"
${userRequest ? `\nUser Request: ${userRequest}` : ''}

Return htmlText that is the SAME sentence text with HTML markup only:
1. Wrap the most impactful keyword(s) in <b>...</b>
   - Usually a single word; multiple words ONLY if they are adjacent in the sentence
   - Never bold a substring inside another word
   - If the same word appears twice, only bold the occurrence that should be emphasized (use exact position in the sentence)
2. Insert <br/> where the line should break for on-screen readability
   - Short sentences may need no <br/>
   - Prefer even, human-readable line lengths; impactful bold words are often shown larger
3. Do NOT change, reorder, add, or remove words — only add <b>, </b>, and <br/>
4. Do NOT use other tags (no <p>, <strong>, <i>, etc.)
5. Also provide strength (1-10), keywordFeel, and confidence

Example:
Sentence: "Hero is the main character of everything"
htmlText: "<b>Hero</b> is the main character<br/>of everything"

${userRequest ? `\nPlease consider the user's specific request: ${userRequest}` : ''}

Consider:
- What is the most emotionally resonant word (or adjacent phrase) in this sentence?
- How should lines break so a viewer can read it on screen?
- What emotional tone do the highlighted words convey?`,
              maxRetries: 2,
            });

            const htmlText = result.object.htmlText?.trim() || fallbackHtmlText(sentence);
            const keyword = extractKeywordsFromHtmlText(htmlText);
            const words = sentence.split(/\s+/).filter(Boolean).map(text => ({ text }));
            const parsed = parseCaptionHtmlText(htmlText, words);

            return {
              sentenceIndex: index,
              originalText: sentence,
              metadata: {
                ...result.object,
                htmlText,
                keyword,
                splitParts: parsed?.splitParts,
              },
              usage: result.usage,
            };
          } catch (error) {
            console.error(`Error analyzing sentence ${index}:`, error);
            const htmlText = fallbackHtmlText(sentence);
            const words = sentence.split(/\s+/).filter(Boolean).map(text => ({ text }));
            const parsed = parseCaptionHtmlText(htmlText, words);
            return {
              sentenceIndex: index,
              originalText: sentence,
              metadata: {
                htmlText,
                keyword: extractKeywordsFromHtmlText(htmlText) || sentence.split(' ')[0] || 'unknown',
                splitParts: parsed?.splitParts,
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
      'Analyzes sentence-split transcripts to generate lyricography metadata via htmlText (<b> for highlights, <br/> for line splits), plus emotional strength and feel. Updates database directly when transcriptionId is provided.',
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
        'htmlText',
        'database',
      ],
      hidden: true,
    },
  });

export default musicKeywordAgent;
