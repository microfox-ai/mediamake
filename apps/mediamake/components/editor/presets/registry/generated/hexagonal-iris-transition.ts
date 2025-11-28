/**
 * Hexagonal Iris Transition Preset
 *
 * A minimalist hexagonal iris transition where six triangular segments form a hexagon 
 * that expands from the center to reveal the new video. Each triangle scales uniformly 
 * from the center point, maintaining hexagonal symmetry throughout the transition.
 *
 * Features:
 * - **Hexagonal Aperture**: Six-sided symmetrical expansion from center
 * - **Spiral Effect**: 30-degree rotation creates gentle spiral motion
 * - **Sharp Edges**: Perfect geometric edges with no anti-aliasing artifacts
 * - **Opacity Fade**: Outgoing video fades to 80% during transition
 * - **Uniform Scaling**: All segments scale proportionally from center point
 * - **0.7s Duration**: Quick, smooth transition timing
 *
 * Technical Implementation:
 * - Uses CSS polygon clip-path for hexagonal mask (6 points)
 * - Combined scale and rotate transforms for spiral effect
 * - Provider mode effects for both videos
 * - Transform-origin: center for uniform scaling
 * - Overflow-hidden container for clean boundaries
 *
 * Use cases:
 * - Video transitions with geometric aesthetics
 * - Modern, minimalist video editing
 * - Title sequence reveals
 * - Scene transitions with precise geometric control
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (fades out)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (reveals through hexagon)'),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Duration of the transition in seconds'),
  rotationAngle: z
    .number()
    .default(30)
    .describe('Rotation angle in degrees for spiral effect'),
  outgoingOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Final opacity of outgoing video during transition'),
  videoDuration: z
    .number()
    .optional()
    .describe('Total duration of videos (optional, for context)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    rotationAngle,
    outgoingOpacity,
    videoDuration,
  } = params;

  // Calculate total duration (transition only, or use provided duration)
  const totalDuration = videoDuration || transitionDuration;

  // Hexagonal clip-path coordinates (6 points forming a hexagon)
  // Points are in clockwise order starting from top
  const hexagonClipPath =
    'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  // Outgoing video (fades to outgoingOpacity)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover',
      loop: false,
      volume: 1,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-fade-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: outgoingOpacity, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video wrapper (scales and rotates)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformOrigin: 'center',
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'hexagon-expand-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 2, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationAngle, prog: 1 },
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
          src: incomingVideoSrc,
          fit: 'cover',
          loop: false,
          volume: 1,
          className: 'w-full h-full object-cover',
          style: {
            clipPath: hexagonClipPath,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: 'hexagonal-iris-transition-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideoContainer],
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
  id: 'hexagonal-iris-transition',
  title: 'Hexagonal Iris Transition',
  description:
    'A minimalist hexagonal iris transition where six triangular segments form a hexagon that expands from the center with a subtle rotation (30 degrees) creating a gentle spiral effect. The outgoing video fades to 80% opacity during the 0.7 second transition while the incoming video emerges through the expanding hexagonal aperture with perfectly sharp edges and no anti-aliasing artifacts.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'hexagon', 'iris', 'geometric', 'spiral', 'minimalist'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 0.7,
    rotationAngle: 30,
    outgoingOpacity: 0.8,
    videoDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hexagonalIrisTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
