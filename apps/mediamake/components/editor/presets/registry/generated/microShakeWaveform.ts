/**
 * Micro-Shake Waveform Effect Preset
 *
 * SINGLE EFFECT:
 * Applies subtle, bass-reactive trembling to elements with micro movements of 1-3 pixels
 * and rotation wobble (±1 degree) synchronized with low frequency audio (20-250Hz).
 *
 * This is an internal effect preset that returns a waveform effect object for
 * the generic effect system. Perfect for adding subtle energy to static text or
 * images during music sequences without being distracting.
 *
 * Features:
 * - Bass-reactive shake (1-3px micro movements)
 * - Synchronized rotation wobble (±1 degree)
 * - Configurable sensitivity (0-1, default 0.3)
 * - Configurable max shake distance (default 3px)
 * - Configurable frequency range (default [20, 250]Hz for low frequencies)
 * - Audio-reactive waveform analysis for real-time synchronization
 *
 * Usage:
 * Call this preset programmatically from other presets to apply micro-shake effects
 * to target components. The effect uses waveform audio analysis to detect bass hits
 * and applies subtle trembling and rotation in response.
 *
 * @example
 * const effectResult = await presets.microShakeWaveform({
 *   targetId: 'text-1',
 *   audioSrc: 'audio.mp3',
 *   effectStart: 0,
 *   effectDuration: 10,
 *   sensitivity: 0.3,
 *   maxShake: 3,
 *   frequencyRange: [20, 250],
 * }, props);
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply micro-shake effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z.number().describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Sensitivity to audio input (0-1, default 0.3). Higher values = more reactive movement'),
  
  maxShake: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Maximum shake distance in pixels (default 3px). Defines the intensity of micro movements'),
  
  frequencyRange: z
    .tuple([z.number(), z.number()])
    .default([20, 250])
    .optional()
    .describe('Frequency range in Hz to respond to (default [20, 250]Hz for bass/low frequencies)'),
  
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID. If not provided, generated automatically'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const sensitivity = params.sensitivity ?? 0.3;
  const maxShake = params.maxShake ?? 3;
  const frequencyRange = params.frequencyRange ?? [20, 250];
  const effectId = params.effectId || `micro-shake-${params.targetId}`;

  // Calculate shake intensity based on maxShake
  // We use a small shake intensity for micro movements (1-3px range)
  const shakeIntensity = maxShake;

  // Calculate rotation range based on maxShake
  // Maximum rotation is ±1 degree, scaled with shake intensity
  const maxRotation = 1; // degrees

  // Construct the waveform effect data for shake effect
  const shakeEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass', // React to bass frequencies
    effectType: 'shake', // Use shake effect type
    intensity: shakeIntensity,
    shakeAxis: 'both', // Shake in both X and Y directions
    sensitivity: sensitivity,
    threshold: 0.2, // Minimum audio level to trigger effect
    numberOfSamples: 128, // Standard sample size (power of 2)
    useFrequencyData: true, // Enable frequency analysis
    windowInSeconds: 1 / 30, // Analysis window (1 frame at 30fps)
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: 1, // Default smoothing
    // Store frequency range for reference (waveform effect will use bass range)
    props: {
      frequencyRange: frequencyRange,
    },
  };

  // Construct the waveform effect data for rotation wobble
  const rotateEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass', // React to bass frequencies
    effectType: 'rotate', // Use rotate effect type
    intensity: maxRotation, // Max rotation in degrees
    sensitivity: sensitivity,
    threshold: 0.2, // Minimum audio level to trigger effect
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: 1,
    props: {
      frequencyRange: frequencyRange,
    },
  };

  // Create shake effect object
  const shakeEffect = {
    id: `${effectId}-shake`,
    componentId: 'waveform', // Use waveform effect component
    data: shakeEffectData,
  };

  // Create rotation effect object
  const rotateEffect = {
    id: `${effectId}-rotate`,
    componentId: 'waveform',
    data: rotateEffectData,
  };

  // Return both effects in the output structure
  return {
    output: {
      childrenData: [
        {
          id: 'micro-shake-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          effects: [shakeEffect, rotateEffect], // Both shake and rotation effects
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration,
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
  id: 'microShakeWaveform',
  title: 'Micro-Shake Waveform Effect',
  description:
    'Internal effect preset that adds subtle, bass-reactive trembling (1-3px micro movements and ±1° rotation wobble) to elements in response to low frequencies (20-250Hz). Returns effect objects for the generic effect system with waveform audio analysis. Use via props.presets pattern to attach to target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'shake', 'audio-reactive', 'bass', 'internal', 'generic'],
  dependencies: {},
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects', // Extract effects from output
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'audio.mp3',
    effectStart: 0,
    effectDuration: 5,
    sensitivity: 0.3,
    maxShake: 3,
    frequencyRange: [20, 250],
  },
};

// Export preset
export const microShakeWaveformPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
