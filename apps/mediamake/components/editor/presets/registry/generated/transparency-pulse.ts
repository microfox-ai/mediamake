/**
 * TransparencyPulse - Internal Waveform Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates audio-reactive opacity layers that pulse with transparency based on audio beats.
 * This internal preset generates waveform effects synchronized to selected frequency bands
 * (bass, mid, treble), creating a "breathing" effect where elements fade in and out with music.
 *
 * USAGE:
 * Apply this to multiple target elements with incrementing delays using the layerOffset parameter
 * to create staggered audio-reactive opacity animations. Perfect for music videos, audio visualizers,
 * or dynamic text overlays that react to sound.
 *
 * CONFIGURATION:
 * - pulseIntensity: Controls the opacity range (0-1) for the breathing effect
 * - frequencyBand: Which audio frequencies to react to (bass/mid/treble)
 * - layerOffset: Timing offset between layers for staggered effect
 * - sensitivity: Audio reaction strength multiplier (0.1-3.0)
 * - blendMode: How layers visually interact when overlapping
 *
 * RETURNS:
 * Array of waveform effects (one per target element) with staggered timing.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the transparency pulse effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for waveform analysis'),
  pulseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity range for pulse effect (0 = subtle, 1 = full fade)'),
  frequencyBand: z
    .enum(['bass', 'mid', 'treble'])
    .default('bass')
    .describe('Audio frequency band to react to (bass = low, mid = midrange, treble = high)'),
  layerOffset: z
    .number()
    .min(0)
    .default(0.1)
    .describe('Timing offset in seconds between each layer for staggered effect'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.5)
    .describe('Audio reaction sensitivity multiplier (higher = more reactive)'),
  blendMode: z
    .enum(['normal', 'multiply', 'screen', 'overlay'])
    .default('normal')
    .describe('CSS blend mode for visual layer interaction'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of effects in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .optional()
    .describe('Duration of effects in seconds (defaults to parent duration)'),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Audio data smoothing factor (0 = raw, 1 = very smooth)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Minimum audio level to trigger effect (filters out quiet moments)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    pulseIntensity,
    frequencyBand,
    layerOffset,
    sensitivity,
    blendMode,
    effectStart,
    effectDuration,
    smoothing,
    threshold,
  } = params;

  // Create array of waveform effects with staggered timing
  const effects = targetIds.map((targetId, index) => {
    // Calculate staggered start time for this layer
    const layerStart = effectStart + index * layerOffset;

    // Configure waveform effect data for opacity-based audio reactivity
    const effectData: WaveformEffectData = {
      audioSrc,
      audioProperty: frequencyBand,
      effectType: 'opacity' as any, // Custom effect type for opacity modulation
      intensity: pulseIntensity,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [targetId],
      start: layerStart,
      duration: effectDuration,
      smoothing,
      // Custom props for transparency pulse effect
      props: {
        blendMode,
        minOpacity: 1 - pulseIntensity, // Calculate minimum opacity
        maxOpacity: 1, // Maximum opacity (fully visible)
      },
    };

    return {
      id: `transparency-pulse-${targetId}-${index}`,
      componentId: 'waveform',
      data: effectData,
    };
  });

  // Return effects in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'transparency-pulse-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Default container duration
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
  id: 'transparency-pulse',
  title: 'TransparencyPulse',
  description:
    'Internal waveform effect preset that creates audio-reactive opacity layers synchronized to music beats. Elements pulse with transparency based on selected frequency bands (bass/mid/treble), creating a breathing effect where overlapping elements become more or less transparent in sync with audio. Configurable pulse intensity, frequency band targeting, layer timing offsets, audio sensitivity, and blend modes.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'opacity', 'transparency', 'pulse', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1', 'element-2'],
    audioSrc: 'https://example.com/audio.mp3',
    pulseIntensity: 0.6,
    frequencyBand: 'bass',
    layerOffset: 0.1,
    sensitivity: 1.5,
    blendMode: 'normal',
    effectStart: 0,
    smoothing: 0.8,
    threshold: 0.1,
  },
};

// Export preset
export const transparencyPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
