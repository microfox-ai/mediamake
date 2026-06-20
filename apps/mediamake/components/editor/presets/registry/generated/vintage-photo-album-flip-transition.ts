/**
 * Vintage Photo Album Flip Transition Preset
 *
 * This preset creates a nostalgic photo album page-flip effect between two videos,
 * treating them as if they were photographs in a physical album. The transition features:
 *
 * - Page flip rotation with Y-axis perspective (1000px depth)
 * - Sepia tone filters that intensify during the transition
 * - Decorative corner holders (static amber-colored triangular elements)
 * - Simultaneous outgoing/incoming video animations with complementary rotations
 * - 1.2-second overlap duration for smooth transitions
 * - Authentic page-flip physics using ease-in-out timing
 *
 * Use cases:
 * - Creating nostalgic memory montages with vintage aesthetics
 * - Building photo album-style video transitions for slideshows
 * - Adding retro visual effects to family/heritage videos
 * - Crafting scrapbook-style video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define preset parameters schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the transition overlap in seconds (page flip duration)'),
  muted: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to mute video audio'),
  playbackRate: z
    .number()
    .optional()
    .default(1)
    .describe('Playback speed multiplier (1 = normal speed)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    muted,
    playbackRate,
  } = params;

  // Calculate total duration (sum of video durations minus overlap)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Create corner holder elements (static decorative triangular corners)
  const cornerHolders: RenderableComponentData[] = [
    // Top-left corner
    {
      id: 'corner-holder-top-left',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute w-8 h-8 bg-amber-700" style="top: 5%; left: 5%; clip-path: polygon(0 0, 100% 0, 0 100%);"></div>',
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,
    // Top-right corner
    {
      id: 'corner-holder-top-right',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute w-8 h-8 bg-amber-700" style="top: 5%; right: 5%; clip-path: polygon(100% 0, 100% 100%, 0 0);"></div>',
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,
    // Bottom-left corner
    {
      id: 'corner-holder-bottom-left',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute w-8 h-8 bg-amber-700" style="bottom: 5%; left: 5%; clip-path: polygon(0 0, 0 100%, 100% 100%);"></div>',
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,
    // Bottom-right corner
    {
      id: 'corner-holder-bottom-right',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute w-8 h-8 bg-amber-700" style="bottom: 5%; right: 5%; clip-path: polygon(100% 0, 100% 100%, 0 100%);"></div>',
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,
  ];

  // Create outgoing video wrapper with transform effect
  const outgoingVideoWrapper: RenderableComponentData = {
    id: 'outgoing-video-wrapper',
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
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-transform-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-wrapper'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.95, prog: 1 },
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -100, unit: '%', prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -25, unit: 'deg', prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-sepia-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'sepia', val: 0, prog: 0 },
            { key: 'sepia', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          muted: muted ?? false,
          playbackRate: playbackRate ?? 1,
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create incoming video wrapper with transform effect
  const incomingVideoWrapper: RenderableComponentData = {
    id: 'incoming-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - overlapDuration,
        duration: incomingVideo.duration + overlapDuration,
      },
    },
    effects: [
      {
        id: 'incoming-transform-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video-wrapper'],
          ranges: [
            { key: 'translateX', val: 100, unit: '%', prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'rotateY', val: 25, unit: 'deg', prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-sepia-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'sepia', val: 0.3, prog: 0 },
            { key: 'sepia', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          muted: muted ?? false,
          playbackRate: playbackRate ?? 1,
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Build root container with all elements
  const rootContainer: RenderableComponentData = {
    id: 'vintage-album-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
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
      outgoingVideoWrapper,
      incomingVideoWrapper,
      ...cornerHolders,
    ] as RenderableComponentData[],
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

// Define preset metadata
const presetMetadata: PresetMetadata = {
  id: 'vintage-photo-album-flip-transition',
  title: 'Vintage Photo Album Flip Transition',
  description:
    'A vintage photo album flip transition where videos are treated like photographs being flipped in a physical album. Features page-flip rotation with Y-axis perspective, sepia tone filters during transition, and decorative corner holders that remain static throughout the transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'photo-album', 'flip', 'nostalgic', 'sepia'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.2,
    muted: false,
    playbackRate: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const vintagePhotoAlbumFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
