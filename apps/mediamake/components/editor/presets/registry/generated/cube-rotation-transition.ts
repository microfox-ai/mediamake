/**
 * 3D Cube Rotation Transition Preset
 *
 * This preset creates a 3D cube rotation transition between two videos. The outgoing video
 * is positioned on the front face of the cube, and as it rotates 90 degrees on the Y-axis,
 * the incoming video appears on the adjacent face. The transition uses CSS 3D transforms
 * with perspective to create spatial depth, synchronized shadow effects, and smooth
 * ease-in-out motion curves.
 *
 * Features:
 * - **3D Cube Rotation**: Videos mapped onto cube faces with 90-degree Y-axis rotation
 * - **Perspective Depth**: CSS 3D transforms with 1200px perspective for realistic spatial depth
 * - **Synchronized Videos**: Both videos play simultaneously during 1.5s rotation transition
 * - **Dynamic Shadows**: Shadow effect moves with cube rotation to enhance 3D illusion
 * - **Smooth Motion**: Ease-in-out curve for acceleration/deceleration
 * - **Flexible Media**: Supports both video and image media types
 *
 * Use cases:
 * - Creating immersive video transitions with 3D effects
 * - Building cinematic scene changes with spatial depth
 * - Adding visual interest to video montages with cube rotations
 * - Creating unique transitions for presentations and demos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing video/image'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration of media 1 in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming video/image'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration of media 2 in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of cube rotation transition in seconds'),
  perspective: z
    .number()
    .default(1200)
    .optional()
    .describe('CSS perspective value in pixels for 3D depth effect'),
  cubeDepth: z
    .number()
    .default(50)
    .optional()
    .describe('Depth of cube faces in viewport width units (vw)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, perspective, cubeDepth } = params;

  // Calculate container duration (sum of durations minus overlap)
  const containerDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate transition start time (when rotation begins)
  const transitionStart = media1.duration - transitionDuration;

  // Helper function to create cube face data
  const createCubeFace = (
    mediaId: string,
    mediaSrc: string,
    componentId: string,
    initialRotation: number,
    finalRotation: number,
    startTime: number,
    duration: number,
  ): RenderableComponentData => {
    return {
      id: mediaId,
      type: 'atom',
      componentId,
      data: {
        src: mediaSrc,
        className: 'absolute inset-0 w-full h-full',
        style: {
          objectFit: 'cover',
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        },
        ...(componentId === 'VideoAtom' && {
          volume: 1,
          muted: false,
          playbackRate: 1,
        }),
      },
      context: {
        timing: {
          start: startTime,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${mediaId}-transform`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [mediaId],
            ranges: [
              { key: 'rotateY', val: initialRotation, prog: 0 },
              { key: 'rotateY', val: finalRotation, prog: 1 },
              { key: 'translateZ', val: `${cubeDepth}vw`, prog: 0 },
              { key: 'translateZ', val: `${cubeDepth}vw`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Create cube stage container with rotation and shadow
  const cubeStage: RenderableComponentData = {
    id: 'cube-stage',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
      },
    },
    childrenData: [
      // Outgoing video face (front face, rotates from 0 to -90 degrees)
      createCubeFace(
        'outgoing-video-face',
        media1.src,
        media1ComponentId,
        0,
        -90,
        0,
        media1.duration,
      ),
      // Incoming video face (right face, rotates from 90 to 0 degrees)
      createCubeFace(
        'incoming-video-face',
        media2.src,
        media2ComponentId,
        90,
        0,
        transitionStart,
        media2.duration + transitionDuration,
      ),
    ],
    effects: [
      // Shadow effect synchronized with cube rotation
      {
        id: 'cube-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['cube-stage'],
          ranges: [
            { key: 'boxShadow', val: '0 20px 60px rgba(0,0,0,0.5)', prog: 0 },
            { key: 'boxShadow', val: '20px 0 60px rgba(0,0,0,0.5)', prog: 0.5 },
            { key: 'boxShadow', val: '0 -20px 60px rgba(0,0,0,0.5)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root perspective container
  const rootContainer: RenderableComponentData = {
    id: 'cube-perspective-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: `${perspective}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
      },
    },
    childrenData: [cubeStage],
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
  id: 'cube-rotation-transition',
  title: '3D Cube Rotation Transition',
  description:
    'A 3D cube rotation transition preset where videos are mapped onto cube faces. As the cube rotates 90 degrees on the Y-axis, the outgoing video transitions to the incoming video with CSS 3D transforms, perspective depth, and synchronized shadow effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'cube', 'rotation', 'perspective', 'spatial'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 1.5,
    perspective: 1200,
    cubeDepth: 50,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cubeRotationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
