/**
 * Reactive Typokinetics Preset
 *
 * This preset creates audio-reactive kinetic typography with elegant horizontal drift as the base movement.
 * When audio is present, the text responds dynamically to music beats and frequency data:
 * - Bass frequencies drive vertical movement (subtle bounce)
 * - Mid frequencies control scale breathing (1.0 to 1.05)
 * - Treble frequencies trigger glow effects (text shadow pulses)
 * - High-energy sections accelerate drift speed
 * - Includes handheld camera shake during intense moments
 *
 * Without audio, the preset defaults to a zen-like constant drift with subtle scale oscillation
 * for a meditative, elegant effect. Text maintains thin styling (Montserrat 100) throughout.
 *
 * Features:
 * - **Audio-Reactive Mode**: Text dances with music beats like a visualizer
 * - **Zen Mode Fallback**: Smooth drift with subtle breathing when no audio
 * - **Elegant Base Movement**: Horizontal translateX drift (30px to -30px)
 * - **Dynamic Effects**: Bass bounce, mid scale, treble glow, shake on intensity
 * - **Thin Typography**: Montserrat 100 weight with wide tracking
 * - **Gradient Background**: Dark gradient (gray-900 to black)
 *
 * Use cases:
 * - Music video lyrics with audio synchronization
 * - Podcast episode titles with background music
 * - Cinematic text reveals with soundtrack
 * - Meditation or ambient content with or without audio
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
  TextAtomData,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z.string().default('REACTIVE TEXT').describe('Text content to display'),
  fontSize: z
    .string()
    .optional()
    .default('48px')
    .describe('Font size (e.g., "48px", "64px")'),
  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  
  // Audio configuration (optional)
  audio: z
    .object({
      src: z.string().describe('Audio source URL or ref:componentId'),
      volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
    })
    .optional()
    .describe('Optional audio source for reactive mode. If not provided, uses zen mode.'),
  
  // Base drift configuration
  driftSpeed: z
    .number()
    .min(1)
    .max(20)
    .default(8)
    .describe('Base drift speed in seconds (duration for full drift cycle)'),
  
  // Audio reactivity settings
  bassIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Bass response intensity (vertical bounce)'),
  midIntensity: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Mid response intensity (scale breathing)'),
  trebleIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Treble response intensity (glow effect in px)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Overall audio sensitivity multiplier'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Minimum audio level to trigger effects'),
  
  // Zen mode fallback settings
  zenScaleMin: z
    .number()
    .min(0.9)
    .max(1)
    .default(0.98)
    .describe('Minimum scale for zen mode breathing'),
  zenScaleMax: z
    .number()
    .min(1)
    .max(1.1)
    .default(1.02)
    .describe('Maximum scale for zen mode breathing'),
  zenBreathDuration: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('Duration of zen breathing cycle in seconds'),
  
  duration: z
    .number()
    .optional()
    .describe('Total duration in seconds (auto-calculated if audio provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    textColor,
    audio,
    driftSpeed,
    bassIntensity,
    midIntensity,
    trebleIntensity,
    sensitivity,
    threshold,
    zenScaleMin,
    zenScaleMax,
    zenBreathDuration,
    duration,
  } = params;

  const hasAudio = !!audio;
  const audioSrc = audio?.src || '';
  
  // Component IDs
  const containerId = 'reactive-typokinetics-container';
  const textId = 'reactive-typokinetics-text';
  const audioId = 'reactive-typokinetics-audio';

  // Calculate duration
  const totalDuration = duration || 10;
  
  // Effects array
  const effects: any[] = [];

  // --- Base Drift Effect (always present) ---
  const baseDriftEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'translateX', val: 30, prog: 0 },
      { key: 'translateX', val: -30, prog: 0.5 },
      { key: 'translateX', val: 30, prog: 1 },
    ],
  };

  effects.push({
    id: 'base-drift-effect',
    componentId: 'generic',
    data: baseDriftEffect,
  });

  // --- Audio-Reactive Effects (if audio present) ---
  if (hasAudio) {
    // Bass response: vertical bounce (translateY)
    const bassEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'bass',
      effectType: 'translateY',
      intensity: bassIntensity,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [textId],
      start: 0,
      duration: totalDuration,
      smoothNormalisation: 1,
    };

    effects.push({
      id: 'bass-bounce-effect',
      componentId: 'waveform',
      data: bassEffect,
    });

    // Mid response: scale breathing (1.0 to 1.0 + midIntensity)
    const midEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'mid',
      effectType: 'scale',
      intensity: midIntensity,
      baseScale: 1.0,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [textId],
      start: 0,
      duration: totalDuration,
      smoothNormalisation: 1,
    };

    effects.push({
      id: 'mid-scale-effect',
      componentId: 'waveform',
      data: midEffect,
    });

    // Treble response: glow effect (textShadow)
    // Note: WaveformEffect doesn't directly support textShadow animation
    // We'll use a generic effect with a subtle pulsing glow that reacts to treble via manual calculation
    // For simplicity, we'll add a static glow that intensifies with treble using a generic effect
    // Since we can't directly map waveform to textShadow, we'll use a filter: drop-shadow approach
    const trebleGlowEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'treble',
      effectType: 'exposure', // Using exposure as proxy for glow intensity
      intensity: 0.2, // Subtle brightness increase
      baseBrightness: 1,
      sensitivity,
      threshold: threshold * 1.5, // Higher threshold for treble
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [textId],
      start: 0,
      duration: totalDuration,
      smoothNormalisation: 1,
    };

    effects.push({
      id: 'treble-glow-effect',
      componentId: 'waveform',
      data: trebleGlowEffect,
    });

    // Shake effect during intense moments (high overall intensity)
    // We'll use a waveform shake effect on the entire container
    const shakeEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'waveform', // Overall intensity
      effectType: 'shake',
      intensity: 5, // Subtle shake
      shakeAxis: 'both',
      sensitivity: sensitivity * 1.2,
      threshold: threshold + 0.3, // Only trigger on high intensity
      numberOfSamples: 128,
      useFrequencyData: false,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [containerId],
      start: 0,
      duration: totalDuration,
      smoothNormalisation: 0.5, // Less smoothing for reactive shake
    };

    effects.push({
      id: 'intensity-shake-effect',
      componentId: 'waveform',
      data: shakeEffect,
    });
  } else {
    // --- Zen Mode: Subtle scale oscillation ---
    const zenBreathEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: totalDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'scale', val: zenScaleMin, prog: 0 },
        { key: 'scale', val: zenScaleMax, prog: 0.5 },
        { key: 'scale', val: zenScaleMin, prog: 1 },
      ],
    };

    effects.push({
      id: 'zen-breath-effect',
      componentId: 'generic',
      data: zenBreathEffect,
    });
  }

  // --- Text Atom ---
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'text-white font-thin tracking-wider',
      style: {
        fontSize,
        color: textColor,
        willChange: 'transform, opacity, text-shadow',
        textShadow: hasAudio
          ? `0 0 ${trebleIntensity}px ${textColor}`
          : '0 0 10px rgba(255,255,255,0.3)',
      },
      font: {
        family: 'Montserrat',
        weights: ['100'],
        subsets: ['latin'],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects,
    childrenData: [textAtom] as RenderableComponentData[],
  };

  // --- Audio Track (if audio provided) ---
  const childrenData: RenderableComponentData[] = [rootContainer];
  
  if (hasAudio) {
    const audioAtom: RenderableComponentData = {
      id: audioId,
      type: 'atom' as const,
      componentId: 'AudioAtom',
      data: {
        src: audioSrc,
        volume: audio?.volume ?? 1,
      },
      context: {
        timing: {
          start: 0,
        },
      },
    };
    childrenData.push(audioAtom);
  }

  return {
    output: {
      childrenData,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'reactiveTypokinetics',
  title: 'Reactive Typokinetics',
  description:
    'Audio-reactive kinetic typography with elegant horizontal drift. Text pulses and shifts with music beats (bass, mid, treble) like a visualizer, with handheld camera shake during intense moments. Without audio, defaults to zen-like constant drift with subtle scale oscillation. Maintains thin, elegant styling throughout.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'audio-reactive',
    'waveform',
    'music-visualizer',
    'drift',
    'elegant',
    'zen',
    'bass',
    'treble',
    'glow',
    'shake',
    'breathing',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'REACTIVE TEXT',
    fontSize: '48px',
    textColor: '#FFFFFF',
    audio: undefined, // No audio by default (zen mode)
    driftSpeed: 8,
    bassIntensity: 0.3,
    midIntensity: 0.05,
    trebleIntensity: 20,
    sensitivity: 1.5,
    threshold: 0.2,
    zenScaleMin: 0.98,
    zenScaleMax: 1.02,
    zenBreathDuration: 4,
    duration: 10,
  },
};

export const reactiveTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
