/**
 * BouncePath Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates realistic bouncing motion along a curved path with physics-based calculations.
 * Simulates a ball bouncing across the screen with parabolic arcs, decreasing bounce height
 * (gravity simulation), squash-and-stretch deformation at impact points, and subtle rotation
 * during flight phases.
 *
 * Features:
 * - Physics-based bounce calculations using gravity, initial velocity, and elasticity
 * - Parabolic vertical motion with decreasing amplitude per bounce
 * - Linear horizontal progression across the screen
 * - Squash-and-stretch deformation at impact points (scaleY compression, scaleX expansion)
 * - Volume preservation (scaleX inverse of scaleY)
 * - Slight rotation during flight phases for natural motion
 * - Configurable bounce count, gravity strength, initial velocity, and elasticity
 *
 * Use cases:
 * - Creating playful bouncing animations for UI elements
 * - Adding physics-based motion to text or images
 * - Building dynamic transitions with realistic bounce effects
 * - Creating engaging animations for social media content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData, AnimationRange } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of the components to apply bounce effect to'),
  bounceCount: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of bounces (1-5)'),
  gravity: z
    .number()
    .default(9.8)
    .describe('Gravity strength (higher = faster fall, typical Earth gravity is 9.8)'),
  initialVelocity: z
    .number()
    .default(10)
    .describe('Initial upward velocity (higher = higher first bounce)'),
  elasticity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Energy retention per bounce (0.1-1, where 1 = no energy loss)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the bounce effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(3)
    .describe('Total duration of the bounce effect'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate bounce physics
  const calculateBouncePhysics = () => {
    const { bounceCount, gravity, initialVelocity, elasticity, effectDuration } = params;
    
    // Physics calculations
    const bounces: Array<{
      startTime: number;
      peakTime: number;
      impactTime: number;
      height: number;
      velocity: number;
    }> = [];

    let currentTime = 0;
    let currentVelocity = initialVelocity;

    for (let i = 0; i < bounceCount; i++) {
      // Time to reach peak: v = v0 - g*t, when v=0, t = v0/g
      const timeToApex = currentVelocity / gravity;
      
      // Height at peak: h = v0*t - 0.5*g*t^2
      const height = currentVelocity * timeToApex - 0.5 * gravity * timeToApex * timeToApex;
      
      // Time for full arc (up and down)
      const arcDuration = 2 * timeToApex;

      const bounce = {
        startTime: currentTime,
        peakTime: currentTime + timeToApex,
        impactTime: currentTime + arcDuration,
        height: height,
        velocity: currentVelocity,
      };

      bounces.push(bounce);

      // Update for next bounce
      currentTime += arcDuration;
      currentVelocity = currentVelocity * elasticity; // Energy loss

      // Safety check: stop if remaining time is insufficient
      if (currentTime >= effectDuration) break;
    }

    return { bounces, totalCalculatedTime: currentTime };
  };

  // Calculate physics
  const { bounces, totalCalculatedTime } = calculateBouncePhysics();
  
  // Normalize time to fit within effectDuration
  const timeScale = params.effectDuration / Math.max(totalCalculatedTime, params.effectDuration);

  // Build animation ranges
  const translateXRanges: AnimationRange[] = [];
  const translateYRanges: AnimationRange[] = [];
  const scaleXRanges: AnimationRange[] = [];
  const scaleYRanges: AnimationRange[] = [];
  const rotateRanges: AnimationRange[] = [];

  // Horizontal progression (linear)
  translateXRanges.push(
    { key: 'translateX', val: 0, prog: 0 },
    { key: 'translateX', val: 300, prog: 1 } // Move 300px to the right
  );

  // Build vertical motion, squash/stretch, and rotation for each bounce
  bounces.forEach((bounce, index) => {
    const startProg = (bounce.startTime * timeScale) / params.effectDuration;
    const peakProg = (bounce.peakTime * timeScale) / params.effectDuration;
    const impactProg = (bounce.impactTime * timeScale) / params.effectDuration;

    // Clamp progress values to [0, 1]
    const clampedStartProg = Math.max(0, Math.min(1, startProg));
    const clampedPeakProg = Math.max(0, Math.min(1, peakProg));
    const clampedImpactProg = Math.max(0, Math.min(1, impactProg));

    // Vertical motion (parabolic arc)
    // Start at ground (translateY = 0)
    translateYRanges.push({
      key: 'translateY',
      val: 0,
      prog: clampedStartProg,
    });

    // Peak of bounce (negative translateY = upward)
    const peakHeight = -bounce.height * 50; // Scale height to pixels
    translateYRanges.push({
      key: 'translateY',
      val: peakHeight,
      prog: clampedPeakProg,
    });

    // Impact (back to ground)
    translateYRanges.push({
      key: 'translateY',
      val: 0,
      prog: clampedImpactProg,
    });

    // Squash and stretch at impact
    // Normal scale during flight
    scaleYRanges.push({ key: 'scaleY', val: 1, prog: clampedStartProg });
    scaleXRanges.push({ key: 'scaleX', val: 1, prog: clampedStartProg });

    // Slightly stretched during ascent/descent
    const midFlightProg = (clampedStartProg + clampedPeakProg) / 2;
    scaleYRanges.push({ key: 'scaleY', val: 1.1, prog: midFlightProg });
    scaleXRanges.push({ key: 'scaleX', val: 0.95, prog: midFlightProg });

    scaleYRanges.push({ key: 'scaleY', val: 1, prog: clampedPeakProg });
    scaleXRanges.push({ key: 'scaleX', val: 1, prog: clampedPeakProg });

    // Compressed at impact (squash)
    const squashAmount = 0.6 - index * 0.05; // Less squash on later bounces
    const stretchAmount = 1 / squashAmount; // Volume preservation
    scaleYRanges.push({ key: 'scaleY', val: squashAmount, prog: clampedImpactProg });
    scaleXRanges.push({ key: 'scaleX', val: stretchAmount, prog: clampedImpactProg });

    // Rotation during flight
    // Rotate slightly during ascent
    rotateRanges.push({ key: 'rotate', val: 0, prog: clampedStartProg });
    const rotationAmount = 15 - index * 3; // Less rotation on later bounces
    rotateRanges.push({ key: 'rotate', val: rotationAmount, prog: clampedPeakProg });
    rotateRanges.push({ key: 'rotate', val: rotationAmount * 2, prog: clampedImpactProg });
  });

  // Final state (resting)
  translateYRanges.push({ key: 'translateY', val: 0, prog: 1 });
  scaleYRanges.push({ key: 'scaleY', val: 1, prog: 1 });
  scaleXRanges.push({ key: 'scaleX', val: 1, prog: 1 });
  rotateRanges.push({ key: 'rotate', val: bounces.length * 15, prog: 1 });

  // Combine all ranges
  const allRanges: AnimationRange[] = [
    ...translateXRanges,
    ...translateYRanges,
    ...scaleXRanges,
    ...scaleYRanges,
    ...rotateRanges,
  ];

  // Create generic effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: allRanges,
  };

  // Create effect
  const effect = {
    id: params.effectId || `bounce-path-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'bounce-path-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration,
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
  id: 'BouncePath',
  title: 'Bounce Path Effect',
  description:
    'Creates realistic bouncing motion along a curved path with physics-based calculations. Simulates a ball bouncing across the screen with parabolic arcs, decreasing bounce height, squash-and-stretch deformation at impact points, and subtle rotation during flight. Accepts parameters for bounce count, gravity strength, initial velocity, and elasticity to control energy retention per bounce.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'bounce', 'physics', 'motion', 'animation', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    bounceCount: 3,
    gravity: 9.8,
    initialVelocity: 10,
    elasticity: 0.7,
    effectStart: 0,
    effectDuration: 3,
  },
};

export const BouncePathPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
