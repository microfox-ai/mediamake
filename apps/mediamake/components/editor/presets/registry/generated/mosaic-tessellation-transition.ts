/**
 * Mosaic Tessellation Transition Preset
 *
 * Creates a dynamic mosaic transition where both videos simultaneously appear as interlocking
 * hexagonal tiles that shift, reorganize, and transform with 3D rotation effects during a
 * 2.5-second overlap period. Tiles from the outgoing video shrink and move to form one half
 * while incoming tiles expand from the other half, creating a puzzle-like transition effect.
 *
 * Features:
 * - **Hexagonal Tile Grid**: 8x6 grid of hexagonal tiles using CSS clip-path
 * - **Simultaneous Visibility**: Both videos visible as interlocking tiles during transition
 * - **Dynamic Reorganization**: Tiles shrink, move, and reorganize into mosaic pattern
 * - **3D Rotation Effects**: Subtle rotateY transforms add depth to tile movements
 * - **Perfect Interlocking**: Tiles fit together seamlessly with no gaps
 * - **Synchronized Animation**: All tiles move with cubic-bezier easing
 * - **Drop Shadow Depth**: Shadows enhance 3D tile appearance
 *
 * Use cases:
 * - Creating puzzle-like video transitions
 * - Building dynamic mosaic effects between clips
 * - Adding geometric transitions to video sequences
 * - Creating interlocking tile animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time in seconds for outgoing video'),
      duration: z.number().describe('Duration of outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time in seconds for incoming video'),
      duration: z.number().describe('Duration of incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration } = params;
  const { config } = props;

  const viewportWidth = config?.width || 1920;
  const viewportHeight = config?.height || 1080;

  // Helper: Create hexagonal clip-path
  const createHexagonClipPath = (): string => {
    return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
  };

  // Helper: Calculate hexagonal grid positions (8 columns x 6 rows = 48 tiles, use 24 each)
  const calculateHexTilePositions = (
    cols: number,
    rows: number,
  ): Array<{ x: number; y: number; col: number; row: number }> => {
    const positions: Array<{ x: number; y: number; col: number; row: number }> =
      [];
    const tileWidth = viewportWidth / cols;
    const tileHeight = viewportHeight / rows;
    const hexWidth = tileWidth * 0.95; // Slight overlap for seamless look
    const hexHeight = tileHeight * 0.95;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offsetX = row % 2 === 0 ? 0 : hexWidth / 2;
        const x = col * hexWidth + offsetX;
        const y = row * hexHeight * 0.75; // Vertical offset for hexagon packing

        positions.push({ x, y, col, row });
      }
    }

    return positions;
  };

  // Generate tile positions
  const tilePositions = calculateHexTilePositions(8, 6);

  // Select 24 tiles for outgoing (left side focus) and 24 for incoming (right side focus)
  const outgoingTileIndices = tilePositions
    .map((pos, idx) => ({ pos, idx }))
    .filter((item) => item.pos.col < 4) // Left half columns (0-3)
    .slice(0, 24)
    .map((item) => item.idx);

  const incomingTileIndices = tilePositions
    .map((pos, idx) => ({ pos, idx }))
    .filter((item) => item.pos.col >= 4) // Right half columns (4-7)
    .slice(0, 24)
    .map((item) => item.idx);

  // Calculate mosaic pattern positions (tiles reorganize into left and right halves)
  const calculateMosaicPosition = (
    index: number,
    isOutgoing: boolean,
  ): { x: number; y: number } => {
    const tilesPerSide = 24;
    const mosaicCols = 4;
    const mosaicRows = 6;
    const tileWidth = (viewportWidth / 2) / mosaicCols;
    const tileHeight = viewportHeight / mosaicRows;

    const localIndex = index % tilesPerSide;
    const col = localIndex % mosaicCols;
    const row = Math.floor(localIndex / mosaicCols);

    const offsetX = row % 2 === 0 ? 0 : tileWidth / 2;
    const baseX = isOutgoing ? 0 : viewportWidth / 2;
    const x = baseX + col * tileWidth * 0.9 + offsetX;
    const y = row * tileHeight * 0.85;

    return { x, y };
  };

  // Create outgoing video tiles (24 tiles)
  const outgoingTiles: RenderableComponentData[] = outgoingTileIndices.map(
    (posIndex, tileIndex) => {
      const originalPos = tilePositions[posIndex];
      const mosaicPos = calculateMosaicPosition(tileIndex, true);
      const tileId = `outgoing-tile-${tileIndex}`;

      const tileWidth = viewportWidth / 8;
      const tileHeight = viewportHeight / 6;

      return {
        id: tileId,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom || 0,
          fit: 'cover',
          muted: false,
          volume: tileIndex === 0 ? 1 : 0, // Only first tile has audio
          className: 'absolute',
          style: {
            width: `${tileWidth}px`,
            height: `${tileHeight}px`,
            clipPath: createHexagonClipPath(),
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `${tileId}-transform`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: [tileId],
              ranges: [
                {
                  key: 'translateX',
                  val: `${originalPos.x}px`,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: `${mosaicPos.x}px`,
                  prog: 1,
                },
                {
                  key: 'translateY',
                  val: `${originalPos.y}px`,
                  prog: 0,
                },
                {
                  key: 'translateY',
                  val: `${mosaicPos.y}px`,
                  prog: 1,
                },
                {
                  key: 'scale',
                  val: 1,
                  prog: 0,
                },
                {
                  key: 'scale',
                  val: 0.7,
                  prog: 1,
                },
                {
                  key: 'rotateY',
                  val: '0deg',
                  prog: 0,
                },
                {
                  key: 'rotateY',
                  val: '15deg',
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create incoming video tiles (24 tiles)
  const incomingTiles: RenderableComponentData[] = incomingTileIndices.map(
    (posIndex, tileIndex) => {
      const originalPos = tilePositions[posIndex];
      const mosaicPos = calculateMosaicPosition(tileIndex, false);
      const tileId = `incoming-tile-${tileIndex}`;

      const tileWidth = viewportWidth / 8;
      const tileHeight = viewportHeight / 6;

      return {
        id: tileId,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom || 0,
          fit: 'cover',
          muted: false,
          volume: tileIndex === 0 ? 1 : 0, // Only first tile has audio
          className: 'absolute',
          style: {
            width: `${tileWidth}px`,
            height: `${tileHeight}px`,
            clipPath: createHexagonClipPath(),
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `${tileId}-transform`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: [tileId],
              ranges: [
                {
                  key: 'translateX',
                  val: `${mosaicPos.x}px`,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: `${originalPos.x}px`,
                  prog: 1,
                },
                {
                  key: 'translateY',
                  val: `${mosaicPos.y}px`,
                  prog: 0,
                },
                {
                  key: 'translateY',
                  val: `${originalPos.y}px`,
                  prog: 1,
                },
                {
                  key: 'scale',
                  val: 0.7,
                  prog: 0,
                },
                {
                  key: 'scale',
                  val: 1,
                  prog: 1,
                },
                {
                  key: 'rotateY',
                  val: '-15deg',
                  prog: 0,
                },
                {
                  key: 'rotateY',
                  val: '0deg',
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Base videos for audio continuity (hidden under mosaic overlay)
  const outgoingVideoBase: RenderableComponentData = {
    id: 'outgoing-video-base',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      volume: 0, // Audio handled by tiles
      muted: true,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        opacity: 0, // Hidden, only for duration reference
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
  };

  const incomingVideoBase: RenderableComponentData = {
    id: 'incoming-video-base',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom || 0,
      volume: 0, // Audio handled by tiles
      muted: true,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        opacity: 0, // Hidden, only for duration reference
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - overlapDuration,
        duration: incomingVideo.duration + overlapDuration,
      },
    },
  };

  // Mosaic overlay container (contains all tiles, only visible during overlap)
  const mosaicOverlayContainer: RenderableComponentData = {
    id: 'mosaic-overlay-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - overlapDuration,
        duration: overlapDuration,
      },
    },
    childrenData: [...outgoingTiles, ...incomingTiles] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'mosaic-tessellation-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration + incomingVideo.duration - overlapDuration,
      },
    },
    childrenData: [
      outgoingVideoBase,
      incomingVideoBase,
      mosaicOverlayContainer,
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

const presetMetadata: PresetMetadata = {
  id: 'mosaic-tessellation-transition',
  title: 'Mosaic Tessellation Transition',
  description:
    'Creates a dynamic mosaic transition where both videos simultaneously appear as interlocking hexagonal tiles that shift, reorganize, and transform with 3D rotation effects during a 2.5-second overlap period. Tiles from the outgoing video shrink and move to form one half while incoming tiles expand from the other half, creating a puzzle-like transition effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'mosaic',
    'tessellation',
    'hexagonal',
    'geometric',
    '3d',
    'tiles',
    'puzzle',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
      duration: 5,
    },
    overlapDuration: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const mosaicTessellationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
