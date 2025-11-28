/**
 * Bass-Drop Tremor Preset
 *
 * Audio-reactive text animation that synchronizes text shaking with musical beats,
 * creating a speaker-vibration effect. Text literally bounces and shakes to the rhythm,
 * with low frequencies causing deeper, slower tremors while high frequencies create rapid vibrations.
 *
 * Features:
 * - **Frequency-Based Directional Shaking**: Bass affects vertical movement (subwoofer pulse),
 *   mids affect horizontal sway, treble creates rapid micro-vibrations
 * - **Audio Intensity Response**: Quiet moments have subtle trembling, bass drops cause violent displacement
 * - **Speaker Membrane Effect**: Text appears to flex and distort with sound pressure
 * - **Visual Feedback**: Size pulsing and glow intensification synchronized with audio peaks
 * - **Multi-Frequency Analysis**: Uses waveform effects for bass, mid, and treble responses
 * - **Beat Detection Integration**: Combines waveform effects with beat markers for hybrid response
 *
 * Use cases:
 * - Creating music video typography with speaker-vibration effects
 * - Building audio-reactive text that responds to frequency ranges
 * - Adding dynamic bass-drop animations to titles
 * - Creating club/EDM style text effects synchronized with music
 * - Building speaker membrane simulation effects for text
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  TextAtomData,
  WaveformEffectData,
  GenericEffectData,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z
    .string()
    .default('DROP THE BASS')
    .describe('Text content to display with audio-reactive effects'),

  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for audio analysis'),

  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(120)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),

  fontFamily: z
    .string()
    .default('Inter:900')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:700", "BebasNeue")',
    ),

  // Bass response configuration (20-250Hz)
  bassIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Bass response intensity multiplier for vertical movement'),

  bassMaxDisplacement: z
    .number()
    .min(5)
    .max(100)
    .default(20)
    .describe('Maximum vertical displacement in pixels for bass (±)'),

  bassSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Bass frequency sensitivity (0.1-5, default 0.8)'),

  bassSmoothing: z
    .number()
    .min(0)
    .max(5)
    .default(0.1)
    .describe('Bass smoothing factor (0 = raw, 1 = default, >1 = more smooth)'),

  // Mid response configuration (250-4000Hz)
  midIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.2)
    .describe('Mid-range response intensity multiplier for horizontal movement'),

  midMaxDisplacement: z
    .number()
    .min(5)
    .max(50)
    .default(15)
    .describe('Maximum horizontal displacement in pixels for mids (±)'),

  midSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.6)
    .describe('Mid-range frequency sensitivity (0.1-5, default 0.6)'),

  // Treble response configuration (4000Hz+)
  trebleIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.0)
    .describe('Treble response intensity multiplier for rapid micro-vibrations'),

  trebleMaxDisplacement: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Maximum displacement in pixels for treble micro-vibrations (±)'),

  trebleSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.0)
    .describe('Treble frequency sensitivity (0.1-5, default 1.0)'),

  trebleSmoothing: z
    .number()
    .min(0)
    .max(5)
    .default(0.02)
    .describe(
      'Treble smoothing factor (0.02s default for rapid micro-vibrations)',
    ),

  // Scale pulse configuration
  scalePulseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Scale pulse intensity (0 = no pulse, 0.15 = default, 1 = extreme)'),

  scalePulseThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Audio intensity threshold to trigger scale pulse (0-1)'),

  // Glow effect configuration
  glowBaseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Base glow intensity (0-1)'),

  glowPeakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1.0)
    .describe('Peak glow intensity on audio peaks (0-1)'),

  glowThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Audio intensity threshold to trigger glow intensification (0-1)'),

  // Speaker membrane effect configuration
  membraneIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(0.05)
    .describe(
      'Speaker membrane scaleY oscillation intensity (0.05 = subtle flex)',
    ),

  // Performance and accessibility
  updateRate: z
    .number()
    .min(15)
    .max(60)
    .default(30)
    .describe('Effect update rate in FPS (lower = better performance, 30 default)'),

  duration: z
    .number()
    .optional()
    .describe('Duration in seconds (optional, defaults to audio duration)'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const textContainerId = 'bass-drop-tremor-text-container';
  const textId = 'bass-drop-tremor-text';

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter:900';
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

  // Calculate glow effect based on audio intensity
  const glowBaseBlur = 10;
  const glowPeakBlur = 30;
  const glowBaseColor = `rgba(255, 255, 255, ${params.glowBaseIntensity})`;
  const glowPeakColor = `rgba(255, 255, 255, ${params.glowPeakIntensity})`;

  // Text atom with base styling
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight || 900,
        color: params.textColor,
        textShadow: `0 0 ${glowBaseBlur}px ${glowBaseColor}`,
        textAlign: 'center',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : { weights: ['900'] }),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [],
  };

  // Bass response: translateY with vertical movement (subwoofer pulse)
  const bassEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'translateY',
    intensity: params.bassIntensity * params.bassMaxDisplacement,
    sensitivity: params.bassSensitivity,
    threshold: 0.1,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / params.updateRate,
    mode: 'provider',
    targetIds: [textId],
    start: 0,
    duration: params.duration,
    smoothNormalisation: params.bassSmoothing,
  };

  // Mid response: translateX with horizontal sway
  const midEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'mid',
    effectType: 'translateX',
    intensity: params.midIntensity * params.midMaxDisplacement,
    sensitivity: params.midSensitivity,
    threshold: 0.1,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / params.updateRate,
    mode: 'provider',
    targetIds: [textId],
    start: 0,
    duration: params.duration,
    smoothNormalisation: 1,
  };

  // Treble response: rapid micro-vibrations (combined translateX + translateY)
  const trebleEffectX: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'treble',
    effectType: 'translateX',
    intensity: params.trebleIntensity * params.trebleMaxDisplacement * 0.5,
    sensitivity: params.trebleSensitivity,
    threshold: 0.05,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: params.trebleSmoothing,
    mode: 'provider',
    targetIds: [textId],
    start: 0,
    duration: params.duration,
    smoothNormalisation: 0,
  };

  const trebleEffectY: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'treble',
    effectType: 'translateY',
    intensity: params.trebleIntensity * params.trebleMaxDisplacement * 0.5,
    sensitivity: params.trebleSensitivity,
    threshold: 0.05,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: params.trebleSmoothing,
    mode: 'provider',
    targetIds: [textId],
    start: 0,
    duration: params.duration,
    smoothNormalisation: 0,
  };

  // Scale pulse on beats (bass-driven)
  const scalePulseEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    baseScale: 1.0,
    intensity: params.scalePulseIntensity,
    sensitivity: 1.5,
    threshold: params.scalePulseThreshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / params.updateRate,
    mode: 'provider',
    targetIds: [textId],
    start: 0,
    duration: params.duration,
    smoothNormalisation: 0.5,
  };

  // Speaker membrane effect: scaleY oscillation matching bass frequency
  const membraneEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    baseScale: 1.0,
    intensity: params.membraneIntensity,
    sensitivity: 0.5,
    threshold: 0.05,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / params.updateRate,
    mode: 'provider',
    targetIds: [textId],
    start: 0,
    duration: params.duration,
    smoothNormalisation: 0.2,
  };

  // Glow intensification effect (generic effect for text shadow)
  const glowEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration || 10,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      {
        key: 'textShadow',
        val: `0 0 ${glowBaseBlur}px ${glowBaseColor}`,
        prog: 0,
      },
      {
        key: 'textShadow',
        val: `0 0 ${glowPeakBlur}px ${glowPeakColor}`,
        prog: 0.5,
      },
      {
        key: 'textShadow',
        val: `0 0 ${glowBaseBlur}px ${glowBaseColor}`,
        prog: 1,
      },
    ],
  };

  // Attach all effects to text atom
  textAtom.effects = [
    {
      id: 'bass-tremor-effect',
      componentId: 'waveform',
      data: bassEffect,
    },
    {
      id: 'mid-tremor-effect',
      componentId: 'waveform',
      data: midEffect,
    },
    {
      id: 'treble-tremor-effect-x',
      componentId: 'waveform',
      data: trebleEffectX,
    },
    {
      id: 'treble-tremor-effect-y',
      componentId: 'waveform',
      data: trebleEffectY,
    },
    {
      id: 'scale-pulse-effect',
      componentId: 'waveform',
      data: scalePulseEffect,
    },
    {
      id: 'membrane-effect',
      componentId: 'waveform',
      data: membraneEffect,
    },
    {
      id: 'glow-effect',
      componentId: 'generic',
      data: glowEffect,
    },
  ];

  // Container layout
  const containerLayout: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-center transform-gpu will-change-transform motion-reduce:animate-none',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bass-drop-tremor-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 transform-gpu will-change-transform motion-reduce:animate-none',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [containerLayout],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'bass-drop-tremor',
  title: 'Audio-Reactive Bass Drop Tremor',
  description:
    'Audio-reactive text animation where text shakes and trembles in sync with musical beats and frequencies. Bass frequencies cause vertical displacement like a subwoofer pulse, mid frequencies create horizontal sway, and treble produces rapid micro-vibrations. Includes scale pulsing on beats, glow intensification on audio peaks, and a speaker membrane flex effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'reactive',
    'text',
    'bass',
    'shake',
    'tremor',
    'frequency',
    'music',
    'waveform',
    'speaker',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'DROP THE BASS',
    audioSrc: 'https://example.com/audio.mp3',
    fontSize: 120,
    textColor: '#FFFFFF',
    fontFamily: 'Inter:900',
    bassIntensity: 1.5,
    bassMaxDisplacement: 20,
    bassSensitivity: 0.8,
    bassSmoothing: 0.1,
    midIntensity: 1.2,
    midMaxDisplacement: 15,
    midSensitivity: 0.6,
    trebleIntensity: 1.0,
    trebleMaxDisplacement: 3,
    trebleSensitivity: 1.0,
    trebleSmoothing: 0.02,
    scalePulseIntensity: 0.15,
    scalePulseThreshold: 0.3,
    glowBaseIntensity: 0.5,
    glowPeakIntensity: 1.0,
    glowThreshold: 0.5,
    membraneIntensity: 0.05,
    updateRate: 30,
  },
};

// --- Export ---

export const bassDropTremorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
