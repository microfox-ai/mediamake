/**
 * Spiral Rotate 2D Internal Effect
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset generates a spiral motion pattern by combining rotation, scaling,
 * and translation animations. The element rotates while simultaneously scaling and moving along
 * a spiral path, creating a drill or vortex effect.
 *
 * Features:
 * - Multiple spiral types: Archimedean (even spacing), logarithmic (accelerating), Fibonacci (golden ratio)
 * - Configurable direction: inward (converging) or outward (expanding)
 * - Adjustable rotation speed relative to spiral progress
 * - Optional opacity fading based on spiral depth
 * - Precise mathematical spiral path calculations
 *
 * The effect returns AnimationRange[] arrays for rotate, scale, translateX, translateY, and opacity
 * properties that can be applied to target components using the generic effect system.
 *
 * Use cases:
 * - Dramatic reveals and entrances
 * - Vortex or portal transitions
 * - Drill-in or drill-out effects
 * - Spiral logo animations
 * - Dynamic geometric patterns
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply spiral rotation effect to'),
  effectStart: z.number().describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  
  // Spiral configuration
  spiralType: z
    .enum(['archimedean', 'logarithmic', 'fibonacci'])
    .default('archimedean')
    .describe('Type of spiral: archimedean (even spacing), logarithmic (accelerating), fibonacci (golden ratio)'),
  
  direction: z
    .enum(['inward', 'outward'])
    .default('inward')
    .describe('Spiral direction: inward (converging to center) or outward (expanding)'),
  
  rotations: z
    .number()
    .min(0.25)
    .max(10)
    .default(2)
    .describe('Number of complete rotations during the spiral motion'),
  
  spiralTightness: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Controls how quickly the spiral moves inward/outward (higher = tighter spiral)'),
  
  scaleFactor: z
    .number()
    .min(0)
    .max(2)
    .default(0.2)
    .describe('Maximum scale change during spiral (0 = no scaling, 1 = full scale to/from zero)'),
  
  maxRadius: z
    .number()
    .min(50)
    .max(1000)
    .default(300)
    .describe('Maximum radius of the spiral path in pixels'),
  
  fadeWithDepth: z
    .boolean()
    .default(true)
    .describe('Whether to fade opacity based on spiral depth (fade out when spiraling inward)'),
  
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-out')
    .describe('Easing function for the animation'),
  
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    effectStart,
    effectDuration,
    spiralType,
    direction,
    rotations,
    spiralTightness,
    scaleFactor,
    maxRadius,
    fadeWithDepth,
    easingType,
    effectId,
  } = params;

  // Number of keyframes for smooth animation
  const numKeyframes = 20;

  // Golden ratio for Fibonacci spiral
  const PHI = 1.618033988749895;

  /**
   * Calculate spiral radius at given progress based on spiral type
   */
  const calculateRadius = (progress: number): number => {
    // Invert progress for inward direction
    const t = direction === 'inward' ? 1 - progress : progress;
    
    switch (spiralType) {
      case 'archimedean':
        // r = a + b * θ (linear growth)
        // Simple linear interpolation from 0 to maxRadius
        return t * maxRadius * spiralTightness;
      
      case 'logarithmic':
        // r = a * e^(b * θ) (exponential growth)
        // Use exponential function for acceleration
        return maxRadius * spiralTightness * (Math.exp(t * 2) - 1) / (Math.exp(2) - 1);
      
      case 'fibonacci':
        // r = φ^(θ/90°) (golden ratio spiral)
        // Use golden ratio for natural-looking spiral
        return maxRadius * spiralTightness * (Math.pow(PHI, t * 2) - 1) / (PHI * PHI - 1);
      
      default:
        return t * maxRadius * spiralTightness;
    }
  };

  /**
   * Calculate position on spiral path
   */
  const calculateSpiralPosition = (progress: number): { x: number; y: number } => {
    const radius = calculateRadius(progress);
    const angle = progress * rotations * 2 * Math.PI;
    
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  };

  /**
   * Calculate scale at given progress
   */
  const calculateScale = (progress: number): number => {
    const t = direction === 'inward' ? 1 - progress : progress;
    
    if (scaleFactor === 0) return 1;
    
    // Scale from (1 - scaleFactor) to 1, or 1 to (1 + scaleFactor)
    if (direction === 'inward') {
      return 1 - (scaleFactor * (1 - t));
    } else {
      return 1 + (scaleFactor * t);
    }
  };

  /**
   * Calculate opacity at given progress
   */
  const calculateOpacity = (progress: number): number => {
    if (!fadeWithDepth) return 1;
    
    // Fade out as spiral progresses inward, fade in as it expands outward
    if (direction === 'inward') {
      return Math.max(0, 1 - progress * 0.8); // Fade to 20% opacity
    } else {
      return Math.min(1, 0.2 + progress * 0.8); // Fade from 20% to 100%
    }
  };

  /**
   * Calculate rotation angle at given progress
   */
  const calculateRotation = (progress: number): number => {
    return progress * rotations * 360;
  };

  // Generate keyframes
  const rotateRanges = [];
  const scaleRanges = [];
  const translateXRanges = [];
  const translateYRanges = [];
  const opacityRanges = [];

  for (let i = 0; i <= numKeyframes; i++) {
    const prog = i / numKeyframes;
    const position = calculateSpiralPosition(prog);
    const scale = calculateScale(prog);
    const rotation = calculateRotation(prog);
    const opacity = calculateOpacity(prog);

    rotateRanges.push({
      key: 'rotate',
      val: rotation,
      prog,
    });

    scaleRanges.push({
      key: 'scale',
      val: scale,
      prog,
    });

    translateXRanges.push({
      key: 'translateX',
      val: position.x,
      prog,
    });

    translateYRanges.push({
      key: 'translateY',
      val: position.y,
      prog,
    });

    if (fadeWithDepth) {
      opacityRanges.push({
        key: 'opacity',
        val: opacity,
        prog,
      });
    }
  }

  // Combine all ranges
  const allRanges = [
    ...rotateRanges,
    ...scaleRanges,
    ...translateXRanges,
    ...translateYRanges,
    ...(fadeWithDepth ? opacityRanges : []),
  ];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: easingType,
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: allRanges,
  };

  const effect = {
    id: effectId || `spiral-rotate-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'spiralRotate2D-effect-container',
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
        duration: 10,
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

const presetMetadata: PresetMetadata = {
  id: 'spiralRotate2D',
  title: 'Spiral Rotate 2D Effect',
  description:
    'Internal effect preset that creates spiral motion patterns combining rotation, scaling, and translation. Supports Archimedean (even spacing), logarithmic (accelerating), and Fibonacci (golden ratio) spiral types with configurable direction (inward/outward), rotation speed, tightness, and optional depth-based opacity fading. Perfect for dramatic reveals, transitions, and vortex effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'spiral', 'rotation', 'animation', 'vortex', 'drill', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 3,
    spiralType: 'archimedean',
    direction: 'inward',
    rotations: 2,
    spiralTightness: 1,
    scaleFactor: 0.2,
    maxRadius: 300,
    fadeWithDepth: true,
    easingType: 'ease-out',
  },
};

export const spiralRotate2DPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
