/**
 * FrequencyBounce Internal Effect Preset
 *
 * ARRAY OF EFFECTS (3 effects - bass, mid, treble)
 *
 * This internal effect preset creates a multi-frequency audio-reactive animation
 * by generating three parallel waveform effects that respond to different frequency
 * bands (bass, mid, treble). Each frequency band affects a different transform
 * property to create layered, complex elastic animations.
 *
 * Features:
 * - **Bass (Low Frequency)**: Heavy, slow elastic bounces on scale with large overshoot
 * - **Mid (Mid Frequency)**: Medium-speed wobbles on rotation
 * - **Treble (High Frequency)**: Rapid, small vibrations on translation
 * - **Smoothing Control**: Per-band smoothing to prevent jarring transitions
 * - **Sensitivity Adjustment**: Configurable sensitivity for each frequency band
 * - **Layered Animation**: All three effects blend into complex audio-reactive movement
 *
 * Use cases:
 * - Creating rich, multi-dimensional audio-reactive animations
 * - Building complex elastic behaviors synchronized with music
 * - Adding frequency-specific responses to visual elements
 * - Creating professional audio visualizations with layered motion
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { WaveformEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z.array(z.string()).describe('IDs of components to apply effects to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  effectStart: z.number().describe('Start time of effects (relative to parent)'),
  effectDuration: z.number().describe('Duration of effects'),
  
  // Bass (scale) configuration
  bassSensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Sensitivity for bass frequency effect (scale bounce)'),
  bassSmoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Smoothing factor for bass effect (higher = smoother)'),
  bassIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Bass effect intensity (scale range)'),
  bassThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Minimum bass level to trigger effect'),
  
  // Mid (rotation) configuration
  midSensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.7)
    .describe('Sensitivity for mid frequency effect (rotation wobble)'),
  midSmoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Smoothing factor for mid effect'),
  midIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Mid effect intensity (rotation range)'),
  midThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Minimum mid level to trigger effect'),
  
  // Treble (translation) configuration
  trebleSensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.5)
    .describe('Sensitivity for treble frequency effect (translate vibration)'),
  trebleSmoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Smoothing factor for treble effect'),
  trebleIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Treble effect intensity (translate distance)'),
  trebleThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Minimum treble level to trigger effect'),
  
  // Optional effect IDs
  bassEffectId: z.string().optional().describe('Custom ID for bass effect'),
  midEffectId: z.string().optional().describe('Custom ID for mid effect'),
  trebleEffectId: z.string().optional().describe('Custom ID for treble effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    bassSensitivity,
    bassSmoothing,
    bassIntensity,
    bassThreshold,
    midSensitivity,
    midSmoothing,
    midIntensity,
    midThreshold,
    trebleSensitivity,
    trebleSmoothing,
    trebleIntensity,
    trebleThreshold,
    bassEffectId,
    midEffectId,
    trebleEffectId,
  } = params;

  // Generate unique IDs for each effect
  const generateEffectId = (type: string, customId?: string): string => {
    if (customId) return customId;
    return `frequency-bounce-${type}-${targetIds.join('-')}`;
  };

  // Bass Effect: Heavy scale bounce with large overshoot
  const bassEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: bassSensitivity,
    smoothing: bassSmoothing,
    intensity: bassIntensity,
    threshold: bassThreshold,
    baseScale: 1,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: 2, // Heavy smoothing for slow elastic bounce
  };

  const bassEffect = {
    id: generateEffectId('bass', bassEffectId),
    componentId: 'waveform',
    data: bassEffectData,
  };

  // Mid Effect: Medium rotation wobble
  const midEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'mid',
    effectType: 'rotate',
    sensitivity: midSensitivity,
    smoothing: midSmoothing,
    intensity: midIntensity,
    threshold: midThreshold,
    rotationRange: 15, // ±15 degrees rotation
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: 1, // Medium smoothing for wobbles
  };

  const midEffect = {
    id: generateEffectId('mid', midEffectId),
    componentId: 'waveform',
    data: midEffectData,
  };

  // Treble Effect: Rapid translate vibrations
  const trebleEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'treble',
    effectType: 'translateX',
    sensitivity: trebleSensitivity,
    smoothing: trebleSmoothing,
    intensity: trebleIntensity,
    threshold: trebleThreshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: 0, // No smoothing for rapid vibrations
  };

  const trebleEffect = {
    id: generateEffectId('treble', trebleEffectId),
    componentId: 'waveform',
    data: trebleEffectData,
  };

  // Return container with all three effects
  const rootContainer: RenderableComponentData = {
    id: 'frequency-bounce-container',
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
        fitDurationTo: 'audio-source',
      },
    },
    effects: [bassEffect, midEffect, trebleEffect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer],
      // Expose effects for extraction
      _extractedEffects: [bassEffect, midEffect, trebleEffect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'FrequencyBounce',
  title: 'FrequencyBounce Audio-Reactive Effect',
  description:
    'Internal effect preset that creates layered elastic animations driven by three audio frequency bands (bass, mid, treble). Bass triggers heavy scale bounces, mids create rotation wobbles, and treble produces rapid translate vibrations. All three effects blend into a complex audio-reactive animation with smoothing and per-band sensitivity controls.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio', 'waveform', 'internal', 'frequency', 'elastic', 'bounce'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    bassSensitivity: 1,
    bassSmoothing: 0.3,
    bassIntensity: 0.4,
    bassThreshold: 0.2,
    midSensitivity: 0.7,
    midSmoothing: 0.2,
    midIntensity: 0.5,
    midThreshold: 0.15,
    trebleSensitivity: 0.5,
    trebleSmoothing: 0.1,
    trebleIntensity: 0.3,
    trebleThreshold: 0.1,
  },
};

export const FrequencyBouncePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
