/**
 * Mosaic Tile Cascade Transition Preset
 *
 * Creates a diagonal wave transition where small square panels cascade across the screen
 * like falling dominoes. Each tile has a 3D flip animation (rotateY: 180deg) combined
 * with a bounce effect. Tiles flip to reveal alternating gradient colors on their back faces.
 * Drop shadows grow stronger during the flip, creating depth.
 *
 * Features:
 * - 8x6 grid of tiles (48 tiles total)
 * - 3D flip animation with preserve-3d transform style
 * - Diagonal cascade pattern (top-left to bottom-right)
 * - Front/back faces with alternating gradient colors
 * - Bounce effect (scale: 1 → 0.9 → 1.05 → 1)
 * - Pop effect (translateZ: 0 → 50px → 0)
 * - Dynamic shadow animation (shadow-lg → shadow-2xl → shadow-lg)
 * - Perspective: 1000px on container
 * - Total duration: ~2.5s (cascade + animation)
 *
 * Use cases:
 * - Broadcast sports graphics transitions
 * - News segment transitions
 * - Dynamic reveal effects
 * - Modern motion graphics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .default(2.5)
    .describe('Total duration of the cascade effect in seconds'),
  gridCols: z
    .number()
    .default(8)
    .describe('Number of columns in the mosaic grid'),
  gridRows: z
    .number()
    .default(6)
    .describe('Number of rows in the mosaic grid'),
  cascadeDelay: z
    .number()
    .default(0.05)
    .describe('Delay in seconds between each diagonal tile (row + col) * delay'),
  flipDuration: z
    .number()
    .default(0.6)
    .describe('Duration of each individual tile flip animation in seconds'),
  perspective: z
    .number()
    .default(1000)
    .describe('Perspective value in pixels for 3D effect'),
  frontGradients: z
    .array(z.string())
    .default([
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    ])
    .describe('Array of CSS gradient strings for tile front faces (alternates)'),
  backGradients: z
    .array(z.string())
    .default([
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
    ])
    .describe('Array of CSS gradient strings for tile back faces (alternates)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color of the container'),
  gap: z
    .string()
    .default('0.5')
    .describe('Gap between tiles (Tailwind class value, e.g., "0.5" for gap-0.5)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    gridCols,
    gridRows,
    cascadeDelay,
    flipDuration,
    perspective,
    frontGradients,
    backGradients,
    backgroundColor,
    gap,
  } = params;

  const tilesData: RenderableComponentData[] = [];

  // Generate tiles for the grid
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const tileId = `tile-${row}-${col}`;
      const diagonalIndex = row + col;
      const startDelay = diagonalIndex * cascadeDelay;

      // Alternate gradients based on position
      const frontGradientIndex = (row + col) % frontGradients.length;
      const backGradientIndex = (row + col) % backGradients.length;
      const frontGradient = frontGradients[frontGradientIndex];
      const backGradient = backGradients[backGradientIndex];

      // Create tile container with 3D transform
      const tileContainer: RenderableComponentData = {
        id: tileId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative w-full h-full',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `flip-${tileId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: startDelay,
              duration: flipDuration,
              mode: 'provider',
              targetIds: [tileId],
              ranges: [
                // RotateY: 0 → 180deg
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: 180, prog: 1 },
                // TranslateZ: 0 → 50px → 0 (pop effect)
                { key: 'translateZ', val: 0, prog: 0 },
                { key: 'translateZ', val: 50, prog: 0.4 },
                { key: 'translateZ', val: 0, prog: 1 },
                // Scale: 1 → 0.9 → 1.05 → 1 (bounce)
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.9, prog: 0.3 },
                { key: 'scale', val: 1.05, prog: 0.7 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // Front face
          {
            id: `${tileId}-front`,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width: 100%; height: 100%; background: ${frontGradient}; display: flex; align-items: center; justify-content: center;"></div>`,
              className: 'absolute inset-0',
              style: {
                backfaceVisibility: 'hidden',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              {
                id: `shadow-front-${tileId}`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: startDelay,
                  duration: flipDuration,
                  mode: 'provider',
                  targetIds: [`${tileId}-front`],
                  ranges: [
                    {
                      key: 'filter',
                      val: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))',
                      prog: 0,
                    },
                    {
                      key: 'filter',
                      val: 'drop-shadow(0px 20px 25px rgba(0,0,0,0.5))',
                      prog: 0.5,
                    },
                    {
                      key: 'filter',
                      val: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.3))',
                      prog: 1,
                    },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          // Back face
          {
            id: `${tileId}-back`,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width: 100%; height: 100%; background: ${backGradient}; display: flex; align-items: center; justify-content: center;"></div>`,
              className: 'absolute inset-0',
              style: {
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          } as RenderableComponentData,
        ],
      };

      tilesData.push(tileContainer);
    }
  }

  // Root container with grid layout
  const rootContainer: RenderableComponentData = {
    id: 'mosaic-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `grid grid-cols-${gridCols} grid-rows-${gridRows} gap-${gap} w-full h-full`,
        style: {
          perspective: `${perspective}px`,
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: tilesData,
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
  id: 'mosaic-tile-cascade',
  title: 'Mosaic Tile Cascade Transition',
  description:
    'Diagonal wave transition where small square panels cascade with 3D flip animations, alternating colors/content, bounce effect, and dynamic shadows. Similar to broadcast sports graphics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'mosaic', '3d', 'flip', 'cascade', 'broadcast', 'grid'],
  defaultInputParams: {
    duration: 2.5,
    gridCols: 8,
    gridRows: 6,
    cascadeDelay: 0.05,
    flipDuration: 0.6,
    perspective: 1000,
    frontGradients: [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    ],
    backGradients: [
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
    ],
    backgroundColor: '#000000',
    gap: '0.5',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const mosaicTileCascadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
