/**
 * Fisheye Distortion Pulse Preset
 *
 * This preset creates an audio-reactive fisheye distortion effect that pulses in sync with bass frequencies.
 * The effect applies a scale-based pulse to target components, creating a rhythmic expansion/contraction
 * that simulates a barrel distortion synchronized with beat detection.
 *
 * Features:
 * - **Audio-Reactive Waveform Effect**: Uses bass frequency data to modulate scale intensity
 * - **Beat Synchronization**: Pulses outward from the center on each bass beat
 * - **Configurable Sensitivity**: Adjustable bass sensitivity (0.1 to 1)
 * - **Maximum Distortion Control**: Set the maximum scale amount for the pulse
 * - **Reaction Speed**: Control how quickly the effect responds to audio changes
 * - **Center/Edge Mode**: Toggle between center-focused and edge-focused distortion
 * - **Smooth Audio Processing**: Built-in smoothing for natural-looking pulse transitions
 *
 * Use cases:
 * - Creating bass-reactive visual effects for music videos
 * - Adding rhythmic distortion to text overlays synchronized with music
 * - Building audio-visual effects for EDM and electronic music content
 * - Creating pulsing image effects that react to beat drops
 * - Adding dynamic visual interest to static content with audio synchronization
 *
 * Note: Due to effects system constraints, this preset uses scale transforms to approximate
 * fisheye/barrel distortion. The effect creates a pulsing expansion that simulates the
 * spherical distortion of a fisheye lens by scaling the target component.
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the fisheye pulse effect to'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe(
      'Sensitivity to bass frequencies (0.1 = less sensitive, 1 = very sensitive)',
    ),
  maxDistortion: z
    .number()
    .default(0.3)
    .describe(
      'Maximum distortion amount as scale multiplier (0.3 = 30% scale increase)',
    ),
  reactionSpeed: z
    .number()
    .default(0.15)
    .describe(
      'Reaction speed for audio changes (lower = faster response, higher = slower)',
    ),
  centerMode: z
    .boolean()
    .default(true)
    .describe(
      'Apply distortion from center (true) or edges (false) - currently both use scale',
    ),
  duration: z
    .union([z.number(), z.literal('auto')])
    .default('auto')
    .optional()
    .describe(
      'Duration of the effect in seconds, or "auto" to match audio duration',
    ),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for beat detection'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetIds,
    sensitivity = 0.5,
    maxDistortion = 0.3,
    reactionSpeed = 0.15,
    centerMode = true,
    duration = 'auto',
    audioSrc,
  } = params;

  // Calculate effect parameters
  // Scale range: min = 1 (no scale), max = 1 + maxDistortion
  const minScale = 1;
  const maxScale = 1 + maxDistortion;

  // Sensitivity controls the threshold and multiplier for bass detection
  // Higher sensitivity = lower threshold = more reactive
  const threshold = 0.3 * (1 - sensitivity * 0.5); // Range: 0.15 to 0.3
  const smoothing = reactionSpeed; // Use reaction speed as smoothing factor

  // Create waveform effect data for bass-reactive scale animation
  const fisheyeEffectData: WaveformEffectData = {
    // Audio configuration
    audioSrc: audioSrc,
    audioProperty: 'bass', // React to bass frequencies for punch
    numberOfSamples: 128, // Standard sample count for smooth analysis
    useFrequencyData: true, // Enable frequency analysis for better bass detection
    windowInSeconds: 1 / 30, // Frame-based window for smooth animation
    normalize: true, // Normalize audio data for consistent response

    // Effect type and intensity
    effectType: 'scale', // Use scale effect to simulate fisheye distortion
    baseScale: minScale, // Base scale (no distortion)
    intensity: maxDistortion, // Maximum scale increase

    // Audio reactivity settings
    sensitivity: sensitivity * 1.5, // Amplify sensitivity for more pronounced effect
    threshold: threshold, // Minimum bass level to trigger effect
    smoothing: smoothing, // Smoothing factor for natural transitions
    smoothNormalisation: 1, // Standard frame-based smoothing

    // Effect timing and targeting
    start: 0, // Start immediately
    duration: duration === 'auto' ? undefined : duration, // Auto or specific duration
    mode: 'provider', // Use provider mode to target specific components
    targetIds: targetIds, // Target component IDs

    // Effect animation curve
    type: 'ease-out', // Ease-out for natural pulse expansion
  };

  // Create the waveform effect node
  const fisheyePulseEffect = {
    id: `fisheye-pulse-effect-${targetIds.join('-')}`,
    componentId: 'waveform', // Use waveform effect component
    data: fisheyeEffectData,
  };

  // Return the effect wrapped in a container structure
  // Note: This follows the internal effect preset pattern where effects
  // are extracted from the first child's effects array
  return {
    output: {
      childrenData: [
        {
          id: 'fisheye-pulse-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none', // Don't interfere with user interaction
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration === 'auto' ? undefined : duration,
            },
          },
          effects: [fisheyePulseEffect],
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
  id: 'fisheye-distortion-pulse',
  title: 'Fisheye Distortion Pulse',
  description:
    'Audio-reactive waveform effect that creates rhythmic fisheye-style distortions synchronized with bass frequencies. Uses scale-based pulses to simulate barrel distortion expanding and contracting with the music.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'audio-reactive',
    'waveform',
    'fisheye',
    'distortion',
    'bass',
    'beat-sync',
    'pulse',
    'scale',
    'internal',
  ],
  dependencies: {
    presets: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['example-component'],
    sensitivity: 0.5,
    maxDistortion: 0.3,
    reactionSpeed: 0.15,
    centerMode: true,
    duration: 'auto',
    audioSrc: 'https://example.com/audio.mp3',
  },
};

// Export preset
export const fisheyeDistortionPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
