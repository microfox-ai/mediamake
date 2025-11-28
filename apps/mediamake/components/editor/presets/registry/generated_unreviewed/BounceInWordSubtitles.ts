/**
 * Bounce-In Word Subtitles Preset
 *
 * Dynamic subtitle preset where each word bounces into place from below with smooth easing
 * when it becomes active. Features customizable bounce intensity, timing, and styling perfect
 * for energetic and engaging content.
 *
 * Features:
 * - **Word-by-Word Animation**: Each word bounces in independently when spoken
 * - **Bounce Effect**: Words start below viewport and bounce up with overshoot
 * - **Customizable Timing**: Control bounce duration and ease-out-back intensity
 * - **Visual Styling**: Font family, size, color, shadows, and text stroke
 * - **Layout Control**: Horizontal word layout with configurable spacing and positioning
 * - **Impact Multiplier**: Per-caption or global intensity control
 *
 * Use cases:
 * - Energetic social media content (TikTok, Reels, Shorts)
 * - Product announcements and promotional videos
 * - Tutorial highlights and key points
 * - Music videos with lyric emphasis
 * - Dynamic storytelling and testimonials
 */

import { z } from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
  TranscriptionSentenceSchema,
  TranscriptionWord,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// =====================
// PARAMS SCHEMA
// =====================

const presetParams = z.object({
  captions: TranscriptionSentenceSchema.array().describe('Array of caption sentences with word-level timing data'),

  // Typography
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for subtitle text'),
  fontSize: z.number().default(48).describe('Font size in pixels'),
  fontWeight: z.number().default(700).describe('Font weight (100-900)'),
  color: z.string().default('#FFFFFF').describe('Text color (hex)'),

  // Positioning
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('bottom')
    .describe('Vertical position of subtitles on screen'),
  horizontalAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal alignment of word layout'),
  bottomOffset: z
    .number()
    .default(80)
    .describe('Offset from bottom edge in pixels (when verticalPosition is bottom)'),
  topOffset: z
    .number()
    .default(80)
    .describe('Offset from top edge in pixels (when verticalPosition is top)'),
  sidePadding: z
    .number()
    .default(32)
    .describe('Horizontal padding from screen edges in pixels'),
  maxWidth: z
    .number()
    .default(1024)
    .describe('Maximum width of subtitle container in pixels'),

  // Animation
  bounceDuration: z
    .number()
    .default(0.5)
    .describe('Duration of bounce-in animation in seconds'),
  bounceIntensity: z
    .number()
    .default(1.2)
    .describe('Overshoot intensity for bounce effect (1.0 = no overshoot, higher = more bounce)'),
  initialYOffset: z
    .number()
    .default(80)
    .describe('Initial vertical offset below starting position in pixels'),
  initialScale: z
    .number()
    .default(0.3)
    .describe('Initial scale of words before bounce (0-1)'),
  wordSpacing: z
    .number()
    .default(8)
    .describe('Gap between words in pixels'),
  globalImpact: z
    .number()
    .default(1.0)
    .describe('Global impact multiplier for animation intensity (0.1-3.0)'),

  // Visual Effects
  textShadow: z
    .boolean()
    .default(true)
    .describe('Enable drop shadow and glow effect'),
  textStroke: z
    .boolean()
    .default(true)
    .describe('Enable subtle text stroke outline'),
  shadowColor: z
    .string()
    .default('rgba(0,0,0,0.5)')
    .describe('Color of text shadow'),
  shadowBlur: z.number().default(8).describe('Blur radius of text shadow in pixels'),
});

// =====================
// EXECUTION FUNCTION
// =====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontFamily,
    fontSize,
    fontWeight,
    color,
    verticalPosition,
    horizontalAlign,
    bottomOffset,
    topOffset,
    sidePadding,
    maxWidth,
    bounceDuration,
    bounceIntensity,
    initialYOffset,
    initialScale,
    wordSpacing,
    globalImpact,
    textShadow,
    textStroke,
    shadowColor,
    shadowBlur,
  } = params;

  if (!captions || captions.length === 0) {
    return {
      output: {
        childrenData: [],
      },
    };
  }

  // Calculate total duration based on captions
  const totalDuration = Math.max(
    ...captions.map((caption) => caption.absoluteEnd),
  );

  // Helper: Generate unique ID
  const generateId = (prefix: string, index: number): string => {
    return `${prefix}-${index}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Helper: Create bounce-in effect for a word
  const createBounceEffect = (
    word: TranscriptionWord,
    wordId: string,
    caption: TranscriptionSentence,
  ) => {

    return {
      id: generateId('bounce-effect', Math.random()),
      componentId: wordId,
      data: {
        type: 'ease-out-back',
        start: word.start, // Relative to caption
        duration: bounceDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Opacity: 0 → 1
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          // TranslateY: initialYOffset → 0 (bounce up from below)
          { key: 'translateY', val: initialYOffset, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          // Scale: initialScale → bounceIntensity → 1 (overshoot then settle)
          { key: 'scale', val: initialScale, prog: 0 },
          { key: 'scale', val: bounceIntensity, prog: 0.6 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Build caption components
  const captionComponents = captions.map((caption, captionIndex) => {
    const captionId = generateId('bounce-caption', captionIndex);

    // Build word components
    const wordComponents = caption.words.map((word, wordIndex) => {
      const wordId = generateId('bounce-word', wordIndex);

      // Create bounce-in effect
      const bounceEffect = createBounceEffect(word, wordId, caption);

      // Build text style
      const textStyle: React.CSSProperties = {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: color,
      };

      if (textShadow) {
        textStyle.textShadow = `0 2px ${shadowBlur}px ${shadowColor}, 0 0 20px rgba(0,0,0,0.3)`;
      }

      if (textStroke) {
        textStyle.WebkitTextStroke = '1px rgba(0,0,0,0.3)';
      }

      return {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          font: {
            family: fontFamily,
            weight: fontWeight,
          },
          style: textStyle,
        },
        context: {
          timing: {
            start: 0, // All words start together (sentence-level timing)
            duration: caption.duration,
          },
        },
        effects: [bounceEffect],
      };
    });

    // Build container layout positioning
    const containerClassName = (() => {
      const vertical =
        verticalPosition === 'top'
          ? 'items-start'
          : verticalPosition === 'center'
            ? 'items-center'
            : 'items-end';
      const horizontal =
        horizontalAlign === 'left'
          ? 'justify-start'
          : horizontalAlign === 'right'
            ? 'justify-end'
            : 'justify-center';
      return `absolute inset-0 flex ${vertical} ${horizontal}`;
    })();

    const containerStyle: React.CSSProperties = {
      pointerEvents: 'none',
    };

    if (verticalPosition === 'bottom') {
      containerStyle.paddingBottom = `${bottomOffset}px`;
    } else if (verticalPosition === 'top') {
      containerStyle.paddingTop = `${topOffset}px`;
    }

    // Inner container for words
    const wordsContainerStyle: React.CSSProperties = {
      gap: `${wordSpacing}px`,
      maxWidth: `${maxWidth}px`,
      paddingLeft: `${sidePadding}px`,
      paddingRight: `${sidePadding}px`,
    };

    return {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: containerClassName,
          style: containerStyle,
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [
        {
          id: generateId('words-container', captionIndex),
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-row flex-wrap items-end',
              style: wordsContainerStyle,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: wordComponents,
        },
      ],
    };
  });

  return {
    output: {
      childrenData: [
        {
          id: 'bounce-in-word-subtitles-root',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          childrenData: captionComponents as RenderableComponentData[],
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// =====================
// METADATA
// =====================

const presetMetadata: PresetMetadata = {
  id: 'BounceInWordSubtitles',
  title: 'Bounce-In Word Subtitles',
  description:
    'Dynamic subtitle preset where each word bounces into place from below with smooth easing when it becomes active. Features customizable bounce intensity, timing, and styling perfect for energetic and engaging content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'captions',
    'bounce',
    'kinetic',
    'words',
    'animated',
    'energetic',
    'dynamic',
    'social-media',
    'tiktok',
    'reels',
    'shorts',
  ],
  defaultInputParams: {
    captions: [],
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 700,
    color: '#FFFFFF',
    verticalPosition: 'bottom',
    horizontalAlign: 'center',
    bottomOffset: 80,
    topOffset: 80,
    sidePadding: 32,
    maxWidth: 1024,
    bounceDuration: 0.5,
    bounceIntensity: 1.2,
    initialYOffset: 80,
    initialScale: 0.3,
    wordSpacing: 8,
    globalImpact: 1.0,
    textShadow: true,
    textStroke: true,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// =====================
// EXPORT
// =====================

export const BounceInWordSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
