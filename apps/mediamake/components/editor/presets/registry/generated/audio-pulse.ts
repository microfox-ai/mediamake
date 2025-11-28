/**
 * Audio Pulse Internal Effect Preset
 *
 * SINGLE EFFECT:
 * This internal effect preset creates audio-reactive scale pulsing synchronized with bass beats.
 * It analyzes bass frequencies and applies subtle scale changes (0.98-1.04) that match the rhythm.
 * 
 * Features:
 * - Audio-reactive scale transformation using waveform analysis
 * - Bass frequency targeting for rhythm synchronization
 * - Sensitivity control (0.1-1.0) to adjust reactivity
 * - Threshold settings to filter out weak beats
 * - Two pulse modes: 'smooth' (continuous scaling) or 'punchy' (quick scale pops)
 * - Subtle scale range (0.98-1.04) appropriate for professional use
 * 
 * Parameters:
 * - targetIds: Array of component IDs to apply the effect to
 * - audioSrc: Audio source URL or ref:componentId
 * - sensitivity: Audio sensitivity multiplier (0.1-1.0)
 * - threshold: Minimum audio value to trigger effect (0-1)
 * - mode: 'smooth' (continuous) or 'punchy' (quick pops)
 * - minScale: Minimum scale value (default 0.98)
 * - maxScale: Maximum scale value (default 1.04)
 * - effectStart: Effect start time relative to parent
 * - effectDuration: Effect duration in seconds
 * 
 * Usage:
 * This preset is designed to be called by other presets to add audio-reactive
 * scale pulsing to text, images, or any visual elements. The effect is subtle
 * enough for professional use while being visually engaging.
 * 
 * Technical Details:
 * - Uses WaveformEffect component for audio analysis
 * - Targets bass frequencies for beat detection
 * - Smoothing factor controlled by mode: 0.8 for smooth, 0.2 for punchy
 * - Provider mode ensures effect applies directly to target components
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the audio-reactive scale effect to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(1.0)
    .default(0.5)
    .optional()
    .describe('Audio sensitivity multiplier (0.1-1.0), controls how reactive the effect is to audio'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Minimum audio value to trigger effect (0-1), filters out weak beats'),
  mode: z
    .enum(['smooth', 'punchy'])
    .default('smooth')
    .optional()
    .describe('Pulse mode: smooth (continuous scaling with high smoothing) or punchy (quick scale pops with low smoothing)'),
  minScale: z
    .number()
    .default(0.98)
    .optional()
    .describe('Minimum scale value when audio is silent or below threshold'),
  maxScale: z
    .number()
    .default(1.04)
    .optional()
    .describe('Maximum scale value at peak audio intensity'),
  effectStart: z
    .number()
    .default(0)
    .describe('Effect start time in seconds (relative to parent component)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Effect duration in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the waveform effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const sensitivity = params.sensitivity ?? 0.5;
  const threshold = params.threshold ?? 0.3;
  const mode = params.mode ?? 'smooth';
  const minScale = params.minScale ?? 0.98;
  const maxScale = params.maxScale ?? 1.04;

  // Calculate smoothing based on mode
  // smooth mode = 0.8 (high smoothing for continuous scaling)
  // punchy mode = 0.2 (low smoothing for quick pops)
  const smoothing = mode === 'smooth' ? 0.8 : 0.2;

  // Construct waveform effect data
  const effectData: WaveformEffectData = {
    // Audio configuration
    audioSrc: params.audioSrc,
    audioProperty: 'bass', // Target bass frequencies for beat detection
    numberOfSamples: 128, // Power of 2 for FFT analysis
    useFrequencyData: true, // Enable frequency analysis for bass detection
    windowInSeconds: 1 / 30, // Analysis window (1 frame at 30fps)

    // Effect configuration
    effectType: 'scale', // Scale transformation
    sensitivity: sensitivity,
    threshold: threshold,
    smoothNormalisation: smoothing, // Smoothing factor based on mode

    // Scale range
    baseScale: 1.0, // Base scale (normal size)
    minValue: minScale, // Minimum scale
    maxValue: maxScale, // Maximum scale

    // Timing
    start: params.effectStart,
    duration: params.effectDuration,

    // Target configuration
    mode: 'provider', // ALWAYS use provider mode
    targetIds: params.targetIds, // Apply to specified components
  };

  // Create effect node
  const effect = {
    id: params.effectId || `audio-pulse-effect-${params.targetIds.join('-')}`,
    componentId: 'waveform', // Use waveform component for audio-reactive effects
    data: effectData,
  };

  // Return effect wrapped in container structure
  // The system will extract the effect via _internalPresetOutput: 'effects'
  return {
    output: {
      childrenData: [
        {
          id: 'audio-pulse-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: { pointerEvents: 'none' },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration,
            },
          },
          effects: [effect],
          childrenData: [],
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
  id: 'audio-pulse',
  title: 'Audio Pulse Effect',
  description:
    'Internal effect preset that creates audio-reactive scale pulsing synchronized with bass beats. Analyzes bass frequencies and applies subtle scale changes (0.98-1.04) that match the rhythm. Includes sensitivity control (0.1-1.0) and threshold settings to filter out weak beats. Supports smooth (continuous scaling) or punchy (quick scale pops) modes. Perfect for making text or images respond to music.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio', 'waveform', 'scale', 'pulse', 'bass', 'internal', 'generic'],

  // Internal preset markers
  _internalPreset: true, // Mark as internal preset
  _internalPresetOutput: 'effects', // Extract effects from output

  // Default input parameters
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    sensitivity: 0.5,
    threshold: 0.3,
    mode: 'smooth',
    minScale: 0.98,
    maxScale: 1.04,
    effectStart: 0,
    effectDuration: 10,
  },

  // No dependencies needed for this preset
  dependencies: {},
};

// Export preset
export const audioPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
