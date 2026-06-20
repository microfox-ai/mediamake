/**
 * Grid Transition Preset
 *
 * A minimalist rectangular grid transition where the outgoing video is divided into a 3x3 grid
 * of rectangles that scale down individually to reveal the incoming video underneath. Each rectangle
 * shrinks towards its center point with staggered timing (0.05s offset per rectangle), creating
 * a rhythmic dissolution effect.
 *
 * Features:
 * - 3x3 grid division of outgoing video
 * - Individual rectangle scale-down animations
 * - Staggered timing for rhythmic effect (0.05s offset per cell)
 * - Static incoming video underneath
 * - Subtle drop shadow for depth and separation
 * - Sharp geometric forms throughout transition
 * - 1 second total transition duration
 *
 * Technical Details:
 * - Uses BaseLayout with CSS Grid (grid-cols-3 grid-rows-3)
 * - Nine div wrappers, each containing a VideoAtom segment
 * - Incoming video at z-0 covering full container
 * - Each grid cell uses transform effect with staggered delay
 * - Drop shadow filter animates during transition
 * - Overflow-hidden on each cell for clean edges
 *
 * Use cases:
 * - Professional video transitions
 * - Minimalist motion graphics
 * - Geometric reveal effects
 * - Multi-segment video stitching
 * - Clean dissolve transitions
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
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video (will be divided into grid)'),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video (revealed underneath)'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration (overlap transition)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper to calculate grid cell position and transform origin
  const getGridCellStyle = (row: number, col: number) => {
    // Each cell is 33.33% width and height
    // Position video to show correct segment
    const translateX = -col * 100;
    const translateY = -row * 100;
    
    return {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      transformOrigin: 'center center' as const,
    };
  };

  // Helper to get video positioning for grid cell
  const getVideoStyle = (row: number, col: number) => {
    // Video needs to be 3x the cell size to show the full frame
    // Then offset to show the correct segment
    const translateX = -col * 100;
    const translateY = -row * 100;
    
    return {
      width: '300%',
      height: '300%',
      objectFit: 'cover' as const,
      transform: `translate(${translateX}%, ${translateY}%)`,
    };
  };

  // Create grid cells (3x3 = 9 cells)
  const gridCells: RenderableComponentData[] = [];
  let cellIndex = 0;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cellId = `grid-cell-${cellIndex}`;
      const videoId = `grid-video-${cellIndex}`;

      // Calculate staggered timing
      // Each cell starts scaling 0.05s after the previous one
      const effectStartTime = video1.duration - transitionDuration + cellIndex * 0.05;
      const effectDuration = transitionDuration - cellIndex * 0.05;

      // Calculate shadow timing (first half of transition)
      const shadowDuration = effectDuration / 2;

      gridCells.push({
        id: cellId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'overflow-hidden relative',
            style: getGridCellStyle(row, col),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
        effects: [
          // Scale down effect (staggered)
          {
            id: `scale-effect-${cellIndex}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: effectStartTime,
              duration: effectDuration,
              mode: 'provider',
              targetIds: [cellId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0, prog: 1 },
              ],
            },
          },
          // Drop shadow effect (first half of transition)
          {
            id: `shadow-effect-${cellIndex}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: effectStartTime,
              duration: shadowDuration,
              mode: 'provider',
              targetIds: [cellId],
              ranges: [
                { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0,0,0,0))', prog: 0 },
                { key: 'filter', val: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))', prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: videoId,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video1.src,
              className: 'absolute inset-0',
              style: getVideoStyle(row, col),
              fit: 'cover',
            },
            context: {
              timing: {
                start: 0,
                duration: video1.duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData);

      cellIndex++;
    }
  }

  // Build complete structure
  const childrenData: RenderableComponentData[] = [
    // Incoming video (bottom layer, z-0)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'w-full h-full object-cover',
        style: {
          zIndex: 0,
        },
        fit: 'cover',
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
    } as RenderableComponentData,
    // Grid container (top layer, z-1)
    {
      id: 'grid-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 grid grid-cols-3 grid-rows-3',
          style: {
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: gridCells,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'grid-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'grid-transition-minimalist',
  title: 'Minimalist Grid Transition',
  description:
    'A minimalist 3x3 rectangular grid transition where each cell scales down individually with staggered timing to reveal the next video. Features sharp geometric forms, rhythmic dissolution effect, and subtle drop shadows for depth.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'grid', 'geometric', 'minimalist', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const gridTransitionMinimalistPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
