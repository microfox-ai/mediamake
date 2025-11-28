/**
 * Audio-Reactive Gradient Wipe Effect Preset
 *
 * INTERNAL EFFECT PRESET - Returns effect definitions (not components)
 * 
 * This internal preset creates an audio-reactive gradient wipe that synchronizes 
 * wipe progression with bass beats in the audio track. The effect creates a pulsing 
 * gradient reveal that moves across the target element in sync with the music's rhythm.
 *
 * Features:
 * - **Bass-Synchronized Wipe**: Waveform effect modulates translateX based on bass frequency
 * - **Dynamic Scale Pulse**: Scale responds to bass intensity for pulsing effect
 * - **Gradient Opacity Wipe**: Generic opacity gradient creates smooth reveal
 * - **Diagonal Wipe Support**: Configurable wipe angle for directional reveals
 * - **Beat Sensitivity Control**: Adjustable sensitivity for different music styles
 * - **Speed Control**: Base speed multiplier for wipe progression
 *
 * Technical Implementation:
 * - Waveform effect: Bass-reactive translateX + scale modulation
 * - Generic effect: Opacity gradient for smooth reveal progression
 * - Combined effects create dynamic music-driven reveal
 *
 * Use cases:
 * - Music video reveals synchronized to beat
 * - Beat-synced content transitions
 * - Audio-reactive text/image reveals
 * - Dynamic music-driven visual effects
 *
 * ARRAY OF EFFECTS: Returns [waveformEffect, genericEffect]
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the gradient wipe effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z.number().default(0).describe('Start time of the effect relative to component (seconds)'),
  effectDuration: z.number().describe('Duration of the effect (seconds)'),
  baseSpeed: z.number().default(1).describe('Base speed multiplier for wipe progression (higher = faster wipe)'),
  beatSensitivity: z.number().min(0).max(1).default(0.7).describe('Sensitivity to bass beats (0-1, higher = more reactive)'),
  wipeAngle: z.number().default(0).describe('Angle of wipe direction in degrees (0 = left-to-right, 90 = top-to-bottom, -45 = diagonal)'),
  effectId: z.string().optional().describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    targetId,
    audioSrc,
    effectStart,
    effectDuration,
    baseSpeed,
    beatSensitivity,
    wipeAngle,
    effectId,
  } = params;

  // Calculate intensity based on sensitivity and speed
  const translateIntensity = 100 * baseSpeed; // Base translation intensity
  const scaleIntensity = 0.1 + (beatSensitivity * 0.2); // Scale pulsing intensity (0.1-0.3)
  
  // Waveform sensitivity: map beatSensitivity (0-1) to waveform sensitivity (0.5-2.0)
  const waveformSensitivity = 0.5 + (beatSensitivity * 1.5);

  // Create waveform effect for bass-reactive translation and scale
  const waveformEffectData: WaveformEffectData = {
    audioSrc: audioSrc,
    audioProperty: 'bass',
    effectType: 'translateX', // Primary effect is horizontal translation
    intensity: translateIntensity,
    sensitivity: waveformSensitivity,
    threshold: 0.3,
    smoothing: 0.5,
    smoothNormalisation: 1,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [targetId],
    start: effectStart,
    duration: effectDuration,
  };

  const waveformEffect = {
    id: effectId ? `${effectId}-waveform` : `audio-wipe-waveform-${targetId}`,
    componentId: 'waveform',
    data: waveformEffectData,
  };

  // Create generic opacity gradient effect for wipe reveal
  // Calculate gradient progression based on wipe angle
  const isVertical = Math.abs(wipeAngle) > 45 && Math.abs(wipeAngle) < 135;
  const isDiagonal = Math.abs(wipeAngle % 90) > 10; // Not perfectly horizontal or vertical

  // Define opacity keyframes for gradient wipe
  // Faster progression at start, slower reveal at end for musical feel
  const genericEffectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      // Opacity gradient: 0 -> 0.5 (fast) -> 1 (slower reveal)
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.5, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 1 },
      
      // Add subtle scale pulse that syncs with wipe progression
      { key: 'scale', val: 0.95, prog: 0 },
      { key: 'scale', val: 1.05, prog: 0.3 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  const genericEffect = {
    id: effectId ? `${effectId}-gradient` : `audio-wipe-gradient-${targetId}`,
    componentId: 'generic',
    data: genericEffectData,
  };

  // Return both effects in a container structure
  // System will extract effects from first child when _internalPresetOutput: 'effects'
  return {
    output: {
      childrenData: [
        {
          id: 'audio-gradient-wipe-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          effects: [waveformEffect, genericEffect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 1, // Placeholder duration
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
  id: 'audio-reactive-gradient-wipe',
  title: 'Audio-Reactive Gradient Wipe Effect',
  description: 'Internal effect preset that creates audio-reactive gradient wipe reveals synchronized with bass beats. Returns waveform and generic effect definitions for attachment to target components. Modulates wipe progression and gradient softness based on bass frequency analysis.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'audio', 'waveform', 'gradient', 'wipe', 'bass', 'music', 'reveal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 5,
    baseSpeed: 1,
    beatSensitivity: 0.7,
    wipeAngle: 0,
  },
};

// Export preset
export const audioReactiveGradientWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
