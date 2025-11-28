/**
 * StutterEcho Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Generates a stuttery time trail effect through rapid opacity and position shifts.
 * Creates multiple ghost frames that trail behind the target element, simulating a
 * video editing technique where frames are duplicated with slight delays.
 *
 * Features:
 * - Creates 3-5 effect objects with staggered start times (0.02s apart)
 * - Each effect uses rapid keyframe intervals (every 0.05 prog)
 * - Alternates between full opacity and reduced opacity (0.3-0.7)
 * - Applies small translateX/Y offsets (-2px to 2px) for jittery motion
 * - Simulates a glitchy VHS tape or corrupted digital video effect
 *
 * Parameters:
 * - targetIds: Array of component IDs to apply the effect to
 * - trailCount: Number of echo frames (2-8)
 * - stutterIntensity: Jitter amount (0-1)
 * - fadeDecay: How quickly echoes fade (0.1-0.9)
 * - duration: Duration of the effect in seconds
 *
 * Use cases:
 * - Creating glitch effects for video intros
 * - Simulating VHS tape degradation
 * - Adding digital corruption aesthetics
 * - Creating time-trail ghost effects for text/video/images
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the stutter echo effect to'),
  trailCount: z
    .number()
    .min(2)
    .max(8)
    .describe('Number of echo frames (ghost trails) to create'),
  stutterIntensity: z
    .number()
    .min(0)
    .max(1)
    .describe('Intensity of jitter motion (0 = none, 1 = maximum)'),
  fadeDecay: z
    .number()
    .min(0.1)
    .max(0.9)
    .describe('How quickly echoes fade (0.1 = fast fade, 0.9 = slow fade)'),
  duration: z.number().describe('Duration of the effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, trailCount, stutterIntensity, fadeDecay, duration } =
    params;

  // Helper function to generate random jitter values
  const getJitter = (intensity: number): number => {
    const range = 2 * intensity; // -2px to 2px scaled by intensity
    return (Math.random() - 0.5) * 2 * range;
  };

  // Helper function to generate opacity values with decay
  const getOpacity = (index: number, prog: number): number => {
    // Base opacity decreases with each trail
    const baseOpacity = 1 - (index / trailCount) * fadeDecay;
    // Alternating pattern for stutter effect
    const isLowOpacity = Math.floor(prog / 0.05) % 2 === 1;
    return isLowOpacity
      ? Math.max(0.3, baseOpacity * 0.4)
      : Math.min(1, baseOpacity);
  };

  // Generate keyframes for rapid stutter effect
  const generateStutterRanges = (trailIndex: number) => {
    const ranges: any[] = [];
    const steps = Math.floor(1 / 0.05); // 20 steps (0, 0.05, 0.1, ..., 0.95, 1)

    for (let i = 0; i <= steps; i++) {
      const prog = i * 0.05;

      // Opacity keyframe
      ranges.push({
        key: 'opacity',
        val: getOpacity(trailIndex, prog),
        prog: prog,
      });

      // TranslateX keyframe with jitter
      ranges.push({
        key: 'translateX',
        val: `${getJitter(stutterIntensity)}px`,
        prog: prog,
      });

      // TranslateY keyframe with jitter
      ranges.push({
        key: 'translateY',
        val: `${getJitter(stutterIntensity)}px`,
        prog: prog,
      });
    }

    return ranges;
  };

  // Generate effect objects with staggered start times
  const effects = [];
  const staggerDelay = 0.02; // 0.02s apart

  for (let i = 0; i < trailCount; i++) {
    const effectData: GenericEffectData = {
      type: 'linear', // Linear for sharp, glitchy transitions
      start: i * staggerDelay,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: generateStutterRanges(i),
    };

    effects.push({
      id: `stutter-echo-${i}-${targetIds.join('-')}`,
      componentId: 'generic',
      data: effectData,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'stutter-echo-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: duration + trailCount * staggerDelay,
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
  id: 'StutterEcho',
  title: 'StutterEcho Internal Effect Preset',
  description:
    'Internal effect preset that generates a stuttery time trail effect through rapid opacity and position shifts. Creates multiple ghost frames trailing behind target elements with jittery motion, simulating a glitchy VHS tape or corrupted digital video effect. Returns effect objects that can be applied to text, video, or image atoms.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'stutter', 'echo', 'glitch', 'vhs', 'ghost', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    trailCount: 5,
    stutterIntensity: 0.7,
    fadeDecay: 0.6,
    duration: 2,
  },
};

export const StutterEchoPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
