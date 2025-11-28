/**
 * Perspective Carousel Transition Preset
 *
 * This preset creates a 3D carousel effect where videos appear as cards that rotate
 * with perspective shifts. Videos transition with a receding effect where the outgoing
 * video scales down to 0.7, moves left with rotateY(-25deg), and fades to 0.6 opacity
 * while adding blur (0-4px). The incoming video starts at 0.7 scale on the right with
 * rotateY(25deg) and animates to full scale at center with rotateY(0deg).
 *
 * Features:
 * - **3D Perspective**: Videos appear as cards in 3D space with perspective transforms
 * - **Carousel Rotation**: Smooth rotation effect as cards transition
 * - **Receding Animation**: Outgoing videos scale down and move away with blur
 * - **Entrance Animation**: Incoming videos scale up and rotate into position
 * - **Overlapping Transitions**: 1.2-second overlap between videos for smooth transitions
 * - **Spring-like Easing**: Natural motion with ease-out timing
 *
 * Use cases:
 * - Creating engaging video carousels with 3D effects
 * - Building dynamic presentations with perspective transitions
 * - Adding cinematic card-flip style transitions
 * - Creating product showcases or portfolio videos
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
  videos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL or local path'),
        duration: z
          .number()
          .positive()
          .describe('Duration of the video in seconds'),
        fit: z
          .enum(['contain', 'cover', 'fill', 'none', 'scale-down'])
          .default('cover')
          .optional()
          .describe('How the video should fit within its container'),
      }),
    )
    .min(2)
    .describe('Array of videos to display in carousel (minimum 2)'),
  transitionDuration: z
    .number()
    .positive()
    .default(1.2)
    .describe('Duration of overlap transition between videos in seconds'),
  displayDuration: z
    .number()
    .positive()
    .default(5)
    .describe('Duration each video is displayed at center before transitioning'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { videos, transitionDuration, displayDuration } = params;

  // Calculate total duration: sum of display durations minus overlaps
  const totalDuration =
    videos.length * displayDuration - (videos.length - 1) * transitionDuration;

  const videoComponents: RenderableComponentData[] = [];

  videos.forEach((video, index) => {
    const isFirst = index === 0;
    const isLast = index === videos.length - 1;

    // Calculate start time: each video starts transitionDuration before previous ends
    const startTime = isFirst
      ? 0
      : index * displayDuration - index * transitionDuration;

    // Calculate duration: displayDuration for display + transitionDuration for overlap (except last)
    const videoDuration = isLast
      ? displayDuration
      : displayDuration + transitionDuration;

    const videoId = `carousel-video-${index}`;
    const containerId = `carousel-container-${index}`;

    // Create effects array
    const effects: any[] = [];

    // Incoming animation (except first video)
    if (!isFirst) {
      effects.push({
        id: `${videoId}-incoming-transform`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [containerId],
          ranges: [
            { key: 'translateX', val: 30, prog: 0, unit: '%' },
            { key: 'translateX', val: 0, prog: 1, unit: '%' },
            { key: 'rotateY', val: 25, prog: 0, unit: 'deg' },
            { key: 'rotateY', val: 0, prog: 1, unit: 'deg' },
            { key: 'scale', val: 0.7, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      });

      effects.push({
        id: `${videoId}-incoming-opacity`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [containerId],
          ranges: [
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });
    }

    // Outgoing animation (except last video)
    if (!isLast) {
      const outgoingStart = displayDuration - transitionDuration;

      effects.push({
        id: `${videoId}-outgoing-transform`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [containerId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0, unit: '%' },
            { key: 'translateX', val: -30, prog: 1, unit: '%' },
            { key: 'rotateY', val: 0, prog: 0, unit: 'deg' },
            { key: 'rotateY', val: -25, prog: 1, unit: 'deg' },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.7, prog: 1 },
          ],
        },
      });

      effects.push({
        id: `${videoId}-outgoing-opacity`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [containerId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      });

      effects.push({
        id: `${videoId}-outgoing-blur`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [containerId],
          ranges: [
            { key: 'blur', val: 0, prog: 0, unit: 'px' },
            { key: 'blur', val: 4, prog: 1, unit: 'px' },
          ],
        },
      });
    }

    // Video container with effects
    const videoContainer: RenderableComponentData = {
      id: containerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: videoDuration,
        },
      },
      effects,
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video.src,
            fit: video.fit ?? 'cover',
            className: 'w-full h-full object-cover',
            loop: false,
          },
          context: {
            timing: {
              start: 0,
              duration: video.duration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    videoComponents.push(videoContainer);
  });

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'perspective-carousel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
        style: {
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: videoComponents,
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
  id: 'perspective-carousel-transition',
  title: 'Perspective Carousel Transition',
  description:
    'A 3D carousel transition where videos appear as cards that rotate with perspective shifts. Outgoing videos scale down to 0.7, move left with rotateY(-25deg), and fade to 0.6 opacity while adding blur (0-4px). Incoming videos start at 0.7 scale on the right with rotateY(25deg) and animate to full scale at center. Features 1.2-second overlap with spring-like easing and natural motion blur effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'carousel',
    '3d',
    'perspective',
    'rotation',
    'blur',
    'video',
  ],
  defaultInputParams: {
    videos: [
      {
        src: 'https://example.com/video1.mp4',
        duration: 5,
        fit: 'cover',
      },
      {
        src: 'https://example.com/video2.mp4',
        duration: 5,
        fit: 'cover',
      },
      {
        src: 'https://example.com/video3.mp4',
        duration: 5,
        fit: 'cover',
      },
    ],
    transitionDuration: 1.2,
    displayDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const perspectiveCarouselTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
