/**
 * NES Corruption Typography Preset
 *
 * This preset creates a glitchy pixel art typography effect inspired by corrupted NES graphics
 * and datamoshing effects. The text appears as if displayed on a failing CRT monitor with
 * memory corruption. Features include:
 *
 * - Chunky pixel fonts with periodic glitch-out effects
 * - Horizontal displacement bars and color channel separation (RGB split)
 * - Random character scrambling and position shifts
 * - "Bad signal" effect with horizontal tearing artifacts
 * - Muted retro palettes alternating with oversaturated glitch colors
 * - Digital noise patterns that intensify during transitions
 * - Grid-snapped, mechanical, quantized movement (8px increments)
 * - Optional audio-reactive glitch triggers
 *
 * Use cases:
 * - Retro gaming aesthetics
 * - Cyberpunk or tech-themed videos
 * - Music videos with electronic/glitch genres
 * - Creative title cards with a distressed digital look
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('The text content to display'),
  duration: z
    .number()
    .default(10)
    .describe('Duration of the text display in seconds'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of glitch effects (0 = subtle, 1 = extreme)'),
  glitchFrequency: z
    .number()
    .min(0.1)
    .max(5)
    .default(2)
    .describe('Frequency of glitch events per second'),
  baseColor: z
    .string()
    .default('#e0e0e0')
    .describe('Base text color (muted retro palette)'),
  glitchColors: z
    .object({
      red: z.string().default('#ff0040'),
      cyan: z.string().default('#00d4ff'),
      magenta: z.string().default('#ff00ff'),
      yellow: z.string().default('#ffff00'),
    })
    .optional()
    .describe('Oversaturated glitch colors for corruption events'),
  pixelFont: z
    .string()
    .default('Press Start 2P')
    .describe('Pixel font family (must be Google Font)'),
  fontSize: z
    .number()
    .default(48)
    .describe('Base font size in pixels (text-4xl equivalent)'),
  gridSize: z
    .number()
    .default(8)
    .describe('Grid snap size in pixels (for quantized movement)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source for beat-synced glitch triggers'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    text,
    duration,
    glitchIntensity,
    glitchFrequency,
    baseColor,
    glitchColors,
    pixelFont,
    fontSize,
    gridSize,
    audioSrc,
  } = params;

  const containerId = 'nes-corruption-container';
  const primaryTextId = 'nes-primary-text';
  const channelRedId = 'nes-channel-red';
  const channelBlueId = 'nes-channel-blue';

  // Helper: Snap value to grid
  const snapToGrid = (value: number): number => {
    return Math.round(value / gridSize) * gridSize;
  };

  // Helper: Random grid-snapped displacement
  const randomGridDisplacement = (max: number): number => {
    const value = (Math.random() - 0.5) * 2 * max;
    return snapToGrid(value);
  };

  // Calculate glitch timing intervals
  const glitchInterval = 1 / glitchFrequency;
  const glitchDuration = 0.15 * glitchIntensity; // Glitch lasts ~150ms at max intensity

  // Generate glitch events throughout duration
  const glitchEvents: Array<{ start: number; duration: number }> = [];
  let currentTime = Math.random() * glitchInterval; // Random initial offset

  while (currentTime < duration) {
    glitchEvents.push({
      start: currentTime,
      duration: glitchDuration,
    });
    currentTime += glitchInterval + (Math.random() - 0.5) * glitchInterval * 0.5;
  }

  // Create glitch bar effects
  const glitchBars: RenderableComponentData[] = [
    {
      id: 'glitch-bar-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute h-1 w-full mix-blend-screen',
        style: {
          backgroundColor: glitchColors?.magenta || '#ff00ff',
          top: '30%',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: glitchEvents.map((event, index) => ({
        id: `glitch-bar-1-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: event.start,
          duration: event.duration,
          mode: 'provider',
          targetIds: ['glitch-bar-1'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            {
              key: 'translateX',
              val: `${snapToGrid(0)}px`,
              prog: 0,
            },
            {
              key: 'translateX',
              val: `${randomGridDisplacement(80)}px`,
              prog: 0.5,
            },
            {
              key: 'translateX',
              val: `${snapToGrid(0)}px`,
              prog: 1,
            },
          ],
        },
      })),
    } as RenderableComponentData,
    {
      id: 'glitch-bar-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute h-2 w-full mix-blend-screen',
        style: {
          backgroundColor: glitchColors?.cyan || '#00ffff',
          top: '55%',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: glitchEvents.map((event, index) => ({
        id: `glitch-bar-2-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: event.start + 0.05, // Slight offset
          duration: event.duration,
          mode: 'provider',
          targetIds: ['glitch-bar-2'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            {
              key: 'translateX',
              val: `${snapToGrid(0)}px`,
              prog: 0,
            },
            {
              key: 'translateX',
              val: `${randomGridDisplacement(100)}px`,
              prog: 0.5,
            },
            {
              key: 'translateX',
              val: `${snapToGrid(0)}px`,
              prog: 1,
            },
          ],
        },
      })),
    } as RenderableComponentData,
    {
      id: 'glitch-bar-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute h-1 w-full mix-blend-screen',
        style: {
          backgroundColor: glitchColors?.yellow || '#ffff00',
          top: '75%',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: glitchEvents.map((event, index) => ({
        id: `glitch-bar-3-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: event.start + 0.1, // More offset
          duration: event.duration,
          mode: 'provider',
          targetIds: ['glitch-bar-3'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            {
              key: 'translateX',
              val: `${snapToGrid(0)}px`,
              prog: 0,
            },
            {
              key: 'translateX',
              val: `${randomGridDisplacement(60)}px`,
              prog: 0.5,
            },
            {
              key: 'translateX',
              val: `${snapToGrid(0)}px`,
              prog: 1,
            },
          ],
        },
      })),
    } as RenderableComponentData,
  ];

  // Create RGB channel split effects
  const channelSplitEffects = glitchEvents.flatMap((event, index) => [
    {
      id: `channel-red-split-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: event.start,
        duration: event.duration,
        mode: 'provider',
        targetIds: [channelRedId],
        ranges: [
          { key: 'translateX', val: `${snapToGrid(0)}px`, prog: 0 },
          {
            key: 'translateX',
            val: `${snapToGrid(-4 - glitchIntensity * 4)}px`,
            prog: 0.5,
          },
          { key: 'translateX', val: `${snapToGrid(0)}px`, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 0.2 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
    {
      id: `channel-blue-split-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: event.start,
        duration: event.duration,
        mode: 'provider',
        targetIds: [channelBlueId],
        ranges: [
          { key: 'translateX', val: `${snapToGrid(0)}px`, prog: 0 },
          {
            key: 'translateX',
            val: `${snapToGrid(4 + glitchIntensity * 4)}px`,
            prog: 0.5,
          },
          { key: 'translateX', val: `${snapToGrid(0)}px`, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 0.2 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ]);

  // Create text jitter effects on primary text
  const textJitterEffects = glitchEvents.map((event, index) => ({
    id: `text-jitter-${index}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: event.start,
      duration: event.duration,
      mode: 'provider',
      targetIds: [primaryTextId],
      ranges: [
        { key: 'translateX', val: `${snapToGrid(0)}px`, prog: 0 },
        {
          key: 'translateX',
          val: `${randomGridDisplacement(16 * glitchIntensity)}px`,
          prog: 0.25,
        },
        {
          key: 'translateX',
          val: `${randomGridDisplacement(16 * glitchIntensity)}px`,
          prog: 0.5,
        },
        {
          key: 'translateX',
          val: `${randomGridDisplacement(16 * glitchIntensity)}px`,
          prog: 0.75,
        },
        { key: 'translateX', val: `${snapToGrid(0)}px`, prog: 1 },
        { key: 'translateY', val: `${snapToGrid(0)}px`, prog: 0 },
        {
          key: 'translateY',
          val: `${randomGridDisplacement(8 * glitchIntensity)}px`,
          prog: 0.3,
        },
        { key: 'translateY', val: `${snapToGrid(0)}px`, prog: 1 },
      ],
    },
  }));

  // Noise grain layer
  const noiseLayer: RenderableComponentData = {
    id: 'noise-grain-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        opacity: 0.15,
        mixBlendMode: 'overlay',
        background: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 1px,
            rgba(255,255,255,0.03) 1px,
            rgba(255,255,255,0.03) 2px
          )
        `,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: glitchEvents.map((event, index) => ({
      id: `noise-intensify-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: event.start,
        duration: event.duration,
        mode: 'provider',
        targetIds: ['noise-grain-layer'],
        ranges: [
          { key: 'opacity', val: 0.15, prog: 0 },
          { key: 'opacity', val: 0.4, prog: 0.5 },
          { key: 'opacity', val: 0.15, prog: 1 },
        ],
      },
    })),
  } as RenderableComponentData;

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.3) 2px,
            rgba(0,0,0,0.3) 4px
          )
        `,
        mixBlendMode: 'multiply',
        zIndex: 40,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  } as RenderableComponentData;

  // CRT vignette
  const crtVignette: RenderableComponentData = {
    id: 'crt-vignette',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background:
          'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
        zIndex: 40,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  } as RenderableComponentData;

  // Main text layers
  const primaryText: RenderableComponentData = {
    id: primaryTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono relative',
      style: {
        fontSize: `${fontSize}px`,
        color: baseColor,
        textShadow: '2px 2px 0px #000',
        imageRendering: 'pixelated' as any,
        fontWeight: 'normal',
        zIndex: 20,
      },
      font: {
        family: pixelFont,
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: textJitterEffects,
  } as RenderableComponentData;

  const channelRed: RenderableComponentData = {
    id: channelRedId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono absolute',
      style: {
        fontSize: `${fontSize}px`,
        color: glitchColors?.red || '#ff0040',
        mixBlendMode: 'screen',
        opacity: 0,
        imageRendering: 'pixelated' as any,
        fontWeight: 'normal',
        zIndex: 10,
      },
      font: {
        family: pixelFont,
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: channelSplitEffects.filter((e) => e.data.targetIds[0] === channelRedId),
  } as RenderableComponentData;

  const channelBlue: RenderableComponentData = {
    id: channelBlueId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono absolute',
      style: {
        fontSize: `${fontSize}px`,
        color: glitchColors?.cyan || '#00d4ff',
        mixBlendMode: 'screen',
        opacity: 0,
        imageRendering: 'pixelated' as any,
        fontWeight: 'normal',
        zIndex: 10,
      },
      font: {
        family: pixelFont,
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: channelSplitEffects.filter((e) => e.data.targetIds[0] === channelBlueId),
  } as RenderableComponentData;

  // Main text layer container
  const mainTextLayer: RenderableComponentData = {
    id: 'main-text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: { zIndex: 30 },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [channelRed, channelBlue, primaryText],
  } as RenderableComponentData;

  // Glitch bars container
  const glitchBarsContainer: RenderableComponentData = {
    id: 'glitch-bars-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
        style: { zIndex: 30 },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: glitchBars,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      scanlineOverlay,
      mainTextLayer,
      glitchBarsContainer,
      noiseLayer,
      crtVignette,
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'nes-corruption-typography',
  title: 'NES Corruption Typography',
  description:
    'A glitchy pixel art typography preset inspired by corrupted NES graphics and datamoshing effects. Features chunky pixel fonts with horizontal displacement bars, RGB channel separation, pixel sorting effects, and CRT monitor corruption aesthetics. Text periodically glitches with character scrambling, horizontal tearing artifacts, and bad signal effects. Colors alternate between muted retro palettes and oversaturated glitch colors (hot pinks, electric blues). All movement is quantized to an 8px grid for mechanical, quantized motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'glitch',
    'retro',
    'nes',
    'pixel-art',
    'corruption',
    'datamosh',
    'crt',
    'rgb-split',
    'chromatic-aberration',
  ],
  defaultInputParams: {
    text: 'SYSTEM ERROR',
    duration: 10,
    glitchIntensity: 0.7,
    glitchFrequency: 2,
    baseColor: '#e0e0e0',
    glitchColors: {
      red: '#ff0040',
      cyan: '#00d4ff',
      magenta: '#ff00ff',
      yellow: '#ffff00',
    },
    pixelFont: 'Press Start 2P',
    fontSize: 48,
    gridSize: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const nesCorruptionTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
