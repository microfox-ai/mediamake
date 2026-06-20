/**
 * Film Grain Overlay Effect Preset
 *
 * INTERNAL EFFECT PRESET - Returns an array of three effects
 *
 * This preset creates an authentic vintage film degradation effect by combining three
 * separate animation layers:
 *
 * 1. **Primary Grain Effect**: Rapidly cycling opacity (20+ keyframes) to simulate grain
 *    texture movement. Uses random opacity values between 0.02-0.15 with keyframe changes
 *    every 0.05 seconds.
 *
 * 2. **Dust Speck Effect**: Occasional opacity spikes (0.3-0.5) at random progress values
 *    to simulate dust particles and scratches that appear randomly throughout the duration.
 *    Frequency controlled by dustFrequency parameter (low/medium/high).
 *
 * 3. **Brightness Filter Effect**: Subtle pulsing brightness variations (0.95-1.05) to
 *    simulate projector light fluctuations. Creates a gentle flickering effect.
 *
 * The effect intensity and dust frequency are fully configurable:
 * - **intensity** (0-1): Controls overall grain opacity range and dust spike intensity
 * - **dustFrequency** (low/medium/high): Controls how often dust specks appear
 * - **ageLevel** (subtle/moderate/heavy): Controls the severity of film degradation
 *
 * All effects use provider mode with targetIds to apply directly to target components
 * without creating wrapper divs. Can be applied to any component type (text, video, image).
 *
 * Usage:
 * - Call this preset with targetIds array containing component IDs to affect
 * - Extract all three effects from _extractedEffects
 * - Apply effects to target components
 *
 * Example:
 * ```typescript
 * const effectResult = await presets.FilmGrainOverlay(params, props);
 * const allEffects = effectResult?.output?._extractedEffects || [];
 * component.effects = allEffects;
 * ```
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  intensity: z
    .number()
    .min(0)
    .max(1)
    .describe('Grain intensity from 0 (none) to 1 (maximum)'),
  dustFrequency: z
    .enum(['low', 'medium', 'high'])
    .describe('Frequency of dust particle appearances (low/medium/high)'),
  ageLevel: z
    .enum(['subtle', 'moderate', 'heavy'])
    .describe('Overall film degradation severity (subtle/moderate/heavy)'),
  duration: z
    .number()
    .describe('Total duration of the effect in seconds'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the film grain effect to'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs (default: film-grain)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    intensity,
    dustFrequency,
    ageLevel,
    duration,
    targetIds,
    effectIdPrefix = 'film-grain',
  } = params;

  // Helper function to generate random opacity values within a range
  const randomOpacity = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper function to determine dust spike count based on frequency
  const getDustSpikeCount = (freq: string, dur: number): number => {
    const baseRates: Record<string, number> = {
      low: 0.5, // 0.5 spikes per second
      medium: 1.5, // 1.5 spikes per second
      high: 3.0, // 3 spikes per second
    };
    return Math.floor(baseRates[freq] * dur);
  };

  // Helper function to get intensity multipliers based on age level
  const getAgeLevelMultipliers = (
    level: string,
  ): { grain: number; dust: number; brightness: number } => {
    const multipliers: Record<
      string,
      { grain: number; dust: number; brightness: number }
    > = {
      subtle: { grain: 0.5, dust: 0.6, brightness: 0.3 },
      moderate: { grain: 1.0, dust: 1.0, brightness: 0.6 },
      heavy: { grain: 1.5, dust: 1.4, brightness: 1.0 },
    };
    return multipliers[level];
  };

  const ageMult = getAgeLevelMultipliers(ageLevel);

  // Calculate base opacity ranges scaled by intensity and age level
  const grainMin = 0.02 * intensity * ageMult.grain;
  const grainMax = 0.15 * intensity * ageMult.grain;
  const dustMin = 0.3 * intensity * ageMult.dust;
  const dustMax = 0.5 * intensity * ageMult.dust;

  // 1. PRIMARY GRAIN EFFECT
  // Create 20+ keyframes with rapid opacity changes every 0.05 seconds
  const grainKeyframeInterval = 0.05; // 50ms intervals
  const grainKeyframeCount = Math.floor(duration / grainKeyframeInterval);
  const grainRanges: Array<{ key: string; val: number; prog: number }> = [];

  for (let i = 0; i <= grainKeyframeCount; i++) {
    const prog = i / grainKeyframeCount;
    const opacityVal = randomOpacity(grainMin, grainMax);
    grainRanges.push({
      key: 'opacity',
      val: opacityVal,
      prog: prog,
    });
  }

  const grainEffect: GenericEffectData = {
    type: 'linear', // Linear for rapid, jerky grain movement
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: grainRanges,
  };

  // 2. DUST SPECK EFFECT
  // Create random opacity spikes at random progress values
  const dustSpikeCount = getDustSpikeCount(dustFrequency, duration);
  const dustRanges: Array<{ key: string; val: number; prog: number }> = [];

  // Start with base opacity (transparent)
  dustRanges.push({ key: 'opacity', val: 0, prog: 0 });

  // Generate random dust spikes
  const dustSpikePositions: number[] = [];
  for (let i = 0; i < dustSpikeCount; i++) {
    dustSpikePositions.push(Math.random());
  }
  dustSpikePositions.sort((a, b) => a - b);

  // Create spikes with quick rise and fall
  for (const spikePos of dustSpikePositions) {
    const spikeIntensity = randomOpacity(dustMin, dustMax);
    const spikeDuration = 0.05; // 50ms spike duration
    const spikeDurationProg = spikeDuration / duration;

    // Add keyframes: before spike (transparent), peak (spike), after spike (transparent)
    const beforeProg = Math.max(0, spikePos - spikeDurationProg / 2);
    const peakProg = spikePos;
    const afterProg = Math.min(1, spikePos + spikeDurationProg / 2);

    dustRanges.push({ key: 'opacity', val: 0, prog: beforeProg });
    dustRanges.push({ key: 'opacity', val: spikeIntensity, prog: peakProg });
    dustRanges.push({ key: 'opacity', val: 0, prog: afterProg });
  }

  // End with base opacity
  dustRanges.push({ key: 'opacity', val: 0, prog: 1 });

  // Sort by progress to ensure proper keyframe order
  dustRanges.sort((a, b) => a.prog - b.prog);

  const dustEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: dustRanges,
  };

  // 3. BRIGHTNESS FILTER EFFECT
  // Create subtle pulsing brightness variations to simulate projector flicker
  const brightnessKeyframeInterval = 0.1; // 100ms intervals (slower than grain)
  const brightnessKeyframeCount = Math.floor(
    duration / brightnessKeyframeInterval,
  );
  const brightnessRanges: Array<{ key: string; val: number; prog: number }> =
    [];

  // Brightness variation range scaled by age level
  const brightnessMin = 0.95 - 0.02 * ageMult.brightness;
  const brightnessMax = 1.05 + 0.02 * ageMult.brightness;

  for (let i = 0; i <= brightnessKeyframeCount; i++) {
    const prog = i / brightnessKeyframeCount;
    const brightnessVal = randomOpacity(brightnessMin, brightnessMax);
    brightnessRanges.push({
      key: 'brightness',
      val: brightnessVal,
      prog: prog,
    });
  }

  const brightnessEffect: GenericEffectData = {
    type: 'ease-in-out', // Smooth brightness transitions
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: brightnessRanges,
  };

  // Create effect nodes
  const effects = [
    {
      id: `${effectIdPrefix}-grain-${targetIds.join('-')}`,
      componentId: 'generic',
      data: grainEffect,
    },
    {
      id: `${effectIdPrefix}-dust-${targetIds.join('-')}`,
      componentId: 'generic',
      data: dustEffect,
    },
    {
      id: `${effectIdPrefix}-brightness-${targetIds.join('-')}`,
      componentId: 'generic',
      data: brightnessEffect,
    },
  ];

  // Return effects in standard container structure
  return {
    output: {
      childrenData: [
        {
          id: `${effectIdPrefix}-effect-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Placeholder duration for container
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
  id: 'FilmGrainOverlay',
  title: 'Film Grain Overlay Effect',
  description:
    'Internal effect preset that adds animated film grain, dust particles, and projector light variations to any component. Creates authentic vintage film degradation with layered opacity and brightness animations. Supports configurable grain intensity, dust frequency, and age levels. Returns three separate effects (grain, dust, brightness) via provider mode with targetIds.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'film-grain', 'vintage', 'overlay', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    intensity: 0.5,
    dustFrequency: 'medium',
    ageLevel: 'moderate',
    duration: 10,
    targetIds: ['component-1'],
    effectIdPrefix: 'film-grain',
  },
};

// Export preset
export const FilmGrainOverlayPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
