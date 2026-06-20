/**
 * Flat Cutout Reveal Effect
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset generates generic clip-path animations that simulate
 * flat shape cutouts being lifted away or cut with scissors. Supports circle, rect,
 * and polygon shapes with directional reveals (top, bottom, left, right, center).
 *
 * The effect creates geometric reveals using CSS clip-path polygon() for maximum
 * flexibility. Each shape is animated from full coverage (prog: 0) to no coverage
 * (prog: 1), with easing options that mimic physical paper movement characteristics.
 *
 * Use cases:
 * - Revealing content underneath with paper cutout effects
 * - Creating geometric transitions with physical paper-like feel
 * - Peeling away or cutting out shapes to reveal content
 * - Adding organic, scissors-like reveal animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the reveal effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the reveal animation in seconds'),
  shape: z
    .enum(['circle', 'rect', 'polygon'])
    .default('rect')
    .describe(
      'Shape type for the cutout reveal (circle, rect, or polygon)',
    ),
  direction: z
    .enum(['top', 'bottom', 'left', 'right', 'center'])
    .default('center')
    .describe('Direction from which the reveal peels away'),
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .describe('Easing function that mimics physical paper movement'),
  delay: z
    .number()
    .default(0)
    .describe('Delay before the effect starts (in seconds)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for identification'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Generate clip-path polygon points based on shape and direction
  const generateClipPathKeyframes = (
    shape: string,
    direction: string,
  ): Array<{ val: string; prog: number }> => {
    // Helper to create polygon clip-path string
    const polygon = (points: string) => `polygon(${points})`;

    if (shape === 'circle') {
      // Circle reveal using inset with border-radius approach via polygon approximation
      switch (direction) {
        case 'center':
          return [
            { val: polygon('50% 50%, 50% 50%, 50% 50%, 50% 50%'), prog: 0 }, // Collapsed at center
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            }, // Full reveal
          ];
        case 'top':
          return [
            { val: polygon('50% 0%, 50% 0%, 50% 0%, 50% 0%'), prog: 0 },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
        case 'bottom':
          return [
            {
              val: polygon(
                '50% 100%, 50% 100%, 50% 100%, 50% 100%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
        case 'left':
          return [
            { val: polygon('0% 50%, 0% 50%, 0% 50%, 0% 50%'), prog: 0 },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
        case 'right':
          return [
            {
              val: polygon(
                '100% 50%, 100% 50%, 100% 50%, 100% 50%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
        default:
          return [
            { val: polygon('50% 50%, 50% 50%, 50% 50%, 50% 50%'), prog: 0 },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
      }
    }

    if (shape === 'rect') {
      // Rectangle reveal - peels away from specified direction
      switch (direction) {
        case 'top':
          return [
            { val: polygon('0% 0%, 100% 0%, 100% 0%, 0% 0%'), prog: 0 }, // Collapsed at top
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            }, // Full reveal
          ];
        case 'bottom':
          return [
            {
              val: polygon(
                '0% 100%, 100% 100%, 100% 100%, 0% 100%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
        case 'left':
          return [
            { val: polygon('0% 0%, 0% 0%, 0% 100%, 0% 100%'), prog: 0 },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
        case 'right':
          return [
            {
              val: polygon(
                '100% 0%, 100% 0%, 100% 100%, 100% 100%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
        case 'center':
          return [
            {
              val: polygon(
                '50% 50%, 50% 50%, 50% 50%, 50% 50%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
        default:
          return [
            { val: polygon('0% 0%, 100% 0%, 100% 0%, 0% 0%'), prog: 0 },
            {
              val: polygon(
                '0% 0%, 100% 0%, 100% 100%, 0% 100%',
              ),
              prog: 1,
            },
          ];
      }
    }

    if (shape === 'polygon') {
      // Polygon (hexagon-like) reveal with organic edges
      switch (direction) {
        case 'top':
          return [
            {
              val: polygon(
                '50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%',
              ),
              prog: 1,
            },
          ];
        case 'bottom':
          return [
            {
              val: polygon(
                '50% 100%, 50% 100%, 50% 100%, 50% 100%, 50% 100%, 50% 100%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%',
              ),
              prog: 1,
            },
          ];
        case 'left':
          return [
            {
              val: polygon(
                '0% 50%, 0% 50%, 0% 50%, 0% 50%, 0% 50%, 0% 50%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%',
              ),
              prog: 1,
            },
          ];
        case 'right':
          return [
            {
              val: polygon(
                '100% 50%, 100% 50%, 100% 50%, 100% 50%, 100% 50%, 100% 50%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%',
              ),
              prog: 1,
            },
          ];
        case 'center':
          return [
            {
              val: polygon(
                '50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%',
              ),
              prog: 1,
            },
          ];
        default:
          return [
            {
              val: polygon(
                '50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%',
              ),
              prog: 0,
            },
            {
              val: polygon(
                '50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%',
              ),
              prog: 1,
            },
          ];
      }
    }

    // Fallback: full rect reveal
    return [
      { val: polygon('50% 50%, 50% 50%, 50% 50%, 50% 50%'), prog: 0 },
      {
        val: polygon('0% 0%, 100% 0%, 100% 100%, 0% 100%'),
        prog: 1,
      },
    ];
  };

  // Generate clip-path animation ranges
  const clipPathRanges = generateClipPathKeyframes(
    params.shape,
    params.direction,
  );

  // Create effect data
  const effectData: GenericEffectData = {
    type: params.easing,
    start: params.effectStart + params.delay,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: clipPathRanges.map((keyframe) => ({
      key: 'clipPath',
      val: keyframe.val,
      prog: keyframe.prog,
    })),
  };

  // Create effect object
  const effect = {
    id:
      params.effectId ||
      `flat-cutout-reveal-${params.shape}-${params.direction}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'flat-cutout-reveal-container',
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
        duration: 10,
      },
    },
    effects: [effect],
    childrenData: [],
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

const presetMetadata: PresetMetadata = {
  id: 'flatCutoutReveal',
  title: 'Flat Cutout Reveal Effect',
  description:
    'Internal effect preset that animates flat shape cutout layers to reveal content underneath using CSS clip-path animations. Creates geometric reveals with polygon points for smooth transitions - like paper cutouts being lifted away or cut with scissors.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'reveal',
    'clip-path',
    'geometric',
    'cutout',
    'paper',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component-1'],
    effectStart: 0,
    effectDuration: 1.5,
    shape: 'rect',
    direction: 'center',
    easing: 'ease-out',
    delay: 0,
  },
};

export const flatCutoutRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
