import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';
import {
  formatCaptionsForAI,
  parseAIOutputToCaptions,
  detectChanges,
  saveTranscriptionFix,
} from '../helpers';
import { loadTranscription } from '../middlewares/loadTranscription';

/**
 * Contextual Fixer Agent
 * Specialized in user-guided contextual corrections with reference text
 */

const aiRouter = new AiRouter();

const contextualFixerAgent = aiRouter
  .before('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      console.log('CONTEXTUAL FIXER: Starting...');
      ctx.response.writeMessageMetadata({
        loader: 'Applying contextual fixes...',
      });

      const {
        transcriptionId,
        userRequest,
        userWrittenTranscription,
        applyToDatabase = false,
      } = ctx.request.params as {
        transcriptionId: string;
        userRequest?: string;
        userWrittenTranscription?: string;
        applyToDatabase?: boolean;
      };

      const transcription = ctx.state.transcription;
      const captions = ctx.state.captions || transcription.captions;

      if (!userRequest && !userWrittenTranscription) {
        throw new Error(
          'Contextual fixer requires either userRequest or userWrittenTranscription',
        );
      }

      // Format captions for AI processing
      const formattedCaptions = formatCaptionsForAI(captions);

      const systemPrompt = dedent`You are a contextual correction expert specializing in user-guided transcription fixes.

TASK: Apply user-specified corrections to the transcription based on their guidance and reference text.

RULES:
1. Follow the user's specific requests carefully
2. If user provides their written version, use it as authoritative reference
3. The user's written version takes HIGHEST PRIORITY
4. Match the user's text as closely as possible while preserving timing
5. Add missing words that user specified (approximate timing if needed)
6. Fix words according to user's corrections
7. Preserve timing information as much as possible
8. When adding words, estimate timing based on surrounding context

CONTEXT AWARENESS:
- User knows what they actually said in the audio
- Trust user's corrections over the original transcription
- If user's version has words not in transcription, add them with estimated timing
- If transcription has words not in user's version, consider removing them
- Balance between user's intent and timing preservation

TIMING HANDLING:
- Preserve existing timing when possible
- For new words, estimate timing based on:
  * Gaps between existing words
  * Average word duration in surrounding context
  * Natural speech rhythm
- Adjust word timing proportionally if needed

OUTPUT FORMAT:
Return the corrected captions in the exact same format as input:
- Each sentence starts with a dash (-)
- Words are separated by <$>
- Each word has timestamps in brackets: word[absoluteStart-absoluteEnd]
- Example: -hello[1.2-1.5]<$>world[1.6-2.0]

Do not include any other text, explanations, or formatting. Only return the corrected captions.`;

      const prompt = dedent`TRANSCRIPTION DATA:
${formattedCaptions}

${userRequest ? `USER REQUEST: ${userRequest}` : ''}

${userWrittenTranscription ? `USER'S WRITTEN VERSION (AUTHORITATIVE): ${userWrittenTranscription}` : ''}

Apply the user's contextual corrections while preserving timing as much as possible.`;

      const result = await generateText({
        model: google('gemini-2.5-pro'), // Use Pro for better understanding of context
        system: systemPrompt,
        prompt,
        maxRetries: 2,
      });

      console.log('CONTEXTUAL FIXER USING:', result.usage);

      // Parse the AI output back to caption structure
      const fixedCaptions = parseAIOutputToCaptions(
        result.text,
        transcription.captions,
      );

      // Detect changes
      const changes = detectChanges(
        transcription.captions,
        fixedCaptions,
        'contextual_fix',
      );

      // Optionally save to database
      let updatedTranscription = null;
      if (applyToDatabase) {
        updatedTranscription = await saveTranscriptionFix(
          transcriptionId,
          fixedCaptions,
          changes,
          'Contextual Fixer',
          userRequest,
          userWrittenTranscription,
        );
      }

      console.log('CONTEXTUAL FIXER: Completed -', changes.length, 'changes');

      return {
        success: true,
        appliedToDatabase: applyToDatabase,
        transcription: updatedTranscription || {
          ...transcription,
          captions: fixedCaptions,
        },
        changes: changes,
        confidence: 0.92,
        usage: result.usage,
        summary: `Applied ${changes.length} contextual correction${changes.length !== 1 ? 's' : ''}`,
      };
    } catch (error) {
      console.error('Contextual fixer error:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'contextualFixer',
    name: 'Contextual Fixer',
    description:
      'Apply user-guided contextual corrections using your written version as reference. Ideal for fixing content with specific knowledge or missing words.',
    inputSchema: z.object({
      transcriptionId: z.string().describe('Transcription ID to fix'),
      userRequest: z
        .string()
        .optional()
        .describe('Specific corrections or guidance from user'),
      userWrittenTranscription: z
        .string()
        .optional()
        .describe("User's authoritative written version of the content"),
      applyToDatabase: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to save changes to database immediately'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      appliedToDatabase: z.boolean(),
      transcription: z.any(),
      changes: z.array(z.any()),
      confidence: z.number().min(0).max(1),
      summary: z.string(),
    }),
    metadata: {
      category: 'transcription',
      tags: ['transcription', 'autofix', 'transcription-autofix', 'contextual'],
      icon: '🎯',
      title: 'Contextual Fixer',
      description: 'User-guided contextual corrections',
      hideUI: false,
    },
  });

export default contextualFixerAgent;
