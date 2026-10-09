import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { appendUsage } from '@/app/ai/middlewares/usageCapture';
import { saveCaptionsFix } from '../helpers';
import { loadCaption } from '../middlewares/loadTranscription';
import {
  CAPTION_LAYOUTS,
  SPLIT_HIGHLIGHT_MODEL,
  SplitAndHighlightParamsSchema,
  runSplitAndHighlight,
} from '../../shared/splitAndHighlight';

/**
 * Caption layout fixer.
 *
 * Reads a captions document, asks the shared motion-graphics arranger to
 * re-break cards and re-pick highlights, then writes the cards back.
 * Word text and timestamps stay on the source words.
 * Mixed flow is accepted and currently arranged as singular.
 */

const aiRouter = new AiRouter();

const sentenceStructureFixerAgent = aiRouter
  .before('/', loadCaption)
  .agent('/', async ctx => {
    try {
      const {
        captionId,
        transcriptionId,
        userRequest,
        applyToDatabase = false,
        flow = 'singular',
        layout,
        fontScaling = 2,
        maxCharacters = 'any',
      } = ctx.request.params as {
        captionId: string;
        transcriptionId?: string;
        userRequest?: string;
        applyToDatabase?: boolean;
        flow?: 'singular' | 'mixed';
        layout: (typeof CAPTION_LAYOUTS)[number];
        fontScaling?: number;
        maxCharacters?: 'any' | '15-25' | '25to35' | '35to45' | '45+';
      };

      if (!layout) {
        throw new Error('layout is required');
      }

      console.log('CAPTION LAYOUT FIXER: Starting...', {
        captionId,
        transcriptionId,
        flow,
        layout,
        fontScaling,
        maxCharacters,
      });

      ctx.response.writeMessageMetadata({
        loader: `Arranging caption cards (${layout})...`,
      });

      const captions = ctx.state.captions;
      const result = await runSplitAndHighlight(captions, {
        flow,
        layout,
        fontScaling,
        maxCharacters,
        userRequest,
      });

      if (result.usage) {
        appendUsage(ctx.state, `google/${SPLIT_HIGHLIGHT_MODEL}`, result.usage);
      }

      let captionDocument = ctx.state.captionDocument;
      if (applyToDatabase) {
        captionDocument = await saveCaptionsFix(
          captionId,
          result.fixedCaptions,
        );
      } else {
        captionDocument = {
          ...captionDocument,
          captions: result.fixedCaptions,
        };
      }

      return {
        success: true,
        appliedToDatabase: applyToDatabase,
        captionId,
        transcriptionId: transcriptionId ?? null,
        audioUrl: ctx.state.audioUrl ?? ctx.state.transcription?.audioUrl ?? null,
        captions: captionDocument,
        htmlText: result.htmlText,
        changes: result.changes,
        confidence: result.confidence,
        flow,
        flowApplied: result.flowApplied,
        layout,
        fontScaling,
        maxCharacters,
        summary: result.summary,
      };
    } catch (error) {
      console.error('Caption layout fixer error:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'sentenceStructureFixer',
    name: 'Caption Layout Fixer',
    description:
      'Rearrange a captions document into motion-graphics cards. Two <br/> tags separate cards, one <br/> splits lines inside a card, and <b> marks words drawn larger by fontScaling. Words and timestamps are preserved.',
    inputSchema: SplitAndHighlightParamsSchema.extend({
      captionId: z.string().describe('Captions document ID to rearrange'),
      transcriptionId: z
        .string()
        .optional()
        .describe(
          'Source transcription ID. Loaded for its audio URL when a later pass needs the audio.',
        ),
      userRequest: z
        .string()
        .optional()
        .describe('Extra direction for the arrangement'),
      applyToDatabase: z
        .boolean()
        .optional()
        .default(false)
        .describe('Save the rearranged captions onto the captions document'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      appliedToDatabase: z.boolean(),
      captionId: z.string(),
      htmlText: z.string(),
      changes: z.array(z.any()),
      confidence: z.number().min(0).max(1),
      flowApplied: z.literal('singular'),
      layout: z.enum(CAPTION_LAYOUTS),
      summary: z.string(),
    }),
    metadata: {
      category: 'caption',
      tags: ['caption', 'caption-autofix', 'sentence-structure', 'htmlText'],
      icon: '📝',
      title: 'Caption Layout Fixer',
      description:
        'Re-break caption cards and re-pick highlights for a motion-graphics layout',
      hideUI: false,
    },
  });

export default sentenceStructureFixerAgent;
