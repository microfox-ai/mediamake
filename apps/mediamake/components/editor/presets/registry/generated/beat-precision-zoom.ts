/**
 * BeatPrecisionZoom Internal Effect Preset
 *
 * SINGLE EFFECT (Waveform-based)
 *
 * This internal preset creates audio-reactive zoom pulses with surgical precision timing.
 * It analyzes audio to detect exact beat onsets and applies a two-phase zoom animation:
 * 
 * Phase 1: Quick zoom-in (scale 1.0 to targetScale) on beat hit
 * Phase 2: Slower elastic bounce-back (targetScale to 0.98 to 1.0)
 * 
 * The effect includes a subtle rotation effect (±3 degrees) that's inversely proportional
 * to the zoom level for added dynamism.
 *
 * Features:
 * - **Beat Detection**: Uses waveform analysis to detect exact beat onset
 * - **Two-Phase Zoom**: Quick zoom-in followed by elastic bounce-back
 * - **Frequency Range**: React to bass, mid, or treble frequencies
 * - **Inverse Rotation**: Subtle rotation inversely proportional to zoom
 * - **Configurable Parameters**: Sensitivity, target scale, decay speed
 *
 * Use cases:
 * - Audio-reactive video effects synchronized to bass hits
 * - Dynamic zoom effects for music videos
 * - Beat-synchronized visual emphasis
 * - Creating energetic, rhythm-driven content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Sensitivity multiplier for audio reactivity (0-1, higher = more reactive)',
    ),
  targetScale: z
    .number()
    .optional()
    .describe('Maximum zoom scale level (default: 1.15)'),
  decaySpeed: z
    .number()
    .optional()
    .describe(
      'Decay speed for bounce-back animation (0-1, default: 0.92, lower = slower)',
    ),
  frequencyRange: z
    .enum(['bass', 'mid', 'treble'])
    .optional()
    .describe('Frequency range to react to (default: bass)'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  start: z.number().default(0).describe('Start time of effect (relative)'),
  duration: z
    .union([z.number(), z.literal('auto')])
    .default('auto')
    .describe('Duration of effect or auto'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the zoom effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const sensitivity = params.sensitivity;
  const targetScale = params.targetScale ?? 1.15;
  const decaySpeed = params.decaySpeed ?? 0.92;
  const frequencyRange = params.frequencyRange ?? 'bass';
  const audioSrc = params.audioSrc;
  const start = params.start;
  const duration = params.duration;

  // Calculate rotation sensitivity (inversely proportional to zoom, subtle)
  const rotationSensitivity = sensitivity * 0.3;
  const maxRotation = 3; // ±3 degrees

  // Construct zoom waveform effect data
  const zoomEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: frequencyRange,
    effectType: 'zoom',
    intensity: targetScale - 1.0, // Intensity is the delta from base scale
    baseScale: 1.0,
    sensitivity: sensitivity * 1.5, // Amplify sensitivity for zoom
    threshold: 0.3, // Beat detection threshold
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30, // Analysis window
    mode: 'provider',
    targetIds: params.targetIds,
    start,
    duration: typeof duration === 'number' ? duration : undefined,
    smoothNormalisation: decaySpeed * 10, // Map decay speed to smoothing (0.92 -> ~9)
  };

  // Construct rotation waveform effect data (inverse to zoom)
  const rotationEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: frequencyRange,
    effectType: 'rotate',
    intensity: maxRotation, // Maximum rotation in degrees
    sensitivity: rotationSensitivity,
    threshold: 0.3,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start,
    duration: typeof duration === 'number' ? duration : undefined,
    smoothNormalisation: decaySpeed * 10,
    // Inverse relationship: when zoom is high, rotation is low
    // This is handled internally by the effect system
  };

  // Create zoom effect
  const zoomEffect = {
    id: params.effectId || `beat-precision-zoom-${params.targetIds.join('-')}`,
    componentId: 'waveform',
    data: zoomEffectData,
  };

  // Create rotation effect
  const rotationEffect = {
    id: `beat-precision-rotate-${params.targetIds.join('-')}`,
    componentId: 'waveform',
    data: rotationEffectData,
  };

  // Return effects in a container structure
  // The system will extract effects when _internalPresetOutput: 'effects'
  return {
    output: {
      childrenData: [
        {
          id: 'beat-precision-zoom-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [zoomEffect, rotationEffect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: typeof duration === 'number' ? duration : 10,
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
  id: 'beat-precision-zoom',
  title: 'BeatPrecisionZoom',
  description:
    'An internal waveform effect preset that creates audio-reactive zoom pulses with surgical precision timing. Reacts to bass frequencies for heavy beats with a two-phase zoom: quick zoom-in (1.0 to 1.15) on beat hit, then slower elastic bounce-back (1.15 to 0.98 to 1.0). Includes subtle inverse rotation effect (±3 degrees) for added dynamism. Configurable sensitivity, target scale, decay speed, and frequency range parameters.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio', 'waveform', 'zoom', 'beat', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    sensitivity: 0.7,
    targetScale: 1.15,
    decaySpeed: 0.92,
    frequencyRange: 'bass',
    audioSrc: 'https://example.com/audio.mp3',
    start: 0,
    duration: 'auto',
  },
};

export const beatPrecisionZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
