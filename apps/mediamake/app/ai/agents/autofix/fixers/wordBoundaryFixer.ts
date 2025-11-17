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
 * Word Boundary Fixer Agent
 * Specialized in fixing merged or split words
 */

const aiRouter = new AiRouter();

const wordBoundaryFixerAgent = aiRouter
  .use('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      console.log('WORD BOUNDARY FIXER: Starting...');
      ctx.response.writeMessageMetadata({
        loader: 'Fixing word boundaries...',
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

      const systemPrompt = dedent`You are a word boundary expert specializing in fixing merged or split words in transcriptions.

TASK: Fix ONLY word boundary issues (merged or split words).

RULES:
1. Fix cases where 2 words were merged into 1:
   - Example: "helloworld" → "hello" + "world"
   - Split timing proportionally based on word length
2. Fix cases where 1 word was split into 2:
   - Example: "th e" → "the"
   - Merge timing to span both parts
3. Preserve overall timing information
4. Do NOT fix spelling errors (unless related to boundaries)
5. Do NOT change sentence structure
6. Do NOT change punctuation

TIMING HANDLING:
- When splitting a word: distribute the timing proportionally
  Example: "helloworld[1.0-2.0]" → "hello[1.0-1.5]<$>world[1.5-2.0]"
- When merging words: combine the timing span
  Example: "th[1.0-1.2]<$>e[1.2-1.4]" → "the[1.0-1.4]"

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

Fix ONLY word boundary issues (merged/split words) while preserving timing.`;

      const result = await generateText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        prompt,
        maxRetries: 2,
      });

      console.log('WORD BOUNDARY FIXER USING:', result.usage);

      // Parse the AI output back to caption structure
      const fixedCaptions = parseAIOutputToCaptions(
        result.text,
        transcription.captions,
      );

      // Detect changes
      const changes = detectChanges(
        transcription.captions,
        fixedCaptions,
        'word_boundary_fix',
      );

      // Optionally save to database
      let updatedTranscription = null;
      if (applyToDatabase) {
        updatedTranscription = await saveTranscriptionFix(
          transcriptionId,
          fixedCaptions,
          changes,
          'Word Boundary Fixer',
          userRequest,
        );
      }

      console.log(
        'WORD BOUNDARY FIXER: Completed -',
        changes.length,
        'changes',
      );

      return {
        success: true,
        appliedToDatabase: applyToDatabase,
        transcription: updatedTranscription || {
          ...transcription,
          captions: fixedCaptions,
        },
        changes: changes,
        confidence: 0.9,
        usage: result.usage,
        summary: `Fixed ${changes.length} word boundary issue${changes.length !== 1 ? 's' : ''}`,
      };
    } catch (error) {
      console.error('Word boundary fixer error:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'wordBoundaryFixer',
    name: 'Word Boundary Fixer',
    description:
      'Fix word boundary issues where words are incorrectly merged (helloworld) or split (th e). Handles timing adjustments automatically.',
    inputSchema: z.object({
      transcriptionId: z.string().describe('Transcription ID to fix'),
      userRequest: z
        .string()
        .optional()
        .describe('Specific word boundary issues to focus on'),
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
        'word-boundary',
      ],
      icon: '🔗',
      title: 'Word Boundary Fixer',
      description: 'Fix merged or split words',
      hideUI: false,
    },
  });

export default wordBoundaryFixerAgent;

