/**
 * Geometric Shape Wipe Transition
 *
 * A video transition preset featuring animated triangular shapes that grow from the corners
 * of the frame, creating a diamond-shaped reveal pattern. Uses CSS clip-path animations
 * to reveal the incoming video through expanding geometric cutouts.
 *
 * Features:
 * - **Triangular Corner Masks**: Four triangular shapes that expand from each corner
 * - **Diamond Reveal Pattern**: Creates a centered diamond-shaped reveal effect
 * - **Smooth Animations**: Uses easeInOutCubic timing for precise geometric motion
 * - **Scale Effect**: Subtle scale animation (0.95 to 1.0) on incoming video for depth
 * - **Sharp Edges**: No blur or feathering - clean geometric precision
 * - **Configurable Overlap**: Adjustable transition duration (default 1.5s)
 *
 * Use cases:
 * - Creating dramatic video transitions with geometric patterns
 * - Building dynamic video sequences with clean reveals
 * - Adding professional geometric wipe effects between clips
 * - Creating visually striking video montages
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
    .describe('First video (outgoing)'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second video (incoming)'),
      duration: z.number().describe('Duration of the second video in seconds'),
    })
    .describe('Second video (incoming)'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate timing for incoming video (starts before video1 ends)
  const incomingVideoStart = video1.duration - transitionDuration;

  // Create outgoing video (video1)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
  };

  // Create incoming video container with diamond clip-path
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        },
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-video-scale',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'scale', val: 0.95, prog: 0 },
                { key: 'scale', val: 1.0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'diamond-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              prog: 0.5,
            },
            {
              key: 'clipPath',
              val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Create triangular masks for each corner (visual effect only)
  const createTriangleMask = (
    id: string,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  ): RenderableComponentData => {
    const positionStyles: Record<string, any> = {
      'top-left': {
        top: '0',
        left: '0',
        clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)',
        transformOrigin: 'top left',
      },
      'top-right': {
        top: '0',
        right: '0',
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%)',
        transformOrigin: 'top right',
      },
      'bottom-left': {
        bottom: '0',
        left: '0',
        clipPath: 'polygon(0% 0%, 0% 100%, 100% 100%)',
        transformOrigin: 'bottom left',
      },
      'bottom-right': {
        bottom: '0',
        right: '0',
        clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)',
        transformOrigin: 'bottom right',
      },
    };

    return {
      id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '50%',
            height: '50%',
            zIndex: 30,
            backgroundColor: 'transparent',
            pointerEvents: 'none',
            ...positionStyles[position],
          },
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${id}-scale`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.5, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };
  };

  // Create all four corner masks
  const triangleMaskTL = createTriangleMask('triangle-mask-tl', 'top-left');
  const triangleMaskTR = createTriangleMask('triangle-mask-tr', 'top-right');
  const triangleMaskBL = createTriangleMask(
    'triangle-mask-bl',
    'bottom-left',
  );
  const triangleMaskBR = createTriangleMask(
    'triangle-mask-br',
    'bottom-right',
  );

  // Assemble the root container
  const rootContainer: RenderableComponentData = {
    id: 'geometric-wipe-root',
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
    childrenData: [
      outgoingVideo,
      incomingVideoContainer,
      triangleMaskTL,
      triangleMaskTR,
      triangleMaskBL,
      triangleMaskBR,
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
  id: 'geometric-shape-wipe-transition',
  title: 'Geometric Shape Wipe Transition',
  description:
    'A video transition preset featuring animated triangular shapes that grow from the corners of the frame, creating a diamond-shaped reveal pattern with sharp geometric precision',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'geometric', 'wipe', 'triangular', 'diamond', 'shape'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const geometricShapeWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
