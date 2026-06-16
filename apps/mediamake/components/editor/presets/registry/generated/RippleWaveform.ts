/**
 * RippleWaveform Internal Effect Preset
 *
 * This internal effect preset creates audio-reactive ripple distortions synchronized with bass frequencies.
 * It combines scale, rotate, and translateY transforms that pulse with the music's low-end energy.
 *
 * Features:
 * - Audio-reactive waveform effects synchronized to bass frequencies
 * - Scale effect ranging from 1.0 to 1.15 based on bass intensity
 * - Subtle rotation oscillating between -3deg and 3deg
 * - Vertical translateY movement up to 10px with the beat
 * - Customizable sensitivity (0.1 to 1.0, default 0.5)
 * - Threshold for triggering (0 to 1, default 0.3)
 * - Smoothing factor for fluid motion (default 0.8)
 * - Works seamlessly on text atoms, image atoms, and video atoms
 *
 * ARRAY OF EFFECTS:
 * Returns an array of three waveform effects (scale, rotate, translate) that work together
 * to create a unified ripple response across mixed media compositions.
 *
 * Use cases:
 * - Creating audio-reactive text animations
 * - Building music video effects with bass-driven motion
 * - Adding dynamic motion to static images
 * - Creating unified audio-visual experiences across media types
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Define preset parameters
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply ripple effects to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  duration: z
    .number()
    .optional()
    .default(-1)
    .describe('Duration of the effect in seconds (-1 for full duration)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(1.0)
    .optional()
    .default(0.5)
    .describe('Sensitivity multiplier for audio reactivity (0.1-1.0)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.3)
    .describe('Minimum audio value to trigger effect (0-1)'),
  smoothing: z
    .number()
    .optional()
    .default(0.8)
    .describe('Smoothing factor for fluid motion (0-1, higher = smoother)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetIds,
    audioSrc,
    effectStart,
    duration,
    sensitivity,
    threshold,
    smoothing,
    effectId,
  } = params;

  // Calculate smoothNormalisation from smoothing factor
  // smoothing 0.8 (default) → smoothNormalisation 1 (default)
  // smoothing 1.0 → smoothNormalisation 2 (more smoothing)
  // smoothing 0.0 → smoothNormalisation 0 (no smoothing)
  const smoothNormalisation = smoothing * 2.5;

  // Create scale effect (1.0 to 1.15)
  const scaleEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    baseScale: 1.0,
    intensity: 0.15, // maxScale - minScale
    sensitivity: sensitivity ?? 0.5,
    threshold: threshold ?? 0.3,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: duration ?? -1,
    smoothNormalisation,
  };

  // Create rotate effect (-3deg to 3deg)
  const rotateEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'rotate',
    rotationRange: 3, // ±3 degrees
    sensitivity: sensitivity ?? 0.5,
    threshold: threshold ?? 0.3,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: duration ?? -1,
    smoothNormalisation,
  };

  // Create translateY effect (up to 10px)
  const translateEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'translateY',
    maxValue: 10, // up to 10px movement
    sensitivity: sensitivity ?? 0.5,
    threshold: threshold ?? 0.3,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: duration ?? -1,
    smoothNormalisation,
  };

  // Create effect nodes
  const effects = [
    {
      id: effectId ? `${effectId}-scale` : `ripple-scale-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: scaleEffect,
    },
    {
      id: effectId ? `${effectId}-rotate` : `ripple-rotate-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: rotateEffect,
    },
    {
      id: effectId ? `${effectId}-translate` : `ripple-translate-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: translateEffect,
    },
  ];

  // Return effect output structure
  return {
    output: {
      childrenData: [
        {
          id: 'ripple-waveform-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'RippleWaveform',
  title: 'RippleWaveform',
  description:
    'Internal effect preset that creates audio-reactive ripple distortions synchronized with bass frequencies. Combines scale, rotate, and translateY transforms that pulse with the music\'s low-end energy. Features customizable sensitivity, threshold, and smoothing for fluid motion. Works seamlessly on text, image, and video atoms.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'bass', 'ripple', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    duration: -1,
    sensitivity: 0.5,
    threshold: 0.3,
    smoothing: 0.8,
  },
};

// Export preset
export const RippleWaveformPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
