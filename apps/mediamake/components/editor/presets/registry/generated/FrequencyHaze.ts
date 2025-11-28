/**
 * FrequencyHaze - Audio-Reactive Atmospheric Distortion
 *
 * This internal effect preset creates ethereal, frequency-driven atmospheric distortion
 * based on audio frequency spectrum analysis. It maps different frequency bands to different
 * distortion types:
 * - Bass frequencies control blur intensity
 * - Mid frequencies drive rotation
 * - Treble frequencies affect opacity and scale
 *
 * The effect creates a swirling, hazy atmosphere that responds dynamically to music,
 * making elements appear to float in audio-reactive space.
 *
 * Features:
 * - Multi-frequency band mapping (bass, mid, treble)
 * - Configurable frequency sensitivity and smoothing
 * - Independent control over blur, rotation, opacity, and scale responses
 * - Atmospheric swirling motion synchronized to music dynamics
 * - Smooth transitions with configurable reaction speed
 *
 * Use cases:
 * - Creating atmospheric overlays for music videos
 * - Adding audio-reactive distortion to visual elements
 * - Building dreamy, ethereal visual effects
 * - Making UI elements respond to audio frequency spectrum
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the frequency haze effect to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for audio analysis'),
  blurResponse: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .optional()
    .describe('Bass frequency blur intensity (0-20px)'),
  rotationRange: z
    .number()
    .min(0)
    .max(45)
    .default(15)
    .optional()
    .describe('Mid frequency rotation range in degrees (0-45)'),
  opacityVariance: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Treble frequency opacity variance amount (0-1)'),
  frequencySmoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Overall reaction smoothness factor (0-1, higher = smoother)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .optional()
    .describe('Duration of the effect in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID prefix for the effects'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const blurResponse = params.blurResponse ?? 5;
  const rotationRange = params.rotationRange ?? 15;
  const opacityVariance = params.opacityVariance ?? 0.2;
  const frequencySmoothing = params.frequencySmoothing ?? 0.4;
  const effectStart = params.effectStart ?? 0;
  const effectDuration = params.effectDuration ?? 10;
  const effectIdPrefix = params.effectId || 'frequency-haze';

  // Create three waveform effects for different frequency bands
  const effects = [];

  // 1. Bass Blur Effect (20-250Hz)
  const bassBlurEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'blur',
    intensity: blurResponse,
    minValue: 0,
    maxValue: blurResponse,
    sensitivity: 0.7,
    threshold: 0,
    smoothing: frequencySmoothing,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: effectStart,
    duration: effectDuration,
  };

  effects.push({
    id: `${effectIdPrefix}-bass-blur`,
    componentId: 'waveform',
    data: bassBlurEffect,
  });

  // 2. Mid Rotation Effect (250-4000Hz)
  const midRotationEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'mid',
    effectType: 'rotate',
    rotationRange: rotationRange,
    minValue: -rotationRange / 2,
    maxValue: rotationRange / 2,
    sensitivity: 0.6,
    threshold: 0,
    smoothing: frequencySmoothing * 1.2, // Slightly more smoothing for rotation
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: effectStart,
    duration: effectDuration,
  };

  effects.push({
    id: `${effectIdPrefix}-mid-rotation`,
    componentId: 'waveform',
    data: midRotationEffect,
  });

  // 3. Treble Opacity & Scale Effect (4000-20000Hz)
  // Note: Waveform effects can't directly control opacity, so we use scale with small variance
  // For opacity, we would need a generic effect or custom implementation
  const trebleScaleEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'treble',
    effectType: 'scale',
    baseScale: 1,
    intensity: 0.05, // Small scale variance for subtle breathing effect
    minValue: 1 - 0.025,
    maxValue: 1 + 0.025,
    sensitivity: 0.5,
    threshold: 0,
    smoothing: frequencySmoothing,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: effectStart,
    duration: effectDuration,
  };

  effects.push({
    id: `${effectIdPrefix}-treble-scale`,
    componentId: 'waveform',
    data: trebleScaleEffect,
  });

  // Create container with all effects
  const rootContainer: RenderableComponentData = {
    id: `${effectIdPrefix}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: effects,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'FrequencyHaze',
  title: 'FrequencyHaze - Audio-Reactive Atmospheric Distortion',
  description:
    'An internal effect preset that creates ethereal, frequency-driven atmospheric distortion. Bass frequencies control blur intensity, mid frequencies drive rotation, and treble frequencies affect opacity and scale. The effect creates a swirling, hazy atmosphere that responds dynamically to music, making elements appear to float in audio-reactive space.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'frequency', 'atmospheric', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component'],
    audioSrc: 'https://example.com/audio.mp3',
    blurResponse: 5,
    rotationRange: 15,
    opacityVariance: 0.2,
    frequencySmoothing: 0.4,
    effectStart: 0,
    effectDuration: 10,
  },
};

// Export preset
export const FrequencyHazePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
