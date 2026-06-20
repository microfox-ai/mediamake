/**
 * PrecisionGrid Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset generates a sophisticated multi-stage positioning effect
 * for arranging elements in mathematically precise grid formations.
 *
 * Features:
 * - Grid-based positioning with configurable rows, columns, and spacing
 * - Spring-based easing for smooth, natural movement
 * - Staggered timing for progressive reveal
 * - Multi-property animation (translateX, translateY, scale, opacity)
 * - "Lock-in" pulse effect when elements reach their final position
 * - Flexible alignment options (center, start, end)
 *
 * Returns an array of generic effects, one per element in targetIds, with:
 * - Calculated grid coordinates based on element index
 * - Progressive stagger timing
 * - Synchronized translateX/translateY/scale/opacity animations
 * - Scale pulse (0.95 → 1.05 → 1) at 80-100% progress for satisfying "lock-in" feel
 * - Opacity fade-in during first 30% of movement
 *
 * Use cases:
 * - Grid layouts for image galleries, product showcases
 * - Animated card arrangements
 * - Dynamic tile-based layouts
 * - Choreographed element positioning
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to arrange in grid'),
  gridColumns: z.number().min(1).describe('Number of columns in the grid'),
  gridRows: z.number().min(1).describe('Number of rows in the grid'),
  spacing: z.number().describe('Spacing between grid elements in pixels'),
  stagger: z.number().describe('Delay between each element animation (seconds)'),
  alignment: z
    .enum(['center', 'start', 'end'])
    .describe('Alignment of grid within container'),
  duration: z
    .number()
    .optional()
    .default(1000)
    .describe('Duration of each element animation in milliseconds'),
  effectStart: z
    .number()
    .optional()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  containerWidth: z
    .number()
    .optional()
    .default(1920)
    .describe('Container width for calculating centered positions'),
  containerHeight: z
    .number()
    .optional()
    .default(1080)
    .describe('Container height for calculating centered positions'),
  elementWidth: z
    .number()
    .optional()
    .default(200)
    .describe('Width of each element for grid calculations'),
  elementHeight: z
    .number()
    .optional()
    .default(200)
    .describe('Height of each element for grid calculations'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    gridColumns,
    gridRows,
    spacing,
    stagger,
    alignment,
    duration = 1000,
    effectStart = 0,
    containerWidth = 1920,
    containerHeight = 1080,
    elementWidth = 200,
    elementHeight = 200,
  } = params;

  // Helper function to calculate grid position for an element based on its index
  const calculateGridPosition = (
    index: number,
  ): { x: number; y: number; col: number; row: number } => {
    const col = index % gridColumns;
    const row = Math.floor(index / gridColumns);

    // Calculate total grid dimensions
    const totalGridWidth = gridColumns * elementWidth + (gridColumns - 1) * spacing;
    const totalGridHeight = gridRows * elementHeight + (gridRows - 1) * spacing;

    // Calculate base position (top-left of grid)
    let gridStartX = 0;
    let gridStartY = 0;

    if (alignment === 'center') {
      gridStartX = (containerWidth - totalGridWidth) / 2;
      gridStartY = (containerHeight - totalGridHeight) / 2;
    } else if (alignment === 'start') {
      gridStartX = spacing;
      gridStartY = spacing;
    } else if (alignment === 'end') {
      gridStartX = containerWidth - totalGridWidth - spacing;
      gridStartY = containerHeight - totalGridHeight - spacing;
    }

    // Calculate element position within grid
    const x = gridStartX + col * (elementWidth + spacing) + elementWidth / 2;
    const y = gridStartY + row * (elementHeight + spacing) + elementHeight / 2;

    return { x, y, col, row };
  };

  // Generate effects for each target element
  const effects = targetIds.map((targetId, index) => {
    const { x, y } = calculateGridPosition(index);
    const elementStart = effectStart + index * stagger;
    const durationInSeconds = duration / 1000;

    const effectData: GenericEffectData = {
      type: 'spring',
      start: elementStart,
      duration: durationInSeconds,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // TranslateX: Move to grid X position
        { key: 'translateX', val: x, prog: 0 },
        { key: 'translateX', val: x, prog: 1 },
        
        // TranslateY: Move to grid Y position
        { key: 'translateY', val: y, prog: 0 },
        { key: 'translateY', val: y, prog: 1 },
        
        // Scale: Pulse effect for "lock-in" feel
        { key: 'scale', val: 0.95, prog: 0.8 },
        { key: 'scale', val: 1.05, prog: 0.9 },
        { key: 'scale', val: 1, prog: 1 },
        
        // Opacity: Fade in during first 30% of movement
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ],
    };

    return {
      id: `precision-grid-effect-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return effects in a container structure
  // System will extract these effects when _internalPresetOutput: 'effects'
  return {
    output: {
      childrenData: [
        {
          id: 'precision-grid-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'precision-grid-effect',
  title: 'PrecisionGrid',
  description:
    'Internal effect preset that generates multi-stage positioning effects for arranging elements in mathematically precise grid formations. Accepts parameters for gridColumns, gridRows, spacing, stagger delay, and alignment. Returns generic effects that animate elements from scattered positions to precise grid coordinates using spring-based easing. Includes synchronized translateX/translateY movement, a scale pulse (0.95 to 1.05 to 1) for a satisfying "lock-in" feel when elements reach their final position, and an opacity fade-in during movement.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'grid', 'positioning', 'layout', 'animation', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3', 'element-4'],
    gridColumns: 2,
    gridRows: 2,
    spacing: 20,
    stagger: 0.1,
    alignment: 'center',
    duration: 1000,
    effectStart: 0,
    containerWidth: 1920,
    containerHeight: 1080,
    elementWidth: 200,
    elementHeight: 200,
  },
};

export const precisionGridEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
