/**
 * DirectionalFade Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates opacity transitions with directional blur and motion. The fade appears to come from
 * or go towards a specific direction (top, bottom, left, right, or diagonal), combining opacity
 * changes with subtle directional movement and motion blur.
 *
 * Features:
 * - 8 directions supported: top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight
 * - Synchronized opacity, transform, and blur animations
 * - Configurable fade distance (how far elements move during transition)
 * - Directional motion blur along movement vector
 * - Acceleration curve control (ease-in, ease-out, ease-in-out, linear)
 * - Optional reverse direction for fade-out
 * - Cinematic motion blur effect during transitions
 *
 * Use cases:
 * - Creating cinematic fade transitions with directional movement
 * - Adding motion blur effects to entrance/exit animations
 * - Building dynamic transitions with combined opacity and transform
 * - Creating directional reveals and dismissals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of the components to apply the directional fade effect'),
  duration: z
    .number()
    .default(1.5)
    .optional()
    .describe('Duration of the fade transition in seconds'),
  direction: z
    .enum([
      'top',
      'bottom',
      'left',
      'right',
      'topLeft',
      'topRight',
      'bottomLeft',
      'bottomRight',
    ])
    .default('right')
    .optional()
    .describe('Direction from which the fade originates or moves towards'),
  fadeDistance: z
    .number()
    .default(50)
    .optional()
    .describe('Distance elements move during fade (in pixels)'),
  blurIntensity: z
    .number()
    .default(10)
    .optional()
    .describe('Intensity of motion blur along movement axis (in pixels)'),
  accelerationCurve: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-in-out')
    .optional()
    .describe('Acceleration curve for the transform animation'),
  reverseOnFadeOut: z
    .boolean()
    .default(false)
    .optional()
    .describe('Whether to reverse the direction for fade-out'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate direction vectors
  const getDirectionVector = (
    direction: string,
  ): { x: number; y: number } => {
    const sqrt2 = Math.sqrt(2);
    switch (direction) {
      case 'top':
        return { x: 0, y: -1 };
      case 'bottom':
        return { x: 0, y: 1 };
      case 'left':
        return { x: -1, y: 0 };
      case 'right':
        return { x: 1, y: 0 };
      case 'topLeft':
        return { x: -1 / sqrt2, y: -1 / sqrt2 };
      case 'topRight':
        return { x: 1 / sqrt2, y: -1 / sqrt2 };
      case 'bottomLeft':
        return { x: -1 / sqrt2, y: 1 / sqrt2 };
      case 'bottomRight':
        return { x: 1 / sqrt2, y: 1 / sqrt2 };
      default:
        return { x: 1, y: 0 };
    }
  };

  const direction = params.direction ?? 'right';
  const fadeDistance = params.fadeDistance ?? 50;
  const blurIntensity = params.blurIntensity ?? 10;
  const duration = params.duration ?? 1.5;
  const accelerationCurve = params.accelerationCurve ?? 'ease-in-out';
  const reverseOnFadeOut = params.reverseOnFadeOut ?? false;

  const dirVector = getDirectionVector(direction);
  const translateXStart = dirVector.x * fadeDistance;
  const translateYStart = dirVector.y * fadeDistance;

  // Reverse direction if needed
  const translateXEnd = reverseOnFadeOut ? -translateXStart : 0;
  const translateYEnd = reverseOnFadeOut ? -translateYStart : 0;

  // Opacity keyframes: fade in → hold → fade out
  const opacityRanges = [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 0.7, prog: 0.3 },
    { key: 'opacity', val: 1, prog: 0.5 },
    { key: 'opacity', val: 0.7, prog: 0.7 },
    { key: 'opacity', val: 0, prog: 1 },
  ];

  // Transform keyframes: move from start position to end position
  const transformRanges = [
    { key: 'translateX', val: translateXStart, prog: 0 },
    { key: 'translateX', val: translateXEnd, prog: 1 },
    { key: 'translateY', val: translateYStart, prog: 0 },
    { key: 'translateY', val: translateYEnd, prog: 1 },
  ];

  // Blur keyframes: blur increases during motion, decreases at rest
  const blurRanges = [
    { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0 },
    { key: 'filter', val: `blur(${blurIntensity * 0.3}px)`, prog: 0.3 },
    { key: 'filter', val: 'blur(0px)', prog: 0.5 },
    { key: 'filter', val: `blur(${blurIntensity * 0.3}px)`, prog: 0.7 },
    { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 1 },
  ];

  // Create three synchronized effects: opacity, transform, blur
  const opacityEffect = {
    id: `directional-fade-opacity-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: opacityRanges,
    } as GenericEffectData,
  };

  const transformEffect = {
    id: `directional-fade-transform-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: accelerationCurve,
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: transformRanges,
    } as GenericEffectData,
  };

  const blurEffect = {
    id: `directional-fade-blur-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: blurRanges,
    } as GenericEffectData,
  };

  // Return all three effects in a container structure
  return {
    output: {
      childrenData: [
        {
          id: 'directional-fade-effect-container',
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
              duration: duration,
            },
          },
          effects: [opacityEffect, transformEffect, blurEffect],
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'directional-fade-effect',
  title: 'DirectionalFade',
  description:
    'Internal effect preset that creates opacity transitions with directional blur and motion. Combines opacity changes with translateX/Y transforms and motion blur along the movement vector. Supports 8 directions (top, bottom, left, right, and 4 diagonals) with configurable fade distance, blur intensity, acceleration curves, and reverse-on-fade-out option for cinematic motion blur transitions.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'fade', 'motion-blur', 'directional', 'transform'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    duration: 1.5,
    direction: 'right',
    fadeDistance: 50,
    blurIntensity: 10,
    accelerationCurve: 'ease-in-out',
    reverseOnFadeOut: false,
  },
};

export const directionalFadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
