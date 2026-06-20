/**
 * Rotating Puzzle Cube Transition
 *
 * A complex 3D transition preset that creates a puzzle cube effect between two videos.
 * The cube has two faces (front and back), each divided into a 3x3 grid of puzzle segments.
 * Features include:
 *
 * - 3D cube structure with 6 faces (only front/back used for videos)
 * - Each face divided into 9 puzzle segments (3x3 grid)
 * - Initial scramble effect: segments randomly rotate (±15deg) for 0.3s
 * - Main cube rotation: 180deg rotateY from 0.3s to 1.9s (1.6s duration)
 * - Realistic lighting: brightness animated based on rotation angle
 * - Edge highlighting: puzzle structure emphasized with outline borders
 * - 2.2s overlap between videos for smooth transition
 * - Transform origin set to create proper 3D rotation depth
 * - Backface visibility hidden for clean flip
 *
 * Use cases:
 * - Dynamic video transitions with puzzle-like aesthetics
 * - 3D rotation effects with segmented content
 * - Complex multi-layered transitions with lighting effects
 * - Creative montages with cube-based animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of first video (front face)'),
    duration: z.number().describe('Duration of first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of second video (back face)'),
    duration: z.number().describe('Duration of second video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(2.2)
    .describe('Duration of overlap/transition between videos in seconds'),
  scrambleDuration: z
    .number()
    .default(0.3)
    .describe('Duration of initial scramble effect in seconds'),
  rotationDuration: z
    .number()
    .default(1.6)
    .describe('Duration of main cube rotation in seconds'),
  perspective: z
    .number()
    .default(800)
    .describe('CSS perspective value in pixels for 3D depth'),
  cubeDepth: z
    .number()
    .default(200)
    .describe('Z-axis depth of cube in pixels (affects transform origin)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    scrambleDuration,
    rotationDuration,
    perspective,
    cubeDepth,
  } = params;

  // Calculate total composition duration
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate timing for front and back faces
  const frontFaceDuration = video1.duration + scrambleDuration;
  const backFaceStart = video1.duration - overlapDuration;
  const backFaceDuration = video2.duration + scrambleDuration;

  // Generate random rotation values for scramble effect (±15 degrees)
  const generateRandomRotation = () => {
    return Math.random() * 30 - 15; // Random value between -15 and 15
  };

  const scrambleRotations = Array(9)
    .fill(0)
    .map(() => generateRandomRotation());

  // Helper: Create puzzle segment component
  const createSegment = (
    index: number,
    videoSrc: string,
    faceId: string,
    includeScramble: boolean,
  ): RenderableComponentData => {
    // Calculate grid position (0-8 maps to 3x3 grid)
    const col = index % 3;
    const row = Math.floor(index / 3);

    // Calculate clip path for this segment (3x3 grid)
    const clipPathTop = `${row * 33.33}%`;
    const clipPathRight = `${(2 - col) * 33.33}%`;
    const clipPathBottom = `${(2 - row) * 33.33}%`;
    const clipPathLeft = `${col * 33.33}%`;

    // Calculate transform translate values to position video behind clip
    const translateX = col === 0 ? -33.33 : col === 1 ? 0 : 33.33;
    const translateY = row === 0 ? -33.33 : row === 1 ? 0 : 33.33;

    const effects: any[] = [];

    // Add scramble effect for front face segments
    if (includeScramble) {
      effects.push({
        id: `scramble-${faceId}-seg-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: scrambleDuration,
          mode: 'provider',
          targetIds: [`${faceId}-seg-${index}`],
          ranges: [
            { key: 'rotateZ', val: scrambleRotations[index], prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        },
      });

      // Edge highlight fade effect during scramble
      effects.push({
        id: `edge-fade-${faceId}-seg-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: scrambleDuration,
          mode: 'provider',
          targetIds: [`${faceId}-seg-${index}`],
          ranges: [
            { key: 'outlineWidth', val: '2px', prog: 0 },
            { key: 'outlineWidth', val: '1px', prog: 1 },
          ],
        },
      });
    }

    return {
      id: `${faceId}-seg-${index}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: videoSrc,
        fit: 'cover',
        style: {
          clipPath: `inset(${clipPathTop} ${clipPathRight} ${clipPathBottom} ${clipPathLeft})`,
          transform: `scale(3) translate(${translateX}%, ${translateY}%)`,
          outline: '2px solid rgba(255,255,255,0.3)',
          outlineOffset: '-1px',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: faceId,
        },
      },
      effects,
    } as RenderableComponentData;
  };

  // Create all 9 segments for front face
  const frontSegments: RenderableComponentData[] = Array(9)
    .fill(0)
    .map((_, i) => createSegment(i, video1.src, 'front-face', true));

  // Create all 9 segments for back face
  const backSegments: RenderableComponentData[] = Array(9)
    .fill(0)
    .map((_, i) => createSegment(i, video2.src, 'back-face', false));

  // Front face container with lighting effect
  const frontFace: RenderableComponentData = {
    id: 'front-face',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0',
        style: {
          transform: `translateZ(${cubeDepth}px)`,
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: frontFaceDuration,
      },
    },
    effects: [
      {
        id: 'front-face-lighting',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: scrambleDuration,
          duration: rotationDuration,
          mode: 'provider',
          targetIds: ['front-face'],
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 0.4, prog: 0.5 },
            { key: 'brightness', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: frontSegments,
  };

  // Back face container with lighting effect
  const backFace: RenderableComponentData = {
    id: 'back-face',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0',
        style: {
          transform: `translateZ(-${cubeDepth}px) rotateY(180deg)`,
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: backFaceStart,
        duration: backFaceDuration,
      },
    },
    effects: [
      {
        id: 'back-face-lighting',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: rotationDuration,
          mode: 'provider',
          targetIds: ['back-face'],
          ranges: [
            { key: 'brightness', val: 0, prog: 0 },
            { key: 'brightness', val: 0.4, prog: 0.5 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: backSegments,
  };

  // 3D cube wrapper with main rotation effect
  const cube3DWrapper: RenderableComponentData = {
    id: 'cube-3d-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          transformStyle: 'preserve-3d',
          transformOrigin: `center center -${cubeDepth}px`,
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
        id: 'cube-main-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: scrambleDuration,
          duration: rotationDuration,
          mode: 'provider',
          targetIds: ['cube-3d-wrapper'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 180, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [frontFace, backFace],
  };

  // Cube container (centering wrapper)
  const cubeContainer: RenderableComponentData = {
    id: 'cube-container',
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
    childrenData: [cube3DWrapper],
  };

  // Perspective root container
  const perspectiveRoot: RenderableComponentData = {
    id: 'perspective-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
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
    childrenData: [cubeContainer],
  };

  return {
    output: {
      childrenData: [perspectiveRoot] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'rotating-puzzle-cube-transition',
  title: 'Rotating Puzzle Cube Transition',
  description:
    '3D puzzle cube transition with segmented faces that scramble and rotate between two videos. Features realistic lighting, edge highlighting, and complex 3D rotations with configurable overlap.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    '3d',
    'puzzle',
    'cube',
    'rotation',
    'lighting',
    'segments',
    'scramble',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2.2,
    scrambleDuration: 0.3,
    rotationDuration: 1.6,
    perspective: 800,
    cubeDepth: 200,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const rotatingPuzzleCubeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
