/**
 * Audio Reactive Film Damage Preset
 *
 * This internal waveform effect preset synchronizes film degradation effects with audio beats.
 * When bass hits occur, it triggers brief film tears (scale distortion 1.0 to 1.15 to 1.0).
 * Mid-frequency peaks cause color bleeding effects (saturate filter 100% to 150% to 100%).
 * Treble spikes trigger dust particle opacity bursts. The effect makes it seem like the film
 * is physically reacting to sound vibrations, with damage intensifying during loud passages.
 *
 * Features:
 * - **Bass-Triggered Scale Distortion**: Scale animations that pulse with bass frequencies (20-200Hz)
 * - **Mid-Frequency Saturation**: Color bleeding effects that respond to midrange frequencies (200-2000Hz)
 * - **Treble Dust Bursts**: Dust particle opacity bursts that spike with treble frequencies (2000-8000Hz)
 * - **Sensitivity Controls**: Independent sensitivity controls for bass, mid, and treble frequency bands
 * - **Damage Style**: Choose between tear, burn, or scratch visual aesthetics
 * - **Reaction Speed**: Control effect timing with instant, smooth, or delayed responses
 * - **Vintage Aesthetic**: Film grain and damage effects create an old film reel look
 *
 * Use cases:
 * - Creating audio-reactive film degradation effects
 * - Synchronizing visual damage with music beats
 * - Building vintage audio visualizers
 * - Adding dynamic film grain effects
 * - Creating speaker vibration simulations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  bassSensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Sensitivity to bass frequencies (0-1, higher = more reactive)'),
  midSensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Sensitivity to mid frequencies (0-1, higher = more reactive)'),
  trebleSensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Sensitivity to treble frequencies (0-1, higher = more reactive)'),
  damageStyle: z
    .enum(['tear', 'burn', 'scratch'])
    .default('tear')
    .describe('Visual style of film damage effect'),
  reactionSpeed: z
    .enum(['instant', 'smooth', 'delayed'])
    .default('smooth')
    .describe('Speed of effect response to audio'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the film damage effects to'),
  audioId: z
    .string()
    .default('Audio')
    .describe('ID of the audio component to react to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    bassSensitivity,
    midSensitivity,
    trebleSensitivity,
    damageStyle,
    reactionSpeed,
    targetIds,
    audioId,
    effectStart,
    effectDuration,
  } = params;

  // Map reaction speed to smoothing values
  const getSmoothingForSpeed = (speed: 'instant' | 'smooth' | 'delayed') => {
    switch (speed) {
      case 'instant':
        return 0.1;
      case 'smooth':
        return 0.25;
      case 'delayed':
        return 0.4;
      default:
        return 0.25;
    }
  };

  const smoothing = getSmoothingForSpeed(reactionSpeed);

  // Map reaction speed to attack/release times
  const getTimingForSpeed = (speed: 'instant' | 'smooth' | 'delayed') => {
    switch (speed) {
      case 'instant':
        return { attack: 0.03, release: 0.15 };
      case 'smooth':
        return { attack: 0.05, release: 0.2 };
      case 'delayed':
        return { attack: 0.1, release: 0.3 };
      default:
        return { attack: 0.05, release: 0.2 };
    }
  };

  const timing = getTimingForSpeed(reactionSpeed);

  // Bass-triggered scale distortion effect (tear effect)
  const bassScaleEffect: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: bassSensitivity,
    threshold: 0.6,
    baseScale: 1.0,
    intensity: 0.15, // Scale from 1.0 to 1.15
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothing: smoothing,
    mode: 'provider',
    targetIds: targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: reactionSpeed === 'instant' ? 0 : 1,
  };

  // Mid-frequency saturation effect (color bleeding)
  const midSaturationEffect: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    audioProperty: 'mid',
    effectType: 'exposure', // Using exposure to simulate saturation/brightness changes
    sensitivity: midSensitivity,
    threshold: 0.5,
    baseBrightness: 1.0,
    intensity: 0.5, // Brightness from 1.0 to 1.5
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothing: smoothing * 1.2, // Slightly more smoothing for color bleeding
    mode: 'provider',
    targetIds: targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: reactionSpeed === 'instant' ? 0 : 1,
  };

  // Create dust particle overlay HTML
  const getDustParticleStyle = (style: 'tear' | 'burn' | 'scratch') => {
    switch (style) {
      case 'burn':
        return {
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 400 400\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"3.5\" numOctaves=\"6\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" fill=\"%23ff4400\"/%3E%3C/svg%3E')",
          backgroundSize: '150px 150px',
          mixBlendMode: 'overlay' as const,
          pointerEvents: 'none' as const,
        };
      case 'scratch':
        return {
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 400 400\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"4.0\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" fill=\"%23ffffff\"/%3E%3C/svg%3E')",
          backgroundSize: '100px 400px',
          mixBlendMode: 'soft-light' as const,
          pointerEvents: 'none' as const,
        };
      default: // tear
        return {
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 400 400\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"2.5\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')",
          backgroundSize: '200px 200px',
          mixBlendMode: 'overlay' as const,
          pointerEvents: 'none' as const,
        };
    }
  };

  const dustParticleStyle = getDustParticleStyle(damageStyle);

  // Treble dust burst effect
  const trebleDustEffect: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    audioProperty: 'treble',
    effectType: 'blur', // Using blur to create dust/grain effect
    intensity: 4, // Blur intensity 0-4px
    sensitivity: trebleSensitivity,
    threshold: 0.7,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothing: 0.15, // Fast attack for dust bursts
    mode: 'provider',
    targetIds: ['audio-reactive-dust-layer'],
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: 0, // No smoothing for instant dust bursts
  };

  // Treble opacity burst effect for dust particles
  const trebleOpacityEffect: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    audioProperty: 'treble',
    effectType: 'exposure', // Using exposure to control opacity-like behavior
    baseBrightness: 0.1,
    intensity: 0.3, // Opacity from 0.1 to 0.4
    sensitivity: trebleSensitivity,
    threshold: 0.7,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothing: 0.1,
    mode: 'provider',
    targetIds: ['audio-reactive-dust-layer'],
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: 0,
  };

  // Build the effects array
  const effects = [
    {
      id: `bass-scale-effect-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: bassScaleEffect,
    },
    {
      id: `mid-saturation-effect-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: midSaturationEffect,
    },
    {
      id: `treble-dust-blur-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: trebleDustEffect,
    },
    {
      id: `treble-dust-opacity-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: trebleOpacityEffect,
    },
  ];

  // Dust particle layer (HTMLBlockAtom)
  const dustParticleLayer = {
    id: 'audio-reactive-dust-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="film-grain absolute inset-0 opacity-0"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: dustParticleStyle,
    },
    context: {
      timing: {
        start: effectStart,
        duration: effectDuration,
      },
    },
    effects: [],
  } as RenderableComponentData;

  // Container for all effects
  const rootContainer = {
    id: 'audio-reactive-film-damage-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: effectStart,
        duration: effectDuration,
      },
    },
    effects: effects.slice(0, 2), // Bass and mid effects on root
    childrenData: [dustParticleLayer] as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects, // Extract effects for internal preset usage
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'AudioReactiveFilmDamage',
  title: 'Audio Reactive Film Damage',
  description:
    'Internal waveform effect preset that synchronizes film degradation effects (tears, burns, scratches) with audio beats. Bass hits trigger scale distortions, mid-frequency peaks cause color saturation bleeding, and treble spikes create dust particle opacity bursts. The vintage aesthetic simulates an old film reel physically reacting to speaker vibrations.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'internal', 'vintage', 'film'],
  dependencies: {
    hooks: ['useWaveformData'],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    bassSensitivity: 1,
    midSensitivity: 1,
    trebleSensitivity: 1,
    damageStyle: 'tear',
    reactionSpeed: 'smooth',
    targetIds: ['target-component-1'],
    audioId: 'Audio',
    effectStart: 0,
    effectDuration: 10,
  },
};

export const AudioReactiveFilmDamagePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
