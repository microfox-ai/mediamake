/**
 * PulseFade Internal Effect Preset
 *
 * Creates rhythmic opacity pulses with customizable wave patterns. Unlike simple fading,
 * this effect supports multiple pulse patterns: heartbeat (double pulse), strobe (rapid on/off),
 * wave (smooth sine), and flicker (random variations). Each pattern has its own timing
 * characteristics and opacity curves.
 *
 * Features:
 * - Multiple pulse patterns: heartbeat, strobe, wave, flicker
 * - Pattern-specific keyframe generation with unique timing characteristics
 * - Customizable pulse frequency, intensity variation, and rest periods
 * - Pattern chaining: sequence different patterns in a single effect
 * - Optional color temperature shifts synchronized with opacity pulses
 * - Perlin noise-based flicker for organic randomness
 *
 * Use cases:
 * - Creating attention-grabbing text animations
 * - Simulating heartbeat effects for dramatic scenes
 * - Strobe effects for high-energy transitions
 * - Natural flicker effects for candles, screens, or lights
 * - Adding visual interest with synchronized color shifts
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the pulse effect to'),
  pattern: z
    .enum(['heartbeat', 'strobe', 'wave', 'flicker'])
    .describe('Pulse pattern type to apply'),
  frequency: z
    .number()
    .min(0.1)
    .max(10)
    .optional()
    .default(1)
    .describe('Pulse frequency in Hz (pulses per second)'),
  intensity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(1)
    .describe('Intensity of the pulse effect (0 = subtle, 1 = full range)'),
  restPeriod: z
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe('Rest period between pulses in seconds'),
  repetitions: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe('Number of times to repeat the pattern'),
  colorShift: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable color temperature shift synchronized with pulses'),
  colorWarmth: z
    .number()
    .min(0.8)
    .max(1.2)
    .optional()
    .default(1.1)
    .describe('Color temperature warmth multiplier (1 = neutral, >1 = warmer)'),
  chainPatterns: z
    .array(z.enum(['heartbeat', 'strobe', 'wave', 'flicker']))
    .optional()
    .describe('Array of patterns to chain in sequence'),
  effectStart: z
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe('Start time of the effect relative to parent'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Simple Perlin-like noise generator for flicker
  const generateNoise = (seed: number, scale: number = 1): number => {
    const x = Math.sin(seed * 12.9898 + scale * 78.233) * 43758.5453123;
    return (x - Math.floor(x)) * 2 - 1; // Range: -1 to 1
  };

  // Helper: Generate heartbeat pattern keyframes
  const generateHeartbeatKeyframes = (
    intensity: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const minOpacity = Math.max(0, 1 - intensity);
    const maxOpacity = 1;

    return [
      { key: 'opacity', val: minOpacity, prog: 0 },
      { key: 'opacity', val: maxOpacity * 0.8, prog: 0.1 },
      { key: 'opacity', val: minOpacity * 0.3, prog: 0.15 },
      { key: 'opacity', val: maxOpacity, prog: 0.25 },
      { key: 'opacity', val: minOpacity * 0.3, prog: 0.3 },
      { key: 'opacity', val: minOpacity, prog: 0.4 },
      { key: 'opacity', val: minOpacity, prog: 1 },
    ];
  };

  // Helper: Generate strobe pattern keyframes
  const generateStrobeKeyframes = (
    intensity: number,
    frequency: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const minOpacity = Math.max(0, 1 - intensity);
    const maxOpacity = 1;
    const cycles = Math.max(2, Math.floor(frequency * 2));
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= cycles; i++) {
      const prog = i / cycles;
      const isOn = i % 2 === 0;
      keyframes.push({
        key: 'opacity',
        val: isOn ? maxOpacity : minOpacity,
        prog,
      });
    }

    return keyframes;
  };

  // Helper: Generate wave pattern keyframes (smooth sine)
  const generateWaveKeyframes = (
    intensity: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const minOpacity = Math.max(0, 1 - intensity);
    const maxOpacity = 1;
    const samples = 20;
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= samples; i++) {
      const prog = i / samples;
      const sineValue = Math.sin(prog * Math.PI * 2);
      const opacity = minOpacity + ((sineValue + 1) / 2) * (maxOpacity - minOpacity);
      keyframes.push({
        key: 'opacity',
        val: opacity,
        prog,
      });
    }

    return keyframes;
  };

  // Helper: Generate flicker pattern keyframes (Perlin noise-based)
  const generateFlickerKeyframes = (
    intensity: number,
    seed: number = 42,
  ): Array<{ key: string; val: number; prog: number }> => {
    const minOpacity = Math.max(0, 1 - intensity);
    const maxOpacity = 1;
    const samples = 30;
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= samples; i++) {
      const prog = i / samples;
      const noise = generateNoise(seed + i * 0.5, prog * 10);
      const smoothNoise = (noise + 1) / 2; // Normalize to 0-1
      const opacity = minOpacity + smoothNoise * (maxOpacity - minOpacity);
      keyframes.push({
        key: 'opacity',
        val: Math.max(0, Math.min(1, opacity)),
        prog,
      });
    }

    return keyframes;
  };

  // Helper: Generate pattern keyframes based on pattern type
  const generatePatternKeyframes = (
    pattern: 'heartbeat' | 'strobe' | 'wave' | 'flicker',
    intensity: number,
    frequency: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    switch (pattern) {
      case 'heartbeat':
        return generateHeartbeatKeyframes(intensity);
      case 'strobe':
        return generateStrobeKeyframes(intensity, frequency);
      case 'wave':
        return generateWaveKeyframes(intensity);
      case 'flicker':
        return generateFlickerKeyframes(intensity);
      default:
        return generateWaveKeyframes(intensity);
    }
  };

  // Helper: Calculate pattern duration
  const calculatePatternDuration = (
    pattern: 'heartbeat' | 'strobe' | 'wave' | 'flicker',
    frequency: number,
    restPeriod: number,
  ): number => {
    const baseDuration = 1 / frequency;
    const patternDurations: Record<string, number> = {
      heartbeat: baseDuration * 1.5,
      strobe: baseDuration,
      wave: baseDuration,
      flicker: baseDuration * 2,
    };
    return patternDurations[pattern] + restPeriod;
  };

  // Helper: Generate color temperature keyframes
  const generateColorTempKeyframes = (
    opacityKeyframes: Array<{ key: string; val: number; prog: number }>,
    warmth: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    return opacityKeyframes.map(kf => {
      const opacityValue = kf.val;
      const brightnessValue = 0.9 + opacityValue * 0.2 * (warmth - 1);
      return {
        key: 'brightness',
        val: brightnessValue,
        prog: kf.prog,
      };
    });
  };

  // Main execution logic
  const {
    targetIds,
    pattern,
    frequency = 1,
    intensity = 1,
    restPeriod = 0,
    repetitions = 1,
    colorShift = false,
    colorWarmth = 1.1,
    chainPatterns,
    effectStart = 0,
    effectId,
  } = params;

  const effects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  // Determine patterns to process (single or chained)
  const patternsToProcess = chainPatterns || [pattern];

  // Generate effects for each pattern in the chain
  let cumulativeStart = effectStart;

  patternsToProcess.forEach((currentPattern, patternIndex) => {
    for (let rep = 0; rep < repetitions; rep++) {
      const patternDuration = calculatePatternDuration(
        currentPattern,
        frequency,
        restPeriod,
      );

      // Generate opacity keyframes
      const opacityKeyframes = generatePatternKeyframes(
        currentPattern,
        intensity,
        frequency,
      );

      // Create opacity effect
      const opacityEffectData: GenericEffectData = {
        type: currentPattern === 'heartbeat' ? 'ease-out' : 'linear',
        start: cumulativeStart,
        duration: patternDuration,
        mode: 'provider',
        targetIds,
        ranges: opacityKeyframes,
      };

      effects.push({
        id:
          effectId ||
          `pulse-fade-${currentPattern}-${patternIndex}-${rep}-${targetIds[0]}`,
        componentId: 'generic',
        data: opacityEffectData,
      });

      // Add color temperature effect if enabled
      if (colorShift) {
        const colorKeyframes = generateColorTempKeyframes(
          opacityKeyframes,
          colorWarmth,
        );

        const colorEffectData: GenericEffectData = {
          type: 'linear',
          start: cumulativeStart,
          duration: patternDuration,
          mode: 'provider',
          targetIds,
          ranges: colorKeyframes,
        };

        effects.push({
          id: `pulse-fade-color-${currentPattern}-${patternIndex}-${rep}-${targetIds[0]}`,
          componentId: 'generic',
          data: colorEffectData,
        });
      }

      cumulativeStart += patternDuration;
    }
  });

  // Calculate total duration
  const totalDuration = cumulativeStart - effectStart;

  // Create container with effects
  const rootContainer: RenderableComponentData = {
    id: 'pulse-fade-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(10, totalDuration),
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'pulse-fade-effect',
  title: 'PulseFade Internal Effect',
  description:
    'An internal effect preset that creates rhythmic opacity pulses with customizable wave patterns including heartbeat (double pulse), strobe (rapid on/off), wave (smooth sine), and flicker (random variations). Features pattern-specific keyframe generation, frequency control, intensity variation, rest periods, pattern chaining, and optional color temperature shifts during pulses.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'pulse', 'fade', 'heartbeat', 'strobe', 'wave', 'flicker', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    pattern: 'wave',
    frequency: 1,
    intensity: 1,
    restPeriod: 0,
    repetitions: 1,
    colorShift: false,
    colorWarmth: 1.1,
    effectStart: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pulseFadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
