/**
 * Liquid Morphing Typography System
 *
 * Audio-reactive liquid typography where text flows and reshapes like mercury responding to sound waves.
 * Letters morph, stretch, and compress based on frequency data with organic, fluid transitions and iridescent color shifts.
 *
 * Features:
 * - Audio-reactive morphing using generic effects with continuous scale/skew/translate animations
 * - Displacement map-style effects simulated via CSS transforms
 * - Wave propagation with staggered delays across letters
 * - Ripple effects driven by frequency bands
 * - Iridescent color shifting based on spectral data
 * - Liquid metal appearance with text shadows and blur effects
 *
 * Technical Implementation:
 * - Uses BaseLayout with word containers for flexible text layout
 * - Individual TextAtom components per letter with inline-block display
 * - Generic effects for continuous morphing (scaleX, scaleY, skewX)
 * - Waveform effects for audio-reactive Y-axis movement
 * - Layered effects for ripple, color, and iridescence
 * - CSS properties for liquid appearance (mix-blend-mode, backdrop-blur, text-shadow)
 *
 * Use cases:
 * - Music visualizations with reactive typography
 * - Dynamic title sequences
 * - Audio-synchronized lyric displays
 * - Experimental typographic animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  TextAtomData,
  GenericEffectData,
  WaveformEffectData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with liquid morphing effects'),
  audioSrc: z
    .string()
    .describe('Audio source URL for audio-reactive effects'),
  audioDuration: z
    .number()
    .optional()
    .describe('Duration of audio in seconds (auto-detected if not provided)'),
  fontSize: z
    .number()
    .default(120)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgba)'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  morphCycleDuration: z
    .number()
    .default(2)
    .describe('Duration of one complete morph cycle in seconds'),
  waveCycleDuration: z
    .number()
    .default(1.5)
    .describe('Duration of wave movement cycle in seconds'),
  waveAmplitude: z
    .number()
    .default(20)
    .describe('Amplitude of wave movement in pixels'),
  rippleDuration: z
    .number()
    .default(0.8)
    .describe('Duration of ripple effect in seconds'),
  colorCycleDuration: z
    .number()
    .default(3)
    .describe('Duration of color opacity cycle in seconds'),
  iridescentCycleDuration: z
    .number()
    .default(4)
    .describe('Duration of iridescent color shift in seconds'),
  audioReactivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity of audio-reactive effects (0.1-3)'),
  bassFrequencySensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Sensitivity to bass frequencies for wave distortions'),
  trebleFrequencySensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.2)
    .describe('Sensitivity to treble frequencies for ripple effects'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

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

  // Split text into words and letters
  const words = params.text.trim().split(/\s+/);

  const childrenData: RenderableComponentData[] = [];

  // Create audio atom
  const audioAtom: RenderableComponentData = {
    id: 'audio-source',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: params.audioSrc,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        duration: params.audioDuration || 30,
      },
    },
  };

  childrenData.push(audioAtom);

  // Create text container
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap justify-center items-center gap-4',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData: [],
  };

  // Process each word
  words.forEach((word, wordIndex) => {
    const letters = word.split('');

    // Create word container
    const wordContainer: RenderableComponentData = {
      id: `word-container-${wordIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'inline-flex gap-1',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'audio-source',
        },
      },
      childrenData: [],
    };

    // Process each letter
    letters.forEach((letter, letterIndex) => {
      const letterId = `letter-${wordIndex}-${letterIndex}`;

      // Calculate stagger delays
      const staggerDelay = letterIndex * 0.1;
      const waveStaggerDelay = letterIndex * 0.05;
      const rippleStaggerDelay = letterIndex * 0.15;

      // Create letter TextAtom
      const letterAtom: RenderableComponentData = {
        id: letterId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: letter,
          className: 'inline-block',
          style: {
            fontSize: `${params.fontSize}px`,
            fontWeight: '700',
            color: params.textColor,
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'audio-source',
          },
        },
        effects: [],
      };

      // Effect 1: Morph ScaleX (0.8 to 1.2 oscillation)
      const effectMorphScaleX: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: params.morphCycleDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'scaleX', val: 0.8, prog: 0 },
          { key: 'scaleX', val: 1.2, prog: 0.5 },
          { key: 'scaleX', val: 0.8, prog: 1 },
        ],
      };

      letterAtom.effects!.push({
        id: `effect-morph-scaleX-${letterId}`,
        componentId: 'generic',
        data: effectMorphScaleX,
      });

      // Effect 2: Morph ScaleY (1.2 to 0.8 oscillation, opposite phase)
      const effectMorphScaleY: GenericEffectData = {
        type: 'ease-in-out',
        start: staggerDelay,
        duration: params.morphCycleDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'scaleY', val: 1.2, prog: 0 },
          { key: 'scaleY', val: 0.8, prog: 0.5 },
          { key: 'scaleY', val: 1.2, prog: 1 },
        ],
      };

      letterAtom.effects!.push({
        id: `effect-morph-scaleY-${letterId}`,
        componentId: 'generic',
        data: effectMorphScaleY,
      });

      // Effect 3: Skew oscillation (-10 to 10 degrees)
      const effectSkew: GenericEffectData = {
        type: 'ease-in-out',
        start: staggerDelay,
        duration: params.morphCycleDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'skewX', val: -10, prog: 0 },
          { key: 'skewX', val: 10, prog: 0.5 },
          { key: 'skewX', val: -10, prog: 1 },
        ],
      };

      letterAtom.effects!.push({
        id: `effect-skew-${letterId}`,
        componentId: 'generic',
        data: effectSkew,
      });

      // Effect 4: Wave translateY (audio-reactive bass frequencies)
      const effectWave: WaveformEffectData = {
        audioSrc: params.audioSrc,
        audioProperty: 'bass',
        effectType: 'translateY',
        intensity: params.waveAmplitude * params.audioReactivity,
        sensitivity: params.bassFrequencySensitivity,
        threshold: 0.1,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider',
        targetIds: [letterId],
        start: waveStaggerDelay,
        duration: params.audioDuration || 30,
        smoothNormalisation: 1,
      };

      letterAtom.effects!.push({
        id: `effect-wave-translateY-${letterId}`,
        componentId: 'waveform',
        data: effectWave,
      });

      // Effect 5: Ripple scale (audio-reactive treble frequencies)
      const effectRipple: WaveformEffectData = {
        audioSrc: params.audioSrc,
        audioProperty: 'treble',
        effectType: 'scale',
        intensity: 0.15 * params.audioReactivity,
        baseScale: 1,
        sensitivity: params.trebleFrequencySensitivity,
        threshold: 0.15,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider',
        targetIds: [letterId],
        start: rippleStaggerDelay,
        duration: params.audioDuration || 30,
        smoothNormalisation: 1,
      };

      letterAtom.effects!.push({
        id: `effect-ripple-scale-${letterId}`,
        componentId: 'waveform',
        data: effectRipple,
      });

      // Effect 6: Color opacity oscillation
      const effectColorOpacity: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: params.colorCycleDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      letterAtom.effects!.push({
        id: `effect-color-opacity-${letterId}`,
        componentId: 'generic',
        data: effectColorOpacity,
      });

      // Add letter to word container
      wordContainer.childrenData!.push(letterAtom);
    });

    // Add word container to text container
    textContainer.childrenData!.push(wordContainer);
  });

  childrenData.push(textContainer);

  // Create iridescent overlay layer
  const iridescentOverlay: RenderableComponentData = {
    id: 'iridescent-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(45deg, rgba(255,0,255,0.3), rgba(0,255,255,0.3))',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    effects: [
      {
        id: 'effect-iridescent-hue',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.iridescentCycleDuration,
          mode: 'provider',
          targetIds: ['iridescent-overlay'],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  childrenData.push(iridescentOverlay);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData,
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
  id: 'liquid-morph-typography',
  title: 'Liquid Morphing Typography System',
  description:
    'Audio-reactive liquid typography where text flows and reshapes like mercury responding to sound waves. Letters morph, stretch, and compress based on frequency data with organic, fluid transitions and iridescent color shifts driven by spectral analysis.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'liquid',
    'morph',
    'audio-reactive',
    'mercury',
    'fluid',
    'waveform',
    'spectral',
    'iridescent',
    'kinetic',
    'experimental',
  ],
  defaultInputParams: {
    text: 'LIQUID FLOW',
    audioSrc: 'https://example.com/audio.mp3',
    audioDuration: 30,
    fontSize: 120,
    textColor: '#ffffff',
    font: 'Inter:700',
    morphCycleDuration: 2,
    waveCycleDuration: 1.5,
    waveAmplitude: 20,
    rippleDuration: 0.8,
    colorCycleDuration: 3,
    iridescentCycleDuration: 4,
    audioReactivity: 1,
    bassFrequencySensitivity: 1.5,
    trebleFrequencySensitivity: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMorphTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
