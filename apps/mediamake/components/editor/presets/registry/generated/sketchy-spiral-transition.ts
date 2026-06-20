/**
 * Sketchy Spiral Transition Preset
 *
 * This preset creates a hand-drawn spiral transition effect that twists the outgoing video away
 * while spiraling in the incoming video. The spiral has a rough, marker-drawn aesthetic with
 * uneven line thickness, wobbles, and ink splatter effects for an artistic, sketchy feel.
 *
 * Features:
 * - **Hand-Drawn Spiral Animation**: Rough spiral path with animated stroke-dasharray
 * - **Vortex Effect**: Outgoing video shrinks and rotates (scale 1→0, rotate 0→720deg) into center
 * - **Inverse Incoming**: Incoming video expands from center (scale 0→1, rotate -720deg→0deg)
 * - **Dynamic Stroke Width**: Animated stroke thickness (2→6→2px) for organic feel
 * - **SVG Jitter Filter**: Adds slight wobbles and roughness to the spiral path
 * - **Ink Splatter Effects**: Random splatter particles around spiral edges with scale animations
 * - **Edge Blur**: Blur effect (0→2px→0px) on spiral edges for marker bleeding effect
 *
 * Use cases:
 * - Creative video transitions with artistic flair
 * - Hand-drawn style video presentations
 * - Artistic video montages
 * - Organic, non-digital transitions between clips
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video data (outgoing)'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video data (incoming)'),
  transitionDuration: z
    .number()
    .default(1.3)
    .describe('Duration of the spiral transition overlap in seconds'),
  spiralColor: z
    .string()
    .default('#2d2d2d')
    .optional()
    .describe('Color of the spiral stroke (hex color)'),
  splatterCount: z
    .number()
    .default(5)
    .optional()
    .describe('Number of ink splatter particles'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, spiralColor, splatterCount } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper function to create splatter HTML
  const createSplatterHTML = (size: number, opacity: number): string => {
    return `<div style='width:${size}px;height:${size}px;background:${spiralColor || '#2d2d2d'};border-radius:50%;opacity:${opacity};'></div>`;
  };

  // Splatter positions (randomized around center)
  const splatterPositions = [
    { top: '35%', left: '48%', size: 20, opacity: 0.7, delay: 0.2 },
    { top: '55%', left: '52%', size: 15, opacity: 0.6, delay: 0.3 },
    { top: '42%', left: '56%', size: 18, opacity: 0.5, delay: 0.4 },
    { top: '48%', left: '44%', size: 12, opacity: 0.8, delay: 0.25 },
    { top: '52%', left: '58%', size: 16, opacity: 0.65, delay: 0.35 },
  ].slice(0, splatterCount || 5);

  // SVG spiral path (hand-drawn style)
  const spiralSVG = `<svg viewBox='0 0 1920 1080' width='100%' height='100%' style='position:absolute;top:0;left:0;'><defs><filter id='roughen'><feTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='2' result='noise'/><feDisplacementMap in='SourceGraphic' in2='noise' scale='3' xChannelSelector='R' yChannelSelector='G'/></filter></defs><path id='spiral-path' d='M 960 540 Q 1100 540 1100 400 Q 1100 260 960 260 Q 820 260 820 400 Q 820 680 1100 680 Q 1380 680 1380 400 Q 1380 120 960 120 Q 540 120 540 540 Q 540 960 960 960' stroke='${spiralColor || '#2d2d2d'}' stroke-width='2' fill='none' filter='url(#roughen)' stroke-linecap='round' stroke-linejoin='round' stroke-dasharray='3000' stroke-dashoffset='3000'/></svg>`;

  // Child components
  const childrenData: RenderableComponentData[] = [
    // Video 1 container (outgoing)
    {
      id: 'video1-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformOrigin: 'center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: 'video1-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: 'video1-shrink-rotate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video1-container'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 720, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Video 2 container (incoming)
    {
      id: 'video2-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformOrigin: 'center',
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration,
        },
      },
      childrenData: [
        {
          id: 'video2-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: 'video2-expand-rotate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video2-container'],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'rotate', val: -720, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Spiral overlay container
    {
      id: 'spiral-overlay-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'spiral-svg-block',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: spiralSVG,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'spiral-stroke-animation-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['spiral-svg-block'],
                ranges: [
                  { key: 'stroke-dashoffset', val: 3000, prog: 0 },
                  { key: 'stroke-dashoffset', val: 0, prog: 1 },
                  { key: 'stroke-width', val: 2, prog: 0 },
                  { key: 'stroke-width', val: 6, prog: 0.5 },
                  { key: 'stroke-width', val: 2, prog: 1 },
                ],
              },
            },
            {
              id: 'spiral-blur-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['spiral-svg-block'],
                ranges: [
                  { key: 'filter', val: 'blur(0px)', prog: 0 },
                  { key: 'filter', val: 'blur(2px)', prog: 0.5 },
                  { key: 'filter', val: 'blur(0px)', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Splatter effects container
    {
      id: 'splatter-effects-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 11,
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: splatterPositions.map((splatter, index) => ({
        id: `splatter-${index + 1}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: createSplatterHTML(splatter.size, splatter.opacity),
          className: 'absolute',
          style: {
            top: splatter.top,
            left: splatter.left,
            transform: 'scale(0)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `splatter-${index + 1}-scale-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: splatter.delay,
              duration: 0.4,
              mode: 'provider',
              targetIds: [`splatter-${index + 1}`],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.2, prog: 0.7 },
                { key: 'scale', val: 0.8, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData)),
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'sketchy-spiral-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'sketchy-spiral-transition',
  title: 'Sketchy Spiral Transition',
  description:
    'Hand-drawn spiral transition that twists videos through a vortex effect with marker-style animation, uneven line thickness, wobbles, and ink splatter effects. Creates a rough, artistic feel as if drawn on paper with a bleeding marker.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'spiral', 'vortex', 'hand-drawn', 'sketchy', 'artistic', 'marker', 'ink-splatter'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.3,
    spiralColor: '#2d2d2d',
    splatterCount: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const sketchySpiralTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
