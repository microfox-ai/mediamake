/**
 * FrequencyColorWave Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 * 
 * This internal effect preset creates an audio-reactive color visualization system that maps
 * audio frequency bands (bass, mids, treble) to color saturation and hue transformations.
 * 
 * Features:
 * - Multi-band audio analysis: Bass affects red saturation, mids affect green, treble affects blue
 * - Custom CSS filter transformations: sepia, saturate, hue-rotate combined
 * - Smoothing parameters: Prevent jarring changes with configurable smoothing
 * - Per-band thresholds: Fine-tune sensitivity for each frequency range
 * - Optional 'party mode': Amplifies all effects and adds rotation based on overall volume
 * - Living, breathing color visualization: Perfect for electronic music
 * 
 * Technical implementation:
 * - Three separate waveform effects for R, G, B channels
 * - Each monitors different frequency bands (bass, mid, treble)
 * - Custom filter chains using sepia, saturate, and hue-rotate
 * - Party mode adds volume-based rotation effect (180° max intensity)
 * 
 * Use cases:
 * - Music visualizations for electronic/EDM content
 * - Audio-reactive color grading for videos
 * - Dynamic color effects synchronized to music
 * - Party mode for high-energy content sections
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the frequency color wave effects to'),
  
  bassThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Threshold for bass frequency activation (0-1, default: 0.3)'),
  
  midThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Threshold for mid frequency activation (0-1, default: 0.4)'),
  
  trebleThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Threshold for treble frequency activation (0-1, default: 0.5)'),
  
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Smoothing factor to prevent jarring changes (0-1, default: 0.7)'),
  
  partyMode: z
    .boolean()
    .default(false)
    .describe('Enable party mode: amplifies effects and adds rotation based on volume'),
  
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to component timing)'),
  
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),
  
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs (default: "freq-color-wave")'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    bassThreshold,
    midThreshold,
    trebleThreshold,
    smoothing,
    partyMode,
    audioSrc,
    effectStart,
    effectDuration,
    effectIdPrefix = 'freq-color-wave',
  } = params;

  const effects: any[] = [];

  // Helper function to create filter string for each frequency band
  const createFilterEffect = (
    band: 'bass' | 'mid' | 'treble',
    threshold: number,
    effectId: string,
  ) => {
    // Map frequency bands to color channel manipulations
    // Bass → Red (sepia + hue rotation toward red)
    // Mid → Green (saturate + hue rotation toward green)
    // Treble → Blue (saturate + hue rotation toward blue)
    
    let filterProperty: string;
    let hueRotationRange: number;
    
    if (band === 'bass') {
      // Red channel: sepia creates warmth, hue-rotate pushes toward red
      filterProperty = 'sepia(0.3) saturate(1.5) hue-rotate(-20deg)';
      hueRotationRange = -40; // Negative rotation toward red
    } else if (band === 'mid') {
      // Green channel: saturate and slight hue shift toward green
      filterProperty = 'sepia(0.2) saturate(1.8) hue-rotate(30deg)';
      hueRotationRange = 60; // Positive rotation toward green
    } else {
      // Treble → Blue channel: saturate and hue shift toward blue
      filterProperty = 'sepia(0.1) saturate(2.0) hue-rotate(180deg)';
      hueRotationRange = 200; // Large positive rotation toward blue/purple
    }

    const effectData: WaveformEffectData = {
      audioSrc,
      audioProperty: band,
      effectType: 'filter' as any, // Custom filter type
      threshold,
      sensitivity: partyMode ? 2.0 : 1.5, // Amplify in party mode
      smoothing,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: 1,
      // Custom properties for filter manipulation
      props: {
        filterType: 'custom',
        customFilter: filterProperty,
        hueRotationRange,
      },
    };

    return {
      id: effectId,
      componentId: 'waveform',
      data: effectData,
    };
  };

  // Create effects for each frequency band
  effects.push(
    createFilterEffect('bass', bassThreshold, `${effectIdPrefix}-bass-red`),
  );
  effects.push(
    createFilterEffect('mid', midThreshold, `${effectIdPrefix}-mid-green`),
  );
  effects.push(
    createFilterEffect('treble', trebleThreshold, `${effectIdPrefix}-treble-blue`),
  );

  // Party mode: Add rotation based on overall volume
  if (partyMode) {
    const rotationEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'waveform', // Use overall volume
      effectType: 'rotate',
      intensity: 180, // Max 180 degrees rotation
      threshold: 0.3,
      sensitivity: 2.5, // High sensitivity for dramatic effect
      smoothing: 0.6, // Slightly less smoothing for responsive rotation
      numberOfSamples: 128,
      useFrequencyData: false, // Use waveform (volume) not frequency
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: 1,
      rotationRange: 180,
    };

    effects.push({
      id: `${effectIdPrefix}-party-rotation`,
      componentId: 'waveform',
      data: rotationEffect,
    });
  }

  // Return effects in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: `${effectIdPrefix}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 1, // Minimal duration, acts as effect provider
            },
          },
          effects,
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'FrequencyColorWave',
  title: 'Frequency Color Wave Effect',
  description:
    'Audio-reactive internal effect preset that maps audio frequency bands (bass, mids, treble) to color saturation and hue transformations. Bass affects red channel saturation, mids affect green, treble affects blue. Includes smoothing parameters, per-band thresholds, and optional "party mode" that amplifies effects and adds rotation based on volume. Designed for electronic music visualization.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio', 'waveform', 'color', 'frequency', 'internal', 'music', 'reactive'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    bassThreshold: 0.3,
    midThreshold: 0.4,
    trebleThreshold: 0.5,
    smoothing: 0.7,
    partyMode: false,
    audioSrc: 'ref:audio-track',
    effectStart: 0,
    effectDuration: 10,
    effectIdPrefix: 'freq-color-wave',
  },
};

export const FrequencyColorWavePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
