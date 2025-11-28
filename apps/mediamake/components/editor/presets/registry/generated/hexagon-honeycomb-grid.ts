/**
 * Hexagonal Honeycomb Transition Preset
 *
 * Creates a hexagonal honeycomb grid transition effect that masks content with animated hexagon cells.
 * The effect generates a grid of hexagonal clip-paths that reveal or conceal content in a wave pattern.
 * Implements propagation algorithms that trigger hexagons based on distance from origin point
 * (center, corner, edge, or custom coordinates). Each hexagon scales and rotates during its reveal,
 * creating a blooming effect.
 *
 * Features:
 * - **Hexagonal Grid Generation**: Creates a grid of hexagonal clip-path animations
 * - **Wave-based Propagation**: Triggers hexagons based on distance from origin point
 * - **Multiple Origin Points**: Center, top-left, bottom-right, or custom coordinates
 * - **Blooming Effect**: Each hexagon scales and rotates during reveal
 * - **Color Flash**: Optional color overlay during transition
 * - **Regular & Irregular Patterns**: Support for organic variations
 * - **Configurable Density**: Control grid size and hexagon count
 * - **Variable Speed**: Adjust propagation speed and cell duration
 *
 * Use cases:
 * - Creating honeycomb reveal transitions for text/images
 * - Building organic wave-based animations
 * - Adding hexagonal masking effects
 * - Creating geometric transition overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply hexagonal transition to'),
  gridSize: z
    .tuple([z.number(), z.number()])
    .describe('Grid size [rows, cols] for hexagon grid'),
  origin: z
    .enum(['center', 'topLeft', 'bottomRight', 'custom'])
    .default('center')
    .describe('Origin point for wave propagation'),
  originCoords: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe('Custom origin coordinates [row, col] (only for origin: custom)'),
  propagationSpeed: z
    .number()
    .default(0.05)
    .describe('Time delay per distance unit (seconds)'),
  cellDuration: z
    .number()
    .default(0.4)
    .describe('Duration of each hexagon reveal animation (seconds)'),
  colorFlash: z
    .string()
    .optional()
    .describe('Optional color for flash overlay during transition (CSS color)'),
  irregularPattern: z
    .boolean()
    .default(false)
    .describe('Enable irregular hexagon pattern for organic variations'),
  reverseAnimation: z
    .boolean()
    .default(false)
    .describe('Reverse animation (conceal instead of reveal)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    gridSize,
    origin,
    originCoords,
    propagationSpeed,
    cellDuration,
    colorFlash,
    irregularPattern,
    reverseAnimation,
  } = params;

  const [rows, cols] = gridSize;

  // Helper: Calculate origin coordinates
  const getOriginCoords = (): [number, number] => {
    if (origin === 'custom' && originCoords) {
      return originCoords;
    }
    if (origin === 'center') {
      return [Math.floor(rows / 2), Math.floor(cols / 2)];
    }
    if (origin === 'topLeft') {
      return [0, 0];
    }
    if (origin === 'bottomRight') {
      return [rows - 1, cols - 1];
    }
    return [Math.floor(rows / 2), Math.floor(cols / 2)];
  };

  // Helper: Calculate distance from origin
  const calculateDistance = (row: number, col: number): number => {
    const [originRow, originCol] = getOriginCoords();
    return Math.sqrt(
      Math.pow(row - originRow, 2) + Math.pow(col - originCol, 2),
    );
  };

  // Helper: Calculate wave delay based on distance
  const calculateWaveDelay = (row: number, col: number): number => {
    const distance = calculateDistance(row, col);
    return distance * propagationSpeed;
  };

  // Helper: Generate hexagon clip-path points
  const generateHexagonClipPath = (size: number = 50): string => {
    // Hexagon centered at 50%, 50%
    const points = [
      `${50 + size * Math.cos(0)}% ${50 + size * Math.sin(0)}%`,
      `${50 + size * Math.cos(Math.PI / 3)}% ${50 + size * Math.sin(Math.PI / 3)}%`,
      `${50 + size * Math.cos((2 * Math.PI) / 3)}% ${50 + size * Math.sin((2 * Math.PI) / 3)}%`,
      `${50 + size * Math.cos(Math.PI)}% ${50 + size * Math.sin(Math.PI)}%`,
      `${50 + size * Math.cos((4 * Math.PI) / 3)}% ${50 + size * Math.sin((4 * Math.PI) / 3)}%`,
      `${50 + size * Math.cos((5 * Math.PI) / 3)}% ${50 + size * Math.sin((5 * Math.PI) / 3)}%`,
    ];
    return `polygon(${points.join(', ')})`;
  };

  // Helper: Generate irregular hexagon for organic variation
  const generateIrregularHexagon = (size: number = 50): string => {
    const randomOffset = () => (Math.random() - 0.5) * 5; // Small random offset
    const points = [
      `${50 + size * Math.cos(0) + randomOffset()}% ${50 + size * Math.sin(0) + randomOffset()}%`,
      `${50 + size * Math.cos(Math.PI / 3) + randomOffset()}% ${50 + size * Math.sin(Math.PI / 3) + randomOffset()}%`,
      `${50 + size * Math.cos((2 * Math.PI) / 3) + randomOffset()}% ${50 + size * Math.sin((2 * Math.PI) / 3) + randomOffset()}%`,
      `${50 + size * Math.cos(Math.PI) + randomOffset()}% ${50 + size * Math.sin(Math.PI) + randomOffset()}%`,
      `${50 + size * Math.cos((4 * Math.PI) / 3) + randomOffset()}% ${50 + size * Math.sin((4 * Math.PI) / 3) + randomOffset()}%`,
      `${50 + size * Math.cos((5 * Math.PI) / 3) + randomOffset()}% ${50 + size * Math.sin((5 * Math.PI) / 3) + randomOffset()}%`,
    ];
    return `polygon(${points.join(', ')})`;
  };

  // Calculate maximum distance for total duration
  const maxDistance = calculateDistance(rows - 1, cols - 1);
  const totalDuration = maxDistance * propagationSpeed + cellDuration;

  // Generate hexagon effects for each grid cell
  const hexagonEffects: any[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const waveDelay = calculateWaveDelay(row, col);
      const hexagonId = `hexagon-${row}-${col}`;

      // Clip-path animation (reveal/conceal)
      const clipPathEffect = {
        id: `${hexagonId}-clippath`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: waveDelay,
          duration: cellDuration,
          mode: 'provider',
          targetIds: targetIds,
          ranges: reverseAnimation
            ? [
                {
                  key: 'clipPath',
                  val: irregularPattern
                    ? generateIrregularHexagon(50)
                    : generateHexagonClipPath(50),
                  prog: 0,
                },
                {
                  key: 'clipPath',
                  val: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)',
                  prog: 1,
                },
              ]
            : [
                {
                  key: 'clipPath',
                  val: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)',
                  prog: 0,
                },
                {
                  key: 'clipPath',
                  val: irregularPattern
                    ? generateIrregularHexagon(50)
                    : generateHexagonClipPath(50),
                  prog: 1,
                },
              ],
        },
      };

      // Scale animation (blooming effect)
      const scaleEffect = {
        id: `${hexagonId}-scale`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: waveDelay,
          duration: cellDuration,
          mode: 'provider',
          targetIds: targetIds,
          ranges: reverseAnimation
            ? [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.1, prog: 0.5 },
                { key: 'scale', val: 0, prog: 1 },
              ]
            : [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.1, prog: 0.7 },
                { key: 'scale', val: 1, prog: 1 },
              ],
        },
      };

      // Rotation animation
      const rotateEffect = {
        id: `${hexagonId}-rotate`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: waveDelay,
          duration: cellDuration,
          mode: 'provider',
          targetIds: targetIds,
          ranges: reverseAnimation
            ? [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: 15, prog: 1 },
              ]
            : [
                { key: 'rotate', val: -15, prog: 0 },
                { key: 'rotate', val: 0, prog: 1 },
              ],
        },
      };

      hexagonEffects.push(clipPathEffect, scaleEffect, rotateEffect);

      // Color flash effect (if enabled)
      if (colorFlash) {
        const colorFlashEffect = {
          id: `${hexagonId}-color`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: waveDelay,
            duration: cellDuration * 0.5,
            mode: 'provider',
            targetIds: targetIds,
            ranges: [
              { key: 'backgroundColor', val: 'transparent', prog: 0 },
              { key: 'backgroundColor', val: colorFlash, prog: 0.5 },
              { key: 'backgroundColor', val: 'transparent', prog: 1 },
            ],
          },
        };
        hexagonEffects.push(colorFlashEffect);
      }
    }
  }

  const rootContainer: RenderableComponentData = {
    id: 'hexagon-honeycomb-container',
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
        duration: totalDuration,
      },
    },
    effects: hexagonEffects,
    childrenData: [],
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
  description:
    'Creates a hexagonal honeycomb grid transition effect with wave-based propagation, blooming animations, and optional color flashes',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'transition',
    'hexagon',
    'honeycomb',
    'grid',
    'wave',
    'geometric',
    'masking',
    'bloom',
  ],
  defaultInputParams: {
    targetIds: ['component-1'],
    gridSize: [10, 10],
    origin: 'center',
    propagationSpeed: 0.05,
    cellDuration: 0.4,
    irregularPattern: false,
    reverseAnimation: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const hexagonHoneycombTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
