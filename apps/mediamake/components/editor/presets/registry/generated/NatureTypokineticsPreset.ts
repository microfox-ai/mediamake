/**
 * Nature-Inspired Typokinetics Preset
 *
 * This preset creates organic word growth animations mimicking leaves unfurling from stems.
 * Words scale from 0 to 1 with bottom-center origin, featuring non-linear opacity transitions
 * (ease-in-out-quart) and gentle rotation oscillations (-3deg to 3deg). Emphasized words grow
 * faster (500ms) while soft words take longer (1000ms). Includes continuous post-growth sway
 * animation for natural movement.
 *
 * Features:
 * - **Organic Growth Animation**: Words grow from scale(0) with bottom-center transform origin
 * - **Non-Linear Opacity**: Smooth fade-in using ease-in-out-quart bezier curve
 * - **Rotation Oscillation**: Gentle rotation during growth (-3deg to 3deg) for organic movement
 * - **Variable Timing**: Emphasized words grow faster (500ms), soft words slower (1000ms)
 * - **Post-Growth Sway**: Infinite gentle sway animation (-1deg to 1deg) after growth completes
 * - **Natural Styling**: Green-tinted text shadow and organic font (Quicksand)
 * - **Flex Wrap Layout**: Words wrap naturally like leaves on branches
 *
 * Use cases:
 * - Nature-themed content and environmental videos
 * - Organic product presentations
 * - Meditation and wellness content
 * - Poetry and literary content with natural themes
 * - Educational content about nature and biology
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time'),
        end: z.number().describe('Relative end time'),
        duration: z.number().describe('Relative duration'),
        absoluteStart: z
          .number()
          .describe('Absolute start in caption timeline'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start time within caption'),
            end: z.number().describe('Relative end time within caption'),
            duration: z.number(),
            absoluteStart: z.number().describe('Absolute start in timeline'),
            absoluteEnd: z.number().describe('Absolute end in timeline'),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            emphasis: z
              .boolean()
              .optional()
              .describe('Whether this caption is emphasized'),
          })
          .passthrough()
          .optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Quicksand:400')
    .describe(
      'Font family with optional weight (e.g., "Quicksand:400", "Lato:500")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#2d5016')
    .describe('Text color (natural green by default)'),

  emphasisDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .describe('Growth duration for emphasized words in seconds'),

  softDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.0)
    .describe('Growth duration for soft (non-emphasized) words in seconds'),

  swayDuration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Duration of post-growth sway animation in seconds'),

  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(48)
    .describe('Container padding in pixels'),

  wordGap: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between words in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { captions } = params;

  // Parse font string
  const fontString = params.font || 'Quicksand:400';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? fontParts[1] : '400';

  // Create caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      // Determine if caption is emphasized (from metadata)
      const isEmphasized = caption.metadata?.emphasis ?? false;

      // Create word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `nature-word-${captionIndex}-${wordIndex}`;

          // Determine growth duration based on emphasis
          const growthDuration = isEmphasized
            ? params.emphasisDuration
            : params.softDuration;

          // Growth effect: opacity, scale, rotation oscillation
          const growthEffect: GenericEffectData = {
            type: 'custom-bezier',
            customBezier: [0.77, 0, 0.175, 1], // ease-in-out-quart
            start: word.start, // Relative to caption
            duration: growthDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              // Opacity: 0 -> 1
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              // Scale: 0 -> 1
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Rotation oscillation: 0 -> 3 -> -3 -> 0
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 3, prog: 0.33 },
              { key: 'rotate', val: -3, prog: 0.66 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          };

          // Sway effect: continuous gentle rotation after growth
          const swayEffect: GenericEffectData = {
            type: 'linear',
            start: word.start + growthDuration, // Start after growth
            duration: caption.duration - word.start - growthDuration, // Rest of caption
            loop: true,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'rotate', val: -1, prog: 0 },
              { key: 'rotate', val: 1, prog: 0.5 },
              { key: 'rotate', val: -1, prog: 1 },
            ],
          };

          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: params.fontSize,
                color: params.textColor,
                fontWeight: fontWeight,
                textShadow: '0 2px 8px rgba(34, 139, 34, 0.3)',
                transformOrigin: 'bottom center',
              },
              font: {
                family: fontFamily,
                weights: [fontWeight],
                subsets: ['latin'],
                display: 'swap',
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0, // All words start together (sentence-level timing)
                duration: caption.duration,
              },
            },
            effects: [
              {
                id: `${wordId}-growth`,
                componentId: 'generic',
                data: growthEffect,
              },
              {
                id: `${wordId}-sway`,
                componentId: 'generic',
                data: swayEffect,
              },
            ],
          };

          return wordComponent;
        },
      );

      // Caption container with flex-wrap layout
      const captionContainer: RenderableComponentData = {
        id: `nature-caption-${captionIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap items-end justify-center',
            style: {
              gap: `${params.wordGap}px`,
              padding: `${params.containerPadding}px`,
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

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'nature-typokinetics-root',
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
        duration: 10, // Default, will be overridden by children
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'NatureTypokineticsPreset',
  title: 'Nature-Inspired Typokinetics',
  description:
    'Organic word growth animations mimicking leaves unfurling from stems. Words scale from 0 to 1 with bottom-center origin, featuring non-linear opacity transitions (ease-in-out-quart) and gentle rotation oscillations (-3deg to 3deg). Emphasized words grow faster (500ms) while soft words take longer (1000ms). Includes continuous post-growth sway animation for natural movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'typography',
    'nature',
    'organic',
    'growth',
    'kinetic',
    'leaves',
    'animation',
    'sway',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Nature unfolds',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            id: 'word-1-1',
            text: 'Nature',
            start: 0,
            end: 1.0,
            duration: 1.0,
            absoluteStart: 0,
            absoluteEnd: 1.0,
            confidence: 1.0,
          },
          {
            id: 'word-1-2',
            text: 'unfolds',
            start: 1.0,
            end: 2.5,
            duration: 1.5,
            absoluteStart: 1.0,
            absoluteEnd: 2.5,
            confidence: 1.0,
          },
        ],
        metadata: {
          emphasis: true,
        },
      },
    ],
    font: 'Quicksand:400',
    fontSize: 48,
    textColor: '#2d5016',
    emphasisDuration: 0.5,
    softDuration: 1.0,
    swayDuration: 4,
    containerPadding: 48,
    wordGap: 8,
  },
};

// Export preset
export const NatureTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
