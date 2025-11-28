/**
 * Glass Shard Transition - Internal Effect Preset
 * 
 * Creates overlapping transparent geometric transitions simulating shattered glass.
 * Generates three synchronized effects (opacity, rotate, scale) per target element with
 * configurable shard patterns (radial/linear/random), transparency ranges, rotation intensity,
 * and scale variation.
 * 
 * Features:
 * - ARRAY OF EFFECTS: Returns multiple effects per target (opacity, rotation, scale)
 * - Shard Pattern Modes: 'radial', 'linear', 'random' distribution
 * - Independent Animations: Each shard (target) has unique opacity, rotation, and scale
 * - Staggered Timing: Progressive delay for cascading crystalline effect
 * - Transparency Control: Configurable min/max opacity ranges
 * - Rotation Intensity: Degrees of rotation with randomization
 * - Scale Variation: Min/max scale range for fragment sizing
 * 
 * Use Cases:
 * - Dramatic video/image transitions with shattered glass aesthetic
 * - Dynamic reveals with fragmented appearance
 * - Crystalline overlay effects
 * - Multi-element choreographed animations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to target with shard effects'),
  shardPattern: z.enum(['radial', 'linear', 'random']).describe('Pattern for shard distribution and animation timing'),
  transparencyRange: z.object({
    min: z.number().min(0).max(1).describe('Minimum opacity value during transition'),
    max: z.number().min(0).max(1).describe('Maximum opacity value during transition'),
  }).describe('Opacity range for transparency effects'),
  rotationIntensity: z.number().describe('Maximum rotation in degrees (randomized per shard)'),
  scaleVariation: z.object({
    min: z.number().describe('Minimum scale value'),
    max: z.number().describe('Maximum scale value'),
  }).describe('Scale range for fragment sizing'),
  duration: z.number().describe('Duration of each shard animation in seconds'),
  staggerDelay: z.number().describe('Delay between each shard animation start (in seconds)'),
  finalOpacity: z.number().min(0).max(1).default(1).optional().describe('Final opacity after transition completes'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    shardPattern,
    transparencyRange,
    rotationIntensity,
    scaleVariation,
    duration,
    staggerDelay,
    finalOpacity = 1,
  } = params;

  // Helper: Calculate pattern-based offset multiplier
  const getPatternOffset = (index: number, total: number, pattern: string): number => {
    if (pattern === 'linear') {
      return index; // Sequential order
    } else if (pattern === 'radial') {
      // Radial from center outward
      const center = Math.floor(total / 2);
      return Math.abs(index - center);
    } else if (pattern === 'random') {
      // Pseudo-random based on index seed
      const seed = index * 9301 + 49297;
      return (seed % total);
    }
    return index;
  };

  const effects: any[] = [];

  targetIds.forEach((targetId, index) => {
    const patternOffset = getPatternOffset(index, targetIds.length, shardPattern);
    const startTime = patternOffset * staggerDelay;

    // Generate randomized values (pseudo-random based on index for determinism)
    const randomSeed1 = (index * 7919 + 6571) / 10000;
    const randomSeed2 = (index * 5381 + 2333) / 10000;
    const randomSeed3 = (index * 3571 + 1987) / 10000;

    const randomRotation = (randomSeed1 % 1) * rotationIntensity * (randomSeed2 > 0.5 ? 1 : -1);
    const randomMidRotation = (randomSeed2 % 1) * rotationIntensity * (randomSeed3 > 0.5 ? 1 : -1);

    // 1. OPACITY EFFECT
    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: transparencyRange.min, prog: 0.3 },
        { key: 'opacity', val: transparencyRange.max, prog: 0.7 },
        { key: 'opacity', val: finalOpacity, prog: 1 },
      ],
    };

    effects.push({
      id: `glass-shard-opacity-${targetId}`,
      componentId: 'generic',
      data: opacityEffect,
    });

    // 2. ROTATION EFFECT
    const rotationEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: randomMidRotation, prog: 0.5 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    };

    effects.push({
      id: `glass-shard-rotate-${targetId}`,
      componentId: 'generic',
      data: rotationEffect,
    });

    // 3. SCALE EFFECT
    const scaleEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'scale', val: scaleVariation.min, prog: 0 },
        { key: 'scale', val: 1, prog: 0.5 },
        { key: 'scale', val: scaleVariation.max, prog: 1 },
      ],
    };

    effects.push({
      id: `glass-shard-scale-${targetId}`,
      componentId: 'generic',
      data: scaleEffect,
    });
  });

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'glass-shard-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: { overflow: 'hidden' },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Placeholder duration
      },
    },
    effects: effects,
    childrenData: [],
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

const presetMetadata: PresetMetadata = {
  id: 'GlassShardTransition',
  title: 'Glass Shard Transition',
  description: 'Internal effect preset that creates overlapping transparent geometric transitions simulating shattered glass. Generates three synchronized effects (opacity, rotate, scale) per target element with configurable shard patterns (radial/linear/random), transparency ranges, rotation intensity, and scale variation. Features staggered animations for crystalline, fragmented appearance ideal for dramatic transitions and dynamic image reveals.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'transition', 'glass', 'shard', 'geometric', 'internal', 'generic', 'overlay', 'dramatic'],
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3'],
    shardPattern: 'radial',
    transparencyRange: {
      min: 0.3,
      max: 0.8,
    },
    rotationIntensity: 15,
    scaleVariation: {
      min: 0.8,
      max: 1.2,
    },
    duration: 2,
    staggerDelay: 0.1,
    finalOpacity: 1,
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const GlassShardTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
