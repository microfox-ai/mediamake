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
 * Sentence Structure Fixer Agent
 * Specialized in improving sentence structure for better readability
 */

const aiRouter = new AiRouter();

const sentenceStructureFixerAgent = aiRouter
  .use('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      console.log('SENTENCE STRUCTURE FIXER: Starting...');
      ctx.response.writeMessageMetadata({
        loader: 'Improving sentence structure...',
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

      const systemPrompt = dedent`You are a sentence structure expert specializing in optimizing transcriptions for subtitle display.

TASK: Improve sentence structure for better readability in subtitles.

RULES:
1. Split run-on sentences that are too long for one subtitle screen
   - Keep each sentence under 50-60 characters ideally
   - Split at natural breaks (commas, conjunctions, pauses)
2. Merge sentence fragments that belong together
3. Ensure each sentence forms a complete, coherent thought
4. Preserve ALL timing information
5. Do NOT fix spelling errors
6. Do NOT change word boundaries
7. Keep the same words in the same order

SUBTITLE OPTIMIZATION:
- Each sentence appears on one screen
- Long sentences reduce readability
- Split at logical breaks: after phrases, before conjunctions
- Aim for 1-2 lines per subtitle (max ~70 characters)

TIMING PRESERVATION:
- Maintain exact word-level timing
- Only reorganize which words belong to which sentence
- Do not modify individual word timings

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

Optimize sentence structure for subtitle display while preserving all timing.`;

      const result = await generateText({
        model: google('gemini-2.5-pro'), // Use Pro for better understanding
        system: systemPrompt,
        prompt,
        maxRetries: 2,
      });

      console.log('SENTENCE STRUCTURE FIXER USING:', result.usage);

      // Parse the AI output back to caption structure
      const fixedCaptions = parseAIOutputToCaptions(
        result.text,
        transcription.captions,
      );

      // Detect changes
      const changes = detectChanges(
        transcription.captions,
        fixedCaptions,
        'sentence_structure_fix',
      );

      // Optionally save to database
      let updatedTranscription = null;
      if (applyToDatabase) {
        updatedTranscription = await saveTranscriptionFix(
          transcriptionId,
          fixedCaptions,
          changes,
          'Sentence Structure Fixer',
          userRequest,
        );
      }

      console.log(
        'SENTENCE STRUCTURE FIXER: Completed -',
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
        confidence: 0.85,
        usage: result.usage,
        summary: `Improved sentence structure (${changes.length} change${changes.length !== 1 ? 's' : ''})`,
      };
    } catch (error) {
      console.error('Sentence structure fixer error:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'sentenceStructureFixer',
    name: 'Sentence Structure Fixer',
    description:
      'Improve sentence structure by splitting long sentences and merging fragments. Optimized for subtitle display readability.',
    inputSchema: z.object({
      transcriptionId: z.string().describe('Transcription ID to fix'),
      userRequest: z
        .string()
        .optional()
        .describe('Specific structure improvements to make'),
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
        'sentence-structure',
      ],
      icon: '📝',
      title: 'Sentence Structure Fixer',
      description: 'Optimize sentence structure for subtitles',
      hideUI: false,
    },
  });

export default sentenceStructureFixerAgent;

