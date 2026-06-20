/**
 * GridCollisionBounce Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal preset generates physics-based collision bounce effects for elements
 * interacting with grid boundaries. It simulates realistic collision detection and
 * bounce physics including velocity dampening, angular momentum, and squash-and-stretch
 * deformation during impact.
 *
 * Features:
 * - Physics-based collision detection at grid boundaries
 * - Realistic bounce with configurable elasticity (bounciness)
 * - Velocity dampening with friction
 * - Optional gravity for downward force
 * - Angular momentum and rotation on bounce (spinOnBounce)
 * - Squash-and-stretch deformation during impact using scaleX/scaleY
 * - Custom bounce easing curve for realistic physics
 * - Configurable grid cell size for boundary detection
 *
 * Physics Simulation:
 * - Tracks element velocity in X and Y directions
 * - Detects collisions when elements cross grid cell boundaries
 * - Calculates bounce angle based on collision normal
 * - Applies elasticity (bounciness) to reverse velocity
 * - Applies friction to dampen velocity over time
 * - Optional gravity force pulling elements downward
 * - Rotation increases with each bounce when spinOnBounce enabled
 *
 * Parameters:
 * - gridCellSize: Size of grid cells in pixels (default: 60)
 * - bounciness: Elasticity coefficient 0-1, where 1 = perfect elastic bounce (default: 0.6)
 * - friction: Velocity dampening 0-1, where 1 = maximum friction (default: 0.2)
 * - gravity: Optional downward force in px/s² (default: undefined)
 * - spinOnBounce: Whether to add rotation on each bounce (default: true)
 * - targetIds: Array of component IDs to apply the effect to
 * - duration: Duration of the bounce animation cycle in ms (default: 500)
 * - numberOfBounces: Number of bounce cycles to simulate (default: 3)
 *
 * Returns: Array of generic effects with translateX, translateY, scaleX, scaleY, and rotate ranges
 *
 * Use cases:
 * - Creating physics-based collision animations
 * - Simulating bouncing elements in grid-based layouts
 * - Adding realistic bounce effects to interactive elements
 * - Creating dynamic motion graphics with collision detection
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  gridCellSize: z
    .number()
    .min(20)
    .max(200)
    .default(60)
    .describe('Size of grid cells in pixels for boundary detection'),
  bounciness: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Elasticity coefficient (0 = no bounce, 1 = perfect elastic)'),
  friction: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Velocity dampening factor (0 = no friction, 1 = maximum)'),
  gravity: z
    .number()
    .optional()
    .describe('Optional downward force in pixels per second squared'),
  spinOnBounce: z
    .boolean()
    .default(true)
    .describe('Whether to add rotation on each bounce'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply bounce effects to'),
  duration: z
    .number()
    .min(100)
    .max(2000)
    .default(500)
    .describe('Duration of each bounce cycle in milliseconds'),
  numberOfBounces: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of bounce cycles to simulate'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate bounce physics
  const calculateBouncePhysics = (
    gridCellSize: number,
    bounciness: number,
    friction: number,
    gravity: number | undefined,
    numberOfBounces: number,
  ) => {
    const bounceData: Array<{
      impactX: number;
      impactY: number;
      bounceX: number;
      bounceY: number;
      spinAngle: number;
    }> = [];

    // Initial velocity (randomized for variation)
    let velocityX = (Math.random() - 0.5) * gridCellSize * 2;
    let velocityY = (Math.random() - 0.5) * gridCellSize * 2;
    let positionX = 0;
    let positionY = 0;
    let rotation = 0;

    for (let i = 0; i < numberOfBounces; i++) {
      // Apply gravity if specified
      if (gravity) {
        velocityY += gravity * 0.016; // Approximate frame time (16ms at 60fps)
      }

      // Calculate impact position (where element hits boundary)
      const impactX = positionX + velocityX;
      const impactY = positionY + velocityY;

      // Detect collision with grid boundaries
      let didBounceX = false;
      let didBounceY = false;

      // Check X boundaries
      if (Math.abs(impactX) > gridCellSize / 2) {
        velocityX = -velocityX * bounciness;
        didBounceX = true;
      }

      // Check Y boundaries
      if (Math.abs(impactY) > gridCellSize / 2) {
        velocityY = -velocityY * bounciness;
        didBounceY = true;
      }

      // Apply friction
      velocityX *= 1 - friction;
      velocityY *= 1 - friction;

      // Calculate bounce position after collision
      const bounceX = positionX + velocityX;
      const bounceY = positionY + velocityY;

      // Calculate rotation based on velocity magnitude
      if (didBounceX || didBounceY) {
        const velocityMagnitude = Math.sqrt(
          velocityX * velocityX + velocityY * velocityY,
        );
        rotation += (velocityMagnitude / gridCellSize) * 45; // Rotate based on impact force
      }

      bounceData.push({
        impactX: Math.max(-gridCellSize, Math.min(gridCellSize, impactX)),
        impactY: Math.max(-gridCellSize, Math.min(gridCellSize, impactY)),
        bounceX: Math.max(-gridCellSize, Math.min(gridCellSize, bounceX)),
        bounceY: Math.max(-gridCellSize, Math.min(gridCellSize, bounceY)),
        spinAngle: rotation,
      });

      // Update position for next bounce
      positionX = bounceX;
      positionY = bounceY;

      // Stop if velocity is too low (settled)
      if (
        Math.abs(velocityX) < 0.1 &&
        Math.abs(velocityY) < 0.1 &&
        i > 0
      ) {
        break;
      }
    }

    return bounceData;
  };

  // Calculate bounce ranges for animation
  const calculateBounceRanges = (
    bounceData: Array<{
      impactX: number;
      impactY: number;
      bounceX: number;
      bounceY: number;
      spinAngle: number;
    }>,
    spinOnBounce: boolean,
  ) => {
    const translateXRanges: Array<{ val: number; prog: number }> = [];
    const translateYRanges: Array<{ val: number; prog: number }> = [];
    const scaleXRanges: Array<{ val: number; prog: number }> = [];
    const scaleYRanges: Array<{ val: number; prog: number }> = [];
    const rotateRanges: Array<{ val: number; prog: number }> = [];

    const numBounces = bounceData.length;

    bounceData.forEach((bounce, index) => {
      const startProg = index / numBounces;
      const impactProg = startProg + 0.05 / numBounces; // Impact happens quickly
      const endProg = (index + 1) / numBounces;

      // TranslateX animation
      translateXRanges.push({ val: bounce.impactX, prog: startProg });
      translateXRanges.push({ val: bounce.bounceX, prog: endProg });

      // TranslateY animation
      translateYRanges.push({ val: bounce.impactY, prog: startProg });
      translateYRanges.push({ val: bounce.bounceY, prog: endProg });

      // Squash and stretch on impact
      scaleXRanges.push({ val: 1, prog: startProg });
      scaleXRanges.push({ val: 1.2, prog: impactProg }); // Squash horizontally
      scaleXRanges.push({ val: 1, prog: endProg });

      scaleYRanges.push({ val: 1, prog: startProg });
      scaleYRanges.push({ val: 0.8, prog: impactProg }); // Stretch vertically
      scaleYRanges.push({ val: 1, prog: endProg });

      // Rotation animation
      if (spinOnBounce) {
        rotateRanges.push({ val: bounce.spinAngle, prog: endProg });
      }
    });

    // Ensure starting values
    if (rotateRanges.length > 0) {
      rotateRanges.unshift({ val: 0, prog: 0 });
    }

    return {
      translateX: translateXRanges,
      translateY: translateYRanges,
      scaleX: scaleXRanges,
      scaleY: scaleYRanges,
      rotate: rotateRanges,
    };
  };

  // Calculate physics simulation
  const bounceData = calculateBouncePhysics(
    params.gridCellSize,
    params.bounciness,
    params.friction,
    params.gravity,
    params.numberOfBounces,
  );

  // Generate animation ranges
  const ranges = calculateBounceRanges(bounceData, params.spinOnBounce);

  // Create effects for each target component
  const effects = params.targetIds.map((targetId, index) => {
    const effectData: GenericEffectData = {
      type: 'ease-out', // Bounce easing for realistic physics
      start: 0,
      duration: params.duration / 1000, // Convert ms to seconds
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        ...ranges.translateX.map((r) => ({ key: 'translateX', ...r })),
        ...ranges.translateY.map((r) => ({ key: 'translateY', ...r })),
        ...ranges.scaleX.map((r) => ({ key: 'scaleX', ...r })),
        ...ranges.scaleY.map((r) => ({ key: 'scaleY', ...r })),
        ...(params.spinOnBounce
          ? ranges.rotate.map((r) => ({ key: 'rotate', ...r }))
          : []),
      ],
    };

    return {
      id:
        params.effectId
          ? `${params.effectId}-${targetId}-${index}`
          : `grid-collision-bounce-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Create container with effects
  const rootContainer: RenderableComponentData = {
    id: 'grid-collision-bounce-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          // Minimal container - effects are applied via provider mode
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: (params.duration * params.numberOfBounces) / 1000,
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      // Extract effects for internal preset usage
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'GridCollisionBounce',
  title: 'Grid Collision Bounce Effect',
  description:
    'Internal effect preset that generates physics-based collision bounce effects for elements interacting with grid boundaries. Calculates velocity, collision detection, bounce angles, and applies squash-and-stretch deformation. Returns effect definitions in provider mode with targetIds to apply transformations directly to target components without wrapper divs.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'physics',
    'collision',
    'bounce',
    'grid',
    'generic',
    'internal',
    'squash-stretch',
    'animation',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    gridCellSize: 60,
    bounciness: 0.6,
    friction: 0.2,
    gravity: undefined,
    spinOnBounce: true,
    targetIds: ['target-component-1'],
    duration: 500,
    numberOfBounces: 3,
  },
};

export const GridCollisionBouncePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
