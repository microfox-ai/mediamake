/**
 * Datamosh RGB Corruption Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset simulates video compression artifacts and datamoshing effects
 * through aggressive RGB channel manipulation. Creates the appearance of corrupted video data
 * by randomly displacing and distorting color channels, similar to broken video codecs.
 *
 * Returns three effects with staggered timing for channel lag:
 * - Red channel corruption (starts immediately)
 * - Green channel corruption (starts after channelLag delay)
 * - Blue channel corruption (starts after channelLag * 2 delay)
 *
 * Each effect uses different distortion patterns with abrupt, glitchy transitions.
 * Includes pixel-sorting simulation via CSS clip-path and compression artifacts via filters.
 *
 * Features:
 * - Aggressive RGB channel manipulation with skew, scale, and translate transforms
 * - Abrupt, glitchy transitions with sudden jumps at multiple keyframes
 * - Pixel-sorting simulation using clip-path animations
 * - Blocky JPEG-like compression artifacts via contrast and saturation filters
 * - Staggered timing between channels for realistic corruption lag
 *
 * Use cases:
 * - Video glitch effects
 * - Datamosh-style transitions
 * - Corrupted video aesthetic
 * - Digital distortion effects
 * - Glitch art animations
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
    .describe('Array of component IDs to apply corruption effects to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the corruption effect (relative to parent)'),
  glitchDuration: z
    .number()
    .default(2)
    .describe('Duration of corruption burst in seconds'),
  corruptionLevel: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of corruption effect (0-1)'),
  channelLag: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between channel updates in seconds'),
  compressionArtifacts: z
    .boolean()
    .default(true)
    .describe('Enable blocky JPEG-like compression artifacts'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    effectStart,
    glitchDuration,
    corruptionLevel,
    channelLag,
    compressionArtifacts,
    effectIdPrefix = 'datamosh',
  } = params;

  // Helper function to generate random corruption values
  const getCorruptionValue = (base: number, variance: number): number => {
    return base + (Math.random() - 0.5) * variance * 2;
  };

  // Scale corruption values based on corruptionLevel
  const scaleCorruption = (value: number): number => {
    return value * corruptionLevel;
  };

  // Red channel effect - starts immediately
  const redChannelEffect: GenericEffectData = {
    type: 'linear', // Abrupt transitions
    start: effectStart,
    duration: glitchDuration,
    mode: 'provider',
    targetIds,
    ranges: [
      // Initial state
      { key: 'skewX', val: 0, prog: 0 },
      { key: 'skewY', val: 0, prog: 0 },
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
      {
        key: 'clipPath',
        val: 'inset(0% 0% 0% 0%)',
        prog: 0,
      },
      { key: 'filter', val: 'contrast(1) saturate(1)', prog: 0 },

      // Jump at 0.1
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(15, 10))}deg`,
        prog: 0.1,
      },
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(-8, 8))}deg`,
        prog: 0.1,
      },
      {
        key: 'scaleX',
        val: 1 + scaleCorruption(getCorruptionValue(0.2, 0.15)),
        prog: 0.1,
      },
      {
        key: 'scaleY',
        val: 1 + scaleCorruption(getCorruptionValue(-0.1, 0.1)),
        prog: 0.1,
      },
      {
        key: 'translateX',
        val: scaleCorruption(getCorruptionValue(20, 15)),
        prog: 0.1,
      },
      {
        key: 'translateY',
        val: scaleCorruption(getCorruptionValue(-10, 10)),
        prog: 0.1,
      },
      {
        key: 'clipPath',
        val: 'inset(5% 10% 5% 0%)',
        prog: 0.1,
      },

      // Hold at 0.2
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(15, 10))}deg`,
        prog: 0.2,
      },
      {
        key: 'clipPath',
        val: 'inset(5% 10% 5% 0%)',
        prog: 0.2,
      },

      // Jump at 0.4
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(-12, 8))}deg`,
        prog: 0.4,
      },
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(10, 6))}deg`,
        prog: 0.4,
      },
      {
        key: 'scaleX',
        val: 1 + scaleCorruption(getCorruptionValue(-0.15, 0.1)),
        prog: 0.4,
      },
      {
        key: 'translateX',
        val: scaleCorruption(getCorruptionValue(-25, 20)),
        prog: 0.4,
      },
      {
        key: 'translateY',
        val: scaleCorruption(getCorruptionValue(15, 12)),
        prog: 0.4,
      },
      {
        key: 'clipPath',
        val: 'inset(0% 5% 10% 5%)',
        prog: 0.4,
      },

      // Jump at 0.6
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(8, 10))}deg`,
        prog: 0.6,
      },
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(-15, 8))}deg`,
        prog: 0.6,
      },
      {
        key: 'scaleY',
        val: 1 + scaleCorruption(getCorruptionValue(0.25, 0.15)),
        prog: 0.6,
      },
      {
        key: 'translateX',
        val: scaleCorruption(getCorruptionValue(10, 15)),
        prog: 0.6,
      },
      {
        key: 'clipPath',
        val: 'inset(10% 0% 0% 10%)',
        prog: 0.6,
      },

      // Jump at 0.8
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(-5, 8))}deg`,
        prog: 0.8,
      },
      {
        key: 'scaleX',
        val: 1 + scaleCorruption(getCorruptionValue(0.1, 0.1)),
        prog: 0.8,
      },
      {
        key: 'translateY',
        val: scaleCorruption(getCorruptionValue(-20, 15)),
        prog: 0.8,
      },
      {
        key: 'clipPath',
        val: 'inset(0% 10% 5% 0%)',
        prog: 0.8,
      },

      // Final state at 1.0
      { key: 'skewX', val: 0, prog: 1 },
      { key: 'skewY', val: 0, prog: 1 },
      { key: 'scaleX', val: 1, prog: 1 },
      { key: 'scaleY', val: 1, prog: 1 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 1 },
      {
        key: 'clipPath',
        val: 'inset(0% 0% 0% 0%)',
        prog: 1,
      },
    ],
  };

  // Add compression artifacts filter if enabled
  if (compressionArtifacts) {
    redChannelEffect.ranges!.push(
      { key: 'filter', val: 'contrast(1.3) saturate(1.5)', prog: 0.1 },
      { key: 'filter', val: 'contrast(1.3) saturate(1.5)', prog: 0.2 },
      { key: 'filter', val: 'contrast(1.4) saturate(1.8)', prog: 0.4 },
      { key: 'filter', val: 'contrast(1.2) saturate(1.6)', prog: 0.6 },
      { key: 'filter', val: 'contrast(1.1) saturate(1.3)', prog: 0.8 },
      { key: 'filter', val: 'contrast(1) saturate(1)', prog: 1 },
    );
  }

  // Green channel effect - starts after channelLag
  const greenChannelEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart + channelLag,
    duration: glitchDuration,
    mode: 'provider',
    targetIds,
    ranges: [
      // Initial state
      { key: 'skewX', val: 0, prog: 0 },
      { key: 'skewY', val: 0, prog: 0 },
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
      {
        key: 'clipPath',
        val: 'inset(0% 0% 0% 0%)',
        prog: 0,
      },

      // Jump at 0.1 - different pattern from red
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(-10, 12))}deg`,
        prog: 0.1,
      },
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(12, 8))}deg`,
        prog: 0.1,
      },
      {
        key: 'scaleX',
        val: 1 + scaleCorruption(getCorruptionValue(-0.18, 0.12)),
        prog: 0.1,
      },
      {
        key: 'scaleY',
        val: 1 + scaleCorruption(getCorruptionValue(0.15, 0.1)),
        prog: 0.1,
      },
      {
        key: 'translateX',
        val: scaleCorruption(getCorruptionValue(-15, 18)),
        prog: 0.1,
      },
      {
        key: 'translateY',
        val: scaleCorruption(getCorruptionValue(18, 12)),
        prog: 0.1,
      },
      {
        key: 'clipPath',
        val: 'inset(0% 5% 10% 5%)',
        prog: 0.1,
      },

      // Hold at 0.2
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(-10, 12))}deg`,
        prog: 0.2,
      },
      {
        key: 'clipPath',
        val: 'inset(0% 5% 10% 5%)',
        prog: 0.2,
      },

      // Jump at 0.4
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(18, 10))}deg`,
        prog: 0.4,
      },
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(-6, 8))}deg`,
        prog: 0.4,
      },
      {
        key: 'scaleY',
        val: 1 + scaleCorruption(getCorruptionValue(-0.2, 0.12)),
        prog: 0.4,
      },
      {
        key: 'translateX',
        val: scaleCorruption(getCorruptionValue(22, 15)),
        prog: 0.4,
      },
      {
        key: 'translateY',
        val: scaleCorruption(getCorruptionValue(-12, 15)),
        prog: 0.4,
      },
      {
        key: 'clipPath',
        val: 'inset(10% 0% 5% 10%)',
        prog: 0.4,
      },

      // Jump at 0.6
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(-14, 8))}deg`,
        prog: 0.6,
      },
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(9, 10))}deg`,
        prog: 0.6,
      },
      {
        key: 'scaleX',
        val: 1 + scaleCorruption(getCorruptionValue(0.22, 0.12)),
        prog: 0.6,
      },
      {
        key: 'translateY',
        val: scaleCorruption(getCorruptionValue(16, 12)),
        prog: 0.6,
      },
      {
        key: 'clipPath',
        val: 'inset(5% 10% 0% 0%)',
        prog: 0.6,
      },

      // Jump at 0.8
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(-8, 10))}deg`,
        prog: 0.8,
      },
      {
        key: 'scaleY',
        val: 1 + scaleCorruption(getCorruptionValue(0.12, 0.1)),
        prog: 0.8,
      },
      {
        key: 'translateX',
        val: scaleCorruption(getCorruptionValue(-18, 15)),
        prog: 0.8,
      },
      {
        key: 'clipPath',
        val: 'inset(0% 0% 10% 5%)',
        prog: 0.8,
      },

      // Final state
      { key: 'skewX', val: 0, prog: 1 },
      { key: 'skewY', val: 0, prog: 1 },
      { key: 'scaleX', val: 1, prog: 1 },
      { key: 'scaleY', val: 1, prog: 1 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 1 },
      {
        key: 'clipPath',
        val: 'inset(0% 0% 0% 0%)',
        prog: 1,
      },
    ],
  };

  // Add compression artifacts for green channel
  if (compressionArtifacts) {
    greenChannelEffect.ranges!.push(
      { key: 'filter', val: 'contrast(1) saturate(1)', prog: 0 },
      { key: 'filter', val: 'contrast(1.4) saturate(1.7)', prog: 0.1 },
      { key: 'filter', val: 'contrast(1.4) saturate(1.7)', prog: 0.2 },
      { key: 'filter', val: 'contrast(1.5) saturate(2.0)', prog: 0.4 },
      { key: 'filter', val: 'contrast(1.3) saturate(1.5)', prog: 0.6 },
      { key: 'filter', val: 'contrast(1.2) saturate(1.4)', prog: 0.8 },
      { key: 'filter', val: 'contrast(1) saturate(1)', prog: 1 },
    );
  }

  // Blue channel effect - starts after channelLag * 2
  const blueChannelEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart + channelLag * 2,
    duration: glitchDuration,
    mode: 'provider',
    targetIds,
    ranges: [
      // Initial state
      { key: 'skewX', val: 0, prog: 0 },
      { key: 'skewY', val: 0, prog: 0 },
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
      {
        key: 'clipPath',
        val: 'inset(0% 0% 0% 0%)',
        prog: 0,
      },

      // Jump at 0.1 - unique pattern
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(8, 14))}deg`,
        prog: 0.1,
      },
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(-16, 10))}deg`,
        prog: 0.1,
      },
      {
        key: 'scaleX',
        val: 1 + scaleCorruption(getCorruptionValue(0.25, 0.15)),
        prog: 0.1,
      },
      {
        key: 'scaleY',
        val: 1 + scaleCorruption(getCorruptionValue(-0.12, 0.1)),
        prog: 0.1,
      },
      {
        key: 'translateX',
        val: scaleCorruption(getCorruptionValue(12, 20)),
        prog: 0.1,
      },
      {
        key: 'translateY',
        val: scaleCorruption(getCorruptionValue(-22, 15)),
        prog: 0.1,
      },
      {
        key: 'clipPath',
        val: 'inset(10% 5% 0% 5%)',
        prog: 0.1,
      },

      // Hold at 0.2
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(8, 14))}deg`,
        prog: 0.2,
      },
      {
        key: 'clipPath',
        val: 'inset(10% 5% 0% 5%)',
        prog: 0.2,
      },

      // Jump at 0.4
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(-20, 12))}deg`,
        prog: 0.4,
      },
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(14, 8))}deg`,
        prog: 0.4,
      },
      {
        key: 'scaleX',
        val: 1 + scaleCorruption(getCorruptionValue(-0.22, 0.15)),
        prog: 0.4,
      },
      {
        key: 'translateX',
        val: scaleCorruption(getCorruptionValue(-28, 18)),
        prog: 0.4,
      },
      {
        key: 'translateY',
        val: scaleCorruption(getCorruptionValue(20, 15)),
        prog: 0.4,
      },
      {
        key: 'clipPath',
        val: 'inset(0% 10% 10% 0%)',
        prog: 0.4,
      },

      // Jump at 0.6
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(11, 10))}deg`,
        prog: 0.6,
      },
      {
        key: 'skewY',
        val: `${scaleCorruption(getCorruptionValue(-10, 12))}deg`,
        prog: 0.6,
      },
      {
        key: 'scaleY',
        val: 1 + scaleCorruption(getCorruptionValue(0.28, 0.15)),
        prog: 0.6,
      },
      {
        key: 'translateX',
        val: scaleCorruption(getCorruptionValue(16, 15)),
        prog: 0.6,
      },
      {
        key: 'clipPath',
        val: 'inset(5% 0% 5% 10%)',
        prog: 0.6,
      },

      // Jump at 0.8
      {
        key: 'skewX',
        val: `${scaleCorruption(getCorruptionValue(-6, 10))}deg`,
        prog: 0.8,
      },
      {
        key: 'scaleX',
        val: 1 + scaleCorruption(getCorruptionValue(0.14, 0.12)),
        prog: 0.8,
      },
      {
        key: 'translateY',
        val: scaleCorruption(getCorruptionValue(-15, 18)),
        prog: 0.8,
      },
      {
        key: 'clipPath',
        val: 'inset(0% 5% 0% 10%)',
        prog: 0.8,
      },

      // Final state
      { key: 'skewX', val: 0, prog: 1 },
      { key: 'skewY', val: 0, prog: 1 },
      { key: 'scaleX', val: 1, prog: 1 },
      { key: 'scaleY', val: 1, prog: 1 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 1 },
      {
        key: 'clipPath',
        val: 'inset(0% 0% 0% 0%)',
        prog: 1,
      },
    ],
  };

  // Add compression artifacts for blue channel
  if (compressionArtifacts) {
    blueChannelEffect.ranges!.push(
      { key: 'filter', val: 'contrast(1) saturate(1)', prog: 0 },
      { key: 'filter', val: 'contrast(1.5) saturate(1.9)', prog: 0.1 },
      { key: 'filter', val: 'contrast(1.5) saturate(1.9)', prog: 0.2 },
      { key: 'filter', val: 'contrast(1.6) saturate(2.2)', prog: 0.4 },
      { key: 'filter', val: 'contrast(1.4) saturate(1.7)', prog: 0.6 },
      { key: 'filter', val: 'contrast(1.2) saturate(1.5)', prog: 0.8 },
      { key: 'filter', val: 'contrast(1) saturate(1)', prog: 1 },
    );
  }

  // Create effect nodes
  const effects = [
    {
      id: `${effectIdPrefix}-red-corruption`,
      componentId: 'generic',
      data: redChannelEffect,
    },
    {
      id: `${effectIdPrefix}-green-corruption`,
      componentId: 'generic',
      data: greenChannelEffect,
    },
    {
      id: `${effectIdPrefix}-blue-corruption`,
      componentId: 'generic',
      data: blueChannelEffect,
    },
  ];

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'datamosh-rgb-corruption-container',
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
        duration: 10,
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'datamoshRgbCorruption',
  title: 'Datamosh RGB Corruption Effect',
  description:
    'Internal effect preset simulating video compression artifacts and datamoshing through aggressive RGB channel manipulation. Creates corrupted video data appearance via displaced/distorted color channels with abrupt glitchy transitions, pixel-sorting simulation, and blocky compression artifacts. Uses staggered timing for channel lag effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'datamosh', 'corruption', 'rgb', 'compression'],
  defaultInputParams: {
    targetIds: ['target-component'],
    effectStart: 0,
    glitchDuration: 2,
    corruptionLevel: 0.5,
    channelLag: 0.1,
    compressionArtifacts: true,
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const datamoshRgbCorruptionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
