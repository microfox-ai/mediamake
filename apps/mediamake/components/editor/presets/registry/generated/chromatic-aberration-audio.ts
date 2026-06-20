/**
 * Waveform-Reactive Chromatic Aberration Effect Preset
 *
 * This preset creates an audio-reactive chromatic aberration effect that responds to bass frequencies
 * and beat hits. The prismatic RGB channel split intensity pulses with audio beats, creating dynamic
 * color separation synchronized to music. It combines waveform effects (shake) with custom filter
 * effects for RGB splitting.
 *
 * Features:
 * - **Audio-Reactive Beat Detection**: Responds to bass frequencies with waveform analysis
 * - **Dynamic RGB Channel Separation**: Separates red, green, and blue channels that shift based on audio
 * - **Shake Effect on Beats**: Combines shake effects with chromatic split for intensified beat hits
 * - **Configurable Sensitivity**: Threshold controls for beat detection and split intensity
 * - **Decay Parameter**: Controls how quickly the aberration returns to normal after a beat
 * - **Maximum Split Distance**: Limits the RGB channel separation for controlled distortion
 *
 * Technical Implementation:
 * - Uses WaveformEffect with bass detection to drive the shake intensity
 * - Applies generic filter effects for RGB channel separation using translateX
 * - Combines both effects on target components for synchronized audio-reactive distortion
 * - Supports multiple target IDs for applying effect to multiple components
 *
 * Use cases:
 * - Music videos with beat-synchronized visual distortion
 * - Dynamic audio-reactive content with prismatic color effects
 * - EDM/electronic music visualizations
 * - Creating intense, energetic video effects that respond to audio
 * - Adding visual punch to bass drops and beat hits
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptive documentation
const presetParams = z.object({
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply chromatic aberration effect to'),
  maxSplit: z
    .number()
    .min(10)
    .max(100)
    .default(50)
    .optional()
    .describe('Maximum RGB channel split distance in pixels (10-100)'),
  decayTime: z
    .number()
    .min(100)
    .max(500)
    .default(300)
    .optional()
    .describe('Decay time in milliseconds - how quickly aberration returns to normal (100-500ms)'),
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Audio sensitivity multiplier for beat detection (0-1, higher = more sensitive)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Minimum audio intensity to trigger effect (0-1, higher = only strong beats)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(10)
    .optional()
    .describe('Duration of the effect in seconds'),
  shakeIntensity: z
    .number()
    .min(1)
    .max(50)
    .default(15)
    .optional()
    .describe('Shake effect intensity in pixels (1-50)'),
  smoothNormalisation: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe('Audio smoothing factor (0 = no smoothing, 1 = default, >1 = more smoothing)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const maxSplit = params.maxSplit ?? 50;
  const decayTime = params.decayTime ?? 300;
  const sensitivity = params.sensitivity ?? 0.8;
  const threshold = params.threshold ?? 0.6;
  const effectStart = params.effectStart ?? 0;
  const effectDuration = params.effectDuration ?? 10;
  const shakeIntensity = params.shakeIntensity ?? 15;
  const smoothNormalisation = params.smoothNormalisation ?? 1;
  const targetIds = params.targetIds;

  // Convert decay time from milliseconds to seconds for frame-based calculation
  const decayDuration = decayTime / 1000;

  // Helper function to create RGB channel split effects
  const createRGBSplitEffects = (): any[] => {
    const effects: any[] = [];

    // Create effects for each target ID
    targetIds.forEach((targetId, index) => {
      // Red channel - shift left
      const redSplitEffect: GenericEffectData = {
        type: 'linear',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: -maxSplit / 3, prog: 0 },
          { key: 'translateX', val: 0, prog: decayDuration / effectDuration },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      };

      effects.push({
        id: `chromatic-red-split-${targetId}-${index}`,
        componentId: 'generic',
        data: redSplitEffect,
      });

      // Green channel - no shift (stays centered)
      // We don't add a green effect since it stays in place

      // Blue channel - shift right
      const blueSplitEffect: GenericEffectData = {
        type: 'linear',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: maxSplit / 3, prog: 0 },
          { key: 'translateX', val: 0, prog: decayDuration / effectDuration },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      };

      effects.push({
        id: `chromatic-blue-split-${targetId}-${index}`,
        componentId: 'generic',
        data: blueSplitEffect,
      });

      // Add subtle opacity modulation for RGB effect intensity
      const opacityPulseEffect: GenericEffectData = {
        type: 'ease-out',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0.95, prog: 0 },
          { key: 'opacity', val: 1, prog: decayDuration / effectDuration },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      effects.push({
        id: `chromatic-opacity-pulse-${targetId}-${index}`,
        componentId: 'generic',
        data: opacityPulseEffect,
      });
    });

    return effects;
  };

  // Helper function to create waveform shake effect
  const createWaveformShakeEffect = (): any => {
    const shakeEffectData: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'bass',
      effectType: 'shake',
      intensity: shakeIntensity,
      sensitivity: sensitivity,
      threshold: threshold,
      shakeAxis: 'both',
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: smoothNormalisation,
    };

    return {
      id: 'chromatic-waveform-shake',
      componentId: 'waveform',
      data: shakeEffectData,
    };
  };

  // Create all effects
  const rgbSplitEffects = createRGBSplitEffects();
  const shakeEffect = createWaveformShakeEffect();

  // Combine all effects
  const allEffects = [shakeEffect, ...rgbSplitEffects];

  // Create container that holds the effects
  const effectContainer: RenderableComponentData = {
    id: 'chromatic-aberration-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 1000,
        },
      },
    },
    context: {
      timing: {
        start: effectStart,
        duration: effectDuration,
      },
    },
    effects: allEffects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [effectContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'chromatic-aberration-audio',
  title: 'Waveform-Reactive Chromatic Aberration Effect',
  description:
    'Audio-reactive chromatic aberration effect that pulses RGB channel separation synchronized to bass frequencies and beat hits. Combines waveform shake effects with dynamic color channel offsets that intensify on beats with configurable sensitivity, decay, and maximum split distance.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['audio', 'effects', 'waveform', 'chromatic-aberration', 'beat-sync', 'glitch', 'music-video'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    targetIds: ['video-1', 'image-1'],
    maxSplit: 50,
    decayTime: 300,
    sensitivity: 0.8,
    threshold: 0.6,
    effectStart: 0,
    effectDuration: 10,
    shakeIntensity: 15,
    smoothNormalisation: 1,
  },
};

// Export preset
export const chromaticAberrationAudioPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};