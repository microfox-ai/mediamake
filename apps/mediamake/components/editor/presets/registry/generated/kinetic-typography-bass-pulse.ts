/**
 * Kinetic Typography Bass Pulse Preset
 *
 * A club VJ-style kinetic typography preset where text pulses and glows in sync with bass frequencies.
 * Features neon-like multi-layer glow effects that intensify with bass hits, rhythmic character scaling,
 * smooth fade-in transitions, and continuous breathing animations. Designed for typography that matches
 * the audio energy in real-time.
 *
 * Features:
 * - Audio-reactive bass pulse effects (scale, glow, brightness)
 * - Multi-layer text-shadow glow effects that expand/contract with music
 * - Smooth fade-in entrance animation
 * - Continuous subtle rotation for added dynamism
 * - Configurable sensitivity and threshold for audio responsiveness
 * - Customizable text, font, colors, and effect parameters
 *
 * Use cases:
 * - Music video typography
 * - Club VJ visuals
 * - Electronic music visualizations
 * - Dynamic title sequences
 * - Audio-reactive text overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  WaveformEffectData,
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for bass analysis'),
  
  // Font configuration
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family (e.g., "Inter:700:normal" or "Roboto")'),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgba)'),
  
  // Glow effect configuration
  glowColor: z
    .string()
    .default('#ffffff')
    .describe('Glow effect color (hex or rgba)'),
  baseGlowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Base glow opacity (0-1)'),
  minBlurRadius: z
    .number()
    .min(5)
    .max(50)
    .default(10)
    .describe('Minimum blur radius for glow (px)'),
  maxBlurRadius: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .describe('Maximum blur radius for glow when bass hits (px)'),
  
  // Audio reactivity configuration
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Audio sensitivity multiplier (higher = more reactive)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Minimum audio level to trigger effects (0-1)'),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Audio smoothing factor (0 = none, 1 = maximum)'),
  
  // Scale effect configuration
  minScale: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1.0)
    .describe('Minimum scale (base size)'),
  maxScale: z
    .number()
    .min(1.0)
    .max(2.0)
    .default(1.2)
    .describe('Maximum scale when bass hits'),
  
  // Brightness effect configuration
  minBrightness: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1.0)
    .describe('Minimum brightness'),
  maxBrightness: z
    .number()
    .min(1.0)
    .max(2.0)
    .default(1.5)
    .describe('Maximum brightness when bass hits'),
  
  // Animation configuration
  fadeInDuration: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Fade-in duration in seconds'),
  rotationDuration: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .describe('Full rotation cycle duration in seconds'),
  rotationAngle: z
    .number()
    .min(0)
    .max(360)
    .default(5)
    .describe('Maximum rotation angle in degrees'),
  
  // Timing
  duration: z
    .number()
    .optional()
    .describe('Duration in seconds (uses audio duration if not specified)'),
  
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Generate unique IDs
  const containerId = 'kinetic-bass-pulse-container';
  const textId = 'kinetic-bass-pulse-text';
  const effectIdPrefix = params.effectId || 'kinetic-bass';

  // Calculate effect parameters
  const duration = params.duration || 30;
  const scaleRange = params.maxScale - params.minScale;
  const brightnessRange = params.maxBrightness - params.minBrightness;

  // Create multi-layer text shadow for glow effect
  const createGlowShadow = (intensity: number): string => {
    const layers = [
      `0 0 ${params.minBlurRadius}px ${params.glowColor}`,
      `0 0 ${params.minBlurRadius * 2}px ${params.glowColor}`,
      `0 0 ${params.minBlurRadius * 3}px ${params.glowColor}`,
    ];
    return layers.join(', ');
  };

  // TextAtom data
  const textData: TextAtomData = {
    text: params.text,
    style: {
      fontSize: params.fontSize,
      color: params.textColor,
      ...fontStyle,
      textShadow: createGlowShadow(params.baseGlowIntensity),
    },
    font: {
      family: fontFamily,
      ...(fontStyle.fontWeight
        ? { weights: [fontStyle.fontWeight.toString()] }
        : {}),
    },
  };

  // Effects array
  const effects = [];

  // 1. Fade-in effect
  const fadeInEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: params.fadeInDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  effects.push({
    id: `${effectIdPrefix}-fade-in`,
    componentId: 'generic',
    data: fadeInEffect,
  });

  // 2. Bass-reactive scale effect
  const scaleEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    intensity: scaleRange,
    baseScale: params.minScale,
    sensitivity: params.sensitivity,
    threshold: params.threshold,
    smoothing: params.smoothing,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [textId],
    start: 0,
    duration: duration,
    smoothNormalisation: 1,
  };

  effects.push({
    id: `${effectIdPrefix}-bass-scale`,
    componentId: 'waveform',
    data: scaleEffect,
  });

  // 3. Bass-reactive brightness effect
  const brightnessEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'exposure',
    intensity: brightnessRange,
    baseBrightness: params.minBrightness,
    sensitivity: params.sensitivity,
    threshold: params.threshold,
    smoothing: params.smoothing,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [textId],
    start: 0,
    duration: duration,
    smoothNormalisation: 1,
  };

  effects.push({
    id: `${effectIdPrefix}-bass-brightness`,
    componentId: 'waveform',
    data: brightnessEffect,
  });

  // 4. Continuous rotation effect (subtle breathing motion)
  const rotationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.rotationDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'rotate', val: -params.rotationAngle, prog: 0 },
      { key: 'rotate', val: params.rotationAngle, prog: 0.5 },
      { key: 'rotate', val: -params.rotationAngle, prog: 1 },
    ],
  };

  effects.push({
    id: `${effectIdPrefix}-rotation`,
    componentId: 'generic',
    data: rotationEffect,
  });

  // Text component
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: textData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: effects,
    childrenData: [textComponent] as RenderableComponentData[],
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
  id: 'kinetic-typography-bass-pulse',
  title: 'Audio-Reactive Kinetic Typography with Bass Pulse',
  description:
    'Kinetic typography preset where text pulses and glows in sync with bass frequencies. Features neon-like multi-layer glow effects that intensify with bass hits, rhythmic character scaling, smooth fade-in transitions, and continuous breathing animations. Designed for club VJ visualizations where typography energy matches audio energy in real-time.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'audio-reactive',
    'bass',
    'pulse',
    'glow',
    'neon',
    'club',
    'vj',
    'music',
    'dynamic',
    'text',
    'waveform',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BASS DROP',
    audioSrc: 'https://example.com/audio.mp3',
    font: 'Inter:700:normal',
    fontSize: 96,
    textColor: '#ffffff',
    glowColor: '#00ffff',
    baseGlowIntensity: 0.6,
    minBlurRadius: 10,
    maxBlurRadius: 30,
    sensitivity: 0.8,
    threshold: 0.3,
    smoothing: 0.5,
    minScale: 1.0,
    maxScale: 1.2,
    minBrightness: 1.0,
    maxBrightness: 1.5,
    fadeInDuration: 1,
    rotationDuration: 20,
    rotationAngle: 5,
    duration: 30,
  },
};

export const kineticTypographyBassPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
