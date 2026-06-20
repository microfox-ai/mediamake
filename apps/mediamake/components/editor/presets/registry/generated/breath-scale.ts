/**
 * Breath Scale Internal Effect Preset
 *
 * SINGLE EFFECT:
 * This internal effect preset simulates organic breathing motion through rhythmic scale oscillation.
 * It creates living, dynamic motion using sine-wave interpolation with customizable breathing rate,
 * amplitude, and phase offset for desynchronized multi-element animations.
 *
 * Features:
 * - Sine-wave-based scale animation with configurable cycles
 * - Customizable amplitude for breathing depth (0.97-1.03 default range)
 * - Phase offset parameter to desynchronize multiple elements
 * - 20 evenly-spaced keyframes for smooth organic motion
 * - Perfect for adding life to static UI elements
 *
 * Technical Implementation:
 * - Effect type: generic AnimationRange with calculated sine wave keyframes
 * - Scale calculation: 1 + amplitude * Math.sin((prog * cycles + phaseOffset) * Math.PI * 2)
 * - Mode: 'provider' with targetIds for direct component animation
 * - Easing: 'linear' for smooth sine-wave interpolation
 *
 * Use cases:
 * - Adding subtle breathing motion to UI cards
 * - Creating organic pulsing effects for icons or badges
 * - Simulating living motion in static layouts
 * - Desynchronized breathing for multiple elements (using phaseOffset)
 * - Cinematic subtle motion to keep scenes dynamic
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  cycles: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Number of breathing cycles during the duration (default: 2)'),
  amplitude: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.03)
    .describe(
      'Breathing amplitude - controls scale range (default: 0.03, range: 0.97-1.03)',
    ),
  duration: z
    .number()
    .min(0.5)
    .max(60)
    .default(3)
    .describe('Total duration of the breathing effect in seconds (default: 3)'),
  phaseOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe(
      'Phase offset (0-1) to desynchronize multiple elements (default: 0)',
    ),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the breathing effect to'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time of the effect relative to parent (default: 0)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    cycles,
    amplitude,
    duration,
    phaseOffset,
    targetIds,
    effectId,
    effectStart = 0,
  } = params;

  // Generate 20 evenly-spaced keyframes with sine-wave calculation
  const keyframeCount = 20;
  const ranges = Array.from({ length: keyframeCount }, (_, i) => {
    const prog = i / (keyframeCount - 1); // 0 to 1
    const sineValue = Math.sin((prog * cycles + phaseOffset) * Math.PI * 2);
    const scaleValue = 1 + amplitude * sineValue;

    return {
      key: 'scale',
      val: scaleValue,
      prog,
    };
  });

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear easing for smooth sine-wave interpolation
    start: effectStart,
    duration,
    mode: 'provider', // Always use provider mode
    targetIds, // Target component IDs directly
    ranges,
  };

  // Create effect node
  const effect = {
    id: effectId || `breath-scale-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'breath-scale-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'hidden', // Hidden container for effect extraction
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 0.01, // Minimal duration - not rendered
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
  id: 'breath-scale',
  title: 'Breath Scale Effect',
  description:
    'Internal effect preset that simulates organic breathing motion through rhythmic scale oscillation. Creates living, dynamic motion using sine-wave interpolation with customizable breathing rate, amplitude, and phase offset for desynchronized multi-element animations.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'breathing', 'scale', 'organic', 'sine-wave'],
  dependencies: {},
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects', // Extract effects from output
  defaultInputParams: {
    cycles: 2,
    amplitude: 0.03,
    duration: 3,
    phaseOffset: 0,
    targetIds: ['example-component'],
    effectStart: 0,
  },
};

// Export preset
export const breathScalePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
