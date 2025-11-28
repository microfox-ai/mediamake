/**
 * Beat Sync Rotate Effect Preset
 *
 * SINGLE EFFECT (INTERNAL):
 * This preset creates a waveform effect that rotates elements in sync with audio beats.
 * The rotation pulses and bounces with bass frequencies, creating a turntable or 
 * record-spinning effect perfect for music videos and rhythm-based content.
 *
 * Features:
 * - **Three Rotation Modes**: Continuous spin with beat acceleration, back-and-forth wobble, or stepped rotation
 * - **Audio-Reactive**: Responds to bass frequencies with configurable sensitivity
 * - **Continuous Spin**: Optional background rotation between beats
 * - **Beat Pulse**: Optional scale pulse on strong beats
 * - **Rotation Accumulation**: Choose to snap back to origin or accumulate rotation
 * - **Configurable Thresholds**: Control sensitivity and minimum trigger values
 *
 * Use cases:
 * - Music video turntable effects
 * - Rhythm-based visual animations
 * - Audio-reactive logo spins
 * - DJ-style visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply rotation effect'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  effectStart: z.number().describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  
  // Rotation behavior parameters
  baseSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Sensitivity to bass frequencies (how much each beat affects rotation)'),
  continuousSpin: z
    .boolean()
    .default(false)
    .optional()
    .describe('Enable continuous background rotation between beats'),
  spinSpeed: z
    .number()
    .min(0)
    .max(360)
    .default(45)
    .optional()
    .describe('Continuous spin speed in degrees per second (when continuousSpin is enabled)'),
  pulseOnBeat: z
    .boolean()
    .default(true)
    .optional()
    .describe('Add scale pulse effect on strong beats'),
  rotationMode: z
    .enum(['continuous', 'wobble', 'stepped'])
    .default('continuous')
    .optional()
    .describe('Rotation behavior: continuous spin with acceleration, back-and-forth wobble, or stepped rotation per beat'),
  
  // Audio analysis parameters
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Minimum bass intensity to trigger rotation (0-1)'),
  smoothNormalisation: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe('Smoothing factor for rotation transitions (0=no smoothing, 1=default, >1=more smoothing)'),
  
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    audioSrc,
    effectStart,
    effectDuration,
    baseSensitivity = 1.5,
    continuousSpin = false,
    spinSpeed = 45,
    pulseOnBeat = true,
    rotationMode = 'continuous',
    threshold = 0.2,
    smoothNormalisation = 1,
    effectId,
  } = params;

  // Helper function to calculate rotation intensity based on mode
  const calculateRotationIntensity = (): number => {
    switch (rotationMode) {
      case 'continuous':
        // Continuous mode: moderate intensity with beat acceleration
        return baseSensitivity * 0.8;
      case 'wobble':
        // Wobble mode: higher intensity for back-and-forth motion
        return baseSensitivity * 1.2;
      case 'stepped':
        // Stepped mode: discrete rotation steps
        return baseSensitivity * 1.5;
      default:
        return baseSensitivity;
    }
  };

  const rotationIntensity = calculateRotationIntensity();

  // Create rotation effect using WaveformEffect
  const rotationEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'rotate',
    intensity: rotationIntensity,
    sensitivity: baseSensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [targetId],
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation,
    // Rotation-specific parameters
    rotationRange: rotationMode === 'stepped' ? 15 : 30,
    baseScale: 1,
  };

  const rotationEffect = {
    id: effectId || `beatSyncRotate-effect-${targetId}`,
    componentId: 'waveform',
    data: rotationEffectData,
  };

  const effects = [rotationEffect];

  // Add scale pulse effect if enabled
  if (pulseOnBeat) {
    const scalePulseData: WaveformEffectData = {
      audioSrc,
      audioProperty: 'bass',
      effectType: 'scale',
      intensity: 0.15,
      baseScale: 1,
      sensitivity: baseSensitivity * 0.8,
      threshold: threshold + 0.1,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [targetId],
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: smoothNormalisation * 1.2,
    };

    const scalePulseEffect = {
      id: `beatSyncRotate-pulse-${targetId}`,
      componentId: 'waveform',
      data: scalePulseData,
    };

    effects.push(scalePulseEffect);
  }

  // Add continuous spin effect if enabled
  if (continuousSpin && spinSpeed > 0) {
    // Use generic effect for continuous linear rotation
    const continuousSpinData = {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: (spinSpeed * effectDuration), prog: 1 },
      ],
    };

    const continuousSpinEffect = {
      id: `beatSyncRotate-continuous-${targetId}`,
      componentId: 'generic',
      data: continuousSpinData,
    };

    effects.push(continuousSpinEffect);
  }

  return {
    output: {
      childrenData: [
        {
          id: 'beatSyncRotate-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
            },
          },
          effects,
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
  id: 'beatSyncRotate',
  title: 'Beat Sync Rotate Effect',
  description:
    'A waveform effect preset that rotates elements in sync with audio beats. The rotation pulses and bounces with bass frequencies, creating a turntable or record-spinning effect. Supports three rotation behaviors: continuous spin with beat acceleration, back-and-forth wobble, and stepped rotation that advances on each beat. Perfect for music videos and rhythm-based content.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'rotation', 'beat-sync', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'ref:Audio',
    effectStart: 0,
    effectDuration: 10,
    baseSensitivity: 1.5,
    continuousSpin: false,
    spinSpeed: 45,
    pulseOnBeat: true,
    rotationMode: 'continuous',
    threshold: 0.2,
    smoothNormalisation: 1,
  },
};

export const beatSyncRotatePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};