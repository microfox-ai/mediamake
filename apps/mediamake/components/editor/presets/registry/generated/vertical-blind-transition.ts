/**
 * Vertical Blind Transition Preset
 *
 * This preset creates a minimalist vertical blind transition effect between multiple video clips.
 * Videos transition through clean vertical strips that slide upward with staggered delays,
 * creating a venetian blind reveal effect.
 *
 * Features:
 * - **Vertical Strip Reveal**: Divides incoming video into 5-8 vertical strips using clip-path
 * - **Staggered Animation**: Each strip slides up with a 0.05s delay between strips
 * - **Smooth Transitions**: 0.8s total transition duration with sequential animations
 * - **Clean Edge Masking**: Precise clip-path for professional vertical divisions
 * - **GPU-Accelerated**: Uses transform-gpu for optimal performance
 * - **Multiple Video Support**: Works seamlessly with 2+ video clips
 * - **Background Persistence**: Outgoing video remains visible through gaps during transition
 *
 * Use cases:
 * - Creating professional video montages with blind transitions
 * - Building dynamic presentations with vertical reveal effects
 * - Adding cinematic transitions to video sequences
 * - Creating social media content with sophisticated transitions
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
        src: z.string().describe('Video source URL or local path'),
        duration: z.number().describe('Duration of the video in seconds'),
      }),
    )
    .min(2)
    .describe('Array of video clips to stitch together with blind transitions'),
  stripCount: z
    .number()
    .min(5)
    .max(8)
    .default(5)
    .describe('Number of vertical strips to divide incoming video into'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Total duration of transition overlap in seconds'),
  stripDelay: z
    .number()
    .default(0.05)
    .describe('Delay between each strip animation in seconds'),
  stripAnimationDuration: z
    .number()
    .default(0.3)
    .describe('Duration of individual strip slide animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videos,
    stripCount,
    transitionDuration,
    stripDelay,
    stripAnimationDuration,
  } = params;

  // Helper function to create vertical strip clip-path
  const createStripClipPath = (index: number, total: number): string => {
    const stripWidth = 100 / total; // Width percentage of each strip
    const leftPosition = index * stripWidth;
    const rightPosition = 100 - leftPosition - stripWidth;
    return `inset(0 ${rightPosition}% 0 ${leftPosition}%)`;
  };

  // Calculate total composition duration
  const totalDuration = videos.reduce((sum, video, index) => {
    if (index === 0) return video.duration;
    return sum + video.duration - transitionDuration;
  }, 0);

  const childrenData: RenderableComponentData[] = [];

  videos.forEach((video, videoIndex) => {
    const isFirstVideo = videoIndex === 0;
    const isLastVideo = videoIndex === videos.length - 1;

    // Calculate start time for this video
    let videoStartTime = 0;
    for (let i = 0; i < videoIndex; i++) {
      videoStartTime += videos[i].duration;
      if (i > 0) videoStartTime -= transitionDuration;
    }

    // Outgoing video (full frame, fades out during transition)
    const outgoingVideoId = `outgoing-video-${videoIndex}`;
    childrenData.push({
      id: outgoingVideoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        className: 'absolute inset-0 w-full h-full object-cover transform-gpu',
        fit: 'cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: videoStartTime,
          duration: video.duration,
        },
      },
    } as RenderableComponentData);

    // Create transition to next video (if not last video)
    if (!isLastVideo) {
      const nextVideo = videos[videoIndex + 1];
      const transitionStartTime =
        videoStartTime + video.duration - transitionDuration;

      // Create vertical blind strips for incoming video
      for (let stripIndex = 0; stripIndex < stripCount; stripIndex++) {
        const stripId = `blind-strip-${videoIndex}-to-${videoIndex + 1}-strip-${stripIndex}`;
        const stripStartDelay = stripIndex * stripDelay;
        const stripZIndex = 10 + stripIndex * 10;

        childrenData.push({
          id: stripId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: nextVideo.src,
            className: 'absolute inset-0 w-full h-full object-cover transform-gpu',
            fit: 'cover',
            style: {
              clipPath: createStripClipPath(stripIndex, stripCount),
              zIndex: stripZIndex,
            },
          },
          context: {
            timing: {
              start: transitionStartTime,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: `${stripId}-slide-effect`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: stripStartDelay,
                duration: stripAnimationDuration,
                mode: 'provider',
                targetIds: [stripId],
                ranges: [
                  { key: 'translateY', val: '100%', prog: 0 },
                  { key: 'translateY', val: '0%', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }

      // Full incoming video (appears after transition completes)
      const incomingVideoId = `incoming-video-${videoIndex + 1}`;
      const incomingVideoStartTime = transitionStartTime + transitionDuration;

      childrenData.push({
        id: incomingVideoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: nextVideo.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          style: {
            zIndex: 0,
          },
        },
        context: {
          timing: {
            start: incomingVideoStartTime,
            duration: nextVideo.duration - transitionDuration,
          },
        },
      } as RenderableComponentData);
    }
  });

  const rootContainer: RenderableComponentData = {
    id: 'vertical-blind-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
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
  id: 'vertical-blind-transition',
  title: 'Vertical Blind Transition',
  description:
    'A minimalist vertical blind transition preset for multiple video clips, where videos transition through clean vertical strips that slide upward with staggered delays, creating a venetian blind reveal effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vertical', 'blind', 'video', 'strips', 'reveal'],
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
      {
        src: 'https://example.com/video3.mp4',
        duration: 5,
      },
    ],
    stripCount: 5,
    transitionDuration: 0.8,
    stripDelay: 0.05,
    stripAnimationDuration: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const verticalBlindTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};