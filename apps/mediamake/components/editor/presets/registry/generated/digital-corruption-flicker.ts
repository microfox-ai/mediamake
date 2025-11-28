/**
 * Digital Corruption Flicker Effect Preset
 *
 * SINGLE EFFECT:
 * Simulates data corruption through rapid opacity and color channel manipulation.
 * Creates a stuttering, malfunctioning appearance by animating opacity with irregular keyframes
 * (at progress points: 0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.85, 1.0) combined with RGB channel shifts
 * using CSS filters (hue-rotate and saturate). Uses spring easing for abrupt, mechanical movements.
 *
 * Parameters:
 * - glitchIntensity (0-1): Controls the severity of the corruption effect
 * - duration (ms): Duration of the glitch effect
 * - colorShift (boolean): Whether to apply RGB channel shifts via hue-rotate and saturate filters
 * - targetIds: Array of component IDs to apply the effect to
 *
 * Usage:
 * Apply to any component type (text, video, or image) via targetIds array.
 * The effect will create a digital malfunction appearance with irregular opacity stuttering
 * and optional color channel corruption.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  glitchIntensity: z
    .number()
    .min(0)
    .max(1)
    .describe('Intensity of the glitch effect (0 = subtle, 1 = extreme)'),
  duration: z
    .number()
    .describe('Duration of the glitch effect in milliseconds'),
  colorShift: z
    .boolean()
    .describe('Whether to apply RGB channel shifts using CSS filters'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the generated effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { glitchIntensity, duration, colorShift, targetIds, effectId } = params;

  // Calculate opacity values based on glitch intensity
  // Higher intensity = more extreme opacity changes (closer to 0)
  // Lower intensity = more subtle opacity changes (closer to 1)
  const calculateOpacity = (baseValue: number): number => {
    if (baseValue === 1) return 1; // Always return to full opacity at end
    if (baseValue === 0) return glitchIntensity * 0.2; // Near-zero during glitches
    // For intermediate values, interpolate based on intensity
    return 1 - glitchIntensity * (1 - baseValue);
  };

  // Irregular opacity keyframes at specific progress points
  const opacityRanges = [
    { key: 'opacity', val: calculateOpacity(1), prog: 0 }, // Start visible
    { key: 'opacity', val: calculateOpacity(0.2), prog: 0.15 }, // First corruption
    { key: 'opacity', val: calculateOpacity(0.9), prog: 0.3 }, // Brief recovery
    { key: 'opacity', val: calculateOpacity(0), prog: 0.45 }, // Complete dropout
    { key: 'opacity', val: calculateOpacity(1), prog: 0.6 }, // Restore
    { key: 'opacity', val: calculateOpacity(0.75), prog: 0.75 }, // Minor glitch
    { key: 'opacity', val: calculateOpacity(0.85), prog: 0.85 }, // Stabilizing
    { key: 'opacity', val: 1, prog: 1 }, // Full restoration
  ];

  // Calculate filter values based on intensity and color shift setting
  const calculateHueRotate = (baseDegrees: number): string => {
    if (!colorShift) return 'hue-rotate(0deg)';
    return `hue-rotate(${baseDegrees * glitchIntensity}deg)`;
  };

  const calculateSaturate = (baseValue: number): string => {
    if (!colorShift) return 'saturate(1)';
    return `saturate(${1 + (baseValue - 1) * glitchIntensity})`;
  };

  // Combine hue-rotate and saturate for RGB channel corruption
  const createFilterValue = (hueDeg: number, saturateVal: number): string => {
    if (!colorShift) return 'none';
    return `${calculateHueRotate(hueDeg)} ${calculateSaturate(saturateVal)}`;
  };

  // Color shift keyframes (synchronized with opacity for coherent corruption)
  const filterRanges = [
    { key: 'filter', val: createFilterValue(0, 1), prog: 0 },
    { key: 'filter', val: createFilterValue(30, 1.5), prog: 0.15 }, // Red/cyan shift
    { key: 'filter', val: createFilterValue(-15, 0.8), prog: 0.3 }, // Blue shift
    { key: 'filter', val: createFilterValue(60, 2.0), prog: 0.45 }, // Extreme shift
    { key: 'filter', val: createFilterValue(0, 1), prog: 0.6 }, // Restore
    { key: 'filter', val: createFilterValue(15, 1.2), prog: 0.75 }, // Minor shift
    { key: 'filter', val: createFilterValue(5, 1.05), prog: 0.85 }, // Subtle shift
    { key: 'filter', val: createFilterValue(0, 1), prog: 1 }, // Full restore
  ];

  // Combine all animation ranges
  const ranges = [...opacityRanges, ...filterRanges];

  // Convert duration from milliseconds to seconds
  const durationInSeconds = duration / 1000;

  // Construct generic effect data
  const effectData: GenericEffectData = {
    type: 'spring', // Spring easing for abrupt, mechanical movements
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  // Create effect node
  const effect = {
    id: effectId || `digital-corruption-flicker-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in standard container structure
  return {
    output: {
      childrenData: [
        {
          id: 'digital-corruption-flicker-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'hidden', // Container is not visible, only effects matter
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Placeholder duration for container
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'digital-corruption-flicker',
  title: 'Digital Corruption Flicker Effect',
  description:
    'An internal effect preset that simulates data corruption through rapid opacity and color channel manipulation. Creates a stuttering, malfunctioning appearance by animating opacity with irregular keyframes combined with RGB channel shifts using CSS filters. Designed to work on any component type (text, video, or image) via targetIds.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'corruption', 'opacity', 'filter', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    glitchIntensity: 0.7,
    duration: 500,
    colorShift: true,
    targetIds: ['target-component'],
  },
};

// Export preset
export const digitalCorruptionFlickerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
