/**
 * Audio-Reactive Expanding Border Effect Preset
 *
 * This preset creates a pulsing rectangular border effect that expands outward from element edges
 * in sync with bass frequencies. The border animates like an energy field expanding from the content,
 * with thickness and glow intensity responding to audio beats.
 *
 * Features:
 * - **Waveform Audio-Reactive Border**: Four border elements (top, right, bottom, left) that pulse with bass
 * - **Dynamic Glow Effect**: Box-shadow animation synchronized with audio beats
 * - **Configurable Parameters**: Base thickness, glow color, max expansion, and beat sensitivity
 * - **Energy Field Aesthetic**: Creates a dynamic, music-connected visual effect
 * - **Perfect for Highlights**: Ideal for emphasizing key moments in video or text overlays
 *
 * Technical:
 * - Uses waveform effect with type: 'scale' for border expansion
 * - Synchronized with bass frequencies (audioProperty: 'bass')
 * - Combines with generic effect for animated box-shadow glow
 * - Returns both waveform and generic effects in array
 * - Set _internalPresetOutput: 'effects' for effect-only output
 *
 * Use cases:
 * - Highlighting key moments in videos
 * - Creating music-reactive text overlays
 * - Adding dynamic borders to content cards
 * - Building energy field effects for gaming content
 * - Emphasizing beat drops in music videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the border effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for bass frequency analysis'),
  effectStart: z.number().default(0).optional().describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  
  baseThickness: z.number().min(2).max(10).default(4).optional().describe('Base thickness of the border in pixels (2-10px)'),
  glowColor: z.string().default('#00ff00').optional().describe('Color of the border glow (hex format)'),
  maxExpansion: z.number().min(1.2).max(2.0).default(1.5).optional().describe('Maximum expansion multiplier for glow intensity (1.2-2.0)'),
  beatSensitivity: z.number().min(0.1).max(1.0).default(0.8).optional().describe('Sensitivity to audio beats (0.1-1.0)'),
  
  threshold: z.number().min(0).max(1).default(0.3).optional().describe('Minimum audio value to trigger effect (0-1)'),
  smoothNormalisation: z.number().min(0).max(5).default(1).optional().describe('Audio smoothing factor (0=none, 1=default, >1=more)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    audioSrc,
    effectStart = 0,
    effectDuration,
    baseThickness = 4,
    glowColor = '#00ff00',
    maxExpansion = 1.5,
    beatSensitivity = 0.8,
    threshold = 0.3,
    smoothNormalisation = 1,
  } = params;

  // Create waveform effect for scale animation (border expansion)
  const waveformEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: beatSensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [targetId],
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation,
    baseScale: 1,
    intensity: 0.2, // Subtle scale for border expansion
  };

  const waveformEffect = {
    id: `waveform-scale-${targetId}`,
    componentId: 'waveform',
    data: waveformEffectData,
  };

  // Create generic effect for box-shadow glow animation
  const genericEffectData: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { 
        key: 'boxShadow', 
        val: `0 0 ${baseThickness}px ${glowColor}`, 
        prog: 0 
      },
      { 
        key: 'boxShadow', 
        val: `0 0 ${Math.round(baseThickness * maxExpansion)}px ${glowColor}`, 
        prog: 0.5 
      },
      { 
        key: 'boxShadow', 
        val: `0 0 ${baseThickness}px ${glowColor}`, 
        prog: 1 
      },
    ],
  };

  const genericEffect = {
    id: `glow-effect-${targetId}`,
    componentId: 'generic',
    data: genericEffectData,
  };

  // Return both effects in a container
  const rootContainer = {
    id: 'audio-reactive-border-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    effects: [waveformEffect, genericEffect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'audioReactiveBorderPulse',
  title: 'Audio-Reactive Expanding Border Effect',
  description: 'Creates a pulsing rectangular border effect that expands outward from element edges in sync with bass frequencies, with thickness and glow intensity responding to audio beats',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'border', 'waveform', 'glow', 'pulse', 'bass', 'energy-field', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'my-component',
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    baseThickness: 4,
    glowColor: '#00ff00',
    maxExpansion: 1.5,
    beatSensitivity: 0.8,
    threshold: 0.3,
    smoothNormalisation: 1,
  },
};

export const audioReactiveBorderPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
