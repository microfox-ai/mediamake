/**
 * Masking Tape Spiral Peel Transition
 *
 * A continuous strip of aged masking tape spirals outward from the center, initially covering
 * the outgoing video in concentric rectangles. As the spiral unwinds during the 1.6-second
 * transition, it reveals the incoming video underneath with an organic, flowing motion. The
 * tape features aged texture with yellowing edges and wrinkles. The peeling motion accelerates
 * outward, creating a hypnotic unwinding effect.
 *
 * Features:
 * - **Spiral Unwinding Animation**: Tape spiral unwinds from center outward using stroke-dashoffset
 * - **Aged Tape Texture**: Yellowing amber gradient with wrinkles and texture filters
 * - **Accelerating Motion**: Scale, rotation, and opacity animations create hypnotic effect
 * - **Smooth Reveal**: Incoming video fades in as outgoing video is masked by spiral
 * - **Drop Shadow**: Tape has dimensional drop-shadow that fades during animation
 *
 * Use cases:
 * - Creative video transitions with organic, handcrafted feel
 * - Nostalgic or vintage-style video editing
 * - Revealing content in a unique, memorable way
 * - Adding artistic flair to video montages
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      duration: z.number().describe('Duration of the outgoing video in seconds'),
    })
    .describe('Outgoing video (being covered by tape spiral)'),
  media2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of the incoming video in seconds'),
    })
    .describe('Incoming video (revealed as tape unwinds)'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the spiral peel transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate base layout duration (total time minus overlap)
  const baseLayoutDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media source
  const getComponentId = (src: string): string => {
    if (src.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i)) {
      return 'VideoAtom';
    }
    return 'ImageAtom';
  };

  const media1ComponentId = getComponentId(media1.src);
  const media2ComponentId = getComponentId(media2.src);

  // SVG spiral path - concentric rectangles spiraling outward
  const spiralPathD =
    'M 960 540 L 1060 540 L 1060 440 L 860 440 L 860 640 L 1160 640 L 1160 340 L 760 340 L 760 740 L 1260 740 L 1260 240 L 660 240 L 660 840 L 1360 840 L 1360 140 L 560 140 L 560 940 L 1460 940 L 1460 40 L 460 40 L 460 1040 L 1560 1040 L 1560 -60 L 360 -60 L 360 1140 L 1660 1140 L 1660 -160 L 260 -160 L 260 1240 L 1760 1240';

  const pathLength = 15000; // Approximate path length for stroke-dasharray

  // Create SVG HTML with aged tape styling
  const spiralSVG = `<svg viewBox='0 0 1920 1080' xmlns='http://www.w3.org/2000/svg' style='width: 100%; height: 100%;'>
  <defs>
    <linearGradient id='tape-gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' style='stop-color:#FEF3C7;stop-opacity:0.92' />
      <stop offset='50%' style='stop-color:#FDE68A;stop-opacity:0.9' />
      <stop offset='100%' style='stop-color:#FCD34D;stop-opacity:0.88' />
    </linearGradient>
    <filter id='tape-texture'>
      <feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' result='noise'/>
      <feDisplacementMap in='SourceGraphic' in2='noise' scale='2' xChannelSelector='R' yChannelSelector='G'/>
    </filter>
  </defs>
  <path id='spiral-path' d='${spiralPathD}' fill='none' stroke='url(#tape-gradient)' stroke-width='60' stroke-linecap='square' stroke-linejoin='miter' filter='url(#tape-texture)' style='stroke-dasharray: ${pathLength}; stroke-dashoffset: ${pathLength};' />
</svg>`;

  const childrenData: RenderableComponentData[] = [
    // Incoming video (z-0, bottom layer)
    {
      id: 'masking-tape-spiral-incoming-video',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Outgoing video (z-5, middle layer)
    {
      id: 'masking-tape-spiral-outgoing-video',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 5,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Fade out outgoing video during transition
        {
          id: 'masking-tape-spiral-outgoing-fade',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: media1.duration - transitionDuration,
            duration: transitionDuration * 0.8, // Fade faster than full transition
            mode: 'provider',
            targetIds: ['masking-tape-spiral-outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Spiral tape SVG (z-10, top layer)
    {
      id: 'masking-tape-spiral-svg-container',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: spiralSVG,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        // Scale animation (1.0 to 3.0)
        {
          id: 'masking-tape-spiral-scale',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['masking-tape-spiral-svg-container'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 3, prog: 1 },
            ],
          },
        },
        // Rotation animation (0 to 360deg)
        {
          id: 'masking-tape-spiral-rotation',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['masking-tape-spiral-svg-container'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360, prog: 1 },
            ],
          },
        },
        // Opacity fade (0.9 to 0)
        {
          id: 'masking-tape-spiral-opacity',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['masking-tape-spiral-svg-container'],
            ranges: [
              { key: 'opacity', val: 0.9, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'masking-tape-spiral-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'masking-tape-spiral-transition',
  title: 'Masking Tape Spiral Peel Transition',
  description:
    'A continuous strip of aged masking tape spirals outward from the center, initially covering the outgoing video in concentric rectangles. As the spiral unwinds during the 1.6-second transition, it reveals the incoming video underneath with an organic, flowing motion featuring aged texture with yellowing edges and wrinkles. The peeling motion accelerates outward creating a hypnotic unwinding effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'spiral',
    'masking-tape',
    'peel',
    'organic',
    'vintage',
    'aged',
    'creative',
    'reveal',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 5,
    },
    transitionDuration: 1.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const maskingTapeSpiralTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
