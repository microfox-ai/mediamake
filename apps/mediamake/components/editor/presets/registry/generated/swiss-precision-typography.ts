/**
 * Swiss Precision Typography Preset
 *
 * A precision-engineered typography preset that animates text with surgical accuracy,
 * mimicking the clean aesthetics of Swiss International Typography. Each word appears
 * using a staggered fade-in with subtle upward translation, creating a methodical,
 * deliberate animation that feels like watching a high-end tech product interface boot up.
 *
 * Features:
 * - **Staggered Word Animation**: Each word fades in with subtle upward translation (10px→0)
 * - **Letter Spacing Tightening**: Letter spacing animates from 0.05em to 0.02em during reveal
 * - **Surgical Timing**: 80ms natural stagger between words from caption data
 * - **GPU Acceleration**: Uses will-change properties for optimal performance
 * - **Mathematical Precision**: Every millisecond of timing calculated for maximum impact
 * - **Swiss Aesthetics**: Clean, minimalist design with left-aligned vertical stacking
 * - **Subtle Depth**: Optional text-shadow for depth on light backgrounds
 *
 * Use cases:
 * - Tech product reveals and demonstrations
 * - High-end brand presentations
 * - Technical documentation displays
 * - Corporate communication videos
 * - Precision-focused content where timing and clarity are paramount
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
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
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing data'),

  font: z
    .string()
    .optional()
    .default('Inter:500')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:500", "Helvetica:400"). Default: "Inter:500"',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .optional()
    .default(48)
    .describe('Font size in pixels. Default: 48'),

  textColor: z
    .string()
    .optional()
    .default('#000000')
    .describe('Text color in hex or rgba format. Default: "#000000"'),

  padding: z
    .object({
      x: z.number().min(0).optional().default(32),
      y: z.number().min(0).optional().default(24),
    })
    .optional()
    .default({ x: 32, y: 24 })
    .describe('Container padding in pixels. Default: {x: 32, y: 24}'),

  fadeInDuration: z
    .number()
    .min(0.1)
    .max(2)
    .optional()
    .default(0.4)
    .describe(
      'Duration of the fade-in and translation animation in seconds. Default: 0.4',
    ),

  translateYDistance: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .default(10)
    .describe(
      'Distance of upward translation during reveal in pixels. Default: 10',
    ),

  letterSpacingStart: z
    .string()
    .optional()
    .default('0.05em')
    .describe('Initial letter spacing value. Default: "0.05em"'),

  letterSpacingEnd: z
    .string()
    .optional()
    .default('0.02em')
    .describe('Final letter spacing value after tightening. Default: "0.02em"'),

  enableTextShadow: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable subtle text shadow for depth on light backgrounds'),

  textShadow: z
    .string()
    .optional()
    .default('0 1px 2px rgba(0,0,0,0.1)')
    .describe('Text shadow CSS value. Default: "0 1px 2px rgba(0,0,0,0.1)"'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter:500',
    fontSize = 48,
    textColor = '#000000',
    padding = { x: 32, y: 24 },
    fadeInDuration = 0.4,
    translateYDistance = 10,
    letterSpacingStart = '0.05em',
    letterSpacingEnd = '0.02em',
    enableTextShadow = false,
    textShadow = '0 1px 2px rgba(0,0,0,0.1)',
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:500';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Build childrenData for all captions
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const { words, absoluteStart, duration } = caption;

    // Build word components for this caption
    const wordComponents: RenderableComponentData[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = `swiss-word-${captionIndex}-${wordIndex}`;
      const wordWrapperId = `swiss-word-wrapper-${captionIndex}-${wordIndex}`;

      // Word fade-in and translate effect (applied to wrapper)
      const wordFadeTranslateEffect: GenericEffectData = {
        type: 'ease-out',
        start: word.start, // Relative to caption start
        duration: fadeInDuration,
        mode: 'provider',
        targetIds: [wordWrapperId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateY', val: translateYDistance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      // Letter spacing tightening effect (applied to text atom)
      const letterSpacingEffect: GenericEffectData = {
        type: 'ease-out',
        start: word.start, // Relative to caption start
        duration: fadeInDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'letterSpacing', val: letterSpacingStart, prog: 0 },
          { key: 'letterSpacing', val: letterSpacingEnd, prog: 1 },
        ],
      };

      // Text atom
      const textAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            ...fontStyle,
            letterSpacing: letterSpacingEnd,
            textShadow: enableTextShadow ? textShadow : undefined,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['500'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0, // All words use sentence duration
            duration: duration,
          },
        },
        effects: [
          {
            id: `letter-spacing-effect-${wordId}`,
            componentId: 'generic',
            data: letterSpacingEffect,
          },
        ],
      };

      // Word wrapper (for opacity and translateY effects)
      const wordWrapper: RenderableComponentData = {
        id: wordWrapperId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block',
            style: {
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: 0, // All words use sentence duration
            duration: duration,
          },
        },
        childrenData: [textAtom],
        effects: [
          {
            id: `word-fade-translate-${wordWrapperId}`,
            componentId: 'generic',
            data: wordFadeTranslateEffect,
          },
        ],
      };

      wordComponents.push(wordWrapper);
    });

    // Caption container (one per caption)
    const captionContainer: RenderableComponentData = {
      id: `swiss-caption-container-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-col items-start justify-center',
          style: {
            paddingLeft: `${padding.x}px`,
            paddingRight: `${padding.x}px`,
            paddingTop: `${padding.y}px`,
            paddingBottom: `${padding.y}px`,
          },
        },
      },
      context: {
        timing: {
          start: absoluteStart,
          duration: duration,
        },
      },
      childrenData: wordComponents,
    };

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'swiss-precision-typography-root',
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
        duration: 10, // Default duration, will be overridden by fitDurationTo if needed
      },
    },
    childrenData: captionContainers,
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'swiss-precision-typography',
  title: 'Swiss Precision Typography',
  description:
    'A precision-engineered typography preset that animates text with surgical accuracy, mimicking Swiss International Typography aesthetics. Features staggered fade-in with subtle upward translation, methodical timing, and mathematical precision. Each word appears exactly when needed with micro-pauses between semantic units for enhanced readability.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'swiss',
    'precision',
    'clean',
    'minimal',
    'staggered',
    'fade-in',
    'tech',
    'professional',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Precision engineered typography',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Precision',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'engineered',
            start: 0.88,
            absoluteStart: 0.88,
            end: 1.8,
            absoluteEnd: 1.8,
            duration: 0.92,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'typography',
            start: 1.88,
            absoluteStart: 1.88,
            end: 3,
            absoluteEnd: 3,
            duration: 1.12,
            confidence: 1,
          },
        ],
        metadata: {},
      },
    ],
    font: 'Inter:500',
    fontSize: 48,
    textColor: '#000000',
    padding: { x: 32, y: 24 },
    fadeInDuration: 0.4,
    translateYDistance: 10,
    letterSpacingStart: '0.05em',
    letterSpacingEnd: '0.02em',
    enableTextShadow: false,
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
};

// Export preset
export const swissPrecisionTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};