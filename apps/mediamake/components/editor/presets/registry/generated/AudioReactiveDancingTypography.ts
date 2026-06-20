/**
 * Audio-Reactive Dancing Typography Preset
 *
 * This preset creates an audio-reactive text animation where the text responds to music beats
 * with dynamic Y-axis rotation, scale pulses, and opacity modulation. The text performs a
 * "dancing" motion synchronized to bass frequencies and beat detection, creating a kinetic
 * typography effect that feels like a music visualizer.
 *
 * Features:
 * - **Base Rotation Animation**: Text rotates from -45deg to 0deg on Y-axis over 1 second
 * - **Continuous Drift**: Subtle floating motion between beats (±3deg oscillation)
 * - **Beat-Reactive Rotation**: Additional 5-10deg rotation bursts on detected beats that spring back
 * - **Beat-Reactive Scale**: Synchronized scale pulses (1.0 → 1.2) on kicks and snares
 * - **Audio-Intensity Opacity**: Opacity pulsates with bass frequencies (0.7 → 1.0)
 * - **Audio Synchronization**: All animations perfectly synced to audio duration via fitDurationTo
 * - **Customizable Text**: Supports custom text, font, size, and color parameters
 *
 * Use cases:
 * - Creating music video title cards with beat-synchronized animations
 * - Building audio-reactive lyric displays
 * - Designing kinetic typography for electronic music visuals
 * - Creating dynamic podcast/audio show intros
 * - Building music visualizer components with text elements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  WaveformEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('DANCING TEXT')
    .describe('The text content to display with dancing animations'),
  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat analysis'),
      volume: z
        .number()
        .min(0)
        .max(1)
        .default(1)
        .optional()
        .describe('Audio volume (0-1)'),
    })
    .describe('Audio track configuration for beat synchronization'),
  fontSize: z
    .string()
    .default('72px')
    .optional()
    .describe('Font size for the dancing text'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (hex or CSS color)'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family name (e.g., Inter, Roboto)'),
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., 400, 700, bold)'),
  baseRotationDuration: z
    .number()
    .default(1)
    .optional()
    .describe('Duration of base rotation animation in seconds'),
  beatRotationSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .optional()
    .describe('Sensitivity for beat-reactive rotation (0.1-5, higher = more reactive)'),
  beatRotationThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Threshold for beat detection (0-1, higher = fewer triggers)'),
  beatScaleSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .optional()
    .describe('Sensitivity for beat-reactive scale (0.1-5, higher = more reactive)'),
  beatScaleThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Threshold for scale pulse detection (0-1, higher = fewer triggers)'),
  opacityMin: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Minimum opacity during audio-intensity modulation (0-1)'),
  opacityMax: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe('Maximum opacity during audio-intensity modulation (0-1)'),
  backgroundColor: z
    .string()
    .default('rgba(0,0,0,0)')
    .optional()
    .describe('Background color for the container (default: transparent)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    text,
    audio,
    fontSize = '72px',
    textColor = '#ffffff',
    fontFamily = 'Inter',
    fontWeight = '700',
    baseRotationDuration = 1,
    beatRotationSensitivity = 0.8,
    beatRotationThreshold = 0.6,
    beatScaleSensitivity = 1,
    beatScaleThreshold = 0.6,
    opacityMin = 0.7,
    opacityMax = 1,
    backgroundColor = 'rgba(0,0,0,0)',
  } = params;

  // Component IDs
  const containerId = 'audio-reactive-typography-container';
  const audioId = 'audio-reactive-audio-track';
  const textContainerId = 'audio-reactive-text-container';
  const textId = 'audio-reactive-text';

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId, // Match audio duration
      },
    },
    childrenData: [],
  };

  // --- Audio Track ---
  const audioTrack: RenderableComponentData = {
    id: audioId,
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: audio.src,
      volume: audio.volume ?? 1,
    },
    context: {
      timing: {
        start: 0,
      },
    },
  };

  // --- Text Container (holds text and all effects) ---
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: [],
  };

  // --- Text Atom ---
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize,
        fontWeight,
        color: textColor,
        textAlign: 'center',
        transformStyle: 'preserve-3d',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    effects: [],
  };

  // --- Effect 1: Base Rotation (Y-axis -45deg → 0deg) ---
  const baseRotationEffect = {
    id: 'base-rotation-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: baseRotationDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'rotateY', val: -45, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- Effect 2: Continuous Drift (subtle oscillation between beats) ---
  const continuousDriftEffect = {
    id: 'continuous-drift-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: baseRotationDuration,
      duration: 100, // Long duration (will be limited by fitDurationTo)
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: 3, prog: 0.25 },
        { key: 'rotateY', val: -2, prog: 0.5 },
        { key: 'rotateY', val: 2, prog: 0.75 },
        { key: 'rotateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- Effect 3: Beat-Reactive Rotation (waveform effect) ---
  const beatRotateEffect = {
    id: 'beat-rotate-effect',
    componentId: 'waveform',
    data: {
      audioSrc: audio.src,
      audioProperty: 'bass',
      effectType: 'rotate',
      sensitivity: beatRotationSensitivity,
      threshold: beatRotationThreshold,
      rotationRange: 10, // ±10 degrees on beats
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [textId],
      start: 0,
      duration: 100, // Long duration (limited by fitDurationTo)
      smoothNormalisation: 1,
    } as WaveformEffectData,
  };

  // --- Effect 4: Beat-Reactive Scale (waveform effect) ---
  const beatScaleEffect = {
    id: 'beat-scale-effect',
    componentId: 'waveform',
    data: {
      audioSrc: audio.src,
      audioProperty: 'mid',
      effectType: 'scale',
      sensitivity: beatScaleSensitivity,
      threshold: beatScaleThreshold,
      minValue: 1.0,
      maxValue: 1.2,
      baseScale: 1.0,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [textId],
      start: 0,
      duration: 100, // Long duration (limited by fitDurationTo)
      smoothNormalisation: 1,
    } as WaveformEffectData,
  };

  // --- Effect 5: Audio-Intensity Opacity Modulation ---
  const audioOpacityEffect = {
    id: 'audio-opacity-effect',
    componentId: 'waveform',
    data: {
      audioSrc: audio.src,
      audioProperty: 'bass',
      effectType: 'exposure', // Using exposure to modulate opacity
      sensitivity: 0.5,
      threshold: 0.1,
      minValue: opacityMin,
      maxValue: opacityMax,
      baseBrightness: opacityMax,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      smoothing: 0.2,
      mode: 'provider',
      targetIds: [textId],
      start: 0,
      duration: 100, // Long duration (limited by fitDurationTo)
      smoothNormalisation: 1,
    } as WaveformEffectData,
  };

  // Attach all effects to text atom
  textAtom.effects = [
    baseRotationEffect,
    continuousDriftEffect,
    beatRotateEffect,
    beatScaleEffect,
    audioOpacityEffect,
  ];

  // Assemble text container
  textContainer.childrenData = [textAtom];

  // Assemble root container
  rootContainer.childrenData = [audioTrack, textContainer];

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
  id: 'AudioReactiveDancingTypography',
  title: 'Audio-Reactive Dancing Typography',
  description:
    'Audio-reactive preset where text Y-axis rotation responds to music beats, creating a dancing typography effect. Features beat-synchronized rotation, scale pulses, and audio-intensity modulated opacity. Text rotates from -45deg to 0deg with additional beat-reactive rotation bursts (5-10deg) that spring back, creating a music visualizer meets kinetic typography effect. Includes continuous drift between beats for floating sonic wave aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'audio-reactive',
    'waveform',
    'beat-sync',
    'typography',
    'text',
    'rotation',
    'scale',
    'music-visualizer',
    'kinetic',
    'dancing',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    text: 'DANCING TEXT',
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
    },
    fontSize: '72px',
    textColor: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: '700',
    baseRotationDuration: 1,
    beatRotationSensitivity: 0.8,
    beatRotationThreshold: 0.6,
    beatScaleSensitivity: 1,
    beatScaleThreshold: 0.6,
    opacityMin: 0.7,
    opacityMax: 1,
    backgroundColor: 'rgba(0,0,0,0)',
  },
};

export const AudioReactiveDancingTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
