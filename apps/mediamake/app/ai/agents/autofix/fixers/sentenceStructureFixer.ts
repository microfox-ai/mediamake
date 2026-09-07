import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { saveTranscriptionFix } from '../helpers';
import { appendUsage } from '@/app/ai/middlewares/usageCapture';
import { loadTranscription } from '../middlewares/loadTranscription';
import { runSentenceStructureFix } from '../lib/sentenceStructureCore';
import {
  DEFAULT_STRUCTURE_PROFILE_ID,
  STRUCTURE_PROFILE_IDS,
  STRUCTURE_PROFILES,
  type SplitDensity,
} from '../lib/structureProfiles';
import { getReferenceLyrics } from '../lib/lyricsReference';

/**
 * Sentence Structure Fixer Agent
 *
 * Re-segments captions for a specific delivery style. The model only chooses
 * break points — words and timestamps are rebuilt from the source data, so a
 * bad model response degrades the segmentation rather than the transcript.
 */

const aiRouter = new AiRouter();

const sentenceStructureFixerAgent = aiRouter
  .before('/', loadTranscription)
  .agent('/', async ctx => {
    try {
      console.log('SENTENCE STRUCTURE FIXER: Starting...');

      const {
        transcriptionId,
        userRequest,
        structureStyle = DEFAULT_STRUCTURE_PROFILE_ID,
        splitDensity = 'auto',
        maxCharsPerLine,
        maxWordsPerLine,
        useReferenceLyrics = true,
        applyToDatabase = false,
      } = ctx.request.params as {
        transcriptionId: string;
        userRequest?: string;
        structureStyle?: string;
        splitDensity?: SplitDensity;
        maxCharsPerLine?: number;
        maxWordsPerLine?: number;
        useReferenceLyrics?: boolean;
        applyToDatabase?: boolean;
      };

      const profileLabel =
        STRUCTURE_PROFILES.find(p => p.id === structureStyle)?.label ??
        'Auto-detect';

      ctx.response.writeMessageMetadata({
        loader: `Re-segmenting captions (${profileLabel})...`,
      });

      const transcription = ctx.state.transcription;
      const captions = ctx.state.captions || transcription.captions;

      // The written lyrics tell the model where the actual song lines are, which
      // is exactly the information ElevenLabs' fixed-width chunking destroyed.
      const reference = useReferenceLyrics
        ? getReferenceLyrics(transcription)
        : undefined;

      const result = await runSentenceStructureFix(captions, {
        structureStyle,
        splitDensity,
        maxCharsPerLine,
        maxWordsPerLine,
        userRequest,
        referenceLyrics: reference?.text,
      });

      for (const usage of result.usage) {
        appendUsage(ctx.state, 'google/gemini-2.5-pro', usage);
      }

      console.log('SENTENCE STRUCTURE FIXER:', {
        profile: result.profile.id,
        splitDensity,
        wordsPerSecond: result.wordsPerSecond.toFixed(2),
        usedModel: result.usedModel,
        stats: result.stats,
        changes: result.changes.length,
      });

      let updatedTranscription = null;
      if (applyToDatabase) {
        updatedTranscription = await saveTranscriptionFix(
          transcriptionId,
          result.fixedCaptions,
          result.changes,
          `Sentence Structure Fixer (${result.profile.label})`,
          userRequest,
        );
      }

      return {
        success: true,
        appliedToDatabase: applyToDatabase,
        transcription: updatedTranscription || {
          ...transcription,
          captions: result.fixedCaptions,
        },
        changes: result.changes,
        confidence: result.confidence,
        usage: result.usage,
        structureStyle: result.profile.id,
        structureLabel: result.profile.label,
        splitDensity,
        stats: result.stats,
        summary: result.summary,
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
      'Re-segment captions for a chosen delivery style (rapid-fire rap, sung ballad, broadcast subtitle, kinetic short-form, ...). Short-line styles divide more; long-line styles divide less. Words and timestamps are preserved exactly.',
    inputSchema: z.object({
      transcriptionId: z.string().describe('Transcription ID to fix'),
      userRequest: z
        .string()
        .optional()
        .describe('Specific structure improvements to make'),
      structureStyle: z
        .enum(STRUCTURE_PROFILE_IDS as [string, ...string[]])
        .optional()
        .default(DEFAULT_STRUCTURE_PROFILE_ID)
        .describe(
          `Delivery/segmentation profile. One of: ${STRUCTURE_PROFILES.map(p => `${p.id} (${p.label})`).join(', ')}`,
        ),
      splitDensity: z
        .enum(['auto', 'much-finer', 'finer', 'coarser', 'much-coarser'])
        .optional()
        .default('auto')
        .describe(
          'Override how many divisions the chosen style makes. "finer" = shorter lines / more divisions.',
        ),
      maxCharsPerLine: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Hard character cap per caption line, overriding the style'),
      maxWordsPerLine: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Hard word cap per caption line, overriding the style'),
      useReferenceLyrics: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Use the transcription's Suno lyrics as a structural reference for where song lines break",
        ),
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
      structureStyle: z.string().optional(),
      structureLabel: z.string().optional(),
      stats: z.any().optional(),
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
      description:
        'Re-segment captions for a chosen delivery style (rap flow, sung, narration, kinetic...)',
      hideUI: false,
    },
  });

export default sentenceStructureFixerAgent;
