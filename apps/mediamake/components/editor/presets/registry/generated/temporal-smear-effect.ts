/**
 * Temporal Smear Internal Effect Preset
 *
 * Creates extreme motion blur by simulating frame blending and temporal interpolation.
 * This effect generates ghost trails and motion echoes that suggest multiple time slices
 * compressed into one moment, perfect for creating supernatural speed effects.
 *
 * ARRAY OF EFFECTS:
 * Returns multiple trail effects, each with staggered timing and progressive decay.
 *
 * Features:
 * - Multiple overlapping trail layers (2-10 configurable)
 * - Progressive opacity decay (linear or exponential)
 * - Accumulated blur for depth perception
 * - Temporal offset between each trail
 * - Position offset to create trail separation
 *
 * Use cases:
 * - Supernatural speed effects
 * - Time manipulation visuals
 * - Ghost/echo effects
 * - Motion blur enhancement
 * - Fast-action sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the smear effect to'),
  start: z
    .number()
    .default(0)
    .describe('Effect start time relative to parent timeline (seconds)'),
  duration: z
    .number()
    .describe('Duration of each individual trail effect (seconds)'),
  trailCount: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Number of temporal trail layers'),
  fadeDecay: z
    .enum(['linear', 'exponential'])
    .default('exponential')
    .describe('How opacity decays across trails'),
  temporalOffset: z
    .number()
    .default(0.05)
    .describe('Time offset between each trail start (seconds)'),
  blurAccumulation: z
    .boolean()
    .default(true)
    .describe('Whether to apply progressive blur to earlier trails'),
  positionOffset: z
    .number()
    .default(2)
    .optional()
    .describe('Slight position offset in pixels to create trail separation'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate opacity based on decay mode
  const calculateOpacity = (
    trailIndex: number,
    totalTrails: number,
    decayMode: 'linear' | 'exponential',
  ): number => {
    const position = trailIndex / (totalTrails - 1); // 0 to 1

    if (decayMode === 'linear') {
      // Linear decay: latest trail = 1, earliest trail = 0.2
      return 1 - position * 0.8;
    } else {
      // Exponential decay: faster falloff
      return Math.pow(1 - position, 2) * 0.8 + 0.2;
    }
  };

  // Helper function to calculate blur amount
  const calculateBlur = (
    trailIndex: number,
    totalTrails: number,
    enabled: boolean,
  ): number => {
    if (!enabled) return 0;
    const position = trailIndex / (totalTrails - 1); // 0 to 1
    // Earlier trails get more blur (0 to 8px)
    return position * 8;
  };

  // Generate trail effects
  const trailEffects = [];

  for (let i = 0; i < params.trailCount; i++) {
    const trailStartTime = params.start + i * params.temporalOffset;
    const opacity = calculateOpacity(i, params.trailCount, params.fadeDecay);
    const blurAmount = calculateBlur(
      i,
      params.trailCount,
      params.blurAccumulation,
    );
    const posOffset = (params.positionOffset || 2) * i;

    const ranges = [];

    // Opacity animation: fade in quickly, hold, then fade out
    ranges.push({ key: 'opacity', val: 0, prog: 0 });
    ranges.push({ key: 'opacity', val: opacity, prog: 0.1 });
    ranges.push({ key: 'opacity', val: opacity, prog: 0.9 });
    ranges.push({ key: 'opacity', val: 0, prog: 1 });

    // Blur filter (if enabled)
    if (blurAmount > 0) {
      const blurValue = `blur(${blurAmount}px)`;
      ranges.push({ key: 'filter', val: blurValue, prog: 0 });
      ranges.push({ key: 'filter', val: blurValue, prog: 1 });
    }

    // Slight position offset to create separation between trails
    if (posOffset > 0) {
      ranges.push({ key: 'translateX', val: -posOffset, prog: 0 });
      ranges.push({ key: 'translateX', val: -posOffset, prog: 1 });
    }

    // Construct effect data
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: trailStartTime,
      duration: params.duration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: ranges,
    };

    // Create effect object
    trailEffects.push({
      id: `temporal-smear-trail-${i}`,
      componentId: 'generic',
      data: effectData,
    });
  }

  // Return container structure with effects
  const rootContainer: RenderableComponentData = {
    id: 'temporal-smear-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: trailEffects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration:
          params.duration +
          (params.trailCount - 1) * params.temporalOffset +
          1,
      },
    },
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'temporal-smear-effect',
  title: 'Temporal Smear Internal Effect',
  description:
    'Internal effect preset that creates extreme motion blur by simulating frame blending and temporal interpolation. Creates ghost trails and motion echoes that suggest multiple time slices compressed into one moment, perfect for supernatural speed effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'motion-blur', 'trails', 'temporal', 'speed', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    start: 0,
    duration: 2,
    trailCount: 5,
    fadeDecay: 'exponential',
    temporalOffset: 0.05,
    blurAccumulation: true,
    positionOffset: 2,
  },
};

// Export preset
export const temporalSmearEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
