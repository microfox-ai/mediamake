/**
 * ColorBlockPulse Effect Preset
 *
 * An internal effect preset that creates rhythmic color flashes synchronized to audio beats
 * using waveform effects. This preset overlays semi-transparent color blocks that pulse in
 * opacity and scale based on bass frequencies, creating a music video-style strobe effect.
 *
 * Features:
 * - **Audio-Reactive Pulsing**: Color blocks pulse in sync with audio bass frequencies
 * - **Multi-Layer Support**: Three simultaneous color layers (bass, mid, treble)
 * - **Customizable Colors**: Configure color palette with up to 5 colors
 * - **Sensitivity Control**: Adjust how responsive the effect is to audio
 * - **Threshold Control**: Set minimum audio level to trigger effects
 * - **Frequency Targeting**: Different layers react to different frequency ranges
 * - **Intensity Multiplier**: Control the overall impact of the pulsing effect
 *
 * Technical Details:
 * - Uses waveform effects with scale and opacity animations
 * - Bass frequencies drive primary color layer
 * - Mid frequencies drive secondary color layer
 * - Treble frequencies drive accent highlight layer
 * - All layers use semi-transparent overlays with blend modes
 *
 * Use Cases:
 * - Music video color strobes
 * - Dynamic product showcase backgrounds
 * - Energetic social media content
 * - Audio-reactive visual effects
 * - Beat-synchronized color flashes
 *
 * ARRAY OF EFFECTS:
 * Returns an array containing three waveform effects (bass, mid, treble layers)
 * plus their corresponding layout containers for the color blocks.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Zod schema for input parameters
const presetParams = z.object({
  colorPalette: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Array of color values (CSS colors) for the color blocks (up to 5 colors)'),
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.7)
    .describe('Audio sensitivity multiplier (0-1, higher = more responsive)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Minimum audio level to trigger effect (0-1)'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to target with the color pulse effects'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform synchronization'),
  duration: z
    .number()
    .optional()
    .describe('Duration of the effect in seconds (optional, defaults to auto)'),
  intensityMultiplier: z
    .number()
    .min(0.1)
    .max(3)
    .optional()
    .default(1)
    .describe('Overall intensity multiplier for scale and opacity effects'),
  blendMode: z
    .string()
    .optional()
    .default('normal')
    .describe('CSS blend mode for color layers (e.g., "normal", "screen", "overlay")'),
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
    colorPalette,
    sensitivity = 0.7,
    threshold = 0.5,
    targetIds,
    audioSrc,
    duration,
    intensityMultiplier = 1,
    blendMode = 'normal',
    effectId,
  } = params;

  // Helper function to create waveform effect data
  const createWaveformEffect = (
    layerId: string,
    audioProperty: 'bass' | 'mid' | 'treble',
    colorIndex: number,
    baseIntensity: number,
  ): WaveformEffectData => {
    const scaleMin = 0.95;
    const scaleMax = 1.15 * intensityMultiplier;

    return {
      audioSrc,
      audioProperty,
      effectType: 'scale',
      baseScale: 1,
      intensity: baseIntensity * intensityMultiplier,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [layerId],
      start: 0,
      duration: duration || 0, // Will be overridden by parent timing
      minValue: scaleMin,
      maxValue: scaleMax,
      smoothNormalisation: 1,
    } as WaveformEffectData;
  };

  // Helper function to create opacity waveform effect
  const createOpacityEffect = (
    layerId: string,
    audioProperty: 'bass' | 'mid' | 'treble',
    baseIntensity: number,
  ): WaveformEffectData => {
    return {
      audioSrc,
      audioProperty,
      effectType: 'scale', // Using scale type for custom opacity handling
      intensity: baseIntensity * intensityMultiplier * 0.5,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [layerId],
      start: 0,
      duration: duration || 0,
      minValue: 0.3,
      maxValue: 1,
      smoothNormalisation: 1,
    } as WaveformEffectData;
  };

  // Generate layer IDs
  const bassLayerId = `${effectId || 'color-pulse'}-bass-layer`;
  const midLayerId = `${effectId || 'color-pulse'}-mid-layer`;
  const trebleLayerId = `${effectId || 'color-pulse'}-treble-layer`;

  // Create waveform effects for scale
  const bassScaleEffect = {
    id: `${effectId || 'color-pulse'}-bass-scale`,
    componentId: 'waveform',
    data: createWaveformEffect(bassLayerId, 'bass', 0, 0.8),
  };

  const midScaleEffect = {
    id: `${effectId || 'color-pulse'}-mid-scale`,
    componentId: 'waveform',
    data: createWaveformEffect(midLayerId, 'mid', 1, 0.6),
  };

  const trebleScaleEffect = {
    id: `${effectId || 'color-pulse'}-treble-scale`,
    componentId: 'waveform',
    data: createWaveformEffect(trebleLayerId, 'treble', 2, 0.4),
  };

  // Create waveform effects for opacity
  const bassOpacityEffect = {
    id: `${effectId || 'color-pulse'}-bass-opacity`,
    componentId: 'waveform',
    data: createOpacityEffect(bassLayerId, 'bass', 0.8),
  };

  const midOpacityEffect = {
    id: `${effectId || 'color-pulse'}-mid-opacity`,
    componentId: 'waveform',
    data: createOpacityEffect(midLayerId, 'mid', 0.6),
  };

  const trebleOpacityEffect = {
    id: `${effectId || 'color-pulse'}-treble-opacity`,
    componentId: 'waveform',
    data: createOpacityEffect(trebleLayerId, 'treble', 0.4),
  };

  // Create color layer components
  const bassLayer = {
    id: bassLayerId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="w-full h-full"></div>',
      className: 'absolute inset-0',
      style: {
        backgroundColor: colorPalette[0] || '#FF0066',
        opacity: 0.5,
        mixBlendMode: blendMode,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 0,
      },
    },
  };

  const midLayer = {
    id: midLayerId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="w-full h-full"></div>',
      className: 'absolute inset-0',
      style: {
        backgroundColor: colorPalette[1] || '#00FF99',
        opacity: 0.4,
        mixBlendMode: blendMode,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 0,
      },
    },
  };

  const trebleLayer = {
    id: trebleLayerId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="w-full h-full"></div>',
      className: 'absolute inset-0',
      style: {
        backgroundColor: colorPalette[2] || '#FFD700',
        opacity: 0.3,
        mixBlendMode: blendMode,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 0,
      },
    },
  };

  // Root container with all color layers
  const rootContainer = {
    id: `${effectId || 'color-pulse'}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 50,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 0,
      },
    },
    effects: [
      bassScaleEffect,
      bassOpacityEffect,
      midScaleEffect,
      midOpacityEffect,
      trebleScaleEffect,
      trebleOpacityEffect,
    ],
    childrenData: [bassLayer, midLayer, trebleLayer] as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'colorBlockPulseEffect',
  title: 'ColorBlockPulse Effect',
  description:
    'Internal effect preset that creates rhythmic color flashes synchronized to audio beats using waveform effects. Overlays semi-transparent color blocks that pulse in opacity and scale based on bass frequencies, creating a music video-style strobe effect.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'color', 'pulse', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    colorPalette: ['#FF0066', '#00FF99', '#FFD700'],
    sensitivity: 0.7,
    threshold: 0.5,
    targetIds: ['target-component-id'],
    audioSrc: 'https://example.com/audio.mp3',
    duration: 30,
    intensityMultiplier: 1,
    blendMode: 'normal',
  },
};

// Export preset
export const colorBlockPulseEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
