import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { saveTranscriptionFix } from '../helpers';
import { appendUsage } from '@/app/ai/middlewares/usageCapture';
import { loadTranscription } from '../middlewares/loadTranscription';
import { runSpellingFix } from '../lib/spellingCore';
import { getReferenceLyrics } from '../lib/lyricsReference';

/**
 * Spelling Fixer Agent
 *
 * Corrects individual words against the Suno lyrics stored on the
 * transcription. Timestamps and caption line boundaries are never touched:
 * the model returns indexed single-word edits and they are applied in code.
 */

const aiRouter = new AiRouter();

const spellingFixerAgent = aiRouter
  .before('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      console.log('SPELLING FIXER: Starting...');

      const {
        transcriptionId,
        userRequest,
        useReferenceLyrics = true,
        allowWordRemoval = false,
        minConfidence = 0.6,
        applyToDatabase = false,
      } = ctx.request.params as {
        transcriptionId: string;
        userRequest?: string;
        useReferenceLyrics?: boolean;
        allowWordRemoval?: boolean;
        minConfidence?: number;
        applyToDatabase?: boolean;
      };

      const transcription = ctx.state.transcription;
      const captions = ctx.state.captions || transcription.captions;

      const reference = useReferenceLyrics
        ? getReferenceLyrics(transcription)
        : undefined;

      ctx.response.writeMessageMetadata({
        loader: reference
          ? 'Correcting words against the Suno lyrics...'
          : 'Fixing spelling errors...',
      });

      const result = await runSpellingFix(captions, {
        referenceLyrics: reference,
        useReference: useReferenceLyrics,
        allowWordRemoval,
        minConfidence,
        userRequest,
        language: transcription.language,
      });

      for (const usage of result.usage) {
        appendUsage(
          ctx.state,
          reference ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
          usage,
        );
      }

      console.log('SPELLING FIXER:', {
        usedReference: result.usedReference,
        proposed: result.proposedCount,
        applied: result.changes.length,
        rejected: result.rejected.length,
        removed: result.removedCount,
      });

      let updatedTranscription = null;
      if (applyToDatabase && result.changes.length > 0) {
        updatedTranscription = await saveTranscriptionFix(
          transcriptionId,
          result.fixedCaptions,
          result.changes,
          result.usedReference
            ? 'Spelling Fixer (Suno lyrics reference)'
            : 'Spelling Fixer',
          userRequest,
        );
      }

      return {
        success: true,
        appliedToDatabase: applyToDatabase && result.changes.length > 0,
        transcription: updatedTranscription || {
          ...transcription,
          captions: result.fixedCaptions,
        },
        changes: result.changes,
        rejected: result.rejected,
        reviewNotes: result.reviewNotes,
        usedReferenceLyrics: result.usedReference,
        confidence: result.confidence,
        usage: result.usage,
        summary: result.summary,
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
      "Fix mistranscribed words using the transcription's written lyrics as the authority on wording and slang spelling. Line boundaries are preserved; split or merged words share the heard word's original time. Sung lines missing from the written lyrics are kept and reported for confirmation.",
    inputSchema: z.object({
      transcriptionId: z.string().describe('Transcription ID to fix'),
      userRequest: z
        .string()
        .optional()
        .describe('Specific spelling corrections to focus on'),
      useReferenceLyrics: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Use the Suno lyrics saved on the transcription as the authoritative wording',
        ),
      allowWordRemoval: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Allow deleting clearly hallucinated words (words absent from the reference that duplicate a neighbour)',
        ),
      minConfidence: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .default(0.6)
        .describe('Discard proposed corrections below this confidence'),
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
      reviewNotes: z.array(z.any()).optional(),
      usedReferenceLyrics: z.boolean().optional(),
      confidence: z.number().min(0).max(1),
      summary: z.string(),
    }),
    metadata: {
      category: 'transcription',
      tags: ['transcription', 'autofix', 'transcription-autofix', 'spelling'],
      icon: '✏️',
      title: 'Spelling Fixer',
      description: 'Fix mistranscribed words against the Suno lyrics',
      hideUI: false,
    },
  });

export default spellingFixerAgent;
