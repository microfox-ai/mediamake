import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import type { Caption, CaptionsDocument } from '@/app/types/transcription';
import { preserveCaptionOriginalState } from '@/lib/captions/original-state';
import { appendUsage } from '@/app/ai/middlewares/usageCapture';
import { loadCaption } from '../middlewares/loadTranscription';
import {
  CAPTION_LAYOUTS,
  SPLIT_HIGHLIGHT_MODEL,
  SplitAndHighlightParamsSchema,
  runSplitAndHighlight,
} from '../../shared/splitAndHighlight';

/**
 * Metadata pass that reuses the motion-graphics split-and-highlight prompt.
 * Writes htmlText onto a captions document only. The transcription is never updated.
 * keyword and splitParts are not written.
 */

const aiRouter = new AiRouter();

function stitchCaptions(
  full: Caption[],
  selectedIndices: number[] | undefined,
  replacement: Caption[],
): Caption[] {
  const kept = preserveCaptionOriginalState(
    selectedIndices && selectedIndices.length === replacement.length
      ? selectedIndices.map(index => full[index]).filter(Boolean)
      : full,
    replacement,
  );
  const nextReplacement =
    selectedIndices && selectedIndices.length === replacement.length
      ? replacement.map((caption, index) => {
          const source = full[selectedIndices[index]];
          return source?.originalState
            ? { ...caption, originalState: source.originalState }
            : caption;
        })
      : kept;

  if (
    !selectedIndices ||
    selectedIndices.length === 0 ||
    selectedIndices.length >= full.length
  ) {
    return nextReplacement;
  }

  const selected = new Set(selectedIndices);
  const next: Caption[] = [];
  let inserted = false;

  full.forEach((caption, index) => {
    if (!selected.has(index)) {
      next.push(caption);
      return;
    }
    if (!inserted) {
      next.push(...nextReplacement);
      inserted = true;
    }
  });

  return inserted ? next : nextReplacement;
}

const splitAndHighlightAgent = aiRouter
  .before('/', loadCaption)
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Splitting lines and choosing highlights...',
      });

      const {
        captionId,
        transcriptionId,
        userRequest,
        frameChoice,
        lineLength = 'medium',
        fontScaling = 2,
        staticFrameChoice = true,
      } = ctx.request.params as {
        captionId?: string;
        transcriptionId?: string;
        userRequest?: string;
        frameChoice: (typeof CAPTION_LAYOUTS)[number];
        lineLength?: 'short' | 'medium' | 'large';
        fontScaling?: number;
        staticFrameChoice?: boolean;
      };

      if (!frameChoice) {
        throw new Error('frameChoice is required');
      }

      const captions = (ctx.state.captions ?? []) as Caption[];
      if (captions.length === 0) {
        throw new Error('No captions available for arrangement');
      }

      const result = await runSplitAndHighlight(captions, {
        frameChoice,
        lineLength,
        fontScaling,
        staticFrameChoice,
        userRequest,
      });

      if (result.usage) {
        appendUsage(ctx.state, `google/${SPLIT_HIGHLIGHT_MODEL}`, result.usage);
      }

      if (!captionId || !ctx.state.captionDocument) {
        throw new Error('captionId is required');
      }

      const selectedIndices = ctx.state.selectedIndices as number[] | undefined;
      const db = await getDatabase();
      const doc = ctx.state.captionDocument as CaptionsDocument;
      const savedCaptions = stitchCaptions(
        doc.captions,
        selectedIndices,
        result.fixedCaptions,
      );
      await db.collection<CaptionsDocument>('captions').updateOne(
        { _id: new ObjectId(captionId) },
        { $set: { captions: savedCaptions, updatedAt: new Date() } },
      );

      return {
        captions: savedCaptions,
        sentences: result.fixedCaptions.map((caption, sentenceIndex) => ({
          sentenceIndex,
          originalText: captions[sentenceIndex]?.text ?? caption.text,
          metadata: caption.metadata,
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
        })),
        htmlText: result.htmlText,
        totalSentences: result.fixedCaptions.length,
        confidence: result.confidence,
        frameChoice,
        fontScaling,
        staticFrameChoice: result.staticFrameChoice,
        captionId,
        transcriptionId: transcriptionId ?? null,
        summary: result.summary,
      };
    } catch (error) {
      console.error('Split and highlight error:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'splitAndHighlightAgent',
    name: 'Split and Highlight',
    description:
      'Motion-graphics line split and highlight. Rewrites caption cards from one HTML document: <br/><br/> between cards, <br/> inside a card, <b> for words scaled by fontScaling. Saves onto the captions document only. Does not update the transcription.',
    inputSchema: SplitAndHighlightParamsSchema.extend({
      captionId: z.string().describe('Captions document to arrange.'),
      transcriptionId: z
        .string()
        .optional()
        .describe(
          'Source transcription id, used only to read the audio URL. The transcription is not updated.',
        ),
      userRequest: z.string().optional(),
      selectedIndices: z
        .array(z.number())
        .optional()
        .describe('Caption indices to rearrange. Others stay in place.'),
    }),
    outputSchema: z.object({
      captions: z.array(z.any()),
      htmlText: z.string(),
      totalSentences: z.number(),
      confidence: z.number(),
      frameChoice: z.enum(CAPTION_LAYOUTS),
      staticFrameChoice: z.boolean(),
      summary: z.string(),
      sentences: z.array(z.any()),
    }),
    metadata: {
      category: 'caption',
      tags: ['caption', 'metadata', 'htmlText', 'split-and-highlight'],
      icon: '✨',
      title: 'Split and Highlight',
      description:
        'Arrange caption lines and highlights for a motion-graphics layout',
      hidden: true,
    },
  });

export default splitAndHighlightAgent;
