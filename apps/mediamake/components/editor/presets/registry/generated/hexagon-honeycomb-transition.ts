/**
 * Hexagonal Honeycomb Transition Preset
 *
 * A sophisticated transition effect where the screen divides into a grid of hexagonal cells
 * that flip individually with 3D rotation to reveal the new video. Features:
 * - Wave-like propagation from top-left corner diagonally across the screen
 * - 3D rotation effect (rotateY 0deg → 180deg) for each hexagon
 * - Outgoing video on front face, incoming video on back face
 * - Staggered flip timing based on distance from origin (sqrt((row-0)^2 + (col-0)^2) * 50ms)
 * - Subtle color shift during flip transition
 * - Flash of light at flip midpoint for enhanced transformation effect
 * - 1.8-second overlap between videos
 *
 * Use cases:
 * - Creating dynamic transitions between video clips
 * - Building engaging visual effects for video sequences
 * - Adding cinematic transitions with geometric patterns
 * - Creating modern, tech-inspired video transitions
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
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First (outgoing) video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second (incoming) video configuration'),
  overlapDuration: z.number().default(1.8).describe('Duration of transition overlap in seconds'),
  gridRows: z.number().default(7).min(3).max(12).describe('Number of hexagon rows in the grid'),
  gridCols: z.number().default(5).min(3).max(10).describe('Number of hexagon columns in the grid'),
  hexWidth: z.number().default(100).describe('Width of each hexagon in pixels'),
  hexHeight: z.number().default(115).describe('Height of each hexagon in pixels'),
  flipDuration: z.number().default(0.8).describe('Duration of each hexagon flip animation in seconds'),
  staggerDelay: z.number().default(50).describe('Stagger delay multiplier in milliseconds per distance unit'),
  flashDuration: z.number().default(0.4).describe('Duration of the flash effect in seconds'),
  colorShift: z.boolean().default(true).describe('Enable subtle color shift during flip'),
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
    gridRows,
    gridCols,
    hexWidth,
    hexHeight,
    flipDuration,
    staggerDelay,
    flashDuration,
    colorShift,
  } = params;

  // Calculate composition duration
  const compositionDuration = video1.duration + video2.duration - overlapDuration;

  // Helper function to calculate hex position
  const calculateHexPosition = (row: number, col: number) => {
    const rowOffset = (row % 2) * (hexWidth / 2);
    const left = col * (hexWidth * 0.75) + rowOffset;
    const top = row * (hexHeight * 0.86); // Vertical spacing for honeycomb pattern
    return { left, top };
  };

  // Helper function to calculate distance from origin (top-left)
  const calculateDistance = (row: number, col: number): number => {
    return Math.sqrt(row * row + col * col);
  };

  // Helper function to calculate stagger delay
  const calculateStaggerDelay = (row: number, col: number): number => {
    const distance = calculateDistance(row, col);
    return (distance * staggerDelay) / 1000; // Convert ms to seconds
  };

  // Create hexagon cells
  const hexagonCells: RenderableComponentData[] = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const cellId = `hex-cell-${row}-${col}`;
      const position = calculateHexPosition(row, col);
      const staggerDelaySeconds = calculateStaggerDelay(row, col);
      const flipStartTime = video1.duration - overlapDuration + staggerDelaySeconds;

      // Hexagon cell container
      const hexCell: RenderableComponentData = {
        id: cellId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${hexWidth}px`,
              height: `${hexHeight}px`,
              left: `${position.left}px`,
              top: `${position.top}px`,
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: compositionDuration,
          },
        },
        childrenData: [
          // Front face (outgoing video)
          {
            id: `${cellId}-front`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video1.src,
              className: 'absolute inset-0 w-full h-full object-cover',
              fit: 'cover',
              startFrom: 0,
              volume: 0,
              muted: true,
              style: {
                backfaceVisibility: 'hidden',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: video1.duration,
              },
            },
          } as RenderableComponentData,
          // Back face (incoming video)
          {
            id: `${cellId}-back`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video2.src,
              className: 'absolute inset-0 w-full h-full object-cover',
              fit: 'cover',
              startFrom: 0,
              volume: 0,
              muted: true,
              style: {
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              },
            },
            context: {
              timing: {
                start: video1.duration - overlapDuration,
                duration: video2.duration + overlapDuration,
              },
            },
          } as RenderableComponentData,
          // Flash effect overlay
          {
            id: `${cellId}-flash`,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div class="absolute inset-0 bg-white pointer-events-none"></div>',
              className: 'absolute inset-0',
            },
            context: {
              timing: {
                start: flipStartTime,
                duration: flipDuration,
              },
            },
            effects: [
              {
                id: `${cellId}-flash-effect`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: flashDuration,
                  mode: 'provider',
                  targetIds: [`${cellId}-flash`],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.6, prog: 0.5 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
        effects: [
          // 3D rotation effect
          {
            id: `${cellId}-rotate`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: flipStartTime,
              duration: flipDuration,
              mode: 'provider',
              targetIds: [cellId],
              ranges: [
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: 180, prog: 1 },
              ],
            },
          },
          // Optional color shift effect
          ...(colorShift
            ? [
                {
                  id: `${cellId}-color-shift`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-in-out',
                    start: flipStartTime,
                    duration: flipDuration,
                    mode: 'provider',
                    targetIds: [cellId],
                    ranges: [
                      { key: 'filter', val: 'hue-rotate(0deg) brightness(1)', prog: 0 },
                      { key: 'filter', val: 'hue-rotate(20deg) brightness(1.2)', prog: 0.5 },
                      { key: 'filter', val: 'hue-rotate(0deg) brightness(1)', prog: 1 },
                    ],
                  },
                },
              ]
            : []),
        ],
      };

      hexagonCells.push(hexCell);
    }
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'hexagon-honeycomb-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: compositionDuration,
      },
    },
    childrenData: [
      // Base outgoing video (visible until hexagons cover it)
      {
        id: 'outgoing-video-base',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          startFrom: 0,
          volume: 1,
          muted: false,
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
      // Base incoming video (visible after transition completes)
      {
        id: 'incoming-video-base',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          startFrom: 0,
          volume: 1,
          muted: false,
        },
        context: {
          timing: {
            start: video1.duration - overlapDuration,
            duration: video2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
      // Hexagon grid container
      {
        id: 'hexagon-grid-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: compositionDuration,
          },
        },
        childrenData: hexagonCells,
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
  id: 'hexagon-honeycomb-transition',
  title: 'Hexagonal Honeycomb Transition',
  description: 'A sophisticated transition effect where the screen divides into a grid of hexagonal cells that flip individually with 3D rotation to reveal the new video. Features wave-like propagation, color shifts, and flash effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'hexagon', 'honeycomb', '3d', 'flip', 'geometric', 'modern'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 1.8,
    gridRows: 7,
    gridCols: 5,
    hexWidth: 100,
    hexHeight: 115,
    flipDuration: 0.8,
    staggerDelay: 50,
    flashDuration: 0.4,
    colorShift: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hexagonHoneycombTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
