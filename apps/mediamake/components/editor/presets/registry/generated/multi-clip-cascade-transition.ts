/**
 * Multi-Clip Sequential Cascade Transition Preset
 *
 * This preset creates a dynamic transition effect where multiple video clips slide in from different
 * directions (left, right, top, bottom) like cards being dealt, creating a fast-paced montage effect.
 * Each video overlaps the previous by 500ms, building up to a final video that remains as the main content.
 *
 * Features:
 * - **Sequential Cascade**: Videos slide in one after another with 500ms overlaps
 * - **Multi-Directional Slides**: First from left, then right, then top, then bottom
 * - **Scale & Blur Effects**: Adds depth and motion blur during slide animations
 * - **Asymmetric Layout**: Different aspect ratios and sizes create editorial-style layout
 * - **Bounce Easing**: Cubic-bezier easing for dynamic, bouncy slide-in effects
 * - **Z-Index Layering**: Each video layers on top of previous (1, 2, 3, 4, 5)
 *
 * Use cases:
 * - Creating dynamic video montages with sequential reveals
 * - Building editorial-style video collages
 * - Fast-paced content transitions for social media
 * - Multi-clip storytelling with overlapping timelines
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
  video1Src: z.string().describe('Source URL for first video (slides from left)'),
  video2Src: z.string().describe('Source URL for second video (slides from right)'),
  video3Src: z.string().describe('Source URL for third video (slides from top)'),
  video4Src: z.string().describe('Source URL for fourth video (slides from bottom)'),
  video5Src: z.string().describe('Source URL for final video (fades in)'),
  
  video1Duration: z.number().default(2).describe('Duration of first video clip in seconds'),
  video2Duration: z.number().default(2).describe('Duration of second video clip in seconds'),
  video3Duration: z.number().default(2).describe('Duration of third video clip in seconds'),
  video4Duration: z.number().default(2).describe('Duration of fourth video clip in seconds'),
  video5Duration: z.number().default(5).describe('Duration of final video in seconds'),
  
  overlapDuration: z.number().default(0.5).describe('Overlap duration between videos in seconds'),
  slideAnimationDuration: z.number().default(1).describe('Duration of slide-in animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1Src,
    video2Src,
    video3Src,
    video4Src,
    video5Src,
    video1Duration,
    video2Duration,
    video3Duration,
    video4Duration,
    video5Duration,
    overlapDuration,
    slideAnimationDuration,
  } = params;

  // Calculate timing for each video with 500ms overlaps
  const video1Start = 0;
  const video2Start = video1Start + video1Duration - overlapDuration;
  const video3Start = video2Start + video2Duration - overlapDuration;
  const video4Start = video3Start + video3Duration - overlapDuration;
  const video5Start = video4Start + video4Duration - overlapDuration;
  
  // Total duration
  const totalDuration = video5Start + video5Duration;

  // Bounce easing cubic-bezier
  const bounceEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  const childrenData: RenderableComponentData[] = [
    // Video 1: Slide from left (top-left, w-2/3 h-2/3, z-index 1)
    {
      id: 'video-1-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-0 left-0 w-2/3 h-2/3',
          style: {
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: video1Start,
          duration: video1Duration,
        },
      },
      effects: [
        {
          id: 'video-1-slide-effect',
          componentId: 'generic',
          data: {
            type: bounceEasing,
            start: 0,
            duration: slideAnimationDuration,
            mode: 'provider',
            targetIds: ['video-1-container'],
            ranges: [
              { key: 'translateX', val: -100, prog: 0, unit: '%' },
              { key: 'translateX', val: 0, prog: 1, unit: '%' },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'filter', val: 'blur(4px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 0.8 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video-1-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1Src,
            fit: 'cover',
            muted: false,
            loop: false,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video1Duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Video 2: Slide from right (bottom-right, w-1/2 h-1/2, z-index 2)
    {
      id: 'video-2-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bottom-0 right-0 w-1/2 h-1/2',
          style: {
            zIndex: 2,
          },
        },
      },
      context: {
        timing: {
          start: video2Start,
          duration: video2Duration,
        },
      },
      effects: [
        {
          id: 'video-2-slide-effect',
          componentId: 'generic',
          data: {
            type: bounceEasing,
            start: 0,
            duration: slideAnimationDuration,
            mode: 'provider',
            targetIds: ['video-2-container'],
            ranges: [
              { key: 'translateX', val: 100, prog: 0, unit: '%' },
              { key: 'translateX', val: 0, prog: 1, unit: '%' },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'filter', val: 'blur(4px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 0.8 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video-2-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2Src,
            fit: 'cover',
            muted: false,
            loop: false,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2Duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Video 3: Slide from top (top-right, w-1/3 h-full, z-index 3)
    {
      id: 'video-3-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-0 right-0 w-1/3 h-full',
          style: {
            zIndex: 3,
          },
        },
      },
      context: {
        timing: {
          start: video3Start,
          duration: video3Duration,
        },
      },
      effects: [
        {
          id: 'video-3-slide-effect',
          componentId: 'generic',
          data: {
            type: bounceEasing,
            start: 0,
            duration: slideAnimationDuration,
            mode: 'provider',
            targetIds: ['video-3-container'],
            ranges: [
              { key: 'translateY', val: -100, prog: 0, unit: '%' },
              { key: 'translateY', val: 0, prog: 1, unit: '%' },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'filter', val: 'blur(4px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 0.8 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video-3-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video3Src,
            fit: 'cover',
            muted: false,
            loop: false,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video3Duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Video 4: Slide from bottom (bottom-left, w-1/2 h-1/3, z-index 4)
    {
      id: 'video-4-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bottom-0 left-0 w-1/2 h-1/3',
          style: {
            zIndex: 4,
          },
        },
      },
      context: {
        timing: {
          start: video4Start,
          duration: video4Duration,
        },
      },
      effects: [
        {
          id: 'video-4-slide-effect',
          componentId: 'generic',
          data: {
            type: bounceEasing,
            start: 0,
            duration: slideAnimationDuration,
            mode: 'provider',
            targetIds: ['video-4-container'],
            ranges: [
              { key: 'translateY', val: 100, prog: 0, unit: '%' },
              { key: 'translateY', val: 0, prog: 1, unit: '%' },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'filter', val: 'blur(4px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 0.8 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video-4-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video4Src,
            fit: 'cover',
            muted: false,
            loop: false,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video4Duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Video 5: Final video (fades in, covers entire screen, z-index 5)
    {
      id: 'video-5-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 5,
          },
        },
      },
      context: {
        timing: {
          start: video5Start,
          duration: video5Duration,
        },
      },
      effects: [
        {
          id: 'video-5-fade-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: slideAnimationDuration,
            mode: 'provider',
            targetIds: ['video-5-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'video-5-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video5Src,
            fit: 'cover',
            muted: false,
            loop: false,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video5Duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'multi-clip-cascade-container',
    type: 'layout',
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
  id: 'multi-clip-cascade-transition',
  title: 'Multi-Clip Sequential Cascade Transition',
  description:
    'A dynamic transition preset that handles 4-5 video clips sliding in from different directions (left, right, top, bottom) creating a fast-paced montage effect. Videos slide in sequentially with 500ms overlaps, each with scale and motion blur effects during animation. Creates an asymmetric editorial layout during the transition phase before settling into the final video. Uses cubic-bezier bounce easing with z-index layering.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'cascade',
    'multi-clip',
    'montage',
    'sequential',
    'slide',
    'editorial',
    'dynamic',
  ],
  defaultInputParams: {
    video1Src: 'https://example.com/video1.mp4',
    video2Src: 'https://example.com/video2.mp4',
    video3Src: 'https://example.com/video3.mp4',
    video4Src: 'https://example.com/video4.mp4',
    video5Src: 'https://example.com/video5.mp4',
    video1Duration: 2,
    video2Duration: 2,
    video3Duration: 2,
    video4Duration: 2,
    video5Duration: 5,
    overlapDuration: 0.5,
    slideAnimationDuration: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const multiClipCascadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
