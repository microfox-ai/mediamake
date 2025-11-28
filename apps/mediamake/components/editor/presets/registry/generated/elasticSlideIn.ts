/**
 * Elastic Slide-In Internal Effect Preset
 *
 * ARRAY OF EFFECTS (1 effect)
 *
 * This internal effect preset uses spring physics simulation to create natural, bouncy
 * slide-in animations with overshoot and settling oscillation. The effect simulates
 * elastic motion with realistic physics calculations based on spring tension and damping.
 *
 * Features:
 * - **Spring Physics Simulation**: Damped harmonic oscillator equation for realistic motion
 * - **Configurable Spring Parameters**: Tension (50-200), damping (5-20), initial velocity
 * - **Directional Slide**: Any angle (0-360 degrees) for slide direction
 * - **Overshoot Control**: Adjustable overshoot amount (1.0-1.3) for bouncy feel
 * - **Dynamic Rotation**: Subtle rotation correlated with slide velocity for added dynamism
 * - **Optional Motion Blur**: Trail effect during rapid movement phases
 * - **Physics-Based Keyframes**: 8-12 progression points including overshoot and settling
 *
 * Physics:
 * - Uses damped harmonic oscillator: x(t) = e^(-ζωt) * [A*cos(ωd*t) + B*sin(ωd*t)]
 * - Calculates natural frequency (ω) from spring tension
 * - Computes damped frequency (ωd) and damping ratio (ζ) from damping
 * - Generates settling time based on physics to ensure smooth completion
 *
 * Use cases:
 * - Playful UI element entrances with bounce
 * - Dynamic text reveals with overshoot
 * - Engaging card/image animations with spring physics
 * - Natural motion for interactive components
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the elastic slide-in effect to'),
  effectStart: z
    .number()
    .describe('Start time of the effect (seconds, relative to parent)'),
  springTension: z
    .number()
    .min(50)
    .max(200)
    .default(100)
    .describe('Spring tension for physics (50-200, higher = faster return)'),
  springDamping: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Spring damping for physics (5-20, higher = less oscillation)'),
  initialVelocity: z
    .number()
    .min(-100)
    .max(100)
    .default(0)
    .describe('Initial velocity of spring (-100 to 100, affects initial motion)'),
  slideAngle: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe('Angle for slide direction (0-360 degrees, 0=right, 90=down, 180=left, 270=up)'),
  overshootAmount: z
    .number()
    .min(1)
    .max(1.3)
    .default(1.15)
    .describe('Amount of overshoot past target (1.0-1.3, higher = more bounce)'),
  includeTrail: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include motion blur trail effect during rapid movement'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (defaults to elastic-slide-{targetId})'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Spring physics calculation helper
  const calculateSpringPhysics = (
    tension: number,
    damping: number,
    velocity: number,
    overshoot: number,
  ) => {
    // Natural frequency (ω₀) from tension
    const mass = 1; // Normalized mass
    const omega0 = Math.sqrt(tension / mass);

    // Damping ratio (ζ)
    const criticalDamping = 2 * Math.sqrt(tension * mass);
    const dampingRatio = damping / criticalDamping;

    // Damped frequency (ωd)
    const omegaD = omega0 * Math.sqrt(1 - dampingRatio * dampingRatio);

    // Settling time (when amplitude < 2% of initial)
    const settlingTime = 4 / (dampingRatio * omega0);

    // Time to reach overshoot peak (first oscillation peak)
    const timeToOvershoot = Math.PI / omegaD;

    return {
      omega0,
      omegaD,
      dampingRatio,
      settlingTime,
      timeToOvershoot,
    };
  };

  // Damped harmonic oscillator position function
  const springPosition = (
    t: number,
    physics: ReturnType<typeof calculateSpringPhysics>,
    initialVel: number,
    overshoot: number,
  ) => {
    const { omega0, omegaD, dampingRatio } = physics;
    const exponentialDecay = Math.exp(-dampingRatio * omega0 * t);

    // Initial conditions: x(0) = -1 (start off-screen), v(0) = initialVel
    const A = -1; // Initial displacement (negative = off-screen)
    const B = (initialVel + dampingRatio * omega0 * A) / omegaD;

    // Position: x(t) = e^(-ζω₀t) * [A*cos(ωd*t) + B*sin(ωd*t)]
    const position =
      exponentialDecay * (A * Math.cos(omegaD * t) + B * Math.sin(omegaD * t));

    // Scale to include overshoot
    return position * overshoot;
  };

  // Calculate physics parameters
  const physics = calculateSpringPhysics(
    params.springTension,
    params.springDamping,
    params.initialVelocity,
    params.overshootAmount,
  );

  // Duration is the settling time
  const effectDuration = physics.settlingTime;

  // Generate 10 keyframe progression points for smooth animation
  const numKeyframes = 10;
  const progressionPoints: number[] = [];
  for (let i = 0; i <= numKeyframes; i++) {
    progressionPoints.push(i / numKeyframes);
  }

  // Convert slide angle to radians and calculate direction components
  const angleRad = (params.slideAngle * Math.PI) / 180;
  const dirX = Math.cos(angleRad);
  const dirY = Math.sin(angleRad);

  // Starting distance (off-screen by 100% of viewport dimension)
  const startDistance = 100;

  // Build translateX and translateY ranges with spring physics
  const translateXRanges = progressionPoints.map((prog) => {
    const t = prog * effectDuration;
    const springPos = springPosition(t, physics, params.initialVelocity, params.overshootAmount);
    // Convert spring position (-1 to 0+overshoot) to pixel values
    const pixelValue = springPos * startDistance * dirX;
    return { key: 'translateX', val: pixelValue, prog };
  });

  const translateYRanges = progressionPoints.map((prog) => {
    const t = prog * effectDuration;
    const springPos = springPosition(t, physics, params.initialVelocity, params.overshootAmount);
    const pixelValue = springPos * startDistance * dirY;
    return { key: 'translateY', val: pixelValue, prog };
  });

  // Calculate rotation correlated with velocity (derivative of position)
  const maxRotation = 5; // degrees
  const rotationRanges = [
    { key: 'rotate', val: 0, prog: 0 },
    {
      key: 'rotate',
      val: maxRotation * (params.initialVelocity / 100),
      prog: 0.3,
    },
    {
      key: 'rotate',
      val: -maxRotation * 0.3 * (params.initialVelocity / 100),
      prog: 0.6,
    },
    { key: 'rotate', val: 0, prog: 1 },
  ];

  // Optional motion blur trail effect
  const blurRanges = params.includeTrail
    ? [
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: 'blur(4px)', prog: 0.2 },
        { key: 'filter', val: 'blur(2px)', prog: 0.8 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ]
    : [];

  // Combine all ranges
  const allRanges = [
    ...translateXRanges,
    ...translateYRanges,
    ...rotationRanges,
    ...blurRanges,
  ];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear interpolation since physics is pre-calculated
    start: params.effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: allRanges,
  };

  const effect = {
    id: params.effectId || `elastic-slide-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'elastic-slide-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration + params.effectStart,
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
  id: 'elasticSlideIn',
  title: 'Elastic Slide-In Effect',
  description:
    'Internal effect preset that uses spring physics simulation for natural, bouncy slide-in animations with overshoot and settling. Creates playful entrances for UI elements with configurable spring tension, damping, initial velocity, slide angle, and optional motion blur trail.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'spring', 'physics', 'slide', 'bounce', 'elastic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    springTension: 100,
    springDamping: 10,
    initialVelocity: 0,
    slideAngle: 0,
    overshootAmount: 1.15,
    includeTrail: false,
  },
};

export const elasticSlideInPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
