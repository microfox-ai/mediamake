/**
 * Brush Stroke Paint Transition Preset
 *
 * This preset creates an artistic painterly video transition where videos crossfade
 * with horizontal brush stroke effects. The outgoing video slides horizontally while
 * fading out, and the incoming video scales up while fading in, creating the illusion
 * of painting one scene over another with bold, expressive strokes.
 *
 * Features:
 * - **Artistic Transition**: Painterly crossfade effect between two videos
 * - **Horizontal Motion**: Outgoing video slides horizontally during transition
 * - **Scale Animation**: Incoming video scales from 95% to 100% for depth
 * - **Configurable Overlap**: 1.5 second transition overlap period (customizable)
 * - **Smooth Easing**: ease-in-out transitions for natural paint stroke feel
 * - **Flexible Duration**: Automatically calculates total duration based on video lengths
 *
 * Use cases:
 * - Creating artistic video transitions with painted aesthetics
 * - Building cinematic crossfades with motion dynamics
 * - Adding expressive transitions between video clips
 * - Implementing creative video montages with painterly effects
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
  video1: z
    .object({
      src: z.string().describe('Source URL of the first (outgoing) video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second (incoming) video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video configuration'),
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap period in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total composition duration
  // Total = video1.duration + video2.duration - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate when incoming video starts (creates overlap)
  const incomingVideoStart = video1.duration - overlapDuration;

  // Calculate when transition effects start for outgoing video
  const transitionStart = video1.duration - overlapDuration;

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (video1)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        muted: false,
        volume: 1,
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Fade out during transition
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Slide horizontally during transition (0 to 100px right)
        {
          id: 'outgoing-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 100, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video (video2)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        muted: false,
        volume: 1,
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: video2.duration,
        },
      },
      effects: [
        // Fade in during transition
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming video start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Scale up during transition (95% to 100%)
        {
          id: 'incoming-scale',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming video start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: 0.95, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'brush-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
  id: 'brush-stroke-paint-transition',
  title: 'Brush Stroke Paint Transition',
  description:
    'A painterly video transition preset where videos crossfade through an artistic brush stroke effect. The outgoing video fades out with a horizontal slide while the incoming video fades in with a scale animation, creating a hand-painted transition feel during a 1.5 second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paint', 'brush-stroke', 'artistic', 'crossfade'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const brushStrokePaintTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
