/**
 * AudioReactiveFade - Waveform-Based Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates opacity pulsing synchronized with audio beats. The effect reacts to bass frequencies
 * for impactful fading on beat drops, with configurable sensitivity and threshold values.
 *
 * Features:
 * - Fade-in mode: Opacity increases when bass hits threshold
 * - Fade-out mode: Opacity decreases when bass hits threshold
 * - Configurable sensitivity, threshold, and smoothing
 * - Reaction speed: Controls how quickly opacity changes on beat
 * - Recovery speed: Controls return to base opacity
 * - Intensity multiplier: Scales the overall effect strength
 * - Smoothing: Prevents jarring transitions
 * - Invert option: Reverses the effect behavior
 *
 * Use cases:
 * - Beat-synchronized opacity pulsing for text overlays
 * - Dynamic fading effects for images and videos
 * - Audio-reactive visual elements
 * - Music video effects synchronized with bass drops
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { WaveformEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to target'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  duration: z.number().optional().describe('Duration of the effect in seconds (default: 5000ms = 5s)'),
  mode: z.enum(['fadeIn', 'fadeOut']).describe('Fade mode: fadeIn increases opacity on beats, fadeOut decreases opacity on beats'),
  sensitivity: z.number().min(0).max(1).optional().describe('Sensitivity to audio beats (0-1, default: 0.7)'),
  threshold: z.number().min(0).max(1).optional().describe('Minimum audio intensity to trigger effect (0-1, default: 0.5)'),
  smoothing: z.number().min(0).max(1).optional().describe('Smoothing factor for transitions (0-1, default: 0.3)'),
  reactionSpeed: z.number().min(0).max(1).optional().describe('How quickly opacity changes on beat (0-1, default: 0.8)'),
  recoverySpeed: z.number().min(0).max(1).optional().describe('How quickly opacity returns to base (0-1, default: 0.4)'),
  intensityMultiplier: z.number().optional().describe('Scales the overall effect strength (default: 1.0)'),
  invert: z.boolean().optional().describe('Inverts the effect behavior (default: false)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const duration = params.duration || 5;
  const mode = params.mode;
  const sensitivity = params.sensitivity ?? 0.7;
  const threshold = params.threshold ?? 0.5;
  const smoothing = params.smoothing ?? 0.3;
  const reactionSpeed = params.reactionSpeed ?? 0.8;
  const recoverySpeed = params.recoverySpeed ?? 0.4;
  const intensityMultiplier = params.intensityMultiplier ?? 1.0;
  const invert = params.invert ?? false;

  // Determine effect type based on mode and invert
  let effectType: 'opacity-increase' | 'opacity-decrease';
  if (mode === 'fadeIn') {
    effectType = invert ? 'opacity-decrease' : 'opacity-increase';
  } else {
    effectType = invert ? 'opacity-increase' : 'opacity-decrease';
  }

  // Construct waveform effect data
  const waveformConfig: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass', // React to bass frequencies for impactful fading
    effectType: effectType as any, // Custom effect type for opacity manipulation
    sensitivity: sensitivity * intensityMultiplier,
    threshold: threshold,
    smoothNormalisation: smoothing,
    intensity: reactionSpeed,
    mode: 'provider',
    targetIds: params.targetIds,
    start: 0,
    duration: duration,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    // Custom properties for fade behavior
    props: {
      reactionSpeed: reactionSpeed,
      recoverySpeed: recoverySpeed,
      intensityMultiplier: intensityMultiplier,
    },
  };

  // Create the waveform effect
  const effect = {
    id: params.effectId || `audio-reactive-fade-${params.targetIds.join('-')}`,
    componentId: 'waveform',
    data: waveformConfig,
  };

  // Return effect in container structure
  const rootContainer: RenderableComponentData = {
    id: 'audio-reactive-fade-container',
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
        duration: duration,
      },
    },
    effects: [effect],
    childrenData: [],
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
  id: 'audio-reactive-fade',
  title: 'AudioReactiveFade',
  description: 'Waveform-based internal effect preset that creates opacity pulsing synchronized with audio beats. Reacts to bass frequencies for impactful fading on beat drops with configurable sensitivity, threshold, reaction speed, recovery speed, and intensity multiplier. Supports fade-in mode (opacity increases on bass hits) and fade-out mode (opacity decreases on bass hits). Can target multiple components simultaneously with smoothing to prevent jarring transitions.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'opacity', 'fade', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    duration: 5,
    mode: 'fadeIn',
    sensitivity: 0.7,
    threshold: 0.5,
    smoothing: 0.3,
    reactionSpeed: 0.8,
    recoverySpeed: 0.4,
    intensityMultiplier: 1.0,
    invert: false,
  },
};

export const audioReactiveFadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
