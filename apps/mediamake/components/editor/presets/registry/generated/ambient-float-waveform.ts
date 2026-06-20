/**
 * Ambient Float Waveform Effect Preset
 *
 * This preset creates gentle, music-reactive floating movement with subtle vertical translation 
 * (±10px) and slight rotation (±2deg) for an underwater-like floating effect. Elements respond 
 * to configurable frequency ranges (bass, mid, treble) with movement that lags slightly behind 
 * the audio for a more organic feel.
 *
 * Features:
 * - **Audio-Reactive Float**: Gentle vertical and horizontal translation synchronized with audio
 * - **Subtle Rotation**: Optional slight rotation (±2deg) for added organic movement
 * - **Frequency Band Selection**: Choose between bass (20-250Hz), mid (250-2000Hz), or treble (2000-20000Hz)
 * - **Configurable Float Range**: Adjust vertical float range (default ±10px)
 * - **Lag Amount Control**: Add organic lag (0-1) to movement for dreamier feel
 * - **Provider Mode Effects**: Applies directly to target components without wrapper divs
 *
 * Use cases:
 * - Creating atmospheric backgrounds with subtle audio-reactive movement
 * - Building dreamy text overlays that gently float with music
 * - Adding organic, underwater-like motion to visual elements
 * - Creating ambient visual responses to audio in the mid-range frequencies
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  floatRange: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe('Vertical float range in pixels (±value). Default: 10px'),
  rotationRange: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe('Rotation range in degrees (±value). Default: 2deg'),
  frequencyBand: z
    .enum(['bass', 'mid', 'treble'])
    .optional()
    .describe(
      'Audio frequency band to react to. bass: 20-250Hz, mid: 250-2000Hz, treble: 2000-20000Hz. Default: mid'
    ),
  lagAmount: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      'Amount of lag/smoothing for organic movement (0 = instant, 1 = max lag). Default: 0.3'
    ),
  duration: z
    .number()
    .positive()
    .optional()
    .describe('Duration of the effect in seconds. If not provided, matches audio duration'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the floating effect to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .optional()
    .describe('Sensitivity multiplier for audio reactivity. Default: 0.4'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum audio level to trigger movement. Default: 0.15'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  // Extract parameters with defaults
  const floatRange = params.floatRange ?? 10;
  const rotationRange = params.rotationRange ?? 2;
  const frequencyBand = params.frequencyBand ?? 'mid';
  const lagAmount = params.lagAmount ?? 0.3;
  const duration = params.duration ?? 10;
  const targetIds = params.targetIds;
  const audioSrc = params.audioSrc;
  const sensitivity = params.sensitivity ?? 0.4;
  const threshold = params.threshold ?? 0.15;

  // Calculate frequency range based on selected band
  const frequencyRange =
    frequencyBand === 'bass'
      ? [20, 250]
      : frequencyBand === 'treble'
        ? [2000, 20000]
        : [250, 2000];

  // Calculate horizontal float range (half of vertical)
  const horizontalFloatRange = floatRange * 0.5;

  // Construct waveform effect data for translate effect
  const waveformEffectData: WaveformEffectData = {
    audioSrc: audioSrc,
    audioProperty: frequencyBand, // Use frequency band as audio property
    effectType: 'translateY', // Primary vertical movement
    intensity: floatRange / 10, // Scale intensity based on float range
    sensitivity: sensitivity,
    threshold: threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30, // 30fps window
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: duration,
    smoothNormalisation: lagAmount * 3, // Convert lag to smoothing (0-3 range)
    minValue: -floatRange,
    maxValue: floatRange,
  };

  // Create the waveform effect for vertical translation
  const verticalFloatEffect = {
    id: `ambient-float-vertical-${targetIds[0]}`,
    componentId: 'waveform',
    data: waveformEffectData,
  };

  // Create horizontal float effect (X-axis movement)
  const horizontalFloatEffectData: WaveformEffectData = {
    ...waveformEffectData,
    effectType: 'translateX',
    intensity: horizontalFloatRange / 10,
    minValue: -horizontalFloatRange,
    maxValue: horizontalFloatRange,
  };

  const horizontalFloatEffect = {
    id: `ambient-float-horizontal-${targetIds[0]}`,
    componentId: 'waveform',
    data: horizontalFloatEffectData,
  };

  // Create rotation effect if rotation range is specified
  const rotationEffect =
    rotationRange > 0
      ? {
          id: `ambient-float-rotation-${targetIds[0]}`,
          componentId: 'waveform',
          data: {
            audioSrc: audioSrc,
            audioProperty: frequencyBand,
            effectType: 'rotate' as const,
            intensity: rotationRange / 15, // Scale for rotation
            rotationRange: rotationRange,
            sensitivity: sensitivity,
            threshold: threshold,
            numberOfSamples: 128,
            useFrequencyData: true,
            windowInSeconds: 1 / 30,
            mode: 'provider' as const,
            targetIds: targetIds,
            start: 0,
            duration: duration,
            smoothNormalisation: lagAmount * 3,
          } as WaveformEffectData,
        }
      : null;

  // Combine all effects
  const effects = [verticalFloatEffect, horizontalFloatEffect];
  if (rotationEffect) {
    effects.push(rotationEffect);
  }

  // Create root container with effects
  const rootContainer: RenderableComponentData = {
    id: 'ambient-float-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'ambient-float-waveform',
  title: 'Ambient Float Waveform Effect',
  description:
    'Creates gentle, music-reactive floating movement with subtle vertical translation (±10px) and slight rotation (±2deg) for an underwater-like floating effect. Elements respond to mid-range frequencies (250-2000Hz) with configurable lag for organic feel. Ideal for atmospheric backgrounds or dreamy text overlays.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'waveform',
    'audio-reactive',
    'float',
    'ambient',
    'gentle',
    'translate',
    'rotation',
    'organic',
    'dreamy',
    'atmospheric',
  ],
  dependencies: {},
  defaultInputParams: {
    floatRange: 10,
    rotationRange: 2,
    frequencyBand: 'mid',
    lagAmount: 0.3,
    duration: 10,
    targetIds: ['example-component-id'],
    audioSrc: 'https://example.com/audio.mp3',
    sensitivity: 0.4,
    threshold: 0.15,
  },
};

// Export preset
export const ambientFloatWaveformPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
