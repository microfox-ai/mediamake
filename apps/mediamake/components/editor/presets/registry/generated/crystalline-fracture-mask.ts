/**
 * Crystalline Fracture Mask Effect
 *
 * This internal effect preset generates animated geometric shards with clip-path regions that create
 * cascading reveal effects. Supports radial, linear, and random fracture patterns with independent
 * timing offsets and physics-based easing for realistic motion.
 *
 * Features:
 * - **Multiple Fracture Patterns**: Radial, linear, and random shard generation
 * - **Staggered Animation**: Independent timing offsets for cascading reconstruction
 * - **Dimensional Depth**: Subtle rotation and scale animations per shard
 * - **Bidirectional Modes**: Constructive (pieces coming together) and destructive (breaking apart)
 * - **Physics-Based Easing**: Realistic motion with spring and ease options
 *
 * ARRAY OF EFFECTS:
 * This preset returns an array of effects - one per shard, each with staggered timing.
 *
 * Use cases:
 * - Creating dramatic content reveals with geometric patterns
 * - Building shattered glass effects for transitions
 * - Adding dynamic mosaic-style animations
 * - Creating puzzle-piece reconstruction effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply shard effects to'),
  shardCount: z
    .number()
    .min(3)
    .max(20)
    .default(12)
    .describe('Number of triangular shards to generate'),
  pattern: z
    .enum(['radial', 'linear', 'random'])
    .default('radial')
    .describe('Fracture pattern type'),
  stagger: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Time offset between shard animations in seconds'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Total duration of the effect animation'),
  mode: z
    .enum(['construct', 'destruct'])
    .default('construct')
    .describe('Animation direction - construct (pieces coming together) or destruct (breaking apart)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  easing: z
    .enum(['spring', 'ease-out', 'ease-in', 'ease-in-out', 'linear'])
    .default('spring')
    .describe('Easing function for realistic motion'),
  rotationRange: z
    .number()
    .min(0)
    .max(180)
    .default(30)
    .describe('Maximum rotation angle for shards in degrees'),
  scaleRange: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Scale variation range (0 = no scale, 1 = full scale variation)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate triangular clip-path coordinates
  const generateShardClipPath = (
    index: number,
    total: number,
    pattern: 'radial' | 'linear' | 'random',
  ): string => {
    const cx = 50; // Center X (%)
    const cy = 50; // Center Y (%)
    
    if (pattern === 'radial') {
      // Radial pattern - shards emanate from center
      const angleStep = (2 * Math.PI) / total;
      const angle = index * angleStep;
      const nextAngle = (index + 1) * angleStep;
      
      // Calculate triangle points for radial shard
      const radius = 70; // Extend beyond viewport
      const x1 = cx + radius * Math.cos(angle);
      const y1 = cy + radius * Math.sin(angle);
      const x2 = cx + radius * Math.cos(nextAngle);
      const y2 = cy + radius * Math.sin(nextAngle);
      
      return `polygon(${cx}% ${cy}%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
    } else if (pattern === 'linear') {
      // Linear pattern - vertical strips
      const width = 100 / total;
      const x1 = index * width;
      const x2 = (index + 1) * width;
      
      return `polygon(${x1}% 0%, ${x2}% 0%, ${x2}% 100%, ${x1}% 100%)`;
    } else {
      // Random pattern - randomized triangular regions
      const seed = index * 1000;
      const random = (n: number) => ((Math.sin(n) * 10000) % 1);
      
      const x1 = random(seed) * 100;
      const y1 = random(seed + 1) * 100;
      const x2 = random(seed + 2) * 100;
      const y2 = random(seed + 3) * 100;
      const x3 = random(seed + 4) * 100;
      const y3 = random(seed + 5) * 100;
      
      return `polygon(${x1}% ${y1}%, ${x2}% ${y2}%, ${x3}% ${y3}%)`;
    }
  };
  
  // Helper function to calculate initial transform based on mode
  const getInitialTransform = (
    index: number,
    total: number,
    mode: 'construct' | 'destruct',
  ): { scale: number; rotate: number; translateX: number; translateY: number } => {
    const seed = index * 1000;
    const random = (n: number) => ((Math.sin(n) * 10000) % 1) * 2 - 1; // -1 to 1
    
    const baseScale = mode === 'construct' ? 0.5 : 1;
    const targetScale = mode === 'construct' ? 1 : 0.5;
    const scaleVariation = params.scaleRange * random(seed);
    
    const rotation = random(seed + 1) * params.rotationRange;
    const translateX = random(seed + 2) * 100; // pixels
    const translateY = random(seed + 3) * 100; // pixels
    
    return {
      scale: mode === 'construct' ? baseScale + scaleVariation : targetScale + scaleVariation,
      rotate: mode === 'construct' ? rotation : 0,
      translateX: mode === 'construct' ? translateX : 0,
      translateY: mode === 'construct' ? translateY : 0,
    };
  };
  
  // Helper function to calculate final transform
  const getFinalTransform = (
    index: number,
    mode: 'construct' | 'destruct',
  ): { scale: number; rotate: number; translateX: number; translateY: number } => {
    const seed = index * 1000;
    const random = (n: number) => ((Math.sin(n) * 10000) % 1) * 2 - 1;
    
    if (mode === 'construct') {
      return {
        scale: 1,
        rotate: 0,
        translateX: 0,
        translateY: 0,
      };
    } else {
      const rotation = random(seed + 1) * params.rotationRange;
      const translateX = random(seed + 2) * 100;
      const translateY = random(seed + 3) * 100;
      
      return {
        scale: 0.5 + params.scaleRange * random(seed),
        rotate: rotation,
        translateX,
        translateY,
      };
    }
  };
  
  // Generate effects for each shard
  const shardEffects: any[] = [];
  const effectDuration = params.duration / 2; // Each shard animates for half the total duration
  
  for (let i = 0; i < params.shardCount; i++) {
    const targetId = params.targetIds[i % params.targetIds.length]; // Cycle through targets if fewer than shards
    const shardStart = params.effectStart + (i * params.stagger);
    
    // Generate clip-path coordinates
    const initialClipPath = generateShardClipPath(i, params.shardCount, params.pattern);
    const finalClipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'; // Full reveal
    
    // Get transform values
    const initialTransform = getInitialTransform(i, params.shardCount, params.mode);
    const finalTransform = getFinalTransform(i, params.mode);
    
    // Create effect data
    const effectData: GenericEffectData = {
      type: params.easing,
      start: shardStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Clip-path animation
        {
          key: 'clipPath',
          val: params.mode === 'construct' ? initialClipPath : finalClipPath,
          prog: 0,
        },
        {
          key: 'clipPath',
          val: params.mode === 'construct' ? finalClipPath : initialClipPath,
          prog: 1,
        },
        // Opacity animation
        {
          key: 'opacity',
          val: params.mode === 'construct' ? 0 : 1,
          prog: 0,
        },
        {
          key: 'opacity',
          val: params.mode === 'construct' ? 1 : 0.3,
          prog: 0.3,
        },
        {
          key: 'opacity',
          val: params.mode === 'construct' ? 1 : 0,
          prog: 1,
        },
        // Scale animation
        {
          key: 'scale',
          val: initialTransform.scale,
          prog: 0,
        },
        {
          key: 'scale',
          val: finalTransform.scale,
          prog: 1,
        },
        // Rotation animation
        {
          key: 'rotate',
          val: initialTransform.rotate,
          prog: 0,
        },
        {
          key: 'rotate',
          val: finalTransform.rotate,
          prog: 1,
        },
        // Translation X
        {
          key: 'translateX',
          val: initialTransform.translateX,
          prog: 0,
        },
        {
          key: 'translateX',
          val: finalTransform.translateX,
          prog: 1,
        },
        // Translation Y
        {
          key: 'translateY',
          val: initialTransform.translateY,
          prog: 0,
        },
        {
          key: 'translateY',
          val: finalTransform.translateY,
          prog: 1,
        },
      ],
    };
    
    const effect = {
      id: `crystalline-fracture-shard-${i}-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
    
    shardEffects.push(effect);
  }
  
  // Return effects in a container structure
  const rootContainer: RenderableComponentData = {
    id: 'crystalline-fracture-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    effects: shardEffects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: params.duration + (params.shardCount * params.stagger),
      },
    },
  };
  
  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: shardEffects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'crystalline-fracture-mask',
  title: 'Crystalline Fracture Mask Effect',
  description: 'Generates animated geometric shards with clip-path regions that create cascading reveal effects. Supports radial, linear, and random fracture patterns with independent timing offsets and physics-based easing for realistic motion. Includes constructive (pieces coming together) and destructive (breaking apart) modes with subtle rotation and scale animations for dimensional depth.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'clip-path', 'fracture', 'shards', 'reveal', 'animation'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component-1'],
    shardCount: 12,
    pattern: 'radial',
    stagger: 0.1,
    duration: 2,
    mode: 'construct',
    effectStart: 0,
    easing: 'spring',
    rotationRange: 30,
    scaleRange: 0.2,
  },
};

export const crystallineFractureMaskPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
