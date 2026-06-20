/**
 * Zigzag Scribble Slide Transition Preset
 *
 * Creates an aggressive, hand-drawn zigzag scribble transition between two videos.
 * Features horizontal zigzag marker strokes that push the old scene out while pulling
 * the new one in. Includes organic variation in pressure, speed, gaps, and overlapping
 * areas for a realistic marker-drawn appearance.
 *
 * Features:
 * - Horizontal slide animations with synchronized zigzag scribble reveal
 * - Organic SVG zigzag strokes with varying stroke widths (3-8px)
 * - Dynamic opacity variation (0.7-1.0) for realistic marker pressure
 * - Motion blur filter during slide (horizontal blur 0→4px→0)
 * - Proper z-index layering (z-10 outgoing, z-20 incoming, z-30 scribbles)
 * - 1.0s overlap period with easing-in-out animations
 * - Progressive strokeDashoffset reveal on incoming video
 *
 * Use cases:
 * - Creating vigorous, hand-drawn transitions between video clips
 * - Adding energetic marker-stroke wipe effects
 * - Building dynamic video montages with scribble aesthetics
 * - Creating aggressive back-and-forth reveal animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video (outgoing media)'),
  media2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video (incoming media)'),
  overlapDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate total composition duration with overlap
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Helper to generate zigzag SVG path with organic variation
  const generateZigzagPath = (
    yPosition: number,
    amplitude: number,
    frequency: number,
    seed: number,
  ): string => {
    const segments = 20;
    const width = 1920;
    let path = `M0,${yPosition}`;

    for (let i = 0; i < segments; i++) {
      const x = (width / segments) * (i + 1);
      // Add organic variation using seed
      const variation = Math.sin(seed + i * 0.5) * amplitude * 0.3;
      const y =
        yPosition +
        Math.sin((i / segments) * Math.PI * frequency) * amplitude +
        variation;
      path += ` L${x},${y}`;
    }

    return path;
  };

  // Create 3 zigzag scribble overlays with varying properties
  const scribbleOverlays: RenderableComponentData[] = [
    {
      id: 'scribble-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width='100%' height='100%' viewBox='0 0 1920 1080' preserveAspectRatio='none' style='position:absolute;top:0;left:0;pointer-events:none;'>
          <path d='${generateZigzagPath(200, 25, 4, 0)}' stroke='#ffffff' stroke-width='5' fill='none' opacity='0.8' stroke-linecap='round' stroke-linejoin='round' pathLength='1' style='stroke-dasharray: 1; stroke-dashoffset: 1; animation: scribble-reveal-1 ${overlapDuration}s ease-in-out forwards;'/>
          <style>
            @keyframes scribble-reveal-1 {
              0% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
          </style>
        </svg>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
    } as RenderableComponentData,
    {
      id: 'scribble-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width='100%' height='100%' viewBox='0 0 1920 1080' preserveAspectRatio='none' style='position:absolute;top:0;left:0;pointer-events:none;'>
          <path d='${generateZigzagPath(450, 30, 5, 1.5)}' stroke='#ffffff' stroke-width='6' fill='none' opacity='0.9' stroke-linecap='round' stroke-linejoin='round' pathLength='1' style='stroke-dasharray: 1; stroke-dashoffset: 1; animation: scribble-reveal-2 ${overlapDuration * 0.9}s ease-in-out 0.1s forwards;'/>
          <style>
            @keyframes scribble-reveal-2 {
              0% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
          </style>
        </svg>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: overlapDuration * 0.15,
          duration: overlapDuration * 0.85,
        },
      },
    } as RenderableComponentData,
    {
      id: 'scribble-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width='100%' height='100%' viewBox='0 0 1920 1080' preserveAspectRatio='none' style='position:absolute;top:0;left:0;pointer-events:none;'>
          <path d='${generateZigzagPath(700, 20, 6, 3)}' stroke='#ffffff' stroke-width='4' fill='none' opacity='0.7' stroke-linecap='round' stroke-linejoin='round' pathLength='1' style='stroke-dasharray: 1; stroke-dashoffset: 1; animation: scribble-reveal-3 ${overlapDuration * 0.8}s ease-in-out 0.2s forwards;'/>
          <style>
            @keyframes scribble-reveal-3 {
              0% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
          </style>
        </svg>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: overlapDuration * 0.25,
          duration: overlapDuration * 0.75,
        },
      },
    } as RenderableComponentData,
  ];

  // Outgoing video wrapper (slides left and fades out)
  const outgoingWrapper: RenderableComponentData = {
    id: 'outgoing-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: media1.src,
          fit: 'cover',
          volume: 1,
          className: 'w-full h-full object-cover',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
        effects: [
          // Slide left animation
          {
            id: 'slide-out-left',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: media1.duration - overlapDuration,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'translateX', val: '0%', prog: 0 },
                { key: 'translateX', val: '-30%', prog: 1 },
              ],
            },
          },
          // Fade out animation
          {
            id: 'fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: media1.duration - overlapDuration,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Motion blur (horizontal)
          {
            id: 'blur-out',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: media1.duration - overlapDuration,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(4px)', prog: 0.5 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  // Incoming video wrapper (slides in from right and fades in)
  const incomingWrapper: RenderableComponentData = {
    id: 'incoming-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: media1.duration - overlapDuration,
        duration: media2.duration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: media2.src,
          fit: 'cover',
          volume: 1,
          className: 'w-full h-full object-cover',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: media2.duration + overlapDuration,
          },
        },
        effects: [
          // Slide in from right
          {
            id: 'slide-in-right',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'translateX', val: '30%', prog: 0 },
                { key: 'translateX', val: '0%', prog: 1 },
              ],
            },
          },
          // Fade in animation
          {
            id: 'fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          // Motion blur (horizontal)
          {
            id: 'blur-in',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'filter', val: 'blur(4px)', prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 0.5 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  // Scribble container (positioned during transition overlap)
  const scribbleContainer: RenderableComponentData = {
    id: 'scribble-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: media1.duration - overlapDuration,
        duration: overlapDuration,
      },
    },
    childrenData: scribbleOverlays,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'zigzag-scribble-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingWrapper, incomingWrapper, scribbleContainer],
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
  id: 'zigzag-scribble-transition',
  title: 'Zigzag Scribble Slide Transition',
  description:
    'Dynamic video transition using aggressive back-and-forth zigzag marker strokes with organic variation. Features horizontal slide animations with synchronized scribble overlay paths creating a vigorous erase-and-reveal effect with varying speeds, gaps, and realistic hand-drawn appearance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'scribble',
    'zigzag',
    'marker',
    'hand-drawn',
    'slide',
    'aggressive',
    'organic',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const zigzagScribbleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
