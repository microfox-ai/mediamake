/**
 * StrobeFlicker Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates rapid opacity and blur oscillations to produce attention-demanding strobe effects.
 * Designed for dramatic text reveals or image transitions with customizable flicker patterns.
 *
 * Features:
 * - Pattern presets: 'electric', 'broken-bulb', 'lightning'
 * - Custom pattern arrays support (0 or 1 values representing off/on states)
 * - Synchronized opacity (0-1) and blur (0-10px) pulsing
 * - SafeMode limits strobe frequency to 10Hz for accessibility
 * - DecayStrobe option for settling animations (intensity decreases over time)
 *
 * Pattern Examples:
 * - Electric: [1,0,1,0,0,1,1,0,1] - Regular rapid flicker
 * - Broken: [1,1,0,1,0,0,1,0,1,1] - Irregular stutter pattern
 * - Lightning: [0,1,1,0,0,0,1,0] - Quick flash with delays
 *
 * Use cases:
 * - Dramatic text reveals with strobe entry
 * - Image transitions with controlled chaos
 * - Attention-grabbing visual effects
 * - Horror or thriller mood creation
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply strobe effect to'),
  pattern: z
    .union([
      z.enum(['electric', 'broken-bulb', 'lightning']),
      z.array(z.number().min(0).max(1)),
    ])
    .default('electric')
    .describe('Flicker pattern: preset name or custom array of 0/1 values'),
  frequency: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Flicker frequency in Hz (flashes per second)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(15)
    .default(10)
    .describe('Maximum blur intensity in pixels'),
  safeMode: z
    .boolean()
    .default(true)
    .describe('Enable safe mode to limit frequency to 10Hz for accessibility'),
  decayStrobe: z
    .object({
      enabled: z.boolean().describe('Enable decay effect where intensity decreases over time'),
      decayRate: z.number().min(0.1).max(1).default(0.5).describe('Rate of decay (0.1 = slow, 1 = fast)'),
    })
    .optional()
    .describe('Optional decay configuration for settling animation'),
  duration: z
    .number()
    .min(0.1)
    .default(0.5)
    .describe('Duration of strobe effect in seconds'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Pattern presets
  const PATTERN_PRESETS: Record<string, number[]> = {
    electric: [1, 0, 1, 0, 0, 1, 1, 0, 1],
    'broken-bulb': [1, 1, 0, 1, 0, 0, 1, 0, 1, 1],
    lightning: [0, 1, 1, 0, 0, 0, 1, 0],
  };

  // Get pattern array
  const patternArray =
    typeof params.pattern === 'string'
      ? PATTERN_PRESETS[params.pattern]
      : params.pattern;

  if (!patternArray || patternArray.length === 0) {
    throw new Error('Invalid pattern: must be a preset name or non-empty array');
  }

  // Apply safe mode frequency limit
  const effectiveFrequency = params.safeMode
    ? Math.min(params.frequency, 10)
    : params.frequency;

  // Calculate timing
  const duration = params.duration;
  const effectStart = params.effectStart;
  const patternLength = patternArray.length;

  // Generate keyframes for opacity and blur
  const opacityRanges: Array<{ key: string; val: number; prog: number }> = [];
  const blurRanges: Array<{ key: string; val: string; prog: number }> = [];

  for (let i = 0; i < patternLength; i++) {
    const progress = i / patternLength;
    const patternValue = patternArray[i];

    // Calculate decay multiplier if enabled
    let decayMultiplier = 1;
    if (params.decayStrobe?.enabled) {
      const decayRate = params.decayStrobe.decayRate;
      // Exponential decay: starts at 1, ends near 0
      decayMultiplier = Math.pow(1 - progress, 1 / decayRate);
    }

    // Opacity: pattern value 1 = full opacity, 0 = transparent
    // Apply decay to flicker intensity
    const opacityValue = params.decayStrobe?.enabled
      ? patternValue === 1
        ? 1
        : 1 - decayMultiplier
      : patternValue;

    opacityRanges.push({
      key: 'opacity',
      val: opacityValue,
      prog: progress,
    });

    // Blur: inverse of opacity (when bright, no blur; when dark, max blur)
    // Apply decay to blur intensity
    const blurValue = params.decayStrobe?.enabled
      ? patternValue === 1
        ? 0
        : params.blurIntensity * (1 - decayMultiplier)
      : patternValue === 1
      ? 0
      : params.blurIntensity;

    blurRanges.push({
      key: 'filter',
      val: `blur(${blurValue}px)`,
      prog: progress,
    });
  }

  // Add final keyframe for smooth end (if decay enabled, settle to focus)
  if (params.decayStrobe?.enabled) {
    opacityRanges.push({
      key: 'opacity',
      val: 1,
      prog: 1,
    });
    blurRanges.push({
      key: 'filter',
      val: 'blur(0px)',
      prog: 1,
    });
  } else {
    // Repeat last keyframe
    const lastOpacity = opacityRanges[opacityRanges.length - 1];
    const lastBlur = blurRanges[blurRanges.length - 1];
    opacityRanges.push({
      key: 'opacity',
      val: lastOpacity.val,
      prog: 1,
    });
    blurRanges.push({
      key: 'filter',
      val: lastBlur.val,
      prog: 1,
    });
  }

  // Combine ranges
  const combinedRanges = [...opacityRanges, ...blurRanges];

  // Create effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Use linear for precise strobe timing
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: combinedRanges,
  };

  const effect = {
    id: params.effectId || `strobe-flicker-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'strobe-flicker-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'strobeFlickerEffect',
  title: 'StrobeFlicker Effect',
  description:
    'Internal effect preset that creates attention-demanding strobe effects using rapid opacity and blur oscillations. Features customizable flicker patterns (electric, broken-bulb, lightning, custom arrays), synchronized opacity (0-1) and blur (0-10px) pulsing, safeMode for accessibility (limits to 10Hz), and decayStrobe option for settling animations. Designed for dramatic text reveals or image transitions with controlled visual chaos.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'strobe',
    'flicker',
    'opacity',
    'blur',
    'dramatic',
    'attention',
    'generic',
    'internal',
  ],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    targetId: 'component-1',
    pattern: 'electric',
    frequency: 10,
    blurIntensity: 10,
    safeMode: true,
    duration: 0.5,
    effectStart: 0,
  },
};

export const strobeFlickerEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
