/**
 * Minimal Typokinetics Documentary Titles Preset
 *
 * This preset creates elegant documentary-style title cards with sequential word reveals.
 * Each word fades in while sliding up 20-30px from below with subtle scaling (0.95→1),
 * creating a premium streaming platform aesthetic. Words appear deliberately and measured
 * with 0.08s stagger timing, like text emerging from fog with vertical wipe transitions.
 *
 * Features:
 * - Sequential word fade-in with vertical slide (20-30px travel)
 * - Subtle scale animation (0.95→1) for dimensionality
 * - Compound effects: opacity, translateY, scale with ease-in-out easing
 * - Word-level timing with 0.08s stagger
 * - Inline-flex layout for natural text flow
 * - Overflow hidden on word wrappers for clipping
 * - Hardware acceleration via transform-gpu
 * - Auto-calculated duration via fitDurationTo: 'this'
 *
 * Use cases:
 * - Premium documentary title cards
 * - Streaming platform intros
 * - Elegant caption reveals
 * - Professional text overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            splitParts: z.array(z.string()).optional(),
            impact: z.number().optional(),
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:400", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(16)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),

  lineHeight: z
    .number()
    .min(0.8)
    .max(2)
    .default(1.2)
    .optional()
    .describe('Line height multiplier'),

  wordGap: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Gap between words in em units'),

  padding: z
    .number()
    .min(0)
    .max(200)
    .default(40)
    .optional()
    .describe('Container padding in pixels'),

  verticalTravel: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .optional()
    .describe('Vertical travel distance in pixels (20-30px recommended)'),

  animationDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.6)
    .optional()
    .describe('Duration of each word animation in seconds'),

  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.08)
    .optional()
    .describe('Delay between each word animation in seconds'),

  scaleFrom: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.95)
    .optional()
    .describe('Initial scale value (0.95 recommended for subtle effect)'),

  horizontalAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .optional()
    .describe('Horizontal alignment of text'),

  verticalAlign: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical alignment of text'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter',
    fontSize = 48,
    textColor = '#ffffff',
    lineHeight = 1.2,
    wordGap = 0.5,
    padding = 40,
    verticalTravel = 30,
    animationDuration = 0.6,
    staggerDelay = 0.08,
    scaleFrom = 0.95,
    horizontalAlign = 'center',
    verticalAlign = 'center',
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  let fontStyle: React.CSSProperties = {};
  if (font.includes(':')) {
    const fontParts = font.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Horizontal alignment class mapping
  const alignmentClassMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const verticalAlignmentClassMap = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };

  // Generate caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption) => {
      const words = caption.words;

      // Generate word components with wrapper for clipping
      const wordComponents: RenderableComponentData[] = words.map(
        (word, wordIndex) => {
          const wordId = `word-${caption.id}-${wordIndex}`;
          const wordWrapperId = `word-wrapper-${caption.id}-${wordIndex}`;

          // Calculate staggered effect start time (relative to caption start)
          const effectStart = word.start + wordIndex * staggerDelay;

          // Create compound effect: opacity + translateY + scale
          const wordEffect = {
            id: `effect-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: effectStart,
              duration: animationDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Opacity: 0 → 1
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                // TranslateY: verticalTravel → 0
                {
                  key: 'translateY',
                  val: `${verticalTravel}px`,
                  prog: 0,
                },
                { key: 'translateY', val: '0px', prog: 1 },
                // Scale: scaleFrom → 1
                { key: 'scale', val: scaleFrom, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          };

          // Word wrapper with overflow hidden for clipping
          const wordWrapper: RenderableComponentData = {
            id: wordWrapperId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'inline-block overflow-hidden transform-gpu',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: [
              {
                id: wordId,
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: word.text,
                  style: {
                    fontSize: `${fontSize}px`,
                    color: textColor,
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    ...(fontStyle.fontWeight
                      ? {
                          weights: [fontStyle.fontWeight.toString()],
                        }
                      : {}),
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: caption.duration,
                  },
                },
                effects: [wordEffect],
              } as RenderableComponentData,
            ],
          };

          return wordWrapper;
        },
      );

      // Caption container with inline-flex layout
      const captionContainer: RenderableComponentData = {
        id: `caption-container-${caption.id}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 inline-flex flex-wrap items-baseline ${alignmentClassMap[horizontalAlign]} ${verticalAlignmentClassMap[verticalAlign]} transform-gpu`,
            style: {
              lineHeight,
              gap: `${wordGap}em`,
              padding: `${padding}px`,
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

      return captionContainer;
    },
  );

  // Root container with fitDurationTo: 'this' for auto-calculated duration
  const rootContainer: RenderableComponentData = {
    id: 'minimal-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'minimal-typokinetics-doc-titles',
  title: 'Minimal Typokinetics Documentary Titles',
  description:
    'Elegant documentary-style title cards with sequential word reveals. Each word fades in while sliding up 20-30px from below with subtle scaling (0.95→1), creating a premium streaming platform aesthetic. Words appear deliberately and measured with 0.08s stagger timing, like text emerging from fog with vertical wipe transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'documentary',
    'minimal',
    'typokinetics',
    'fade',
    'slide',
    'scale',
    'premium',
    'elegant',
    'word-reveal',
    'captions',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Minimal Elegant Typography',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-0',
            text: 'Minimal',
            start: 0,
            end: 0.8,
            duration: 0.8,
            absoluteStart: 0,
            absoluteEnd: 0.8,
          },
          {
            id: 'word-1',
            text: 'Elegant',
            start: 0.8,
            end: 1.6,
            duration: 0.8,
            absoluteStart: 0.8,
            absoluteEnd: 1.6,
          },
          {
            id: 'word-2',
            text: 'Typography',
            start: 1.6,
            end: 2.4,
            duration: 0.8,
            absoluteStart: 1.6,
            absoluteEnd: 2.4,
          },
        ],
      },
    ],
    font: 'Inter:400',
    fontSize: 48,
    textColor: '#ffffff',
    lineHeight: 1.2,
    wordGap: 0.5,
    padding: 40,
    verticalTravel: 30,
    animationDuration: 0.6,
    staggerDelay: 0.08,
    scaleFrom: 0.95,
    horizontalAlign: 'center',
    verticalAlign: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const minimalTypokineticsDocTitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
