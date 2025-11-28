/**
 * ColorBlockMatrix Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates a grid of animated color blocks that cascade, ripple, or wave across the content.
 * This internal effect preset generates multiple generic effects - one per grid block - with
 * calculated delays based on the selected animation pattern (wave, spiral, random, checkerboard).
 *
 * Features:
 * - **Grid-based Animation**: Creates a matrix of blocks with staggered animation timing
 * - **Multiple Patterns**: Wave, spiral, random, and checkerboard cascade effects
 * - **Distance-based Delays**: Organic wave effects using distance calculations from center
 * - **Animation Variants**: Scale, flip (rotateY), or fade animations per block
 * - **Color Interpolation**: Gradient colors across blocks based on position
 * - **Customizable Timing**: Control wave speed and individual block durations
 *
 * Use cases:
 * - Creating dynamic transition effects with cascading blocks
 * - Building matrix-style reveal animations
 * - Adding organic wave patterns to overlays
 * - Creating rhythmic grid animations synced to content
 *
 * Technical Notes:
 * - Returns array of generic effects (one per grid cell)
 * - Each effect targets a specific component ID from targetIds array
 * - Delay calculation varies by pattern type
 * - Color interpolation uses lerp between provided colors
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  gridSize: z
    .tuple([z.number(), z.number()])
    .describe('Grid dimensions as [columns, rows]'),
  pattern: z
    .enum(['wave', 'spiral', 'random', 'checkerboard'])
    .describe('Animation pattern type for cascade effect'),
  colors: z
    .array(z.string())
    .min(1)
    .describe('Array of colors for block interpolation'),
  waveSpeed: z
    .number()
    .default(0.1)
    .optional()
    .describe('Speed multiplier for wave delay calculation'),
  animationType: z
    .enum(['scale', 'flip', 'fade'])
    .default('scale')
    .optional()
    .describe('Type of animation for blocks: scale, flip (rotateY), or fade'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to target (must match grid cell count)'),
  blockDuration: z
    .number()
    .default(500)
    .optional()
    .describe('Duration of each block animation in milliseconds'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  totalDuration: z
    .number()
    .default(3000)
    .optional()
    .describe('Total duration for the entire cascade effect in milliseconds'),
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .optional()
    .describe('Easing function for animations'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Linear interpolation for colors
  const lerpColor = (color1: string, color2: string, t: number): string => {
    // Simple hex color lerp
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);

    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // Helper: Get color for block based on position
  const getBlockColor = (
    x: number,
    y: number,
    cols: number,
    rows: number,
  ): string => {
    const { colors } = params;
    if (colors.length === 1) return colors[0];

    // Calculate progress based on diagonal distance
    const progress = Math.sqrt(x * x + y * y) / Math.sqrt(cols * cols + rows * rows);
    const colorIndex = Math.min(
      Math.floor(progress * (colors.length - 1)),
      colors.length - 2,
    );
    const colorProgress = (progress * (colors.length - 1)) - colorIndex;

    return lerpColor(colors[colorIndex], colors[colorIndex + 1], colorProgress);
  };

  // Helper: Calculate delay based on pattern
  const calculateDelay = (
    x: number,
    y: number,
    cols: number,
    rows: number,
    pattern: string,
  ): number => {
    const centerX = (cols - 1) / 2;
    const centerY = (rows - 1) / 2;
    const waveSpeed = params.waveSpeed ?? 0.1;

    switch (pattern) {
      case 'wave': {
        // Distance from center
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2),
        );
        return distance * waveSpeed * 1000; // Convert to milliseconds
      }
      case 'spiral': {
        // Angle and distance for spiral effect
        const dx = x - centerX;
        const dy = y - centerY;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return (angle + Math.PI + distance * 0.5) * waveSpeed * 1000;
      }
      case 'random': {
        // Random delay within total duration range
        return Math.random() * (params.totalDuration ?? 3000) * 0.5;
      }
      case 'checkerboard': {
        // Alternate based on checkerboard pattern
        const isEven = (x + y) % 2 === 0;
        return isEven ? 0 : (params.blockDuration ?? 500) * 0.5;
      }
      default:
        return 0;
    }
  };

  // Helper: Get animation ranges based on type
  const getAnimationRanges = (
    animationType: string,
    color: string,
  ): GenericEffectData['ranges'] => {
    switch (animationType) {
      case 'scale':
        return [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'backgroundColor', val: color, prog: 0 },
          { key: 'backgroundColor', val: color, prog: 1 },
        ];
      case 'flip':
        return [
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: 180, prog: 0.5 },
          { key: 'rotateY', val: 180, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'backgroundColor', val: color, prog: 0 },
          { key: 'backgroundColor', val: color, prog: 1 },
        ];
      case 'fade':
        return [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'backgroundColor', val: color, prog: 0 },
          { key: 'backgroundColor', val: color, prog: 1 },
        ];
      default:
        return [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ];
    }
  };

  // Extract parameters
  const [cols, rows] = params.gridSize;
  const { pattern, targetIds, animationType = 'scale', easingType = 'ease-out' } = params;
  const blockDuration = (params.blockDuration ?? 500) / 1000; // Convert to seconds

  // Validate targetIds count matches grid size
  const totalCells = cols * rows;
  if (targetIds.length !== totalCells) {
    throw new Error(
      `targetIds array length (${targetIds.length}) must match grid cell count (${totalCells})`,
    );
  }

  // Generate effects for each grid block
  const matrixEffects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  let blockIndex = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const targetId = targetIds[blockIndex];
      const delay = calculateDelay(x, y, cols, rows, pattern);
      const color = getBlockColor(x, y, cols, rows);
      const ranges = getAnimationRanges(animationType, color);

      const effectData: GenericEffectData = {
        type: easingType,
        start: params.effectStart + delay / 1000, // Convert delay to seconds, add to effectStart
        duration: blockDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges,
      };

      matrixEffects.push({
        id: `color-block-effect-${x}-${y}`,
        componentId: 'generic',
        data: effectData,
      });

      blockIndex++;
    }
  }

  // Return effects wrapped in a container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'color-block-matrix-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: matrixEffects,
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
  id: 'ColorBlockMatrix',
  title: 'Color Block Matrix Effect',
  description:
    'Creates a grid of animated color blocks that cascade, ripple, or wave across content with distance-based delay calculations',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'grid', 'cascade', 'wave', 'animation'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    gridSize: [8, 8],
    pattern: 'wave',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
    waveSpeed: 0.1,
    animationType: 'scale',
    targetIds: Array.from({ length: 64 }, (_, i) => `block-${i}`),
    blockDuration: 500,
    effectStart: 0,
    totalDuration: 3000,
    easingType: 'ease-out',
  },
};

export const ColorBlockMatrixPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
