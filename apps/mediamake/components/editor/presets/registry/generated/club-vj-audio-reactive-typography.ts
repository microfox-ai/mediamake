/**
 * Club VJ Kinetic Typography - Audio Reactive Preset
 *
 * A kinetic typography preset inspired by club VJ visuals where text opacity reacts to different
 * frequency bands of the audio. Features large titles reacting to bass (20-250Hz), body text to
 * mids (250-4000Hz), and accent text to highs (4000-20000Hz) with synchronized glow effects for
 * that neon club aesthetic on a dark nightclub screen.
 *
 * Technical Implementation:
 * - Structure: BaseLayout with absolute positioning and black background
 * - Typography: TextAtom with custom Inter fonts (900 weight for titles, 400 for body)
 * - Effects: Three separate waveform effects for bass, mid, and high frequencies
 * - Audio Reactivity: Bass effect (sharp/punchy), mid effect (smooth), high effect (flickering)
 * - Visual Enhancement: Synchronized glow effects that intensify with opacity changes
 * - Layering: Grid-based layout with z-index layering (z-10, z-20, z-30)
 * - Performance: CSS containment for optimized rendering
 *
 * Use Cases:
 * - Nightclub visuals and VJ screens
 * - Electronic music visualizations
 * - Techno/house/EDM video content
 * - Audio-reactive typography animations
 * - Club event promotional videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { WaveformEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for audio reactivity'),

  // Text content
  bassText: z
    .string()
    .default('BASS DRIVEN')
    .describe('Large title text that reacts to bass frequencies'),
  midText: z
    .string()
    .default('Melodic Flow')
    .describe('Body text that reacts to mid-range frequencies'),
  highText: z
    .string()
    .default('HI-FREQ SPARK')
    .describe('Accent text that reacts to high frequencies'),

  // Bass text configuration
  bassFontSize: z
    .number()
    .min(48)
    .max(200)
    .default(96)
    .describe('Font size for bass-reactive title text (px)'),
  bassLetterSpacing: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Letter spacing for bass text (em)'),
  bassZIndex: z.number().default(10).describe('Z-index for bass text layer'),

  // Mid text configuration
  midFontSize: z
    .number()
    .min(24)
    .max(96)
    .default(48)
    .describe('Font size for mid-reactive body text (px)'),
  midLetterSpacing: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.03)
    .describe('Letter spacing for mid text (em)'),
  midZIndex: z.number().default(20).describe('Z-index for mid text layer'),
  midTopPadding: z
    .number()
    .default(200)
    .describe('Top padding offset for mid text (px)'),

  // High text configuration
  highFontSize: z
    .number()
    .min(16)
    .max(64)
    .default(32)
    .describe('Font size for high-reactive accent text (px)'),
  highLetterSpacing: z
    .number()
    .min(0)
    .max(0.15)
    .default(0.08)
    .describe('Letter spacing for high text (em)'),
  highZIndex: z.number().default(30).describe('Z-index for high text layer'),
  highBottomPadding: z
    .number()
    .default(40)
    .describe('Bottom and right padding offset for high text (px)'),

  // Bass effect configuration
  bassSensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.0)
    .describe('Sensitivity multiplier for bass effect'),
  bassThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Minimum value to trigger bass effect (sharp/punchy)'),
  bassIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.0)
    .describe('Intensity multiplier for bass opacity changes'),

  // Mid effect configuration
  midSensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.7)
    .describe('Sensitivity multiplier for mid effect (smooth)'),
  midThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Minimum value to trigger mid effect'),
  midIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.8)
    .describe('Intensity multiplier for mid opacity changes'),

  // High effect configuration
  highSensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.9)
    .describe('Sensitivity multiplier for high effect'),
  highThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Minimum value to trigger high effect'),
  highSmoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.05)
    .describe('Smoothing factor for high effect (low = flickering)'),
  highIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.2)
    .describe('Intensity multiplier for high opacity changes (flickering)'),

  // Global settings
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color for all text elements'),
  glowColor: z
    .string()
    .default('rgba(255,255,255,var(--opacity))')
    .describe('Glow color for drop shadow effect'),
  glowBlurRadius: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Blur radius for glow effect (px)'),

  duration: z
    .number()
    .optional()
    .describe('Duration in seconds (optional, defaults to audio duration)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    audioSrc,
    bassText,
    midText,
    highText,
    bassFontSize,
    bassLetterSpacing,
    bassZIndex,
    midFontSize,
    midLetterSpacing,
    midZIndex,
    midTopPadding,
    highFontSize,
    highLetterSpacing,
    highZIndex,
    highBottomPadding,
    bassSensitivity,
    bassThreshold,
    bassIntensity,
    midSensitivity,
    midThreshold,
    midIntensity,
    highSensitivity,
    highThreshold,
    highSmoothing,
    highIntensity,
    textColor,
    glowColor,
    glowBlurRadius,
    duration,
  } = params;

  // Component IDs
  const rootContainerId = 'club-vj-root-container';
  const bassLayerId = 'club-vj-bass-layer';
  const bassTextId = 'club-vj-bass-text';
  const midLayerId = 'club-vj-mid-layer';
  const midTextId = 'club-vj-mid-text';
  const highLayerId = 'club-vj-high-layer';
  const highTextId = 'club-vj-high-text';

  // Bass waveform effect (sharp and punchy - reacts to low frequencies)
  const bassEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'exposure', // Controls opacity via brightness
    intensity: bassIntensity,
    baseBrightness: 0.3, // Low baseline opacity
    sensitivity: bassSensitivity,
    threshold: bassThreshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [bassTextId],
    start: 0,
    smoothNormalisation: 0, // No smoothing for sharp/punchy effect
  };

  // Mid waveform effect (smooth - reacts to mid-range frequencies)
  const midEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'mid',
    effectType: 'exposure',
    intensity: midIntensity,
    baseBrightness: 0.4, // Medium baseline opacity
    sensitivity: midSensitivity,
    threshold: midThreshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [midTextId],
    start: 0,
    smoothNormalisation: 1, // Default smoothing for smooth effect
  };

  // High waveform effect (flickering - reacts to high frequencies)
  const highEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'treble',
    effectType: 'exposure',
    intensity: highIntensity,
    baseBrightness: 0.2, // Low baseline opacity for dramatic flicker
    sensitivity: highSensitivity,
    threshold: highThreshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [highTextId],
    start: 0,
    smoothNormalisation: highSmoothing, // Low smoothing for flicker effect
  };

  // Bass text atom (large titles)
  const bassTextAtom = {
    id: bassTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: bassText,
      className: 'text-white',
      style: {
        fontSize: `${bassFontSize}px`,
        fontWeight: '900',
        letterSpacing: `${bassLetterSpacing}em`,
        textTransform: 'uppercase' as const,
        filter: `drop-shadow(0 0 ${glowBlurRadius}px ${glowColor})`,
      },
      font: {
        family: 'Inter',
        weights: ['900'],
        display: 'swap' as const,
        preload: true,
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Mid text atom (body text)
  const midTextAtom = {
    id: midTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: midText,
      className: 'text-white',
      style: {
        fontSize: `${midFontSize}px`,
        fontWeight: '400',
        letterSpacing: `${midLetterSpacing}em`,
        filter: `drop-shadow(0 0 ${glowBlurRadius}px ${glowColor})`,
      },
      font: {
        family: 'Inter',
        weights: ['400'],
        display: 'swap' as const,
        preload: true,
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // High text atom (accent text)
  const highTextAtom = {
    id: highTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: highText,
      className: 'text-white',
      style: {
        fontSize: `${highFontSize}px`,
        fontWeight: '700',
        letterSpacing: `${highLetterSpacing}em`,
        textTransform: 'uppercase' as const,
        filter: `drop-shadow(0 0 ${glowBlurRadius}px ${glowColor})`,
      },
      font: {
        family: 'Inter',
        weights: ['700'],
        display: 'swap' as const,
        preload: true,
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Bass layer container
  const bassLayerContainer = {
    id: bassLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-1 place-items-center',
        style: {
          zIndex: bassZIndex,
          contain: 'paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'bass-waveform-effect',
        componentId: 'waveform',
        data: bassEffect,
      },
    ],
    childrenData: [bassTextAtom],
  };

  // Mid layer container
  const midLayerContainer = {
    id: midLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-1 place-items-center',
        style: {
          zIndex: midZIndex,
          contain: 'paint',
          paddingTop: `${midTopPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'mid-waveform-effect',
        componentId: 'waveform',
        data: midEffect,
      },
    ],
    childrenData: [midTextAtom],
  };

  // High layer container
  const highLayerContainer = {
    id: highLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-end justify-end',
        style: {
          zIndex: highZIndex,
          contain: 'paint',
          padding: `${highBottomPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'high-waveform-effect',
        componentId: 'waveform',
        data: highEffect,
      },
    ],
    childrenData: [highTextAtom],
  };

  // Root container
  const rootContainer = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      bassLayerContainer,
      midLayerContainer,
      highLayerContainer,
    ] as RenderableComponentData[],
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
  id: 'club-vj-audio-reactive-typography',
  title: 'Club VJ Kinetic Typography - Audio Reactive',
  description:
    'Kinetic typography preset inspired by club VJ visuals where text opacity reacts to different frequency bands of the audio. Features large titles reacting to bass (20-250Hz), body text to mids (250-4000Hz), and accent text to highs (4000-20000Hz) with synchronized glow effects for that neon club aesthetic on a dark nightclub screen.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'audio-reactive',
    'club',
    'vj',
    'nightclub',
    'bass',
    'frequency',
    'neon',
    'glow',
    'waveform',
    'electronic',
    'edm',
    'techno',
  ],
  dependencies: {},
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    bassText: 'BASS DRIVEN',
    midText: 'Melodic Flow',
    highText: 'HI-FREQ SPARK',
    bassFontSize: 96,
    bassLetterSpacing: 0.05,
    bassZIndex: 10,
    midFontSize: 48,
    midLetterSpacing: 0.03,
    midZIndex: 20,
    midTopPadding: 200,
    highFontSize: 32,
    highLetterSpacing: 0.08,
    highZIndex: 30,
    highBottomPadding: 40,
    bassSensitivity: 1.0,
    bassThreshold: 0.6,
    bassIntensity: 1.0,
    midSensitivity: 0.7,
    midThreshold: 0.3,
    midIntensity: 0.8,
    highSensitivity: 0.9,
    highThreshold: 0.4,
    highSmoothing: 0.05,
    highIntensity: 1.2,
    textColor: '#FFFFFF',
    glowColor: 'rgba(255,255,255,var(--opacity))',
    glowBlurRadius: 20,
  },
};

// Export preset
export const clubVjAudioReactiveTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
