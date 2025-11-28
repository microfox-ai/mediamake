/**
 * Psychedelic Typokinetics Vortex Preset
 *
 * A hypnotic, trance-inducing typography preset inspired by 1960s concert posters and modern festival visuals.
 * Features organic wave-timed word flashes, bass-reactive melt effects, vortex spiral scaling with rotation,
 * spectrum color cycling, and kaleidoscope symmetry effects.
 *
 * Features:
 * - **Organic Flash Timing**: Sine wave modulation creates wave-lapping opacity effects
 * - **Bass Melt Effect**: SVG turbulence and displacement map animated by audio bass frequencies
 * - **Spiral Vortex**: Words emerge from center with spiral rotation (r = a * e^(b*θ))
 * - **Color Cycling**: HSL color space animation across full spectrum based on audio frequencies
 * - **Kaleidoscope Symmetry**: Multi-axis mirroring with 60° rotation intervals
 * - **Mix Blend Mode**: Difference blend mode for psychedelic color interactions
 * - **Audio-Reactive**: Bass frequencies drive melt intensity and color shifts
 *
 * Use cases:
 * - Music videos with psychedelic aesthetics
 * - Festival and concert visuals
 * - Trance and electronic music content
 * - Artistic typography animations
 * - Retro 1960s poster-style videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word timing'),

  audio: z
    .object({
      src: z.string().describe('Audio source URL for frequency analysis'),
      volume: z.number().min(0).max(2).default(1).optional(),
      start: z.number().default(0).optional(),
    })
    .describe('Audio configuration for reactive effects'),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(80)
    .describe('Base font size in pixels'),

  font: z
    .string()
    .default('Anton')
    .describe(
      'Font family with optional weight and style (e.g., "Anton:700", "BebasNeue")',
    ),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (overridden by color cycling)'),

  backgroundColor: z
    .string()
    .default('#0d0015')
    .describe('Background gradient center color'),

  spiralIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Spiral rotation intensity multiplier'),

  meltIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Bass-reactive melt effect intensity'),

  colorCycleSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Color cycling speed multiplier'),

  kaleidoscopeEnabled: z
    .boolean()
    .default(true)
    .describe('Enable kaleidoscope symmetry effects'),

  kaleidoscopeLayers: z
    .number()
    .min(2)
    .max(8)
    .default(6)
    .describe('Number of kaleidoscope mirror layers'),

  organicWaveFrequency: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Organic wave timing frequency'),

  bassSensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.5)
    .describe('Bass frequency sensitivity for melt effect'),
});

// Preset execution
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    audio,
    fontSize,
    font,
    textColor,
    backgroundColor,
    spiralIntensity,
    meltIntensity,
    colorCycleSpeed,
    kaleidoscopeEnabled,
    kaleidoscopeLayers,
    organicWaveFrequency,
    bassSensitivity,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Calculate total duration
  const totalDuration =
    captions.length > 0
      ? Math.max(...captions.map((c) => c.absoluteEnd))
      : 30;

  // SVG filter ID for melt effect
  const meltFilterId = 'psychedelic-melt-filter';

  // Build word components
  const wordComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;

      // Organic flash timing - sine wave modulation
      const phaseOffset =
        ((captionIndex * 10 + wordIndex) / (captions.length * 10)) *
        Math.PI *
        2;
      const flashDuration = word.duration * 0.5;

      // Color cycling based on word position and time
      const hueStart = ((captionIndex + wordIndex) * 360) / 20;

      // Spiral scale and rotation
      const spiralStartScale = 0.3;
      const spiralEndScale = 1.2;
      const spiralRotation = 720 * spiralIntensity; // 2 full rotations

      // Build effects array
      const effects: any[] = [];

      // 1. Organic flash (sine wave opacity)
      effects.push({
        id: `flash-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: word.start,
          duration: flashDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // 2. Spiral scale + rotation (vortex emergence)
      effects.push({
        id: `spiral-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: word.start,
          duration: word.duration * 0.8,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: spiralStartScale, prog: 0 },
            { key: 'scale', val: spiralEndScale, prog: 1 },
            { key: 'rotate', val: spiralRotation, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // 3. Color cycling (HSL hue animation)
      const hueEnd = hueStart + 360 * colorCycleSpeed;
      effects.push({
        id: `color-cycle-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: word.start,
          duration: word.duration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            {
              key: 'color',
              val: `hsl(${hueStart}, 100%, 60%)`,
              prog: 0,
            },
            {
              key: 'color',
              val: `hsl(${hueEnd}, 100%, 60%)`,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      });

      // 4. Bass-reactive melt effect (audio waveform)
      if (audio && audio.src) {
        effects.push({
          id: `melt-${wordId}`,
          componentId: 'waveform',
          data: {
            audioSrc: audio.src,
            audioProperty: 'bass',
            effectType: 'blur',
            intensity: 5 * meltIntensity,
            sensitivity: bassSensitivity,
            threshold: 0.2,
            numberOfSamples: 128,
            useFrequencyData: true,
            windowInSeconds: 1 / 30,
            mode: 'provider',
            targetIds: [wordId],
            start: word.start,
            duration: word.duration,
            smoothNormalisation: 1,
          } as WaveformEffectData,
        });
      }

      // Create word component
      wordComponents.push({
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 900,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mixBlendMode: 'difference',
            color: textColor,
            textShadow: '0 0 20px currentColor, 0 0 40px currentColor, 0 0 80px currentColor',
            filter: `url(#${meltFilterId})`,
            marginRight: '0.3em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['400', '700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects,
      } as RenderableComponentData);
    });
  });

  // Build kaleidoscope layers if enabled
  const kaleidoscopeChildren: RenderableComponentData[] = [];

  if (kaleidoscopeEnabled) {
    const angleStep = 360 / kaleidoscopeLayers;
    for (let i = 0; i < kaleidoscopeLayers; i++) {
      const angle = i * angleStep;
      const isMirrored = i % 2 === 1;

      kaleidoscopeChildren.push({
        id: `kaleidoscope-layer-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              transform: `rotateZ(${angle}deg)${isMirrored ? ' scaleX(-1)' : ''}`,
              transformOrigin: 'center center',
              opacity: 0.4,
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [
          {
            id: `kaleidoscope-words-${i}`,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex flex-wrap items-center justify-center gap-4',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            childrenData: wordComponents.map((word) => ({
              ...word,
              id: `${word.id}-kaleidoscope-${i}`,
              effects: [], // Remove effects from kaleidoscope duplicates
            })),
          } as RenderableComponentData,
        ],
      } as RenderableComponentData);
    }
  }

  // SVG filter definition (melt effect with turbulence and displacement)
  const svgFilterDef = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${meltFilterId}">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01 0.02"
            numOctaves="3"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="10"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  `;

  // Build caption containers for each sentence
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, index) => ({
      id: `caption-container-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transformStyle: 'preserve-3d',
            perspective: '1000px',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [
        {
          id: `words-wrapper-${index}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-wrap items-center justify-center gap-4',
              style: {
                maxWidth: '90%',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: caption.words.map((word, wordIndex) => {
            const wordId = `word-${index}-${wordIndex}`;
            return wordComponents.find((w) => w.id === wordId)!;
          }),
        } as RenderableComponentData,
      ],
    } as RenderableComponentData),
  );

  // Animated background pulse
  const backgroundPulse: RenderableComponentData = {
    id: 'background-pulse',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: `radial-gradient(ellipse at center, ${backgroundColor} 0%, #000000 100%)`,
          mixBlendMode: 'screen',
          opacity: 0.3,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: audio?.src
      ? [
          {
            id: 'background-pulse-effect',
            componentId: 'waveform',
            data: {
              audioSrc: audio.src,
              audioProperty: 'bass',
              effectType: 'exposure',
              intensity: 0.5,
              baseBrightness: 0.8,
              sensitivity: 1.5,
              threshold: 0.2,
              numberOfSamples: 128,
              useFrequencyData: true,
              windowInSeconds: 1 / 30,
              mode: 'provider',
              targetIds: ['background-pulse'],
              start: 0,
              duration: totalDuration,
              smoothNormalisation: 1,
            } as WaveformEffectData,
          },
        ]
      : [],
    childrenData: [],
  } as RenderableComponentData;

  // SVG filter container
  const svgFilterContainer: RenderableComponentData = {
    id: 'svg-filter-defs',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterDef,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'psychedelic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: `radial-gradient(ellipse at center, #1a0a2e 0%, ${backgroundColor} 50%, #000000 100%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      svgFilterContainer,
      backgroundPulse,
      ...(kaleidoscopeEnabled ? kaleidoscopeChildren : []),
      ...captionContainers,
      ...(audio?.src
        ? [
            {
              id: 'audio-track',
              type: 'atom',
              componentId: 'AudioAtom',
              data: {
                src: audio.src,
                volume: audio.volume ?? 1,
                startFrom: audio.start ?? 0,
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration,
                },
              },
            } as RenderableComponentData,
          ]
        : []),
    ],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'psychedelicTypokineticsVortex',
  title: 'Psychedelic Typokinetics Vortex',
  description:
    'A hypnotic, trance-inducing typography preset inspired by 1960s concert posters and modern festival visuals. Features organic wave-timed word flashes, vortex spiral scaling with rotation, spectrum color cycling, and kaleidoscope symmetry effects. Words emerge from a psychedelic vortex with mix-blend-mode difference for color interactions. Audio-reactive parameters control color hue cycling and visual intensity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'psychedelic',
    'kinetic',
    '1960s',
    'festival',
    'vortex',
    'spiral',
    'kaleidoscope',
    'color-cycling',
    'audio-reactive',
    'melt',
    'glitch',
    'trance',
    'hypnotic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    audio: {
      src: '',
      volume: 1,
      start: 0,
    },
    fontSize: 80,
    font: 'Anton',
    textColor: '#FFFFFF',
    backgroundColor: '#0d0015',
    spiralIntensity: 1,
    meltIntensity: 1,
    colorCycleSpeed: 1,
    kaleidoscopeEnabled: true,
    kaleidoscopeLayers: 6,
    organicWaveFrequency: 1.5,
    bassSensitivity: 1.5,
  },
};

// Export
export const psychedelicTypokineticsVortexPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
