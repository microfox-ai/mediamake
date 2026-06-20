/**
 * FrameSkip Internal Effect Preset
 *
 * Recreates the stuttery motion of dropped frames in video playback. The element appears to freeze
 * momentarily (hold keyframes with same value at different progress points) then jumps to catch up.
 * This creates a distinct glitch aesthetic with configurable skip frequency, hold duration, catch-up
 * speed, jitter, and optional strobe-like opacity flickers.
 *
 * ARRAY OF EFFECTS:
 * Returns multiple effects: main motion (translateX with holds), jitter overlay (translateY),
 * and optional strobe (opacity flickers during frame drops).
 *
 * Features:
 * - Hold keyframes (same value repeated at different prog points) for freeze moments
 * - Rapid position changes (catch-up movements) after holds
 * - Configurable skip frequency (how often frames drop)
 * - Configurable hold duration (freeze length in seconds)
 * - Configurable catch-up speed (how quickly element jumps)
 * - Optional jitter overlay (micro-movements during holds)
 * - Optional strobe effect (opacity flickers during frame drops)
 *
 * Use cases:
 * - Creating glitch aesthetics in text animations
 * - Simulating low-frame-rate video playback
 * - Adding stuttery motion to images or overlays
 * - Building retro or digital distortion effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to target with frame skip effect'),
  skipFrequency: z
    .number()
    .min(1)
    .max(10)
    .describe('How often frames drop (skips per duration)'),
  holdDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .describe('Freeze length in seconds (0.2-0.3 typical)'),
  catchUpSpeed: z
    .number()
    .min(0.01)
    .max(0.1)
    .describe('How quickly element jumps to catch up (smaller = faster jump)'),
  jitterAmount: z
    .number()
    .min(0)
    .max(5)
    .describe('Additional micro-movements in pixels during holds'),
  includeStrobe: z
    .boolean()
    .describe('Add strobe-like opacity flickers during frame drops'),
  effectStart: z.number().describe('Start time of effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of effect in seconds'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate frame skip ranges
  const generateFrameSkipRanges = (
    duration: number,
    skipFreq: number,
    holdDur: number,
    catchSpeed: number,
  ) => {
    const ranges: Array<{ val: string; prog: number }> = [];
    const skipInterval = duration / skipFreq;

    let currentPosition = 0;
    let currentProg = 0;

    for (let i = 0; i < skipFreq; i++) {
      const skipPoint = (i + 1) * skipInterval;
      const skipProg = skipPoint / duration;
      const holdEndProg = Math.min(skipProg + holdDur / duration, 1);

      // Hold start: freeze at current position
      ranges.push({ val: `${currentPosition}px`, prog: currentProg });
      ranges.push({ val: `${currentPosition}px`, prog: skipProg });

      // Catch-up jump: rapid movement to new position
      const jumpDistance = 30 * (i + 1); // Cumulative jump
      const catchUpProg = Math.min(skipProg + catchSpeed / duration, 1);
      ranges.push({ val: `${jumpDistance}px`, prog: catchUpProg });

      // Hold at new position until next skip
      ranges.push({ val: `${jumpDistance}px`, prog: holdEndProg });

      currentPosition = jumpDistance;
      currentProg = holdEndProg;
    }

    // End at final position
    if (currentProg < 1) {
      ranges.push({ val: `${currentPosition}px`, prog: 1 });
    }

    return ranges;
  };

  // Helper function to generate jitter ranges
  const generateJitterRanges = (
    duration: number,
    skipFreq: number,
    jitterAmt: number,
  ) => {
    const ranges: Array<{ val: string; prog: number }> = [];
    if (jitterAmt === 0) return ranges;

    const skipInterval = duration / skipFreq;

    for (let i = 0; i < skipFreq; i++) {
      const skipPoint = (i + 1) * skipInterval;
      const skipProg = skipPoint / duration;

      // Jitter during hold
      ranges.push({ val: '0px', prog: skipProg });
      ranges.push({
        val: `${jitterAmt * (Math.random() > 0.5 ? 1 : -1)}px`,
        prog: skipProg + 0.01,
      });
      ranges.push({
        val: `${jitterAmt * (Math.random() > 0.5 ? 1 : -1)}px`,
        prog: skipProg + 0.02,
      });
      ranges.push({ val: '0px', prog: skipProg + 0.03 });
    }

    return ranges;
  };

  // Helper function to generate strobe ranges
  const generateStrobeRanges = (
    duration: number,
    skipFreq: number,
    holdDur: number,
  ) => {
    const ranges: Array<{ val: number; prog: number }> = [];
    const skipInterval = duration / skipFreq;

    for (let i = 0; i < skipFreq; i++) {
      const skipPoint = (i + 1) * skipInterval;
      const skipProg = skipPoint / duration;

      // Rapid opacity flicker during frame drop
      ranges.push({ val: 1, prog: skipProg });
      ranges.push({ val: 0.3, prog: skipProg + 0.005 });
      ranges.push({ val: 1, prog: skipProg + 0.01 });
      ranges.push({ val: 0.3, prog: skipProg + 0.015 });
      ranges.push({ val: 1, prog: skipProg + 0.02 });
    }

    return ranges;
  };

  // Generate motion effect with hold keyframes
  const motionRanges = generateFrameSkipRanges(
    params.effectDuration,
    params.skipFrequency,
    params.holdDuration,
    params.catchUpSpeed,
  );

  const motionEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: motionRanges.map((r) => ({ key: 'translateX', ...r })),
  };

  // Generate jitter effect
  const jitterRanges = generateJitterRanges(
    params.effectDuration,
    params.skipFrequency,
    params.jitterAmount,
  );

  const jitterEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: jitterRanges.map((r) => ({ key: 'translateY', ...r })),
  };

  // Generate strobe effect (if enabled)
  const strobeRanges = params.includeStrobe
    ? generateStrobeRanges(
        params.effectDuration,
        params.skipFrequency,
        params.holdDuration,
      )
    : [];

  const strobeEffect: GenericEffectData | null = params.includeStrobe
    ? {
        type: 'linear',
        start: params.effectStart,
        duration: params.effectDuration,
        mode: 'provider',
        targetIds: params.targetIds,
        ranges: strobeRanges.map((r) => ({ key: 'opacity', ...r })),
      }
    : null;

  // Build effects array
  const effects = [
    {
      id: `${params.effectIdPrefix || 'frameskip'}-motion-${params.targetIds.join('-')}`,
      componentId: 'generic',
      data: motionEffect,
    },
    {
      id: `${params.effectIdPrefix || 'frameskip'}-jitter-${params.targetIds.join('-')}`,
      componentId: 'generic',
      data: jitterEffect,
    },
  ];

  if (strobeEffect) {
    effects.push({
      id: `${params.effectIdPrefix || 'frameskip'}-strobe-${params.targetIds.join('-')}`,
      componentId: 'generic',
      data: strobeEffect,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'frameskip-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration + params.effectStart,
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
  id: 'frameskip-effect',
  title: 'FrameSkip Internal Effect',
  description:
    'Internal effect preset that recreates stuttery motion of dropped frames in video playback. Elements freeze momentarily then jump to catch up, creating distinct hold moments followed by rapid position changes. Includes parameters for skip frequency, hold duration, catch-up speed, jitter amount, and optional strobe-like opacity flickers during frame drops to emphasize the glitch aesthetic.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'frameskip', 'stutter'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    skipFrequency: 5,
    holdDuration: 0.25,
    catchUpSpeed: 0.05,
    jitterAmount: 2,
    includeStrobe: true,
    effectStart: 0,
    effectDuration: 10,
    effectIdPrefix: 'frameskip',
  },
};

export const frameskipEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
