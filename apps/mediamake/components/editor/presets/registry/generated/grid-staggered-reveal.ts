/**
 * Grid Staggered Reveal Effect Preset
 *
 * This preset creates a sophisticated grid-aligned content reveal effect with staggered timing
 * based on grid position. Elements fade in and slide from their offset positions to exact grid
 * alignment points with configurable reveal patterns and optional bounce effect on arrival.
 *
 * Features:
 * - **Multiple Reveal Patterns**: Diagonal (top-left to bottom-right), spiral (from center outward), random, or row-by-row
 * - **Staggered Timing**: Each element has a unique delay calculated from its grid coordinates
 * - **Smooth Transitions**: Combined fade-in, slide, and optional bounce effects
 * - **Flexible Grid Configuration**: Configurable grid size and positioning
 * - **Customizable Animation**: Control stagger delay, slide distance, fade opacity, and bounce intensity
 *
 * Use cases:
 * - Creating dynamic grid-based content reveals for image galleries
 * - Building engaging product showcase animations
 * - Adding professional grid transitions to video content
 * - Creating attention-grabbing visual effects for social media
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters schema
const presetParams = z.object({
  gridSize: z
    .number()
    .min(20)
    .max(200)
    .default(50)
    .describe('Size of each grid cell in pixels'),
  staggerDelay: z
    .number()
    .min(10)
    .max(500)
    .default(100)
    .describe('Delay in milliseconds between each element reveal'),
  slideDistance: z
    .number()
    .min(0)
    .max(200)
    .default(30)
    .describe('Distance in pixels elements slide from (negative offset from grid position)'),
  fadeStartOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Starting opacity value for fade-in effect (0-1)'),
  revealPattern: z
    .enum(['diagonal', 'spiral', 'random', 'rows'])
    .default('diagonal')
    .describe(
      'Pattern for revealing elements: diagonal (top-left to bottom-right), spiral (center outward), random, or rows (row-by-row)',
    ),
  bounce: z
    .boolean()
    .default(true)
    .describe('Enable bounce effect when elements arrive at their position'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the staggered reveal effect'),
  gridColumns: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .describe('Number of columns in the grid (auto-calculated if not provided)'),
  effectDuration: z
    .number()
    .min(200)
    .max(2000)
    .default(600)
    .describe('Duration of each element animation in milliseconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    gridSize,
    staggerDelay,
    slideDistance,
    fadeStartOpacity,
    revealPattern,
    bounce,
    targetIds,
    gridColumns: providedColumns,
    effectDuration,
  } = params;

  // Helper function to calculate grid position from index
  const calculateGridPosition = (
    index: number,
    totalElements: number,
    cols: number,
  ): { row: number; col: number } => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { row, col };
  };

  // Helper function to calculate stagger delay based on pattern
  const calculateStaggerDelay = (
    index: number,
    totalElements: number,
    cols: number,
  ): number => {
    const { row, col } = calculateGridPosition(index, totalElements, cols);
    const rows = Math.ceil(totalElements / cols);

    switch (revealPattern) {
      case 'diagonal':
        // Diagonal from top-left to bottom-right
        return (row + col) * staggerDelay;

      case 'spiral':
        // Spiral from center outward
        const centerRow = rows / 2;
        const centerCol = cols / 2;
        const distanceFromCenter = Math.sqrt(
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2),
        );
        return Math.round(distanceFromCenter * staggerDelay);

      case 'random':
        // Randomized with consistent seed based on index
        const seed = index * 9301 + 49297;
        const randomValue = (seed % 233280) / 233280;
        return Math.round(randomValue * staggerDelay * totalElements * 0.5);

      case 'rows':
        // Row-by-row from top to bottom
        return row * staggerDelay;

      default:
        return index * staggerDelay;
    }
  };

  // Calculate grid dimensions
  const totalElements = targetIds.length;
  const gridCols = providedColumns || Math.ceil(Math.sqrt(totalElements));
  const gridRows = Math.ceil(totalElements / gridCols);

  // Calculate maximum delay for total duration
  const maxDelay =
    calculateStaggerDelay(totalElements - 1, totalElements, gridCols) +
    effectDuration;

  // Convert durations to seconds
  const staggerDelaySeconds = staggerDelay / 1000;
  const effectDurationSeconds = effectDuration / 1000;
  const maxDelaySeconds = maxDelay / 1000;

  // Generate effects for each target
  const gridItemEffects = targetIds.map((targetId, index) => {
    const delayMs = calculateStaggerDelay(index, totalElements, gridCols);
    const startTimeSeconds = delayMs / 1000;

    // Build animation ranges
    const ranges: Array<{
      key: string;
      val: number | number[];
      prog: number | number[];
    }> = [
      // Opacity fade-in
      {
        key: 'opacity',
        val: [fadeStartOpacity, 1],
        prog: [0, 0.6],
      },
      // Slide in from offset position (X axis)
      {
        key: 'translateX',
        val: [-slideDistance, 0],
        prog: [0, 0.8],
      },
      // Slide in from offset position (Y axis)
      {
        key: 'translateY',
        val: [-slideDistance, 0],
        prog: [0, 0.8],
      },
    ];

    // Add bounce effect if enabled
    if (bounce) {
      ranges.push({
        key: 'scale',
        val: [1, 1.05, 1],
        prog: [0.7, 0.85, 1],
      });
    }

    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: startTimeSeconds,
      duration: effectDurationSeconds,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges as any,
    };

    return {
      id: `grid-reveal-effect-${index}-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Create root container with all effects
  const rootContainer: RenderableComponentData = {
    id: 'grid-staggered-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          '--grid-cols': gridCols,
          '--grid-rows': gridRows,
          '--grid-size': `${gridSize}px`,
        } as React.CSSProperties,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: maxDelaySeconds,
      },
    },
    effects: gridItemEffects,
    childrenData: [] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'grid-staggered-reveal',
  title: 'Grid Staggered Reveal',
  description:
    'Reveals grid-aligned content with staggered timing based on grid position. Elements fade in and slide from offset positions to exact grid alignment points with configurable reveal patterns (diagonal, spiral, random, row-by-row) and optional bounce effect on arrival.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'grid',
    'reveal',
    'stagger',
    'animation',
    'fade',
    'slide',
    'bounce',
    'diagonal',
    'spiral',
    'pattern',
  ],
  dependencies: {},
  defaultInputParams: {
    gridSize: 50,
    staggerDelay: 100,
    slideDistance: 30,
    fadeStartOpacity: 0,
    revealPattern: 'diagonal',
    bounce: true,
    targetIds: ['grid-item-1', 'grid-item-2', 'grid-item-3', 'grid-item-4'],
    effectDuration: 600,
  },
};

// Export preset
export const gridStaggeredRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
