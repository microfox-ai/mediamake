/**
 * 90s Home Movie Credits Roll Preset
 *
 * This preset recreates the nostalgic aesthetic of 90s home video titles with a continuous
 * scrolling credits roll. Text floats upward as if underwater or filmed through heat haze,
 * featuring analog tape warping effects where letters stretch and compress horizontally.
 * Includes authentic magnetic tape degradation artifacts with random color shifts, brightness
 * fluctuations, and sporadic static bars cutting through words.
 *
 * Features:
 * - **Continuous Credits Roll**: Smooth vertical scrolling animation from bottom to top
 * - **Underwater Wobble**: Sinusoidal translateX and rotation for heat haze effect
 * - **Analog Tape Warp**: Horizontal stretch/compress with scaleX oscillation (0.9-1.1)
 * - **Magnetic Degradation**: Random hue rotation and brightness flicker (0.8-1.2)
 * - **Static Bars**: Absolutely positioned horizontal bars with random appearance
 * - **Analog Grain**: Pulsing grain texture overlay with shifting opacity
 * - **Serif Typography**: Georgia/Times fonts typical of vintage video titles
 * - **Metadata Impact**: Per-caption wobble intensity via caption.metadata.impact
 *
 * Use cases:
 * - Creating nostalgic 90s-style end credits for videos
 * - Retro home movie aesthetic for social media content
 * - Vintage VHS-style title sequences
 * - Analog tape degradation effects for artistic projects
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Params Schema ---
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(z.any()),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences to display in the credits roll'),

  font: z
    .string()
    .optional()
    .default('Georgia:600')
    .describe(
      'Font family with optional weight (e.g., "Georgia:600", "Times:700")',
    ),

  fontSize: z
    .number()
    .optional()
    .default(48)
    .describe('Base font size in pixels for credit text'),

  textColor: z
    .string()
    .optional()
    .default('#e8e4d8')
    .describe('Text color for credits (vintage warm white default)'),

  backgroundColor: z
    .string()
    .optional()
    .default('#0a0a0a')
    .describe('Background color for the credits scene'),

  scrollSpeed: z
    .number()
    .optional()
    .default(1.0)
    .describe(
      'Speed multiplier for scroll animation (1.0 = normal, higher = faster)',
    ),

  wobbleIntensity: z
    .number()
    .optional()
    .default(1.0)
    .describe(
      'Global wobble intensity multiplier (multiplies with metadata.impact if present)',
    ),

  warpIntensity: z
    .number()
    .optional()
    .default(1.0)
    .describe('Intensity of horizontal tape warp effect (0.0 - 2.0)'),

  degradationIntensity: z
    .number()
    .optional()
    .default(1.0)
    .describe('Intensity of magnetic degradation artifacts (0.0 - 2.0)'),

  grainOpacity: z
    .number()
    .optional()
    .default(0.5)
    .describe('Opacity of analog grain overlay (0.0 - 1.0)'),

  staticBarsFrequency: z
    .number()
    .optional()
    .default(0.3)
    .describe(
      'Frequency of static bar appearances (0.0 = none, 1.0 = very frequent)',
    ),

  lineSpacing: z
    .number()
    .optional()
    .default(2.0)
    .describe('Spacing multiplier between credit lines'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Execution Function ---
const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    font = 'Georgia:600',
    fontSize = 48,
    textColor = '#e8e4d8',
    backgroundColor = '#0a0a0a',
    scrollSpeed = 1.0,
    wobbleIntensity = 1.0,
    warpIntensity = 1.0,
    degradationIntensity = 1.0,
    grainOpacity = 0.5,
    staticBarsFrequency = 0.3,
    lineSpacing = 2.0,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontStr: string) => {
    const parts = fontStr.split(':');
    const family = parts[0] || 'Georgia';
    const weight = parts[1] ? parseInt(parts[1], 10) : 600;
    return { family, weight };
  };

  const { family: fontFamily, weight: fontWeight } = parseFontString(font);

  // Calculate total scroll duration based on caption count and spacing
  const totalDuration =
    captions.length > 0
      ? Math.max(
          captions[captions.length - 1].absoluteEnd,
          captions.length * lineSpacing * 2,
        )
      : 30;

  const lineGap = fontSize * lineSpacing;

  // Create credit text components for each caption
  const creditComponents: RenderableComponentData[] = captions.map(
    (caption, index) => {
      const impact = caption.metadata?.impact ?? 1.0;
      const wobbleAmplitude = 15 * wobbleIntensity * impact;
      const rotateAmplitude = 3 * wobbleIntensity * impact;

      const creditId = `credit-${caption.id}`;

      // Create effects for this credit line
      const effects: any[] = [];

      // Underwater wobble effect (sinusoidal translateX and rotate)
      effects.push({
        id: `${creditId}-wobble`,
        componentId: creditId,
        data: {
          type: 'provider',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: [creditId],
          ranges: [
            // TranslateX sinusoidal wobble
            {
              key: 'translateX',
              val: `sin(t * 0.8 * 2 * PI) * ${wobbleAmplitude}`,
              prog: 'expression',
            },
            // Rotation sinusoidal wobble with phase offset
            {
              key: 'rotate',
              val: `sin((t * 0.6 + 0.25) * 2 * PI) * ${rotateAmplitude}`,
              prog: 'expression',
            },
          ],
        },
      });

      // Tape warp effect (scaleX oscillation)
      const warpMin = 0.9;
      const warpMax = 1.1;
      const warpRange = (warpMax - warpMin) * warpIntensity;
      const warpMid = (warpMax + warpMin) / 2;

      effects.push({
        id: `${creditId}-warp`,
        componentId: creditId,
        data: {
          type: 'provider',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: [creditId],
          ranges: [
            {
              key: 'scaleX',
              val: `${warpMid} + sin((t * 1.2 + ${index * 0.3}) * 2 * PI) * ${warpRange / 2}`,
              prog: 'expression',
            },
          ],
        },
      });

      // Magnetic color shift (hue rotation)
      const hueRange = 20 * degradationIntensity;
      effects.push({
        id: `${creditId}-hue`,
        componentId: creditId,
        data: {
          type: 'provider',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: [creditId],
          ranges: [
            {
              key: 'hue-rotate',
              val: `sin((t * 0.3 + ${index * 0.7}) * 2 * PI) * ${hueRange}`,
              prog: 'expression',
            },
          ],
        },
      });

      // Brightness flicker
      const brightnessMin = 0.8;
      const brightnessMax = 1.2;
      const brightnessRange =
        (brightnessMax - brightnessMin) * degradationIntensity;
      const brightnessMid = (brightnessMax + brightnessMin) / 2;

      effects.push({
        id: `${creditId}-brightness`,
        componentId: creditId,
        data: {
          type: 'provider',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: [creditId],
          ranges: [
            {
              key: 'brightness',
              val: `${brightnessMid} + sin((t * 0.4 + ${index * 0.5}) * 2 * PI) * ${brightnessRange / 2}`,
              prog: 'expression',
            },
          ],
        },
      });

      return {
        id: creditId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: caption.text,
          style: {
            color: textColor,
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            textAlign: 'center' as const,
            textShadow: '0 0 8px rgba(255, 250, 230, 0.4)',
            marginBottom: `${lineGap}px`,
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects,
      } as RenderableComponentData;
    },
  );

  // Create scroll wrapper container
  const scrollDuration = totalDuration / scrollSpeed;

  const scrollWrapperEffects: any[] = [
    {
      id: 'scroll-animation',
      componentId: 'credits-scroll-wrapper',
      data: {
        type: 'linear',
        start: 0,
        duration: scrollDuration,
        mode: 'provider',
        targetIds: ['credits-scroll-wrapper'],
        ranges: [
          { key: 'translateY', val: '100vh', prog: 0 },
          { key: 'translateY', val: '-100%', prog: 1 },
        ],
      },
    },
  ];

  const scrollWrapper: RenderableComponentData = {
    id: 'credits-scroll-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: scrollWrapperEffects,
    childrenData: creditComponents as RenderableComponentData[],
  } as RenderableComponentData;

  // Create analog noise grain layer
  const grainOpacityMin = Math.max(0.3, grainOpacity - 0.2);
  const grainOpacityMax = Math.min(1.0, grainOpacity + 0.2);

  const grainEffects: any[] = [
    {
      id: 'grain-pulse',
      componentId: 'analog-grain-layer',
      data: {
        type: 'provider',
        start: 0,
        duration: totalDuration,
        mode: 'provider',
        targetIds: ['analog-grain-layer'],
        ranges: [
          {
            key: 'opacity',
            val: `${(grainOpacityMin + grainOpacityMax) / 2} + sin(t * 0.5 * 2 * PI) * ${(grainOpacityMax - grainOpacityMin) / 2}`,
            prog: 'expression',
          },
        ],
      },
    },
  ];

  const grainLayer: RenderableComponentData = {
    id: 'analog-grain-layer',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      style: {
        width: '100%',
        height: '100%',
        background:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: grainEffects,
  } as RenderableComponentData;

  // Create static bars layer (multiple bars with random timing)
  const staticBars: RenderableComponentData[] = [];
  const numStaticBars = Math.floor(staticBarsFrequency * 5);

  for (let i = 0; i < numStaticBars; i++) {
    const barDuration = 0.1 + Math.random() * 0.1;
    const barStart = Math.random() * (totalDuration - barDuration);
    const barPosition = Math.random() * 100;

    const barEffects: any[] = [
      {
        id: `static-bar-${i}-flash`,
        componentId: `static-bar-${i}`,
        data: {
          type: 'linear',
          start: 0,
          duration: barDuration,
          mode: 'provider',
          targetIds: [`static-bar-${i}`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.9, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];

    staticBars.push({
      id: `static-bar-${i}`,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shape: 'rectangle',
        style: {
          position: 'absolute',
          left: '0',
          right: '0',
          top: `${barPosition}%`,
          height: '2px',
          background: 'rgba(255, 255, 255, 0.8)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: barStart,
          duration: barDuration,
        },
      },
      effects: barEffects,
    } as RenderableComponentData);
  }

  const staticBarsLayer: RenderableComponentData = {
    id: 'static-bars-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: staticBars as RenderableComponentData[],
  } as RenderableComponentData;

  // Create magnetic degradation overlay layer
  const degradationEffects: any[] = [
    {
      id: 'degradation-brightness-fluctuation',
      componentId: 'degradation-overlay',
      data: {
        type: 'provider',
        start: 0,
        duration: totalDuration,
        mode: 'provider',
        targetIds: ['degradation-overlay'],
        ranges: [
          {
            key: 'opacity',
            val: `0.15 + sin(t * 0.25 * 2 * PI) * 0.1 * ${degradationIntensity}`,
            prog: 'expression',
          },
        ],
      },
    },
  ];

  const degradationLayer: RenderableComponentData = {
    id: 'degradation-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      style: {
        width: '100%',
        height: '100%',
        background:
          'linear-gradient(to bottom, rgba(255,0,0,0.05), rgba(0,255,0,0.05), rgba(0,0,255,0.05))',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: degradationEffects,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'nineties-home-movie-credits-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex flex-col items-center justify-center overflow-hidden',
        style: {
          backgroundColor,
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
      degradationLayer,
      grainLayer,
      scrollWrapper,
      staticBarsLayer,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
  };
};

// --- Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'nineties-home-movie-credits',
  title: '90s Home Movie Credits Roll',
  description:
    'A nostalgic wobbly credits roll preset that recreates the look of 90s home video titles. Features underwater-style floating text with sinusoidal wobble and rotation, analog tape warping with horizontal stretch/compress animation, magnetic tape degradation artifacts including random color shifts and brightness fluctuations, sporadic static bars cutting through text, and pulsing analog grain noise. Uses serif typography (Georgia/Times) typical of vintage video titles with metadata-driven effect intensity for per-credit customization.',
  type: 'predefined',
  presetType: 'full',
  tags: [
    'credits',
    'typography',
    'retro',
    '90s',
    'vhs',
    'analog',
    'vintage',
    'home-movie',
    'scrolling',
    'wobble',
    'tape-degradation',
    'grain',
    'static',
    'serif',
  ],
  defaultInputParams: {
    font: 'Georgia:600',
    fontSize: 48,
    textColor: '#e8e4d8',
    backgroundColor: '#0a0a0a',
    scrollSpeed: 1.0,
    wobbleIntensity: 1.0,
    warpIntensity: 1.0,
    degradationIntensity: 1.0,
    grainOpacity: 0.5,
    staticBarsFrequency: 0.3,
    lineSpacing: 2.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---
export const ninetiesHomeMovieCreditsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: {
    type: 'object',
    properties: {
      captions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            start: { type: 'number' },
            end: { type: 'number' },
            duration: { type: 'number' },
            absoluteStart: { type: 'number' },
            absoluteEnd: { type: 'number' },
            words: { type: 'array', items: {} },
            metadata: {
              type: 'object',
              properties: {
                impact: { type: 'number' },
              },
            },
          },
          required: [
            'id',
            'text',
            'start',
            'end',
            'duration',
            'absoluteStart',
            'absoluteEnd',
            'words',
          ],
        },
        description: 'Array of caption sentences to display in the credits roll',
      },
      font: {
        type: 'string',
        description:
          'Font family with optional weight (e.g., "Georgia:600", "Times:700")',
        default: 'Georgia:600',
      },
      fontSize: {
        type: 'number',
        description: 'Base font size in pixels for credit text',
        default: 48,
      },
      textColor: {
        type: 'string',
        description: 'Text color for credits (vintage warm white default)',
        default: '#e8e4d8',
      },
      backgroundColor: {
        type: 'string',
        description: 'Background color for the credits scene',
        default: '#0a0a0a',
      },
      scrollSpeed: {
        type: 'number',
        description:
          'Speed multiplier for scroll animation (1.0 = normal, higher = faster)',
        default: 1.0,
      },
      wobbleIntensity: {
        type: 'number',
        description:
          'Global wobble intensity multiplier (multiplies with metadata.impact if present)',
        default: 1.0,
      },
      warpIntensity: {
        type: 'number',
        description: 'Intensity of horizontal tape warp effect (0.0 - 2.0)',
        default: 1.0,
      },
      degradationIntensity: {
        type: 'number',
        description: 'Intensity of magnetic degradation artifacts (0.0 - 2.0)',
        default: 1.0,
      },
      grainOpacity: {
        type: 'number',
        description: 'Opacity of analog grain overlay (0.0 - 1.0)',
        default: 0.5,
      },
      staticBarsFrequency: {
        type: 'number',
        description:
          'Frequency of static bar appearances (0.0 = none, 1.0 = very frequent)',
        default: 0.3,
      },
      lineSpacing: {
        type: 'number',
        description: 'Spacing multiplier between credit lines',
        default: 2.0,
      },
    },
    required: ['captions'],
  },
};
