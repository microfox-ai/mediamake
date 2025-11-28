/**
 * Micro-Breathing Typography Preset
 *
 * A minimalist typography animation preset featuring subtle breathing effects on individual words.
 * Inspired by kinetic typography in modern video essays and documentary title sequences, this preset
 * creates almost imperceptible motion that keeps text feeling alive without disrupting readability.
 *
 * Features:
 * - Word-level breathing animations (keywords breathe at 102-103%, regular words at 100-101%)
 * - Subtle letter-spacing animations (0.05em to 0.08em) for breathing room
 * - Baseline shifts (±1px translateY) for organic text movement
 * - Staggered timing based on word.start for natural flow
 * - Optimized for long-form content, subtitles, and elegant title cards
 *
 * Technical Implementation:
 * - Uses BaseLayout with 'inline-flex flex-wrap' for natural text flow
 * - TextAtom for each word with access to caption.words[] array
 * - Animations loop naturally over word visibility duration
 * - Performance: subpixel-antialiased for smooth rendering
 * - fitDurationTo: 'caption' for perfect synchronization
 *
 * Use Cases:
 * - Long-form video content with captions
 * - Documentary title sequences
 * - Elegant subtitle overlays
 * - Professional presentation text
 * - Poetic or contemplative content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string().describe('Unique caption identifier'),
        text: z.string().describe('Full caption text'),
        start: z.number().describe('Caption start time (relative to caption start = 0)'),
        end: z.number().describe('Caption end time (relative)'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z.array(
          z.object({
            id: z.string().optional().describe('Word identifier'),
            text: z.string().describe('Word text'),
            start: z.number().describe('Word start time (relative to caption)'),
            end: z.number().describe('Word end time (relative)'),
            duration: z.number().describe('Word duration'),
            absoluteStart: z.number().describe('Absolute start in caption timeline'),
            absoluteEnd: z.number().describe('Absolute end in caption timeline'),
            confidence: z.number().optional().describe('Speech recognition confidence'),
          }),
        ),
        metadata: z
          .object({
            keyword: z.boolean().optional().describe('Whether this caption contains a keyword'),
          })
          .optional()
          .describe('Caption-level metadata'),
      }),
    )
    .describe('Array of caption objects with words and metadata'),

  font: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family with optional weight and style (e.g., "Inter:400", "Roboto:600:italic")'),

  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .optional()
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),

  keywordBreathingScale: z
    .number()
    .min(1.0)
    .max(1.05)
    .default(1.03)
    .optional()
    .describe('Maximum scale for keyword breathing (1.02-1.03 recommended)'),

  regularBreathingScale: z
    .number()
    .min(1.0)
    .max(1.02)
    .default(1.01)
    .optional()
    .describe('Maximum scale for regular word breathing (1.00-1.01 recommended)'),

  keywordBreathingDuration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .optional()
    .describe('Breathing cycle duration for keywords in seconds'),

  regularBreathingDuration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .optional()
    .describe('Breathing cycle duration for regular words in seconds'),

  letterSpacingMin: z
    .string()
    .default('0.05em')
    .optional()
    .describe('Minimum letter spacing (CSS value, e.g., "0.05em")'),

  letterSpacingMax: z
    .string()
    .default('0.08em')
    .optional()
    .describe('Maximum letter spacing (CSS value, e.g., "0.08em")'),

  baselineShift: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe('Maximum baseline shift in pixels (±value)'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('bottom')
    .optional()
    .describe('Vertical position of text container'),

  horizontalAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .optional()
    .describe('Horizontal alignment of text'),

  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(40)
    .optional()
    .describe('Container padding in pixels'),

  wordGap: z
    .string()
    .default('0.25em')
    .optional()
    .describe('Gap between words (CSS gap value)'),

  lineHeight: z
    .number()
    .min(1)
    .max(3)
    .default(1.6)
    .optional()
    .describe('Line height multiplier'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter',
    fontSize = 48,
    textColor = '#FFFFFF',
    keywordBreathingScale = 1.03,
    regularBreathingScale = 1.01,
    keywordBreathingDuration = 4,
    regularBreathingDuration = 5,
    letterSpacingMin = '0.05em',
    letterSpacingMax = '0.08em',
    baselineShift = 1,
    position = 'bottom',
    horizontalAlign = 'center',
    containerPadding = 40,
    wordGap = '0.25em',
    lineHeight = 1.6,
  } = params;

  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Helper: Create breathing effect for a word
  const createBreathingEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
    isKeyword: boolean,
  ): GenericEffectData => {
    const breathingScale = isKeyword
      ? keywordBreathingScale
      : regularBreathingScale;
    const breathingDuration = isKeyword
      ? keywordBreathingDuration
      : regularBreathingDuration;

    // Calculate how many breathing cycles fit within word duration
    const cycleCount = Math.max(1, Math.floor(wordDuration / breathingDuration));
    const effectDuration = Math.min(breathingDuration, wordDuration);

    return {
      type: 'ease-in-out',
      start: wordStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Scale breathing
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: breathingScale, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        // Letter spacing breathing
        { key: 'letterSpacing', val: letterSpacingMin, prog: 0 },
        { key: 'letterSpacing', val: letterSpacingMax, prog: 0.5 },
        { key: 'letterSpacing', val: letterSpacingMin, prog: 1 },
        // Baseline shift
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -baselineShift, prog: 0.25 },
        { key: 'translateY', val: baselineShift, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };
  };

  // Helper: Get position classes
  const getPositionClasses = () => {
    const positionMap = {
      top: 'items-start',
      center: 'items-center',
      bottom: 'items-end',
    };

    const alignMap = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
    };

    return `${positionMap[position]} ${alignMap[horizontalAlign]}`;
  };

  // Build caption components
  const captionContainers: RenderableComponentData[] = captions.map((caption) => {
    const captionId = `micro-breathing-caption-${caption.id}`;
    const isKeyword = caption.metadata?.keyword === true;

    // Build word components
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;

      // Create breathing effect
      const breathingEffect = createBreathingEffect(
        wordId,
        word.start,
        word.duration,
        isKeyword,
      );

      const wordData: TextAtomData = {
        text: word.text,
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          letterSpacing: letterSpacingMin,
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: wordData,
        context: {
          timing: {
            start: 0, // All words use caption-level timing
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-breathing`,
            componentId: 'generic',
            data: breathingEffect,
          },
        ],
      } as RenderableComponentData;
    });

    // Caption container
    return {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex ${getPositionClasses()}`,
          style: {
            padding: `${containerPadding}px`,
          },
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
          id: `${captionId}-text-container`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'inline-flex flex-wrap leading-relaxed tracking-wide subpixel-antialiased',
              style: {
                gap: wordGap,
                lineHeight: lineHeight,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: wordComponents,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'micro-breathing-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this', // Match duration to sum of all captions
      },
    },
    childrenData: captionContainers,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'microBreathingTypography',
  title: 'Micro-Breathing Typography',
  description:
    'A minimalist typography animation preset featuring subtle breathing effects on individual words. Keywords breathe at 102-103% scale while regular words breathe at 100-101%. Includes gentle letter-spacing animations and baseline shifts for organic text movement. Designed for long-form content, subtitles, and elegant title cards with almost imperceptible motion that keeps text feeling alive without disrupting readability.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'subtitles',
    'minimalist',
    'breathing',
    'kinetic',
    'subtle',
    'organic',
    'documentary',
    'video-essay',
    'elegant',
    'readability',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Subtle motion keeps text alive',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-0',
            text: 'Subtle',
            start: 0,
            end: 0.6,
            duration: 0.6,
            absoluteStart: 0,
            absoluteEnd: 0.6,
          },
          {
            id: 'word-1',
            text: 'motion',
            start: 0.6,
            end: 1.2,
            duration: 0.6,
            absoluteStart: 0.6,
            absoluteEnd: 1.2,
          },
          {
            id: 'word-2',
            text: 'keeps',
            start: 1.2,
            end: 1.8,
            duration: 0.6,
            absoluteStart: 1.2,
            absoluteEnd: 1.8,
          },
          {
            id: 'word-3',
            text: 'text',
            start: 1.8,
            end: 2.4,
            duration: 0.6,
            absoluteStart: 1.8,
            absoluteEnd: 2.4,
          },
          {
            id: 'word-4',
            text: 'alive',
            start: 2.4,
            end: 3,
            duration: 0.6,
            absoluteStart: 2.4,
            absoluteEnd: 3,
          },
        ],
        metadata: {
          keyword: false,
        },
      },
    ],
    font: 'Inter:400',
    fontSize: 48,
    textColor: '#FFFFFF',
    keywordBreathingScale: 1.03,
    regularBreathingScale: 1.01,
    keywordBreathingDuration: 4,
    regularBreathingDuration: 5,
    letterSpacingMin: '0.05em',
    letterSpacingMax: '0.08em',
    baselineShift: 1,
    position: 'bottom',
    horizontalAlign: 'center',
    containerPadding: 40,
    wordGap: '0.25em',
    lineHeight: 1.6,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const microBreathingTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
