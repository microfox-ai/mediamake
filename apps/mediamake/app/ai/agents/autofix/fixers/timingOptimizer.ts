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
 * Timing Optimizer Agent
 * Specialized in optimizing word-level timing for better subtitle display
 */

const aiRouter = new AiRouter();

const timingOptimizerAgent = aiRouter
  .before('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      console.log('TIMING OPTIMIZER: Starting...');
      ctx.response.writeMessageMetadata({
        loader: 'Optimizing word timing...',
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

      const systemPrompt = dedent`You are a timing optimization expert specializing in subtitle synchronization.

TASK: Optimize word-level timing for better subtitle display without changing text.

RULES:
1. Adjust timing to ensure smooth subtitle transitions
2. Add small gaps between sentences if needed (50-100ms)
3. Remove overlapping word timings
4. Ensure minimum display time for readability (words < 0.2s might be too fast)
5. Do NOT change any words, spelling, or content
6. Do NOT change sentence structure
7. Only modify the timing values

TIMING OPTIMIZATION GUIDELINES:
- Minimum word duration: 0.15 seconds
- Ideal gap between sentences: 50-100ms
- Remove overlaps between words in same sentence
- Ensure captions don't flash too quickly
- Maintain overall audio sync

TIMING FORMAT:
- Adjust the [absoluteStart-absoluteEnd] values
- Keep timing sequential (no backwards time)
- Ensure start time < end time for each word

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

Optimize timing values for better subtitle display without changing any text.`;

      const result = await generateText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        prompt,
        maxRetries: 2,
      });

      console.log('TIMING OPTIMIZER USING:', result.usage);

      // Parse the AI output back to caption structure
      const fixedCaptions = parseAIOutputToCaptions(
        result.text,
        transcription.captions,
      );

      // Detect changes
      const changes = detectChanges(
        transcription.captions,
        fixedCaptions,
        'timing_optimization',
      );

      // Optionally save to database
      let updatedTranscription = null;
      if (applyToDatabase) {
        updatedTranscription = await saveTranscriptionFix(
          transcriptionId,
          fixedCaptions,
          changes,
          'Timing Optimizer',
          userRequest,
        );
      }

      console.log('TIMING OPTIMIZER: Completed -', changes.length, 'changes');

      return {
        success: true,
        appliedToDatabase: applyToDatabase,
        transcription: updatedTranscription || {
          ...transcription,
          captions: fixedCaptions,
        },
        changes: changes,
        confidence: 0.88,
        usage: result.usage,
        summary: `Optimized timing (${changes.length} adjustment${changes.length !== 1 ? 's' : ''})`,
      };
    } catch (error) {
      console.error('Timing optimizer error:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'timingOptimizer',
    name: 'Timing Optimizer',
    description:
      'Optimize word-level timing for better subtitle synchronization without changing text. Adjusts gaps, removes overlaps, ensures readability.',
    inputSchema: z.object({
      transcriptionId: z.string().describe('Transcription ID to optimize'),
      userRequest: z
        .string()
        .optional()
        .describe('Specific timing preferences'),
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
      tags: ['transcription', 'autofix', 'transcription-autofix', 'timing'],
      icon: '⏱️',
      title: 'Timing Optimizer',
      description: 'Optimize word-level timing',
      hideUI: false,
    },
  });

export default timingOptimizerAgent;

