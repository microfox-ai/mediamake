/**
 * AtmosphericPulse Audio-Reactive Effect Preset
 *
 * This internal effect preset creates heat haze-like distortions synchronized to audio bass frequencies.
 * It uses waveform effects to make target elements expand and contract like they're breathing with the music's rhythm.
 *
 * Features:
 * - **Bass-Reactive Zoom**: Pulsing scale animation triggered by bass frequencies with high sensitivity
 * - **Mid-Frequency Shake**: Atmospheric turbulence triggered by mid frequencies
 * - **Heat Flash Exposure**: Brightness increases on beats to simulate heat flashes
 * - **Smooth Reactions**: Configurable smoothing for natural-feeling audio responsiveness
 * - **Layered Effects**: Multiple waveform effects combine to create complex audio-reactive visuals
 *
 * Parameters:
 * - `targetIds`: Array of component IDs to apply effects to
 * - `audioSrc`: Audio source URL or ref:componentId for audio analysis
 * - `bassIntensity`: Zoom amount multiplier (default: 0.15)
 * - `shakeThreshold`: Trigger level for shake effect (default: 0.6)
 * - `exposureBoost`: Brightness increase amount (default: 0.3)
 * - `smoothing`: Reaction smoothness factor (default: 0.3)
 * - `effectStart`: Start time of the effect relative to parent (default: 0)
 * - `effectDuration`: Duration of the effect (required)
 *
 * Use cases:
 * - Creating heat distortion effects synchronized to music
 * - Adding atmospheric turbulence to audio-visual compositions
 * - Building pulsing, breathing animations that react to sound
 * - Simulating heat waves or energy pulses in music videos
 *
 * This is an INTERNAL EFFECT PRESET - it returns an array of waveform effects.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the atmospheric pulse effects to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for audio analysis'),
  bassIntensity: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe('Zoom amount multiplier - controls how much elements scale with bass (0.05-0.5)'),
  shakeThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Trigger level for shake effect - higher values require stronger mid frequencies (0-1)'),
  exposureBoost: z
    .number()
    .min(0.1)
    .max(0.8)
    .default(0.3)
    .optional()
    .describe('Brightness increase amount for heat flashes (0.1-0.8)'),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Reaction smoothness factor - higher values create smoother transitions (0-1)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect relative to parent timeline (seconds)'),
  effectDuration: z
    .number()
    .positive()
    .describe('Duration of the effect in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID prefix for the generated effects'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    bassIntensity = 0.15,
    shakeThreshold = 0.6,
    exposureBoost = 0.3,
    smoothing = 0.3,
    effectStart = 0,
    effectDuration,
    effectId,
  } = params;

  const baseEffectId = effectId || 'atmospheric-pulse';

  // Create zoom effect data (bass-reactive pulsing scale)
  const zoomEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'zoom',
    intensity: bassIntensity,
    baseScale: 1,
    sensitivity: 0.8,
    threshold: 0,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: smoothing > 0 ? 1 + smoothing * 2 : 1,
  };

  // Create shake effect data (mid-frequency atmospheric turbulence)
  const shakeEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'mid',
    effectType: 'shake',
    intensity: 0.05,
    shakeAxis: 'both',
    sensitivity: 1.0,
    threshold: shakeThreshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: smoothing > 0 ? 1 + smoothing * 1.5 : 1,
  };

  // Create exposure effect data (bass-reactive heat flashes)
  const exposureEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'exposure',
    intensity: exposureBoost,
    baseBrightness: 1,
    sensitivity: 0.7,
    threshold: 0.1,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: smoothing > 0 ? 1 + smoothing * 2 : 1,
  };

  // Create effect nodes
  const zoomEffect = {
    id: `${baseEffectId}-zoom`,
    componentId: 'waveform',
    data: zoomEffectData,
  };

  const shakeEffect = {
    id: `${baseEffectId}-shake`,
    componentId: 'waveform',
    data: shakeEffectData,
  };

  const exposureEffect = {
    id: `${baseEffectId}-exposure`,
    componentId: 'waveform',
    data: exposureEffectData,
  };

  // Return all effects in a container structure
  // The system will extract effects via _internalPresetOutput: 'effects'
  return {
    output: {
      childrenData: [
        {
          id: `${baseEffectId}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [zoomEffect, shakeEffect, exposureEffect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
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
  id: 'AtmosphericPulse',
  title: 'Atmospheric Pulse Audio-Reactive Effect',
  description:
    'Creates heat haze-like distortions synchronized to audio bass frequencies with breathing zoom animations, atmospheric shake triggered by mid frequencies, and heat flash exposure effects. Applies waveform-based effects to target components to simulate looking through heat-distorted air that pulses with sound.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'internal', 'atmospheric', 'pulse', 'heat-distortion'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    bassIntensity: 0.15,
    shakeThreshold: 0.6,
    exposureBoost: 0.3,
    smoothing: 0.3,
    effectStart: 0,
    effectDuration: 10,
  },
};

// Export preset
export const AtmosphericPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
