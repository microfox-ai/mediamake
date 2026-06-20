/**
 * Audio-Reactive Geometric Waveform Effect Preset
 *
 * This internal effect preset generates audio-reactive scale and rotation effects for geometric shapes.
 * It creates bass-driven scale transformations and treble-driven rotation animations with threshold-based
 * triggering for punchy geometric reveals. The effect layers multiple waveform properties to create
 * complex, music-driven geometric animations.
 *
 * ARRAY OF EFFECTS:
 * This preset returns an array of waveform effect objects that can be extracted and applied to target components.
 * The effects include:
 * 1. Bass-driven scale effect (with threshold triggering for strong bass hits)
 * 2. Treble-driven rotation effect (continuous rotation based on treble frequencies)
 *
 * Features:
 * - **Threshold-Based Triggering**: Only activates on strong bass hits above threshold
 * - **Multiple Transform Modes**: Uniform scale, asymmetric stretch, kaleidoscope rotation
 * - **Layered Waveform Properties**: Bass for scale, treble for rotation speed
 * - **Sensitivity Controls**: Customizable sensitivity for different music genres
 * - **Smooth Transitions**: Configurable smoothing to prevent jarring animations
 *
 * Use cases:
 * - Creating audio-reactive geometric animations
 * - Building music visualizers with shape pulsations
 * - Adding dynamic scale and rotation effects synchronized to beats
 * - Creating punchy geometric reveals triggered by bass hits
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the audio-reactive effects to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  duration: z
    .number()
    .positive()
    .describe('Duration of the effect in seconds'),
  transformMode: z
    .enum(['uniform', 'asymmetric', 'kaleidoscope'])
    .default('uniform')
    .optional()
    .describe(
      'Transform mode: uniform (single scale), asymmetric (stretch scaleX/Y), kaleidoscope (scale + rotation)',
    ),
  bassSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Sensitivity multiplier for bass-driven scale effect (0.1-5)'),
  trebleSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .optional()
    .describe(
      'Sensitivity multiplier for treble-driven rotation effect (0.1-5)',
    ),
  bassThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe(
      'Threshold for bass hit triggering (0-1), only activates on strong bass hits',
    ),
  maxScale: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .optional()
    .describe('Maximum scale value for bass-driven scaling (1-3)'),
  minScale: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .optional()
    .describe('Minimum scale value when bass is below threshold (0-1)'),
  baseScale: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Base scale value when no audio activity (0.5-2)'),
  rotationRange: z
    .number()
    .min(0)
    .max(360)
    .default(15)
    .optional()
    .describe(
      'Maximum rotation range in degrees for treble-driven rotation (0-360)',
    ),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .optional()
    .describe('Smoothing factor for transitions (0-1, 0 = no smoothing)'),
  smoothNormalisation: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe(
      'Frame-based smoothing for waveform data (0 = raw, 1 = default, >1 = more smoothing)',
    ),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time of the effect relative to parent component (seconds)'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs to ensure uniqueness'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const transformMode = params.transformMode ?? 'uniform';
  const bassSensitivity = params.bassSensitivity ?? 1.5;
  const trebleSensitivity = params.trebleSensitivity ?? 0.8;
  const bassThreshold = params.bassThreshold ?? 0.6;
  const maxScale = params.maxScale ?? 1.5;
  const minScale = params.minScale ?? 0.9;
  const baseScale = params.baseScale ?? 1;
  const rotationRange = params.rotationRange ?? 15;
  const smoothing = params.smoothing ?? 0.1;
  const smoothNormalisation = params.smoothNormalisation ?? 1;
  const effectStart = params.effectStart ?? 0;
  const effectIdPrefix = params.effectIdPrefix ?? 'audio-reactive-geometry';

  // Generate unique effect IDs
  const bassEffectId = `${effectIdPrefix}-bass-scale`;
  const trebleEffectId = `${effectIdPrefix}-treble-rotate`;

  // Create bass-driven scale effect
  const bassScaleEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: bassSensitivity,
    threshold: bassThreshold,
    baseScale: baseScale,
    intensity: maxScale - baseScale, // Intensity determines max scale range
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30, // Default to 30 fps
    mode: 'provider',
    targetIds: params.targetIds,
    start: effectStart,
    duration: params.duration,
    smoothing: smoothing,
    smoothNormalisation: smoothNormalisation,
    minValue: minScale,
    maxValue: maxScale,
  };

  const bassScaleEffect = {
    id: bassEffectId,
    componentId: 'waveform',
    data: bassScaleEffectData,
  };

  // Create treble-driven rotation effect
  const trebleRotateEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'treble',
    effectType: 'rotate',
    sensitivity: trebleSensitivity,
    threshold: 0, // No threshold for rotation, continuous effect
    rotationRange: rotationRange,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: effectStart,
    duration: params.duration,
    smoothing: smoothing,
    smoothNormalisation: smoothNormalisation,
  };

  const trebleRotateEffect = {
    id: trebleEffectId,
    componentId: 'waveform',
    data: trebleRotateEffectData,
  };

  // Build effects array based on transform mode
  const effects = [];

  if (transformMode === 'uniform') {
    // Uniform mode: Single scale effect
    effects.push(bassScaleEffect);
  } else if (transformMode === 'asymmetric') {
    // Asymmetric mode: Separate scaleX and scaleY effects
    const scaleXEffect = {
      id: `${effectIdPrefix}-bass-scaleX`,
      componentId: 'waveform',
      data: {
        ...bassScaleEffectData,
        effectType: 'scale' as const,
        // Use scaleX by setting effectType to scale (WaveformEffect handles this)
      },
    };

    const scaleYEffect = {
      id: `${effectIdPrefix}-bass-scaleY`,
      componentId: 'waveform',
      data: {
        ...bassScaleEffectData,
        effectType: 'scale' as const,
        audioProperty: 'mid' as const, // Use mid frequencies for Y axis
        sensitivity: bassSensitivity * 0.8, // Slightly different sensitivity
      },
    };

    effects.push(scaleXEffect, scaleYEffect);
  } else if (transformMode === 'kaleidoscope') {
    // Kaleidoscope mode: Scale + rotation combined
    effects.push(bassScaleEffect, trebleRotateEffect);
  }

  // Return effects wrapped in a container structure for extraction
  const effectContainer: RenderableComponentData = {
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
        start: 0,
        duration: params.duration,
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [effectContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'audio-reactive-geometry',
  title: 'Audio-Reactive Geometric Waveform Effect',
  description:
    'Internal effect preset that generates audio-reactive scale and rotation effects for geometric shapes. Creates bass-driven scale transformations and treble-driven rotation animations with threshold-based triggering. Supports multiple transformation modes (uniform, asymmetric stretch, kaleidoscope) and customizable sensitivity controls for different music genres.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'geometry', 'internal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['geometric-shape-1'],
    audioSrc: 'audio.mp3',
    duration: 30,
    transformMode: 'uniform',
    bassSensitivity: 1.5,
    trebleSensitivity: 0.8,
    bassThreshold: 0.6,
    maxScale: 1.5,
    minScale: 0.9,
    baseScale: 1,
    rotationRange: 15,
    smoothing: 0.1,
    smoothNormalisation: 1,
    effectStart: 0,
  },
};

export const audioReactiveGeometryPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};