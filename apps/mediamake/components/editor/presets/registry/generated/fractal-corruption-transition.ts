/**
 * Fractal Corruption Transition Preset
 *
 * Creates a recursive fractal corruption transition where videos fragment into
 * smaller corrupted copies of themselves. During the 2.2-second overlap, the
 * outgoing video splits into a fractal pattern of smaller versions that corrupt
 * and fade individually. Each fractal segment shows different types of corruption:
 * pixelation, color-shift, freeze-frame, and brightness variations. The incoming
 * video emerges from these fractal fragments, reforming and scaling up.
 *
 * Features:
 * - Recursive quad-tree subdivision (2x2 grid, subdivides 3 levels deep)
 * - Multiple corruption types: pixelate, color-shift, freeze-frame, brightness
 * - Staggered corruption onset based on distance from center
 * - Digital interference patterns between fractal boundaries
 * - Incoming video reforms from fragments with scale-up animation
 * - Border decorations showing fractal structure
 * - Mix-blend-mode effects on alternate cells
 *
 * Use cases:
 * - Sci-fi or digital glitch transitions
 * - Technology-themed video montages
 * - Cyberpunk or futuristic content
 * - Creative video transitions with recursive effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the fractal transition in seconds'),
  gridLevels: z
    .number()
    .min(1)
    .max(3)
    .default(3)
    .describe('Number of recursive subdivision levels'),
  corruptionDelay: z
    .number()
    .default(0.2)
    .describe('Delay between corruption effects on different cells'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    gridLevels,
    corruptionDelay,
  } = params;

  // Helper: Determine component ID based on media type
  const getComponentId = (type: 'video' | 'image'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Helper: Generate fractal grid cells with corruption effects
  const generateFractalCells = (
    level: number,
    parentId: string,
    cellIndex: number,
    row: number,
    col: number,
  ): RenderableComponentData[] => {
    const cells: RenderableComponentData[] = [];
    const gridSize = 2; // 2x2 grid per level
    const cellId = `fractal-cell-${level}-${cellIndex}`;

    // Calculate position in grid (for video offset)
    const xOffset = col * 50; // 0% or 50%
    const yOffset = row * 50; // 0% or 50%

    // Calculate corruption timing (staggered based on distance from center)
    const distanceFromCenter = Math.sqrt(
      Math.pow(col - 0.5, 2) + Math.pow(row - 0.5, 2),
    );
    const corruptionStart = distanceFromCenter * corruptionDelay;

    // Corruption types
    const corruptionTypes = ['pixelate', 'color-shift', 'freeze', 'brightness'];
    const corruptionType = corruptionTypes[cellIndex % corruptionTypes.length];

    // Create cell container with border
    const cellContainer: RenderableComponentData = {
      id: cellId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full border border-cyan-500/50',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [],
    };

    // Create outgoing video for this cell
    const videoId = `outgoing-video-${level}-${cellIndex}`;
    const videoComponent: RenderableComponentData = {
      id: videoId,
      type: 'atom',
      componentId: getComponentId(outgoingVideo.type),
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        style: {
          transform: `scale(2) translate(${xOffset === 0 ? '-25%' : '-75%'}, ${yOffset === 0 ? '-25%' : '-75%'})`,
          mixBlendMode: (cellIndex % 2 === 0 ? 'difference' : 'normal') as any,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [],
    };

    // Add corruption effect based on type
    if (corruptionType === 'pixelate') {
      videoComponent.effects!.push({
        id: `pixelate-${videoId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: corruptionStart,
          duration: transitionDuration - corruptionStart,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.1, prog: 0.3 },
            { key: 'scale', val: 10, prog: 0.31 },
            { key: 'scale', val: 10, prog: 0.6 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    } else if (corruptionType === 'color-shift') {
      videoComponent.effects!.push({
        id: `color-shift-${videoId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: corruptionStart,
          duration: transitionDuration - corruptionStart,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(360deg)', prog: 0.7 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    } else if (corruptionType === 'freeze') {
      // Freeze-frame effect via scale and opacity
      videoComponent.effects!.push({
        id: `freeze-${videoId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: corruptionStart,
          duration: transitionDuration - corruptionStart,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.8, prog: 1 },
          ],
        },
      });
    } else if (corruptionType === 'brightness') {
      videoComponent.effects!.push({
        id: `brightness-${videoId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: corruptionStart,
          duration: transitionDuration - corruptionStart,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'filter', val: 'brightness(0.5)', prog: 0 },
            { key: 'filter', val: 'brightness(2)', prog: 0.5 },
            { key: 'filter', val: 'brightness(0)', prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    cellContainer.childrenData!.push(videoComponent);

    // Recursive subdivision for deeper levels
    if (level < gridLevels) {
      const subdivisionStart = 0.4;
      const subdivisionContainer: RenderableComponentData = {
        id: `subdivision-${cellId}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0',
          },
        },
        context: {
          timing: {
            start: subdivisionStart,
            duration: transitionDuration - subdivisionStart,
          },
        },
        childrenData: [],
      };

      // Generate 2x2 sub-grid
      for (let subRow = 0; subRow < 2; subRow++) {
        for (let subCol = 0; subCol < 2; subCol++) {
          const subCellIndex = subRow * 2 + subCol;
          const subCells = generateFractalCells(
            level + 1,
            cellId,
            cellIndex * 4 + subCellIndex,
            subRow,
            subCol,
          );
          subdivisionContainer.childrenData!.push(...subCells);
        }
      }

      cellContainer.childrenData!.push(subdivisionContainer);
    }

    cells.push(cellContainer);
    return cells;
  };

  // Generate base 2x2 fractal grid
  const fractalCells: RenderableComponentData[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const cellIndex = row * 2 + col;
      fractalCells.push(...generateFractalCells(1, 'root', cellIndex, row, col));
    }
  }

  // Create outgoing fractal layer
  const outgoingLayer: RenderableComponentData = {
    id: 'outgoing-fractal-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: fractalCells,
  };

  // Create incoming video that reforms
  const incomingVideoId = 'incoming-video-reformed';
  const incomingLayer: RenderableComponentData = {
    id: 'incoming-fractal-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: transitionDuration / 2,
        duration: transitionDuration / 2,
      },
    },
    childrenData: [
      {
        id: incomingVideoId,
        type: 'atom',
        componentId: getComponentId(incomingVideo.type),
        data: {
          src: incomingVideo.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration / 2,
          },
        },
        effects: [
          {
            id: 'incoming-reform-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration / 2,
              mode: 'provider',
              targetIds: [incomingVideoId],
              ranges: [
                { key: 'scale', val: 0.2, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Create interference pattern layer
  const interferenceLayer: RenderableComponentData = {
    id: 'interference-pattern-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Horizontal interference line
      {
        id: 'interference-line-1',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70"></div>',
          className: 'absolute left-0 top-1/4',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'interference-scan-1',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['interference-line-1'],
              ranges: [
                { key: 'translateY', val: '-100px', prog: 0 },
                { key: 'translateY', val: '100px', prog: 1 },
                { key: 'opacity', val: 0.7, prog: 0 },
                { key: 'opacity', val: 0.3, prog: 0.5 },
                { key: 'opacity', val: 0.7, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Vertical interference line
      {
        id: 'interference-line-2',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="absolute top-0 w-px h-full bg-gradient-to-b from-transparent via-pink-400 to-transparent opacity-70"></div>',
          className: 'absolute left-2/3 top-0',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'interference-scan-2',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['interference-line-2'],
              ranges: [
                { key: 'translateX', val: '-50px', prog: 0 },
                { key: 'translateX', val: '50px', prog: 1 },
                { key: 'opacity', val: 0.7, prog: 0 },
                { key: 'opacity', val: 0.4, prog: 0.5 },
                { key: 'opacity', val: 0.7, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'fractal-corruption-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingLayer, incomingLayer, interferenceLayer],
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
  id: 'fractal-corruption-transition',
  title: 'Fractal Corruption Transition',
  description:
    'Recursive quad-tree transition where videos fragment into smaller corrupted copies with pixelation, color-shift, and freeze-frame effects. Incoming video emerges from fractal fragments reforming and scaling up with digital interference patterns between boundaries.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'fractal',
    'corruption',
    'glitch',
    'recursive',
    'quad-tree',
    'digital',
    'cyberpunk',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      type: 'video',
    },
    transitionDuration: 2.2,
    gridLevels: 3,
    corruptionDelay: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const fractalCorruptionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
