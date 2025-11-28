/**
 * Fluid Vortex Typography Preset
 *
 * This preset creates a stunning fluid vortex typography effect where letters emerge from
 * swirling metallic liquid pools. Each character spins up from a central vortex point,
 * maintaining fluid dynamics as it rises and solidifies into elegant serif forms.
 *
 * Key Features:
 * - Letters spin up from vortex with 720deg rotation and scale animations
 * - Metallic gradient transition from liquid silver to polished platinum
 * - Centrifugal force effects with horizontal stretching at peak motion
 * - Rotational motion blur during spin using layered text-shadow
 * - Staggered timing for sequential letter emergence
 * - Elastic snap-back effect for natural motion
 *
 * Technical Implementation:
 * - Uses BaseLayout container with flex layout for letter positioning
 * - Each letter wrapped in animated container with dual gradient layers
 * - Liquid gradient layer fades out as solid gradient layer fades in
 * - Generic effects for spiral motion, stretch, gradient crossfade, and blur
 * - Transform origin set to center bottom for natural spin axis
 *
 * Use Cases:
 * - Dramatic title reveals with liquid metal aesthetics
 * - Luxury brand typography animations
 * - Music video title sequences with kinetic energy
 * - High-impact social media content intros
 * - Premium product launch videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with vortex emergence animation'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size for letters in pixels'),
  fontFamily: z
    .string()
    .default('Baskerville')
    .describe('Font family for text (e.g., "Baskerville:600:normal")'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration for each letter animation in seconds'),
  staggerDelay: z
    .number()
    .default(0.2)
    .describe('Delay between each letter animation in seconds'),
  rotationDegrees: z
    .number()
    .default(720)
    .describe('Total rotation degrees during spin (default: 720)'),
  centrifugalStretch: z
    .number()
    .default(1.3)
    .describe('Horizontal scale factor at peak centrifugal force'),
  liquidGradient: z
    .string()
    .default('linear-gradient(to bottom right, #9ca3af, #e5e7eb, #ffffff)')
    .describe('CSS gradient for liquid silver phase'),
  solidGradient: z
    .string()
    .default('linear-gradient(to bottom right, #f4f4f5, #ffffff, #f4f4f5)')
    .describe('CSS gradient for polished platinum phase'),
  backgroundColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background color for the scene'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    transitionDuration,
    staggerDelay,
    rotationDegrees,
    centrifugalStretch,
    liquidGradient,
    solidGradient,
    backgroundColor,
  } = params;

  // Helper function to parse font string
  const parseFontString = (fontStr: string) => {
    const parts = fontStr.split(':');
    const family = parts[0] || 'Baskerville';
    const weight = parts[1] || '600';
    const style = parts[2] || 'normal';
    return { family, weight, style };
  };

  const { family: parsedFamily, weight, style } = parseFontString(fontFamily);

  // Split text into characters
  const characters = text.split('');
  const letterCount = characters.length;

  // Calculate total animation duration including stagger
  const totalAnimationDuration =
    letterCount * staggerDelay + transitionDuration;

  // Create letter components with dual gradient layers
  const letterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const letterWrapperId = `letter-wrapper-${index}`;
      const liquidLayerId = `liquid-layer-${index}`;
      const solidLayerId = `solid-layer-${index}`;

      // Calculate timing
      const letterStartTime = index * staggerDelay;

      // Effect 1: Spiral emergence (rotation + scale + translateY)
      const spiralEffect: GenericEffectData = {
        type: 'ease-out',
        start: letterStartTime,
        duration: transitionDuration * 0.8, // 0-1.2s relative
        mode: 'provider',
        targetIds: [letterWrapperId],
        ranges: [
          // Rotation: 720deg to 0deg
          { key: 'rotate', val: rotationDegrees, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
          // Scale: 0 to 1.2 to 1
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.7 },
          { key: 'scale', val: 1, prog: 1 },
          // TranslateY: 100px to -20px to 0
          { key: 'translateY', val: 100, prog: 0 },
          { key: 'translateY', val: -20, prog: 0.7 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      // Effect 2: Centrifugal stretch (scaleX oscillation)
      const stretchEffect: GenericEffectData = {
        type: 'spring',
        start: letterStartTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [letterWrapperId],
        ranges: [
          { key: 'scaleX', val: 1, prog: 0 },
          { key: 'scaleX', val: centrifugalStretch, prog: 0.6 }, // Peak at 60%
          { key: 'scaleX', val: 1, prog: 1 }, // Snap back
        ],
      };

      // Effect 3: Liquid gradient fade out
      const liquidFadeEffect: GenericEffectData = {
        type: 'ease-in',
        start: letterStartTime + transitionDuration * 0.53, // 0.8s relative
        duration: transitionDuration * 0.47, // 0.7s duration
        mode: 'provider',
        targetIds: [liquidLayerId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      // Effect 4: Solid gradient fade in
      const solidFadeEffect: GenericEffectData = {
        type: 'ease-out',
        start: letterStartTime + transitionDuration * 0.53, // 0.8s relative
        duration: transitionDuration * 0.47, // 0.7s duration
        mode: 'provider',
        targetIds: [solidLayerId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Effect 5: Motion blur during spin (using filter blur)
      const blurEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: letterStartTime,
        duration: transitionDuration * 0.67, // 0-1.0s
        mode: 'provider',
        targetIds: [letterWrapperId],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(4px)', prog: 0.5 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      };

      // Create letter wrapper with both gradient layers
      const letterWrapper: RenderableComponentData = {
        id: letterWrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex items-center justify-center',
            style: {
              transformOrigin: 'center bottom',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `spiral-${index}`,
            componentId: 'generic',
            data: spiralEffect,
          },
          {
            id: `stretch-${index}`,
            componentId: 'generic',
            data: stretchEffect,
          },
          {
            id: `blur-${index}`,
            componentId: 'generic',
            data: blurEffect,
          },
        ],
        childrenData: [
          // Liquid gradient layer
          {
            id: liquidLayerId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: char,
              style: {
                fontSize: fontSize,
                fontWeight: parseInt(weight, 10),
                fontStyle: style as 'normal' | 'italic',
                transformOrigin: 'center bottom',
              },
              font: {
                family: parsedFamily,
                weights: [weight],
              },
              gradient: liquidGradient,
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              {
                id: `liquid-fade-${index}`,
                componentId: 'generic',
                data: liquidFadeEffect,
              },
            ],
          } as RenderableComponentData,
          // Solid gradient layer
          {
            id: solidLayerId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: char,
              style: {
                fontSize: fontSize,
                fontWeight: parseInt(weight, 10),
                fontStyle: style as 'normal' | 'italic',
                transformOrigin: 'center bottom',
                position: 'absolute' as const,
                top: 0,
                left: 0,
                opacity: 0,
              },
              font: {
                family: parsedFamily,
                weights: [weight],
              },
              gradient: solidGradient,
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              {
                id: `solid-fade-${index}`,
                componentId: 'generic',
                data: solidFadeEffect,
              },
            ],
          } as RenderableComponentData,
        ],
      };

      return letterWrapper;
    },
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'fluid-vortex-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center min-h-screen',
        style: {
          backgroundColor: backgroundColor,
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'vortex-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex items-center justify-center',
            style: {
              gap: '0px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData,
    ],
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
  id: 'fluid-vortex-typography',
  title: 'Fluid Vortex Typography',
  description:
    'Letters emerge from swirling metallic liquid pools with spiral vortex animations. Characters spin up from central vortex points, transitioning from liquid silver to polished platinum as they solidify into elegant serif forms. Features centrifugal stretch effects and metallic gradient crossfades.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'vortex',
    'fluid',
    'metallic',
    'liquid',
    'spiral',
    'kinetic',
    'luxury',
    'animated',
    'gradient',
    'centrifugal',
    'motion-blur',
  ],
  defaultInputParams: {
    text: 'VORTEX',
    duration: 5,
    fontSize: 120,
    fontFamily: 'Baskerville:600:normal',
    transitionDuration: 1.5,
    staggerDelay: 0.2,
    rotationDegrees: 720,
    centrifugalStretch: 1.3,
    liquidGradient:
      'linear-gradient(to bottom right, #9ca3af, #e5e7eb, #ffffff)',
    solidGradient:
      'linear-gradient(to bottom right, #f4f4f5, #ffffff, #f4f4f5)',
    backgroundColor: '#0a0a0a',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const fluidVortexTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
