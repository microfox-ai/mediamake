/**
 * Audio Glitch Reactive Waveform Effect Preset
 *
 * This is an INTERNAL EFFECT PRESET that generates audio-reactive corruption artifacts
 * triggered by bass frequency peaks. It returns multiple effect configurations that can
 * be extracted and applied to target components.
 *
 * Features:
 * - **Audio-Reactive Scale Distortion**: Rapid scale changes (0.95 to 1.1) triggered by bass peaks
 * - **Chromatic Aberration**: Red/cyan color split effects based on audio intensity
 * - **Digital Noise Modulation**: Opacity-based noise patterns synced to waveform data
 * - **Configurable Sensitivity**: Adjustable threshold and sensitivity parameters
 * - **Beat-Synchronized**: Visual breaks apart when the beat hits
 *
 * ARRAY OF EFFECTS:
 * This preset returns THREE effects that work together:
 * 1. Scale distortion effect (rapid compression/expansion)
 * 2. Chromatic aberration effect (RGB color split)
 * 3. Digital noise modulation effect (opacity-based noise overlay)
 *
 * Use cases:
 * - Creating audio-reactive glitch effects
 * - Building beat-synchronized visual corruption
 * - Adding dynamic distortion to video/image content
 * - Creating "breaking apart" effects for music videos
 * - Audio-driven chromatic aberration effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the glitch effects to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .optional()
    .describe('Audio sensitivity multiplier (0.1-5, default: 0.8)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Audio threshold for triggering effects (0-1, default: 0.6)'),
  aberrationStrength: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Chromatic aberration pixel offset strength (0-10, default: 2)'),
  duration: z
    .number()
    .min(0.1)
    .default(2000)
    .optional()
    .describe('Effect duration in milliseconds (default: 2000)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Effect start time in seconds (relative to parent)'),
  noiseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Maximum opacity for digital noise overlay (0-1, default: 0.3)'),
  scaleMin: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.95)
    .optional()
    .describe('Minimum scale value when audio is low (0.5-1, default: 0.95)'),
  scaleMax: z
    .number()
    .min(1)
    .max(2)
    .default(1.1)
    .optional()
    .describe('Maximum scale value when audio peaks (1-2, default: 1.1)'),
  effectIds: z
    .object({
      scale: z.string().optional(),
      aberration: z.string().optional(),
      noise: z.string().optional(),
    })
    .optional()
    .describe('Optional custom IDs for the three effects'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const sensitivity = params.sensitivity ?? 0.8;
  const threshold = params.threshold ?? 0.6;
  const aberrationStrength = params.aberrationStrength ?? 2;
  const duration = params.duration ?? 2000;
  const effectStart = params.effectStart ?? 0;
  const noiseIntensity = params.noiseIntensity ?? 0.3;
  const scaleMin = params.scaleMin ?? 0.95;
  const scaleMax = params.scaleMax ?? 1.1;

  // Convert duration from milliseconds to seconds
  const durationInSeconds = duration / 1000;

  // Effect 1: Audio-reactive scale distortion
  const scaleEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity,
    threshold,
    baseScale: 1,
    intensity: scaleMax - 1, // Intensity is added to baseScale
    minValue: scaleMin,
    maxValue: scaleMax,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: effectStart,
    duration: durationInSeconds,
    smoothNormalisation: 0.5, // Some smoothing for less jarring transitions
  };

  const scaleEffect = {
    id: params.effectIds?.scale || `audio-glitch-scale-${params.targetIds[0]}`,
    componentId: 'waveform',
    data: scaleEffectData,
  };

  // Effect 2: Chromatic aberration (using filter property)
  // We'll use a waveform effect that modulates the filter property
  // The filter value will be a drop-shadow effect with red/cyan splits
  const aberrationEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'custom', // Custom effect type (not predefined)
    sensitivity,
    threshold,
    intensity: aberrationStrength,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: effectStart,
    duration: durationInSeconds,
    smoothNormalisation: 0.3, // Less smoothing for more abrupt color shifts
    // We'll use props to pass custom filter values
    props: {
      filterMin: 'none',
      filterMax: `drop-shadow(${aberrationStrength}px 0 0 red) drop-shadow(-${aberrationStrength}px 0 0 cyan)`,
    },
  };

  const aberrationEffect = {
    id:
      params.effectIds?.aberration ||
      `audio-glitch-aberration-${params.targetIds[0]}`,
    componentId: 'waveform',
    data: aberrationEffectData,
  };

  // Effect 3: Digital noise modulation (opacity-based)
  const noiseEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'custom', // Custom opacity modulation
    sensitivity,
    threshold,
    intensity: noiseIntensity,
    minValue: 0,
    maxValue: noiseIntensity,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: effectStart,
    duration: durationInSeconds,
    smoothNormalisation: 0.2, // Minimal smoothing for rapid noise flicker
    // Props for custom behavior
    props: {
      noiseOverlay: true,
      opacityMin: 0,
      opacityMax: noiseIntensity,
    },
  };

  const noiseEffect = {
    id: params.effectIds?.noise || `audio-glitch-noise-${params.targetIds[0]}`,
    componentId: 'waveform',
    data: noiseEffectData,
  };

  // Return all three effects in a container structure
  // The system will extract effects based on _internalPresetOutput: 'effects'
  const effectContainer: RenderableComponentData = {
    id: 'audio-glitch-reactive-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden', // Container is not rendered, only effects are extracted
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    effects: [scaleEffect, aberrationEffect, noiseEffect],
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
  id: 'audio-glitch-reactive-effect',
  title: 'Audio Glitch Reactive Waveform Effect',
  description:
    'Internal effect preset that generates audio-reactive corruption artifacts triggered by bass frequency peaks. Applies rapid scale distortions (0.95-1.1) and chromatic aberration (red/cyan color splits) when audio threshold is exceeded. Uses waveform data to modulate digital noise patterns for a "breaking apart" visual when the beat hits.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'audio',
    'waveform',
    'glitch',
    'reactive',
    'internal',
    'chromatic',
    'corruption',
    'bass',
    'beat-sync',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    sensitivity: 0.8,
    threshold: 0.6,
    aberrationStrength: 2,
    duration: 2000,
    effectStart: 0,
    noiseIntensity: 0.3,
    scaleMin: 0.95,
    scaleMax: 1.1,
  },
};

// Export preset
export const audioGlitchReactiveEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
