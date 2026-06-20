/**
 * Data-Driven Venetian Blinds Mosaic Preset
 *
 * AI-powered video reveal with dynamic grid patterns (3x3 to 7x7) where each blind cell
 * animates with configurable patterns: spiral out from center, random shuffle, wave from corner,
 * or checkerboard alternating. Each blind scales from 0 to 1 while rotating and fading in.
 *
 * Features:
 * - **Dynamic Grid Layout**: Configurable grid size (3x3, 4x4, 5x5, 6x6, 7x7) using CSS Grid
 * - **Animation Modes**: Spiral, random, wave, checkerboard animation patterns
 * - **Detail-Aware**: High-detail cells (specified via detailMap) animate slower with pulse effects
 * - **Complex Effects**: Each blind scales from 0→1, rotates -180deg→0deg, fades in 0→1
 * - **Performance Optimized**: CSS containment, batched animations, maximum 7x7 grid
 *
 * Use cases:
 * - Creating dramatic video reveals with mosaic patterns
 * - Building AI-powered video intros with scene analysis
 * - Adding sophisticated grid-based transitions
 * - Creating content-aware video reveals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---

const presetParams = z.object({
  video: z
    .object({
      src: z.string().describe('Video source URL or path'),
      start: z.number().default(0).describe('Video start time in seconds'),
      duration: z
        .number()
        .optional()
        .describe('Video duration (optional, uses full video if not specified)'),
      fit: z
        .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
        .default('cover')
        .describe('Video object-fit mode'),
    })
    .describe('Video configuration'),

  gridSize: z
    .number()
    .int()
    .min(3)
    .max(7)
    .default(4)
    .describe('Grid dimensions (3-7, e.g., 4 = 4x4 grid)'),

  animationMode: z
    .enum(['spiral', 'random', 'wave', 'checkerboard'])
    .default('spiral')
    .describe(
      'Animation pattern: spiral (from center), random, wave (diagonal), checkerboard',
    ),

  baseDuration: z
    .number()
    .positive()
    .default(1.5)
    .describe('Base animation duration per blind in seconds'),

  delayMultiplier: z
    .number()
    .positive()
    .default(0.1)
    .describe('Delay multiplier between blinds (seconds)'),

  detailMap: z
    .array(
      z.object({
        row: z.number().int().describe('Row index of high-detail cell'),
        col: z.number().int().describe('Column index of high-detail cell'),
      }),
    )
    .optional()
    .describe(
      'Array of {row, col} coordinates indicating high-detail cells (slower animation, pulse effect)',
    ),

  rotationIntensity: z
    .number()
    .default(180)
    .describe('Rotation intensity in degrees (default -180 to 0)'),

  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color behind grid'),
});

// --- Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video,
    gridSize,
    animationMode,
    baseDuration,
    delayMultiplier,
    detailMap = [],
    rotationIntensity,
    backgroundColor,
  } = params;

  // Helper: Check if cell is high-detail
  const isHighDetail = (row: number, col: number): boolean => {
    return detailMap.some((cell) => cell.row === row && cell.col === col);
  };

  // Helper: Calculate distance from center (for spiral mode)
  const distanceFromCenter = (row: number, col: number): number => {
    const centerRow = (gridSize - 1) / 2;
    const centerCol = (gridSize - 1) / 2;
    return Math.sqrt(
      Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2),
    );
  };

  // Helper: Calculate diagonal distance from top-left (for wave mode)
  const diagonalDistance = (row: number, col: number): number => {
    return row + col;
  };

  // Helper: Calculate delay based on animation mode
  const calculateDelay = (row: number, col: number, index: number): number => {
    switch (animationMode) {
      case 'spiral':
        return distanceFromCenter(row, col) * delayMultiplier;

      case 'random':
        // Seeded random based on index for consistency
        const seed = index * 9301 + 49297;
        const random = (seed % 233280) / 233280;
        return random * gridSize * delayMultiplier;

      case 'wave':
        return diagonalDistance(row, col) * delayMultiplier;

      case 'checkerboard':
        const isEven = (row + col) % 2 === 0;
        return isEven ? 0 : delayMultiplier * 2;

      default:
        return 0;
    }
  };

  // Generate grid cells
  const gridCells: RenderableComponentData[] = [];
  const totalCells = gridSize * gridSize;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cellIndex = row * gridSize + col;
      const cellId = `blind-cell-${row}-${col}`;
      const videoClipId = `blind-video-${row}-${col}`;

      const isHighDetailCell = isHighDetail(row, col);
      const cellDelay = calculateDelay(row, col, cellIndex);
      const cellDuration = isHighDetailCell
        ? baseDuration * 2
        : baseDuration;

      // Calculate video clip positioning (negative offsets to show grid portion)
      const videoWidth = gridSize * 100; // e.g., 400% for 4x4
      const videoHeight = gridSize * 100;
      const leftOffset = -(col * 100); // e.g., -100%, -200%
      const topOffset = -(row * 100);

      // Base effect ranges (scale, rotate, opacity)
      const baseRanges = [
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'rotateZ', val: -rotationIntensity, prog: 0 },
        { key: 'rotateZ', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ];

      // High-detail cells: add pulse effect (scale up slightly mid-animation)
      const effectRanges = isHighDetailCell
        ? [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.5 }, // Pulse peak
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotateZ', val: -rotationIntensity, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ]
        : baseRanges;

      // Blind cell container
      const blindCell: RenderableComponentData = {
        id: cellId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              overflow: 'hidden',
              contain: 'layout',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video.duration || 10,
          },
        },
        childrenData: [
          {
            id: videoClipId,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video.src,
              fit: video.fit,
              muted: true,
              className: 'absolute',
              style: {
                width: `${videoWidth}%`,
                height: `${videoHeight}%`,
                objectFit: video.fit,
                left: `${leftOffset}%`,
                top: `${topOffset}%`,
              },
            },
            context: {
              timing: {
                start: video.start,
                duration: video.duration || 10,
              },
            },
            effects: [
              {
                id: `blind-effect-${row}-${col}`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: cellDelay,
                  duration: cellDuration,
                  mode: 'provider',
                  targetIds: [cellId],
                  ranges: effectRanges,
                },
              },
            ],
          },
        ],
      };

      gridCells.push(blindCell);
    }
  }

  // Background video (full frame, behind grid)
  const backgroundVideo: RenderableComponentData = {
    id: 'venetian-blinds-bg-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video.src,
      fit: video.fit,
      muted: false,
      className: 'w-full h-full object-cover',
      style: {
        objectFit: video.fit,
      },
    },
    context: {
      timing: {
        start: video.start,
        duration: video.duration || 10,
      },
    },
  };

  // Grid container
  const gridContainer: RenderableComponentData = {
    id: 'venetian-blinds-grid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          contain: 'layout',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video.duration || 10,
      },
    },
    childrenData: gridCells as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blinds-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video.duration || 10,
      },
    },
    childrenData: [
      backgroundVideo,
      gridContainer,
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

// --- Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'venetian-blinds-mosaic',
  title: 'Data-Driven Venetian Blinds Mosaic',
  description:
    'AI-powered video reveal with dynamic grid (3x3 to 7x7) where each blind cell animates with configurable patterns (spiral, wave, random, checkerboard). Blinds scale from 0 to 1, rotate from -180deg to 0deg, and fade in. High-detail cells (configurable via detailMap) animate slower with pulse effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'video',
    'reveal',
    'grid',
    'mosaic',
    'blinds',
    'ai',
    'data-driven',
    'animation',
  ],
  defaultInputParams: {
    video: {
      src: 'https://example.com/video.mp4',
      start: 0,
      duration: 10,
      fit: 'cover',
    },
    gridSize: 4,
    animationMode: 'spiral',
    baseDuration: 1.5,
    delayMultiplier: 0.1,
    detailMap: [
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ],
    rotationIntensity: 180,
    backgroundColor: '#000000',
  },
  dependencies: {},
};

// --- Export ---

export const venetianBlindsMosaicPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
