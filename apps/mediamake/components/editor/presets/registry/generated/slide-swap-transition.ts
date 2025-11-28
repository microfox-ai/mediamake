/**
 * Slide Swap Transition Preset
 *
 * A dynamic slide-swap transition preset where two video layers slide horizontally 
 * past each other in opposite directions during a 1-second overlap period. The outgoing 
 * video slides left off-screen while the incoming video slides right into view from the 
 * opposite side, creating a 'passing by' effect.
 *
 * Features:
 * - Horizontal slide transitions with opposite directions
 * - 1-second overlap period between videos
 * - Full opacity throughout (no fade effects)
 * - Transform-based animations with ease-out timing
 * - Calculated total duration (sum of video durations minus overlap)
 * - Z-index management for proper layering
 *
 * Use cases:
 * - Creating dynamic video transitions with motion
 * - Building video sequences with passing effects
 * - Professional video montages with directional transitions
 * - Cinematic video compilations
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
      src: z.string().describe('Source URL of the first video (outgoing)'),
      duration: z.number().describe('Duration of the first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second video (incoming)'),
      duration: z.number().describe('Duration of the second video in seconds'),
    })
    .describe('Second video configuration'),
  overlapDuration: z
    .number()
    .default(1)
    .describe('Duration of the overlap/transition period in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate BaseLayout duration: sum of both video durations minus overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate when the overlap period starts
  const transitionStart = video1.duration - overlapDuration;

  // Create outgoing video (slides left, exits screen)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 1,
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
        id: 'slide-left-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionStart, // Start sliding during last second
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-100%', prog: 1 }, // Slide left off-screen
          ],
        },
      },
    ],
  };

  // Create incoming video (slides right, enters screen)
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 10, // Higher z-index to appear on top
        transform: 'translateX(100%)', // Start off-screen to the right
      },
    },
    context: {
      timing: {
        start: transitionStart, // Start at beginning of overlap
        duration: video2.duration,
      },
    },
    effects: [
      {
        id: 'slide-right-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateX', val: '100%', prog: 0 }, // Start off-screen right
            { key: 'translateX', val: '0%', prog: 1 }, // Slide into view
          ],
        },
      },
    ],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'slide-swap-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          overflow: 'hidden', // Hide videos when they slide off-screen
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo],
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
  id: 'slide-swap-transition',
  title: 'Slide Swap Transition',
  description:
    'A dynamic slide-swap transition preset where two video layers slide horizontally past each other in opposite directions during a 1-second overlap period. The outgoing video slides left off-screen while the incoming video slides right into view, creating a "passing by" effect with smooth ease-out motion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'slide', 'swap', 'horizontal'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const slideSwapTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
