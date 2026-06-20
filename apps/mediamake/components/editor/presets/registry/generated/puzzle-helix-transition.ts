/**
 * Puzzle Helix Transition Preset
 *
 * Creates a DNA helix-like spiral transition where videos transition through
 * rotating puzzle pieces. Pieces spiral outward from the center for the outgoing
 * video while new pieces spiral inward for the incoming video.
 *
 * Features:
 * - **DNA Helix Spiral**: 24 triangular puzzle pieces arranged in a helix pattern
 * - **Bidirectional Motion**: Outgoing pieces spiral outward, incoming pieces spiral inward
 * - **Depth of Field**: Blur effect (0-6px) based on distance from center
 * - **Prismatic Effects**: Hue-rotate filter on piece edges for light refraction
 * - **Perspective Scaling**: Size scales from 1.0 at center to 0.6 at edges
 * - **Layered Overlap**: Z-index based on spiral layer for proper depth
 * - **Continuous Motion**: 2.3 second overlap with smooth ease-in-out timing
 *
 * Use cases:
 * - Creating dynamic video transitions with complex geometry
 * - Building sci-fi or futuristic video effects
 * - Adding dramatic transitions between video segments
 * - Creating puzzle-reveal effects
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
      src: z.string().describe('Source URL of first video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video to transition from'),
  video2: z
    .object({
      src: z.string().describe('Source URL of second video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video to transition to'),
  overlapDuration: z
    .number()
    .default(2.3)
    .describe('Duration of transition overlap in seconds'),
  pieceCount: z
    .number()
    .default(24)
    .describe('Number of puzzle pieces in the helix'),
  rotations: z
    .number()
    .default(2)
    .describe('Number of helix rotations (spiral turns)'),
  maxRadius: z
    .number()
    .default(150)
    .describe('Maximum radius of spiral in percentage of viewport'),
  maxBlur: z.number().default(6).describe('Maximum blur in pixels at edges'),
  minScale: z
    .number()
    .default(0.6)
    .describe('Minimum scale at edges (1.0 at center)'),
  prismaticIntensity: z
    .number()
    .default(30)
    .describe('Hue-rotate intensity in degrees for prismatic effect'),
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
    pieceCount,
    rotations,
    maxRadius,
    maxBlur,
    minScale,
    prismaticIntensity,
  } = params;

  // Calculate total duration
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate transition start time
  const transitionStart = video1.duration - overlapDuration;

  // Helper function to calculate spiral position and effects
  const calculateSpiralPosition = (
    index: number,
    totalPieces: number,
    maxRad: number,
    rots: number,
    progress: number,
  ) => {
    // Base angle for helix spiral
    const baseAngle = (index / totalPieces) * Math.PI * 2 * rots;

    // Radius increases with index (helix expands)
    const radiusRatio = index / totalPieces;
    const radius = radiusRatio * maxRad * progress;

    // Calculate position
    const x = Math.cos(baseAngle) * radius;
    const y = Math.sin(baseAngle) * radius;

    // Rotation based on spiral position
    const rotation = baseAngle * (180 / Math.PI) + progress * 360;

    // Scale based on distance from center (perspective)
    const scale = 1 - radiusRatio * (1 - minScale);

    // Blur based on distance from center (depth of field)
    const blur = radiusRatio * maxBlur;

    // Z-index based on spiral layer
    const zIndex = Math.floor((index / totalPieces) * 10);

    // Hue rotation for prismatic effect (increases with radius)
    const hueRotate = radiusRatio * prismaticIntensity;

    return { x, y, rotation, scale, blur, zIndex, hueRotate };
  };

  // Helper function to create clip-path for triangular piece
  const createTriangleClipPath = (index: number, total: number) => {
    // Create a triangular clip-path pointing outward from center
    const angle = (index / total) * 360;
    return `polygon(50% 50%, ${45 + Math.cos((angle * Math.PI) / 180) * 50}% ${50 + Math.sin((angle * Math.PI) / 180) * 50}%, ${45 + Math.cos(((angle + 15) * Math.PI) / 180) * 50}% ${50 + Math.sin(((angle + 15) * Math.PI) / 180) * 50}%)`;
  };

  // Create outgoing video pieces (spiral outward)
  const outgoingPieces: RenderableComponentData[] = [];
  for (let i = 0; i < pieceCount; i++) {
    const pieceId = `outgoing-piece-${i}`;
    const clipPath = createTriangleClipPath(i, pieceCount);

    // Calculate delay for staggered animation
    const delay = (i / pieceCount) * 0.2; // Stagger up to 0.2s

    // Start position (center)
    const startPos = calculateSpiralPosition(i, pieceCount, maxRadius, rotations, 0);
    // End position (outer spiral)
    const endPos = calculateSpiralPosition(i, pieceCount, maxRadius, rotations, 1);

    outgoingPieces.push({
      id: pieceId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute w-full h-full object-cover',
        style: {
          clipPath,
          transformOrigin: '50% 50%',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `${pieceId}-transform`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: overlapDuration - delay,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              // Translate outward
              { key: 'translateX', val: startPos.x, prog: 0 },
              { key: 'translateX', val: endPos.x, prog: 1 },
              { key: 'translateY', val: startPos.y, prog: 0 },
              { key: 'translateY', val: endPos.y, prog: 1 },
              // Rotate
              { key: 'rotate', val: startPos.rotation, prog: 0 },
              { key: 'rotate', val: endPos.rotation, prog: 1 },
              // Scale down (perspective)
              { key: 'scale', val: startPos.scale, prog: 0 },
              { key: 'scale', val: endPos.scale, prog: 1 },
              // Fade out
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: `${pieceId}-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: overlapDuration - delay,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              {
                key: 'filter',
                val: `blur(${startPos.blur}px) hue-rotate(${startPos.hueRotate}deg)`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `blur(${endPos.blur}px) hue-rotate(${endPos.hueRotate}deg)`,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create incoming video pieces (spiral inward)
  const incomingPieces: RenderableComponentData[] = [];
  for (let i = 0; i < pieceCount; i++) {
    const pieceId = `incoming-piece-${i}`;
    const clipPath = createTriangleClipPath(i, pieceCount);

    // Calculate delay for staggered animation
    const delay = (i / pieceCount) * 0.2; // Stagger up to 0.2s

    // Start position (outer spiral)
    const startPos = calculateSpiralPosition(i, pieceCount, maxRadius, rotations, 1);
    // End position (center)
    const endPos = calculateSpiralPosition(i, pieceCount, maxRadius, rotations, 0);

    incomingPieces.push({
      id: pieceId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute w-full h-full object-cover',
        style: {
          clipPath,
          transformOrigin: '50% 50%',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `${pieceId}-transform`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: overlapDuration - delay,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              // Translate inward
              { key: 'translateX', val: startPos.x, prog: 0 },
              { key: 'translateX', val: endPos.x, prog: 1 },
              { key: 'translateY', val: startPos.y, prog: 0 },
              { key: 'translateY', val: endPos.y, prog: 1 },
              // Rotate
              { key: 'rotate', val: startPos.rotation, prog: 0 },
              { key: 'rotate', val: endPos.rotation, prog: 1 },
              // Scale up (perspective)
              { key: 'scale', val: startPos.scale, prog: 0 },
              { key: 'scale', val: endPos.scale, prog: 1 },
              // Fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: `${pieceId}-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: overlapDuration - delay,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              {
                key: 'filter',
                val: `blur(${startPos.blur}px) hue-rotate(${startPos.hueRotate}deg)`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `blur(${endPos.blur}px) hue-rotate(${endPos.hueRotate}deg)`,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Build main container with videos and transition pieces
  const rootContainer: RenderableComponentData = {
    id: 'puzzle-helix-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background:
            'radial-gradient(circle at center, rgba(20, 20, 40, 1) 0%, rgba(10, 10, 20, 1) 100%)',
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Full outgoing video (background)
      {
        id: 'video-1-full',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
        effects: [
          {
            id: 'video-1-fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: transitionStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['video-1-full'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Full incoming video (background)
      {
        id: 'video-2-full',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: transitionStart,
            duration: video2.duration + overlapDuration,
          },
        },
        effects: [
          {
            id: 'video-2-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['video-2-full'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Transition pieces container
      {
        id: 'helix-transition-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
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
        childrenData: [...outgoingPieces, ...incomingPieces],
      } as RenderableComponentData,
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
  id: 'puzzle-helix-transition',
  title: 'Puzzle Helix Transition',
  description:
    'DNA helix-like spiral transition where videos transition through rotating puzzle pieces with depth of field blur, prismatic light refraction, and perspective scaling effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'puzzle',
    'helix',
    'spiral',
    'video',
    'dna',
    'prismatic',
    'depth-of-field',
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
    overlapDuration: 2.3,
    pieceCount: 24,
    rotations: 2,
    maxRadius: 150,
    maxBlur: 6,
    minScale: 0.6,
    prismaticIntensity: 30,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const puzzleHelixTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
