/**
 * Grid Expansion Reveal Preset
 *
 * This preset creates a grid-based expansion effect where content is initially hidden behind
 * a grid of small tiles that expand and merge from the center outward, like pixels assembling
 * to form an image. Each tile starts as a small square at the center point, then expands and
 * moves to its final position in the grid, creating a mosaic reveal effect.
 *
 * Features:
 * - **Grid Layout**: 8x6 grid of tiles (48 total tiles)
 * - **Center-out Animation**: Tiles expand from center, staggered by radial distance
 * - **Organic Movement**: Subtle rotation and scale variations during animation
 * - **Shimmer Effect**: Color shift/brightness animation as tiles lock into place
 * - **Spring Easing**: Bouncy feel for natural movement
 * - **Performance Optimized**: Uses transforms for all motion
 *
 * Technical Details:
 * - Total duration: 2.5s
 * - Per-tile animation: 800ms
 * - Stagger: 50ms based on radial distance from center
 * - Grid: 8 columns × 6 rows = 48 tiles
 * - Each tile animates: scale (0.1→1), translateX/Y (center→position), rotate (random→0), brightness (1.2→1)
 *
 * Use Cases:
 * - Digital video transitions
 * - Image reveal effects
 * - Content assembly animations
 * - Mosaic-style introductions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  contentSrc: z
    .string()
    .describe('Source URL of the content to reveal (image or video)'),
  contentType: z
    .enum(['image', 'video'])
    .default('image')
    .describe('Type of content being revealed'),
  gridCols: z
    .number()
    .int()
    .min(4)
    .max(16)
    .default(8)
    .describe('Number of grid columns'),
  gridRows: z
    .number()
    .int()
    .min(3)
    .max(12)
    .default(6)
    .describe('Number of grid rows'),
  totalDuration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Total duration of the animation in seconds'),
  tileAnimationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of each tile animation in seconds'),
  staggerDelay: z
    .number()
    .min(10)
    .max(200)
    .default(50)
    .describe('Stagger delay in milliseconds based on radial distance'),
  tileGradientStart: z
    .string()
    .default('rgba(255,255,255,0.8)')
    .describe('Starting gradient color for tiles'),
  tileGradientEnd: z
    .string()
    .default('rgba(200,200,255,0.6)')
    .describe('Ending gradient color for tiles'),
  rotationRange: z
    .number()
    .min(0)
    .max(45)
    .default(5)
    .describe('Maximum random rotation in degrees'),
  brightnessStart: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.2)
    .describe('Starting brightness value for shimmer effect'),
  brightnessEnd: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Ending brightness value'),
  trackName: z
    .string()
    .default('grid-expansion')
    .describe('Unique track name for this preset instance'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    contentSrc,
    contentType,
    gridCols,
    gridRows,
    totalDuration,
    tileAnimationDuration,
    staggerDelay,
    tileGradientStart,
    tileGradientEnd,
    rotationRange,
    brightnessStart,
    brightnessEnd,
    trackName,
  } = params;

  // Helper: Calculate grid position for a tile index
  const getGridPosition = (index: number): { col: number; row: number } => {
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    return { col, row };
  };

  // Helper: Calculate center offset for a tile
  const getCenterOffset = (
    col: number,
    row: number,
  ): { x: number; y: number } => {
    const centerCol = (gridCols - 1) / 2;
    const centerRow = (gridRows - 1) / 2;
    const offsetX = (centerCol - col) * 100;
    const offsetY = (centerRow - row) * 100;
    return { x: offsetX, y: offsetY };
  };

  // Helper: Calculate radial distance from center
  const getRadialDistance = (col: number, row: number): number => {
    const centerCol = (gridCols - 1) / 2;
    const centerRow = (gridRows - 1) / 2;
    const dx = col - centerCol;
    const dy = row - centerRow;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper: Generate random rotation within range
  const getRandomRotation = (): number => {
    return (Math.random() - 0.5) * 2 * rotationRange;
  };

  // Calculate total number of tiles
  const totalTiles = gridCols * gridRows;

  // Generate tile components
  const tileComponents: RenderableComponentData[] = [];

  for (let i = 0; i < totalTiles; i++) {
    const { col, row } = getGridPosition(i);
    const { x: offsetX, y: offsetY } = getCenterOffset(col, row);
    const distance = getRadialDistance(col, row);
    const randomRotation = getRandomRotation();
    const startTime = (distance * staggerDelay) / 1000; // Convert ms to seconds

    const tileId = `${trackName}-tile-${i}`;

    const tile: RenderableComponentData = {
      id: tileId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            background: `linear-gradient(135deg, ${tileGradientStart}, ${tileGradientEnd})`,
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
          id: `${tileId}-expand`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [tileId],
            type: 'spring',
            start: startTime,
            duration: tileAnimationDuration,
            ranges: [
              // Scale from tiny to full
              { key: 'scale', val: 0.1, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Translate from center to final position
              { key: 'translateX', val: `${offsetX}%`, prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
              { key: 'translateY', val: `${offsetY}%`, prog: 0 },
              { key: 'translateY', val: '0%', prog: 1 },
              // Rotate from random angle to 0
              { key: 'rotate', val: randomRotation, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              // Brightness shimmer
              { key: 'brightness', val: brightnessStart, prog: 0 },
              { key: 'brightness', val: brightnessEnd, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };

    tileComponents.push(tile);
  }

  // Content layer (revealed behind tiles)
  const contentAtomId = `${trackName}-content`;
  const contentAtom: RenderableComponentData = {
    id: contentAtomId,
    type: 'atom',
    componentId: contentType === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: contentSrc,
      className: 'w-full h-full object-cover',
      ...(contentType === 'video' && {
        muted: true,
        loop: true,
      }),
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  const contentLayer: RenderableComponentData = {
    id: `${trackName}-content-layer`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [contentAtom],
  };

  // Grid container
  const gridContainer: RenderableComponentData = {
    id: `${trackName}-grid-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 grid gap-0`,
        style: {
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: tileComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
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
        duration: totalDuration,
      },
    },
    childrenData: [contentLayer, gridContainer],
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
  id: 'grid-expansion-reveal',
  title: 'Grid Expansion Reveal',
  description:
    'A grid-based expansion preset where content is revealed through a mosaic of tiles that expand from the center outward. Tiles start as small squares at the center and expand to their final positions with subtle rotation, scale variations, and shimmer effects. Features radial stagger timing, spring easing, and organic movement for a digital assembly effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'reveal', 'grid', 'mosaic', 'animation', 'expansion'],
  defaultInputParams: {
    contentSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    contentType: 'image',
    gridCols: 8,
    gridRows: 6,
    totalDuration: 2.5,
    tileAnimationDuration: 0.8,
    staggerDelay: 50,
    tileGradientStart: 'rgba(255,255,255,0.8)',
    tileGradientEnd: 'rgba(200,200,255,0.6)',
    rotationRange: 5,
    brightnessStart: 1.2,
    brightnessEnd: 1,
    trackName: 'grid-expansion',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const gridExpansionRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
