/**
 * Static Noise TV Effect Preset
 *
 * This is an internal effect preset that overlays animated TV static/noise on any target component.
 * It combines generic animations for the noise pattern movement and opacity flickering,
 * plus an optional waveform component that intensifies the static based on audio peaks.
 *
 * Features:
 * - **Static Noise Pattern**: Generated using CSS noise patterns (SVG filter base64 encoded)
 * - **Opacity Flickering**: Rapid opacity changes create the classic TV static flicker
 * - **Position Shifts**: Slight background position shifts add movement to the noise
 * - **Audio Reactivity (Optional)**: Waveform effect intensifies static based on audio treble peaks
 * - **Configurable Parameters**: Noise density, flicker rate, and audio reactivity toggle
 *
 * Use cases:
 * - Creating TV static overlays for glitch effects
 * - Adding retro analog TV interference effects
 * - Building audio-reactive noise effects
 * - Creating distressed/corrupted video looks
 *
 * SINGLE EFFECT:
 * Returns multiple effects (generic animations + optional waveform) as an array.
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  GenericEffectData,
  WaveformEffectData,
} from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the static noise effect to'),
  noiseDensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.9)
    .describe('Density of the noise pattern (higher = more grain, typically 0.5-1.5)'),
  flickerRate: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Speed of the flicker animation in seconds (lower = faster flicker)'),
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive intensification of static based on treble peaks'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL or ref:componentId (required if audioReactive is true)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent timeline'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    noiseDensity,
    flickerRate,
    audioReactive,
    audioSrc,
    effectStart,
    effectDuration,
    effectId,
  } = params;

  // Helper function to generate noise SVG pattern
  const generateNoisePattern = (density: number): string => {
    // SVG filter-based noise pattern (base64 encoded)
    // Adjust baseFrequency based on density parameter
    const baseFrequency = Math.min(0.9, Math.max(0.3, density)).toFixed(2);
    const svgNoise = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noise)" opacity="1"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(svgNoise)}`;
  };

  const noisePattern = generateNoisePattern(noiseDensity);

  // Opacity flicker effect - rapid opacity changes
  const opacityFlickerEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: flickerRate,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'opacity', val: 0.8, prog: 0 },
      { key: 'opacity', val: 0.3, prog: 0.1 },
      { key: 'opacity', val: 0.9, prog: 0.3 },
      { key: 'opacity', val: 0.2, prog: 0.5 },
      { key: 'opacity', val: 0.7, prog: 0.7 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Background position shift effect - creates movement
  const positionShiftEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: flickerRate * 0.5, // Faster position shifts
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'backgroundPosition', val: '0% 0%', prog: 0 },
      { key: 'backgroundPosition', val: '50% 50%', prog: 0.25 },
      { key: 'backgroundPosition', val: '25% 75%', prog: 0.5 },
      { key: 'backgroundPosition', val: '75% 25%', prog: 0.75 },
      { key: 'backgroundPosition', val: '0% 0%', prog: 1 },
    ],
  };

  // Apply background image via generic effect
  const backgroundImageEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'backgroundImage', val: `url('${noisePattern}')`, prog: 0 },
      { key: 'backgroundImage', val: `url('${noisePattern}')`, prog: 1 },
    ],
  };

  // Background size and repeat
  const backgroundStyleEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'backgroundRepeat', val: 'repeat', prog: 0 },
      { key: 'backgroundRepeat', val: 'repeat', prog: 1 },
      { key: 'backgroundSize', val: '200px 200px', prog: 0 },
      { key: 'backgroundSize', val: '200px 200px', prog: 1 },
    ],
  };

  const effects: any[] = [
    {
      id: effectId
        ? `${effectId}-opacity-flicker`
        : `static-noise-opacity-flicker-${targetIds[0]}`,
      componentId: 'generic',
      data: opacityFlickerEffect,
    },
    {
      id: effectId
        ? `${effectId}-position-shift`
        : `static-noise-position-shift-${targetIds[0]}`,
      componentId: 'generic',
      data: positionShiftEffect,
    },
    {
      id: effectId
        ? `${effectId}-bg-image`
        : `static-noise-bg-image-${targetIds[0]}`,
      componentId: 'generic',
      data: backgroundImageEffect,
    },
    {
      id: effectId
        ? `${effectId}-bg-style`
        : `static-noise-bg-style-${targetIds[0]}`,
      componentId: 'generic',
      data: backgroundStyleEffect,
    },
  ];

  // Optional audio-reactive waveform effect
  if (audioReactive && audioSrc) {
    const waveformEffect: WaveformEffectData = {
      audioSrc: audioSrc,
      audioProperty: 'treble',
      effectType: 'blur',
      intensity: 10, // Blur intensity
      sensitivity: 0.8,
      threshold: 0.3,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: 0.5, // Faster response for jittery effect
    };

    effects.push({
      id: effectId
        ? `${effectId}-waveform`
        : `static-noise-waveform-${targetIds[0]}`,
      componentId: 'waveform',
      data: waveformEffect,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'static-noise-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
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
  id: 'staticNoiseEffect',
  title: 'Static Noise TV Effect',
  description:
    'Internal effect preset that overlays animated TV static/noise on target components using CSS noise patterns with rapid opacity flickering and position shifts. Supports optional audio-reactive intensification via waveform effect on treble frequencies.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'noise', 'static', 'tv', 'glitch', 'audio-reactive', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    noiseDensity: 0.9,
    flickerRate: 1,
    audioReactive: false,
    effectStart: 0,
    effectDuration: 10,
  },
};

export const staticNoiseEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
