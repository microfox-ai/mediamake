/**
 * Parallax Depth Slide Transition Preset
 *
 * Creates a parallax slide transition where video scenes break into 3 depth layers
 * (background, midground, foreground) that slide horizontally at different speeds
 * creating a parallax effect.
 *
 * Features:
 * - 3 depth layers per video with different slide speeds (30%, 60%, 100%)
 * - Background layer: scale(1.2), blur(2px), slowest movement (30%)
 * - Midground layer: scale(1.1), medium movement (60%)
 * - Foreground layer: scale(1), fastest movement (100%)
 * - 0.8-second overlap transition with slide animations
 * - Vertical bounce effect (sine wave 0-5px) for organic movement
 * - Opacity fade on edges (0-10% and 90-100% of transition)
 * - Hardware-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Creating dynamic parallax transitions between video clips
 * - Adding depth and dimension to scene changes
 * - Building cinematic video presentations with layered motion
 * - Creating engaging social media content with parallax effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of first video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of second video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video configuration'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of parallax transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total composition duration
  // BaseLayout duration = media1.duration + media2.duration - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Timing calculations
  const video1End = video1.duration;
  const video2Start = video1.duration - transitionDuration;
  const transitionStart = video2Start; // When transition effects begin

  // Helper function to create parallax slide effect ranges
  const createParallaxSlideRanges = (
    direction: 'out' | 'in',
    speed: number, // 0.3 (30%), 0.6 (60%), 1.0 (100%)
    includeBounce: boolean = true,
  ) => {
    const translateXStart = direction === 'out' ? '0%' : '100%';
    const translateXEnd = direction === 'out' ? `-${speed * 100}%` : '0%';

    const ranges: Array<{ key: string; val: any; prog: number }> = [
      { key: 'translateX', val: translateXStart, prog: 0 },
      { key: 'translateX', val: translateXEnd, prog: 1 },
    ];

    // Add vertical bounce (sine wave: 0 -> 5px -> 0)
    if (includeBounce) {
      ranges.push(
        { key: 'translateY', val: '0px', prog: 0 },
        { key: 'translateY', val: '5px', prog: 0.5 },
        { key: 'translateY', val: '0px', prog: 1 },
      );
    }

    return ranges;
  };

  // Helper function to create opacity fade ranges (edges only)
  const createEdgeFadeRanges = (direction: 'out' | 'in') => {
    if (direction === 'out') {
      // Fade out: full opacity -> fade at end (90-100%)
      return [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
      ];
    } else {
      // Fade in: fade at start (0-10%) -> full opacity
      return [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'opacity', val: 1, prog: 1 },
      ];
    }
  };

  // Create Video 1 layers (outgoing)
  const video1Layers: RenderableComponentData[] = [
    // Background layer (z-10, scale 1.2, blur 2px, 30% speed)
    {
      id: 'video1-bg-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 transform-gpu',
          style: {
            zIndex: 10,
            transform: 'scale(1.2)',
            filter: 'blur(2px)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'video1-bg-slide-out',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart, // Relative to this layer's start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video1-bg-layer'],
            ranges: [
              ...createParallaxSlideRanges('out', 0.3),
              ...createEdgeFadeRanges('out'),
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video1-bg-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            muted: true,
            loop: false,
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    },
    // Midground layer (z-20, scale 1.1, 60% speed)
    {
      id: 'video1-mid-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 transform-gpu',
          style: {
            zIndex: 20,
            transform: 'scale(1.1)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'video1-mid-slide-out',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video1-mid-layer'],
            ranges: [
              ...createParallaxSlideRanges('out', 0.6),
              ...createEdgeFadeRanges('out'),
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video1-mid-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            muted: true,
            loop: false,
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    },
    // Foreground layer (z-30, scale 1, 100% speed)
    {
      id: 'video1-fg-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 transform-gpu',
          style: {
            zIndex: 30,
            transform: 'scale(1)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'video1-fg-slide-out',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video1-fg-layer'],
            ranges: [
              ...createParallaxSlideRanges('out', 1.0),
              ...createEdgeFadeRanges('out'),
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video1-fg-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            muted: false, // Main audio from foreground
            loop: false,
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    },
  ];

  // Create Video 2 layers (incoming)
  const video2Layers: RenderableComponentData[] = [
    // Background layer (z-10, scale 1.2, blur 2px, 30% speed)
    {
      id: 'video2-bg-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 transform-gpu',
          style: {
            zIndex: 10,
            transform: 'scale(1.2)',
            filter: 'blur(2px)',
          },
        },
      },
      context: {
        timing: {
          start: video2Start, // Starts during overlap
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'video2-bg-slide-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to video2Start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video2-bg-layer'],
            ranges: [
              ...createParallaxSlideRanges('in', 0.3),
              ...createEdgeFadeRanges('in'),
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video2-bg-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            muted: true,
            loop: false,
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    },
    // Midground layer (z-20, scale 1.1, 60% speed)
    {
      id: 'video2-mid-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 transform-gpu',
          style: {
            zIndex: 20,
            transform: 'scale(1.1)',
          },
        },
      },
      context: {
        timing: {
          start: video2Start,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'video2-mid-slide-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video2-mid-layer'],
            ranges: [
              ...createParallaxSlideRanges('in', 0.6),
              ...createEdgeFadeRanges('in'),
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video2-mid-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            muted: true,
            loop: false,
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    },
    // Foreground layer (z-30, scale 1, 100% speed)
    {
      id: 'video2-fg-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 transform-gpu',
          style: {
            zIndex: 30,
            transform: 'scale(1)',
          },
        },
      },
      context: {
        timing: {
          start: video2Start,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'video2-fg-slide-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video2-fg-layer'],
            ranges: [
              ...createParallaxSlideRanges('in', 1.0),
              ...createEdgeFadeRanges('in'),
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video2-fg-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            muted: false, // Main audio from foreground
            loop: false,
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    },
  ];

  // Combine all layers into single root container
  const rootContainer: RenderableComponentData = {
    id: 'parallax-depth-slide-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...video1Layers, ...video2Layers],
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
  id: 'parallax-depth-slide-transition',
  title: 'Parallax Depth Slide Transition',
  description:
    'Creates a parallax slide transition where video scenes break into 3 depth layers (background, midground, foreground) that slide horizontally at different speeds (30%, 60%, 100%) creating a parallax effect. Features subtle scale, blur, and vertical bounce animations during the 0.8-second overlap for organic movement and depth perception.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'parallax',
    'slide',
    'depth',
    'layered',
    'video',
    'cinematic',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const parallaxDepthSlideTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
