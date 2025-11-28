/**
 * DataMosh Displace Effect Preset
 *
 * INTERNAL EFFECT PRESET - ARRAY OF EFFECTS
 *
 * Simulates video datamoshing artifacts through multiple layered displacement effects.
 * This preset combines three distinct effect types to create a glitchy, corrupted video aesthetic:
 *
 * 1. Frame Ghosting: Stepped opacity changes that simulate frame persistence artifacts
 * 2. Macroblock Displacement: Pseudo-random translate3d() jumps mimicking compression artifacts
 * 3. Color Channel Corruption: Cycling filter effects for color distortion
 *
 * Features:
 * - Temporal offset between effects creates realistic video corruption artifacts
 * - Pseudo-random displacement patterns based on effect index for controlled chaos
 * - Configurable corruption level, block count, and color glitch toggle
 * - Stepped/jumped values instead of smooth transitions for authentic datamosh feel
 *
 * Use cases:
 * - Glitch art and experimental video aesthetics
 * - Music video effects and VJ loops
 * - Cyberpunk and digital corruption themes
 * - Transitional effects between scenes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply datamosh effects to'),
  corruptionLevel: z
    .number()
    .min(0)
    .max(100)
    .default(60)
    .describe(
      'Intensity of corruption artifacts - affects displacement range and opacity drops (0-100)',
    ),
  blockCount: z
    .number()
    .min(3)
    .max(12)
    .default(6)
    .describe(
      'Number of displacement jumps/macroblocks to simulate (3-12)',
    ),
  colorGlitch: z
    .boolean()
    .default(true)
    .describe('Enable/disable color channel corruption filter effect'),
  duration: z
    .number()
    .min(500)
    .max(3000)
    .default(1200)
    .describe('Total duration of the effect in milliseconds (500-3000ms)'),
  effectStartTime: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert duration from milliseconds to seconds
  const durationInSeconds = params.duration / 1000;
  const startTime = params.effectStartTime;

  // Helper: Generate stepped opacity values for frame ghosting
  const generateSteppedOpacity = (
    corruptionLevel: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    // Base pattern: [1.0, 0.3, 0.8, 0.2, 1.0]
    // Corruption level affects the depth of opacity drops
    const intensityFactor = corruptionLevel / 100;
    const baseSteps = [1.0, 0.3, 0.8, 0.2, 1.0];

    const ranges = baseSteps.map((baseVal, index) => {
      const adjustedVal =
        baseVal < 1.0
          ? Math.max(0.1, baseVal - intensityFactor * 0.3)
          : baseVal;
      return {
        key: 'opacity',
        val: adjustedVal,
        prog: index / (baseSteps.length - 1),
      };
    });

    return ranges;
  };

  // Helper: Generate pseudo-random displacement jumps for macroblock effect
  const generateBlockDisplacement = (
    blockCount: number,
    corruptionLevel: number,
  ): Array<{ key: string; val: string; prog: number }> => {
    const intensityFactor = corruptionLevel / 100;
    const maxDisplacement = 50 * intensityFactor; // Max pixels to displace

    const ranges: Array<{ key: string; val: string; prog: number }> = [];

    for (let i = 0; i <= blockCount; i++) {
      // Pseudo-random pattern based on index
      const seed = i * 2654435761; // Large prime for distribution
      const randomX =
        ((seed % 1000) / 1000) * maxDisplacement * 2 - maxDisplacement;
      const randomY =
        (((seed * 7) % 1000) / 1000) * maxDisplacement * 2 - maxDisplacement;

      ranges.push({
        key: 'transform',
        val: `translate3d(${randomX.toFixed(2)}px, ${randomY.toFixed(2)}px, 0)`,
        prog: i / blockCount,
      });
    }

    return ranges;
  };

  // Helper: Generate color corruption filter cycles
  const generateColorCorruption = (): Array<{
    key: string;
    val: string;
    prog: number;
  }> => {
    // Cycle through: normal → high contrast desaturated → overexposed → normal
    return [
      {
        key: 'filter',
        val: 'contrast(100%) saturate(100%) brightness(100%)',
        prog: 0,
      },
      {
        key: 'filter',
        val: 'contrast(150%) saturate(0%) brightness(120%)',
        prog: 0.33,
      },
      {
        key: 'filter',
        val: 'contrast(180%) saturate(50%) brightness(140%)',
        prog: 0.66,
      },
      {
        key: 'filter',
        val: 'contrast(100%) saturate(100%) brightness(100%)',
        prog: 1,
      },
    ];
  };

  // Effect 1: Frame Ghosting (opacity stepping)
  const frameGhostingEffect: GenericEffectData = {
    type: 'linear', // Linear for harsh stepped transitions
    start: startTime, // Starts immediately
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: generateSteppedOpacity(params.corruptionLevel),
  };

  // Effect 2: Macroblock Displacement (translate3d jumps)
  // Starts 50ms (0.05s) after frame ghosting for temporal artifacts
  const macroblockDisplacementEffect: GenericEffectData = {
    type: 'linear', // Linear for jumped transitions
    start: startTime + 0.05,
    duration: durationInSeconds - 0.05,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: generateBlockDisplacement(
      params.blockCount,
      params.corruptionLevel,
    ),
  };

  // Effect 3: Color Channel Corruption (filter cycling)
  // Starts 25ms (0.025s) after frame ghosting (midpoint offset)
  const colorCorruptionEffect: GenericEffectData | null = params.colorGlitch
    ? {
        type: 'linear', // Linear for abrupt filter changes
        start: startTime + 0.025,
        duration: durationInSeconds - 0.025,
        mode: 'provider',
        targetIds: params.targetIds,
        ranges: generateColorCorruption(),
      }
    : null;

  // Construct effect array
  const effects = [
    {
      id: `datamosh-frame-ghosting-${params.targetIds.join('-')}`,
      componentId: 'generic',
      data: frameGhostingEffect,
    },
    {
      id: `datamosh-macroblock-displacement-${params.targetIds.join('-')}`,
      componentId: 'generic',
      data: macroblockDisplacementEffect,
    },
  ];

  if (colorCorruptionEffect) {
    effects.push({
      id: `datamosh-color-corruption-${params.targetIds.join('-')}`,
      componentId: 'generic',
      data: colorCorruptionEffect,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'datamosh-displace-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: durationInSeconds + 0.05, // Slightly longer to accommodate offsets
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
  id: 'datamosh-displace',
  title: 'DataMosh Displace Effect',
  description:
    'Internal effect preset that simulates video datamoshing artifacts through multiple layered displacement effects. Combines frame ghosting (stepped opacity), macroblock displacement (pseudo-random translate3d jumps), and color channel corruption (contrast/saturation/brightness cycling). Returns an effects array for consumption by other presets.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'datamosh', 'displacement', 'corruption', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    corruptionLevel: 60,
    blockCount: 6,
    colorGlitch: true,
    duration: 1200,
    effectStartTime: 0,
  },
};

export const datamoshDisplacePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
