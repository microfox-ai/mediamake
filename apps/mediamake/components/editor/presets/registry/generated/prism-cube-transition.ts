/**
 * Prism Cube Transition Preset
 *
 * A 3D rotating cube transition where videos appear mapped onto the faces of a rotating
 * 3D cube with prismatic light dispersion effects. The outgoing video is displayed on
 * the front face while the incoming video appears on the back face, revealed as the
 * cube rotates 180 degrees around the Y-axis.
 *
 * Features:
 * - **3D Cube Rotation**: Uses CSS 3D transforms with perspective and preserve-3d
 * - **Chromatic Aberration**: RGB ghost copies with staggered rotation delays
 * - **Prismatic Light Rays**: Gradient overlays that sweep across during rotation
 * - **Dual Video Mapping**: Outgoing on front face, incoming on back face
 * - **Smooth Transitions**: 1.5 second overlap with coordinated timing
 *
 * Use cases:
 * - Creating unique 3D video transitions
 * - Adding prismatic effects to video cuts
 * - Building futuristic video presentations
 * - Creating eye-catching social media content
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the cube rotation transition in seconds'),
  chromaticAberrationIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of chromatic aberration effect (0-1)'),
  lightRayIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Intensity of prismatic light rays (0-1)'),
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
    chromaticAberrationIntensity = 0.3,
    lightRayIntensity = 0.4,
  } = params;

  // Calculate total duration: outgoing + incoming - overlap
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Calculate when rotation starts (at the end of outgoing minus transition)
  const rotationStartTime = outgoingVideo.duration - transitionDuration;

  // Helper function to create video face with chromatic ghosts
  const createVideoFace = (
    video: { src: string; duration: number },
    faceType: 'front' | 'back',
    videoStartTime: number,
    videoDuration: number,
  ) => {
    const isFront = faceType === 'front';
    const baseId = isFront ? 'outgoing' : 'incoming';
    
    // Initial rotation for back face (180 degrees)
    const initialRotation = isFront ? 0 : 180;
    // Final rotation (all faces rotate 180 degrees)
    const finalRotation = initialRotation + 180;

    // Main video face
    const mainFace: RenderableComponentData = {
      id: `${baseId}-video-main`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          backfaceVisibility: 'hidden',
        },
      },
      context: {
        timing: {
          start: videoStartTime,
          duration: videoDuration,
        },
      },
      effects: [
        {
          id: `${baseId}-rotation`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: rotationStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`${baseId}-video-main`],
            ranges: [
              { key: 'rotateY', val: initialRotation, prog: 0 },
              { key: 'rotateY', val: finalRotation, prog: 1 },
            ],
          },
        },
      ],
    };

    // RGB ghost copies with staggered delays
    const ghostColors = [
      { color: 'red', delay: 0.1, filter: 'sepia(1) saturate(10) hue-rotate(330deg)' },
      { color: 'green', delay: 0.2, filter: 'sepia(1) saturate(10) hue-rotate(80deg)' },
      { color: 'blue', delay: 0.3, filter: 'sepia(1) saturate(10) hue-rotate(180deg)' },
    ];

    const ghosts: RenderableComponentData[] = ghostColors.map((ghost) => ({
      id: `${baseId}-${ghost.color}-ghost`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          backfaceVisibility: 'hidden',
          opacity: chromaticAberrationIntensity,
          mixBlendMode: 'screen',
          filter: ghost.filter,
        },
      },
      context: {
        timing: {
          start: videoStartTime,
          duration: videoDuration,
        },
      },
      effects: [
        {
          id: `${baseId}-${ghost.color}-rotation`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: rotationStartTime + ghost.delay,
            duration: transitionDuration - ghost.delay,
            mode: 'provider',
            targetIds: [`${baseId}-${ghost.color}-ghost`],
            ranges: [
              { key: 'rotateY', val: initialRotation, prog: 0 },
              { key: 'rotateY', val: finalRotation, prog: 1 },
            ],
          },
        },
      ],
    }));

    return [mainFace, ...ghosts];
  };

  // Create light ray overlays
  const createLightRays = (): RenderableComponentData[] => {
    const rays = [
      {
        id: 'light-ray-1',
        width: '50%',
        gradient: `linear-gradient(90deg, transparent 0%, rgba(255,100,100,${lightRayIntensity * 0.75}) 30%, rgba(255,200,100,${lightRayIntensity}) 50%, rgba(100,255,100,${lightRayIntensity * 0.75}) 70%, transparent 100%)`,
        delay: 0,
      },
      {
        id: 'light-ray-2',
        width: '30%',
        gradient: `linear-gradient(90deg, transparent 0%, rgba(100,100,255,${lightRayIntensity * 0.625}) 40%, rgba(200,100,255,${lightRayIntensity * 0.875}) 60%, transparent 100%)`,
        delay: 0.2,
      },
      {
        id: 'light-ray-3',
        width: '20%',
        gradient: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,${lightRayIntensity * 0.5}) 50%, transparent 100%)`,
        delay: 0.4,
      },
    ];

    return rays.map((ray) => ({
      id: ray.id,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width:100%;height:100%;'></div>`,
        className: 'absolute top-0',
        style: {
          width: ray.width,
          height: '100%',
          background: ray.gradient,
          pointerEvents: 'none',
          mixBlendMode: ray.id === 'light-ray-3' ? 'overlay' : 'screen',
        },
      },
      context: {
        timing: {
          start: rotationStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${ray.id}-sweep`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: ray.delay,
            duration: transitionDuration - ray.delay,
            mode: 'provider',
            targetIds: [ray.id],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '200%', prog: 1 },
            ],
          },
        },
      ],
    }));
  };

  // Create outgoing video faces (front face at 0deg)
  const outgoingFaces = createVideoFace(
    outgoingVideo,
    'front',
    0,
    outgoingVideo.duration,
  );

  // Create incoming video faces (back face at 180deg)
  const incomingFaces = createVideoFace(
    incomingVideo,
    'back',
    rotationStartTime,
    incomingVideo.duration + transitionDuration,
  );

  // Create light rays
  const lightRays = createLightRays();

  // Cube container with 3D transform context
  const cubeContainer: RenderableComponentData = {
    id: 'prism-cube-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
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
    childrenData: [...outgoingFaces, ...incomingFaces],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'prism-cube-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
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
    childrenData: [cubeContainer, ...lightRays],
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
  id: 'prism-cube-transition',
  title: 'Prism Cube Transition',
  description:
    'A 3D rotating cube transition where videos appear mapped onto cube faces with prismatic light dispersion effects and chromatic aberration',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    '3d',
    'cube',
    'prism',
    'chromatic-aberration',
    'light-rays',
    'rotation',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.5,
    chromaticAberrationIntensity: 0.3,
    lightRayIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismCubeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
