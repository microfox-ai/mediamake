/**
 * JellyWobble Internal Effect Preset
 *
 * ARRAY OF EFFECTS (returns multiple animation ranges)
 *
 * This internal effect preset creates a jelly-like wobble effect with elastic deformation.
 * It simulates soft-body physics by combining multiple transform properties (scaleX, scaleY, rotate)
 * in offset phases to create squash-and-stretch motion with damped oscillation.
 *
 * Features:
 * - **Damped Oscillation**: Primary wobble followed by decreasing secondary wobbles
 * - **Squash-and-Stretch**: scaleX and scaleY oscillate in opposite phases
 * - **Rotation Wobble**: Subtle rotation adds organic motion
 * - **Configurable Physics**: Adjustable wobble count, stiffness, and mass
 * - **Elastic Deformation**: Simulates soft-body physics with phase offsets
 *
 * Technical Details:
 * - Uses scaleX and scaleY in inverse patterns for authentic squash-stretch
 * - Rotation oscillates with slight phase offset for natural motion
 * - Amplitude decreases exponentially based on stiffness parameter
 * - Wobble speed affected by mass parameter
 *
 * Use cases:
 * - Playful UI element animations (buttons, cards, icons)
 * - Organic motion for mascots or characters
 * - Attention-grabbing effects for important elements
 * - Fun, bouncy transitions and interactions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the jelly wobble effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  duration: z
    .number()
    .default(1.2)
    .describe('Total duration of the wobble effect (seconds)'),
  wobbleCount: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of wobbles in the animation (1-5, more = more bouncy)'),
  stiffness: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe(
      'How quickly the wobble settles (0.1-1, lower = more bouncy, higher = settles faster)',
    ),
  mass: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Affects wobble speed and frequency (0.5-2, higher = slower wobbles)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, effectStart, duration, wobbleCount, stiffness, mass, effectId } = params;

  /**
   * Calculate damped oscillation values
   * Creates a bounce effect with decreasing amplitude
   */
  const calculateDampedOscillation = (
    baseAmplitude: number,
    wobbleIndex: number,
    totalWobbles: number,
  ): number => {
    // Exponential decay based on stiffness
    const dampingFactor = Math.exp(-stiffness * wobbleIndex);
    return baseAmplitude * dampingFactor;
  };

  /**
   * Generate progress points for the animation
   * Distributes wobbles evenly across the duration
   */
  const generateProgressPoints = (count: number): number[] => {
    const points: number[] = [0]; // Start at 0
    const step = 1 / (count * 2); // Each wobble has peak and valley

    for (let i = 1; i <= count * 2; i++) {
      points.push(i * step);
    }

    return points;
  };

  /**
   * Generate scaleX ranges (horizontal squash-stretch)
   */
  const generateScaleXRanges = () => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const progressPoints = generateProgressPoints(wobbleCount);
    const baseAmplitude = 0.15; // Base scale variation

    ranges.push({ key: 'scaleX', val: 1, prog: 0 }); // Start normal

    for (let i = 0; i < wobbleCount; i++) {
      const wobbleAmplitude = calculateDampedOscillation(baseAmplitude, i, wobbleCount);

      // Peak (stretched horizontally, compressed vertically)
      const peakProg = progressPoints[i * 2 + 1];
      ranges.push({
        key: 'scaleX',
        val: 1 + wobbleAmplitude,
        prog: peakProg,
      });

      // Valley (compressed horizontally, stretched vertically)
      if (i < wobbleCount - 1) {
        const valleyProg = progressPoints[i * 2 + 2];
        ranges.push({
          key: 'scaleX',
          val: 1 - wobbleAmplitude * 0.7,
          prog: valleyProg,
        });
      }
    }

    ranges.push({ key: 'scaleX', val: 1, prog: 1 }); // End normal

    return ranges;
  };

  /**
   * Generate scaleY ranges (vertical squash-stretch)
   * Inverse of scaleX for authentic squash-stretch
   */
  const generateScaleYRanges = () => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const progressPoints = generateProgressPoints(wobbleCount);
    const baseAmplitude = 0.15;

    ranges.push({ key: 'scaleY', val: 1, prog: 0 }); // Start normal

    for (let i = 0; i < wobbleCount; i++) {
      const wobbleAmplitude = calculateDampedOscillation(baseAmplitude, i, wobbleCount);

      // Peak (compressed vertically when scaleX is stretched)
      const peakProg = progressPoints[i * 2 + 1];
      ranges.push({
        key: 'scaleY',
        val: 1 - wobbleAmplitude * 0.7,
        prog: peakProg,
      });

      // Valley (stretched vertically when scaleX is compressed)
      if (i < wobbleCount - 1) {
        const valleyProg = progressPoints[i * 2 + 2];
        ranges.push({
          key: 'scaleY',
          val: 1 + wobbleAmplitude,
          prog: valleyProg,
        });
      }
    }

    ranges.push({ key: 'scaleY', val: 1, prog: 1 }); // End normal

    return ranges;
  };

  /**
   * Generate rotation ranges (subtle wobble)
   * Adds organic motion with slight phase offset
   */
  const generateRotateRanges = () => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const progressPoints = generateProgressPoints(wobbleCount);
    const baseRotation = 5; // Base rotation in degrees

    ranges.push({ key: 'rotate', val: 0, prog: 0 }); // Start at 0

    for (let i = 0; i < wobbleCount; i++) {
      const rotationAmplitude = calculateDampedOscillation(baseRotation, i, wobbleCount);

      // Rotate in one direction
      const peakProg = progressPoints[i * 2 + 1];
      ranges.push({
        key: 'rotate',
        val: rotationAmplitude * (i % 2 === 0 ? 1 : -1),
        prog: peakProg,
      });

      // Rotate in opposite direction
      if (i < wobbleCount - 1) {
        const valleyProg = progressPoints[i * 2 + 2];
        ranges.push({
          key: 'rotate',
          val: rotationAmplitude * (i % 2 === 0 ? -0.6 : 0.6),
          prog: valleyProg,
        });
      }
    }

    ranges.push({ key: 'rotate', val: 0, prog: 1 }); // End at 0

    return ranges;
  };

  // Generate all animation ranges
  const scaleXRanges = generateScaleXRanges();
  const scaleYRanges = generateScaleYRanges();
  const rotateRanges = generateRotateRanges();

  // Combine all ranges into one effect
  const allRanges = [...scaleXRanges, ...scaleYRanges, ...rotateRanges];

  // Create the effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: allRanges,
  };

  // Create the effect node
  const effect = {
    id: effectId || `jelly-wobble-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'jelly-wobble-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'JellyWobble',
  title: 'JellyWobble Effect',
  description:
    'Internal effect preset that creates a jelly-like wobble effect with elastic deformation using damped oscillation. Simulates soft-body physics by combining scaleX, scaleY, and rotation in offset phases to create squash-and-stretch motion with decreasing secondary wobbles. Perfect for UI elements that need playful, organic motion.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'wobble', 'jelly', 'elastic', 'squash', 'stretch'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    duration: 1.2,
    wobbleCount: 3,
    stiffness: 0.3,
    mass: 1,
  },
};

// Export preset
export const JellyWobblePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
