import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { appendUsage } from '@/app/ai/middlewares/usageCapture';
import { saveCaptionsFix } from '../helpers';
import { stampCaptionOriginalState } from '@/lib/captions/original-state';
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
 * Each card is arranged on its own. htmlText is the only caption metadata written.
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
        frameChoice,
        fontScaling = 2,
        staticFrameChoice = true,
      } = ctx.request.params as {
        captionId: string;
        transcriptionId?: string;
        userRequest?: string;
        applyToDatabase?: boolean;
        frameChoice: (typeof CAPTION_LAYOUTS)[number];
        fontScaling?: number;
        staticFrameChoice?: boolean;
      };

      if (!frameChoice) {
        throw new Error('frameChoice is required');
      }

      console.log('CAPTION LAYOUT FIXER: Starting...', {
        captionId,
        transcriptionId,
        frameChoice,
        fontScaling,
        staticFrameChoice,
      });

      ctx.response.writeMessageMetadata({
        loader: `Arranging caption cards (${frameChoice})...`,
      });

      const captions = ctx.state.captions;
      const result = await runSplitAndHighlight(captions, {
        frameChoice,
        fontScaling,
        staticFrameChoice,
        userRequest,
      });

      if (result.usage) {
        appendUsage(ctx.state, `google/${SPLIT_HIGHLIGHT_MODEL}`, result.usage);
      }

      const stampedCaptions = stampCaptionOriginalState(result.fixedCaptions);
      let captionDocument = ctx.state.captionDocument;
      if (applyToDatabase) {
        captionDocument = await saveCaptionsFix(
          captionId,
          stampedCaptions,
        );
      } else {
        captionDocument = {
          ...captionDocument,
          captions: stampedCaptions,
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
        frameChoice,
        fontScaling,
        staticFrameChoice: result.staticFrameChoice,
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
      'Rearrange a captions document into motion-graphics cards. Two <br/> tags separate cards, one <br/> splits lines inside a card, and <b> marks the words emphasized on that line. Only htmlText is written. Words and timestamps are preserved.',
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
      frameChoice: z.enum(CAPTION_LAYOUTS),
      staticFrameChoice: z.boolean(),
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
