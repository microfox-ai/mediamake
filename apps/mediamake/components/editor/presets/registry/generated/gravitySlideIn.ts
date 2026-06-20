/**
 * Gravity Slide-In Physics Effect Preset
 *
 * This INTERNAL EFFECT PRESET simulates realistic gravitational physics for sliding elements
 * into position. It creates animations where elements fall from above or rise from below
 * with proper acceleration, bounce physics, and friction.
 *
 * Features:
 * - **Realistic Physics**: Parabolic trajectories using kinematic equations (s = ut + 0.5at²)
 * - **Bounce Mechanics**: Energy loss with configurable damping (0.3-0.8)
 * - **Friction**: Horizontal velocity decay over bounces
 * - **Rotation**: Angular velocity proportional to horizontal speed for tumbling effect
 * - **Dust Effects**: Optional box-shadow animations at bounce impact points
 * - **Configurable Gravity**: Adjustable gravity constant (default: 9.8 m/s², Earth-like)
 * - **Initial Conditions**: Custom starting position and velocity vectors
 * - **Bounce Control**: Limit maximum number of bounces (1-5)
 *
 * Physics Implementation:
 * - Y-position: s = ut + 0.5at² for each bounce segment
 * - X-position: Linear motion with friction deceleration
 * - Rotation: ω = v_x * rotationFactor
 * - Bounce velocity: v_new = -v_old * bounceDamping
 * - Generates 15-20 keyframes for smooth physics simulation
 *
 * Use cases:
 * - Elements falling into place with realistic bounce
 * - Rising elements from below with gravity simulation
 * - Dynamic entry animations with physics-based motion
 * - Projectile-style animations with parabolic paths
 *
 * SINGLE EFFECT OUTPUT
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  gravity: z
    .number()
    .default(9.8)
    .describe('Gravitational acceleration in m/s² (9.8 = Earth, adjust for different planets)'),
  initialPosition: z
    .object({
      x: z.number().describe('Initial X position in pixels'),
      y: z.number().describe('Initial Y position in pixels'),
    })
    .describe('Starting position of the element (x, y coordinates)'),
  initialVelocity: z
    .object({
      x: z.number().default(0).describe('Initial horizontal velocity in pixels/second'),
      y: z.number().default(0).describe('Initial vertical velocity in pixels/second'),
    })
    .optional()
    .describe('Initial velocity vector (default: {x: 0, y: 0})'),
  bounceDamping: z
    .number()
    .min(0.3)
    .max(0.8)
    .default(0.6)
    .describe('Energy loss factor on bounce (0.3 = high loss, 0.8 = minimal loss)'),
  friction: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Horizontal friction coefficient (0 = no friction, 1 = maximum friction)'),
  maxBounces: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Maximum number of bounces before settling'),
  includeDust: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include dust effect (box-shadow) at bounce impact points'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the gravity effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z
    .number()
    .optional()
    .describe('Duration of the effect (auto-calculated if not provided)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Physics helper functions (must be defined inside presetExecution)
  const calculatePhysics = (
    gravity: number,
    initialPos: { x: number; y: number },
    initialVel: { x: number; y: number },
    damping: number,
    friction: number,
    maxBounces: number,
  ) => {
    const fps = 30; // Assume 30 fps for calculations
    const dt = 1 / fps; // Time step
    const pixelsPerMeter = 100; // Scale factor for visual consistency
    const g = (gravity * pixelsPerMeter) / (fps * fps); // Gravity per frame squared

    interface PhysicsState {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rotation: number;
      time: number;
    }

    const states: PhysicsState[] = [];
    let x = initialPos.x;
    let y = initialPos.y;
    let vx = initialVel.x / fps;
    let vy = initialVel.y / fps;
    let rotation = 0;
    let bounces = 0;
    let time = 0;

    const groundY = 0; // Final resting position
    const rotationFactor = 0.5; // Rotation proportional to horizontal velocity

    // Simulate physics for up to 10 seconds or until settled
    const maxFrames = Math.min(300, fps * 10);
    for (let frame = 0; frame < maxFrames; frame++) {
      // Store current state
      states.push({ x, y, vx, vy, rotation, time });

      // Apply gravity to vertical velocity
      vy += g;

      // Update position (kinematic equation)
      x += vx;
      y += vy;

      // Update rotation based on horizontal velocity
      rotation += vx * rotationFactor;

      // Apply friction to horizontal velocity
      vx *= 1 - friction * 0.01;

      // Check for bounce
      if (y >= groundY && vy > 0) {
        if (bounces < maxBounces) {
          // Bounce: reverse and dampen vertical velocity
          vy = -vy * damping;
          y = groundY; // Snap to ground

          // Apply friction to horizontal velocity on bounce
          vx *= 1 - friction;

          bounces++;
        } else {
          // Settle on ground
          y = groundY;
          vy = 0;
          vx = 0;

          // Add a few more frames at rest
          for (let i = 0; i < 10; i++) {
            states.push({ x, y, vx, vy, rotation, time: time + i * dt });
          }
          break;
        }
      }

      time += dt;

      // Check if motion has nearly stopped
      if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1 && Math.abs(y - groundY) < 1) {
        y = groundY;
        for (let i = 0; i < 5; i++) {
          states.push({ x, y, vx: 0, vy: 0, rotation, time: time + i * dt });
        }
        break;
      }
    }

    return states;
  };

  const generateKeyframes = (
    states: Array<{ x: number; y: number; rotation: number; time: number }>,
    totalDuration: number,
    includeDust: boolean,
  ) => {
    const ranges = [];

    // Sample states to create 15-20 keyframes
    const targetKeyframes = Math.min(20, Math.max(15, states.length));
    const step = Math.max(1, Math.floor(states.length / targetKeyframes));

    for (let i = 0; i < states.length; i += step) {
      const state = states[i];
      const prog = Math.min(1, state.time / totalDuration);

      // TranslateX
      ranges.push({ key: 'translateX', val: state.x, prog });
      // TranslateY (negative because positive Y is down in screen coordinates)
      ranges.push({ key: 'translateY', val: -state.y, prog });
      // Rotation
      ranges.push({ key: 'rotate', val: state.rotation, prog });

      // Dust effect at bounce points (detect when Y changes direction)
      if (includeDust && i > 0) {
        const prevState = states[i - step] || states[i - 1];
        const isBounce =
          prevState.y > state.y + 5 && Math.abs(state.y) < 5;

        if (isBounce) {
          // Add box-shadow burst at bounce
          ranges.push({
            key: 'boxShadow',
            val: '0 0 30px 15px rgba(139, 92, 46, 0.6)',
            prog,
          });
          // Fade out dust quickly
          if (i + step < states.length) {
            const nextProg = Math.min(
              1,
              states[i + step].time / totalDuration,
            );
            ranges.push({
              key: 'boxShadow',
              val: '0 0 0px 0px rgba(139, 92, 46, 0)',
              prog: nextProg,
            });
          }
        }
      }
    }

    // Ensure final state is included
    const finalState = states[states.length - 1];
    ranges.push({ key: 'translateX', val: finalState.x, prog: 1 });
    ranges.push({ key: 'translateY', val: -finalState.y, prog: 1 });
    ranges.push({ key: 'rotate', val: finalState.rotation, prog: 1 });

    return ranges;
  };

  // Extract parameters
  const gravity = params.gravity;
  const initialPosition = params.initialPosition;
  const initialVelocity = params.initialVelocity || { x: 0, y: 0 };
  const bounceDamping = params.bounceDamping;
  const friction = params.friction;
  const maxBounces = params.maxBounces;
  const includeDust = params.includeDust || false;
  const targetIds = params.targetIds;
  const effectStart = params.effectStart;

  // Calculate physics simulation
  const physicsStates = calculatePhysics(
    gravity,
    initialPosition,
    initialVelocity,
    bounceDamping,
    friction,
    maxBounces,
  );

  // Calculate total duration from physics simulation
  const calculatedDuration =
    physicsStates[physicsStates.length - 1]?.time || 2;
  const effectDuration = params.effectDuration || calculatedDuration;

  // Generate keyframes from physics states
  const ranges = generateKeyframes(physicsStates, effectDuration, includeDust);

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear interpolation for physics accuracy
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  // Create effect object
  const effect = {
    id: params.effectId || `gravity-slide-in-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'gravity-slide-in-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                zIndex: -1,
              },
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
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
  id: 'gravitySlideIn',
  title: 'Gravity Slide-In Physics Effect',
  description:
    'Internal effect preset that simulates realistic gravitational physics for sliding elements into position. Creates animations with proper acceleration, bounce physics, friction, and optional dust effects at impact points. Returns effect data structure for use in other presets.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'physics', 'gravity', 'bounce', 'animation'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    gravity: 9.8,
    initialPosition: { x: 0, y: -500 },
    initialVelocity: { x: 50, y: 0 },
    bounceDamping: 0.6,
    friction: 0.1,
    maxBounces: 3,
    includeDust: true,
    targetIds: ['target-component'],
    effectStart: 0,
  },
};

export const gravitySlideInPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
