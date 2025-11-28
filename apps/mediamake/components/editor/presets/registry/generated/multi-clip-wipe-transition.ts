/**
 * Multi-Clip Horizontal Wipe Transition Preset
 *
 * This preset creates a minimalist multi-clip video transition system that implements
 * clean horizontal wipe transitions between multiple video clips. Each incoming video
 * slides in from the right using CSS clip-path animations, creating precise geometric
 * transitions with 0.5s overlap periods.
 *
 * Features:
 * - **Clean Horizontal Wipe**: Each video wipes in from right with clip-path animation
 * - **Precise Timing**: 0.5s overlap period between transitions
 * - **Static Outgoing Videos**: Previous videos remain fully visible underneath
 * - **GPU Accelerated**: Uses will-change-transform for smooth performance
 * - **Flexible Configuration**: Supports 3-4 video clips with consistent transitions
 * - **Calculated Duration**: Automatically calculates total duration minus overlaps
 *
 * Use cases:
 * - Creating seamless video montages
 * - Building professional video sequences
 * - Adding smooth geometric transitions between clips
 * - Stitching multiple videos with clean wipes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videoClips: z
    .array(
      z.object({
        src: z.string().describe('Video source URL or local path'),
        duration: z.number().describe('Duration of the video clip in seconds'),
      }),
    )
    .min(3)
    .max(4)
    .describe('Array of 3-4 video clips to stitch together with wipe transitions'),
  transitionDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the wipe transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { videoClips, transitionDuration } = params;

  // Calculate total duration: sum of all video durations minus total overlap time
  const totalVideoDuration = videoClips.reduce(
    (sum, clip) => sum + clip.duration,
    0,
  );
  const numberOfTransitions = videoClips.length - 1;
  const totalOverlapTime = numberOfTransitions * transitionDuration;
  const baseLayoutDuration = totalVideoDuration - totalOverlapTime;

  // Build video components with wipe transitions
  const childrenData: RenderableComponentData[] = videoClips.map(
    (clip, index) => {
      const isFirstVideo = index === 0;

      // Calculate start time (relative to BaseLayout)
      let startTime = 0;
      if (!isFirstVideo) {
        // Start before previous video ends (overlap)
        for (let i = 0; i < index; i++) {
          startTime += videoClips[i].duration;
        }
        startTime -= index * transitionDuration; // Account for cumulative overlaps
      }

      // Create wipe effect for incoming videos (all except first)
      const effects = [];
      if (!isFirstVideo) {
        effects.push({
          id: `wipe-effect-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0, // Relative to video component start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`video-${index + 1}`],
            ranges: [
              { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
              { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
            ],
          },
        });
      }

      return {
        id: `video-${index + 1}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: clip.src,
          className:
            'absolute inset-0 w-full h-full object-cover will-change-transform',
          fit: 'cover',
          style: {
            zIndex: isFirstVideo ? 1 : (index + 1) * 10, // Higher z-index for incoming videos
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: clip.duration,
          },
        },
        effects,
      } as RenderableComponentData;
    },
  );

  const rootContainer: RenderableComponentData = {
    id: 'multi-clip-wipe-container',
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
  id: 'multi-clip-wipe-transition',
  title: 'Multi-Clip Horizontal Wipe Transition',
  description:
    'A minimalist preset that stitches multiple video clips together using clean horizontal wipe transitions. Each incoming video slides in from the right using CSS clip-path animations, creating precise geometric transitions with 0.5s overlap periods. Supports 3-4 video clips with consistent wipe effects between each.',
  type: 'predefined',
  presetType: 'children',
  tags: ['video', 'transition', 'wipe', 'multi-clip', 'geometric', 'minimalist'],
  defaultInputParams: {
    videoClips: [
      {
        src: 'https://example.com/video1.mp4',
        duration: 5,
      },
      {
        src: 'https://example.com/video2.mp4',
        duration: 4,
      },
      {
        src: 'https://example.com/video3.mp4',
        duration: 6,
      },
      {
        src: 'https://example.com/video4.mp4',
        duration: 5,
      },
    ],
    transitionDuration: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const multiClipWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
