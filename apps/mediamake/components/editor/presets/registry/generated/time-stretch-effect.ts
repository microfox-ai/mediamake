/**
 * TimeStretch Internal Effect Preset
 *
 * SINGLE EFFECT: Returns a waveform effect configuration that creates motion echoes 
 * by stretching and compressing time through scale and blur animations. This effect 
 * simulates the visual equivalent of audio time-stretching, where the element appears 
 * to leave temporal artifacts as it moves.
 *
 * The effect creates a rubber-band-like motion where the element seems to be pulled 
 * through time, reacting to audio beats with:
 * - Scale transformations (scaleX: 1.2, scaleY: 0.9) on bass/mid/treble hits
 * - Blur trails that create visible motion artifacts through rapid blur transitions
 * - Audio-reactive sensitivity with configurable threshold and smoothing
 *
 * Use cases:
 * - Creating audio-reactive motion graphics with temporal distortion
 * - Adding rubber-band physics to elements synchronized with music
 * - Building dynamic visuals that appear to stretch through time
 * - Creating motion trails and temporal artifacts for high-energy content
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target with time-stretch effect'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for audio reactivity'),
  effectStart: z.number().describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  
  // Time-stretch specific parameters
  stretchAmount: z.number().min(1).max(2).default(1.2).optional()
    .describe('Maximum scale factor when stretched (1.0-2.0, default: 1.2)'),
  blurIntensity: z.number().min(0).max(10).default(5).optional()
    .describe('Maximum blur amount in pixels for motion trails (0-10px, default: 5px)'),
  audioSensitivity: z.number().min(0).max(1).default(0.7).optional()
    .describe('Sensitivity to audio input (0-1, default: 0.7)'),
  frequency: z.enum(['bass', 'mid', 'treble']).default('bass').optional()
    .describe('Audio frequency band to react to (bass, mid, or treble)'),
  
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const stretchAmount = params.stretchAmount ?? 1.2;
  const blurIntensity = params.blurIntensity ?? 5;
  const audioSensitivity = params.audioSensitivity ?? 0.7;
  const frequency = params.frequency ?? 'bass';

  // Construct waveform effect data for audio-reactive scale and blur
  const waveformEffectData: WaveformEffectData = {
    // Audio configuration
    audioSrc: params.audioSrc,
    audioProperty: frequency,
    useFrequencyData: true,
    numberOfSamples: 128,
    windowInSeconds: 1 / 30, // Frame-based analysis
    
    // Scale effect configuration (creates the stretch/compress motion)
    effectType: 'scale',
    intensity: stretchAmount - 1, // Convert to intensity (0.2 for 1.2 scale)
    baseScale: 0.9, // Compress base (creates rubber-band effect)
    sensitivity: audioSensitivity,
    threshold: 0.3, // Only react to significant beats
    smoothNormalisation: 1, // Default smoothing
    
    // Timing
    start: params.effectStart,
    duration: params.effectDuration,
    
    // Targeting
    mode: 'provider',
    targetIds: [params.targetId],
  };

  // Construct blur effect data for motion trails
  const blurEffectData: WaveformEffectData = {
    // Audio configuration
    audioSrc: params.audioSrc,
    audioProperty: frequency,
    useFrequencyData: true,
    numberOfSamples: 128,
    windowInSeconds: 1 / 30,
    
    // Blur effect configuration (creates temporal artifacts)
    effectType: 'blur',
    intensity: blurIntensity,
    sensitivity: audioSensitivity * 0.7, // Slightly less sensitive than scale
    threshold: 0.4, // Higher threshold to avoid constant blur
    smoothNormalisation: 1,
    
    // Timing
    start: params.effectStart,
    duration: params.effectDuration,
    
    // Targeting
    mode: 'provider',
    targetIds: [params.targetId],
  };

  // Create effect objects
  const scaleEffect = {
    id: params.effectId ? `${params.effectId}-scale` : `time-stretch-scale-${params.targetId}`,
    componentId: 'waveform',
    data: waveformEffectData,
  };

  const blurEffect = {
    id: params.effectId ? `${params.effectId}-blur` : `time-stretch-blur-${params.targetId}`,
    componentId: 'waveform',
    data: blurEffectData,
  };

  // Return both effects in a container structure
  // The system will extract effects from the first child when _internalPresetOutput: 'effects' is set
  return {
    output: {
      childrenData: [
        {
          id: 'time-stretch-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                opacity: 0, // Container is invisible
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration,
            },
          },
          effects: [scaleEffect, blurEffect],
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
  id: 'time-stretch-effect',
  title: 'TimeStretch Audio-Reactive Effect',
  description: 'Internal effect preset that creates motion echoes by stretching and compressing time through scale and blur animations. This effect simulates the visual equivalent of audio time-stretching, where elements appear to leave temporal artifacts as they move. Implements waveform effects that react to audio beats, causing elements to stretch (scaleX: 1.2, scaleY: 0.9) on bass hits and compress back with a slight blur trail, creating a rubber-band-like motion where elements seem to be pulled through time.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'audio-reactive', 'waveform', 'time-stretch', 'motion-trails', 'temporal-artifacts'],
  
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    stretchAmount: 1.2,
    blurIntensity: 5,
    audioSensitivity: 0.7,
    frequency: 'bass',
  },
  
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const timeStretchEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
