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
 * Spelling Fixer Agent
 * Specialized in fixing spelling mistakes only
 */

const aiRouter = new AiRouter();

const spellingFixerAgent = aiRouter
  .before('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      console.log('SPELLING FIXER: Starting...');
      ctx.response.writeMessageMetadata({
        loader: 'Fixing spelling errors...',
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

      const systemPrompt = dedent`You are a spelling correction expert specializing in audio transcription corrections.

TASK: Fix ONLY spelling mistakes in the transcription.

RULES:
1. Correct obvious spelling errors
2. Fix common misheard words (e.g., "there" vs "their", "your" vs "you're")
3. Preserve ALL timing information EXACTLY as provided
4. Do NOT change sentence structure
5. Do NOT merge or split words
6. Do NOT change punctuation
7. Do NOT add or remove words

GUIDELINES:
- Only fix clear, obvious spelling errors
- When unsure, keep the original spelling
- Consider context when fixing homophones
- Maintain the exact same number of words

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

Fix ONLY spelling errors while preserving all timing and structure.`;

      const result = await generateText({
        model: google('gemini-2.5-flash'), // Faster model for simple tasks
        system: systemPrompt,
        prompt,
        maxRetries: 2,
      });

      console.log('SPELLING FIXER USING:', result.usage);

      // Parse the AI output back to caption structure
      const fixedCaptions = parseAIOutputToCaptions(
        result.text,
        transcription.captions,
      );

      // Detect changes
      const changes = detectChanges(
        transcription.captions,
        fixedCaptions,
        'spelling_fix',
      );

      // Optionally save to database
      let updatedTranscription = null;
      if (applyToDatabase) {
        updatedTranscription = await saveTranscriptionFix(
          transcriptionId,
          fixedCaptions,
          changes,
          'Spelling Fixer',
          userRequest,
        );
      }

      console.log('SPELLING FIXER: Completed -', changes.length, 'changes');

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
        summary: `Fixed ${changes.length} spelling error${changes.length !== 1 ? 's' : ''}`,
      };
    } catch (error) {
      console.error('Spelling fixer error:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'spellingFixer',
    name: 'Spelling Fixer',
    description:
      'Fix spelling mistakes in transcription while preserving timing and structure. Ideal for correcting misheard words and common spelling errors.',
    inputSchema: z.object({
      transcriptionId: z.string().describe('Transcription ID to fix'),
      userRequest: z
        .string()
        .optional()
        .describe('Specific spelling corrections to focus on'),
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
      tags: ['transcription', 'autofix', 'transcription-autofix', 'spelling'],
      icon: '✏️',
      title: 'Spelling Fixer',
      description: 'Fix spelling mistakes only',
      hideUI: false,
    },
  });

export default spellingFixerAgent;

