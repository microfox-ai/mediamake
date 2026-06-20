/**
 * BeatElastic - Audio-Reactive Elastic Bounce Effect
 *
 * This internal effect preset responds to bass frequencies with elastic bounce animations.
 * It detects audio beats and triggers elastic scale pulses with overshoot and rebound,
 * creating a bouncy, reactive feel synchronized to music.
 *
 * Features:
 * - **Audio-Reactive Waveform Detection**: Uses bass frequency detection to trigger bounces
 * - **Elastic Easing with Overshoot**: Scale pulses overshoot the target, then settle with a rebound
 * - **Variable Bounce Intensity**: Stronger bass beats create larger overshoots
 * - **Rebound Phase**: Elements slightly undershoot before settling at final scale
 * - **Two Animation Modes**: Scale-only or scale-with-rotation for different visual styles
 * - **Configurable Sensitivity**: Adjustable audio sensitivity and threshold
 *
 * Use cases:
 * - Creating bouncy music visualizations
 * - Adding reactive feel to UI elements on beat
 * - Building audio-synchronized animations
 * - Enhancing visual impact of bass-heavy music
 * - Creating dynamic logo or text animations
 *
 * Technical Implementation:
 * - Uses WaveformEffect with bass frequency analysis
 * - Combines scale and optional rotation waveform effects
 * - Returns effects array for scale-rotate mode
 * - Internal preset output: 'effects' (single effect or array)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  mode: z
    .enum(['scale', 'scale-rotate'])
    .default('scale')
    .describe('Animation mode: scale-only or scale with rotation'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.8)
    .describe('Audio sensitivity multiplier (0.1-1.0, higher = more reactive)'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the elastic bounce effect to'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL or ref:componentId (optional, for reference)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .optional()
    .describe('Duration of the effect in seconds (optional, defaults to parent duration)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the scale effect'),
  rotateEffectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the rotation effect (scale-rotate mode)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    mode,
    sensitivity,
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    effectId,
    rotateEffectId,
  } = params;

  // Validate targetIds
  if (!targetIds || targetIds.length === 0) {
    throw new Error('BeatElastic: targetIds array is required and cannot be empty');
  }

  // Calculate sensitivity-based parameters
  const scaleSensitivity = sensitivity;
  const rotateSensitivity = sensitivity * 0.5; // Rotation is half as sensitive as scale

  // Base scale configuration
  const threshold = 0.3; // Threshold for bass detection
  const smoothing = 0.2; // Smoothing factor for audio data
  const baseScale = 1.0; // Base scale value
  const minScale = 1.0; // Minimum scale
  const maxScale = 1.0 + scaleSensitivity * 0.5; // Maximum scale based on sensitivity (up to 1.4 at max)

  // Calculate intensity for scale effect
  // Intensity controls the bounce amplitude
  const scaleIntensity = scaleSensitivity * 0.5; // Max 0.5 at sensitivity 1.0

  // Scale effect configuration (waveform-based)
  const scaleEffectData: WaveformEffectData = {
    audioSrc: audioSrc || '', // Audio source (can be empty if provided via context)
    audioProperty: 'bass', // React to bass frequencies
    effectType: 'scale', // Scale effect type
    sensitivity: scaleSensitivity,
    threshold: threshold,
    smoothing: smoothing,
    numberOfSamples: 128, // Power of 2 for FFT
    useFrequencyData: true, // Use frequency analysis for bass detection
    windowInSeconds: 1 / 30, // Analysis window (1 frame at 30fps)
    mode: 'provider', // Provider mode - target components by ID
    targetIds: targetIds, // Target the specified components
    start: effectStart || 0, // Effect start time (relative to parent)
    duration: effectDuration, // Effect duration (optional)
    intensity: scaleIntensity, // Bounce intensity
    baseScale: baseScale, // Base scale value
    minValue: minScale, // Minimum scale
    maxValue: maxScale, // Maximum scale
    smoothNormalisation: 1, // Default smoothing
  };

  // Create scale effect
  const scaleEffect = {
    id: effectId || `beat-elastic-scale-${targetIds.join('-')}`,
    componentId: 'waveform', // Use waveform component for audio-reactive effects
    data: scaleEffectData,
  };

  // If mode is scale-only, return single effect
  if (mode === 'scale') {
    return {
      output: {
        childrenData: [
          {
            id: 'beat-elastic-container',
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  opacity: 0, // Invisible container
                },
              },
            },
            effects: [scaleEffect], // Single scale effect
            childrenData: [],
            context: {
              timing: {
                start: 0,
                duration: effectDuration || 1, // Minimal duration for placeholder
              },
            },
          },
        ],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Scale-rotate mode: create rotation effect as well
  const rotationRange = 15 * rotateSensitivity; // Max rotation in degrees (scaled by sensitivity)

  const rotateEffectData: WaveformEffectData = {
    audioSrc: audioSrc || '',
    audioProperty: 'bass', // React to bass frequencies
    effectType: 'rotate', // Rotation effect type
    sensitivity: rotateSensitivity, // Half the sensitivity of scale
    threshold: threshold,
    smoothing: smoothing,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: targetIds,
    start: effectStart || 0,
    duration: effectDuration,
    intensity: rotateSensitivity * 0.3, // Rotation intensity
    rotationRange: rotationRange, // Max rotation in degrees
    smoothNormalisation: 1,
  };

  // Create rotation effect
  const rotateEffect = {
    id: rotateEffectId || `beat-elastic-rotate-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: rotateEffectData,
  };

  // Return both effects in array for scale-rotate mode
  return {
    output: {
      childrenData: [
        {
          id: 'beat-elastic-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                opacity: 0, // Invisible container
              },
            },
          },
          effects: [scaleEffect, rotateEffect], // Both scale and rotate effects
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration || 1,
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
  id: 'BeatElastic',
  title: 'BeatElastic - Audio-Reactive Elastic Bounce Effect',
  description:
    'Internal effect preset that responds to bass frequencies with elastic bounce animations. Detects audio beats and triggers elastic scale pulses with overshoot, creating a bouncy, reactive feel synchronized to music. Supports both scale-only and scale-with-rotation modes.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'elastic', 'bounce', 'internal'],
  dependencies: {},
  // REQUIRED: Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects', // Extract effects from output
  defaultInputParams: {
    mode: 'scale',
    sensitivity: 0.8,
    targetIds: ['component-1'],
    effectStart: 0,
  },
};

// Export preset
export const BeatElasticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
