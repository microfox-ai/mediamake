/**
 * WaveformTextPulse Internal Effect Preset
 *
 * SINGLE EFFECT (or ARRAY OF EFFECTS when pulseMode='word'):
 * Creates audio-reactive scaling on text elements synchronized to bass frequencies.
 * The effect makes text elements pulse/scale based on the bass intensity in the audio track,
 * perfect for music videos or dynamic typography.
 *
 * Parameters:
 * - targetIds: Array of component IDs to apply pulse effect to
 * - audioSrc: Audio source URL or reference for waveform analysis
 * - baseScale: Resting scale value (default: 1)
 * - maxScale: Maximum scale on beat (default: 1.2)
 * - sensitivity: Audio reactivity 0-1 (default: 0.7)
 * - smoothing: Transition smoothness 0-1 (default: 0.2)
 * - threshold: Minimum bass level to trigger scaling 0-1 (default: 0.3)
 * - pulseMode: 'uniform' (all text scales together) or 'word' (each word scales independently)
 * - phaseOffset: Delay between word pulses in word mode (milliseconds, default: 50)
 *
 * Usage:
 * - For uniform mode: Returns single effect that targets all provided targetIds
 * - For word mode: Returns array of effects, one per targetId with progressive phase offsets
 *
 * Effect type: Waveform (audio-reactive)
 * Returns effects array that can be extracted via _extractedEffects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { WaveformEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply pulse effect to'),
  audioSrc: z.string().describe('Audio source URL or reference (e.g., ref:audio-id)'),
  baseScale: z.number().default(1).optional().describe('Resting scale value (default: 1)'),
  maxScale: z.number().default(1.2).optional().describe('Maximum scale on beat (default: 1.2)'),
  sensitivity: z.number().min(0).max(1).default(0.7).optional().describe('Audio reactivity 0-1 (default: 0.7)'),
  smoothing: z.number().min(0).max(1).default(0.2).optional().describe('Transition smoothness 0-1 (default: 0.2)'),
  threshold: z.number().min(0).max(1).default(0.3).optional().describe('Minimum bass level to trigger scaling 0-1 (default: 0.3)'),
  pulseMode: z.enum(['uniform', 'word']).default('uniform').optional().describe('Pulse mode: uniform (all text scales together) or word (each word scales independently)'),
  phaseOffset: z.number().default(50).optional().describe('Delay between word pulses in word mode (milliseconds, default: 50)'),
  effectStart: z.number().default(0).optional().describe('Start time of the effect (relative to parent, in seconds)'),
  effectDuration: z.string().default('inherit').optional().describe('Duration of the effect (in seconds, or "inherit" to match component duration)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    baseScale = 1,
    maxScale = 1.2,
    sensitivity = 0.7,
    smoothing = 0.2,
    threshold = 0.3,
    pulseMode = 'uniform',
    phaseOffset = 50,
    effectStart = 0,
    effectDuration = 'inherit',
  } = params;

  // Calculate intensity multiplier (how much to scale beyond baseScale)
  const scaleRange = maxScale - baseScale;

  const effects: any[] = [];

  if (pulseMode === 'uniform') {
    // Uniform mode: Single effect targeting all components
    const effectData: WaveformEffectData = {
      audioSrc,
      audioProperty: 'bass',
      effectType: 'scale',
      baseScale,
      intensity: scaleRange, // Scale range from base to max
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: smoothing * 5, // Convert 0-1 smoothing to 0-5 range
    };

    effects.push({
      id: `waveform-text-pulse-uniform`,
      componentId: 'waveform',
      data: effectData,
    });
  } else {
    // Word mode: Individual effects for each target with phase offset
    targetIds.forEach((targetId, index) => {
      // Calculate phase offset in seconds
      const phaseInSeconds = (index * phaseOffset) / 1000;

      const effectData: WaveformEffectData = {
        audioSrc,
        audioProperty: 'bass',
        effectType: 'scale',
        baseScale,
        intensity: scaleRange,
        sensitivity,
        threshold,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider',
        targetIds: [targetId], // Single target per effect
        start: effectStart + phaseInSeconds, // Offset start time
        duration: effectDuration,
        smoothNormalisation: smoothing * 5,
        dataOffsetInSeconds: phaseInSeconds, // Offset audio data analysis
      };

      effects.push({
        id: `waveform-text-pulse-word-${index}-${targetId}`,
        componentId: 'waveform',
        data: effectData,
      });
    });
  }

  // Return container with effects
  const rootContainer: RenderableComponentData = {
    id: 'waveform-text-pulse-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: 10, // Placeholder duration
      },
    },
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'WaveformTextPulse',
  title: 'Waveform Text Pulse',
  description: 'Audio-reactive text scaling synchronized to bass frequencies with uniform or word-by-word pulse modes',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'text', 'pulse', 'scale', 'bass', 'internal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    targetIds: ['text-1'],
    audioSrc: 'https://example.com/audio.mp3',
    baseScale: 1,
    maxScale: 1.2,
    sensitivity: 0.7,
    smoothing: 0.2,
    threshold: 0.3,
    pulseMode: 'uniform',
    phaseOffset: 50,
    effectStart: 0,
    effectDuration: 'inherit',
  },
};

export const WaveformTextPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
