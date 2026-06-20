/**
 * Audio Grunge Shake Internal Effect Preset
 *
 * Creates a distressed, jittery movement synchronized with audio beats. The effect
 * reacts to bass frequencies to create an organic, unstable shake that mimics old
 * film projector wobble. Implements both positional shake (translateX/Y) and
 * rotational instability (rotate) that intensifies during bass hits.
 *
 * Features:
 * - Dual-layer shake system: constant micro-shake + impact shakes on beats
 * - Bass-reactive positional jitter (translateX/Y)
 * - Rotational instability synchronized with audio
 * - Subtle zoom pulse breathing effect on mid-range frequencies
 * - Configurable shake intensity, bass threshold, and decay speed
 * - Organic, film-projector-like wobble characteristics
 *
 * This is an INTERNAL EFFECT PRESET that returns waveform-based effects for audio-reactive
 * shake and zoom animations. It's designed to be called by other presets programmatically.
 *
 * ARRAY OF EFFECTS:
 * Returns two separate waveform effects - one for shake (bass-reactive) and one for
 * zoom pulse (mid-reactive). Apply both to the same target for full grunge effect.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the grunge shake effect'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),

  // Shake parameters
  shakeIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .optional()
    .describe('Overall shake intensity multiplier (0.1-5, default: 1)'),
  bassThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Minimum bass level to trigger impact shake (0-1, default: 0.6)'),
  decaySpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .optional()
    .describe(
      'How quickly shake settles after beat (0.1-5, higher = faster decay, default: 1)',
    ),
  bassSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .optional()
    .describe('Sensitivity to bass frequencies (0.1-5, default: 0.8)'),

  // Zoom parameters
  zoomIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Zoom pulse intensity (0-1, default: 0.3)'),
  zoomBaseScale: z
    .number()
    .min(0.9)
    .max(1.1)
    .default(1)
    .optional()
    .describe('Base scale for zoom effect (0.9-1.1, default: 1)'),
  midSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.3)
    .optional()
    .describe('Sensitivity to mid frequencies for zoom (0.1-5, default: 0.3)'),

  // Effect IDs (optional custom naming)
  shakeEffectId: z
    .string()
    .optional()
    .describe('Optional custom ID for shake effect'),
  zoomEffectId: z
    .string()
    .optional()
    .describe('Optional custom ID for zoom effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const shakeIntensity = params.shakeIntensity ?? 1;
  const bassThreshold = params.bassThreshold ?? 0.6;
  const decaySpeed = params.decaySpeed ?? 1;
  const bassSensitivity = params.bassSensitivity ?? 0.8;

  const zoomIntensity = params.zoomIntensity ?? 0.3;
  const zoomBaseScale = params.zoomBaseScale ?? 1;
  const midSensitivity = params.midSensitivity ?? 0.3;

  // Calculate base shake intensity (micro-shake for texture)
  const baseShakeIntensity = 2 * shakeIntensity;
  
  // Calculate impact shake multiplier (intensifies on bass hits)
  const impactMultiplier = 8 * shakeIntensity;

  // Calculate rotation intensity (smaller, more subtle)
  const rotationBase = 0.5 * shakeIntensity;
  const rotationImpact = 3 * shakeIntensity;

  // Smoothing factor based on decay speed (inverse relationship)
  // Higher decay speed = less smoothing (faster response and decay)
  const smoothNormalisation = Math.max(0.1, 2 / decaySpeed);

  // --- Bass-Reactive Shake Effect ---
  const shakeEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'shake',
    
    // Shake configuration
    shakeAxis: 'both', // X and Y shake
    intensity: baseShakeIntensity,
    
    // Bass reactivity
    sensitivity: bassSensitivity,
    threshold: bassThreshold,
    
    // Waveform analysis settings
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30, // Analyze 1 frame worth of audio
    
    // Smoothing and decay
    smoothNormalisation: smoothNormalisation,
    smoothing: 0.5, // Moderate smoothing for organic feel
    
    // Effect timing
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    
    // Additional properties for grunge shake effect
    minValue: baseShakeIntensity,
    maxValue: baseShakeIntensity * impactMultiplier / baseShakeIntensity,
  };

  const shakeEffect = {
    id: params.shakeEffectId || `grunge-shake-${params.targetId}`,
    componentId: 'waveform',
    data: shakeEffectData,
  };

  // --- Mid-Frequency Zoom Pulse Effect ---
  const zoomEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'mid',
    effectType: 'zoom',
    
    // Zoom configuration
    intensity: zoomIntensity,
    baseScale: zoomBaseScale,
    
    // Mid-frequency reactivity
    sensitivity: midSensitivity,
    threshold: 0, // No threshold for breathing effect
    
    // Waveform analysis settings
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    
    // Smoothing for breathing effect (more smoothed than shake)
    smoothNormalisation: 1.5, // More smoothing for gentle breathing
    smoothing: 0.7,
    
    // Effect timing
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    
    // Zoom range
    minValue: zoomBaseScale,
    maxValue: zoomBaseScale * (1 + zoomIntensity),
  };

  const zoomEffect = {
    id: params.zoomEffectId || `grunge-zoom-${params.targetId}`,
    componentId: 'waveform',
    data: zoomEffectData,
  };

  // Return both effects in a container structure
  return {
    output: {
      childrenData: [
        {
          id: 'grunge-shake-effects-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [shakeEffect, zoomEffect], // Both effects to be extracted
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

const presetMetadata: PresetMetadata = {
  id: 'audioGrungeShake',
  title: 'Audio Grunge Shake Effect',
  description:
    'Distressed, jittery shake effect synchronized with audio beats. Bass-reactive positional and rotational instability with mid-frequency zoom pulse. Mimics old film projector wobble with layered micro-shakes and impact shakes.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'audio',
    'waveform',
    'shake',
    'grunge',
    'bass',
    'zoom',
    'internal',
  ],
  dependencies: {},
  
  // Internal preset configuration
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    shakeIntensity: 1,
    bassThreshold: 0.6,
    decaySpeed: 1,
    bassSensitivity: 0.8,
    zoomIntensity: 0.3,
    zoomBaseScale: 1,
    midSensitivity: 0.3,
  },
};

export const audioGrungeShakePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};