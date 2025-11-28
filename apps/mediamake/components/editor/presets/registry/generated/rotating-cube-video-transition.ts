/**
 * Rotating Cube Video Transition Preset
 *
 * This preset creates a 3D rotating cube transition where videos are mapped to faces of a cube.
 * The cube rotates 90 degrees on the X-axis, with the outgoing video on the top face rotating
 * up and out of view while the incoming video rotates in from the bottom.
 *
 * Features:
 * - **3D Perspective Distortion**: Uses CSS perspective and preserve-3d for realistic depth
 * - **Cube Face Mapping**: Videos mapped to top (outgoing) and front (incoming) faces
 * - **90-Degree X-Axis Rotation**: Top face rotates from 0deg to -90deg, front face from 90deg to 0deg
 * - **1-Second Overlap**: Both faces visible simultaneously during transition
 * - **Smooth Easing**: Ease-in-out timing for natural rotation motion
 * - **Brightness Adjustments**: Outgoing video darkens from 1 to 0.7 as it rotates away
 * - **Z-Index Layering**: Proper face visibility order during rotation
 *
 * Use cases:
 * - Creating dramatic 3D video transitions
 * - Building spatial video presentations
 * - Adding cinematic rotation effects between clips
 * - Professional video montages with depth
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of transition overlap in seconds (default: 1.0)'),
  perspective: z
    .number()
    .default(800)
    .describe('CSS perspective value in pixels (default: 800)'),
  cubeDepth: z
    .string()
    .default('50vh')
    .describe('Depth of cube faces (translateZ value, default: 50vh)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, perspective, cubeDepth } = params;

  // Calculate total duration: both videos minus the overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Top face (outgoing) rotates from 0deg to -90deg during first second
  // Front face (incoming) rotates from 90deg to 0deg during the overlap (starts at outgoing.duration - transitionDuration)
  const topFaceContainer: RenderableComponentData = {
    id: 'top-face-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          transform: `rotateX(0deg) translateZ(${cubeDepth})`,
          backfaceVisibility: 'hidden',
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'top-face-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['top-face-container'],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: -90, prog: 1 },
            { key: 'translateZ', val: cubeDepth, prog: 0 },
            { key: 'translateZ', val: cubeDepth, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'top-face-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: 0,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
        effects: [
          {
            id: 'brightness-fade-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: outgoingVideo.duration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['top-face-video'],
              ranges: [
                { key: 'brightness', val: 1, prog: 0 },
                { key: 'brightness', val: 0.7, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  const frontFaceContainer: RenderableComponentData = {
    id: 'front-face-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          transform: `rotateX(90deg) translateZ(${cubeDepth})`,
          backfaceVisibility: 'hidden',
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'front-face-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['front-face-container'],
          ranges: [
            { key: 'rotateX', val: 90, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
            { key: 'translateZ', val: cubeDepth, prog: 0 },
            { key: 'translateZ', val: cubeDepth, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'front-face-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: 0,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  const cubeStructure: RenderableComponentData = {
    id: 'cube-structure',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          width: '100%',
          height: '100%',
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
    childrenData: [topFaceContainer, frontFaceContainer],
  };

  const rootContainer: RenderableComponentData = {
    id: 'cube-perspective-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
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
    childrenData: [cubeStructure],
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
  id: 'rotating-cube-video-transition',
  title: 'Rotating Cube Video Transition',
  description:
    '3D cube transition with videos mapped to faces. The cube rotates 90 degrees on the X-axis with the outgoing video on the top face rotating up and out of view while the incoming video rotates in from the bottom. Includes perspective distortion, 1-second overlap, smooth easing, and brightness adjustments on the outgoing video (1 to 0.7).',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'cube', 'rotation', 'video', 'perspective'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.0,
    perspective: 800,
    cubeDepth: '50vh',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const rotatingCubeVideoTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
