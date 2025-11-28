/**
 * InkDropRippleEffect - Internal Effect Preset
 *
 * Creates concentric rippling animations like ink dropping into water. This waveform-based
 * effect reacts to audio bass frequencies, creating expanding circular waves that pulse
 * outward from the center.
 *
 * ARRAY OF EFFECTS:
 * This preset returns an array of effects:
 * - Primary waveform effect: Scale transform reacting to bass (sensitivity: parameterized, threshold: 0.3)
 * - Secondary shake effect: Optional shake effect triggered on strong beats
 *
 * Technical Features:
 * - Scale effect: Immediate impact (1.0 to 1.2) with damping oscillation
 * - Waveform config: {type: 'scale', audioProperty: 'bass', sensitivity: audioSensitivity * 0.8}
 * - Shake effect: Conditional based on enableShake parameter
 * - Ripple pattern: Quick scale up, then gradually dissipating waves
 *
 * Use cases:
 * - Audio-reactive component animations
 * - Beat-synchronized visual impact
 * - Dynamic ink drop effects for music videos
 * - Pulsing effects synced to bass frequencies
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the ripple effect to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),

  // Ripple parameters
  rippleStrength: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe(
      'Multiplier for scale amount (0.5-2, default: 1). Higher values create stronger ripples.',
    ),
  audioSensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe(
      'Audio sensitivity multiplier (0-1, default: 0.8). Higher values react more to quieter sounds.',
    ),
  rippleDecay: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.6)
    .optional()
    .describe(
      'How quickly ripples fade (0.1-1, default: 0.6). Lower values create longer-lasting ripples.',
    ),
  enableShake: z
    .boolean()
    .default(true)
    .optional()
    .describe(
      'Enable secondary shake effect on strong beats (default: true)',
    ),

  // Optional custom effect IDs
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const rippleStrength = params.rippleStrength ?? 1;
  const audioSensitivity = params.audioSensitivity ?? 0.8;
  const rippleDecay = params.rippleDecay ?? 0.6;
  const enableShake = params.enableShake ?? true;
  const effectIdPrefix = params.effectIdPrefix || 'ink-drop-ripple';

  // Calculate waveform effect parameters
  const scaleAmount = rippleStrength * 0.2; // Base scale amount (0.1 to 0.4)
  const waveformSensitivity = audioSensitivity * 0.8; // 0 to 0.8

  // Create primary waveform scale effect (bass-reactive)
  const waveformScaleEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    intensity: scaleAmount,
    baseScale: 1,
    sensitivity: waveformSensitivity,
    threshold: 0.3,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: rippleDecay,
    minValue: 1,
    maxValue: 1.2,
  };

  const waveformEffect = {
    id: `${effectIdPrefix}-waveform-scale`,
    componentId: 'waveform',
    data: waveformScaleEffect,
  };

  // Collect all effects
  const effects: any[] = [waveformEffect];

  // Add conditional shake effect if enabled
  if (enableShake) {
    const shakeEffectData: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'bass',
      effectType: 'shake',
      intensity: 10,
      sensitivity: 0.6,
      threshold: 0.5,
      shakeAxis: 'both',
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: params.targetIds,
      start: params.effectStart,
      duration: params.effectDuration,
      smoothNormalisation: 1,
    };

    const shakeEffect = {
      id: `${effectIdPrefix}-shake-beats`,
      componentId: 'waveform',
      data: shakeEffectData,
    };

    effects.push(shakeEffect);
  }

  // Create container with effects
  const rootContainer: RenderableComponentData = {
    id: `${effectIdPrefix}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: params.effectStart,
        duration: params.effectDuration,
      },
    },
    effects: effects,
    childrenData: [],
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
  id: 'InkDropRippleEffect',
  title: 'Ink Drop Ripple Effect',
  description:
    'Internal effect preset that creates concentric rippling animations like ink dropping into water. Audio-reactive waveform effect responds to bass frequencies with scale transforms (1.0 to 1.2 with damping oscillation) and synchronized opacity ripples. Includes optional shake effect on strong beats. Parameters: rippleStrength (0.5-2), audioSensitivity (0-1), rippleDecay (0.1-1), enableShake (boolean), targetIds (string[]).',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'waveform', 'audio-reactive', 'ripple', 'ink'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    rippleStrength: 1,
    audioSensitivity: 0.8,
    rippleDecay: 0.6,
    enableShake: true,
  },
};

// Export preset
export const InkDropRippleEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
