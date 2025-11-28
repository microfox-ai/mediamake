/**
 * Puzzle Scatter & Gather Transition Preset
 *
 * A sophisticated transition effect where the outgoing video explodes into irregular,
 * organic puzzle pieces that scatter outward with physics-inspired motion, while the
 * incoming video pieces gather from the edges to form the new scene.
 *
 * Features:
 * - **Organic Puzzle Shapes**: 15 irregular puzzle pieces using complex clip-paths
 * - **Physics-Inspired Motion**: Acceleration (ease-in) for scatter, deceleration (ease-out) for gather
 * - **2-Second Overlap**: Simultaneous scatter and gather for fluid transitions
 * - **Motion Blur**: Applied to fast-moving pieces for realistic motion feel
 * - **Particle Effects**: Subtle particles at piece connection points
 * - **Performance Optimized**: Uses will-change: transform for GPU acceleration
 * - **Z-Index Management**: Proper layering during crossover for seamless transitions
 *
 * Use Cases:
 * - Creative transitions between video clips or images
 * - Exploding/assembling visual effects
 * - Dynamic scene changes with organic feel
 * - Professional video montages with unique transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video/image'),
    duration: z.number().describe('Duration of the outgoing media in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video/image'),
    duration: z.number().describe('Duration of the incoming media in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
  pieceCount: z
    .number()
    .default(15)
    .min(10)
    .max(20)
    .describe('Number of puzzle pieces to generate (10-20)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, pieceCount } = params;

  // Calculate BaseLayout duration (total duration minus overlap)
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;

  // Helper: Generate irregular organic clip-path polygon points
  const generateOrganicClipPath = (seed: number): string => {
    const points: string[] = [];
    const numPoints = 6 + Math.floor(seed * 3); // 6-9 points for organic shapes

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = 40 + (seed * 15) % 20; // Vary radius organically
      const offsetX = 50 + Math.cos(angle) * radius;
      const offsetY = 50 + Math.sin(angle) * radius;
      // Add slight randomness for organic feel
      const jitterX = ((seed * 7 + i * 11) % 10) - 5;
      const jitterY = ((seed * 13 + i * 17) % 10) - 5;
      points.push(`${offsetX + jitterX}% ${offsetY + jitterY}%`);
    }

    return `polygon(${points.join(', ')})`;
  };

  // Helper: Generate random scatter direction
  const generateScatterDirection = (
    index: number,
  ): { x: number; y: number; rotate: number } => {
    const angle = (index / pieceCount) * Math.PI * 2 + (index * 0.7); // Distribute evenly with offset
    const distance = 250 + (index * 50) % 150; // Vary distance
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: ((index * 37) % 60) - 30, // -30 to +30 degrees
    };
  };

  // Generate puzzle piece data
  const generatePuzzlePieces = (): Array<{
    id: string;
    clipPath: string;
    position: { top: string; left: string; width: string; height: string };
    scatter: { x: number; y: number; rotate: number };
  }> => {
    const pieces: Array<any> = [];

    for (let i = 0; i < pieceCount; i++) {
      const seed = (i * 3.7 + 1.3) % 10;
      const clipPath = generateOrganicClipPath(seed);
      const scatter = generateScatterDirection(i);

      // Position pieces to cover the frame
      const gridCols = Math.ceil(Math.sqrt(pieceCount));
      const gridRows = Math.ceil(pieceCount / gridCols);
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);

      const width = 100 / gridCols;
      const height = 100 / gridRows;
      const left = (col * 100) / gridCols;
      const top = (row * 100) / gridRows;

      // Add overlap for seamless coverage
      const overlapPercent = 5;

      pieces.push({
        id: `piece-${i}`,
        clipPath,
        position: {
          top: `${Math.max(0, top - overlapPercent)}%`,
          left: `${Math.max(0, left - overlapPercent)}%`,
          width: `${width + overlapPercent * 2}%`,
          height: `${height + overlapPercent * 2}%`,
        },
        scatter,
      });
    }

    return pieces;
  };

  const puzzlePieces = generatePuzzlePieces();

  // Determine media component types
  const video1ComponentId = video1.src.match(/\.(mp4|webm|mov)$/i)
    ? 'VideoAtom'
    : 'ImageAtom';
  const video2ComponentId = video2.src.match(/\.(mp4|webm|mov)$/i)
    ? 'VideoAtom'
    : 'ImageAtom';

  // ============================================================================
  // OUTGOING VIDEO BASE (Full video before transition)
  // ============================================================================

  const outgoingVideoBase: RenderableComponentData = {
    id: 'outgoing-video-base',
    type: 'atom',
    componentId: video1ComponentId,
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration - transitionDuration,
      },
    },
  };

  // ============================================================================
  // OUTGOING PUZZLE PIECES (Scatter phase)
  // ============================================================================

  const outgoingPuzzlePieces: RenderableComponentData[] = puzzlePieces.map(
    (piece, index) => {
      const staggerDelay = (index / pieceCount) * 0.3; // Stagger up to 0.3s

      return {
        id: `outgoing-${piece.id}`,
        type: 'atom',
        componentId: video1ComponentId,
        data: {
          src: video1.src,
          className: 'absolute will-change-transform',
          fit: 'cover',
          style: {
            clipPath: piece.clipPath,
            top: piece.position.top,
            left: piece.position.left,
            width: piece.position.width,
            height: piece.position.height,
            zIndex: index + 10,
          },
          startFrom: video1.duration - transitionDuration,
        },
        context: {
          timing: {
            start: video1.duration - transitionDuration + staggerDelay,
            duration: transitionDuration - staggerDelay,
          },
        },
        effects: [
          {
            id: `scatter-effect-${piece.id}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: transitionDuration - staggerDelay,
              mode: 'provider',
              targetIds: [`outgoing-${piece.id}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: piece.scatter.x, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: piece.scatter.y, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: piece.scatter.rotate, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.7, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                {
                  key: 'filter',
                  val: 'blur(0px)',
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: 'blur(8px)',
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // ============================================================================
  // INCOMING PUZZLE PIECES (Gather phase)
  // ============================================================================

  const incomingPuzzlePieces: RenderableComponentData[] = puzzlePieces.map(
    (piece, index) => {
      const staggerDelay = (index / pieceCount) * 0.3;
      // Incoming pieces gather from opposite directions
      const gatherDirection = {
        x: -piece.scatter.x * 1.2,
        y: -piece.scatter.y * 1.2,
        rotate: -piece.scatter.rotate,
      };

      return {
        id: `incoming-${piece.id}`,
        type: 'atom',
        componentId: video2ComponentId,
        data: {
          src: video2.src,
          className: 'absolute will-change-transform',
          fit: 'cover',
          style: {
            clipPath: piece.clipPath,
            top: piece.position.top,
            left: piece.position.left,
            width: piece.position.width,
            height: piece.position.height,
            zIndex: pieceCount + index + 10,
          },
          startFrom: 0,
        },
        context: {
          timing: {
            start: video1.duration - transitionDuration + staggerDelay,
            duration: transitionDuration - staggerDelay,
          },
        },
        effects: [
          {
            id: `gather-effect-${piece.id}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration - staggerDelay,
              mode: 'provider',
              targetIds: [`incoming-${piece.id}`],
              ranges: [
                { key: 'translateX', val: gatherDirection.x, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: gatherDirection.y, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'rotate', val: gatherDirection.rotate, prog: 0 },
                { key: 'rotate', val: 0, prog: 1 },
                { key: 'scale', val: 1.3, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                {
                  key: 'filter',
                  val: 'blur(8px)',
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: 'blur(0px)',
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // ============================================================================
  // PARTICLE EFFECTS (Connection points)
  // ============================================================================

  const particleCount = Math.min(8, Math.floor(pieceCount / 2));
  const particles: RenderableComponentData[] = Array.from(
    { length: particleCount },
    (_, i) => {
      const particleDelay = (i / particleCount) * 0.4;
      const posX = 20 + (i * 60) % 60;
      const posY = 20 + ((i * 37) % 60);

      return {
        id: `particle-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 6px; height: 6px; background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%); border-radius: 50%; box-shadow: 0 0 8px rgba(255,255,255,0.8);"></div>`,
          className: 'absolute',
          style: {
            top: `${posY}%`,
            left: `${posX}%`,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start:
              video1.duration - transitionDuration / 2 + particleDelay,
            duration: 1,
          },
        },
        effects: [
          {
            id: `particle-fade-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 1,
              mode: 'provider',
              targetIds: [`particle-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 3, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // ============================================================================
  // INCOMING VIDEO COMPLETE (After transition)
  // ============================================================================

  const incomingVideoComplete: RenderableComponentData = {
    id: 'incoming-video-complete',
    type: 'atom',
    componentId: video2ComponentId,
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      startFrom: transitionDuration,
    },
    context: {
      timing: {
        start: video1.duration,
        duration: video2.duration - transitionDuration,
      },
    },
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'puzzle-scatter-gather-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingVideoBase,
      ...outgoingPuzzlePieces,
      ...incomingPuzzlePieces,
      ...particles,
      incomingVideoComplete,
    ] as RenderableComponentData[],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'puzzle-scatter-gather-transition',
  title: 'Puzzle Scatter & Gather Transition',
  description:
    'Advanced transition where outgoing video explodes into irregular puzzle pieces that scatter outward with physics-inspired motion, while incoming video pieces gather from edges with motion blur and particle effects at connection points',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'puzzle',
    'scatter',
    'gather',
    'organic',
    'physics',
    'particles',
    'advanced',
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
    transitionDuration: 2,
    pieceCount: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const puzzleScatterGatherTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};