/**
 * ElectricJolt Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates sudden, violent shakes like electrical shocks or impact tremors.
 * Each jolt has three phases:
 * 1. Anticipation (0-0.15): Slight pull-back in opposite direction
 * 2. Impact (0.15-0.3): Extreme shake with maximum displacement
 * 3. Settle (0.3-1.0): Dampened oscillation back to rest with 4-5 bounce keyframes
 *
 * Features:
 * - Multiple jolts with customizable count (1-10)
 * - Intensity decay: Each subsequent jolt can be weaker
 * - Random displacement direction (up to 50px based on intensity)
 * - Timing patterns: regular intervals, clustered bursts, or random
 * - Arc mode: Adds brightness flashes synchronized with movements
 * - Customizable settle speed for oscillation damping
 *
 * Use cases:
 * - Electrical shock animations
 * - Impact tremor effects
 * - Dynamic glitch effects
 * - Emphasis animations with violent movement
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  joltCount: z
    .number()
    .min(1)
    .max(10)
    .describe('Number of electrical jolts to apply'),
  intensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Base intensity multiplier for displacement (1 = 50px max)'),
  decay: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Intensity decay factor for each subsequent jolt (0 = no decay, 1 = full decay)',
    ),
  timing: z
    .enum(['regular', 'cluster', 'random'])
    .default('regular')
    .describe(
      'Timing pattern for jolts: regular intervals, clustered bursts, or random',
    ),
  arcMode: z
    .boolean()
    .default(false)
    .describe(
      'Enable brightness flashes synchronized with jolt movements (electrical arc effect)',
    ),
  settleSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Speed multiplier for settle phase oscillation (higher = faster damping)',
    ),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the jolt effects to'),
  totalDuration: z
    .number()
    .optional()
    .describe(
      'Total duration for all jolts in seconds (optional, defaults to calculated duration)',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate random angle in radians
  const getRandomAngle = (): number => {
    return Math.random() * Math.PI * 2;
  };

  // Helper: Calculate displacement vector based on angle and intensity
  const getDisplacementVector = (
    angle: number,
    intensity: number,
  ): { x: number; y: number } => {
    const maxDisplacement = 50 * intensity;
    return {
      x: Math.cos(angle) * maxDisplacement,
      y: Math.sin(angle) * maxDisplacement,
    };
  };

  // Helper: Create anticipation keyframes (slight pull-back)
  const createAnticipationKeyframes = (
    displacement: { x: number; y: number },
    progStart: number,
    progEnd: number,
  ) => {
    // Pull back slightly in opposite direction (20% of displacement)
    const pullBackX = -displacement.x * 0.2;
    const pullBackY = -displacement.y * 0.2;

    return [
      { key: 'translateX', val: 0, prog: progStart },
      { key: 'translateY', val: 0, prog: progStart },
      { key: 'translateX', val: pullBackX, prog: progEnd },
      { key: 'translateY', val: pullBackY, prog: progEnd },
    ];
  };

  // Helper: Create impact keyframes (maximum displacement)
  const createImpactKeyframes = (
    displacement: { x: number; y: number },
    progStart: number,
    progEnd: number,
  ) => {
    return [
      { key: 'translateX', val: displacement.x, prog: progStart },
      { key: 'translateY', val: displacement.y, prog: progStart },
      { key: 'translateX', val: displacement.x, prog: progEnd },
      { key: 'translateY', val: displacement.y, prog: progEnd },
    ];
  };

  // Helper: Create settle keyframes (dampened oscillation with 4-5 bounces)
  const createSettleKeyframes = (
    displacement: { x: number; y: number },
    progStart: number,
    progEnd: number,
    settleSpeed: number,
  ) => {
    const keyframes: any[] = [];
    const bounceCount = 5;
    const settleRange = progEnd - progStart;

    // Create dampened oscillation
    for (let i = 0; i <= bounceCount; i++) {
      const bounceProgress = progStart + (i / bounceCount) * settleRange;
      // Exponential decay for amplitude
      const decayFactor = Math.pow(0.3, i * settleSpeed);
      const bounceX = displacement.x * decayFactor * (i % 2 === 0 ? 1 : -0.3);
      const bounceY = displacement.y * decayFactor * (i % 2 === 0 ? 1 : -0.3);

      keyframes.push(
        { key: 'translateX', val: bounceX, prog: bounceProgress },
        { key: 'translateY', val: bounceY, prog: bounceProgress },
      );
    }

    // Final settle to 0
    keyframes.push(
      { key: 'translateX', val: 0, prog: progEnd },
      { key: 'translateY', val: 0, prog: progEnd },
    );

    return keyframes;
  };

  // Helper: Create brightness flash keyframes for arc mode
  const createArcFlashKeyframes = (
    progStart: number,
    progImpactEnd: number,
  ) => {
    return [
      { key: 'brightness', val: 1, prog: progStart },
      { key: 'brightness', val: 1.5, prog: progStart + 0.05 },
      { key: 'brightness', val: 1.3, prog: progImpactEnd },
      { key: 'brightness', val: 1, prog: progImpactEnd + 0.1 },
    ];
  };

  // Helper: Calculate jolt start times based on timing pattern
  const calculateJoltTimings = (
    joltCount: number,
    totalDuration: number,
    pattern: 'regular' | 'cluster' | 'random',
  ): number[] => {
    const timings: number[] = [];

    if (pattern === 'regular') {
      // Evenly spaced jolts
      const interval = totalDuration / joltCount;
      for (let i = 0; i < joltCount; i++) {
        timings.push(i * interval);
      }
    } else if (pattern === 'cluster') {
      // Clustered bursts (groups of 2-3 jolts)
      const clusterSize = Math.min(3, joltCount);
      const clusterCount = Math.ceil(joltCount / clusterSize);
      const clusterInterval = totalDuration / clusterCount;

      let joltIndex = 0;
      for (let c = 0; c < clusterCount && joltIndex < joltCount; c++) {
        const clusterStart = c * clusterInterval;
        const joltsInCluster = Math.min(clusterSize, joltCount - joltIndex);

        for (let j = 0; j < joltsInCluster; j++) {
          timings.push(clusterStart + j * 0.15); // 0.15s between jolts in cluster
          joltIndex++;
        }
      }
    } else {
      // Random timings
      for (let i = 0; i < joltCount; i++) {
        timings.push(Math.random() * (totalDuration - 1));
      }
      timings.sort((a, b) => a - b);
    }

    return timings;
  };

  // Extract parameters
  const {
    joltCount,
    intensity,
    decay,
    timing,
    arcMode,
    settleSpeed,
    targetIds,
    totalDuration,
  } = params;

  // Calculate total duration if not provided
  const joltDuration = 2; // Each jolt effect lasts 2 seconds
  const calculatedDuration =
    totalDuration || Math.max(joltCount * 1.5, joltCount * joltDuration * 0.5);

  // Calculate jolt timings
  const joltTimings = calculateJoltTimings(joltCount, calculatedDuration, timing);

  // Generate effects for each jolt
  const effects: any[] = [];

  for (let i = 0; i < joltCount; i++) {
    const joltStart = joltTimings[i];
    const currentIntensity = intensity * Math.pow(1 - decay, i);

    // Generate random displacement direction
    const angle = getRandomAngle();
    const displacement = getDisplacementVector(angle, currentIntensity);

    // Phase timings (relative to effect start)
    const anticipationEnd = 0.15;
    const impactEnd = 0.3;
    const settleEnd = 1.0;

    // Create keyframes for all three phases
    const ranges = [
      // Anticipation phase (0-0.15)
      ...createAnticipationKeyframes(displacement, 0, anticipationEnd),
      // Impact phase (0.15-0.3)
      ...createImpactKeyframes(displacement, anticipationEnd, impactEnd),
      // Settle phase (0.3-1.0)
      ...createSettleKeyframes(
        displacement,
        impactEnd,
        settleEnd,
        settleSpeed,
      ),
    ];

    // Add arc mode brightness flashes
    if (arcMode) {
      ranges.push(...createArcFlashKeyframes(0, impactEnd));
    }

    // Create effect data
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: joltStart,
      duration: joltDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: ranges,
    };

    effects.push({
      id: `electric-jolt-${i}`,
      componentId: 'generic',
      data: effectData,
    });
  }

  // Calculate container duration (longest jolt end time)
  const containerDuration =
    Math.max(...joltTimings.map((t, i) => t + joltDuration)) + 0.5;

  return {
    output: {
      childrenData: [
        {
          id: 'electric-jolt-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: containerDuration,
            },
          },
          effects: effects,
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'electric-jolt-effect',
  title: 'Electric Jolt Effect',
  description:
    'Internal effect preset that creates violent electrical shock animations with three phases: anticipation (pull-back), impact (extreme shake), and settle (dampened oscillation). Supports multiple jolts with intensity decay, customizable timing patterns (regular/cluster/random), and optional arc mode with brightness flashes synchronized to movements.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'shake', 'jolt', 'electric', 'impact'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    joltCount: 3,
    intensity: 1,
    decay: 0.3,
    timing: 'regular',
    arcMode: true,
    settleSpeed: 1,
    targetIds: ['target-component'],
    totalDuration: 5,
  },
};

export const electricJoltEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
