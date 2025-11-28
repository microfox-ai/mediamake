/**
 * Beat-Driven Multi-Frequency Blur Effect Preset
 *
 * This internal effect preset applies extreme motion blur synchronized to multiple audio frequencies.
 * It layers bass-driven directional blur, mid-frequency rotation blur, and treble-triggered strobe blur
 * to create a complex, music-driven motion blur that makes content feel like it's moving through
 * different dimensional speeds based on the audio spectrum.
 *
 * ARRAY OF EFFECTS:
 * This preset returns an array of three waveform effects:
 * 1. Bass blur (directional/radial/zoom blur synchronized to bass)
 * 2. Mid rotate (rotation blur synchronized to mid frequencies)
 * 3. Treble shake (strobe/shake blur synchronized to treble)
 *
 * Features:
 * - **Multi-Frequency Analysis**: Three separate waveform effects targeting bass, mid, and treble
 * - **Bass-Driven Directional Blur**: Applies blur effects synchronized to bass frequencies
 * - **Mid-Frequency Rotation Blur**: Rotational blur effects synchronized to mid frequencies
 * - **Treble-Triggered Strobe Blur**: Shake/strobe blur effects synchronized to treble frequencies
 * - **Configurable Sensitivity**: Individual sensitivity controls for each frequency band
 * - **Blur Style Options**: Choose between directional, radial, or zoom blur styles
 * - **Provider Mode**: Effects target specific components via targetIds
 *
 * Use cases:
 * - Creating music-reactive motion blur for videos
 * - Building complex audio-synchronized visual effects
 * - Adding multi-layered frequency-driven blur to content
 * - Creating dimensional speed effects based on audio spectrum
 * - Building advanced music video effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  audioSrc: z.string().describe('Audio source URL or ref:componentId for waveform analysis'),
  targetIds: z.array(z.string()).describe('Array of component IDs to apply blur effects to'),
  
  // Bass blur parameters
  bassSensitivity: z.number().min(0.1).max(5).default(1.5).optional()
    .describe('Sensitivity multiplier for bass frequency response (higher = stronger effect)'),
  
  // Mid frequency parameters
  midSensitivity: z.number().min(0.1).max(5).default(1.2).optional()
    .describe('Sensitivity multiplier for mid frequency response (higher = stronger effect)'),
  
  // Treble parameters
  trebleSensitivity: z.number().min(0.1).max(5).default(1.8).optional()
    .describe('Sensitivity multiplier for treble frequency response (higher = stronger effect)'),
  
  // Blur control parameters
  maxBlur: z.number().min(0).max(50).default(20).optional()
    .describe('Maximum blur amount in pixels'),
  
  blurStyle: z.enum(['directional', 'radial', 'zoom']).default('directional').optional()
    .describe('Style of blur effect - directional (motion blur), radial (spin blur), or zoom (scale blur)'),
  
  // Timing parameters
  effectStart: z.number().default(0).optional()
    .describe('Start time of effects relative to parent (seconds)'),
  
  effectDuration: z.number().default(10).optional()
    .describe('Duration of effects (seconds)'),
  
  // Advanced waveform parameters
  threshold: z.number().min(0).max(1).default(0.1).optional()
    .describe('Minimum audio value to trigger effects (0-1)'),
  
  smoothNormalisation: z.number().min(0).max(5).default(1).optional()
    .describe('Frame-based smoothing factor (0 = no smoothing, 1 = default, >1 = more smoothing)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const audioSrc = params.audioSrc;
  const targetIds = params.targetIds;
  const bassSensitivity = params.bassSensitivity ?? 1.5;
  const midSensitivity = params.midSensitivity ?? 1.2;
  const trebleSensitivity = params.trebleSensitivity ?? 1.8;
  const maxBlur = params.maxBlur ?? 20;
  const blurStyle = params.blurStyle ?? 'directional';
  const effectStart = params.effectStart ?? 0;
  const effectDuration = params.effectDuration ?? 10;
  const threshold = params.threshold ?? 0.1;
  const smoothNormalisation = params.smoothNormalisation ?? 1;

  // Helper function to map blur style to effect type
  const getEffectTypeFromBlurStyle = (style: 'directional' | 'radial' | 'zoom'): 'blur' | 'rotate' | 'scale' => {
    switch (style) {
      case 'directional':
        return 'blur';
      case 'radial':
        return 'rotate';
      case 'zoom':
        return 'scale';
    }
  };

  // 1. Bass-driven blur effect (directional blur synchronized to bass)
  const bassBlurEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: getEffectTypeFromBlurStyle(blurStyle),
    intensity: blurStyle === 'blur' ? maxBlur : (blurStyle === 'rotate' ? 15 : 0.3),
    sensitivity: bassSensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation,
    ...(blurStyle === 'scale' && { baseScale: 1 }),
  };

  // 2. Mid-frequency rotation blur (spin blur synchronized to mid frequencies)
  const midRotateEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'mid',
    effectType: 'rotate',
    intensity: 1, // Rotation intensity
    rotationRange: 15, // Degrees
    sensitivity: midSensitivity,
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

  // 3. Treble-triggered shake/strobe blur (shake synchronized to treble)
  const trebleShakeEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'treble',
    effectType: 'shake',
    intensity: maxBlur * 0.5, // Shake amplitude
    shakeAxis: 'both',
    sensitivity: trebleSensitivity,
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

  // Create effect objects
  const effects = [
    {
      id: `beat-blur-bass-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: bassBlurEffect,
    },
    {
      id: `beat-blur-mid-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: midRotateEffect,
    },
    {
      id: `beat-blur-treble-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: trebleShakeEffect,
    },
  ];

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'beatDrivenBlur-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden',
        style: {
          display: 'none',
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
  id: 'beatDrivenBlur',
  title: 'Beat-Driven Multi-Frequency Blur Effect',
  description: 'An internal effect preset that applies synchronized motion blur across multiple audio frequency bands (bass, mid, treble). Creates complex, music-driven blur effects with bass-driven directional blur, mid-frequency rotation blur, and treble-triggered strobe blur. This is an effect-only preset meant to be applied to other components via targetIds.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'blur', 'internal', 'multi-frequency'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    targetIds: ['component-1'],
    bassSensitivity: 1.5,
    midSensitivity: 1.2,
    trebleSensitivity: 1.8,
    maxBlur: 20,
    blurStyle: 'directional',
    effectStart: 0,
    effectDuration: 10,
    threshold: 0.1,
    smoothNormalisation: 1,
  },
};

// Export preset
export const beatDrivenBlurPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
