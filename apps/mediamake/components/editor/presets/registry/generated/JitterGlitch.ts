/**
 * JitterGlitch Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Produces rapid micro-movements simulating camera shake and digital glitching.
 * Creates nervous, unstable feeling like a handheld camera being shaken or a digital signal breaking up.
 *
 * Features:
 * - Rapid micro-movements with erratic timing
 * - Quick translations (X and Y axis)
 * - Slight rotations
 * - Subtle scale variations (0.98-1.02)
 * - Deterministic pseudo-random keyframes
 * - GPU-accelerated (transform properties only)
 * - Configurable intensity (0-1)
 * - Configurable frequency (jitters per second)
 * - Axis constraints (optional disable X or Y movement)
 *
 * Technical Details:
 * - Generates 20-30 keyframes based on frequency and duration
 * - Uneven prog distribution for irregular timing
 * - Sharp linear transitions (no easing between micro-movements)
 * - Seeded randomness for deterministic results
 * - Transform values scale with intensity parameter
 *
 * Use cases:
 * - Camera shake effects
 * - Digital glitch simulation
 * - Unstable handheld camera feel
 * - Broken signal/transmission effects
 * - Adding energy and instability to static elements
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData, AnimationRange } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  intensity: z.number().min(0).max(1).describe('Controls amplitude of movements (0-1 scale). Higher values produce more extreme jitter.'),
  frequency: z.number().min(1).max(60).describe('Number of jitters per second. Determines how many micro-movements occur.'),
  duration: z.number().describe('Total effect duration in seconds.'),
  constrainX: z.boolean().optional().describe('If true, disables X-axis translation (horizontal movement).'),
  constrainY: z.boolean().optional().describe('If true, disables Y-axis translation (vertical movement).'),
  targetIds: z.array(z.string()).describe('Array of component IDs to apply the jitter glitch effect to.'),
  effectId: z.string().optional().describe('Optional custom effect ID. Auto-generated if not provided.'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Seeded pseudo-random generator for deterministic results
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Generate seed from first targetId
  const generateSeed = (targetId: string, index: number): number => {
    let hash = 0;
    for (let i = 0; i < targetId.length; i++) {
      hash = (hash << 5) - hash + targetId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) + index;
  };

  // Calculate keyframe count based on frequency and duration
  const keyframeCount = Math.max(
    20,
    Math.min(30, Math.floor(params.frequency * params.duration))
  );

  // Generate animation ranges for jitter effect
  const ranges: AnimationRange[] = [];
  const firstTargetId = params.targetIds[0] || 'default';

  // Generate uneven prog distribution for irregular timing
  const progValues: number[] = [0]; // Start at 0
  for (let i = 1; i < keyframeCount - 1; i++) {
    const seed = generateSeed(firstTargetId, i);
    const baseProgress = i / (keyframeCount - 1);
    // Add randomness to create clusters and gaps
    const randomOffset = (seededRandom(seed) - 0.5) * 0.15; // ±7.5% variance
    const clampedProg = Math.max(0.01, Math.min(0.99, baseProgress + randomOffset));
    progValues.push(clampedProg);
  }
  progValues.push(1); // End at 1

  // Sort prog values to ensure monotonic progression
  progValues.sort((a, b) => a - b);

  // Generate keyframe values for each property
  for (let i = 0; i < keyframeCount; i++) {
    const prog = progValues[i];
    const seedBase = generateSeed(firstTargetId, i * 100);

    // TranslateX (disabled if constrainX is true)
    if (!params.constrainX) {
      const translateXSeed = seedBase + 1;
      const translateXVal = (seededRandom(translateXSeed) - 0.5) * 2 * params.intensity * 20;
      ranges.push({
        key: 'translateX',
        val: translateXVal,
        prog,
      });
    }

    // TranslateY (disabled if constrainY is true)
    if (!params.constrainY) {
      const translateYSeed = seedBase + 2;
      const translateYVal = (seededRandom(translateYSeed) - 0.5) * 2 * params.intensity * 20;
      ranges.push({
        key: 'translateY',
        val: translateYVal,
        prog,
      });
    }

    // Rotate
    const rotateSeed = seedBase + 3;
    const rotateVal = (seededRandom(rotateSeed) - 0.5) * 2 * params.intensity * 3;
    ranges.push({
      key: 'rotate',
      val: rotateVal,
      prog,
    });

    // Scale (subtle variations 0.98-1.02)
    const scaleSeed = seedBase + 4;
    const scaleRange = params.intensity * 0.02; // Max variation of 0.02
    const scaleVal = 1 + (seededRandom(scaleSeed) - 0.5) * 2 * scaleRange;
    ranges.push({
      key: 'scale',
      val: scaleVal,
      prog,
    });
  }

  // Create effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Sharp transitions for authentic glitch feel
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges,
  };

  // Create effect object
  const effect = {
    id: params.effectId || `jitter-glitch-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  const containerNode: RenderableComponentData = {
    id: 'jitter-glitch-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden', // Container is not visible, only holds effect
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [effect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [containerNode] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'JitterGlitch',
  title: 'JitterGlitch Internal Effect Preset',
  description:
    'Internal effect preset that generates rapid micro-movements simulating camera shake and digital glitching. Returns AnimationRange[] arrays for translateX, translateY, rotate, and scale properties with deterministic pseudo-random keyframes. Produces nervous, unstable feeling with GPU-accelerated transforms.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'shake', 'jitter', 'camera-shake', 'transform', 'gpu'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    intensity: 0.5,
    frequency: 10,
    duration: 2,
    constrainX: false,
    constrainY: false,
    targetIds: ['component-1'],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const JitterGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
