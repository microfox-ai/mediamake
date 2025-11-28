/**
 * Sentiment Color Subtitles Preset
 *
 * This preset creates dynamic subtitles that change color, styling, and emphasis
 * based on caption sentiment metadata (positive, negative, neutral). Each word
 * is rendered with sentiment-driven visual effects including color palettes,
 * text glow, scale transformations, and brightness adjustments.
 *
 * Features:
 * - **Sentiment-Driven Colors**: Positive (green), Negative (red), Neutral (gray)
 * - **Dynamic Text Glow**: Sentiment-based shadow effects with varying intensity
 * - **Scale Transformations**: Words scale differently based on sentiment
 * - **Brightness Adjustments**: Enhances or reduces brightness per sentiment
 * - **Smooth Transitions**: 300ms transitions between sentiment changes
 * - **Word-by-Word Rendering**: Each word appears at precise timing with sentiment styling
 * - **Flexible Layout**: Horizontal flex layout with automatic wrapping
 *
 * Use Cases:
 * - Social media content with emotional storytelling
 * - Review videos highlighting positive/negative feedback
 * - Educational content with sentiment-aware captions
 * - Marketing videos emphasizing key emotional moments
 * - Product demos with customer sentiment analysis
 *
 * Dependencies:
 * - Requires caption data with sentiment metadata field
 * - Sentiment values: 'positive', 'negative', 'neutral'
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            sentiment: z
              .enum(['positive', 'negative', 'neutral'])
              .optional()
              .describe('Sentiment classification of the caption'),
            impact: z
              .number()
              .optional()
              .describe('Effect intensity multiplier (0.1 - 3.0)'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with sentiment metadata'),

  fontSize: z
    .number()
    .default(48)
    .describe('Base font size for subtitle text in pixels'),

  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for subtitle text'),

  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),

  bottomOffset: z
    .number()
    .default(64)
    .describe('Distance from bottom of screen in pixels'),

  wordSpacing: z
    .number()
    .default(8)
    .describe('Spacing between words in pixels'),

  maxWidth: z
    .string()
    .default('90%')
    .describe('Maximum width of subtitle container'),

  transitionDuration: z
    .number()
    .default(300)
    .describe('Transition duration in milliseconds for sentiment changes'),

  positiveColor: z
    .string()
    .default('#22c55e')
    .describe('Color for positive sentiment words'),

  negativeColor: z
    .string()
    .default('#ef4444')
    .describe('Color for negative sentiment words'),

  neutralColor: z
    .string()
    .default('#6b7280')
    .describe('Color for neutral sentiment words'),

  positiveScale: z
    .number()
    .default(1.1)
    .describe('Scale multiplier for positive sentiment words'),

  negativeScale: z
    .number()
    .default(1.05)
    .describe('Scale multiplier for negative sentiment words'),

  neutralScale: z
    .number()
    .default(1.0)
    .describe('Scale multiplier for neutral sentiment words'),

  positiveBrightness: z
    .number()
    .default(1.2)
    .describe('Brightness multiplier for positive sentiment words'),

  negativeBrightness: z
    .number()
    .default(0.9)
    .describe('Brightness multiplier for negative sentiment words'),

  neutralBrightness: z
    .number()
    .default(1.0)
    .describe('Brightness multiplier for neutral sentiment words'),

  glowIntensity: z
    .number()
    .default(0.6)
    .describe('Intensity of text glow effect (0.0 - 1.0)'),

  enableTransitions: z
    .boolean()
    .default(true)
    .describe('Enable smooth transitions between sentiment changes'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    fontFamily,
    fontWeight,
    bottomOffset,
    wordSpacing,
    maxWidth,
    transitionDuration,
    positiveColor,
    negativeColor,
    neutralColor,
    positiveScale,
    negativeScale,
    neutralScale,
    positiveBrightness,
    negativeBrightness,
    neutralBrightness,
    glowIntensity,
    enableTransitions,
  } = params;

  // Helper: Get sentiment-driven styling
  const getSentimentStyle = (sentiment: string | undefined) => {
    const sentimentType = sentiment || 'neutral';

    let color = neutralColor;
    let scale = neutralScale;
    let brightness = neutralBrightness;
    let glowColor = 'rgba(107,114,128,0.3)';

    if (sentimentType === 'positive') {
      color = positiveColor;
      scale = positiveScale;
      brightness = positiveBrightness;
      glowColor = `rgba(34,197,94,${glowIntensity})`;
    } else if (sentimentType === 'negative') {
      color = negativeColor;
      scale = negativeScale;
      brightness = negativeBrightness;
      glowColor = `rgba(239,68,68,${glowIntensity})`;
    }

    return {
      color,
      transform: `scale(${scale})`,
      filter: `brightness(${brightness})`,
      textShadow: `0 0 ${sentimentType === 'neutral' ? 10 : 20}px ${glowColor}`,
    };
  };

  // Generate caption components
  const captionComponents = captions.map((caption) => {
    const sentiment = caption.metadata?.sentiment;
    const sentimentStyle = getSentimentStyle(sentiment);

    // Generate word components
    const wordComponents = caption.words.map((word, wordIndex) => {
      const wordId = `sentiment-word-${caption.id}-${wordIndex}`;

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontFamily,
            fontWeight,
            color: sentimentStyle.color,
            textShadow: sentimentStyle.textShadow,
            transform: sentimentStyle.transform,
            filter: sentimentStyle.filter,
            transition: enableTransitions
              ? `all ${transitionDuration}ms ease-in-out`
              : 'none',
            display: 'inline-block',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
      };
    });

    // Caption container
    return {
      id: `sentiment-caption-${caption.id}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row flex-wrap items-center justify-center',
          style: {
            gap: `${wordSpacing}px`,
            width: maxWidth,
            pointerEvents: 'none' as const,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };
  });

  // Root container
  const rootContainer = {
    id: 'sentiment-color-subtitles-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-end justify-center',
        style: {
          paddingBottom: `${bottomOffset}px`,
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio',
      },
    },
    childrenData: captionComponents,
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'SentimentColorSubtitles',
  title: 'Sentiment Color Subtitles',
  description:
    'Dynamic subtitle preset that changes color, styling, and emphasis based on caption sentiment metadata (positive, negative, neutral). Features sentiment-driven color palettes, intensity scaling, and smooth transitions between emotional states.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'sentiment',
    'color',
    'emotion',
    'dynamic',
    'social-media',
    'analytics',
    'positive',
    'negative',
    'neutral',
  ],
  defaultInputParams: {
    captions: [],
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '700',
    bottomOffset: 64,
    wordSpacing: 8,
    maxWidth: '90%',
    transitionDuration: 300,
    positiveColor: '#22c55e',
    negativeColor: '#ef4444',
    neutralColor: '#6b7280',
    positiveScale: 1.1,
    negativeScale: 1.05,
    neutralScale: 1.0,
    positiveBrightness: 1.2,
    negativeBrightness: 0.9,
    neutralBrightness: 1.0,
    glowIntensity: 0.6,
    enableTransitions: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const SentimentColorSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
