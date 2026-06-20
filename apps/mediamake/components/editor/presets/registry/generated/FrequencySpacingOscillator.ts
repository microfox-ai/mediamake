/**
 * FrequencySpacingOscillator Internal Waveform Effect Preset
 *
 * ARRAY OF EFFECTS
 *
 * This internal waveform effect preset dynamically adjusts element spacing based on audio frequency analysis.
 * It monitors specific frequency bands and translates their intensity into precise spacing adjustments between elements.
 * The effect creates organic spacing rhythms synchronized with audio, with complementary opacity modulation
 * (elements fade slightly when spread apart) and subtle blur effects that increase with rapid spacing changes.
 *
 * Features:
 * - **Frequency Band Monitoring**: Analyze specific frequency ranges (bass, mid, treble)
 * - **Dynamic Spacing**: Translate frequency intensity into element position offsets
 * - **Oscillation Modes**: 'expand-contract', 'wave', or 'random' spacing patterns
 * - **Anchor Point Control**: 'center', 'start', or 'end' for spacing origin
 * - **Smoothing Control**: Adjustable movement smoothness (0-1)
 * - **Opacity Modulation**: Inversely related to spacing (fade when spread)
 * - **Blur on Movement**: Subtle blur increases with rapid spacing changes
 *
 * Use cases:
 * - Creating audio-reactive layout animations
 * - Building dynamic element spacing synchronized with music
 * - Audio-driven typography and UI element positioning
 * - Organic, rhythm-based visual arrangements
 *
 * Returns an array of waveform effects (one per target element).
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply spacing effects to'),
  frequencyBands: z
    .array(z.array(z.number()))
    .describe(
      'Array of frequency ranges to monitor (e.g., [[20, 150], [150, 500], [500, 2000]])',
    ),
  spacingMultiplier: z
    .number()
    .default(50)
    .describe('Base spacing adjustment factor in pixels'),
  oscillationMode: z
    .enum(['expand-contract', 'wave', 'random'])
    .default('expand-contract')
    .describe('Spacing behavior mode'),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Movement smoothness (0 = no smoothing, 1 = maximum)'),
  anchorPoint: z
    .enum(['center', 'start', 'end'])
    .default('center')
    .describe('Origin point for spacing adjustments'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for frequency analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Sensitivity multiplier for frequency response'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    frequencyBands,
    spacingMultiplier,
    oscillationMode,
    smoothing,
    anchorPoint,
    audioSrc,
    effectStart,
    effectDuration,
    sensitivity,
  } = params;

  // Helper: Calculate spacing offset based on index and anchor point
  const calculateSpacingOffset = (
    index: number,
    totalElements: number,
    multiplier: number,
    anchor: 'center' | 'start' | 'end',
    mode: 'expand-contract' | 'wave' | 'random',
  ): { x: number; y: number } => {
    let offsetFactor = 0;

    // Calculate base offset factor based on anchor
    if (anchor === 'center') {
      offsetFactor = index - totalElements / 2;
    } else if (anchor === 'start') {
      offsetFactor = index;
    } else if (anchor === 'end') {
      offsetFactor = -(totalElements - index - 1);
    }

    // Apply oscillation mode
    let xOffset = 0;
    let yOffset = 0;

    if (mode === 'expand-contract') {
      // Linear expansion from anchor point
      xOffset = offsetFactor * multiplier;
    } else if (mode === 'wave') {
      // Sinusoidal wave pattern
      const wavePhase = (index / totalElements) * Math.PI * 2;
      xOffset = Math.sin(wavePhase) * multiplier * 2;
      yOffset = Math.cos(wavePhase) * multiplier;
    } else if (mode === 'random') {
      // Pseudo-random based on index (deterministic)
      const seed = index * 12345.6789;
      const randomX = (Math.sin(seed) * 10000) % 1;
      const randomY = (Math.cos(seed) * 10000) % 1;
      xOffset = (randomX - 0.5) * multiplier * 2;
      yOffset = (randomY - 0.5) * multiplier * 2;
    }

    return { x: xOffset, y: yOffset };
  };

  // Generate effects for each target element
  const effects = targetIds.map((targetId, index) => {
    // Select frequency band (cycle through if more elements than bands)
    const frequencyBand =
      frequencyBands[index % frequencyBands.length] || [20, 20000];

    // Calculate spacing offset
    const spacingOffset = calculateSpacingOffset(
      index,
      targetIds.length,
      spacingMultiplier,
      anchorPoint,
      oscillationMode,
    );

    // Create waveform effect data for translation (spacing)
    const translateEffectData: WaveformEffectData = {
      audioSrc,
      audioProperty: 'frequency',
      effectType: 'translateX',
      intensity: Math.abs(spacingOffset.x) / spacingMultiplier,
      sensitivity,
      threshold: 0.1,
      smoothing,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [targetId],
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: smoothing,
      // Custom props for frequency range
      props: {
        frequencyRange: frequencyBand,
        baseTranslateX: spacingOffset.x,
        baseTranslateY: spacingOffset.y,
      },
    };

    // Create opacity effect (inverse to spacing)
    const opacityEffectData: WaveformEffectData = {
      audioSrc,
      audioProperty: 'frequency',
      effectType: 'zoom', // Using zoom internally to drive opacity via custom implementation
      intensity: 0.3,
      sensitivity: sensitivity * 0.5,
      threshold: 0.15,
      smoothing,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [targetId],
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: smoothing,
      // Custom props for inverse opacity
      props: {
        frequencyRange: frequencyBand,
        minOpacity: 0.7,
        maxOpacity: 1,
        inverse: true,
      },
    };

    // Create blur effect (increases with rapid spacing changes)
    const blurEffectData: WaveformEffectData = {
      audioSrc,
      audioProperty: 'frequency',
      effectType: 'blur',
      intensity: 2,
      sensitivity: sensitivity * 0.8,
      threshold: 0.6,
      smoothing: smoothing * 0.5, // Less smoothing for blur to react to rapid changes
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [targetId],
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: smoothing * 0.5,
      // Custom props for frequency range
      props: {
        frequencyRange: frequencyBand,
        maxBlur: 2,
      },
    };

    return [
      {
        id: `frequency-spacing-translate-${targetId}`,
        componentId: 'waveform',
        data: translateEffectData,
      },
      {
        id: `frequency-spacing-opacity-${targetId}`,
        componentId: 'waveform',
        data: opacityEffectData,
      },
      {
        id: `frequency-spacing-blur-${targetId}`,
        componentId: 'waveform',
        data: blurEffectData,
      },
    ];
  });

  // Flatten effects array
  const flatEffects = effects.flat();

  // Return effect container structure
  const rootContainer: RenderableComponentData = {
    id: 'frequency-spacing-oscillator-container',
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
        duration: effectDuration,
      },
    },
    effects: flatEffects,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'FrequencySpacingOscillator',
  title: 'Frequency Spacing Oscillator',
  description:
    'Internal waveform effect preset that dynamically adjusts element spacing based on audio frequency analysis. Monitors specific frequency bands and translates their intensity into precise spacing adjustments between elements. Includes complementary opacity modulation (inversely related to spacing) and subtle blur effect that increases with rapid spacing changes. Returns effect configurations to be applied to target elements.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['waveform', 'audio-reactive', 'spacing', 'frequency', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3'],
    frequencyBands: [
      [20, 150],
      [150, 500],
      [500, 2000],
    ],
    spacingMultiplier: 50,
    oscillationMode: 'expand-contract',
    smoothing: 0.7,
    anchorPoint: 'center',
    audioSrc: 'ref:audio-track',
    effectStart: 0,
    effectDuration: 10,
    sensitivity: 0.8,
  },
};

// --- Export ---

export const FrequencySpacingOscillatorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
