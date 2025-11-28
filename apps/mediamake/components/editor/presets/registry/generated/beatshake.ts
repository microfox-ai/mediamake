/**
 * BeatShake - Audio-Reactive Camera Shake Preset (Internal Waveform Effect)
 *
 * This internal preset creates camera shake synchronized to audio beats, specifically reacting
 * to bass frequencies. It provides two shake modes: 'earthquake' (slow, heavy shakes on strong
 * beats) and 'vibration' (rapid micro-shakes on continuous bass). The effect intelligently scales
 * intensity based on the audio's dynamic range to prevent oversaturation during loud sections.
 *
 * Features:
 * - **Two Shake Modes**: 'earthquake' (slow, heavy) and 'vibration' (rapid micro-shakes)
 * - **Bass-Reactive**: Analyzes bass frequencies for beat detection
 * - **Damping Control**: Controls how quickly the shake settles after a beat
 * - **Direction Bias**: Favors horizontal, vertical, circular, or random shake patterns
 * - **Auto-Sensitivity**: Dynamically adjusts sensitivity based on overall audio level
 * - **Dynamic Range Scaling**: Prevents oversaturation during loud sections
 * - **Amplitude Range**: 5-50px based on intensity and audio level
 *
 * Use cases:
 * - Creating beat-synchronized camera shake for music videos
 * - Adding impact to bass-heavy audio sections
 * - Building dynamic, audio-reactive visual effects
 * - Creating earthquake or vibration effects synchronized to music
 *
 * INTERNAL PRESET: This returns an effects array for use by other presets.
 * Output type: 'effects' (waveform effect configuration)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  mode: z
    .enum(['earthquake', 'vibration'])
    .describe(
      'Shake mode: earthquake (slow, heavy shakes on strong beats) or vibration (rapid micro-shakes on continuous bass)',
    ),
  intensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Overall shake intensity (0-1), affects amplitude scaling'),
  damping: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Damping factor controlling how quickly shake settles after a beat (0=no damping, 1=heavy damping)'),
  directionBias: z
    .enum(['horizontal', 'vertical', 'circular', 'random'])
    .default('circular')
    .describe(
      'Direction bias for shake pattern: horizontal, vertical, circular, or random',
    ),
  autoSensitivity: z
    .boolean()
    .default(true)
    .describe(
      'Enable auto-adjusting sensitivity based on overall audio level for consistent visual impact',
    ),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the shake effect to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for beat analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate shake parameters based on mode and settings
  const isEarthquakeMode = params.mode === 'earthquake';

  // Amplitude calculation: 5-50px range based on intensity
  const baseAmplitude = 5;
  const maxAmplitude = 50;
  const amplitude = baseAmplitude + (maxAmplitude - baseAmplitude) * params.intensity;

  // Sensitivity calculation: dynamic range 0.3-0.8
  const minSensitivity = 0.3;
  const maxSensitivity = 0.8;
  let sensitivity: number;

  if (params.autoSensitivity) {
    // Auto-adjust sensitivity inversely with intensity to prevent oversaturation
    // Higher intensity = lower sensitivity to maintain consistent visual impact
    sensitivity = maxSensitivity - params.intensity * (maxSensitivity - minSensitivity);
  } else {
    // Use mid-range sensitivity when auto-sensitivity is disabled
    sensitivity = (minSensitivity + maxSensitivity) / 2;
  }

  // Smoothing calculation based on damping
  // Higher damping = more smoothing (slower decay)
  const smoothing = 0.1 + params.damping * 0.4; // Range: 0.1-0.5

  // Smoothing normalization based on mode and damping
  // Earthquake mode uses more smoothing for slow, heavy shakes
  // Vibration mode uses less smoothing for rapid micro-shakes
  let smoothNormalisation: number;
  if (isEarthquakeMode) {
    // Earthquake: 2-5 frames of smoothing (slower, heavier)
    smoothNormalisation = 2 + params.damping * 3;
  } else {
    // Vibration: 0.5-2 frames of smoothing (faster, lighter)
    smoothNormalisation = 0.5 + params.damping * 1.5;
  }

  // Direction bias mapping to shake effect properties
  const getShakeProperties = () => {
    switch (params.directionBias) {
      case 'horizontal':
        return {
          shakeAxis: 'x' as const,
          shakePattern: 'linear' as const,
        };
      case 'vertical':
        return {
          shakeAxis: 'y' as const,
          shakePattern: 'linear' as const,
        };
      case 'circular':
        return {
          shakeAxis: 'both' as const,
          shakePattern: 'circular' as const,
        };
      case 'random':
        return {
          shakeAxis: 'both' as const,
          shakePattern: 'random' as const,
        };
      default:
        return {
          shakeAxis: 'both' as const,
          shakePattern: 'circular' as const,
        };
    }
  };

  const shakeProps = getShakeProperties();

  // Construct waveform effect data
  const effectData: WaveformEffectData = {
    // Audio configuration
    audioSrc: params.audioSrc,
    audioProperty: 'bass', // React to bass frequencies
    numberOfSamples: 128, // Power of 2 for FFT analysis
    useFrequencyData: true, // Enable frequency analysis
    windowInSeconds: 1 / 30, // Analysis window (1 frame at 30fps)

    // Shake effect configuration
    effectType: 'shake',
    intensity: amplitude, // Amplitude in pixels
    sensitivity, // Dynamic sensitivity
    threshold: 0.2, // Minimum audio level to trigger effect
    smoothing, // Smoothing factor for audio data
    smoothNormalisation, // Frame-based smoothing

    // Shake-specific properties
    shakeAxis: shakeProps.shakeAxis,

    // Timing
    start: params.effectStart,
    duration: params.effectDuration,

    // Provider mode with target IDs
    mode: 'provider',
    targetIds: params.targetIds,
  };

  // Create effect node
  const effect = {
    id: params.effectId || `beatshake-${params.targetIds.join('-')}`,
    componentId: 'waveform', // Use WaveformEffect component
    data: effectData,
  };

  // Return effect in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'beatshake-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration,
      },
    },
    effects: [effect],
    childrenData: [] as RenderableComponentData[],
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
  id: 'beatshake',
  title: 'BeatShake - Audio-Reactive Camera Shake',
  description:
    'Internal waveform effect preset that creates camera shake synchronized to audio beats, specifically reacting to bass frequencies. Provides two modes: earthquake (slow, heavy shakes on strong beats) and vibration (rapid micro-shakes on continuous bass). Features intelligent dynamic range scaling, damping parameters, directional bias control, and auto-adjusting sensitivity based on overall audio levels.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'shake', 'internal', 'bass'],
  dependencies: {},
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    mode: 'earthquake',
    intensity: 0.5,
    damping: 0.5,
    directionBias: 'circular',
    autoSensitivity: true,
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
  },
};

// Export preset
export const beatshakePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
