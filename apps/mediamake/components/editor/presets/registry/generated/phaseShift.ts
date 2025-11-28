/**
 * PhaseShift Internal Effect Preset
 *
 * ARRAY OF EFFECTS (4 effects total)
 *
 * Creates alternating time acceleration and deceleration cycles, making the element appear
 * to phase in and out of temporal sync using sinusoidal patterns. The effect modulates
 * multiple properties simultaneously at different frequencies to create complex interference
 * patterns that produce a stuttery, phase-shifted motion.
 *
 * Features:
 * - **Scale Phase**: Oscillates between 0.9-1.1 at base frequency
 * - **Rotation Phase**: Oscillates ±15° with offset phase angle
 * - **Opacity Phase**: Wavers 0.7-1.0 at 2x frequency
 * - **Audio Modulation**: Optional waveform overlay for audio-reactive phase speed
 * - **Interference Patterns**: Different frequencies create complex visual rhythms
 *
 * Use cases:
 * - Creating temporal distortion effects
 * - Building glitchy, time-bending animations
 * - Adding audio-reactive phase modulation
 * - Creating complex motion patterns through interference
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData, WaveformEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply phase effects to'),
  inputDuration: z
    .number()
    .min(0.5)
    .describe('Duration of the phase effect in seconds'),
  phaseFrequency: z
    .number()
    .min(0.5)
    .max(5)
    .default(1)
    .optional()
    .describe('Base frequency of phase oscillation (higher = faster cycles)'),
  phaseDepth: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe('Intensity of phase effects (0 = subtle, 1 = full strength)'),
  rotationPhase: z
    .number()
    .min(0)
    .max(Math.PI * 2)
    .default(Math.PI / 4)
    .optional()
    .describe('Phase offset for rotation in radians (creates interference)'),
  audioModulation: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .optional()
    .describe('Audio modulation strength (0 = none, 1 = maximum audio reactivity)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio modulation (required if audioModulation > 0)'),
  effectStartTime: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time of all effects relative to parent (seconds)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    inputDuration,
    phaseFrequency = 1,
    phaseDepth = 1,
    rotationPhase = Math.PI / 4,
    audioModulation = 0,
    audioSrc = '',
    effectStartTime = 0,
  } = params;

  const effects: any[] = [];

  // Number of keyframes for smooth sinusoidal interpolation
  const keyframeCount = 20;

  // 1. SCALE PHASE EFFECT
  // Oscillates scale between 0.9 and 1.1 using sinusoidal pattern
  const scaleRanges = Array.from({ length: keyframeCount }, (_, i) => {
    const progress = i / (keyframeCount - 1);
    const baseScale = 1.0;
    const scaleAmplitude = 0.1 * phaseDepth; // 0.1 range scaled by depth
    const scaleValue =
      baseScale + scaleAmplitude * Math.sin(progress * phaseFrequency * Math.PI * 2);
    return {
      key: 'scale',
      val: scaleValue,
      prog: progress,
    };
  });

  const scalePhaseEffect: GenericEffectData = {
    type: 'linear', // Linear interpolation for smooth sinusoidal curves
    start: effectStartTime,
    duration: inputDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: scaleRanges,
  };

  effects.push({
    id: `phaseshift-scale-${targetIds[0]}`,
    componentId: 'generic',
    data: scalePhaseEffect,
  });

  // 2. ROTATION PHASE EFFECT
  // Oscillates rotation ±15° with phase offset for interference
  const rotationRanges = Array.from({ length: keyframeCount }, (_, i) => {
    const progress = i / (keyframeCount - 1);
    const rotationAmplitude = 15 * phaseDepth; // ±15 degrees scaled by depth
    const rotationValue =
      rotationAmplitude *
      Math.sin(progress * phaseFrequency * Math.PI * 2 + rotationPhase);
    return {
      key: 'rotate',
      val: rotationValue,
      prog: progress,
    };
  });

  const rotationPhaseEffect: GenericEffectData = {
    type: 'linear',
    start: effectStartTime,
    duration: inputDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: rotationRanges,
  };

  effects.push({
    id: `phaseshift-rotation-${targetIds[0]}`,
    componentId: 'generic',
    data: rotationPhaseEffect,
  });

  // 3. OPACITY PHASE EFFECT
  // Oscillates opacity 0.7-1.0 at 2x frequency for faster interference
  const opacityRanges = Array.from({ length: keyframeCount }, (_, i) => {
    const progress = i / (keyframeCount - 1);
    const baseOpacity = 0.85;
    const opacityAmplitude = 0.15 * phaseDepth; // 0.15 range scaled by depth (0.7-1.0)
    const opacityValue =
      baseOpacity +
      opacityAmplitude * Math.sin(progress * phaseFrequency * 2 * Math.PI * 2);
    return {
      key: 'opacity',
      val: Math.max(0.7, Math.min(1.0, opacityValue)), // Clamp to 0.7-1.0
      prog: progress,
    };
  });

  const opacityPhaseEffect: GenericEffectData = {
    type: 'linear',
    start: effectStartTime,
    duration: inputDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: opacityRanges,
  };

  effects.push({
    id: `phaseshift-opacity-${targetIds[0]}`,
    componentId: 'generic',
    data: opacityPhaseEffect,
  });

  // 4. AUDIO MODULATION OVERLAY (optional)
  // Adds audio-reactive scale modulation when audioModulation > 0
  if (audioModulation > 0 && audioSrc) {
    const audioEffect: WaveformEffectData = {
      audioSrc: audioSrc,
      audioProperty: 'bass',
      effectType: 'scale',
      intensity: 0.1 * audioModulation, // Scale intensity based on audio modulation
      baseScale: 1.0,
      sensitivity: audioModulation * 2, // Audio sensitivity
      threshold: 0.3,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: targetIds,
      start: effectStartTime,
      duration: inputDuration,
      smoothNormalisation: 1,
    };

    effects.push({
      id: `phaseshift-audio-${targetIds[0]}`,
      componentId: 'waveform',
      data: audioEffect,
    });
  }

  // Return container with all phase effects
  return {
    output: {
      childrenData: [
        {
          id: 'phaseshift-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              comment:
                'PhaseShift effect container - applies temporal phase effects to target components',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: inputDuration,
            },
          },
          effects: effects,
          childrenData: [],
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
  id: 'phaseShift',
  title: 'PhaseShift Internal Effect Preset',
  description:
    'Creates alternating time acceleration and deceleration cycles with complex interference patterns. Modulates scale (0.9-1.1), rotation (±15°), and opacity (0.7-1.0) using sinusoidal patterns at different frequencies. Combines generic phase effects with optional audio-reactive waveform modulation.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'waveform', 'phase', 'temporal', 'glitch'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    inputDuration: 5,
    phaseFrequency: 1,
    phaseDepth: 1,
    rotationPhase: Math.PI / 4,
    audioModulation: 0,
    audioSrc: '',
    effectStartTime: 0,
  },
};

// Export preset
export const phaseShiftPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
