/**
 * Chromatic Glitch Internal Effect
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset creates RGB channel separation stutters, simulating
 * a broken video signal where color channels desynchronize. Returns an array of
 * effects (red, green, blue channels + optional opacity flicker) that can be
 * applied to target components.
 *
 * Features:
 * - RGB channel separation with independent translateX offsets
 * - Stuttery realignment cycles (channels separate and rejoin repeatedly)
 * - Hue rotation for each color channel to simulate chromatic aberration
 * - Configurable glitch intensity, flicker rate, and color shift
 * - Optional opacity flicker for analog interference aesthetic
 * - Rapid stutter keyframes (default: 10 cycles across effect duration)
 *
 * Use cases:
 * - Simulating broken video signal interference
 * - Digital corruption effects for glitch aesthetics
 * - RGB split effects for retro/analog video looks
 * - Dynamic chromatic aberration for visual impact
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply chromatic glitch effect to'),
  glitchIntensity: z
    .number()
    .min(1)
    .max(20)
    .default(10)
    .describe('Pixel offset amount for channel separation (1-20px)'),
  flickerRate: z
    .number()
    .min(0.05)
    .max(0.2)
    .default(0.1)
    .describe(
      'Stutter frequency - how often channels realign/separate (0.05-0.2 prog units)',
    ),
  colorShift: z
    .number()
    .min(0)
    .max(360)
    .default(60)
    .describe('Hue rotation amount in degrees (0-360)'),
  includeFlicker: z
    .boolean()
    .default(true)
    .describe('Whether to include opacity flicker effect'),
  effectStart: z
    .number()
    .default(0)
    .describe('Effect start time in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(5)
    .describe('Effect duration in seconds'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs (for uniqueness)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate stutter keyframes
  const generateStutterKeyframes = (
    property: 'filter' | 'translateX' | 'opacity',
    values: any[],
    flickerRate: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    const keyframes: Array<{ key: string; val: any; prog: number }> = [];
    const numCycles = Math.floor(1 / flickerRate); // Number of stutter cycles

    for (let i = 0; i <= numCycles; i++) {
      const prog = i * flickerRate;
      const isRealigned = i % 2 === 0; // Alternate between separated and realigned

      if (property === 'filter') {
        // For filter, alternate between hue-shifted and normal
        keyframes.push({
          key: property,
          val: isRealigned ? values[0] : values[1],
          prog: Math.min(prog, 1),
        });
      } else if (property === 'translateX') {
        // For translateX, alternate between offset and zero
        keyframes.push({
          key: property,
          val: isRealigned ? '0px' : values[0],
          prog: Math.min(prog, 1),
        });
      } else if (property === 'opacity') {
        // For opacity, create rapid flickers
        keyframes.push({
          key: property,
          val: isRealigned ? 1 : values[0],
          prog: Math.min(prog, 1),
        });
      }
    }

    return keyframes;
  };

  const {
    targetIds,
    glitchIntensity,
    flickerRate,
    colorShift,
    includeFlicker,
    effectStart,
    effectDuration,
    effectIdPrefix = 'chromatic-glitch',
  } = params;

  const effects: any[] = [];

  // --- RED CHANNEL EFFECT ---
  const redFilterKeyframes = generateStutterKeyframes(
    'filter',
    [
      'hue-rotate(0deg) saturate(3) brightness(1)',
      `hue-rotate(-${colorShift}deg) saturate(3) brightness(0.8)`,
    ],
    flickerRate,
  );

  const redTranslateKeyframes = generateStutterKeyframes(
    'translateX',
    [`${glitchIntensity}px`],
    flickerRate,
  );

  const redChannelEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds,
    ranges: [...redFilterKeyframes, ...redTranslateKeyframes],
  };

  effects.push({
    id: `${effectIdPrefix}-red-channel`,
    componentId: 'generic',
    data: redChannelEffect,
  });

  // --- GREEN CHANNEL EFFECT ---
  const greenFilterKeyframes = generateStutterKeyframes(
    'filter',
    [
      'hue-rotate(0deg) saturate(3) brightness(1)',
      `hue-rotate(${120 + colorShift}deg) saturate(3) brightness(0.8)`,
    ],
    flickerRate,
  );

  const greenTranslateKeyframes = generateStutterKeyframes(
    'translateX',
    [`-${glitchIntensity}px`],
    flickerRate,
  );

  const greenChannelEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds,
    ranges: [...greenFilterKeyframes, ...greenTranslateKeyframes],
  };

  effects.push({
    id: `${effectIdPrefix}-green-channel`,
    componentId: 'generic',
    data: greenChannelEffect,
  });

  // --- BLUE CHANNEL EFFECT ---
  const blueFilterKeyframes = generateStutterKeyframes(
    'filter',
    [
      'hue-rotate(0deg) saturate(3) brightness(1)',
      `hue-rotate(${240 + colorShift}deg) saturate(3) brightness(0.8)`,
    ],
    flickerRate,
  );

  // Blue channel oscillates between +glitchIntensity/2 and -glitchIntensity/2
  const blueTranslateKeyframes: Array<{
    key: string;
    val: any;
    prog: number;
  }> = [];
  const numCycles = Math.floor(1 / flickerRate);
  for (let i = 0; i <= numCycles; i++) {
    const prog = i * flickerRate;
    const offset =
      i % 2 === 0
        ? `${glitchIntensity / 2}px`
        : `-${glitchIntensity / 2}px`;
    blueTranslateKeyframes.push({
      key: 'translateX',
      val: offset,
      prog: Math.min(prog, 1),
    });
  }

  const blueChannelEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds,
    ranges: [...blueFilterKeyframes, ...blueTranslateKeyframes],
  };

  effects.push({
    id: `${effectIdPrefix}-blue-channel`,
    componentId: 'generic',
    data: blueChannelEffect,
  });

  // --- OPACITY FLICKER EFFECT (Optional) ---
  if (includeFlicker) {
    const opacityKeyframes = generateStutterKeyframes(
      'opacity',
      [0.7],
      flickerRate / 2, // Twice as frequent as other stutters
    );

    const flickerEffect: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds,
      ranges: opacityKeyframes,
    };

    effects.push({
      id: `${effectIdPrefix}-opacity-flicker`,
      componentId: 'generic',
      data: flickerEffect,
    });
  }

  // --- Return Effects ---
  const rootContainer: RenderableComponentData = {
    id: `${effectIdPrefix}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'ChromaticGlitchEffect',
  title: 'Chromatic Glitch Internal Effect',
  description:
    'Internal effect preset that creates RGB channel separation stutters with rapid realignment, simulating broken video signal interference. Returns an effects array with separate red, green, and blue channel manipulations using CSS filters and transforms, plus optional opacity flickers for analog corruption aesthetics.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'generic',
    'glitch',
    'chromatic',
    'rgb-split',
    'video-interference',
    'analog',
    'digital-corruption',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['example-component'],
    glitchIntensity: 10,
    flickerRate: 0.1,
    colorShift: 60,
    includeFlicker: true,
    effectStart: 0,
    effectDuration: 5,
  },
};

// --- Export ---
export const ChromaticGlitchEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
