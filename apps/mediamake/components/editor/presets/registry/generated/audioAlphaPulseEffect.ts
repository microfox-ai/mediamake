/**
 * Audio Alpha Pulse Effect - Internal Effect Preset
 *
 * This is an internal effect preset that creates an audio-reactive alpha matte reveal 
 * synchronized with bass frequencies. The effect uses waveform data to modulate opacity 
 * in real-time, creating a pulsing reveal that responds to music beats.
 *
 * ARRAY OF EFFECTS:
 * Returns two effects:
 * 1. Waveform opacity effect - Bass-reactive alpha matte with threshold and decay
 * 2. Waveform scale effect - Subtle scale animation on beat hits for visual feedback
 *
 * Features:
 * - **Audio-Reactive Opacity**: Modulates component opacity based on bass frequency analysis
 * - **Threshold System**: Opacity increases permanently with each bass hit above threshold
 * - **Decay Parameter**: Allows reveal to partially fade back if no beats detected
 * - **Cumulative or Resetting**: Supports both cumulative reveal mode and resetting mode
 * - **Visual Feedback**: Adds subtle scale animations on beat hits
 * - **Multi-Target Support**: Can target multiple components simultaneously
 * - **Real-Time Synchronization**: Uses waveform data for precise beat detection
 *
 * Use cases:
 * - Creating dynamic content reveals synchronized with music
 * - Building audio-reactive intro/outro sequences
 * - Adding rhythmic visual interest to static content
 * - Creating beat-synchronized UI element reveals
 * - Building music visualization overlays
 *
 * Parameters:
 * - targetIds: Array of component IDs to apply the effect to
 * - audioSrc: Audio source URL or ref:componentId for analysis
 * - effectStart: Start time of the effect (relative to parent)
 * - effectDuration: Duration of the effect
 * - sensitivity: Audio sensitivity multiplier (0.1-5, default: 0.8)
 * - threshold: Minimum audio value to trigger effect (0-1, default: 0.6)
 * - decayRate: Rate at which opacity decays without beats (0-1, default: 0.2)
 * - cumulative: Whether reveal is cumulative or resetting (default: true)
 * - smoothing: Audio data smoothing factor (0-1, default: 0.5)
 * - scaleIntensity: Intensity of scale feedback on beats (0-1, default: 0.3)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z.number().describe('Start time of the effect (relative)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .optional()
    .describe('Audio sensitivity multiplier (0.1-5)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Minimum audio value to trigger effect (0-1)'),
  decayRate: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Rate at which opacity decays without beats (0-1)'),
  cumulative: z
    .boolean()
    .default(true)
    .optional()
    .describe('Whether reveal is cumulative (true) or resetting (false)'),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Audio data smoothing factor (0-1)'),
  scaleIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of scale feedback on beats (0-1)'),
  opacityEffectId: z
    .string()
    .optional()
    .describe('Optional custom ID for opacity effect'),
  scaleEffectId: z
    .string()
    .optional()
    .describe('Optional custom ID for scale effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const sensitivity = params.sensitivity ?? 0.8;
  const threshold = params.threshold ?? 0.6;
  const decayRate = params.decayRate ?? 0.2;
  const cumulative = params.cumulative ?? true;
  const smoothing = params.smoothing ?? 0.5;
  const scaleIntensity = params.scaleIntensity ?? 0.3;

  // Create opacity waveform effect (bass-reactive alpha matte)
  const opacityEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'opacity' as any, // Custom effect type for opacity modulation
    sensitivity,
    threshold,
    smoothing,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: 1,
    // Custom properties for cumulative/decay behavior
    props: {
      cumulative,
      decayRate,
    },
  };

  const opacityEffect = {
    id:
      params.opacityEffectId ||
      `audio-alpha-pulse-opacity-${params.targetIds.join('-')}`,
    componentId: 'waveform',
    data: opacityEffectData,
  };

  // Create scale waveform effect (visual feedback on beats)
  const scaleEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    intensity: scaleIntensity,
    baseScale: 1,
    sensitivity: sensitivity * 0.5, // Lower sensitivity for scale effect
    threshold: threshold * 1.2, // Slightly higher threshold for scale feedback
    smoothing: smoothing * 0.8, // More responsive for visual feedback
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: 0, // No smoothing for immediate visual feedback
  };

  const scaleEffect = {
    id:
      params.scaleEffectId ||
      `audio-alpha-pulse-scale-${params.targetIds.join('-')}`,
    componentId: 'waveform',
    data: scaleEffectData,
  };

  // Return container with both effects
  return {
    output: {
      childrenData: [
        {
          id: 'audio-alpha-pulse-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects: [opacityEffect, scaleEffect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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
  id: 'audioAlphaPulseEffect',
  title: 'Audio Alpha Pulse Effect',
  description:
    'Internal effect preset that creates an audio-reactive alpha matte reveal synchronized with bass frequencies. The effect uses waveform data to modulate opacity in real-time, creating a pulsing reveal that responds to music beats. Implements a threshold system where opacity increases permanently with each bass hit above the threshold, with optional decay and scale animations on beat hits.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio', 'waveform', 'opacity', 'bass', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    sensitivity: 0.8,
    threshold: 0.6,
    decayRate: 0.2,
    cumulative: true,
    smoothing: 0.5,
    scaleIntensity: 0.3,
  },
};

// Export preset
export const audioAlphaPulseEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
