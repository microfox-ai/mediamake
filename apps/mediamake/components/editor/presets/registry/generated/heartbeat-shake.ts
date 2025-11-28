/**
 * Heartbeat Synchronized Pulsing Shake
 *
 * A horror-inspired text effect that mimics organic, possessed trembling synchronized to a cardiac rhythm.
 * Features two quick shakes (lub-dub) followed by rest, scaling pulse that makes text appear to breathe,
 * subtle red color pulsing, and independent letter micro-rotations for an unsettling alive quality.
 *
 * Features:
 * - Cardiac rhythm pattern: Two quick shakes (lub-dub) followed by rest period
 * - Configurable BPM (60-80) for rhythm control
 * - Violent shake during beats (±5px), subtle vibration during rest (±0.5px)
 * - Scaling pulse that makes text grow (1.0 to 1.05x) with each heartbeat
 * - Subtle red tint pulsing synchronized to heartbeat
 * - Independent letter micro-rotations (±3deg) for twitching effect
 * - Letter-level animation access for organic movement
 * - Uses generic effects with precise keyframe timing
 *
 * Use cases:
 * - Horror film title cards
 * - Possessed/alive text effects
 * - Unsettling typography
 * - Organic, breathing text animations
 * - Thriller/horror content branding
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('POSSESSED')
    .describe('Text content to display with heartbeat shake effect'),
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(120)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (will pulse red during beats)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (Google Font name)'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., "700", "900")'),
  bpm: z
    .number()
    .min(60)
    .max(80)
    .default(75)
    .describe('Heartbeat rhythm in beats per minute (60-80)'),
  shakeIntensity: z
    .number()
    .min(0.5)
    .max(10)
    .default(5)
    .describe('Shake intensity during beats in pixels'),
  restVibration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Subtle vibration during rest phase in pixels'),
  scalePulse: z
    .number()
    .min(1.01)
    .max(1.2)
    .default(1.05)
    .describe('Maximum scale during heartbeat (1.0 = no scale)'),
  redTintIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Intensity of red tint pulse (0-1, 0.1 = subtle)'),
  letterTwitchAngle: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Maximum rotation angle for letter micro-rotations in degrees'),
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Duration of the effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    textColor,
    fontFamily,
    fontWeight,
    bpm,
    shakeIntensity,
    restVibration,
    scalePulse,
    redTintIntensity,
    letterTwitchAngle,
    duration,
  } = params;

  // Calculate heartbeat cycle duration based on BPM
  const cycleDuration = 60 / bpm; // seconds per beat cycle

  // Heartbeat pattern timing (within one cycle):
  // 0.0s: First shake (lub) - 0.1s duration
  // 0.2s: Second shake (dub) - 0.1s duration
  // 0.3s-cycleDuration: Rest phase with subtle vibration

  const beatDuration = 0.1; // Duration of each beat shake
  const firstBeatStart = 0;
  const secondBeatStart = 0.2;
  const restStart = 0.3;

  // Split text into individual letters
  const letters = text.split('');

  // Generate letter components with individual IDs for targeting
  const letterComponents = letters.map((letter, index) => {
    const letterId = `letter-${index}`;

    // Stagger letter twitches for organic feel (offset based on index)
    const twitchOffset = (index * 0.05) % cycleDuration;

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
        style: {
          fontSize: `${fontSize}px`,
          fontWeight,
          color: textColor,
          display: 'inline-block',
          textShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };
  });

  // Create effects for each letter (apply to all letters simultaneously)
  const allLetterIds = letters.map((_, index) => `letter-${index}`);

  // Helper function to create repeating heartbeat keyframes
  const createHeartbeatKeyframes = (
    property: string,
    beatValue: any,
    restValue: any,
  ) => {
    const keyframes: Array<{ key: string; val: any; prog: number }> = [];
    const cycleCount = Math.ceil(duration / cycleDuration);

    for (let i = 0; i < cycleCount; i++) {
      const cycleStart = i * cycleDuration;
      const cycleEnd = Math.min((i + 1) * cycleDuration, duration);

      // First beat (lub)
      keyframes.push(
        {
          key: property,
          val: restValue,
          prog: cycleStart / duration,
        },
        {
          key: property,
          val: beatValue,
          prog: (cycleStart + firstBeatStart) / duration,
        },
        {
          key: property,
          val: beatValue,
          prog: (cycleStart + firstBeatStart + beatDuration) / duration,
        },
      );

      // Second beat (dub)
      keyframes.push(
        {
          key: property,
          val: restValue,
          prog: (cycleStart + secondBeatStart) / duration,
        },
        {
          key: property,
          val: beatValue,
          prog: (cycleStart + secondBeatStart + beatDuration) / duration,
        },
      );

      // Rest phase
      keyframes.push({
        key: property,
        val: restValue,
        prog: (cycleStart + restStart) / duration,
      });

      // End of cycle
      if (cycleEnd < duration) {
        keyframes.push({
          key: property,
          val: restValue,
          prog: cycleEnd / duration,
        });
      }
    }

    // Ensure final keyframe at prog: 1
    keyframes.push({
      key: property,
      val: restValue,
      prog: 1,
    });

    return keyframes;
  };

  // Effect 1: Horizontal shake (translateX)
  const shakeXRanges = createHeartbeatKeyframes(
    'translateX',
    `${shakeIntensity * (Math.random() > 0.5 ? 1 : -1)}px`,
    `${restVibration * Math.sin(Date.now())}px`,
  );

  // Effect 2: Vertical shake (translateY)
  const shakeYRanges = createHeartbeatKeyframes(
    'translateY',
    `${shakeIntensity * (Math.random() > 0.5 ? 1 : -1)}px`,
    `${restVibration * Math.cos(Date.now())}px`,
  );

  // Effect 3: Scale pulse
  const scaleRanges = createHeartbeatKeyframes('scale', scalePulse, 1.0);

  // Effect 4: Red tint pulse (backgroundColor)
  const redTintRanges = createHeartbeatKeyframes(
    'backgroundColor',
    `rgba(239, 68, 68, ${redTintIntensity})`,
    'transparent',
  );

  // Combined shake and pulse effect
  const mainEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: allLetterIds,
    ranges: [
      ...shakeXRanges,
      ...shakeYRanges,
      ...scaleRanges,
      ...redTintRanges,
    ],
  };

  // Effect 5: Letter micro-rotations (individual twitches)
  const letterTwitchEffects = letters.map((_, index) => {
    const letterId = `letter-${index}`;
    const twitchOffset = (index * 0.05) % cycleDuration;

    // Create random rotation keyframes with heartbeat sync
    const rotationRanges: Array<{ key: string; val: any; prog: number }> = [];
    const cycleCount = Math.ceil(duration / cycleDuration);

    for (let i = 0; i < cycleCount; i++) {
      const cycleStart = i * cycleDuration;

      // Random twitch angle during beats
      const randomAngle =
        letterTwitchAngle * (Math.random() > 0.5 ? 1 : -1) * Math.random();

      rotationRanges.push(
        {
          key: 'rotate',
          val: 0,
          prog: cycleStart / duration,
        },
        {
          key: 'rotate',
          val: randomAngle,
          prog: (cycleStart + firstBeatStart + twitchOffset) / duration,
        },
        {
          key: 'rotate',
          val: 0,
          prog: (cycleStart + firstBeatStart + beatDuration) / duration,
        },
        {
          key: 'rotate',
          val: -randomAngle * 0.7,
          prog: (cycleStart + secondBeatStart + twitchOffset) / duration,
        },
        {
          key: 'rotate',
          val: 0,
          prog: (cycleStart + secondBeatStart + beatDuration) / duration,
        },
      );
    }

    rotationRanges.push({
      key: 'rotate',
      val: 0,
      prog: 1,
    });

    return {
      id: `twitch-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: rotationRanges,
      } as GenericEffectData,
    };
  });

  // Main container with text
  const mainContainer: RenderableComponentData = {
    id: 'heartbeat-shake-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'main-heartbeat-effect',
        componentId: 'generic',
        data: mainEffect,
      },
      ...letterTwitchEffects,
    ],
    childrenData: [
      {
        id: 'text-wrapper',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block select-none',
            style: {
              transformOrigin: 'center center',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: letterComponents as RenderableComponentData[],
      },
    ],
  };

  return {
    output: {
      childrenData: [mainContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'heartbeat-shake',
  title: 'Heartbeat Synchronized Pulsing Shake',
  description:
    'A horror-inspired text effect that mimics organic, possessed trembling synchronized to a cardiac rhythm. Features two quick shakes (lub-dub) followed by rest, scaling pulse that makes text appear to breathe, subtle red color pulsing, and independent letter micro-rotations for an unsettling alive quality. Configurable BPM (60-80), supports word-by-word timing from captions or full text application.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'horror',
    'shake',
    'heartbeat',
    'possessed',
    'organic',
    'pulse',
    'breathing',
    'thriller',
    'unsettling',
    'cardiac',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'POSSESSED',
    fontSize: 120,
    textColor: '#FFFFFF',
    fontFamily: 'Inter',
    fontWeight: '900',
    bpm: 75,
    shakeIntensity: 5,
    restVibration: 0.5,
    scalePulse: 1.05,
    redTintIntensity: 0.1,
    letterTwitchAngle: 3,
    duration: 10,
  },
};

export const heartbeatShakePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
