/**
 * Rectangular Grid Wipe Transition Preset
 *
 * This preset creates a sophisticated grid-based transition effect where the frame divides
 * into a 4x4 grid of rectangles that sequentially reveal the incoming video. Each rectangle
 * performs a 3D flip/rotate animation with perspective effects, creating a cascading reveal
 * pattern from top-left to bottom-right.
 *
 * Features:
 * - **4x4 Grid Layout**: Frame divided into 16 rectangular sections
 * - **3D Perspective Effects**: Each rectangle flips with rotateY transform and depth
 * - **Cascading Timing**: Staggered animations based on row and column positions
 * - **Drop Shadow**: Enhances 3D effect as rectangles flip away
 * - **Focus-Pull Blur**: Incoming video starts blurred and sharpens progressively
 * - **Configurable Duration**: Total transition time of 2 seconds
 * - **Precise Staggering**: Each cell delayed by 0.1s based on position
 *
 * Use cases:
 * - Creating dynamic transitions between video clips
 * - Building engaging reveal effects for presentations
 * - Adding professional 3D transitions to video content
 * - Implementing grid-based wipe effects with depth
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the grid wipe transition in seconds'),
  gridRows: z.number().default(4).describe('Number of rows in the grid'),
  gridCols: z.number().default(4).describe('Number of columns in the grid'),
  cellAnimationDuration: z
    .number()
    .default(0.3)
    .describe('Duration of each cell flip animation in seconds'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each cell animation in seconds'),
  blurAmount: z
    .number()
    .default(4)
    .describe('Initial blur amount for incoming video in pixels'),
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
    gridRows,
    gridCols,
    cellAnimationDuration,
    staggerDelay,
    blurAmount,
  } = params;

  // Calculate total duration: video1 + video2 - transition overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate when transition starts (relative to root)
  const transitionStartTime = video1.duration - transitionDuration;

  // Helper function to generate grid cells
  const generateGridCells = (): RenderableComponentData[] => {
    const cells: RenderableComponentData[] = [];
    const cellWidth = 100 / gridCols;
    const cellHeight = 100 / gridRows;

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const cellId = `grid-cell-${row}-${col}`;
        const left = col * cellWidth;
        const top = row * cellHeight;
        
        // Calculate stagger start time based on position (top-left to bottom-right)
        const staggerStart = (row * staggerDelay) + (col * staggerDelay);

        cells.push({
          id: cellId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute',
              style: {
                top: `${top}%`,
                left: `${left}%`,
                width: `${cellWidth}%`,
                height: `${cellHeight}%`,
                backgroundColor: '#000000',
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              },
            },
          },
          context: {
            timing: {
              start: staggerStart,
              duration: cellAnimationDuration,
            },
          },
          effects: [
            {
              id: `flip-effect-${row}-${col}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: cellAnimationDuration,
                mode: 'provider',
                targetIds: [cellId],
                ranges: [
                  { key: 'rotateY', val: 0, prog: 0 },
                  { key: 'rotateY', val: 90, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        } as RenderableComponentData);
      }
    }

    return cells;
  };

  // Build the composition structure
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (bottom layer)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [],
      childrenData: [],
    } as RenderableComponentData,

    // Incoming video (middle layer with blur effect)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: video2.duration,
        },
      },
      effects: [
        {
          id: 'blur-to-sharp-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: `blur(${blurAmount}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Grid container (top layer)
    {
      id: 'grid-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 30,
            perspective: '1000px',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [],
      childrenData: generateGridCells(),
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'grid-wipe-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [],
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
  id: 'grid-wipe-transition-4x4',
  title: 'Rectangular Grid Wipe Transition',
  description:
    'A 4x4 grid wipe transition where rectangles sequentially flip away with 3D perspective to reveal incoming video. Features cascading reveal from top-left to bottom-right with drop shadows and a focus-pull blur effect on the incoming video.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'grid', 'wipe', '3d', 'perspective', 'flip', 'blur'],
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
    gridRows: 4,
    gridCols: 4,
    cellAnimationDuration: 0.3,
    staggerDelay: 0.1,
    blurAmount: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const gridWipeTransition4x4Preset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
