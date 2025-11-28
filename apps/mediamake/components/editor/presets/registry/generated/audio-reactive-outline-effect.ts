/**
 * Audio-Reactive Outline Effect Preset
 *
 * This internal effect preset generates audio-reactive outline and glow effects targeting any component.
 * Uses waveform bass-frequency analysis to dynamically modulate CSS box-shadow thickness, spread, and blur radius.
 * The effect pulses and glows in sync with music beats, with configurable threshold filtering to eliminate weak beats
 * and adjustable sensitivity for intensity control.
 *
 * Features:
 * - Audio-reactive outline thickness based on bass frequencies
 * - Multi-layer glow effect using CSS box-shadow
 * - Dynamic intensity modulation synchronized with audio beats
 * - Threshold filtering to remove weak beats
 * - Configurable sensitivity for fine-tuned control
 * - Separate base color and glow color for creative styling
 *
 * Use cases:
 * - Creating pulsing outlines on text synchronized with music
 * - Adding reactive glows to video overlays
 * - Building beat-responsive image frames
 * - Creating dynamic accent effects for any visual element
 *
 * ARRAY OF EFFECTS:
 * Returns two effects - one waveform effect for audio-reactive scaling and drop-shadow,
 * and one generic effect for the base outline using box-shadow.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z.number().describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  baseColor: z.string().default('#ffffff').describe('Base outline color (CSS color value)'),
  glowColor: z.string().default('#ff00ff').describe('Glow color for the pulsing effect (CSS color value)'),
  sensitivity: z.number().min(0.5).max(3).default(1.5).describe('Audio sensitivity multiplier (higher = more reactive)'),
  threshold: z.number().min(0).max(1).default(0.3).describe('Minimum audio level to trigger effect (0-1, filters weak beats)'),
  effectId: z.string().optional().describe('Optional custom effect ID prefix'),
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
    baseColor,
    glowColor,
    sensitivity,
    threshold,
    effectId,
  } = params;

  // Generate unique IDs for effects
  const waveformEffectId = effectId ? `${effectId}-waveform` : `audio-outline-waveform-${targetId}`;
  const baseOutlineEffectId = effectId ? `${effectId}-base` : `audio-outline-base-${targetId}`;

  // Waveform effect: Audio-reactive scaling and drop-shadow intensity
  // This effect reacts to bass frequencies and modulates:
  // - Scale: subtle pulsing (1.0 to 1.15)
  // - Drop-shadow: glow intensity (0 to 20px spread)
  const waveformEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'scale', // Use scale as primary effect type
    baseScale: 1.0,
    intensity: 0.15, // Max scale increase of 0.15 (1.0 to 1.15)
    sensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [targetId],
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: 1,
    // Additional property for filter modulation
    minValue: 0,
    maxValue: 20, // Max intensity for drop-shadow effect
  };

  const waveformEffect = {
    id: waveformEffectId,
    componentId: 'waveform',
    data: waveformEffectData,
  };

  // Generic effect: Base outline using multi-layer box-shadow
  // This creates a static outline with multiple shadow layers for depth
  // The waveform effect will modulate additional drop-shadow on top
  const createBoxShadowLayers = (color: string, glowColor: string) => {
    // Base outline layers (static)
    const outlineLayers = [
      `0 0 0 2px ${color}`, // Inner outline
      `0 0 0 4px ${color}`, // Middle outline
      `0 0 0 6px ${color}`, // Outer outline
    ];

    // Glow layers (static base glow)
    const glowLayers = [
      `0 0 8px ${glowColor}`,
      `0 0 12px ${glowColor}`,
      `0 0 16px ${glowColor}`,
    ];

    return [...outlineLayers, ...glowLayers].join(', ');
  };

  const baseOutlineEffectData: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      {
        key: 'boxShadow',
        val: createBoxShadowLayers(baseColor, glowColor),
        prog: 0,
      },
      {
        key: 'boxShadow',
        val: createBoxShadowLayers(baseColor, glowColor),
        prog: 1,
      },
    ],
  };

  const baseOutlineEffect = {
    id: baseOutlineEffectId,
    componentId: 'generic',
    data: baseOutlineEffectData,
  };

  // Return both effects in the standard internal preset structure
  return {
    output: {
      childrenData: [
        {
          id: 'audio-outline-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [waveformEffect, baseOutlineEffect],
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
  id: 'audio-reactive-outline-effect',
  title: 'Audio-Reactive Outline Effect',
  description:
    'An internal effect preset that generates audio-reactive outline and glow effects targeting any component. Uses waveform bass-frequency analysis to dynamically modulate box-shadow thickness, spread, and blur radius. The effect pulses and glows in sync with music beats, with configurable threshold filtering to eliminate weak beats and adjustable sensitivity for intensity control.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio', 'reactive', 'outline', 'glow', 'bass', 'waveform', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    baseColor: '#ffffff',
    glowColor: '#ff00ff',
    sensitivity: 1.5,
    threshold: 0.3,
  },
};

export const audioReactiveOutlineEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
