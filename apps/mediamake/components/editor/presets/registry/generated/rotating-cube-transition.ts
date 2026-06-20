/**
 * Rotating Cube Transition Preset
 *
 * Creates a 3D cube transition effect where videos appear on cube faces. The outgoing video 
 * is on the front face, and as the cube rotates 90 degrees on the Y-axis, the incoming video 
 * on the right face becomes the new front. During the 2-second rotation, both videos are 
 * visible on their respective cube faces with proper 3D perspective.
 *
 * Features:
 * - **3D Cube Rotation**: Smooth 90-degree Y-axis rotation revealing the next video
 * - **Dual Video Display**: Both videos visible during transition with proper 3D positioning
 * - **Floating Animation**: Subtle vertical movement during rotation for enhanced depth
 * - **Ambient Lighting**: Gradient overlays on each face to enhance 3D illusion
 * - **Perspective Control**: Proper 3D perspective with backface culling
 * - **Configurable Duration**: 2-second transition with customizable overlap
 *
 * Use cases:
 * - Creating cinematic video transitions with 3D depth
 * - Building immersive video presentations
 * - Adding professional rotating transitions between clips
 * - Creating engaging social media content with unique transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video (front face)'),
    duration: z.number().describe('Duration of video1 in seconds'),
  }).describe('Outgoing video on the front face of the cube'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video (right face)'),
    duration: z.number().describe('Duration of video2 in seconds'),
  }).describe('Incoming video on the right face of the cube'),
  
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the cube rotation transition in seconds'),
  
  perspectiveValue: z
    .number()
    .default(1200)
    .describe('Perspective value in pixels for 3D effect depth'),
  
  floatIntensity: z
    .number()
    .default(10)
    .describe('Intensity of floating animation in pixels'),
  
  cubeDepth: z
    .number()
    .default(50)
    .describe('Depth of cube faces as percentage (translateZ distance)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    perspectiveValue,
    floatIntensity,
    cubeDepth,
  } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;
  
  // Rotation starts when video1 is about to end
  const rotationStartTime = video1.duration - transitionDuration;

  // Create lighting gradient overlays
  const frontLightingGradient = 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.2))';
  const rightLightingGradient = 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(0,0,0,0.25))';

  // Front face: outgoing video (video1)
  const frontFace: RenderableComponentData = {
    id: 'front-face-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backfaceVisibility: 'hidden',
          transform: `translateZ(${cubeDepth}%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: [
      // Video on front face
      {
        id: 'front-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
      // Lighting overlay on front face
      {
        id: 'front-lighting',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background: frontLightingGradient,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Right face: incoming video (video2)
  const rightFace: RenderableComponentData = {
    id: 'right-face-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backfaceVisibility: 'hidden',
          transform: `rotateY(90deg) translateZ(${cubeDepth}%)`,
        },
      },
    },
    context: {
      timing: {
        start: rotationStartTime,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: [
      // Video on right face
      {
        id: 'right-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration,
          },
        },
      } as RenderableComponentData,
      // Lighting overlay on right face
      {
        id: 'right-lighting',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background: rightLightingGradient,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Cube wrapper with 3D transform-style
  const cubeWrapper: RenderableComponentData = {
    id: 'cube-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
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
    effects: [
      // Rotation effect: rotateY from 0deg to -90deg
      {
        id: 'cube-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: rotationStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['cube-wrapper'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -90, prog: 1 },
          ],
        },
      },
      // Floating effect: translateY animation
      {
        id: 'cube-float-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: rotationStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['cube-wrapper'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -floatIntensity, prog: 0.25 },
            { key: 'translateY', val: floatIntensity, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [frontFace, rightFace],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'rotating-cube-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: {
          perspective: `${perspectiveValue}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [cubeWrapper],
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
  id: 'rotating-cube-transition',
  title: 'Rotating Cube Transition',
  description:
    'A 3D cube transition effect where videos appear on cube faces. The outgoing video is on the front face, and the cube rotates 90 degrees on the Y-axis to reveal the incoming video on the right face. Features a 2-second rotation with proper 3D perspective, subtle floating animation, and ambient lighting gradients for enhanced 3D illusion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'cube', 'rotation', 'video', 'perspective', 'floating', 'lighting'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2,
    perspectiveValue: 1200,
    floatIntensity: 10,
    cubeDepth: 50,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const rotatingCubeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
