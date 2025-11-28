/**
 * 3D Card Flip Transition Preset
 *
 * This preset creates a realistic 3D card flip transition between two videos. The outgoing video
 * appears on the front of a virtual card that rotates 180 degrees on the Y-axis, revealing the
 * incoming video on the back. The effect uses CSS 3D transforms with perspective to create depth.
 *
 * Features:
 * - **3D Perspective**: Uses CSS perspective (1000px) for realistic depth effect
 * - **Card Rotation**: Smooth 180-degree rotation on Y-axis with cubic-bezier easing
 * - **Backface Hidden**: Proper backface culling for clean flip effect
 * - **Dynamic Shadow**: Shadow shifts during rotation to enhance 3D realism
 * - **Aspect Ratio Preservation**: Both videos maintain aspect ratio with object-fit: cover
 * - **Configurable Overlap**: Customizable 0.8-second overlap period for transition timing
 *
 * Technical Implementation:
 * - Container has perspective: 1000px for 3D space
 * - Card wrapper uses transform-style: preserve-3d
 * - Front face starts at rotateY(0deg), animates to rotateY(180deg)
 * - Back face starts at rotateY(-180deg), animates to rotateY(0deg)
 * - Both faces use backface-visibility: hidden to hide when facing away
 * - Generic transform effects handle rotation with cubic-bezier easing
 * - Filter effects create dynamic drop-shadow during rotation
 *
 * Use cases:
 * - Creating photo card flip transitions between video clips
 * - Building realistic 3D scene transitions
 * - Adding depth and dimension to video transitions
 * - Simulating physical card flips in presentations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video (front of card)'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration (front of card)'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second video (back of card)'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration (back of card)'),
  
  overlapDuration: z.number()
    .default(0.8)
    .describe('Duration of the overlap/transition period in seconds (when card is flipping)'),
  
  perspective: z.number()
    .default(1000)
    .describe('CSS perspective value in pixels (controls depth effect)'),
  
  easing: z.string()
    .default('cubic-bezier(0.4, 0.0, 0.2, 1)')
    .describe('CSS easing function for rotation animation'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, perspective, easing } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Timing calculations
  const video1Start = 0;
  const video1Duration = video1.duration;
  const video2Start = video1.duration - overlapDuration;
  const video2Duration = video2.duration;
  
  // Rotation starts when video2 appears (overlap begins)
  const rotationStart = video1.duration - overlapDuration;

  // Create front face (video1) with rotation effect
  const frontFace: RenderableComponentData = {
    id: '3d-card-flip-front-face',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: video1Start,
        duration: video1Duration,
      },
    },
    effects: [
      // Front face rotation: 0deg → 180deg
      {
        id: 'front-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: rotationStart - video1Start, // Relative to front face start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['3d-card-flip-front-face'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 180, prog: 1 },
          ],
        },
      },
      // Front face shadow shift
      {
        id: 'front-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: rotationStart - video1Start,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['3d-card-flip-front-face'],
          ranges: [
            { key: 'filter', val: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))', prog: 0 },
            { key: 'filter', val: 'drop-shadow(-10px 10px 20px rgba(0,0,0,0.2))', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: '3d-card-flip-front-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'w-full h-full',
          fit: 'cover',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1Duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create back face (video2) with rotation effect
  const backFace: RenderableComponentData = {
    id: '3d-card-flip-back-face',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          transform: 'rotateY(-180deg)',
        },
      },
    },
    context: {
      timing: {
        start: video2Start,
        duration: video2Duration,
      },
    },
    effects: [
      // Back face rotation: -180deg → 0deg
      {
        id: 'back-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0, // Relative to back face start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['3d-card-flip-back-face'],
          ranges: [
            { key: 'rotateY', val: -180, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
      // Back face shadow shift
      {
        id: 'back-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['3d-card-flip-back-face'],
          ranges: [
            { key: 'filter', val: 'drop-shadow(-10px 10px 20px rgba(0,0,0,0.2))', prog: 0 },
            { key: 'filter', val: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: '3d-card-flip-back-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full',
          fit: 'cover',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2Duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create card wrapper with preserve-3d
  const cardWrapper: RenderableComponentData = {
    id: '3d-card-flip-card-wrapper',
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
    childrenData: [frontFace, backFace],
  };

  // Create perspective container
  const rootContainer: RenderableComponentData = {
    id: '3d-card-flip-perspective-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: `${perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [cardWrapper],
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
  id: '3d-card-flip-transition',
  title: '3D Card Flip Transition',
  description: 'A 3D card flip transition preset that simulates a physical photo card rotating in 3D space to reveal the next video. Uses CSS 3D transforms with perspective to create realistic depth, with smooth rotation and dynamic shadows during the 0.8-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'card', 'flip', 'rotation', 'perspective'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 0.8,
    perspective: 1000,
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const threeCardFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
