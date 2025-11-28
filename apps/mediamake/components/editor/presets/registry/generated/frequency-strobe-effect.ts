/**
 * FrequencyStrobe Internal Effect Preset
 *
 * SINGLE EFFECT:
 * This internal effect preset creates minimal, pattern-based visibility flashes
 * synchronized to audio frequencies. Targets video or image elements with gentle
 * opacity oscillations (0.7-1.0) and slight brightness boosts during peaks.
 *
 * Unlike harsh strobe effects, this creates a "breathing light" feel by responding
 * to mid-range frequencies (vocals, synths) with smooth transitions. The effect
 * combines dynamic opacity changes with subtle exposure adjustments for a cohesive
 * audio-reactive experience.
 *
 * Technical implementation:
 * - Uses WaveformEffect for audio synchronization
 * - Opacity oscillates between configurable min/max values
 * - Exposure adds brightness peaks during audio intensity
 * - Smoothing prevents jarring transitions
 * - Targets specific frequency bands (bass/mid/treble)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the strobe effect to'),
  strobeFrequency: z
    .enum(['bass', 'mid', 'treble'])
    .optional()
    .describe(
      'Audio frequency band to track for strobe effect (bass, mid, or treble)',
    ),
  minOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum opacity value during strobe (0-1)'),
  maxOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Maximum opacity value during strobe (0-1)'),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Smoothing factor to prevent jarring transitions (0-1)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL or ref:componentId for synchronization'),
  effectStart: z
    .number()
    .optional()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .optional()
    .describe('Duration of the effect in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the generated effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const strobeFrequency = params.strobeFrequency || 'mid';
  const minOpacity = params.minOpacity ?? 0.7;
  const maxOpacity = params.maxOpacity ?? 1.0;
  const smoothing = params.smoothing ?? 0.3;
  const targetIds = params.targetIds || [];

  // Validate target IDs
  if (targetIds.length === 0) {
    throw new Error(
      'FrequencyStrobe effect requires at least one target component ID',
    );
  }

  // Audio source defaults to first target ID reference
  const audioSrc = params.audioSrc || `ref:${targetIds[0]}`;

  // Construct waveform effect data for opacity
  const opacityEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: strobeFrequency,
    effectType: 'scale', // Using scale as proxy for opacity control
    sensitivity: 0.4,
    threshold: 0.2,
    smoothing,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: params.effectStart ?? 0,
    duration: params.effectDuration ?? -1, // -1 means match parent/audio duration
    minValue: minOpacity,
    maxValue: maxOpacity,
    smoothNormalisation: 1,
  };

  // Construct waveform effect data for exposure (brightness)
  const exposureEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: strobeFrequency,
    effectType: 'exposure',
    sensitivity: 0.2,
    threshold: 0.2,
    smoothing: smoothing * 1.2, // Slightly more smoothing for brightness
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: params.effectStart ?? 0,
    duration: params.effectDuration ?? -1,
    baseBrightness: 1.0,
    intensity: 0.15, // Max brightness boost
    smoothNormalisation: 1,
  };

  // Create effect objects
  const opacityEffect = {
    id: params.effectId
      ? `${params.effectId}-opacity`
      : `frequency-strobe-opacity-${targetIds[0]}`,
    componentId: 'waveform',
    data: opacityEffectData,
  };

  const exposureEffect = {
    id: params.effectId
      ? `${params.effectId}-exposure`
      : `frequency-strobe-exposure-${targetIds[0]}`,
    componentId: 'waveform',
    data: exposureEffectData,
  };

  // Return container with both effects
  const container: RenderableComponentData = {
    id: 'frequency-strobe-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: [opacityEffect, exposureEffect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration ?? 10, // Default duration if not specified
      },
    },
  };

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'frequency-strobe-effect',
  title: 'FrequencyStrobe Internal Effect',
  description:
    'An internal waveform effect preset that creates minimal, pattern-based visibility flashes synchronized to audio frequencies. Targets video or image elements with gentle opacity oscillations (0.7-1.0) and slight brightness boosts during peaks, responding to mid-range frequencies (vocals, synths). Creates a breathing light effect rather than aggressive strobing.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'strobe', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component-1'],
    strobeFrequency: 'mid',
    minOpacity: 0.7,
    maxOpacity: 1.0,
    smoothing: 0.3,
    audioSrc: 'ref:audio-track',
    effectStart: 0,
    effectDuration: 10,
  },
};

export const frequencyStrobeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
