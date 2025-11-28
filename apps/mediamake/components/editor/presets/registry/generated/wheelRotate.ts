/**
 * Wheel Rotate Effect Preset
 *
 * ARRAY OF EFFECTS (generic effects for rotate, translateX, translateY)
 *
 * This internal effect preset simulates realistic wheel or gear rotation with synchronized
 * translation to create natural rolling motion. It calculates rotation based on wheel
 * circumference and distance traveled, ensuring the wheel appears to roll without sliding.
 *
 * Features:
 * - **Realistic Rolling Physics**: Rotation calculated from distance/circumference ratio
 * - **Surface Types**: Smooth roll, bumpy terrain (irregular rotation), or slippery (reduced traction)
 * - **Wobble Effects**: Optional wobble for uneven surfaces
 * - **Directional Rolling**: Configurable rolling direction (angle in degrees)
 * - **Friction Simulation**: Adjustable friction affects rotation/translation sync
 *
 * Physics:
 * - Rotation (degrees) = (distance / circumference) * 360
 * - Circumference = 2 * π * radius
 * - For bumpy terrain: adds irregular rotation variations
 * - For slippery surface: rotation reduced by friction factor
 *
 * Use cases:
 * - Creating realistic wheel animations
 * - Simulating vehicle rolling motion
 * - Animating gears and mechanical elements
 * - Adding physics-based motion to circular objects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply wheel rotation to'),
  effectStart: z.number().describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the rolling effect in seconds'),
  radius: z
    .number()
    .positive()
    .describe('Radius of the wheel in pixels (affects rotation/distance ratio)'),
  distance: z
    .number()
    .describe('Distance to travel in pixels (can be negative for reverse direction)'),
  direction: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe('Direction angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)'),
  friction: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Surface friction coefficient (0 = full slip, 1 = no slip)'),
  wobbleAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Amount of wobble for uneven surfaces (0 = none, 1 = maximum)'),
  surfaceType: z
    .enum(['smooth', 'bumpy', 'slippery'])
    .default('smooth')
    .describe('Type of surface affecting rolling behavior'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Convert degrees to radians
  const degToRad = (deg: number): number => {
    return (deg * Math.PI) / 180;
  };

  // Helper function: Calculate rotation based on distance and circumference
  const calculateRotation = (
    distance: number,
    radius: number,
    friction: number,
    surfaceType: 'smooth' | 'bumpy' | 'slippery',
  ): number => {
    const circumference = 2 * Math.PI * radius;
    let baseRotation = (distance / circumference) * 360;

    // Apply friction effects
    if (surfaceType === 'slippery') {
      baseRotation *= friction; // Reduced rotation for slippery surfaces
    }

    return baseRotation;
  };

  // Helper function: Generate bumpy rotation keyframes
  const generateBumpyRotation = (
    baseRotation: number,
    wobbleAmount: number,
  ): Array<{ prog: number; val: number }> => {
    const keyframes: Array<{ prog: number; val: number }> = [];
    const numBumps = 5; // Number of bumps/irregularities

    keyframes.push({ prog: 0, val: 0 });

    for (let i = 1; i <= numBumps; i++) {
      const prog = i / (numBumps + 1);
      const baseValue = baseRotation * prog;
      const wobble = (Math.random() - 0.5) * wobbleAmount * 30; // Random wobble up to ±15 degrees
      keyframes.push({ prog, val: baseValue + wobble });
    }

    keyframes.push({ prog: 1, val: baseRotation });
    return keyframes;
  };

  // Extract parameters
  const {
    targetId,
    effectStart,
    effectDuration,
    radius,
    distance,
    direction,
    friction,
    wobbleAmount,
    surfaceType,
    effectId,
  } = params;

  // Calculate rotation
  const totalRotation = calculateRotation(
    Math.abs(distance),
    radius,
    friction,
    surfaceType,
  );

  // Adjust rotation direction based on movement direction
  const rotationSign = distance >= 0 ? 1 : -1;
  const finalRotation = totalRotation * rotationSign;

  // Calculate translation components based on direction
  const directionRad = degToRad(direction);
  const translateX = distance * Math.cos(directionRad);
  const translateY = distance * Math.sin(directionRad);

  // Generate rotation ranges based on surface type
  let rotationRanges: Array<{ key: string; val: number; prog: number }> = [];

  if (surfaceType === 'bumpy') {
    // Generate bumpy rotation with irregularities
    const bumpyKeyframes = generateBumpyRotation(finalRotation, wobbleAmount);
    rotationRanges = bumpyKeyframes.map(kf => ({
      key: 'rotate',
      val: kf.val,
      prog: kf.prog,
    }));
  } else {
    // Smooth rotation for 'smooth' and 'slippery' surfaces
    rotationRanges = [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: finalRotation, prog: 1 },
    ];
  }

  // Add wobble to translation if specified
  let translateXRanges: Array<{ key: string; val: number; prog: number }> = [];
  let translateYRanges: Array<{ key: string; val: number; prog: number }> = [];

  if (wobbleAmount > 0 && surfaceType === 'bumpy') {
    // Add subtle wobble to translation for bumpy surfaces
    const wobbleSteps = 5;
    translateXRanges.push({ key: 'translateX', val: 0, prog: 0 });
    translateYRanges.push({ key: 'translateY', val: 0, prog: 0 });

    for (let i = 1; i <= wobbleSteps; i++) {
      const prog = i / (wobbleSteps + 1);
      const wobbleX = (Math.random() - 0.5) * wobbleAmount * 10;
      const wobbleY = (Math.random() - 0.5) * wobbleAmount * 10;

      translateXRanges.push({
        key: 'translateX',
        val: translateX * prog + wobbleX,
        prog,
      });
      translateYRanges.push({
        key: 'translateY',
        val: translateY * prog + wobbleY,
        prog,
      });
    }

    translateXRanges.push({ key: 'translateX', val: translateX, prog: 1 });
    translateYRanges.push({ key: 'translateY', val: translateY, prog: 1 });
  } else {
    // Smooth translation
    translateXRanges = [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: translateX, prog: 1 },
    ];
    translateYRanges = [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: translateY, prog: 1 },
    ];
  }

  // Combine all ranges
  const allRanges = [...rotationRanges, ...translateXRanges, ...translateYRanges];

  // Determine easing type based on surface
  const easingType =
    surfaceType === 'slippery' ? 'ease-out' : surfaceType === 'bumpy' ? 'linear' : 'ease-in-out';

  // Create the generic effect
  const wheelRotateEffect = {
    id: effectId ? `${effectId}-wheel-rotate` : `wheel-rotate-${targetId}`,
    componentId: 'generic',
    data: {
      type: easingType,
      start: effectStart,
      duration: effectDuration,
      mode: 'provider' as const,
      targetIds: [targetId],
      ranges: allRanges,
    },
  };

  // Return effect in container structure for extraction
  const effectContainer: RenderableComponentData = {
    id: 'wheel-rotate-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [wheelRotateEffect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [effectContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'wheelRotate',
  title: 'Wheel Rotate Effect',
  description:
    'Internal effect preset that simulates realistic wheel/gear rotation with synchronized translation. Calculates rotation based on circumference and distance traveled to ensure natural rolling motion. Supports smooth, bumpy, and slippery surface types with configurable radius, direction, friction, and wobble parameters.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'wheel', 'rotation', 'physics', 'rolling'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'wheel-component',
    effectStart: 0,
    effectDuration: 3,
    radius: 50,
    distance: 300,
    direction: 0,
    friction: 1,
    wobbleAmount: 0,
    surfaceType: 'smooth',
  },
};

// Export preset
export const wheelRotatePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
