/**
 * 70s Liquid Light Show Typography Preset
 *
 * A psychedelic typography preset inspired by 60s-70s liquid light shows. Creates the effect
 * of text projected onto swirling, morphing oil patterns like those classic overhead projector
 * shows from 60s-70s concerts. Text appears with thick, bold outlines that float above a
 * constantly shifting background of color blobs. Words wobble and distort organically as if
 * the projection surface is unstable. Features vintage film grain and occasional light leaks
 * for authentic analog projection aesthetics.
 *
 * Features:
 * - Multi-layered animated radial gradient background (psychedelic blobs)
 * - Continuous organic distortion on text (skew transforms with noise-based timing)
 * - Thick multi-colored outlines (magenta, cyan, yellow glow)
 * - Mix blend mode for classic psychedelic overlay effect
 * - Film grain overlay for vintage analog feel
 * - Light leak flashes for projection imperfections
 * - Uses classic 70s-style bold fonts
 *
 * Technical Implementation:
 * - Background: Multiple animated radial-gradient blobs with independent motion
 * - Text: Bold font with difference/exclusion blend mode
 * - Distortion: Continuous skew animations with asynchronous timing
 * - Effects: Film grain, light leaks with sudden appearance (steps easing)
 * - All animations loop smoothly for endless psychedelic experience
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z
    .string()
    .default('GROOVY')
    .describe('Text to display with liquid light show effect'),
  font: z
    .string()
    .default('Black Ops One:400')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Black Ops One:400", "Bungee Shade:400")',
    ),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for the main text'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base color for the text (used with blend mode)'),
  blobColors: z
    .array(z.string())
    .default(['#FF00FF', '#00FFFF', '#FFFF00', '#FF6600', '#00FF66'])
    .optional()
    .describe(
      'Array of colors for the psychedelic background blobs (magenta, cyan, yellow, orange, green)',
    ),
  backgroundBlur: z
    .number()
    .default(60)
    .describe('Blur amount for background blobs in pixels'),
  textOutlineColors: z
    .object({
      primary: z.string().default('#FF00FF'),
      secondary: z.string().default('#00FFFF'),
      tertiary: z.string().default('#FFFF00'),
    })
    .default({ primary: '#FF00FF', secondary: '#00FFFF', tertiary: '#FFFF00' })
    .optional()
    .describe(
      'Colors for the multi-layered text outline glow (magenta, cyan, yellow)',
    ),
  blendMode: z
    .enum(['difference', 'exclusion', 'screen', 'overlay'])
    .default('difference')
    .describe(
      'Mix blend mode for the text layer to interact with background',
    ),
  backgroundAnimationDuration: z
    .number()
    .default(10)
    .describe('Duration in seconds for background blob animation loop'),
  textDistortionDuration: z
    .number()
    .default(3.5)
    .describe('Duration in seconds for text distortion wobble cycle'),
  filmGrainOpacity: z
    .number()
    .default(0.15)
    .describe('Opacity of the film grain overlay (0-1)'),
  lightLeakIntensity: z
    .number()
    .default(0.3)
    .describe('Intensity of light leak flashes (0-1)'),
  duration: z.number().default(10).describe('Total duration of the preset'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Black Ops One:400';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 400;

  // Blob configuration
  const blobColors =
    params.blobColors || [
      '#FF00FF',
      '#00FFFF',
      '#FFFF00',
      '#FF6600',
      '#00FF66',
    ];

  const blobs = [
    {
      id: 'blob-1',
      color: blobColors[0],
      width: '50%',
      height: '50%',
      top: '20%',
      left: '10%',
      opacity: 0.7,
      animDuration: 8,
    },
    {
      id: 'blob-2',
      color: blobColors[1],
      width: '60%',
      height: '60%',
      top: '30%',
      left: '40%',
      opacity: 0.6,
      animDuration: 10,
    },
    {
      id: 'blob-3',
      color: blobColors[2],
      width: '45%',
      height: '45%',
      top: '50%',
      left: '5%',
      opacity: 0.65,
      animDuration: 9,
    },
    {
      id: 'blob-4',
      color: blobColors[3],
      width: '55%',
      height: '55%',
      top: '10%',
      left: '50%',
      opacity: 0.6,
      animDuration: 11,
    },
    {
      id: 'blob-5',
      color: blobColors[4],
      width: '40%',
      height: '40%',
      top: '60%',
      left: '60%',
      opacity: 0.55,
      animDuration: 12,
    },
  ];

  // Create blob components with animation effects
  const blobComponents = blobs.map((blob, index) => ({
    id: `liquid-light-${blob.id}`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: blob.width,
          height: blob.height,
          borderRadius: '50%',
          backgroundColor: blob.color,
          opacity: blob.opacity,
          top: blob.top,
          left: blob.left,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: `blob-movement-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: blob.animDuration,
          mode: 'provider',
          targetIds: [`liquid-light-${blob.id}`],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 30 - index * 10, prog: 0.25 },
            { key: 'translateX', val: -20 + index * 8, prog: 0.5 },
            { key: 'translateX', val: 15 - index * 5, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -25 + index * 8, prog: 0.25 },
            { key: 'translateY', val: 20 - index * 6, prog: 0.5 },
            { key: 'translateY', val: -10 + index * 4, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.1 - index * 0.02, prog: 0.3 },
            { key: 'scale', val: 0.95 + index * 0.01, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  }));

  // Background layer with blurred blobs
  const backgroundLayer = {
    id: 'liquid-light-psychedelic-blob-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          filter: `blur(${params.backgroundBlur}px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: blobComponents as RenderableComponentData[],
  };

  // Text layer with distortion effects
  const textOutline = params.textOutlineColors || {
    primary: '#FF00FF',
    secondary: '#00FFFF',
    tertiary: '#FFFF00',
  };

  const textLayer = {
    id: 'liquid-light-text-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          mixBlendMode: params.blendMode,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'text-distortion',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: params.textDistortionDuration,
          mode: 'provider',
          targetIds: ['liquid-light-text-content'],
          ranges: [
            { key: 'skewX', val: 0, prog: 0 },
            { key: 'skewX', val: -5, prog: 0.15 },
            { key: 'skewX', val: 3, prog: 0.35 },
            { key: 'skewX', val: -2, prog: 0.6 },
            { key: 'skewX', val: 4, prog: 0.8 },
            { key: 'skewX', val: 0, prog: 1 },
            { key: 'skewY', val: 0, prog: 0 },
            { key: 'skewY', val: 2, prog: 0.2 },
            { key: 'skewY', val: -3, prog: 0.4 },
            { key: 'skewY', val: 1, prog: 0.65 },
            { key: 'skewY', val: -1, prog: 0.85 },
            { key: 'skewY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'liquid-light-text-content',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.text,
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
          style: {
            fontSize: `${params.fontSize}px`,
            fontWeight: fontWeight,
            color: params.textColor,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            textShadow: `0 0 20px ${textOutline.primary}, 0 0 40px ${textOutline.secondary}, 0 0 60px ${textOutline.tertiary}, 0 0 80px ${textOutline.primary}`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  };

  // Film grain layer
  const filmGrainLayer = {
    id: 'liquid-light-film-grain-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: params.filmGrainOpacity,
          mixBlendMode: 'overlay' as const,
          backgroundImage:
            'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg==)',
          backgroundSize: '200px 200px',
          backgroundRepeat: 'repeat',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'grain-shimmer',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['liquid-light-film-grain-layer'],
          ranges: [
            { key: 'opacity', val: params.filmGrainOpacity, prog: 0 },
            { key: 'opacity', val: params.filmGrainOpacity * 0.7, prog: 0.5 },
            { key: 'opacity', val: params.filmGrainOpacity, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Light leak layer with flash effects
  const lightLeakLayer = {
    id: 'liquid-light-light-leak-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `linear-gradient(135deg, rgba(255,100,50,${params.lightLeakIntensity}) 0%, transparent 50%, rgba(255,200,100,${params.lightLeakIntensity * 0.7}) 100%)`,
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'light-leak-flash-1',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 2,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['liquid-light-light-leak-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'light-leak-flash-2',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 5,
          duration: 0.15,
          mode: 'provider',
          targetIds: ['liquid-light-light-leak-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.1 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'light-leak-flash-3',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 7.5,
          duration: 0.25,
          mode: 'provider',
          targetIds: ['liquid-light-light-leak-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.9, prog: 0.1 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container
  const rootContainer = {
    id: 'liquid-light-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      backgroundLayer,
      textLayer,
      filmGrainLayer,
      lightLeakLayer,
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-light-typography',
  title: '70s Liquid Light Show Typography',
  description:
    'A psychedelic typography preset inspired by 60s-70s liquid light shows. Text appears projected onto swirling, morphing color blobs with vintage film grain and light leak effects. Features bold outlined text with continuous wobble distortion, multiple animated color blobs creating organic oil-and-water patterns, and authentic analog projection aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'psychedelic',
    'liquid-light',
    '70s',
    'vintage',
    'projection',
    'kinetic',
    'retro',
    'groovy',
  ],
  defaultInputParams: {
    text: 'GROOVY',
    font: 'Black Ops One:400',
    fontSize: 120,
    textColor: '#FFFFFF',
    blobColors: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF6600', '#00FF66'],
    backgroundBlur: 60,
    textOutlineColors: {
      primary: '#FF00FF',
      secondary: '#00FFFF',
      tertiary: '#FFFF00',
    },
    blendMode: 'difference',
    backgroundAnimationDuration: 10,
    textDistortionDuration: 3.5,
    filmGrainOpacity: 0.15,
    lightLeakIntensity: 0.3,
    duration: 10,
  },
  dependencies: {},
};

// Export preset
export const liquidLightTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
