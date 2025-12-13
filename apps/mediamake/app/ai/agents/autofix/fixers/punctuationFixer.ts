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
 * Punctuation Fixer Agent
 * Specialized in adding and fixing punctuation
 */

const aiRouter = new AiRouter();

const punctuationFixerAgent = aiRouter
  .before('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      console.log('PUNCTUATION FIXER: Starting...');
      ctx.response.writeMessageMetadata({
        loader: 'Fixing punctuation...',
      });

      const {
        transcriptionId,
        userRequest,
        applyToDatabase = false,
      } = ctx.request.params as {
        transcriptionId: string;
        userRequest?: string;
        applyToDatabase?: boolean;
      };

      const transcription = ctx.state.transcription;
      const captions = ctx.state.captions || transcription.captions;

      // Format captions for AI processing
      const formattedCaptions = formatCaptionsForAI(captions);

      const systemPrompt = dedent`You are a punctuation expert specializing in transcription cleanup.

TASK: Add and fix punctuation marks for proper readability.

RULES:
1. Add missing punctuation marks:
   - Periods at sentence ends
   - Commas for natural pauses
   - Question marks for questions
   - Exclamation marks for emphasis (use sparingly)
2. Fix incorrect punctuation
3. Remove unnecessary punctuation
4. Preserve ALL timing information EXACTLY
5. Do NOT change words or spelling
6. Do NOT change sentence structure
7. Do NOT merge or split words

PUNCTUATION GUIDELINES:
- Use periods for statement endings
- Use commas for natural pauses and lists
- Use question marks for interrogative sentences
- Use exclamation marks only when clearly emphatic
- Avoid over-punctuating

OUTPUT FORMAT:
Return the corrected captions in the exact same format as input:
- Each sentence starts with a dash (-)
- Words are separated by <$>
- Each word has timestamps in brackets: word[absoluteStart-absoluteEnd]
- Punctuation can be part of the word text
- Example: -hello[1.2-1.5]<$>world.[1.6-2.0]

Do not include any other text, explanations, or formatting. Only return the corrected captions.`;

      const prompt = dedent`TRANSCRIPTION DATA:
${formattedCaptions}

${userRequest ? `USER REQUEST: ${userRequest}` : ''}

Add and fix punctuation while preserving all timing and word content.`;

      const result = await generateText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        prompt,
        maxRetries: 2,
      });

      console.log('PUNCTUATION FIXER USING:', result.usage);

      // Parse the AI output back to caption structure
      const fixedCaptions = parseAIOutputToCaptions(
        result.text,
        transcription.captions,
      );

      // Detect changes
      const changes = detectChanges(
        transcription.captions,
        fixedCaptions,
        'punctuation_fix',
      );

      // Optionally save to database
      let updatedTranscription = null;
      if (applyToDatabase) {
        updatedTranscription = await saveTranscriptionFix(
          transcriptionId,
          fixedCaptions,
          changes,
          'Punctuation Fixer',
          userRequest,
        );
      }

      console.log('PUNCTUATION FIXER: Completed -', changes.length, 'changes');

      return {
        success: true,
        appliedToDatabase: applyToDatabase,
        transcription: updatedTranscription || {
          ...transcription,
          captions: fixedCaptions,
        },
        changes: changes,
        confidence: 0.95,
        usage: result.usage,
        summary: `Fixed ${changes.length} punctuation issue${changes.length !== 1 ? 's' : ''}`,
      };
    } catch (error) {
      console.error('Punctuation fixer error:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'punctuationFixer',
    name: 'Punctuation Fixer',
    description:
      'Add and fix punctuation marks including periods, commas, question marks, and exclamation marks for proper readability.',
    inputSchema: z.object({
      transcriptionId: z.string().describe('Transcription ID to fix'),
      userRequest: z
        .string()
        .optional()
        .describe('Specific punctuation preferences'),
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
      tags: [
        'transcription',
        'autofix',
        'transcription-autofix',
        'punctuation',
      ],
      icon: '⁉️',
      title: 'Punctuation Fixer',
      description: 'Add and fix punctuation marks',
      hideUI: false,
    },
  });

export default punctuationFixerAgent;

