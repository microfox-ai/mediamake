/**
 * 3D Cube Carousel Transition Preset
 *
 * This preset creates a rotating 3D cube transition where videos appear mounted on cube faces.
 * The cube rotates 90 degrees on the Y-axis to reveal the next video, simulating a physical
 * slide carousel drum rotating to the next position.
 *
 * Features:
 * - **3D Perspective**: Uses CSS 3D transforms with preserve-3d and perspective
 * - **Cube Rotation**: Rotates entire container 90 degrees on Y-axis over configurable duration
 * - **Dual Video Faces**: Outgoing video at rotateY(0deg), incoming at rotateY(90deg)
 * - **Flash Effect**: Bright white flash at rotation midpoint (when faces are perpendicular)
 * - **Smooth Easing**: Ease-in-out timing for natural carousel feel
 * - **Z-index Management**: Proper layering during rotation
 * - **Backface Visibility**: Hidden to prevent face showing through
 *
 * Technical Details:
 * - Root container has perspective (1000px) for 3D depth effect
 * - Cube container has transform-style: preserve-3d for 3D positioning
 * - Videos positioned with translateZ and rotateY transforms
 * - Generic effect animates cube container rotation from 0 to -90deg
 * - Flash overlay uses opacity spike at midpoint (prog: 0.5)
 *
 * Use cases:
 * - Video transitions with 3D carousel effect
 * - Slide show presentations with physical rotation feel
 * - Creative transitions between video segments
 * - Simulating physical slide projector carousel
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  videoDuration: z
    .number()
    .describe('Duration of each video in seconds (used for timing)'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the cube rotation transition in seconds'),
  cubeDepth: z
    .number()
    .default(50)
    .describe(
      'Depth of cube faces from center in vw units (controls perspective distance)',
    ),
  perspective: z
    .number()
    .default(1000)
    .describe('Perspective depth in pixels for 3D effect'),
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of the flash effect at midpoint (0-1)'),
  videoFit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .describe('How videos should fit within their containers'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    videoDuration,
    transitionDuration,
    cubeDepth,
    perspective,
    flashIntensity,
    videoFit,
  } = params;

  // Calculate total duration: video plays fully, then transition occurs
  const totalDuration = videoDuration;

  // Transition starts before video ends to create overlap effect
  const transitionStart = videoDuration - transitionDuration;

  // Create cube container with rotation effect
  const cubeContainer: RenderableComponentData = {
    id: 'cube-container',
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
    effects: [
      {
        id: 'cube-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['cube-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -90, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Outgoing video face (front face at rotateY(0deg))
      {
        id: 'outgoing-video-face',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: videoFit,
          muted: true,
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: `rotateY(0deg) translateZ(${cubeDepth}vw)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: videoDuration,
          },
        },
      } as RenderableComponentData,
      // Incoming video face (right face at rotateY(90deg))
      {
        id: 'incoming-video-face',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: videoFit,
          muted: true,
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: `rotateY(90deg) translateZ(${cubeDepth}vw)`,
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Flash overlay that appears at midpoint of rotation
  const flashOverlay: RenderableComponentData = {
    id: 'flash-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: 'white',
          pointerEvents: 'none',
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'flash-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flashIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'cube-carousel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [cubeContainer, flashOverlay],
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
  id: 'cube-carousel-transition',
  title: '3D Cube Carousel Transition',
  description:
    'A rotating 3D cube transition effect where videos appear mounted on cube faces. The cube rotates 90 degrees on the Y-axis with configurable duration and ease-in-out timing to reveal the next video, simulating a physical slide carousel drum. Includes a bright flash effect at the midpoint when faces are perpendicular to the viewer, simulating projector light hitting the slide edge. Uses CSS 3D transforms with preserve-3d and perspective.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'cube', 'carousel', 'rotation', 'video'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    videoDuration: 5,
    transitionDuration: 0.8,
    cubeDepth: 50,
    perspective: 1000,
    flashIntensity: 0.8,
    videoFit: 'cover',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cubeCarouselTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
