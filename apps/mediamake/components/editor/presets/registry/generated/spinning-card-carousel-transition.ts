/**
 * Spinning Card Carousel Transition Preset
 *
 * Creates a 3D spinning card carousel transition where multiple cards rotate around a central axis.
 * The outgoing video rotates out to the left while scaling down (rotateY 0deg to -120deg,
 * translateZ 0 to -200px, scale 1 to 0.8), and the incoming video rotates in from the right
 * (rotateY 120deg to 0deg, translateZ -200px to 0, scale 0.8 to 1).
 *
 * Features:
 * - **3D Perspective**: Uses perspective: 1000px and transformStyle: preserve-3d for realistic depth
 * - **Rotation Effects**: Cards rotate in 3D space with Y-axis rotation
 * - **Depth Positioning**: Cards move along Z-axis for depth effect
 * - **Scale Animation**: Cards scale during rotation for emphasis
 * - **Motion Blur**: CSS blur filters applied during peak rotation (0 to 2px to 0)
 * - **Momentum Easing**: Uses cubic-bezier(0.4, 0, 0.2, 1) for smooth momentum-based motion
 * - **Configurable Overlap**: 0.8-second overlap period between transitions
 *
 * Use cases:
 * - Creating dynamic 3D transitions between video clips
 * - Building carousel-style video presentations
 * - Adding cinematic depth to video transitions
 * - Creating engaging social media content with 3D effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time in seconds for outgoing video'),
      endAt: z
        .number()
        .optional()
        .describe('End time in seconds for outgoing video'),
      playbackRate: z
        .number()
        .optional()
        .describe('Playback rate for outgoing video (default: 1)'),
      fit: z
        .enum(['contain', 'cover', 'fill', 'none', 'scale-down'])
        .optional()
        .describe('Object fit mode for outgoing video (default: cover)'),
      volume: z
        .number()
        .optional()
        .describe('Volume level for outgoing video (0-1, default: 1)'),
    })
    .describe('Configuration for the outgoing video'),

  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time in seconds for incoming video'),
      endAt: z
        .number()
        .optional()
        .describe('End time in seconds for incoming video'),
      playbackRate: z
        .number()
        .optional()
        .describe('Playback rate for incoming video (default: 1)'),
      fit: z
        .enum(['contain', 'cover', 'fill', 'none', 'scale-down'])
        .optional()
        .describe('Object fit mode for incoming video (default: cover)'),
      volume: z
        .number()
        .optional()
        .describe('Volume level for incoming video (0-1, default: 1)'),
    })
    .describe('Configuration for the incoming video'),

  overlapDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the transition overlap in seconds (default: 0.8)'),

  perspective: z
    .number()
    .default(1000)
    .describe('3D perspective value in pixels (default: 1000)'),

  rotationDegrees: z
    .number()
    .default(120)
    .describe('Rotation angle in degrees for the transition (default: 120)'),

  translateZDistance: z
    .number()
    .default(200)
    .describe('Z-axis translation distance in pixels (default: 200)'),

  scaleMin: z
    .number()
    .default(0.8)
    .describe('Minimum scale value during rotation (default: 0.8)'),

  blurMax: z
    .number()
    .default(2)
    .describe('Maximum blur amount in pixels during peak rotation (default: 2)'),
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
    perspective,
    rotationDegrees,
    translateZDistance,
    scaleMin,
    blurMax,
  } = params;

  // Helper function to get video duration
  const getVideoDuration = (video: any): number => {
    if (video.endAt !== undefined && video.startFrom !== undefined) {
      return (video.endAt - video.startFrom) / (video.playbackRate || 1);
    }
    // Default duration if not specified
    return 5;
  };

  const outgoingDuration = getVideoDuration(outgoingVideo);
  const incomingDuration = getVideoDuration(incomingVideo);

  // Calculate total container duration (with overlap)
  const totalDuration = outgoingDuration + incomingDuration - overlapDuration;

  // Calculate timing for incoming video (starts before outgoing ends)
  const incomingStartTime = outgoingDuration - overlapDuration;

  // Create outgoing video with wrapper
  const outgoingCardWrapper: RenderableComponentData = {
    id: 'outgoing-card-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as const,
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom || 0,
          endAt: outgoingVideo.endAt,
          playbackRate: outgoingVideo.playbackRate || 1,
          fit: outgoingVideo.fit || 'cover',
          volume:
            outgoingVideo.volume !== undefined ? outgoingVideo.volume : 1,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Rotation effect: rotateY(0deg) to rotateY(-120deg), translateZ(0) to translateZ(-200px), scale(1) to scale(0.8)
      {
        id: 'outgoing-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-card-wrapper'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -rotationDegrees, prog: 1 },
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: -translateZDistance, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scaleMin, prog: 1 },
          ],
        },
      },
      // Blur effect: 0 to 2px to 0 (peaks at midpoint)
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-card-wrapper'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: blurMax, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video with wrapper
  const incomingCardWrapper: RenderableComponentData = {
    id: 'incoming-card-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as const,
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingDuration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom || 0,
          endAt: incomingVideo.endAt,
          playbackRate: incomingVideo.playbackRate || 1,
          fit: incomingVideo.fit || 'cover',
          volume:
            incomingVideo.volume !== undefined ? incomingVideo.volume : 1,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Rotation effect: rotateY(120deg) to rotateY(0deg), translateZ(-200px) to translateZ(0), scale(0.8) to scale(1)
      {
        id: 'incoming-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-card-wrapper'],
          ranges: [
            { key: 'rotateY', val: rotationDegrees, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'translateZ', val: -translateZDistance, prog: 0 },
            { key: 'translateZ', val: 0, prog: 1 },
            { key: 'scale', val: scaleMin, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Blur effect: 0 to 2px to 0 (peaks at midpoint)
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-card-wrapper'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: blurMax, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'spinning-card-carousel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: `${perspective}px`,
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingCardWrapper, incomingCardWrapper],
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
  id: 'spinning-card-carousel-transition',
  title: 'Spinning Card Carousel Transition',
  description:
    'A 3D spinning card carousel transition where multiple cards rotate around a central axis. The outgoing video rotates out to the left while scaling down (rotateY 0deg to -120deg, translateZ 0 to -200px, scale 1 to 0.8), and the incoming video rotates in from the right (rotateY 120deg to 0deg, translateZ -200px to 0, scale 0.8 to 1). Features depth positioning at different Z planes, motion blur effects during peak rotation using CSS blur filters (0 to 2px to 0), and momentum-based easing with cubic-bezier(0.4, 0, 0.2, 1). Uses a 0.8-second overlap period with perspective: 1000px and transformStyle: preserve-3d for realistic 3D depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    '3d',
    'carousel',
    'rotation',
    'depth',
    'video',
    'motion-blur',
    'perspective',
    'card',
    'spin',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
      playbackRate: 1,
      fit: 'cover',
      volume: 1,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
      playbackRate: 1,
      fit: 'cover',
      volume: 1,
    },
    overlapDuration: 0.8,
    perspective: 1000,
    rotationDegrees: 120,
    translateZDistance: 200,
    scaleMin: 0.8,
    blurMax: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spinningCardCarouselTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
