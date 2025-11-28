/**
 * Square Spiral Transition Preset
 *
 * This preset creates a minimalist square spiral transition where the video frame
 * appears to twist into a spiral of shrinking squares, revealing the next video beneath.
 * 
 * Features:
 * - **Nested Squares**: 6-8 nested squares that scale down and rotate
 * - **Staggered Animation**: Each square has a timing offset creating a cascading effect
 * - **Rotation Effect**: Each square rotates 180 degrees while scaling down
 * - **Depth Effect**: Opacity increases as squares shrink, creating a tunnel effect
 * - **Clean Edges**: Sharp corners maintained throughout the spiral motion
 * - **Smooth Transition**: 1.0 second transition duration with eased animations
 *
 * Use cases:
 * - Creating dynamic video transitions with a geometric aesthetic
 * - Building visually engaging content transitions
 * - Adding professional spiral effects between video clips
 * - Creating hypnotic, attention-grabbing scene changes
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
        .describe('Start time in seconds for the outgoing video'),
    })
    .describe('Outgoing video that spirals away'),
  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time in seconds for the incoming video'),
    })
    .describe('Incoming video that appears beneath the spiral'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition in seconds'),
  numberOfSquares: z
    .number()
    .min(6)
    .max(8)
    .default(8)
    .describe('Number of nested squares in the spiral (6-8)'),
  scaleRatio: z
    .number()
    .default(0.85)
    .describe('Scale ratio between consecutive squares (default: 0.85)'),
  timingOffset: z
    .number()
    .default(0.15)
    .describe('Timing offset between squares in seconds (default: 0.15)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    numberOfSquares,
    scaleRatio,
    timingOffset,
  } = params;

  // Helper: Calculate square dimensions for each nested level
  const calculateSquareDimensions = (index: number): number => {
    return Math.pow(scaleRatio, index) * 100;
  };

  // Helper: Calculate opacity for depth effect
  const calculateOpacity = (index: number): number => {
    return 0.3 + index * 0.1;
  };

  // Build nested square wrappers
  const squareWrappers: RenderableComponentData[] = [];

  for (let i = 0; i < numberOfSquares; i++) {
    const dimensions = calculateSquareDimensions(i);
    const baseOpacity = calculateOpacity(i);
    const effectStart = -timingOffset * i;
    const effectDuration = transitionDuration + timingOffset * i;

    const squareWrapper: RenderableComponentData = {
      id: `square-wrapper-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            width: `${dimensions}%`,
            height: `${dimensions}%`,
            transformOrigin: 'center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `square-${i}-transform`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: effectStart,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [`square-wrapper-${i}`],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 180, prog: 1 },
            ],
          },
        },
        {
          id: `square-${i}-opacity`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`square-wrapper-${i}`],
            ranges: [
              { key: 'opacity', val: baseOpacity, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `square-${i}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            fit: 'cover',
            startFrom: outgoingVideo.startFrom || 0,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    squareWrappers.push(squareWrapper);
  }

  // Build the complete composition
  const rootContainer: RenderableComponentData = {
    id: 'square-spiral-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Incoming video as background (z-0)
      {
        id: 'incoming-video-background',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          fit: 'cover',
          startFrom: incomingVideo.startFrom || 0,
          className: 'absolute inset-0 z-0',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // All nested square wrappers
      ...squareWrappers,
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
  id: 'square-spiral-transition',
  title: 'Square Spiral Transition',
  description:
    'A minimalist transition effect where the video frame twists into a spiral of shrinking, rotating squares. Creates a tunnel-like depth effect as nested squares scale down to 85% and rotate 45 degrees from the previous square, with staggered timing and opacity changes revealing the next video beneath.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'spiral', 'geometric', 'video', 'rotation', 'depth'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.0,
    numberOfSquares: 8,
    scaleRatio: 0.85,
    timingOffset: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const squareSpiralTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
