/**
 * Magnetic Slide-In Internal Effect Preset
 *
 * This internal effect preset simulates magnetic attraction physics where elements
 * accelerate as they approach their final position, creating a "snapping" feel.
 * The animation starts slowly with resistance, rapidly accelerates in the middle,
 * and snaps into place with a subtle "squash" effect for enhanced physicality.
 *
 * Features:
 * - **Magnetic Physics**: Uses inverse square law for acceleration calculations
 * - **Custom Easing**: Progressive keyframes simulate magnetic field strength
 * - **Pull Direction**: Configurable angle for slide-in direction (degrees)
 * - **Resistance Zone**: Portion of animation with initial resistance
 * - **Snap Speed**: Final acceleration multiplier for the snap effect
 * - **Squash Effect**: Subtle scale deformation (0.95-1.05) at contact moment
 * - **Optional Trail**: Particle trail via CSS box-shadows during acceleration
 *
 * Technical implementation:
 * - Animation progresses through distinct phases: resistance → acceleration → snap
 * - Uses custom progress values: [0, 0.1, 0.3, 0.5, 0.7, 0.85, 0.95, 1]
 * - translateX/Y calculated using inverse square law: acceleration = magnetStrength / (distance^2)
 * - Scale squash at prog [0.7, 0.85, 0.92, 1] with val [1, 1, 0.95, 1.05, 1]
 *
 * Use cases:
 * - Creating dynamic UI element entrances with magnetic feel
 * - Building physically-inspired animations for social media
 * - Adding energy to text or image reveals
 * - Creating attention-grabbing motion for CTAs or titles
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  magnetStrength: z
    .number()
    .min(0.1)
    .max(1.0)
    .default(0.5)
    .describe(
      'Magnetic attraction strength (0.1-1.0). Higher values create stronger acceleration.',
    ),
  pullDistance: z
    .number()
    .default(200)
    .describe(
      'Initial distance from target position in pixels. Element starts this far away.',
    ),
  pullDirection: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .describe(
      'Angle in degrees for pull direction (0=right, 90=down, 180=left, 270=up).',
    ),
  resistanceZone: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .describe(
      'Portion of animation with resistance (0-0.5). Defines slow-start phase duration.',
    ),
  snapSpeed: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .describe(
      'Final acceleration multiplier (1-3). Higher values create sharper snap effect.',
    ),
  includeTrail: z
    .boolean()
    .optional()
    .describe(
      'Include particle trail effect via CSS box-shadows during acceleration.',
    ),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the magnetic effect to.'),
  duration: z
    .number()
    .default(1.2)
    .describe('Duration of the magnetic slide-in animation in seconds.'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent component.'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the magnetic effect.'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    magnetStrength,
    pullDistance,
    pullDirection,
    resistanceZone,
    snapSpeed,
    includeTrail,
    targetIds,
    duration,
    effectStart,
    effectId,
  } = params;

  // Helper: Calculate position offset from angle
  const calculateOffset = (
    distance: number,
    angle: number,
  ): { x: number; y: number } => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance,
    };
  };

  // Helper: Calculate magnetic acceleration (inverse square law)
  const calculateMagneticValue = (
    progress: number,
    initialDistance: number,
    strength: number,
    snapMultiplier: number,
  ): number => {
    // Distance from target (decreases as progress increases)
    const currentDistance = initialDistance * (1 - progress);

    // Inverse square law: acceleration = strength / distance^2
    // Clamp to prevent division by zero
    const distance = Math.max(currentDistance, 0.01);
    const acceleration = strength / (distance * distance);

    // Apply snap multiplier in final phase
    const finalMultiplier = progress > 0.85 ? snapMultiplier : 1;

    // Calculate remaining distance
    return initialDistance * (1 - progress) * (1 - acceleration * finalMultiplier);
  };

  // Calculate initial offset based on pull direction
  const startOffset = calculateOffset(pullDistance, pullDirection);

  // Progress keyframes (custom magnetic easing)
  const progressKeys = [0, 0.1, 0.3, 0.5, 0.7, 0.85, 0.95, 1];

  // Calculate translateX values using magnetic physics
  const translateXValues = progressKeys.map((prog) => {
    if (prog === 0) return startOffset.x;
    if (prog <= resistanceZone) {
      // Resistance zone: slower movement
      const resistanceFactor = prog / resistanceZone;
      return startOffset.x * (1 - resistanceFactor * 0.1);
    }
    return calculateMagneticValue(prog, startOffset.x, magnetStrength, snapSpeed);
  });

  // Calculate translateY values using magnetic physics
  const translateYValues = progressKeys.map((prog) => {
    if (prog === 0) return startOffset.y;
    if (prog <= resistanceZone) {
      // Resistance zone: slower movement
      const resistanceFactor = prog / resistanceZone;
      return startOffset.y * (1 - resistanceFactor * 0.1);
    }
    return calculateMagneticValue(prog, startOffset.y, magnetStrength, snapSpeed);
  });

  // Scale "squash" effect keyframes
  const scaleProgressKeys = [0, 0.7, 0.85, 0.92, 1];
  const scaleValues = [1, 1, 0.95, 1.05, 1];

  // Build ranges array
  const ranges: Array<{ key: string; val: any; prog: number }> = [];

  // Add translateX ranges
  progressKeys.forEach((prog, index) => {
    ranges.push({
      key: 'translateX',
      val: translateXValues[index],
      prog,
    });
  });

  // Add translateY ranges
  progressKeys.forEach((prog, index) => {
    ranges.push({
      key: 'translateY',
      val: translateYValues[index],
      prog,
    });
  });

  // Add scale ranges
  scaleProgressKeys.forEach((prog, index) => {
    ranges.push({
      key: 'scale',
      val: scaleValues[index],
      prog,
    });
  });

  // Add optional box-shadow trail effect
  if (includeTrail) {
    const trailProgressKeys = [0, 0.3, 0.5, 0.7, 0.85, 1];
    const trailShadows = [
      '0 0 0px rgba(255, 255, 255, 0)', // No trail at start
      '0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.2)', // Light trail
      '0 0 15px rgba(255, 255, 255, 0.4), 0 0 30px rgba(255, 255, 255, 0.3), 0 0 45px rgba(255, 255, 255, 0.2)', // Medium trail
      '0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 255, 255, 0.4), 0 0 60px rgba(255, 255, 255, 0.3)', // Strong trail
      '0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.2)', // Fading trail
      '0 0 0px rgba(255, 255, 255, 0)', // No trail at end
    ];

    trailProgressKeys.forEach((prog, index) => {
      ranges.push({
        key: 'boxShadow',
        val: trailShadows[index],
        prog,
      });
    });
  }

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Use linear for custom easing via progress keys
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  // Create effect object
  const effect = {
    id: effectId || `magnetic-slide-in-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'magnetic-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: duration + effectStart,
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

// --- Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'magneticSlideIn',
  title: 'Magnetic Slide-In Effect',
  description:
    'Internal effect preset that simulates magnetic attraction physics. Elements start slowly, then rapidly accelerate with a "snapping" feel as they magnetically pull into place. Includes customizable magnetic strength, pull direction, resistance zones, and optional particle trail effects. Features a subtle "squash" effect at the moment of contact for enhanced physicality.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'magnetic', 'physics', 'slide-in', 'animation'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    magnetStrength: 0.5,
    pullDistance: 200,
    pullDirection: 180,
    resistanceZone: 0.2,
    snapSpeed: 1.5,
    includeTrail: false,
    targetIds: ['component-1'],
    duration: 1.2,
    effectStart: 0,
  },
};

// --- Export ---
export const magneticSlideInPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
