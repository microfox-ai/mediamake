/**
 * Grid Dissolve Transition Preset
 *
 * A minimalist transition effect that reveals the incoming video through a precise grid pattern.
 * The frame is divided into a 4x4 (or configurable) grid where each cell scales from 0 to full size
 * in a diagonal wave pattern from top-left to bottom-right.
 *
 * Features:
 * - Configurable grid size (4x4 or 5x5)
 * - Diagonal wave reveal pattern with staggered timing
 * - Scale animation for each grid cell
 * - Precise clip-path masking with no gaps or overlaps
 * - Clean, organized dissolution effect
 *
 * Technical Implementation:
 * - Each grid cell is a separate VideoAtom instance of the incoming video
 * - Cells use clip-path with inset() to show only their grid section
 * - Scale effects animate from 0 to 1 with diagonal stagger
 * - Outgoing video remains visible in gaps until all cells fill in
 * - Total transition duration: 0.7s (configurable)
 *
 * Use cases:
 * - Clean video transitions with geometric patterns
 * - Professional video montages
 * - Modern, minimalist video presentations
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
  gridSize: z.enum(['4', '5']).default('4').describe('Grid dimensions (4x4 or 5x5)'),
  transitionDuration: z.number().default(0.7).describe('Total transition duration in seconds'),
  cellStaggerDelay: z.number().default(0.03).describe('Delay between each cell animation in seconds'),
  cellAnimationDuration: z.number().default(0.5).describe('Duration of each cell scale animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, gridSize, transitionDuration, cellStaggerDelay, cellAnimationDuration } = params;

  // Parse grid size
  const gridDimension = parseInt(gridSize, 10);
  const totalCells = gridDimension * gridDimension;
  const cellSize = 100 / gridDimension;

  // Calculate total duration
  // Transition duration should accommodate the last cell to complete
  const baseLayoutDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper function to calculate grid cell position and clip-path
  const getCellData = (row: number, col: number) => {
    const left = col * cellSize;
    const top = row * cellSize;
    const right = 100 - (col + 1) * cellSize;
    const bottom = 100 - (row + 1) * cellSize;

    return {
      left: `${left}%`,
      top: `${top}%`,
      clipPath: `inset(${top}% ${right}% ${bottom}% ${left}%)`,
      width: `${cellSize}%`,
      height: `${cellSize}%`,
      delay: (row + col) * cellStaggerDelay,
    };
  };

  // Generate grid cells
  const gridCells: RenderableComponentData[] = [];
  let zIndex = 10;

  for (let row = 0; row < gridDimension; row++) {
    for (let col = 0; col < gridDimension; col++) {
      const cellData = getCellData(row, col);
      const cellId = `grid-cell-${row}-${col}`;

      gridCells.push({
        id: cellId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          className: 'absolute object-cover',
          fit: 'cover',
          style: {
            left: cellData.left,
            top: cellData.top,
            width: cellData.width,
            height: cellData.height,
            zIndex: zIndex++,
            clipPath: cellData.clipPath,
          },
        },
        context: {
          timing: {
            start: outgoingVideo.duration - transitionDuration,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: `scale-effect-${row}-${col}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: cellData.delay,
              duration: cellAnimationDuration,
              mode: 'provider',
              targetIds: [cellId],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // Build the transition structure
  const childrenData: RenderableComponentData[] = [
    // Outgoing video layer (background)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
    } as RenderableComponentData,
    // Grid container with incoming video cells
    {
      id: 'grid-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 w-full h-full',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      childrenData: gridCells,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'grid-dissolve-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData,
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
  id: 'grid-dissolve-transition',
  title: 'Minimalist Grid Dissolve Transition',
  description: 'A clean checkerboard transition where videos transition through a precise grid pattern with diagonal wave reveals and scale animations',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'grid', 'dissolve', 'geometric', 'minimalist', 'checkerboard'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    gridSize: '4',
    transitionDuration: 0.7,
    cellStaggerDelay: 0.03,
    cellAnimationDuration: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const gridDissolveTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};