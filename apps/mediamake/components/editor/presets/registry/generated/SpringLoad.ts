/**
 * SpringLoad Internal Effect Preset
 *
 * SINGLE EFFECT (returns AnimationRange[] data)
 *
 * This internal effect preset simulates a spring-loaded mechanism with tension and release.
 * It creates a three-phase animation:
 * 1. Pull-back phase (0-30%): Backward pull like drawing a bowstring
 * 2. Tension-hold phase (30-50%): Brief hold with subtle micro-vibrations
 * 3. Release phase (50-100%): Explosive forward motion with elastic overshoot
 *
 * Features:
 * - **Three-Phase Animation**: Pull-back, tension-hold, and release
 * - **Micro-Vibrations**: High-frequency, low-amplitude oscillations during tension
 * - **Directional Variants**: Up, down, left, right
 * - **Configurable Parameters**: Tension duration, release speed, vibration intensity
 * - **Scale Emphasis**: Scale effects for impact during release
 *
 * Technical Details:
 * - Returns AnimationRange[] with progress values (0-1) relative to effect duration
 * - Uses translateX/Y for direction-based motion
 * - Uses scale for impact emphasis during release
 * - Micro-vibrations use rapid progress increments with alternating small values
 *
 * Use cases:
 * - Creating spring-loaded button effects
 * - Building elastic reveal animations
 * - Adding tension-release dynamics to UI elements
 * - Creating bowstring-style launch effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  direction: z
    .enum(['up', 'down', 'left', 'right'])
    .default('right')
    .describe('Direction of the spring-loaded motion'),
  tensionDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Duration of the tension phase (0.1-1.0, as fraction of total duration)'),
  releaseSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Speed multiplier for the release phase (0.5-3.0)'),
  vibrationIntensity: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .describe('Intensity of micro-vibrations during tension (0-0.1, as fraction of pull distance)'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
});

// Execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate translate values based on direction
  const getTranslateKey = (direction: string): string => {
    return direction === 'left' || direction === 'right'
      ? 'translateX'
      : 'translateY';
  };

  // Helper function: Calculate pull-back distance based on direction
  const getPullBackValue = (direction: string): number => {
    switch (direction) {
      case 'left':
        return 50; // Pull to the right
      case 'right':
        return -50; // Pull to the left
      case 'up':
        return 50; // Pull down
      case 'down':
        return -50; // Pull up
      default:
        return -50;
    }
  };

  // Helper function: Calculate overshoot distance based on direction and speed
  const getOvershootValue = (direction: string, speed: number): number => {
    const baseOvershoot = 20;
    const overshoot = baseOvershoot * speed;
    switch (direction) {
      case 'left':
        return -overshoot;
      case 'right':
        return overshoot;
      case 'up':
        return -overshoot;
      case 'down':
        return overshoot;
      default:
        return overshoot;
    }
  };

  // Extract parameters
  const { direction, tensionDuration, releaseSpeed, vibrationIntensity, targetIds } = params;

  // Calculate phase boundaries (relative progress 0-1)
  const pullBackEnd = 0.3; // 30% - end of pull-back phase
  const tensionEnd = pullBackEnd + tensionDuration; // End of tension-hold phase
  const releaseStart = tensionEnd; // Start of release phase

  // Calculate translate values
  const translateKey = getTranslateKey(direction);
  const pullBackDistance = getPullBackValue(direction);
  const overshootDistance = getOvershootValue(direction, releaseSpeed);

  // Calculate vibration values
  const vibrationAmplitude = pullBackDistance * vibrationIntensity;

  // Build animation ranges
  const ranges: Array<{ key: string; val: number; prog: number }> = [];

  // Phase 1: Pull-back (0-30%)
  ranges.push(
    { key: translateKey, val: 0, prog: 0 },
    { key: translateKey, val: pullBackDistance, prog: pullBackEnd },
  );

  // Phase 2: Tension-hold with micro-vibrations (30%-tensionEnd)
  // Create 10 vibration keyframes with alternating positive/negative values
  const vibrationSteps = 10;
  const vibrationDuration = tensionEnd - pullBackEnd;
  const vibrationStep = vibrationDuration / vibrationSteps;

  for (let i = 0; i < vibrationSteps; i++) {
    const vibrationProg = pullBackEnd + i * vibrationStep;
    // Alternate between adding and subtracting vibration
    const vibrationOffset = (i % 2 === 0 ? 1 : -1) * vibrationAmplitude;
    ranges.push({
      key: translateKey,
      val: pullBackDistance + vibrationOffset,
      prog: vibrationProg,
    });
  }

  // End of tension phase - return to pull-back position
  ranges.push({
    key: translateKey,
    val: pullBackDistance,
    prog: tensionEnd,
  });

  // Phase 3: Release with overshoot (tensionEnd-100%)
  const midRelease = tensionEnd + (1 - tensionEnd) * 0.4; // 40% into release
  const lateRelease = tensionEnd + (1 - tensionEnd) * 0.7; // 70% into release

  ranges.push(
    // Explosive forward motion to overshoot
    { key: translateKey, val: overshootDistance, prog: midRelease },
    // Pull back slightly from overshoot
    { key: translateKey, val: overshootDistance * 0.3, prog: lateRelease },
    // Settle at final position
    { key: translateKey, val: 0, prog: 1 },
  );

  // Add scale ranges for impact emphasis
  ranges.push(
    // Normal scale during pull-back and tension
    { key: 'scale', val: 1, prog: 0 },
    { key: 'scale', val: 0.95, prog: pullBackEnd }, // Slight squash during tension
    { key: 'scale', val: 0.95, prog: tensionEnd },
    // Scale up during release for impact
    { key: 'scale', val: 1.1, prog: midRelease }, // Overshoot scale
    { key: 'scale', val: 1.02, prog: lateRelease }, // Slight bounce
    { key: 'scale', val: 1, prog: 1 }, // Settle to normal
  );

  // Return output with AnimationRange[] data
  return {
    output: {
      _extractedEffects: [
        {
          id: 'spring-load-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 1, // Duration will be set by calling preset
            mode: 'provider',
            targetIds: targetIds,
            ranges: ranges,
          },
        },
      ],
    } as any,
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'SpringLoad',
  title: 'Spring Load Effect',
  description:
    'Internal effect preset that simulates a spring-loaded mechanism with tension and release. Creates a three-phase animation: backward pull (like drawing a bowstring), tension hold with subtle micro-vibrations, then explosive forward release with elastic overshoot. Supports directional variants (up, down, left, right) with configurable tension duration, release speed, and vibration intensity. Returns AnimationRange[] for the generic effect system.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'spring', 'tension', 'release', 'elastic', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    direction: 'right',
    tensionDuration: 0.3,
    releaseSpeed: 1.5,
    vibrationIntensity: 0.02,
    targetIds: ['component-1'],
  },
};

// Export preset
export const SpringLoadPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
