/**
 * Spinning Cube Transition Preset
 *
 * This preset creates a 3D rotating cube transition where a 2x2 video grid transforms
 * into a cube that rotates to reveal new videos on different faces. Features:
 *
 * - **3D Cube Structure**: Six faces with proper 3D transforms and perspective
 * - **Dynamic Lighting**: Brightness effects based on face rotation angle
 * - **Floating Animation**: Cube appears to float with moving drop shadow
 * - **Bounce Effect**: Satisfying ease-in-out bounce at rotation completion
 * - **Grid to Cube**: Front face shows 2x2 grid, rotates to reveal right face grid
 *
 * Use cases:
 * - Creating engaging video transitions with 3D effects
 * - Building multi-video showcases with spatial depth
 * - Adding cinematic cube rotations to video compilations
 * - Creating immersive video presentation experiences
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  videos: z.object({
    front: z.array(z.string()).length(4).describe('Four video URLs for front face (2x2 grid)'),
    right: z.array(z.string()).length(4).describe('Four video URLs for right face (2x2 grid)'),
    back: z.array(z.string()).optional().describe('Four video URLs for back face (2x2 grid)'),
    left: z.string().optional().describe('Single video URL for left face'),
    top: z.string().optional().describe('Single video URL for top face'),
    bottom: z.string().optional().describe('Single video URL for bottom face'),
  }).describe('Video sources for each cube face'),
  
  duration: z.number().default(5).describe('Total duration of the preset in seconds'),
  rotationDuration: z.number().default(2).describe('Duration of the cube rotation animation in seconds'),
  rotationDelay: z.number().default(0).describe('Delay before rotation starts in seconds'),
  
  cubeSize: z.number().default(800).describe('Size of the cube in pixels'),
  perspective: z.number().default(1000).describe('CSS perspective value for 3D depth'),
  
  backgroundColor: z.string().default('#1a1a2e').describe('Background color of the scene'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videos,
    duration,
    rotationDuration,
    rotationDelay,
    cubeSize,
    perspective,
    backgroundColor,
  } = params;

  const cubeSizeStr = `${cubeSize}px`;
  const halfCubeSize = cubeSize / 2;
  const translateZ = `${halfCubeSize}px`;

  // Helper: Create video atom
  const createVideoAtom = (id: string, src: string, className: string = 'w-full h-full'): RenderableComponentData => ({
    id,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src,
      fit: 'cover',
      className,
      muted: true,
      loop: true,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  });

  // Helper: Create 2x2 grid face
  const createGridFace = (
    faceId: string,
    videoSrcs: string[],
    transform: string,
  ): RenderableComponentData => ({
    id: faceId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-2 grid-rows-2',
        style: {
          width: cubeSizeStr,
          height: cubeSizeStr,
          transform,
          backfaceVisibility: 'hidden',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: videoSrcs.map((src, idx) =>
      createVideoAtom(`${faceId}-video-${idx}`, src)
    ) as RenderableComponentData[],
  });

  // Helper: Create single video face
  const createSingleFace = (
    faceId: string,
    videoSrc: string,
    transform: string,
  ): RenderableComponentData => ({
    id: faceId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          width: cubeSizeStr,
          height: cubeSizeStr,
          transform,
          backfaceVisibility: 'hidden',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [createVideoAtom(`${faceId}-video`, videoSrc)] as RenderableComponentData[],
  });

  // Create cube faces
  const faceFront = createGridFace(
    'face-front',
    videos.front,
    `translateZ(${translateZ})`
  );

  const faceRight = createGridFace(
    'face-right',
    videos.right,
    `translateX(${translateZ}) rotateY(90deg)`
  );

  const faceBack = videos.back
    ? createGridFace(
        'face-back',
        videos.back,
        `translateZ(-${translateZ}) rotateY(180deg)`
      )
    : null;

  const faceLeft = videos.left
    ? createSingleFace(
        'face-left',
        videos.left,
        `translateX(-${translateZ}) rotateY(-90deg)`
      )
    : null;

  const faceTop = videos.top
    ? createSingleFace(
        'face-top',
        videos.top,
        `translateY(-${translateZ}) rotateX(90deg)`
      )
    : null;

  const faceBottom = videos.bottom
    ? createSingleFace(
        'face-bottom',
        videos.bottom,
        `translateY(${translateZ}) rotateX(-90deg)`
      )
    : null;

  // Collect all faces
  const allFaces: RenderableComponentData[] = [
    faceFront,
    faceRight,
    faceBack,
    faceLeft,
    faceTop,
    faceBottom,
  ].filter(Boolean) as RenderableComponentData[];

  // Lighting effects for front face (dims during rotation)
  const frontLightingEffect = {
    id: 'front-lighting',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: rotationDelay,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: ['face-front'],
      ranges: [
        { key: 'filter', val: 'brightness(100%)', prog: 0 },
        { key: 'filter', val: 'brightness(60%)', prog: 1 },
      ],
    },
  };

  // Lighting effects for right face (brightens during rotation)
  const rightLightingEffect = {
    id: 'right-lighting',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: rotationDelay,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: ['face-right'],
      ranges: [
        { key: 'filter', val: 'brightness(60%)', prog: 0 },
        { key: 'filter', val: 'brightness(100%)', prog: 1 },
      ],
    },
  };

  // Apply lighting effects to faces
  faceFront.effects = [frontLightingEffect];
  faceRight.effects = [rightLightingEffect];

  // Cube container with rotation
  const cubeContainer: RenderableComponentData = {
    id: 'cube-container',
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
        duration,
      },
    },
    childrenData: allFaces,
    effects: [
      {
        id: 'cube-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: rotationDelay,
          duration: rotationDuration,
          mode: 'provider',
          targetIds: ['cube-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -90, prog: 1 },
          ],
        },
      },
    ],
  };

  // Shadow layer
  const shadowLayer: RenderableComponentData = {
    id: 'shadow-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: cubeSizeStr,
          height: '40px',
          bottom: '-50px',
          left: '0',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          filter: 'blur(30px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'shadow-movement',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: rotationDelay,
          duration: rotationDuration,
          mode: 'provider',
          targetIds: ['shadow-layer'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 20, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  // Cube wrapper with floating animation
  const cubeWrapper: RenderableComponentData = {
    id: 'cube-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          width: cubeSizeStr,
          height: cubeSizeStr,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [cubeContainer, shadowLayer],
    effects: [
      {
        id: 'floating-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: rotationDelay,
          duration: rotationDuration,
          mode: 'provider',
          targetIds: ['cube-wrapper'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -10, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'spinning-cube-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: '50% 50%',
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'spinning-cube-transition',
  title: 'Spinning Cube Transition',
  description: 'A 2x2 video grid transforms into a 3D rotating cube that reveals new videos on different faces. Features dynamic lighting effects, floating animation with drop shadow, and a satisfying bounce at the end of the rotation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'cube', 'rotation', 'grid', 'video', 'lighting', 'floating'],
  defaultInputParams: {
    videos: {
      front: [
        'VIDEO_PLACEHOLDER_1',
        'VIDEO_PLACEHOLDER_2',
        'VIDEO_PLACEHOLDER_3',
        'VIDEO_PLACEHOLDER_4',
      ],
      right: [
        'VIDEO_PLACEHOLDER_5',
        'VIDEO_PLACEHOLDER_6',
        'VIDEO_PLACEHOLDER_7',
        'VIDEO_PLACEHOLDER_8',
      ],
    },
    duration: 5,
    rotationDuration: 2,
    rotationDelay: 0,
    cubeSize: 800,
    perspective: 1000,
    backgroundColor: '#1a1a2e',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spinningCubeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
