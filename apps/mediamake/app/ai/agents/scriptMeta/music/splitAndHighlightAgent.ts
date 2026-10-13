import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import type { Caption, CaptionsDocument } from '@/app/types/transcription';
import { appendUsage } from '@/app/ai/middlewares/usageCapture';
import { loadCaption } from '../middlewares/loadTranscription';
import {
  CAPTION_LAYOUTS,
  SPLIT_HIGHLIGHT_MODEL,
  SplitAndHighlightParamsSchema,
  runSplitAndHighlight,
} from '../../shared/splitAndHighlight';

/**
 * Internal splits for each caption.
 * Keeps the caption cards from sentence structure, then writes line breaks
 * and bold words into htmlText. fontScaling is used here. The transcription
 * is never updated.
 */

const aiRouter = new AiRouter();

function applyHtmlText(
  full: Caption[],
  selectedIndices: number[] | undefined,
  updated: Caption[],
): Caption[] {
  const indices =
    selectedIndices &&
    selectedIndices.length > 0 &&
    selectedIndices.length === updated.length
      ? selectedIndices
      : updated.length === full.length
        ? full.map((_, index) => index)
        : [];

  const next = full.map(caption => ({ ...caption }));
  indices.forEach((index, position) => {
    const htmlText = updated[position]?.metadata?.htmlText;
    const target = next[index];
    if (!target || typeof htmlText !== 'string' || !htmlText.trim()) return;
    next[index] = {
      ...target,
      metadata: {
        ...(target.metadata ?? {}),
        htmlText,
      },
    };
  });
  return next;
}

const splitAndHighlightAgent = aiRouter
  .before('/', loadCaption)
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Choosing line breaks and highlights...',
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
        throw new Error('No captions available');
      }

      const result = await runSplitAndHighlight(captions, {
        frameChoice,
        lineLength,
        fontScaling,
        staticFrameChoice,
        userRequest,
        preserveCards: true,
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
      const savedCaptions = applyHtmlText(
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
      'Split lines and choose highlights inside each existing caption. Cards stay as sentence structure left them. <br/> splits lines inside a caption and <b> marks words scaled by fontScaling. Does not update the transcription.',
    inputSchema: SplitAndHighlightParamsSchema.extend({
      captionId: z
        .string()
        .describe('Captions document to load and update.'),
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
        .describe(
          'Caption indices whose htmlText is rewritten. Other captions are left unchanged.',
        ),
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
        'Rewrite caption htmlText without moving cards',
      hidden: true,
    },
  });

export default splitAndHighlightAgent;
