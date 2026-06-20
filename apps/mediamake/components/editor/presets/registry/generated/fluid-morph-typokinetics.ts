/**
 * Fluid Morph Typokinetics Preset
 *
 * This preset creates a liquid metal morphing effect where abstract blob shapes
 * transform into readable text. Each letter begins as a uniquely shaped blob
 * (with random border-radius, distorted scale, and rotation) and organically
 * morphs through wiggling, undulating phases before stabilizing into crisp
 * letter forms.
 *
 * Features:
 * - **Blob-to-Letter Morph**: Random initial blob shapes morph into letters
 * - **Organic Motion**: Multi-keyframe animations with wiggle and undulation
 * - **Surface Tension Effect**: Elastic bounce at formation (like water droplets)
 * - **Shine Sweep**: Light sweep effect after letter formation
 * - **Staggered Animation**: Cascading reveal with configurable delay
 * - **Customizable Parameters**: Text, colors, timing, fonts, and intensities
 *
 * Use cases:
 * - Creating liquid metal terminator-style text reveals
 * - Building mercury-forming-into-shapes effects
 * - Adding organic morphing title sequences
 * - Creating sci-fi/futuristic text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('MORPH')
    .describe('Text to display with fluid morph effect'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(120)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:700", "Inter:600:italic", "BebasNeue")',
    ),
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  morphDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of the blob-to-letter morph animation in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.08)
    .describe('Delay between each letter morph in seconds'),
  shineDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .describe('Duration of the shine sweep effect in seconds'),
  shineDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.3)
    .describe('Delay before shine effect starts after morph completes'),
  shineColor: z
    .string()
    .default('rgba(255, 255, 255, 0.6)')
    .describe('Color of the shine sweep effect'),
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Overall effect intensity multiplier (affects wiggle and surface tension)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    font,
    color,
    morphDuration,
    staggerDelay,
    shineDuration,
    shineDelay,
    shineColor,
    intensity,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: { fontWeight?: number; fontStyle?: string } = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  // Helper: Generate random value in range
  const randomRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate seeded random (for consistency)
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Parse font
  const fontFamily = font ? parseFontString(font).fontFamily : 'Inter';
  const fontStyle = font ? parseFontString(font).fontStyle : {};

  // Split text into characters
  const characters = text.split('');

  // Calculate total duration
  const totalDuration =
    characters.length * staggerDelay +
    morphDuration +
    shineDelay +
    shineDuration;

  // Create letter components
  const letterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const letterId = `letter-morph-${index}`;

      // Generate unique random values for this letter (seeded by index)
      const seed = index * 123.456; // Arbitrary seed multiplier
      const randomBlobRadius = 30 + seededRandom(seed) * 40; // 30-70%
      const randomInitialRotation = (seededRandom(seed + 1) - 0.5) * 60; // -30 to +30 degrees
      const randomScaleX = 1.3 + seededRandom(seed + 2) * 0.4; // 1.3-1.7
      const randomScaleY = 0.6 + seededRandom(seed + 3) * 0.3; // 0.6-0.9

      // Apply intensity to wiggle and surface tension
      const wiggleAmount = 3 * intensity;
      const surfaceTensionScale = 0.05 * intensity;

      // Morph effect: blob to letter with organic motion
      const morphEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: morphDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Border-radius: blob -> letter
          { key: 'borderRadius', val: `${randomBlobRadius}%`, prog: 0 },
          {
            key: 'borderRadius',
            val: `${randomBlobRadius * 0.7}%`,
            prog: 0.3,
          },
          {
            key: 'borderRadius',
            val: `${randomBlobRadius * 0.3}%`,
            prog: 0.6,
          },
          { key: 'borderRadius', val: '0%', prog: 0.8 },
          { key: 'borderRadius', val: '0%', prog: 1 },

          // ScaleX: distorted -> surface tension -> stable
          { key: 'scaleX', val: randomScaleX, prog: 0 },
          { key: 'scaleX', val: 1.3, prog: 0.3 },
          { key: 'scaleX', val: 1 + surfaceTensionScale, prog: 0.8 },
          { key: 'scaleX', val: 1 - surfaceTensionScale, prog: 0.9 },
          { key: 'scaleX', val: 1, prog: 1 },

          // ScaleY: distorted -> surface tension -> stable
          { key: 'scaleY', val: randomScaleY, prog: 0 },
          { key: 'scaleY', val: 0.9, prog: 0.3 },
          { key: 'scaleY', val: 1 - surfaceTensionScale, prog: 0.8 },
          { key: 'scaleY', val: 1 + surfaceTensionScale, prog: 0.9 },
          { key: 'scaleY', val: 1, prog: 1 },

          // Rotate: random -> wiggle -> stable
          { key: 'rotate', val: randomInitialRotation, prog: 0 },
          { key: 'rotate', val: randomInitialRotation * 0.5, prog: 0.3 },
          { key: 'rotate', val: wiggleAmount, prog: 0.5 },
          { key: 'rotate', val: -wiggleAmount, prog: 0.7 },
          { key: 'rotate', val: 0, prog: 1 },

          // Opacity: fade in during morph
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Shine effect: light sweep across letter
      const shineEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: morphDuration + shineDelay,
        duration: shineDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Simulate shine with text-shadow or filter
          // Using brightness filter for shine effect
          { key: 'filter', val: 'brightness(1)', prog: 0 },
          { key: 'filter', val: 'brightness(1.5)', prog: 0.5 },
          { key: 'filter', val: 'brightness(1)', prog: 1 },

          // Alternative: Use box-shadow for shine (commented out)
          // { key: 'boxShadow', val: `0 0 0px ${shineColor}`, prog: 0 },
          // { key: 'boxShadow', val: `0 0 20px ${shineColor}`, prog: 0.5 },
          // { key: 'boxShadow', val: `0 0 0px ${shineColor}`, prog: 1 },
        ],
      };

      // Letter wrapper (for positioning and timing)
      const letterWrapper: RenderableComponentData = {
        id: `letter-wrapper-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex items-center justify-center',
            style: {
              width: '1em',
              height: '1.2em',
            },
          },
        },
        context: {
          timing: {
            start: index * staggerDelay,
            duration: morphDuration + shineDelay + shineDuration,
          },
        },
        childrenData: [
          {
            id: letterId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: char,
              style: {
                fontSize: fontSize,
                color: color,
                fontWeight: fontStyle.fontWeight || 'bold',
                fontStyle: fontStyle.fontStyle || 'normal',
                display: 'inline-block',
                position: 'relative',
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['700'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: morphDuration + shineDelay + shineDuration,
              },
            },
            effects: [
              {
                id: `blob-morph-effect-${index}`,
                componentId: 'generic',
                data: morphEffect,
              },
              {
                id: `shine-sweep-effect-${index}`,
                componentId: 'generic',
                data: shineEffect,
              },
            ],
          } as RenderableComponentData,
        ],
      };

      return letterWrapper;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'fluid-morph-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'letters-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center',
            style: {
              gap: '0.05em',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData,
    ],
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
  id: 'fluid-morph-typokinetics',
  title: 'Fluid Morph Typokinetics',
  description:
    'Liquid metal morphing effect where abstract blobs transform into readable text. Each letter begins as a uniquely shaped blob (random border-radius, distorted scale, rotated) and organically morphs through wiggling, undulating phases before stabilizing into crisp letter forms. Features surface tension elastic bounce at formation and a sweeping shine highlight after completion. Inspired by mercury/liquid metal terminator effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'morph',
    'liquid',
    'blob',
    'organic',
    'mercury',
    'terminator',
    'sci-fi',
    'text-reveal',
    'animated-text',
  ],
  defaultInputParams: {
    text: 'MORPH',
    fontSize: 120,
    font: 'Inter:700',
    color: '#FFFFFF',
    morphDuration: 1.5,
    staggerDelay: 0.08,
    shineDuration: 0.5,
    shineDelay: 0.3,
    shineColor: 'rgba(255, 255, 255, 0.6)',
    intensity: 1,
  },
  dependencies: {},
};

// Export preset
export const fluidMorphTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
