/**
 * Phosphor Persistence Internal Effect Preset
 *
 * This internal effect preset recreates the ghosting/persistence/trailing afterimage effect
 * reminiscent of old CRT phosphor displays often recorded on VHS. It uses audio waveform data
 * to create dynamic motion blur and multi-layered trailing shadows that react to audio beats.
 *
 * SINGLE EFFECT (or ARRAY when multiple trails):
 * - Primary waveform effect for audio-reactive translation (creates motion trails)
 * - Secondary generic effect for multi-layered text-shadow trails (phosphor glow)
 *
 * Features:
 * - Audio-reactive motion (X/Y translation synced to audio waveform)
 * - Multi-layered text-shadow trails with configurable count and fade
 * - Dynamic intensity based on audio sensitivity
 * - Phosphor-like green glow (customizable color)
 * - Adjustable trail count, fade rate, and audio sensitivity
 *
 * Use cases:
 * - CRT/VHS-style ghosting effects on text or images
 * - Audio-reactive motion blur trails
 * - Retro screen persistence effects
 * - VHS tape playback simulation overlays
 *
 * Advanced Usage:
 * Apply to individual components (text, images) with targetIds to create
 * dynamic phosphor trails synchronized with audio beats.
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  WaveformEffectData,
  GenericEffectData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply phosphor persistence effect'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent timing)'),
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),
  trailCount: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('Number of trailing afterimages (1-10, more trails = more ghosting)'),
  fadeRate: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Fade rate for trails (0.1-1, lower = longer persistence)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.6)
    .describe('Audio sensitivity for motion trails (0.1-2, higher = more motion)'),
  trailColor: z
    .string()
    .default('0,255,0')
    .optional()
    .describe('RGB color for phosphor glow trails (default: "0,255,0" for green CRT phosphor)'),
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
  const {
    targetId,
    audioSrc,
    effectStart,
    effectDuration,
    trailCount,
    fadeRate,
    sensitivity,
    trailColor,
    effectId,
  } = params;

  // Helper function to generate text-shadow layers for phosphor trails
  const generatePhosphorTrails = (
    count: number,
    fade: number,
    color: string,
  ): string[] => {
    const trails: string[] = [];
    const baseOpacity = 0.5;
    const rgbColor = color || '0,255,0';

    for (let i = 1; i <= count; i++) {
      const offset = i * 2;
      const blur = i * 2;
      const opacity = baseOpacity * Math.pow(1 - fade, i);
      
      // Create layered shadows with decreasing opacity
      const shadow = `${offset}px ${offset}px ${blur}px rgba(${rgbColor},${opacity})`;
      trails.push(shadow);
    }

    return trails;
  };

  // Waveform effect for audio-reactive translation (creates motion)
  const waveformEffectData: WaveformEffectData = {
    audioSrc: audioSrc,
    audioProperty: 'waveform',
    effectType: 'translateX',
    sensitivity: sensitivity,
    threshold: 0.1,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [targetId],
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: 1,
    minValue: -5,
    maxValue: 5,
  };

  const waveformEffect = {
    id: effectId ? `${effectId}-waveform` : `phosphor-waveform-${targetId}`,
    componentId: 'waveform',
    data: waveformEffectData,
  };

  // Generic effect for phosphor trail shadows (multi-layered text-shadow)
  const minTrails = generatePhosphorTrails(
    Math.max(1, Math.floor(trailCount / 2)),
    fadeRate,
    trailColor || '0,255,0',
  );
  const maxTrails = generatePhosphorTrails(
    trailCount,
    fadeRate,
    trailColor || '0,255,0',
  );

  const trailEffectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      {
        key: 'textShadow',
        val: minTrails.join(', '),
        prog: 0,
      },
      {
        key: 'textShadow',
        val: maxTrails.join(', '),
        prog: 0.5,
      },
      {
        key: 'textShadow',
        val: minTrails.join(', '),
        prog: 1,
      },
    ],
  };

  const trailEffect = {
    id: effectId ? `${effectId}-trail` : `phosphor-trail-${targetId}`,
    componentId: 'generic',
    data: trailEffectData,
  };

  // Return both effects in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'phosphor-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [waveformEffect, trailEffect],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'phosphorPersistence',
  title: 'Phosphor Persistence Internal Effect',
  description:
    'Internal effect preset that recreates CRT phosphor display ghosting/persistence with audio-reactive trails. Creates motion blur and afterimage effects using waveform-driven translation and multi-layered text shadows. Intensity and trail count react to audio beats for dynamic ghosting reminiscent of VHS-recorded CRT displays.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'phosphor', 'crt', 'vhs', 'ghosting', 'trails', 'audio-reactive', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    trailCount: 4,
    fadeRate: 0.3,
    sensitivity: 0.6,
    trailColor: '0,255,0',
  },
};

// Export preset
export const phosphorPersistencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
