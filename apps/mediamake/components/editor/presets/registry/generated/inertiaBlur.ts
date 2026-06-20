/**
 * Inertia Blur Internal Effect Preset
 *
 * This internal preset generates a physics-based motion blur effect that simulates realistic
 * momentum, drag, overshoot, and elastic settling. The effect uses spring physics calculations
 * to create natural-feeling motion blur that builds and dissipates based on simulated inertia.
 *
 * Features:
 * - **Spring Physics Simulation**: Calculates velocity curves with mass, drag, and elasticity
 * - **Motion Blur**: Dynamic blur that follows velocity magnitude
 * - **Velocity-Based Stretch**: Subtle scaleX/Y stretch in direction of motion
 * - **Motion Lean**: Rotation that leans into the direction of movement
 * - **Direction Change Distortion**: SkewX distortion during velocity direction changes
 * - **Configurable Physics**: Mass, drag coefficient, initial velocity, and elasticity parameters
 *
 * Physics Model:
 * - Uses semi-implicit Euler integration for stability
 * - Applies drag force: F_drag = -drag * velocity
 * - Applies spring force with elasticity: F_spring = -k * position + damping * velocity
 * - Calculates acceleration from forces and mass: a = F / mass
 * - Updates velocity and position each time step
 *
 * Output:
 * - Returns a single generic effect with physics-based AnimationRange arrays
 * - Effect applies blur, scale, rotation, and skew transformations
 * - All properties animated with spring physics easing
 *
 * Use cases:
 * - Creating realistic motion blur for moving elements
 * - Simulating physical momentum in animations
 * - Adding natural overshoot and settling to transitions
 * - Building physics-based UI animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData, AnimationRange } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the inertia blur effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to component, in seconds)'),
  duration: z
    .number()
    .default(2.5)
    .describe('Duration of the physics simulation and effect (in seconds)'),
  mass: z
    .number()
    .min(0.1)
    .max(10)
    .default(1)
    .describe('Mass of the simulated object (affects inertia and momentum)'),
  drag: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Drag coefficient (resistance, 0 = no drag, 1 = maximum drag)'),
  initialVelocity: z
    .number()
    .default(100)
    .describe('Initial velocity magnitude (pixels/second or arbitrary units)'),
  elasticity: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe(
      'Elasticity/spring stiffness (controls overshoot and bounce, 0 = no bounce, 2 = high bounce)',
    ),
  distortionAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe(
      'Amount of skew distortion during direction changes (0 = none, 1 = maximum)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the generated effect'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // --- Physics Simulation Helper ---
  const simulatePhysics = (
    mass: number,
    drag: number,
    initialVelocity: number,
    elasticity: number,
    duration: number,
    timeStep: number = 1 / 60, // 60fps simulation
  ) => {
    const steps = Math.ceil(duration / timeStep);
    const simulation: Array<{
      time: number;
      position: number;
      velocity: number;
      acceleration: number;
    }> = [];

    let position = 0;
    let velocity = initialVelocity;
    let time = 0;

    // Spring physics constants
    const springStiffness = elasticity * 50; // Scale elasticity to spring constant
    const dampingRatio = 0.6; // Critical damping ratio for smooth settling
    const dampingCoefficient = dampingRatio * 2 * Math.sqrt(springStiffness * mass);

    for (let i = 0; i <= steps; i++) {
      // Record current state
      simulation.push({
        time,
        position,
        velocity,
        acceleration: 0, // Will be calculated
      });

      // Calculate forces
      const dragForce = -drag * velocity * 10; // Scale drag for visible effect
      const springForce = -springStiffness * position;
      const dampingForce = -dampingCoefficient * velocity;

      // Total force and acceleration
      const totalForce = dragForce + springForce + dampingForce;
      const acceleration = totalForce / mass;

      // Update velocity and position (semi-implicit Euler)
      velocity += acceleration * timeStep;
      position += velocity * timeStep;

      // Update time
      time += timeStep;
    }

    return simulation;
  };

  // --- Run Physics Simulation ---
  const simulation = simulatePhysics(
    params.mass,
    params.drag,
    params.initialVelocity,
    params.elasticity,
    params.duration,
  );

  // --- Calculate Max Values for Normalization ---
  const maxVelocityMagnitude = Math.max(
    ...simulation.map((s) => Math.abs(s.velocity)),
  );
  const maxPositionMagnitude = Math.max(
    ...simulation.map((s) => Math.abs(s.position)),
  );

  // --- Generate Animation Ranges from Simulation ---
  const blurRanges: AnimationRange[] = [];
  const scaleXRanges: AnimationRange[] = [];
  const scaleYRanges: AnimationRange[] = [];
  const rotateRanges: AnimationRange[] = [];
  const skewXRanges: AnimationRange[] = [];

  // Sample keyframes from simulation (every 3-5 frames for smooth curves)
  const sampleInterval = Math.max(1, Math.floor(simulation.length / 30)); // ~30 keyframes

  for (let i = 0; i < simulation.length; i += sampleInterval) {
    const state = simulation[i];
    const progress = state.time / params.duration;

    // Normalize velocity and position
    const velocityNorm =
      maxVelocityMagnitude > 0 ? state.velocity / maxVelocityMagnitude : 0;
    const positionNorm =
      maxPositionMagnitude > 0 ? state.position / maxPositionMagnitude : 0;

    // Calculate blur based on velocity magnitude
    const blurAmount = Math.abs(velocityNorm) * 10; // 0-10px blur range
    blurRanges.push({
      key: 'filter',
      val: `blur(${blurAmount.toFixed(2)}px)`,
      prog: progress,
    });

    // Calculate stretch based on velocity direction
    const stretchFactor = 1 + Math.abs(velocityNorm) * 0.15; // 1.0 to 1.15 scale
    const compressFactor = 1 - Math.abs(velocityNorm) * 0.08; // 1.0 to 0.92 scale

    if (velocityNorm > 0) {
      // Moving forward - stretch horizontally
      scaleXRanges.push({ key: 'scaleX', val: stretchFactor, prog: progress });
      scaleYRanges.push({ key: 'scaleY', val: compressFactor, prog: progress });
    } else {
      // Moving backward - compress horizontally
      scaleXRanges.push({
        key: 'scaleX',
        val: compressFactor,
        prog: progress,
      });
      scaleYRanges.push({ key: 'scaleY', val: stretchFactor, prog: progress });
    }

    // Calculate rotation lean based on velocity
    const rotationDegrees = velocityNorm * 8; // -8° to +8° lean
    rotateRanges.push({
      key: 'rotate',
      val: rotationDegrees,
      prog: progress,
    });

    // Calculate skew distortion during direction changes
    // Use derivative of velocity (acceleration) as indicator of direction change
    let skewAmount = 0;
    if (i > 0 && i < simulation.length - 1) {
      const prevVelocity = simulation[i - sampleInterval]?.velocity || 0;
      const nextVelocity = simulation[i + sampleInterval]?.velocity || state.velocity;
      const velocityChange = nextVelocity - prevVelocity;
      // Normalize velocity change
      const velocityChangeMagnitude = Math.abs(velocityChange) / maxVelocityMagnitude;
      skewAmount = velocityChangeMagnitude * params.distortionAmount * 15; // 0-15deg skew
      
      // Apply skew in direction of change
      if (velocityChange < 0) {
        skewAmount = -skewAmount;
      }
    }
    skewXRanges.push({
      key: 'skewX',
      val: skewAmount,
      prog: progress,
    });
  }

  // Add final keyframe at progress 1.0 (settled state)
  const finalState = simulation[simulation.length - 1];
  blurRanges.push({ key: 'filter', val: 'blur(0px)', prog: 1.0 });
  scaleXRanges.push({ key: 'scaleX', val: 1, prog: 1.0 });
  scaleYRanges.push({ key: 'scaleY', val: 1, prog: 1.0 });
  rotateRanges.push({ key: 'rotate', val: 0, prog: 1.0 });
  skewXRanges.push({ key: 'skewX', val: 0, prog: 1.0 });

  // --- Combine All Ranges ---
  const allRanges: AnimationRange[] = [
    ...blurRanges,
    ...scaleXRanges,
    ...scaleYRanges,
    ...rotateRanges,
    ...skewXRanges,
  ];

  // --- Construct Effect Data ---
  const effectData: GenericEffectData = {
    type: 'spring', // Use spring easing for natural physics feel
    start: params.effectStart,
    duration: params.duration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: allRanges,
  };

  // --- Create Effect Object ---
  const effect = {
    id: params.effectId || `inertia-blur-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // --- Return Output Structure ---
  const rootContainer: RenderableComponentData = {
    id: 'inertia-blur-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    effects: [effect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: [effect], // Mark for extraction by internal preset system
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'inertiaBlur',
  title: 'Inertia Blur Effect',
  description:
    'Internal effect preset that generates physics-based motion blur using spring dynamics. Simulates realistic momentum, drag, overshoot, and elastic settling with velocity-driven blur, stretch, rotation, and distortion effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'motion-blur',
    'physics',
    'spring',
    'inertia',
    'momentum',
    'internal',
    'generic',
  ],
  _internalPreset: true, // Mark as internal preset
  _internalPresetOutput: 'effects', // Extract effects from output
  dependencies: {},
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    duration: 2.5,
    mass: 1,
    drag: 0.3,
    initialVelocity: 100,
    elasticity: 0.5,
    distortionAmount: 0.15,
  },
};

// --- Export Preset ---

export const inertiaBlurPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
