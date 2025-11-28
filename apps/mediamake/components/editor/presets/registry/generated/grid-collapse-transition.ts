/**
 * Dynamic Split-Screen Grid Collapse Transition Preset
 *
 * This preset creates a sophisticated grid-to-fullscreen transition effect. It starts with a 2x2 grid
 * of four videos playing simultaneously, then collapses into a single fullscreen video through a
 * coordinated scale-and-slide animation.
 *
 * Features:
 * - **2x2 Grid Layout**: Four videos positioned in quadrants with absolute positioning
 * - **Coordinated Collapse Animation**: Three videos scale down, slide outward diagonally, fade, and blur
 * - **Featured Video Scale-Up**: Bottom-right video scales from quarter-screen to fullscreen
 * - **Smooth Easing**: Uses easeInOutCubic timing for organic "breathing out" feel
 * - **Configurable Timing**: Adjustable grid display time, featured duration, and transition overlap
 * - **Blur Effect**: Non-featured videos blur out during collapse
 *
 * Use cases:
 * - Multi-speaker video transitions (conference calls, panels)
 * - Video gallery to featured content transitions
 * - Dynamic video storytelling with focus shifts
 * - Cinematic multi-camera to single-camera transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL for top-left video'),
    muted: z.boolean().default(false).describe('Mute top-left video audio'),
    volume: z.number().min(0).max(1).default(1).describe('Volume for top-left video (0-1)'),
  }).describe('Top-left video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL for top-right video'),
    muted: z.boolean().default(false).describe('Mute top-right video audio'),
    volume: z.number().min(0).max(1).default(1).describe('Volume for top-right video (0-1)'),
  }).describe('Top-right video configuration'),
  
  video3: z.object({
    src: z.string().describe('Source URL for bottom-left video'),
    muted: z.boolean().default(false).describe('Mute bottom-left video audio'),
    volume: z.number().min(0).max(1).default(1).describe('Volume for bottom-left video (0-1)'),
  }).describe('Bottom-left video configuration'),
  
  video4: z.object({
    src: z.string().describe('Source URL for bottom-right video (featured)'),
    muted: z.boolean().default(false).describe('Mute featured video audio'),
    volume: z.number().min(0).max(1).default(1).describe('Volume for featured video (0-1)'),
  }).describe('Bottom-right featured video configuration'),
  
  gridDisplayTime: z.number().min(1).default(5).describe('Duration to display 2x2 grid before collapse (seconds)'),
  
  featuredVideoDuration: z.number().min(1).default(10).describe('Duration of featured video after collapse (seconds)'),
  
  overlapDuration: z.number().min(0.5).max(3).default(1.5).describe('Duration of collapse transition overlap (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, video3, video4, gridDisplayTime, featuredVideoDuration, overlapDuration } = params;

  // Calculate total duration: grid display + featured video - overlap
  const totalDuration = gridDisplayTime + featuredVideoDuration - overlapDuration;

  // Calculate durations for each video
  const nonFeaturedDuration = gridDisplayTime + overlapDuration;
  const featuredDuration = gridDisplayTime - overlapDuration + featuredVideoDuration;

  // Collapse transition starts when grid ends
  const collapseStartTime = gridDisplayTime;

  // Create video components with grid positioning
  const video1Component: RenderableComponentData = {
    id: 'video1-container',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      muted: video1.muted,
      volume: video1.volume,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: nonFeaturedDuration,
      },
    },
    effects: [
      {
        id: 'video1-collapse-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: collapseStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['video1-container'],
          ranges: [
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            // Scale down
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.5, prog: 1 },
            // Translate diagonally up-left
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -200, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -200, prog: 1 },
            // Blur out
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 1 },
          ],
        },
      },
    ],
  };

  const video2Component: RenderableComponentData = {
    id: 'video2-container',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      muted: video2.muted,
      volume: video2.volume,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: nonFeaturedDuration,
      },
    },
    effects: [
      {
        id: 'video2-collapse-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: collapseStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['video2-container'],
          ranges: [
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            // Scale down
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.5, prog: 1 },
            // Translate diagonally up-right
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 200, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -200, prog: 1 },
            // Blur out
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 1 },
          ],
        },
      },
    ],
  };

  const video3Component: RenderableComponentData = {
    id: 'video3-container',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video3.src,
      muted: video3.muted,
      volume: video3.volume,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: nonFeaturedDuration,
      },
    },
    effects: [
      {
        id: 'video3-collapse-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: collapseStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['video3-container'],
          ranges: [
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            // Scale down
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.5, prog: 1 },
            // Translate diagonally down-left
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -200, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 200, prog: 1 },
            // Blur out
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 1 },
          ],
        },
      },
    ],
  };

  const video4Component: RenderableComponentData = {
    id: 'video4-container',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video4.src,
      muted: video4.muted,
      volume: video4.volume,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: featuredDuration,
      },
    },
    effects: [
      {
        id: 'video4-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: collapseStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['video4-container'],
          ranges: [
            // Scale up from quarter to full
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 2, prog: 1 },
            // Translate to center (from bottom-right quadrant origin)
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: '-25%', prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: '-25%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Wrap videos in positioned containers for grid layout
  const positionedVideo1: RenderableComponentData = {
    id: 'positioned-video1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-0 left-0 w-1/2 h-1/2',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: nonFeaturedDuration,
      },
    },
    childrenData: [video1Component],
  };

  const positionedVideo2: RenderableComponentData = {
    id: 'positioned-video2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-0 right-0 w-1/2 h-1/2',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: nonFeaturedDuration,
      },
    },
    childrenData: [video2Component],
  };

  const positionedVideo3: RenderableComponentData = {
    id: 'positioned-video3',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-0 left-0 w-1/2 h-1/2',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: nonFeaturedDuration,
      },
    },
    childrenData: [video3Component],
  };

  const positionedVideo4: RenderableComponentData = {
    id: 'positioned-video4',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-0 right-0 w-1/2 h-1/2',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: featuredDuration,
      },
    },
    childrenData: [video4Component],
  };

  // Root container with all positioned videos
  const rootContainer: RenderableComponentData = {
    id: 'grid-collapse-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [
      positionedVideo1,
      positionedVideo2,
      positionedVideo3,
      positionedVideo4,
    ],
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
  id: 'grid-collapse-transition',
  title: 'Dynamic Split-Screen Grid Collapse Transition',
  description: 'Starts with a 2x2 grid of four videos playing simultaneously, then collapses into a single fullscreen video through coordinated scale-and-slide animation. During transition, three non-featured videos scale down, slide outward diagonally, and fade with blur while the featured video scales up to fullscreen.',
  type: 'predefined',
  presetType: 'children',
  tags: ['video', 'grid', 'transition', 'collapse', 'split-screen', 'multi-video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      muted: false,
      volume: 1,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      muted: false,
      volume: 1,
    },
    video3: {
      src: 'https://example.com/video3.mp4',
      muted: false,
      volume: 1,
    },
    video4: {
      src: 'https://example.com/video4.mp4',
      muted: false,
      volume: 1,
    },
    gridDisplayTime: 5,
    featuredVideoDuration: 10,
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const gridCollapseTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
