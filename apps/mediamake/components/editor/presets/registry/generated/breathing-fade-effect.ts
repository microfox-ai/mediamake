/**
 * BreathingFade Internal Effect Preset
 *
 * ARRAY OF EFFECTS (if includeScale is enabled, returns 2 effects; otherwise 1 effect)
 *
 * This preset simulates natural breathing rhythm with opacity changes using mathematical sine wave calculations.
 * The effect creates organic, rhythmic fading that feels alive and natural, with optional synchronized scale transformations.
 *
 * Features:
 * - **Sine-based calculations**: Uses Math.sin for smooth, organic breathing curves
 * - **Variable breathing speeds**: Calm (4-8 CPM), normal (8-16 CPM), anxious (16-30 CPM)
 * - **Breath depth patterns**: Shallow (0.3-1.0), normal (0.1-1.0), deep (0.0-1.0) opacity ranges
 * - **Synchronized scale effect**: Subtle growth on inhale (fade-in), shrink on exhale (fade-out)
 * - **Irregularity factor**: Adds natural variation to breathing patterns (0-0.3)
 * - **20 keyframes**: Generated using sine wave for smooth, continuous animation
 *
 * Breathing patterns:
 * - Regular: Standard sine wave breathing with configurable rate and depth
 * - Deep: Full opacity range (0-1) with slower, more pronounced movements
 * - Shallow: Limited opacity range (0.3-1) with subtler breathing
 * - Variable: Adds irregularity factor to create natural, imperfect breathing
 *
 * Technical Implementation:
 * - Duration calculation: (60000 / breathRate) * cycles milliseconds → seconds
 * - Keyframe generation: 20 keyframes distributed evenly across duration
 * - Sine calculation: Math.sin(progress * Math.PI * 2 * cycles)
 * - Opacity mapping: minOpacity + (maxOpacity - minOpacity) * (sineVal + 1) / 2
 * - Scale mapping: 1 + (scaleAmount * sineVal)
 * - Effect mode: 'provider' with targetIds for direct application
 *
 * Use cases:
 * - Creating living, breathing UI elements
 * - Simulating organic pulsing effects
 * - Adding subtle life to static content
 * - Creating meditation or relaxation visuals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply breathing effect to'),
  breathRate: z
    .number()
    .min(4)
    .max(30)
    .optional()
    .describe('Breathing rate in cycles per minute (4-30 CPM, default: 12)'),
  breathDepth: z
    .enum(['shallow', 'normal', 'deep'])
    .optional()
    .describe(
      'Breath depth pattern: shallow (0.3-1.0), normal (0.1-1.0), deep (0.0-1.0) opacity ranges',
    ),
  cycles: z
    .number()
    .optional()
    .describe('Number of breathing cycles to complete (default: 3)'),
  irregularity: z
    .number()
    .min(0)
    .max(0.3)
    .optional()
    .describe(
      'Irregularity factor for natural variation (0-0.3, 0 = perfect rhythm, default: 0.05)',
    ),
  includeScale: z
    .boolean()
    .optional()
    .describe(
      'Whether to include synchronized scale transformation (default: true)',
    ),
  scaleAmount: z
    .number()
    .optional()
    .describe('Scale transformation amount (default: 0.02, resulting in 0.98-1.02 range)'),
  effectStart: z
    .number()
    .optional()
    .describe('Start time of the effect in seconds (default: 0)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate breathing parameters
  const calculateBreathingParams = () => {
    const breathRate = params.breathRate ?? 12; // Default: 12 cycles per minute (calm-normal range)
    const cycles = params.cycles ?? 3; // Default: 3 breathing cycles
    const breathDepth = params.breathDepth ?? 'normal';
    const irregularity = params.irregularity ?? 0.05;
    const includeScale = params.includeScale ?? true;
    const scaleAmount = params.scaleAmount ?? 0.02;
    const effectStart = params.effectStart ?? 0;

    // Calculate duration: (60000ms / breathRate) * cycles / 1000 → seconds
    const durationMs = (60000 / breathRate) * cycles;
    const duration = durationMs / 1000;

    // Opacity ranges based on breath depth
    let minOpacity = 0.1;
    let maxOpacity = 1.0;

    switch (breathDepth) {
      case 'shallow':
        minOpacity = 0.3;
        maxOpacity = 1.0;
        break;
      case 'normal':
        minOpacity = 0.1;
        maxOpacity = 1.0;
        break;
      case 'deep':
        minOpacity = 0.0;
        maxOpacity = 1.0;
        break;
    }

    return {
      duration,
      effectStart,
      minOpacity,
      maxOpacity,
      cycles,
      irregularity,
      includeScale,
      scaleAmount,
    };
  };

  // Helper function: Generate sine-based keyframes
  const generateSineKeyframes = (
    keyType: 'opacity' | 'scale',
    minVal: number,
    maxVal: number,
    cycles: number,
    irregularity: number,
  ) => {
    const keyframes = [];
    const numKeyframes = 20;

    for (let i = 0; i <= numKeyframes; i++) {
      const prog = i / numKeyframes;

      // Calculate sine value: -1 to 1
      let sineVal = Math.sin(prog * Math.PI * 2 * cycles);

      // Add irregularity (natural variation)
      if (irregularity > 0 && i > 0 && i < numKeyframes) {
        // Use pseudo-random variation based on position
        const variation = Math.sin(prog * 137.5) * irregularity;
        sineVal += variation;
        // Clamp to valid range
        sineVal = Math.max(-1, Math.min(1, sineVal));
      }

      // Map sine value to target range
      let val: number;
      if (keyType === 'opacity') {
        // Map -1..1 to minOpacity..maxOpacity
        val = minVal + ((maxVal - minVal) * (sineVal + 1)) / 2;
      } else if (keyType === 'scale') {
        // Map -1..1 to scale range (1 - scaleAmount to 1 + scaleAmount)
        val = 1 + minVal * sineVal;
      } else {
        val = 0;
      }

      keyframes.push({
        key: keyType,
        val: keyType === 'opacity' ? val : val,
        prog,
      });
    }

    return keyframes;
  };

  // Calculate breathing parameters
  const breathingParams = calculateBreathingParams();

  // Generate opacity ranges (always included)
  const opacityRanges = generateSineKeyframes(
    'opacity',
    breathingParams.minOpacity,
    breathingParams.maxOpacity,
    breathingParams.cycles,
    breathingParams.irregularity,
  );

  // Create opacity effect
  const opacityEffectData: GenericEffectData = {
    type: 'linear', // Linear for smooth sine wave
    start: breathingParams.effectStart,
    duration: breathingParams.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: opacityRanges,
  };

  const opacityEffect = {
    id: `breathing-fade-opacity-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: opacityEffectData,
  };

  // Generate scale effect (if enabled)
  const effects = [opacityEffect];

  if (breathingParams.includeScale) {
    const scaleRanges = generateSineKeyframes(
      'scale',
      breathingParams.scaleAmount,
      breathingParams.scaleAmount,
      breathingParams.cycles,
      breathingParams.irregularity,
    );

    const scaleEffectData: GenericEffectData = {
      type: 'linear',
      start: breathingParams.effectStart,
      duration: breathingParams.duration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: scaleRanges,
    };

    const scaleEffect = {
      id: `breathing-fade-scale-${params.targetIds.join('-')}`,
      componentId: 'generic',
      data: scaleEffectData,
    };

    effects.push(scaleEffect);
  }

  // Return effects in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'breathing-fade-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: breathingParams.duration,
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

const presetMetadata: PresetMetadata = {
  id: 'breathing-fade-effect',
  title: 'BreathingFade Effect',
  description:
    'Internal effect preset that simulates natural breathing rhythm with opacity changes. Uses mathematical sine wave calculations to create organic, rhythmic fading. Supports variable breathing speeds (calm, normal, anxious), configurable breath depth (shallow, normal, deep), irregularity factor for natural variation, and optional synchronized scale transformation.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'breathing', 'fade', 'organic', 'sine', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    breathRate: 12,
    breathDepth: 'normal',
    cycles: 3,
    irregularity: 0.05,
    includeScale: true,
    scaleAmount: 0.02,
    effectStart: 0,
  },
};

export const breathingFadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
