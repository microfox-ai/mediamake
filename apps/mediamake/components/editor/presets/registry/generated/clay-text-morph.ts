/**
 * Clay Animation Text Morphing Preset
 *
 * This preset creates a clay-inspired stop motion text animation where letters morph from blob shapes
 * using exaggerated squash and stretch principles. Each letter "grows" from a malleable blob with
 * organic deformation effects, compressing when they "land" and stretching when they "jump".
 *
 * Features:
 * - Morphing from blob to letter shape using scaleY/scaleX animations
 * - Elastic easing for organic clay movement (cubic-bezier with overshoot)
 * - 3D depth effect using rotateX transformations
 * - Progressive blur reduction as letters form
 * - Brightness animation to simulate lighting changes
 * - Staggered timing for deliberate molding sequence
 * - Bold, rounded typography to enhance clay aesthetic
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Stop motion style title sequences
 * - Organic, playful text animations
 * - Craft/handmade aesthetic videos
 * - Creative social media content
 * - Brand videos with tactile feel
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to animate with clay morphing effect')
    .default('CLAY'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:800", "Roboto:700")',
    )
    .default('Inter:800'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FF6B35')
    .describe('Color of the text (CSS color value)'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the animation in seconds'),
  totalDuration: z
    .number()
    .min(0.5)
    .default(3)
    .describe('Total duration for the entire animation sequence'),
  morphDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(1.2)
    .describe('Duration of each letter morphing animation in seconds'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.15)
    .describe('Delay between each letter animation start in seconds'),
  elasticIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for elastic easing effect'),
  depthRotation: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Maximum rotation angle for 3D depth effect in degrees'),
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Initial blur amount in pixels as letter forms'),
  brightnessStart: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.3)
    .describe('Starting brightness value (1 = normal)'),
  gap: z
    .number()
    .min(0)
    .max(100)
    .default(12)
    .describe('Gap between letters in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:800';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 800; // Default to bold for clay aesthetic
  }

  // Split text into individual letters
  const letters = params.text.split('');

  // Create child components for each letter
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterWrapperId = `clay-letter-wrapper-${index}`;
      const letterTextId = `clay-letter-text-${index}`;

      // Calculate staggered start time (relative to parent)
      const letterStart = index * params.staggerDelay;

      // Create morph effect for the letter wrapper
      const morphEffect = {
        id: `clay-morph-${index}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier' as const,
          easingParams: [
            0.68,
            -0.55 * params.elasticIntensity,
            0.265,
            1.55 * params.elasticIntensity,
          ],
          start: 0, // Relative to letter wrapper
          duration: params.morphDuration,
          mode: 'provider' as const,
          targetIds: [letterWrapperId],
          ranges: [
            // Squashed blob (start)
            { key: 'scaleY', val: 0.3, prog: 0 },
            { key: 'scaleX', val: 1.5, prog: 0 },
            // Stretched (mid)
            { key: 'scaleY', val: 1.8, prog: 0.5 },
            { key: 'scaleX', val: 0.7, prog: 0.5 },
            // Settled (end)
            { key: 'scaleY', val: 1, prog: 1 },
            { key: 'scaleX', val: 1, prog: 1 },
            // 3D rotation for depth
            { key: 'rotateX', val: -params.depthRotation, prog: 0 },
            { key: 'rotateX', val: params.depthRotation, prog: 0.5 },
            { key: 'rotateX', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Create blur effect for the letter text
      const blurEffect = {
        id: `clay-blur-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0, // Relative to letter wrapper
          duration: params.morphDuration,
          mode: 'provider' as const,
          targetIds: [letterTextId],
          ranges: [
            { key: 'filter:blur', val: params.blurAmount, prog: 0 },
            { key: 'filter:blur', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Create brightness effect for the letter text
      const brightnessEffect = {
        id: `clay-brightness-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0, // Relative to letter wrapper
          duration: params.morphDuration,
          mode: 'provider' as const,
          targetIds: [letterTextId],
          ranges: [
            { key: 'filter:brightness', val: params.brightnessStart, prog: 0 },
            { key: 'filter:brightness', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Letter wrapper layout (individual letter container)
      const letterWrapper: RenderableComponentData = {
        id: letterWrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'transform-gpu',
            style: {
              perspective: '200px',
              transformStyle: 'preserve-3d' as const,
            },
          },
        },
        context: {
          timing: {
            start: letterStart, // Staggered start relative to parent
            duration: params.morphDuration + 0.5, // Slightly longer than effect
          },
        },
        effects: [morphEffect],
        childrenData: [
          {
            id: letterTextId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: letter,
              style: {
                fontSize: `${params.fontSize}px`,
                fontWeight: fontStyle.fontWeight || 800,
                fontStyle: fontStyle.fontStyle,
                color: params.textColor,
                textShadow: '0 4px 8px rgba(0,0,0,0.3)',
              } as React.CSSProperties,
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['800'],
                subsets: ['latin'],
                preload: true,
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0, // Relative to letter wrapper
                duration: params.morphDuration + 0.5,
              },
            },
            effects: [blurEffect, brightnessEffect],
          },
        ],
      };

      return letterWrapper;
    },
  );

  // Root container for all letters
  const rootContainer: RenderableComponentData = {
    id: 'clay-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center transform-gpu',
        style: {
          transformStyle: 'preserve-3d' as const,
          width: '100%',
          height: '100%',
          gap: `${params.gap}px`,
        },
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: params.totalDuration,
      },
    },
    childrenData: letterComponents,
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
  id: 'clay-text-morph',
  title: 'Clay Animation Text Morphing',
  description:
    'Clay-inspired stop motion text animation where letters morph from blob shapes using squash and stretch principles. Each letter grows from a malleable blob with exaggerated deformations, compressing on landing and stretching when jumping. Features elastic easing, 3D depth effects, and progressive blur reduction to simulate organic clay forming.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'clay',
    'stop-motion',
    'morph',
    'squash-stretch',
    'organic',
    'kinetic',
    '3d',
    'elastic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'CLAY',
    font: 'Inter:800',
    fontSize: 72,
    textColor: '#FF6B35',
    startTime: 0,
    totalDuration: 3,
    morphDuration: 1.2,
    staggerDelay: 0.15,
    elasticIntensity: 1,
    depthRotation: 5,
    blurAmount: 2,
    brightnessStart: 1.3,
    gap: 12,
  },
};

// Export preset
export const clayTextMorphPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
