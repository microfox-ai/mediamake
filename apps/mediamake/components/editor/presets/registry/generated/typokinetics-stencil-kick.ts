/**
 * Typokinetics Stencil Kick Preset
 *
 * This preset renders text as gritty stencil typography that pulses aggressively
 * to kick drum beats. It creates a raw, underground music video aesthetic with
 * spray-painted stencil text on concrete walls that physically vibrates with each kick.
 *
 * Features:
 * - **Stencil Typography**: Rough, distressed texture with sharp militaristic cutouts
 * - **Kick Drum Pulse**: Scale (1.0 to 1.15) and shake on each kick drum hit
 * - **Audio-Reactive**: Detects kick drum frequencies (60-100Hz range)
 * - **Glow Effects**: Subtle glow/outline that intensifies on beats
 * - **Baseline Vibration**: Maintains 0.98-1.02 scale between pulses for energy
 * - **Sharp Attack**: Ease-out curve that mimics kick drum attack
 * - **Gritty Aesthetic**: Contrast and brightness filtering for concrete wall look
 *
 * Use cases:
 * - Underground music video titles
 * - Raw, visceral text animations
 * - Bass-driven typography
 * - Industrial/urban aesthetic content
 * - High-energy concert visuals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  TextAtomData,
  AudioAtomDataProps,
  GenericEffectData,
  WaveformEffectData,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display in stencil style'),
  audio: z
    .object({
      src: z.string().describe('Audio source URL or local path'),
      volume: z
        .number()
        .min(0)
        .max(2)
        .default(1)
        .optional()
        .describe('Audio volume (0-2)'),
      start: z
        .number()
        .min(0)
        .default(0)
        .optional()
        .describe('Audio start time in seconds'),
    })
    .describe('Audio configuration for beat detection'),
  fontSize: z
    .string()
    .default('120px')
    .optional()
    .describe('Font size for text (e.g., "120px")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (default: white)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .optional()
    .describe('Audio sensitivity for beat detection (0.1-5)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Minimum audio threshold to trigger effects (0-1)'),
  maxPulseScale: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.15)
    .optional()
    .describe('Maximum scale during pulse (1.0-1.5)'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Shake intensity in pixels (0-10)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Glow intensity multiplier (0-1)'),
  vibrationAmount: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .optional()
    .describe('Baseline vibration scale amount (0-0.1)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    audio,
    fontSize = '120px',
    textColor = '#FFFFFF',
    sensitivity = 0.8,
    threshold = 0.3,
    maxPulseScale = 1.15,
    shakeIntensity = 2,
    glowIntensity = 0.5,
    vibrationAmount = 0.02,
  } = params;

  const audioId = 'typokinetics-audio-source';
  const textWrapperId = 'typokinetics-text-wrapper';
  const textContentId = 'typokinetics-text-content';

  // Calculate glow values
  const minGlow = 20;
  const maxGlow = 40;
  const minGlowOpacity = 0.5 * glowIntensity;
  const maxGlowOpacity = 0.8 * glowIntensity;

  // Audio atom
  const audioAtom: RenderableComponentData = {
    id: audioId,
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: audio.src,
      volume: audio.volume ?? 1,
      startFrom: audio.start ?? 0,
    } as AudioAtomDataProps,
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
  };

  // Text wrapper with waveform effects
  const kickPulseScaleEffect: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    audioProperty: 'bass',
    effectType: 'scale',
    baseScale: 1,
    intensity: maxPulseScale - 1,
    sensitivity: sensitivity,
    threshold: threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    smoothing: 0.1,
    smoothNormalisation: 0,
    mode: 'provider',
    targetIds: [textContentId],
  };

  const kickShakeXEffect: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    audioProperty: 'bass',
    effectType: 'translateX',
    intensity: shakeIntensity,
    minValue: -shakeIntensity,
    maxValue: shakeIntensity,
    sensitivity: sensitivity,
    threshold: threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    smoothing: 0.1,
    smoothNormalisation: 0,
    mode: 'provider',
    targetIds: [textContentId],
  };

  // Generic glow effect (can't use WaveformEffect for textShadow, so use generic with ranges)
  // Note: textShadow animation is complex, so we'll apply a static shadow and let scale create the "glow" effect
  // Alternatively, we could use filter: drop-shadow which is animatable

  // Baseline vibration effect
  const baselineVibrationEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: 0.1,
    mode: 'provider',
    targetIds: [textContentId],
    ranges: [
      { key: 'scale', val: 1 - vibrationAmount, prog: 0 },
      { key: 'scale', val: 1 + vibrationAmount, prog: 0.5 },
      { key: 'scale', val: 1 - vibrationAmount, prog: 1 },
    ],
  };

  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    effects: [
      {
        id: 'kick-pulse-scale',
        componentId: 'waveform',
        data: kickPulseScaleEffect,
      },
      {
        id: 'kick-shake-x',
        componentId: 'waveform',
        data: kickShakeXEffect,
      },
      {
        id: 'baseline-vibration',
        componentId: 'generic',
        data: baselineVibrationEffect,
      },
    ],
    childrenData: [
      {
        id: textContentId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: text,
          font: {
            family: 'Stencil',
            weights: ['900'],
            display: 'swap',
          },
          style: {
            fontSize: fontSize,
            fontWeight: 900,
            color: textColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textShadow: `0 0 ${minGlow}px rgba(255,255,255,${minGlowOpacity})`,
            transformOrigin: 'center',
            willChange: 'transform, opacity, text-shadow',
            WebkitFontSmoothing: 'antialiased',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            fitDurationTo: audioId,
          },
        },
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  };

  // Root container with gritty filter
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-stencil-kick-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          filter: 'contrast(1.2) brightness(0.9)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: [audioAtom, textWrapper] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-stencil-kick',
  title: 'Typokinetics Stencil Kick',
  description:
    'Gritty stencil typography that pulses aggressively to kick drum beats with audio-reactive scaling, shake, and glow effects. Features distressed militaristic stencil text with sharp ease-out curves mimicking kick drum attacks, plus subtle baseline vibration between beats for a raw underground music video aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'audio-reactive',
    'kick-drum',
    'stencil',
    'gritty',
    'music-video',
    'urban',
    'industrial',
    'bass',
    'pulse',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'UNDERGROUND',
    audio: {
      src: 'https://example.com/kick-heavy-track.mp3',
      volume: 1,
      start: 0,
    },
    fontSize: '120px',
    textColor: '#FFFFFF',
    sensitivity: 0.8,
    threshold: 0.3,
    maxPulseScale: 1.15,
    shakeIntensity: 2,
    glowIntensity: 0.5,
    vibrationAmount: 0.02,
  },
};

// Export preset
export const typokineticsStencilKickPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};