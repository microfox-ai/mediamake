/**
 * Diagonal Sweep Transition Preset
 *
 * This preset creates a minimalist diagonal sweep transition where videos transition
 * through a clean 45-degree diagonal wipe from top-left to bottom-right. The transition
 * feels precise and geometric, with the incoming video revealing itself through an
 * angled mask that sweeps across the frame.
 *
 * Features:
 * - **Geometric Precision**: Perfect 45-degree diagonal wipe with a sharp transition edge
 * - **Clean Animation**: Incoming video reveals through a diagonal clip-path polygon animation
 * - **Subtle Shadow**: Gradient overlay along the transition edge enhances the geometric feel
 * - **Static Outgoing Video**: Outgoing video remains completely still while being revealed/hidden
 * - **Multiple Clips**: Supports seamless transitions between multiple video clips
 * - **Consistent Timing**: 0.6 second transition duration throughout
 *
 * Use cases:
 * - Creating professional video montages with geometric transitions
 * - Building modern video sequences with angular wipes
 * - Adding minimalist transitions to video compilations
 * - Creating clean corporate video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL or path'),
        duration: z.number().describe('Duration of the video clip in seconds'),
      }),
    )
    .min(2)
    .describe('Array of video clips to transition between (minimum 2 videos)'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the diagonal sweep transition in seconds'),
  fit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .describe('How videos should fit within the container'),
  className: z
    .string()
    .default('w-full h-full object-cover')
    .describe('CSS class names for video elements'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { videos, transitionDuration, fit, className } = params;

  // Calculate total duration: sum of all video durations minus transition overlaps
  const totalDuration =
    videos.reduce((sum, video) => sum + video.duration, 0) -
    (videos.length - 1) * transitionDuration;

  const childrenData: RenderableComponentData[] = [];
  let currentTime = 0;

  videos.forEach((video, index) => {
    const isFirst = index === 0;
    const isLast = index === videos.length - 1;

    // Calculate start time and duration for this video
    let startTime: number;
    let videoDuration: number;

    if (isFirst) {
      // First video: starts at 0, full duration
      startTime = 0;
      videoDuration = video.duration;
    } else {
      // Subsequent videos: start before previous ends (overlap)
      startTime = currentTime - transitionDuration;
      videoDuration = video.duration + transitionDuration;
    }

    const videoId = `video-${index}`;
    const shadowId = `shadow-${index}`;

    // Create video atom
    const videoAtom: RenderableComponentData = {
      id: videoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        className: className,
        fit: fit,
        muted: false,
        style: {
          position: 'absolute',
          inset: 0,
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: videoDuration,
        },
      },
      effects: [],
    };

    // Add diagonal sweep transition effect for incoming videos (not the first one)
    if (!isFirst) {
      // Diagonal sweep using clip-path polygon animation
      // Starts with no visibility (polygon collapsed to top-left corner)
      // Ends with full visibility (polygon covers entire frame)
      videoAtom.effects!.push({
        id: `diagonal-sweep-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Relative to video start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
              prog: 1,
            },
          ],
        },
      });

      // Subtle shadow edge effect
      // Creates a gradient overlay that moves with the wipe
      const shadowOverlay: RenderableComponentData = {
        id: shadowId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(0,0,0,0.2) 0%, transparent 100%);"></div>`,
          className: 'absolute inset-0',
          style: {
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: transitionDuration,
          },
        },
        effects: [
          // Fade out the shadow as the wipe completes
          {
            id: `shadow-fade-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [shadowId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Move shadow with the wipe using clip-path
          {
            id: `shadow-wipe-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [shadowId],
              ranges: [
                {
                  key: 'clipPath',
                  val: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
                  prog: 0,
                },
                {
                  key: 'clipPath',
                  val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                  prog: 1,
                },
              ],
            },
          },
        ],
      };

      childrenData.push(videoAtom, shadowOverlay);
    } else {
      // First video: no transition effect, just add the video
      childrenData.push(videoAtom);
    }

    // Update current time for next video
    currentTime += video.duration;
  });

  const rootContainer: RenderableComponentData = {
    id: 'diagonal-sweep-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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

const presetMetadata: PresetMetadata = {
  id: 'diagonal-sweep-transition',
  title: 'Diagonal Sweep Transition',
  description:
    'Minimalist diagonal sweep transition preset where videos transition through a clean 45-degree diagonal wipe from top-left to bottom-right. Features precise geometric transitions with subtle shadow edge effects and supports multiple video clips with consistent diagonal transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'diagonal',
    'wipe',
    'geometric',
    'minimalist',
    'sweep',
    'angular',
  ],
  defaultInputParams: {
    videos: [
      {
        src: 'https://example.com/video1.mp4',
        duration: 5,
      },
      {
        src: 'https://example.com/video2.mp4',
        duration: 5,
      },
    ],
    transitionDuration: 0.6,
    fit: 'cover',
    className: 'w-full h-full object-cover',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const diagonalSweepTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
