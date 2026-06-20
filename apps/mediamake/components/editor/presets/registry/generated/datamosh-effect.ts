/**
 * DataMosh Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 *
 * This preset simulates video compression artifacts and frame bleeding with irregular
 * stuttery transitions. It creates persistent trails that decay irregularly through
 * combinations of blur, brightness, and transform effects with non-linear progression points.
 *
 * Features:
 * - Irregular stuttery transitions between normal and corrupted states
 * - Non-linear progression points to simulate compression errors
 * - Combinations of blur, brightness, and transform effects
 * - Configurable corruption level and decay patterns
 * - Pixel shift transforms for broken video feeling
 * - Persistence time control for trail effects
 *
 * Use cases:
 * - Creating glitchy video aesthetics
 * - Simulating broken video compression
 * - Adding digital artifact effects
 * - Building corrupted data visuals
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to target with the effect'),
  inputDuration: z.number().describe('Duration of the effect in seconds'),
  corruptionLevel: z.number().min(0).max(1).default(0.5).describe('Corruption intensity level (0 = subtle, 1 = extreme)'),
  decayPattern: z.enum(['linear', 'exponential', 'random']).default('exponential').describe('Pattern for trail decay effect'),
  pixelShift: z.number().min(0).max(20).default(10).describe('Maximum pixel shift for transform offset'),
  persistenceTime: z.number().default(1.5).describe('Duration of persistence trail effect in seconds'),
  effectStartTime: z.number().default(0).describe('Start time of the effect relative to parent'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    inputDuration,
    corruptionLevel,
    decayPattern,
    pixelShift,
    persistenceTime,
    effectStartTime,
  } = params;

  // Irregular progression points to create unpredictable stutters
  const irregularProgs = [0, 0.03, 0.07, 0.15, 0.16, 0.3, 0.35, 0.5, 0.52, 0.7, 0.85, 0.86, 1];

  // Calculate blur values based on corruption level
  // Alternating blur intensity with stutters
  const blurRanges = irregularProgs.map((prog, i) => {
    const isCorrupted = i % 2 === 1; // Odd indices are corrupted states
    const blurAmount = isCorrupted ? corruptionLevel * 8 : 0;
    return {
      key: 'blur',
      val: `${blurAmount}px`,
      prog,
    };
  });

  // Brightness flickers - alternating between normal and corrupted states
  const brightnessRanges = irregularProgs.map((prog, i) => {
    const isCorrupted = i % 2 === 1;
    const brightness = isCorrupted 
      ? 1.2 + corruptionLevel * 0.3 // Brighter during corruption
      : 0.8 - corruptionLevel * 0.2; // Darker during normal
    return {
      key: 'brightness',
      val: brightness,
      prog,
    };
  });

  // Pixel shift (translateY) - irregular vertical shifts
  const translateYRanges = irregularProgs.map((prog, i) => {
    const isCorrupted = i % 2 === 1;
    // Random-like shifts based on index and corruption level
    const shift = isCorrupted 
      ? ((i % 3) - 1) * pixelShift * corruptionLevel 
      : 0;
    return {
      key: 'translateY',
      val: `${shift}px`,
      prog,
    };
  });

  // Main corruption effect with irregular stutters
  const corruptionEffect: GenericEffectData = {
    type: 'linear', // Linear for sharp stutters
    start: effectStartTime,
    duration: inputDuration,
    mode: 'provider',
    targetIds,
    ranges: [
      ...blurRanges,
      ...brightnessRanges,
      ...translateYRanges,
    ],
  };

  // Persistence trail effect - decay pattern for frame bleeding
  let opacityDecayRanges: Array<{ key: string; val: number; prog: number }>;

  if (decayPattern === 'exponential') {
    // Exponential decay - fast fade initially, slower later
    opacityDecayRanges = [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0.7, prog: 0.15 },
      { key: 'opacity', val: 0.4, prog: 0.35 },
      { key: 'opacity', val: 0.15, prog: 0.6 },
      { key: 'opacity', val: 0.05, prog: 0.85 },
      { key: 'opacity', val: 0, prog: 1 },
    ];
  } else if (decayPattern === 'random') {
    // Random decay - irregular flickering fade
    opacityDecayRanges = [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0.8, prog: 0.1 },
      { key: 'opacity', val: 0.5, prog: 0.2 },
      { key: 'opacity', val: 0.7, prog: 0.3 },
      { key: 'opacity', val: 0.3, prog: 0.5 },
      { key: 'opacity', val: 0.4, prog: 0.65 },
      { key: 'opacity', val: 0.1, prog: 0.8 },
      { key: 'opacity', val: 0, prog: 1 },
    ];
  } else {
    // Linear decay - constant fade rate
    opacityDecayRanges = [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0.7, prog: 0.3 },
      { key: 'opacity', val: 0.4, prog: 0.6 },
      { key: 'opacity', val: 0, prog: 1 },
    ];
  }

  const persistenceEffect: GenericEffectData = {
    type: 'linear',
    start: effectStartTime + inputDuration - persistenceTime,
    duration: persistenceTime,
    mode: 'provider',
    targetIds,
    ranges: opacityDecayRanges,
  };

  // Create effect nodes
  const corruptionEffectNode = {
    id: `datamosh-corruption-${targetIds[0]}`,
    componentId: 'generic',
    data: corruptionEffect,
  };

  const persistenceEffectNode = {
    id: `datamosh-persistence-${targetIds[0]}`,
    componentId: 'generic',
    data: persistenceEffect,
  };

  const rootContainer: RenderableComponentData = {
    id: 'datamosh-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: [corruptionEffectNode, persistenceEffectNode],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: inputDuration + persistenceTime,
      },
    },
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
  id: 'datamosh-effect',
  title: 'DataMosh Internal Effect',
  description: 'Internal effect preset that simulates video compression artifacts and frame bleeding with irregular stuttery transitions between normal and corrupted states. Creates persistent trails that decay irregularly through combinations of blur, brightness, and transform effects with non-linear progression points.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'corruption', 'datamosh', 'artifacts'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    inputDuration: 3,
    corruptionLevel: 0.5,
    decayPattern: 'exponential',
    pixelShift: 10,
    persistenceTime: 1.5,
    effectStartTime: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const datamoshEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
