/**
 * Soft Breathe Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a gentle breathing rhythm for any element with synchronized scale (100-102%),
 * opacity (0.95-1), and optional blur (0-0.5px) animations in a meditative sine wave pattern.
 *
 * Features:
 * - Scale animation from 100% to 102% (configurable intensity)
 * - Synchronized opacity pulsing from 0.95 to 1
 * - Optional subtle blur effect (0 to 0.5px at peak)
 * - Organic sine wave timing with ease-in-out
 * - Configurable breath duration (default 3 seconds)
 * - Looping animation for continuous breathing effect
 *
 * Use cases:
 * - Background elements that need subtle life
 * - Ambient text overlays
 * - Meditative UI elements
 * - Gentle pulsing effects for attention without distraction
 *
 * Advanced Usage:
 * Can target multiple components simultaneously by passing multiple IDs in targetIds array.
 * Adjust breathIntensity (0-1) to control how much the element scales.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe(
      'Array of component IDs to apply the breathing effect to',
    ),
  breathDuration: z
    .number()
    .min(1000)
    .max(10000)
    .default(3000)
    .optional()
    .describe(
      'Duration of one complete breath cycle in milliseconds (default: 3000ms)',
    ),
  breathIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.02)
    .optional()
    .describe(
      'Intensity of the breathing effect as scale multiplier (0-1, default: 0.02 for 2% scale)',
    ),
  blurEnabled: z
    .boolean()
    .default(false)
    .optional()
    .describe(
      'Whether to include a subtle blur effect at the peak of each breath (default: false)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const breathDuration = (params.breathDuration ?? 3000) / 1000; // Convert to seconds
  const breathIntensity = params.breathIntensity ?? 0.02;
  const blurEnabled = params.blurEnabled ?? false;
  const targetIds = params.targetIds;

  // Calculate scale values
  const baseScale = 1;
  const peakScale = 1 + breathIntensity;

  // Generate unique effect ID
  const effectId =
    params.effectId ||
    `soft-breathe-${targetIds.join('-')}-${Date.now()}`;

  // Construct the generic effect data with looping
  const effectData: GenericEffectData = {
    type: 'ease-in-out', // Smooth sine wave pattern
    start: 0,
    duration: breathDuration,
    mode: 'provider',
    targetIds: targetIds,
    loop: true, // Enable looping for continuous breathing
    ranges: [
      // Scale range: 1 → 1 + intensity → 1 (sine wave)
      { key: 'scale', val: baseScale, prog: 0 },
      { key: 'scale', val: peakScale, prog: 0.5 },
      { key: 'scale', val: baseScale, prog: 1 },

      // Opacity range: 0.95 → 1 → 0.95 (synchronized with scale)
      { key: 'opacity', val: 0.95, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: 0.95, prog: 1 },

      // Blur range: 0 → 0.5px → 0 (only if enabled)
      {
        key: 'blur',
        val: blurEnabled ? '0px' : '0px',
        prog: 0,
      },
      {
        key: 'blur',
        val: blurEnabled ? '0.5px' : '0px',
        prog: 0.5,
      },
      {
        key: 'blur',
        val: blurEnabled ? '0px' : '0px',
        prog: 1,
      },
    ],
  };

  // Create the effect object
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };

  // Return preset output with effect in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'soft-breathe-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
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
  id: 'soft-breathe-effect',
  title: 'Soft Breathe Internal Effect',
  description:
    'Internal effect preset that creates a gentle breathing rhythm for any element with synchronized scale (100-102%), opacity (0.95-1), and optional blur (0-0.5px) animations in a meditative sine wave pattern. Returns an effect configuration object to be attached to target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'breathe', 'scale', 'opacity', 'blur', 'internal', 'generic', 'looping', 'meditation'],
  dependencies: {},
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    breathDuration: 3000,
    breathIntensity: 0.02,
    blurEnabled: false,
  },
};

// Export preset
export const softBreatheEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
