/**
 * Magnetic Hover Effect - Internal Waveform-Based Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates subtle magnetic attraction/repulsion micro-movements on target elements.
 * Reacts to audio bass frequencies, causing elements to appear as if hovering and
 * floating on sound waves. Combines translate movements with slight scale breathing
 * for an alive, responsive feel without overwhelming the composition.
 *
 * Features:
 * - Audio-reactive translate movements (horizontal or both axes)
 * - Subtle scale breathing effect synchronized with waveform
 * - Configurable bass sensitivity threshold
 * - Parameter-driven intensity control
 * - Returns multiple effects for combined behavior
 *
 * Use cases:
 * - Making static text feel dynamic without overwhelming
 * - Creating subtle hover effects on images
 * - Adding micro-movements to UI elements
 * - Building audio-reactive compositions with restraint
 *
 * @param targetId - ID of the component to apply the effect to
 * @param audioSrc - Audio source URL or ref:componentId for waveform analysis
 * @param effectStart - Start time of the effect (relative to parent)
 * @param effectDuration - Duration of the effect in seconds
 * @param sensitivity - Bass sensitivity multiplier (0-1, default: 0.3)
 * @param threshold - Minimum bass value to trigger movement (0-1, default: 0.5)
 * @param includeVertical - Whether to include vertical movement (default: false)
 * @param intensity - Overall intensity multiplier for all movements (default: 1.0)
 * @param effectId - Optional custom effect ID prefix
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the magnetic hover effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z.number().describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.3)
    .describe('Bass sensitivity multiplier (0-1, controls how reactive to bass)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Minimum bass value to trigger movement (0-1, higher = less sensitive)'),
  includeVertical: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include vertical movement in addition to horizontal'),
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .optional()
    .default(1.0)
    .describe('Overall intensity multiplier for all movements (0.1-3)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix (defaults to magnetic-hover)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const sensitivity = params.sensitivity ?? 0.3;
  const threshold = params.threshold ?? 0.5;
  const includeVertical = params.includeVertical ?? false;
  const intensity = params.intensity ?? 1.0;
  const effectIdPrefix = params.effectId ?? 'magnetic-hover';

  // Calculate movement range based on intensity
  // Micro-movements: typically 2-10px horizontal, 1-5px vertical
  const horizontalRange = 8 * intensity; // Base: 8px
  const verticalRange = 4 * intensity; // Base: 4px

  // Create effects array
  const effects = [];

  // Effect 1: Horizontal translate (always included)
  const translateXEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'translateX',
    intensity: horizontalRange,
    sensitivity: sensitivity,
    threshold: threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: 1, // Smooth for gentle hover feel
    minValue: -horizontalRange,
    maxValue: horizontalRange,
  };

  effects.push({
    id: `${effectIdPrefix}-translateX-${params.targetId}`,
    componentId: 'waveform',
    data: translateXEffect,
  });

  // Effect 2: Vertical translate (conditional)
  if (includeVertical) {
    const translateYEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'bass',
      effectType: 'translateY',
      intensity: verticalRange,
      sensitivity: sensitivity * 0.8, // Slightly less sensitive vertically
      threshold: threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [params.targetId],
      start: params.effectStart,
      duration: params.effectDuration,
      smoothNormalisation: 1,
      minValue: -verticalRange,
      maxValue: verticalRange,
    };

    effects.push({
      id: `${effectIdPrefix}-translateY-${params.targetId}`,
      componentId: 'waveform',
      data: translateYEffect,
    });
  }

  // Effect 3: Scale breathing (subtle)
  // Uses waveform instead of bass for smoother breathing
  const scaleBreathingEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'waveform',
    effectType: 'scale',
    intensity: 0.02 * intensity, // Very subtle: 0.98-1.02 range
    baseScale: 1.0,
    sensitivity: 0.5,
    threshold: 0,
    numberOfSamples: 128,
    useFrequencyData: false,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: 2, // Extra smooth for breathing effect
    minValue: 0.98,
    maxValue: 1.02,
  };

  effects.push({
    id: `${effectIdPrefix}-scale-${params.targetId}`,
    componentId: 'waveform',
    data: scaleBreathingEffect,
  });

  // Return all effects in a container structure
  return {
    output: {
      childrenData: [
        {
          id: 'magnetic-hover-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
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

const presetMetadata: PresetMetadata = {
  id: 'magnetic-hover-effect',
  title: 'Magnetic Hover Effect',
  description:
    'An internal waveform-based effect preset that creates subtle magnetic attraction/repulsion micro-movements on target elements. Reacts to audio bass frequencies, causing elements to appear as if hovering and floating on sound waves. Combines translate movements with slight scale breathing for an alive, responsive feel without overwhelming the composition.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'hover', 'magnetic', 'micro-movement', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    sensitivity: 0.3,
    threshold: 0.5,
    includeVertical: false,
    intensity: 1.0,
  },
};

export const magneticHoverEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
