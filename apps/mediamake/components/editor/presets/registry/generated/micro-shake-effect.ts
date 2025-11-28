/**
 * MicroShake Internal Effect Preset
 *
 * SINGLE EFFECT:
 * This internal effect preset generates a generic effect that applies extremely subtle,
 * barely perceptible micro-movements to static elements. It layers multiple micro-movements
 * to create visual interest without distraction:
 * - Tiny translateX/Y oscillations (max 2px)
 * - Minimal rotation (max 0.5 degrees)
 * - Slight scale breathing (0.99 to 1.01)
 *
 * Uses sine-wave-like progressions at different frequencies to avoid repetitive patterns.
 * Perfect for adding life to otherwise static text or images.
 *
 * Parameters:
 * - targetIds: Array of component IDs to apply the shake effect to
 * - shakeIntensity: Multiplier for all movements (0-1, default: 1)
 * - shakeDuration: Duration of the shake effect in milliseconds (default: 3000)
 * - shakeComplexity: Number of oscillation cycles (1-10, default: 4)
 *
 * Technical Implementation:
 * - Generic effect type with multiple property ranges
 * - Each property (translateX, translateY, rotate, scale) uses sine/cosine waves
 * - Different phase offsets prevent synchronized patterns
 * - Complexity controls the number of oscillation cycles within the duration
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the shake effect to'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe('Multiplier for all movements (0 = no movement, 1 = full intensity)'),
  shakeDuration: z
    .number()
    .positive()
    .default(3000)
    .optional()
    .describe('Duration of the shake effect in milliseconds'),
  shakeComplexity: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(4)
    .optional()
    .describe('Number of oscillation cycles (1 = simple, 10 = very complex)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const intensity = params.shakeIntensity ?? 1;
  const duration = (params.shakeDuration ?? 3000) / 1000; // Convert to seconds
  const complexity = params.shakeComplexity ?? 4;
  const targetIds = params.targetIds;

  // Create ranges for each property
  // Each range uses sine/cosine waves with different phases to avoid synchronization

  // TranslateX: Horizontal oscillation (max 2px * intensity)
  const translateXRanges = Array.from({ length: complexity * 2 }, (_, i) => ({
    key: 'translateX',
    val: Math.sin((i * Math.PI) / complexity) * 2 * intensity,
    prog: i / (complexity * 2 - 1),
  }));

  // TranslateY: Vertical oscillation (max 2px * intensity, phase offset with cosine)
  const translateYRanges = Array.from({ length: complexity * 2 }, (_, i) => ({
    key: 'translateY',
    val: Math.cos((i * Math.PI) / complexity) * 2 * intensity,
    prog: i / (complexity * 2 - 1),
  }));

  // Rotate: Minimal rotation (max 0.5 degrees * intensity, different phase)
  const rotateRanges = Array.from({ length: complexity * 2 }, (_, i) => ({
    key: 'rotate',
    val: Math.sin((i * Math.PI) / complexity + Math.PI / 4) * 0.5 * intensity,
    prog: i / (complexity * 2 - 1),
  }));

  // Scale: Breathing effect (0.99 to 1.01 scaled by intensity)
  const scaleRanges = Array.from({ length: complexity * 2 }, (_, i) => ({
    key: 'scale',
    val:
      1 + Math.cos((i * Math.PI) / complexity + Math.PI / 6) * 0.01 * intensity,
    prog: i / (complexity * 2 - 1),
  }));

  // Combine all ranges
  const combinedRanges = [
    ...translateXRanges,
    ...translateYRanges,
    ...rotateRanges,
    ...scaleRanges,
  ];

  // Create effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for smooth continuous motion
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: combinedRanges,
  };

  // Create effect object
  const effect = {
    id: params.effectId || `micro-shake-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'micro-shake-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: duration,
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
  id: 'micro-shake-effect',
  title: 'MicroShake Internal Effect',
  description:
    'An internal effect preset that adds extremely subtle, barely perceptible movement to static elements. Layers multiple micro-movements: tiny translateX/Y oscillations (max 2px), minimal rotation (max 0.5 degrees), and slight scale breathing (0.99 to 1.01). Uses sine-wave-like progressions at different frequencies to avoid repetitive patterns. Perfect for adding life to otherwise static text or images without distraction.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'shake', 'micro', 'subtle', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    shakeIntensity: 1,
    shakeDuration: 3000,
    shakeComplexity: 4,
  },
};

// Export preset
export const microShakeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
