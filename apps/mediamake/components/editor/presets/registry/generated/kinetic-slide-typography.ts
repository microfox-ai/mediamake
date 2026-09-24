/**
 * Kinetic Slide Typography - Horizontal Motion Preset
 *
 * This preset creates minimalist kinetic typography with pure horizontal translation.
 * Text lines enter from alternating sides (left, right, left, right) creating a dynamic
 * zigzag reading pattern. Features butter-smooth easing with custom acceleration curves,
 * subtle depth-building shadows, and perfectly timed overlapping animations.
 *
 * Features:
 * - **Alternating Direction Entry**: Lines slide in from left/right alternately
 * - **Pure Horizontal Translation**: Clean translateX animations with no rotation/scale
 * - **Custom Easing Curve**: Ease-in-out with smooth acceleration through middle 60%
 * - **Dynamic Shadow Effects**: Shadows intensify as text settles into position
 * - **Breathing Timing**: 1.2s journey per line with 200ms overlap between lines
 * - **Flexible Text Positioning**: Justify-start for left entries, justify-end for right
 *
 * Use cases:
 * - Sleek corporate video titles
 * - Professional presentation text
 * - Modern product announcements
 * - Clean editorial content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  BaseEffect,
  RenderableComponentData,
} from '@microfox/remotion';

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
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(z.any()).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption/sentence objects to display'),

  font: z
    .string()
    .default('Inter:600')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Inter:600", "Roboto:700")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels for the text'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),

  lineDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .optional()
    .describe('Duration for each line animation in seconds'),

  overlapTime: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Overlap time between consecutive line animations in seconds'),

  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .optional()
    .describe('Shadow intensity (0 = no shadow, 1 = full shadow)'),

  verticalSpacing: z
    .number()
    .min(0)
    .max(200)
    .default(60)
    .optional()
    .describe('Vertical spacing between lines in pixels'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter:600',
    fontSize = 48,
    textColor = '#ffffff',
    lineDuration = 1.2,
    overlapTime = 0.2,
    shadowIntensity = 0.1,
    verticalSpacing = 60,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontWeight = fontString.includes(':')
      ? parseInt(fontString.split(':')[1], 10)
      : 600;

    return { fontFamily, fontWeight };
  };

  const { fontFamily, fontWeight } = parseFontString(font);

  // Calculate stagger timing (time between each line start)
  const staggerDelay = lineDuration - overlapTime;

  // Calculate total duration needed
  const totalDuration = captions.length * staggerDelay + overlapTime;

  // Create sentence containers with alternating direction
  const sentenceContainers: RenderableComponentData[] = captions.map(
    (caption, index) => {
      const isLeftEntry = index % 2 === 0;
      const sentenceId = `sentence-${index}`;
      const textId = `text-${index}`;

      // Calculate timing relative to parent container
      const relativeStart = index * staggerDelay;

      // Create translation effect (left or right entry)
      const translateEffect: BaseEffect = {
        id: `translate-${sentenceId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Relative to sentence container start
          duration: lineDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'translateX',
              val: isLeftEntry ? '-100%' : '100%',
              prog: 0,
            },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Create shadow effect (intensifies as text settles)
      const shadowEffect: BaseEffect = {
        id: `shadow-${textId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Relative to sentence container start
          duration: lineDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'textShadow', val: '0 0 0 transparent', prog: 0 },
            {
              key: 'textShadow',
              val: `2px 4px 8px rgba(0,0,0,${shadowIntensity})`,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      };

      // Create sentence container (positioned absolutely for stacking)
      const sentenceContainer: RenderableComponentData = {
        id: sentenceId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute w-full flex items-center ${
              isLeftEntry ? 'justify-start' : 'justify-end'
            }`,
            style: {
              top: `${index * verticalSpacing}px`,
              left: 0,
              right: 0,
            },
          },
        },
        context: {
          timing: {
            start: relativeStart,
            duration: lineDuration,
          },
        },
        effects: [translateEffect, shadowEffect],
        childrenData: [
          {
            id: textId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: caption.text,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: fontWeight,
                color: textColor,
                textShadow: '0 0 0 transparent',
                padding: '0 40px',
              },
              font: {
                family: fontFamily,
                weights: [fontWeight.toString()],
                subsets: ['latin'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: lineDuration,
              },
            },
          } as RenderableComponentData,
        ],
      };

      return sentenceContainer;
    },
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-slide-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: sentenceContainers,
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
  id: 'kinetic-slide-typography',
  title: 'Kinetic Slide Typography - Horizontal Motion',
  description:
    'Minimalist kinetic typography preset featuring pure horizontal translation with alternating left/right entry directions. Text slides smoothly from off-screen edges with custom ease-in-out curves, subtle depth-building shadows, and perfectly timed overlapping animations creating a dynamic zigzag reading pattern.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'slide',
    'horizontal',
    'translation',
    'minimalist',
    'corporate',
    'clean',
    'smooth',
    'alternating',
    'zigzag',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Welcome to the future',
        start: 0,
        absoluteStart: 0,
        end: 2,
        absoluteEnd: 2,
        duration: 2,
      },
      {
        id: 'caption-2',
        text: 'Where innovation meets design',
        start: 1,
        absoluteStart: 1,
        end: 3,
        absoluteEnd: 3,
        duration: 2,
      },
      {
        id: 'caption-3',
        text: 'Creating seamless experiences',
        start: 2,
        absoluteStart: 2,
        end: 4,
        absoluteEnd: 4,
        duration: 2,
      },
    ],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#ffffff',
    lineDuration: 1.2,
    overlapTime: 0.2,
    shadowIntensity: 0.1,
    verticalSpacing: 60,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const kineticSlideTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
