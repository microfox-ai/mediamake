/**
 * Magnetic Distortion Internal Effect
 *
 * SINGLE EFFECT (generic type):
 * Simulates VHS magnetic interference with asymmetric scaling, rotation wobble, 
 * and hue-rotate filter animation. Creates a breathing distortion effect with 
 * spring-based organic movement that warps in and out like a magnetic field.
 *
 * Features:
 * - Asymmetric scaling (scaleX different from scaleY) for organic warping
 * - Subtle rotation oscillation for magnetic wobble effect
 * - Hue-rotate filter animation for color shift interference
 * - Spring easing for natural, organic movement
 * - Configurable distortion strength, wobble speed, and color shift
 *
 * Technical Implementation:
 * - Effect type: generic (AnimationRange[])
 * - Properties animated: scaleX, scaleY, rotate, filter (hue-rotate)
 * - Mode: provider (targets specific component IDs)
 * - Timing: Relative to parent component timeline
 *
 * Use cases:
 * - VHS tape distortion effects
 * - Magnetic interference simulation
 * - Retro video glitch effects
 * - Organic breathing animations
 * - Analog media emulation
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the magnetic distortion effect to'),
  
  delay: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Delay before effect starts (seconds, relative to parent timeline)'),
  
  duration: z
    .number()
    .min(0.5)
    .default(3)
    .optional()
    .describe('Duration of the distortion breathing cycle (seconds)'),
  
  strength: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Distortion strength multiplier (0.1-2, affects scale and rotation intensity)'),
  
  wobbleSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Wobble speed multiplier (0.5-3, affects rotation oscillation timing)'),
  
  colorShift: z
    .number()
    .min(0)
    .max(50)
    .default(15)
    .describe('Color shift amount in degrees (0-50, hue-rotate filter strength)'),
  
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const targetIds = params.targetIds;
  const delay = params.delay ?? 0;
  const duration = params.duration ?? 3;
  const strength = params.strength ?? 1;
  const wobbleSpeed = params.wobbleSpeed ?? 1;
  const colorShift = params.colorShift ?? 15;
  const effectId = params.effectId || `magnetic-distortion-${targetIds.join('-')}`;

  // Calculate keyframe values based on strength
  // Asymmetric scaling creates the "breathing" warp effect
  const scaleXValues = [
    1,                          // Start: normal
    1 + (0.05 * strength),      // 25%: expand horizontal
    1 - (0.02 * strength),      // 50%: compress horizontal
    1 + (0.02 * strength),      // 75%: expand slightly
    1,                          // End: normal
  ];

  const scaleYValues = [
    1,                          // Start: normal
    1 - (0.03 * strength),      // 25%: compress vertical (opposite of X)
    1 + (0.03 * strength),      // 50%: expand vertical (opposite of X)
    1 - (0.01 * strength),      // 75%: compress slightly
    1,                          // End: normal
  ];

  // Rotation wobble creates magnetic field oscillation
  // Adjusted timing based on wobbleSpeed
  const rotateValues = [
    0,                          // Start: no rotation
    -2 * strength,              // 20%: tilt left
    3 * strength,               // 50%: tilt right (more)
    -1 * strength,              // 80%: tilt left (less)
    0,                          // End: no rotation
  ];

  // Rotation keyframe positions adjusted by wobbleSpeed
  const rotateProgress = [
    0,
    0.2 / wobbleSpeed,
    0.5,
    0.8 / wobbleSpeed,
    1,
  ].map(p => Math.min(1, Math.max(0, p))); // Clamp between 0-1

  // Hue-rotate filter for color shift interference
  const hueRotateValues = [
    'hue-rotate(0deg)',
    `hue-rotate(${colorShift}deg)`,
    `hue-rotate(-${colorShift * 0.67}deg)`,
    'hue-rotate(0deg)',
  ];

  // Construct effect data with spring easing for organic movement
  const effectData: GenericEffectData = {
    type: 'spring',
    start: delay,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Asymmetric scaleX animation
      { key: 'scaleX', val: scaleXValues[0], prog: 0 },
      { key: 'scaleX', val: scaleXValues[1], prog: 0.25 },
      { key: 'scaleX', val: scaleXValues[2], prog: 0.5 },
      { key: 'scaleX', val: scaleXValues[3], prog: 0.75 },
      { key: 'scaleX', val: scaleXValues[4], prog: 1 },

      // Asymmetric scaleY animation (inverse pattern)
      { key: 'scaleY', val: scaleYValues[0], prog: 0 },
      { key: 'scaleY', val: scaleYValues[1], prog: 0.25 },
      { key: 'scaleY', val: scaleYValues[2], prog: 0.5 },
      { key: 'scaleY', val: scaleYValues[3], prog: 0.75 },
      { key: 'scaleY', val: scaleYValues[4], prog: 1 },

      // Rotation wobble with speed adjustment
      { key: 'rotate', val: rotateValues[0], prog: rotateProgress[0] },
      { key: 'rotate', val: rotateValues[1], prog: rotateProgress[1] },
      { key: 'rotate', val: rotateValues[2], prog: rotateProgress[2] },
      { key: 'rotate', val: rotateValues[3], prog: rotateProgress[3] },
      { key: 'rotate', val: rotateValues[4], prog: rotateProgress[4] },

      // Hue-rotate color shift
      { key: 'filter', val: hueRotateValues[0], prog: 0 },
      { key: 'filter', val: hueRotateValues[1], prog: 0.33 },
      { key: 'filter', val: hueRotateValues[2], prog: 0.66 },
      { key: 'filter', val: hueRotateValues[3], prog: 1 },
    ],
  };

  // Create the effect node
  const magneticDistortionEffect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'magnetic-distortion-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + delay,
      },
    },
    effects: [magneticDistortionEffect],
    childrenData: [] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: [magneticDistortionEffect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'magneticDistortion',
  title: 'Magnetic Distortion Effect',
  description:
    'Internal effect that simulates VHS magnetic interference with asymmetric scaling, rotation wobble, and hue shifts. Creates a breathing distortion effect with spring-based organic movement.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'distortion', 'vhs', 'magnetic', 'glitch', 'retro', 'warp', 'breathing'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['example-component'],
    delay: 0,
    duration: 3,
    strength: 1,
    wobbleSpeed: 1,
    colorShift: 15,
  },
};

// --- Export ---

export const magneticDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
