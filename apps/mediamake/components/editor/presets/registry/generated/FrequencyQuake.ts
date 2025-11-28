/**
 * FrequencyQuake - Frequency-Based Waveform Shake Effect (Internal Effect Preset)
 *
 * ARRAY OF EFFECTS
 * 
 * This internal effect preset generates frequency-specific waveform shake effects
 * that analyze audio frequency ranges to create different types of movements:
 * - Low frequencies (bass): Slow, heavy movements with circular patterns
 * - Mid frequencies: Medium-speed vibrations
 * - High frequencies: Rapid jitters with linear patterns
 *
 * Features:
 * - Full spectrum frequency analysis with band isolation
 * - Frequency-specific sensitivity and movement patterns
 * - Resonance parameter that amplifies sustained frequencies
 * - Rotational response that creates circular patterns for bass, linear for treble
 * - Blend mode that combines all frequency bands or isolates specific bands
 *
 * Technical approach:
 * - Uses WaveformEffect component with frequency-specific audioProperty
 * - Bass effect: Lower sensitivity (0.6), shake type for heavy movement
 * - Mid effect: Medium sensitivity (0.4), shake type for vibrations
 * - Treble effect: Low sensitivity (0.2), shake type for rapid jitters
 * - Rotational response modifies shake axis based on dominant frequency
 *
 * Use cases:
 * - Audio-reactive shake effects synchronized to music
 * - Frequency-specific visual responses
 * - Dynamic movement patterns based on audio spectrum
 * - Beat-reactive camera shake or element movement
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  isolateFrequency: z
    .enum(['all', 'bass', 'mid', 'treble'])
    .optional()
    .describe('Isolate and react only to specific frequency band (default: all)'),
  resonance: z
    .number()
    .min(0)
    .max(1)
    .describe('Amplifies movement when frequencies sustain (0-1)'),
  rotationalResponse: z
    .boolean()
    .describe('Enable rotational patterns - circular for bass, linear for treble'),
  intensityMultiplier: z
    .number()
    .describe('Global intensity multiplier for all shake effects'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply shake effects to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for frequency analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs (default: "frequency-quake")'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    isolateFrequency = 'all',
    resonance,
    rotationalResponse,
    intensityMultiplier,
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    effectIdPrefix = 'frequency-quake',
  } = params;

  // Helper function to create waveform shake effect for a specific frequency band
  const createFrequencyShakeEffect = (
    band: 'bass' | 'mid' | 'treble',
    baseSensitivity: number,
    baseIntensity: number,
  ): WaveformEffectData => {
    // Apply resonance: amplifies sensitivity for sustained frequencies
    // Resonance increases smoothing and sensitivity
    const resonanceFactor = 1 + resonance * 0.5;
    const sensitivity = baseSensitivity * intensityMultiplier * resonanceFactor;
    const intensity = baseIntensity * intensityMultiplier;

    // Determine shake axis based on frequency and rotationalResponse
    let shakeAxis: 'x' | 'y' | 'both' = 'both';
    if (rotationalResponse) {
      if (band === 'bass') {
        // Bass creates circular patterns (both axes)
        shakeAxis = 'both';
      } else if (band === 'mid') {
        // Mid creates horizontal movements
        shakeAxis = 'x';
      } else {
        // Treble creates linear vertical movements
        shakeAxis = 'y';
      }
    }

    // Configure smoothing based on resonance
    // Higher resonance = more smoothing = sustained response
    const smoothNormalisation = 1 + resonance * 2; // 1-3 range

    return {
      audioSrc,
      audioProperty: band, // 'bass', 'mid', or 'treble'
      effectType: 'shake',
      sensitivity,
      intensity,
      threshold: 0.1, // Minimum audio level to trigger effect
      numberOfSamples: 128, // Power of 2 for FFT
      useFrequencyData: true, // Enable frequency analysis
      windowInSeconds: 1 / 30, // 30fps analysis window
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation, // Apply resonance-based smoothing
      shakeAxis, // Apply rotational response
    } as WaveformEffectData;
  };

  // Generate effects based on isolateFrequency parameter
  const effects: any[] = [];

  if (isolateFrequency === 'all' || isolateFrequency === 'bass') {
    // Bass effect: Slow, heavy movements (circular patterns if rotational)
    const bassEffect = {
      id: `${effectIdPrefix}-bass-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: createFrequencyShakeEffect('bass', 0.6, 20),
    };
    effects.push(bassEffect);
  }

  if (isolateFrequency === 'all' || isolateFrequency === 'mid') {
    // Mid effect: Medium-speed vibrations
    const midEffect = {
      id: `${effectIdPrefix}-mid-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: createFrequencyShakeEffect('mid', 0.4, 12),
    };
    effects.push(midEffect);
  }

  if (isolateFrequency === 'all' || isolateFrequency === 'treble') {
    // Treble effect: Rapid jitters (linear patterns if rotational)
    const trebleEffect = {
      id: `${effectIdPrefix}-treble-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: createFrequencyShakeEffect('treble', 0.2, 8),
    };
    effects.push(trebleEffect);
  }

  // Return effects in a container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: `${effectIdPrefix}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
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
  id: 'FrequencyQuake',
  title: 'FrequencyQuake - Frequency-Based Waveform Shake Effect',
  description:
    'Internal effect preset that generates frequency-specific waveform shake effects. Analyzes audio spectrum to create bass-heavy movements, mid-range vibrations, and treble jitters. Supports frequency isolation, resonance amplification, and rotational response patterns. Returns effect configurations for bass, mid, and treble frequency ranges that can be merged into visual compositions.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'shake', 'frequency', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    isolateFrequency: 'all',
    resonance: 0.5,
    rotationalResponse: true,
    intensityMultiplier: 1.0,
    targetIds: ['target-component-id'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
  },
};

export const FrequencyQuakePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
