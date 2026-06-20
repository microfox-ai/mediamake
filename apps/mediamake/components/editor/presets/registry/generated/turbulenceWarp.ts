/**
 * Turbulence Warp Audio Effect Preset
 *
 * This internal effect preset creates extreme directional motion blur synchronized to bass frequencies.
 * It combines blur and scale waveform effects to produce a strobe-like motion blur effect that reacts
 * to audio beat intensity, creating a visual sensation of being pulled through space at light speed
 * during bass drops. The blur pulsates and warps in sync with the music's energy.
 *
 * Features:
 * - **Bass-Reactive Blur**: Directional blur that increases with beat intensity
 * - **Warp Motion**: Combined with scale effects for warping sensation
 * - **Configurable Direction**: Blur can warp along X, Y, or both axes
 * - **Sensitivity Control**: Adjustable sensitivity threshold and max blur amount
 * - **Audio-Synchronized**: Automatically syncs to audio beat intensity via waveform analysis
 *
 * Use cases:
 * - Music videos with intense bass drops
 * - Audio-reactive visuals for electronic music
 * - Creating strobe-like motion blur effects
 * - High-energy transitions synchronized to beats
 * - Light-speed visual effects for bass-heavy tracks
 *
 * ARRAY OF EFFECTS:
 * Returns two effects: blur effect (primary) and scale effect (warping enhancement)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the turbulence warp effect to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to component)'),
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe(
      'Sensitivity multiplier for audio reactivity (0-1, higher = more reactive)',
    ),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe(
      'Minimum audio intensity threshold to trigger effect (0-1, lower = more sensitive)',
    ),
  maxBlur: z
    .number()
    .min(0)
    .max(30)
    .default(15)
    .optional()
    .describe('Maximum blur amount in pixels at peak intensity'),
  warpAxis: z
    .enum(['x', 'y', 'both'])
    .default('both')
    .optional()
    .describe('Direction of warp motion (x = horizontal, y = vertical, both = combined)'),
  smoothNormalisation: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe(
      'Frame-based smoothing factor (0 = no smoothing, 1 = default, >1 = more smoothing)',
    ),
  blurEffectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for blur effect'),
  scaleEffectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for scale effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    sensitivity = 0.7,
    threshold = 0.3,
    maxBlur = 15,
    warpAxis = 'both',
    smoothNormalisation = 1,
    blurEffectId,
    scaleEffectId,
  } = params;

  // Validate targetIds
  if (!targetIds || targetIds.length === 0) {
    throw new Error('targetIds array is required and must not be empty');
  }

  // Create blur waveform effect (primary effect)
  const blurEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass', // React to bass frequencies
    effectType: 'blur',
    intensity: 1, // Intensity is controlled by maxValue
    minValue: 0,
    maxValue: maxBlur,
    sensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation,
  };

  const blurEffect = {
    id:
      blurEffectId ||
      `turbulence-blur-${targetIds.join('-')}-${Date.now()}`,
    componentId: 'waveform',
    data: blurEffectData,
  };

  // Create scale waveform effect for warping motion (secondary enhancement)
  // Scale intensity is lower to complement blur, not overpower it
  const scaleIntensity = 0.15; // 15% scale variation at peak
  const baseScale = 1.0;

  const scaleEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: warpAxis === 'x' ? 'scaleX' : warpAxis === 'y' ? 'scaleY' : 'scale',
    intensity: scaleIntensity,
    baseScale,
    minValue: baseScale,
    maxValue: baseScale + scaleIntensity,
    sensitivity: sensitivity * 0.8, // Slightly less sensitive than blur
    threshold: threshold * 1.2, // Slightly higher threshold
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation,
  };

  const scaleEffect = {
    id:
      scaleEffectId ||
      `turbulence-scale-${targetIds.join('-')}-${Date.now()}`,
    componentId: 'waveform',
    data: scaleEffectData,
  };

  // Return both effects in a container structure
  // The system will extract effects via _internalPresetOutput: 'effects'
  return {
    output: {
      childrenData: [
        {
          id: `turbulence-warp-container-${Date.now()}`,
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [blurEffect, scaleEffect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
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
  id: 'turbulenceWarp',
  title: 'Turbulence Warp Audio Effect',
  description:
    'Internal effect preset that creates extreme directional motion blur synchronized to bass frequencies. Reacts to audio beats by applying blur that increases with intensity, combined with scale warping for a strobe-like light-speed effect during bass drops. Returns effects array for audio-reactive visual distortion.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio', 'waveform', 'blur', 'bass', 'internal', 'motion'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 5,
    sensitivity: 0.7,
    threshold: 0.3,
    maxBlur: 15,
    warpAxis: 'both',
    smoothNormalisation: 1,
  },
};

export const turbulenceWarpPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
