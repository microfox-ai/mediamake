/**
 * Degaussing Internal Effect Preset
 *
 * SINGLE EFFECT (returns one generic effect with complex animation ranges)
 *
 * Simulates the magnetic degaussing/demagnetization effect seen when CRT monitors
 * are affected by magnetic fields. This effect combines:
 * - Radial distortion via scale transforms from center point
 * - Color shifts via rotating hue values
 * - Wave-like displacement patterns via rotation
 * - Blur effects that gradually normalize
 *
 * The effect starts with extreme distortion and gradually normalizes through a cycle,
 * mimicking the characteristic degaussing pattern of old CRT monitors.
 *
 * Features:
 * - Complex multi-property animation (scale, rotate, filter)
 * - Progressive keyframe system with non-linear timing
 * - Configurable distortion intensity, cycle duration, and ripple frequency
 * - Transform-origin set to center for radial distortion effect
 * - Ease-out timing for natural deceleration curve
 *
 * Use cases:
 * - Retro/vintage visual effects
 * - Glitch-style transitions
 * - CRT monitor simulations
 * - Abstract video effects
 * - Error/malfunction visual metaphors
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the degaussing effect to'),
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe(
      'Intensity multiplier for distortion effects (0.1 = subtle, 3 = extreme)',
    ),
  cycleDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of the complete degaussing cycle in seconds'),
  rippleFrequency: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe(
      'Frequency of ripple-like rotations (higher = more oscillations)',
    ),
  start: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect (relative to parent timeline)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper to calculate progressive values based on intensity
  const calculateScaleValues = (intensity: number): number[] => {
    const baseDistortion = 0.7; // Extreme shrink at start
    const maxExpansion = 1.3; // Peak expansion
    const normalScale = 1.0;

    return [
      normalScale, // Start normal
      baseDistortion + (1 - intensity) * 0.2, // Initial shrink (less intense = less shrink)
      maxExpansion + (intensity - 1) * 0.2, // Peak expansion (more intense = more expansion)
      normalScale - 0.1 * intensity, // Undershoot
      normalScale + 0.1 * intensity, // Overshoot
      normalScale, // Return to normal
    ];
  };

  const calculateRotationValues = (
    intensity: number,
    frequency: number,
  ): number[] => {
    const baseRotation = 15;
    const multiplier = intensity * frequency;

    return [
      0, // Start
      baseRotation * multiplier * 0.5, // Initial rotation
      -baseRotation * multiplier * 0.67, // Counter-rotation (stronger)
      baseRotation * multiplier * 0.33, // Smaller oscillation
      -baseRotation * multiplier * 0.17, // Final oscillation
      0, // Return to normal
    ];
  };

  const calculateHueRotationValues = (intensity: number): string[] => {
    const maxHue = 180 * intensity;

    return [
      'hue-rotate(0deg) blur(0px)', // Start normal
      `hue-rotate(${maxHue}deg) blur(${3 * intensity}px)`, // Peak distortion with blur
      `hue-rotate(${-maxHue * 0.5}deg) blur(${2 * intensity}px)`, // Reverse color shift
      `hue-rotate(${maxHue * 0.25}deg) blur(${1 * intensity}px)`, // Smaller shift
      'hue-rotate(0deg) blur(0px)', // Return to normal
    ];
  };

  const scaleValues = calculateScaleValues(params.intensity);
  const rotationValues = calculateRotationValues(
    params.intensity,
    params.rippleFrequency,
  );
  const filterValues = calculateHueRotationValues(params.intensity);

  // Construct the generic effect data with progressive keyframes
  const effectData: GenericEffectData = {
    type: 'ease-out', // Natural deceleration curve
    start: params.start,
    duration: params.cycleDuration,
    mode: 'provider', // CRITICAL: Always use provider mode
    targetIds: params.targetIds,
    ranges: [
      // Scale animation - radial distortion from center
      { key: 'scale', val: scaleValues[0], prog: 0 },
      { key: 'scale', val: scaleValues[1], prog: 0.1 },
      { key: 'scale', val: scaleValues[2], prog: 0.2 },
      { key: 'scale', val: scaleValues[3], prog: 0.4 },
      { key: 'scale', val: scaleValues[4], prog: 0.7 },
      { key: 'scale', val: scaleValues[5], prog: 1 },

      // Rotation animation - wave-like displacement
      { key: 'rotate', val: rotationValues[0], prog: 0 },
      { key: 'rotate', val: rotationValues[1], prog: 0.15 },
      { key: 'rotate', val: rotationValues[2], prog: 0.3 },
      { key: 'rotate', val: rotationValues[3], prog: 0.5 },
      { key: 'rotate', val: rotationValues[4], prog: 0.75 },
      { key: 'rotate', val: rotationValues[5], prog: 1 },

      // Filter animation - color shifts and blur
      { key: 'filter', val: filterValues[0], prog: 0 },
      { key: 'filter', val: filterValues[1], prog: 0.2 },
      { key: 'filter', val: filterValues[2], prog: 0.4 },
      { key: 'filter', val: filterValues[3], prog: 0.7 },
      { key: 'filter', val: filterValues[4], prog: 1 },
    ],
  };

  // Create the effect node
  const effect = {
    id: params.effectId || `degaussing-effect-${params.targetIds.join('-')}`,
    componentId: 'generic' as const,
    data: effectData,
  };

  // Return effect wrapped in minimal container structure
  const rootContainer: RenderableComponentData = {
    id: 'degaussing-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 9999,
          transformOrigin: 'center center', // Center point for radial distortion
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.cycleDuration,
      },
    },
    effects: [effect],
    childrenData: [] as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'degaussing-effect',
  title: 'Degaussing Internal Effect',
  description:
    'Internal effect preset that simulates magnetic degaussing/demagnetization seen on CRT monitors. Combines radial distortion, rotating hue shifts, and wave-like displacement. Effect starts with extreme distortion that gradually normalizes through a cycle. Returns effect configuration objects to be applied to target components via the generic effect system. Meant to be called via dependencies by other presets, not used directly as a visual preset.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'degaussing',
    'crt',
    'distortion',
    'glitch',
    'retro',
    'vintage',
    'generic',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true, // Mark as internal-only preset
  _internalPresetOutput: 'effects', // Extract effects from output
  defaultInputParams: {
    targetIds: ['target-component'],
    intensity: 1,
    cycleDuration: 3,
    rippleFrequency: 3,
    start: 0,
  },
};

// --- Export ---

export const degaussingEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
