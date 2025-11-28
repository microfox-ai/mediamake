/**
 * Thermal Wave Effect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates rolling heat waves across elements using multiple translateY and skewX animations
 * with staggered timings to simulate thermal currents. The wave starts at the bottom and rolls
 * upward, with skew creating a warping effect. Brightness fluctuation follows the wave pattern,
 * making elements appear to be viewed through rising hot air currents.
 *
 * Features:
 * - Multiple wave cycles with staggered start times for continuous heat wave effect
 * - Sine wave pattern for natural vertical displacement (translateY)
 * - Smooth skewX transformation creating warping/distortion effect
 * - Brightness fluctuation synchronized with wave movement for thermal glow
 * - Spring easing for natural, physics-based thermal movement
 * - Configurable wave height, speed, skew angle, brightness, and wave count
 *
 * Technical Implementation:
 * - Each wave cycle is a separate generic effect with staggered start time
 * - TranslateY follows sine wave pattern (0 → -waveHeight → 0)
 * - SkewX creates distortion (0deg → skewAngle → 0deg)
 * - Brightness adds thermal glow (1 → 1+brightnessBoost → 1)
 * - All animations use spring easing for natural thermal current movement
 *
 * Use cases:
 * - Creating heat haze effects over text or images
 * - Simulating thermal distortion in desert/summer scenes
 * - Adding atmospheric effects to fire-related content
 * - Creating rising hot air visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema for thermal wave effect
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply thermal wave effect to'),
  waveHeight: z
    .number()
    .default(20)
    .describe('Vertical displacement in pixels (how high the wave rises)'),
  waveSpeed: z
    .number()
    .default(1500)
    .describe('Total propagation speed in milliseconds (duration of one complete wave cycle)'),
  skewAngle: z
    .number()
    .default(2)
    .describe('Maximum distortion angle in degrees (warping effect strength)'),
  brightnessBoost: z
    .number()
    .default(0.2)
    .describe('Brightness increase multiplier for thermal glow (0.2 = 20% brighter)'),
  waveCount: z
    .number()
    .int()
    .min(1)
    .default(3)
    .describe('Number of overlapping wave cycles for continuous effect'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetIds,
    waveHeight = 20,
    waveSpeed = 1500,
    skewAngle = 2,
    brightnessBoost = 0.2,
    waveCount = 3,
    effectStart = 0,
  } = params;

  // Convert waveSpeed from milliseconds to seconds
  const waveSpeedSeconds = waveSpeed / 1000;

  // Calculate stagger time between waves
  const staggerTime = waveSpeedSeconds / waveCount;

  // Create array of wave effects with staggered timings
  const waveEffects = Array.from({ length: waveCount }, (_, i) => {
    // Calculate start time for this wave (staggered)
    const waveStart = effectStart + i * staggerTime;

    // Create effect data for this wave cycle
    const effectData: GenericEffectData = {
      type: 'spring',
      start: waveStart,
      duration: waveSpeedSeconds,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // TranslateY - Sine wave pattern (bottom to top)
        { key: 'translateY', val: 0, prog: 0 }, // Start at normal position
        { key: 'translateY', val: -waveHeight / 2, prog: 0.25 }, // Rise to mid-height
        { key: 'translateY', val: -waveHeight, prog: 0.5 }, // Peak height
        { key: 'translateY', val: -waveHeight / 2, prog: 0.75 }, // Fall back to mid-height
        { key: 'translateY', val: 0, prog: 1 }, // Return to normal position

        // SkewX - Warping/distortion effect
        { key: 'skewX', val: 0, prog: 0 }, // No skew at start
        { key: 'skewX', val: skewAngle, prog: 0.33 }, // Max skew right
        { key: 'skewX', val: 0, prog: 0.5 }, // No skew at peak
        { key: 'skewX', val: -skewAngle, prog: 0.67 }, // Max skew left
        { key: 'skewX', val: 0, prog: 1 }, // No skew at end

        // Brightness - Thermal glow following wave
        { key: 'brightness', val: 1, prog: 0 }, // Normal brightness
        { key: 'brightness', val: 1 + brightnessBoost / 2, prog: 0.25 }, // Slight glow
        { key: 'brightness', val: 1 + brightnessBoost, prog: 0.5 }, // Max glow at peak
        { key: 'brightness', val: 1 + brightnessBoost / 2, prog: 0.75 }, // Slight glow
        { key: 'brightness', val: 1, prog: 1 }, // Return to normal
      ],
    };

    // Return complete effect node
    return {
      id: `thermal-wave-${i}-${targetIds.join('-')}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return output with all wave effects in a container
  return {
    output: {
      childrenData: [
        {
          id: 'thermal-wave-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: effectStart + waveSpeedSeconds * 2, // Duration covers all waves
            },
          },
          effects: waveEffects,
          childrenData: [],
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'ThermalWaveEffect',
  title: 'Thermal Wave Effect',
  description:
    'Internal effect preset that creates rolling heat waves across target elements using multiple translateY and skewX animations with staggered timings to simulate thermal currents. Creates a wave that starts at the bottom and rolls upward with brightness fluctuation following the wave pattern, making elements appear to be viewed through rising hot air currents.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'thermal',
    'wave',
    'heat',
    'distortion',
    'warp',
    'haze',
    'generic',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['example-component'],
    waveHeight: 20,
    waveSpeed: 1500,
    skewAngle: 2,
    brightnessBoost: 0.2,
    waveCount: 3,
    effectStart: 0,
  },
};

// Export preset
export const ThermalWaveEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
