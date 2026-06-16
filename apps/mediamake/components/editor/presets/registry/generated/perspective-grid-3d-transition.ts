/**
 * Perspective Grid 3D Transition Preset
 *
 * Creates a 3D perspective grid transition where videos break apart into cells that rotate
 * and fly away in 3D space. The outgoing video shatters into a 4x4 grid (16 cells) with each
 * cell rotating and translating in 3D space with randomized timing. The incoming video assembles
 * from different directions with cells flying in from various depths.
 *
 * Features:
 * - 4x4 grid layout (16 cells total)
 * - Each cell contains clipped portions of video
 * - 3D rotations (rotateX, rotateY, rotateZ) with randomized values
 * - Depth-based translateZ animations
 * - Depth-of-field blur effect (cells further away are blurred)
 * - Randomized timing offsets for organic feel
 * - Proper z-index layering based on depth
 * - 2-second transition with 0.8-second overlap
 *
 * Use cases:
 * - Data visualization-style transitions
 * - Tech/futuristic video presentations
 * - Dynamic video montages
 * - Breaking apart and reassembling effects
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
    startFrom: z.number().optional().describe('Start time for outgoing video (seconds)'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time for incoming video (seconds)'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(2).describe('Total transition duration in seconds'),
  overlapDuration: z.number().default(0.8).describe('Overlap period where both videos are visible (seconds)'),
  gridSize: z.number().default(4).describe('Grid size (4 = 4x4 grid with 16 cells)'),
  maxRotation: z.number().default(180).describe('Maximum rotation angle in degrees'),
  maxDepth: z.number().default(1500).describe('Maximum translateZ distance in pixels'),
  maxBlur: z.number().default(10).describe('Maximum blur amount in pixels for distant cells'),
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
    overlapDuration,
    gridSize,
    maxRotation,
    maxDepth,
    maxBlur,
  } = params;

  // Helper function to generate seeded random values for consistency
  const seededRandom = (seed: number, min: number, max: number): number => {
    const x = Math.sin(seed) * 10000;
    const random = x - Math.floor(x);
    return min + random * (max - min);
  };

  // Helper function to calculate blur based on depth
  const calculateBlur = (depth: number): number => {
    const normalizedDepth = Math.abs(depth) / maxDepth;
    return normalizedDepth * maxBlur;
  };

  const cellCount = gridSize * gridSize;
  const cells: RenderableComponentData[] = [];

  for (let i = 0; i < cellCount; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const cellId = `cell-${i}`;
    
    // Calculate cell position as percentage
    const leftPercent = (col / gridSize) * 100;
    const topPercent = (row / gridSize) * 100;
    
    // Generate randomized animation values (seeded by cell index for consistency)
    const seed = i * 123.456;
    const randomDelayOut = seededRandom(seed, 0, 0.4);
    const randomDelayIn = seededRandom(seed + 1, 0, 0.4);
    const rotateXOut = seededRandom(seed + 2, -maxRotation, maxRotation);
    const rotateYOut = seededRandom(seed + 3, -maxRotation, maxRotation);
    const rotateZOut = seededRandom(seed + 4, -maxRotation / 2, maxRotation / 2);
    const translateZOut = seededRandom(seed + 5, -maxDepth, -maxDepth / 2);
    
    const rotateXIn = seededRandom(seed + 6, -maxRotation, maxRotation);
    const rotateYIn = seededRandom(seed + 7, -maxRotation, maxRotation);
    const rotateZIn = seededRandom(seed + 8, -maxRotation / 2, maxRotation / 2);
    const translateZIn = seededRandom(seed + 9, maxDepth / 2, maxDepth);
    
    // Randomized translation offsets for variety
    const translateXOut = seededRandom(seed + 10, -200, 200);
    const translateYOut = seededRandom(seed + 11, -200, 200);
    const translateXIn = seededRandom(seed + 12, -300, 300);
    const translateYIn = seededRandom(seed + 13, -300, 300);

    // Calculate blur values
    const blurOut = calculateBlur(translateZOut);
    const blurIn = calculateBlur(translateZIn);

    // Outgoing video cell (flies away)
    const outgoingCell: RenderableComponentData = {
      id: `${cellId}-outgoing`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom || 0,
        className: 'absolute w-full h-full object-cover',
        style: {
          width: `${gridSize * 100}%`,
          height: `${gridSize * 100}%`,
          left: `-${leftPercent * gridSize}%`,
          top: `-${topPercent * gridSize}%`,
          objectPosition: 'center center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration - overlapDuration + 0.2,
        },
      },
      effects: [
        {
          id: `${cellId}-out-transform`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: randomDelayOut,
            duration: transitionDuration - overlapDuration - randomDelayOut,
            mode: 'provider',
            targetIds: [`${cellId}-outgoing`],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: rotateXOut, prog: 1 },
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: rotateYOut, prog: 1 },
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: rotateZOut, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: translateXOut, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: translateYOut, prog: 1 },
              { key: 'translateZ', val: 0, prog: 0 },
              { key: 'translateZ', val: translateZOut, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.8 },
            ],
          },
        },
        {
          id: `${cellId}-out-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: randomDelayOut,
            duration: transitionDuration - overlapDuration - randomDelayOut,
            mode: 'provider',
            targetIds: [`${cellId}-outgoing`],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${blurOut}px)`, prog: 1 },
            ],
          },
        },
      ],
    };

    // Incoming video cell (flies in)
    const incomingCell: RenderableComponentData = {
      id: `${cellId}-incoming`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        startFrom: incomingVideo.startFrom || 0,
        className: 'absolute w-full h-full object-cover',
        style: {
          width: `${gridSize * 100}%`,
          height: `${gridSize * 100}%`,
          left: `-${leftPercent * gridSize}%`,
          top: `-${topPercent * gridSize}%`,
          objectPosition: 'center center',
        },
      },
      context: {
        timing: {
          start: transitionDuration - overlapDuration,
          duration: overlapDuration + 0.2,
        },
      },
      effects: [
        {
          id: `${cellId}-in-transform`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: randomDelayIn,
            duration: overlapDuration - randomDelayIn,
            mode: 'provider',
            targetIds: [`${cellId}-incoming`],
            ranges: [
              { key: 'rotateX', val: rotateXIn, prog: 0 },
              { key: 'rotateX', val: 0, prog: 1 },
              { key: 'rotateY', val: rotateYIn, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
              { key: 'rotateZ', val: rotateZIn, prog: 0 },
              { key: 'rotateZ', val: 0, prog: 1 },
              { key: 'translateX', val: translateXIn, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: translateYIn, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'translateZ', val: translateZIn, prog: 0 },
              { key: 'translateZ', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        },
        {
          id: `${cellId}-in-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: randomDelayIn,
            duration: overlapDuration - randomDelayIn,
            mode: 'provider',
            targetIds: [`${cellId}-incoming`],
            ranges: [
              { key: 'filter', val: `blur(${blurIn}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    };

    // Cell container with both outgoing and incoming
    const cellContainer: RenderableComponentData = {
      id: cellId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [outgoingCell, incomingCell],
    };

    cells.push(cellContainer);
  }

  // Grid container with perspective
  const gridContainer: RenderableComponentData = {
    id: 'perspective-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: cells,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'perspective-grid-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [gridContainer],
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
  id: 'perspective-grid-3d-transition',
  title: 'Perspective Grid 3D Transition',
  description: 'A 3D perspective grid transition where videos break apart into cells that rotate and fly away in 3D space with depth-of-field blur. Each cell has randomized timing and rotation for an organic feel, creating a data visualization navigation effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'grid', 'perspective', 'depth-of-field', 'video'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 2,
    overlapDuration: 0.8,
    gridSize: 4,
    maxRotation: 180,
    maxDepth: 1500,
    maxBlur: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const perspectiveGrid3dTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
