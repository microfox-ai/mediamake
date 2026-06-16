/**
 * FrequencyRipple Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset creates audio-reactive rippling distortions based on frequency analysis.
 * It returns multiple waveform effects (scale + exposure) that create concentric ripple-like effects.
 *
 * Features:
 * - Multi-zone scaling: Inner (mid frequencies), Middle (treble), Outer (bass)
 * - Complementary exposure effect for pulsing glow on frequency peaks
 * - Configurable frequency band selection (bass/mid/treble/full)
 * - Adjustable ripple speed, count, and decay rate
 * - Perfect for creating speaker-like visual vibrations on any media element
 *
 * Use cases:
 * - Audio-reactive media overlays
 * - Speaker/sound system visualizations
 * - Music video effects
 * - Podcast or audio content visual enhancement
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the ripple effects to'),
  frequencyBand: z
    .enum(['bass', 'mid', 'treble', 'full'])
    .optional()
    .describe('Frequency band to analyze for primary effects (default: mid)'),
  rippleSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .optional()
    .describe('Speed multiplier for ripple propagation (default: 1.0)'),
  rippleCount: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe('Number of concurrent ripple layers (default: 3)'),
  decayRate: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('How quickly ripples fade (0 = no decay, 1 = fast decay, default: 0.5)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL or ref:componentId (optional, can be provided by parent)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(-1)
    .describe('Duration of the effect (-1 = inherit from parent)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const targetIds = params.targetIds || [];
  const frequencyBand = params.frequencyBand || 'mid';
  const rippleSpeed = params.rippleSpeed || 1.0;
  const rippleCount = params.rippleCount || 3;
  const decayRate = params.decayRate !== undefined ? params.decayRate : 0.5;
  const audioSrc = params.audioSrc || '';
  const effectStart = params.effectStart || 0;
  const effectDuration = params.effectDuration !== undefined ? params.effectDuration : -1;

  // Helper: Calculate sensitivity based on decay rate
  const calculateSensitivity = (baseSensitivity: number): number => {
    // Higher decay rate = lower sensitivity for smoother effect
    return baseSensitivity * (1 - decayRate * 0.3);
  };

  // Helper: Calculate smoothing based on ripple speed
  const calculateSmoothing = (): number => {
    // Faster ripples = less smoothing for more responsive effect
    return Math.max(0.5, 1.5 - rippleSpeed * 0.3);
  };

  const smoothNormalisation = calculateSmoothing();

  // Create effects array
  const effects: any[] = [];

  // Inner scale effect (primary frequency band, strongest reaction)
  const innerScaleEffect: WaveformEffectData = {
    audioSrc: audioSrc,
    audioProperty: frequencyBand,
    effectType: 'scale',
    sensitivity: calculateSensitivity(0.6),
    threshold: 0.2,
    intensity: 0.1 * rippleSpeed,
    baseScale: 1.0,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: smoothNormalisation,
  };

  effects.push({
    id: `frequency-ripple-inner-scale-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: innerScaleEffect,
  });

  // Middle scale effect (treble frequencies, moderate reaction)
  const middleScaleEffect: WaveformEffectData = {
    audioSrc: audioSrc,
    audioProperty: 'treble',
    effectType: 'scale',
    sensitivity: calculateSensitivity(0.4),
    threshold: 0.2,
    intensity: 0.05 * rippleSpeed,
    baseScale: 1.0,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: smoothNormalisation,
  };

  effects.push({
    id: `frequency-ripple-middle-scale-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: middleScaleEffect,
  });

  // Outer scale effect (bass frequencies, subtle pulse)
  const outerScaleEffect: WaveformEffectData = {
    audioSrc: audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: calculateSensitivity(0.3),
    threshold: 0.1,
    intensity: 0.02 * rippleSpeed,
    baseScale: 1.0,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: smoothNormalisation,
  };

  effects.push({
    id: `frequency-ripple-outer-scale-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: outerScaleEffect,
  });

  // Exposure glow effect (brightens on frequency peaks)
  const exposureEffect: WaveformEffectData = {
    audioSrc: audioSrc,
    audioProperty: frequencyBand,
    effectType: 'exposure',
    sensitivity: calculateSensitivity(0.7),
    threshold: 0.3,
    intensity: 0.3 * rippleSpeed,
    baseBrightness: 1.0,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: smoothNormalisation,
  };

  effects.push({
    id: `frequency-ripple-exposure-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: exposureEffect,
  });

  // Create container with all effects
  const rootContainer = {
    id: 'frequency-ripple-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: effectStart,
        duration: effectDuration,
      },
    },
    effects: effects,
    childrenData: [] as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'frequency-ripple-effect',
  title: 'FrequencyRipple Audio Effect',
  description:
    'Internal effect preset that creates audio-reactive rippling distortions with concentric scale zones (inner/mid/outer) based on frequency analysis (bass/mid/treble/full). Returns waveform effect configurations with scale and exposure effects for speaker-like visual vibrations on target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'ripple', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['example-component'],
    frequencyBand: 'mid',
    rippleSpeed: 1.0,
    rippleCount: 3,
    decayRate: 0.5,
    audioSrc: '',
    effectStart: 0,
    effectDuration: -1,
  },
};

// Export preset
export const frequencyRippleEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
