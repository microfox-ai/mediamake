/**
 * Sliding Puzzle Shuffle Transition Preset
 *
 * This preset creates a dynamic sliding puzzle transition between two videos. The outgoing video
 * tiles slide to random positions while fading out, and incoming video tiles slide in from 
 * off-screen edges to form the complete image.
 *
 * Features:
 * - **4x4 Grid Division**: Both videos are divided into 16 tiles using clip-path
 * - **Chaotic Tile Movement**: Each tile moves independently to/from random positions
 * - **Staggered Animation**: Tiles animate with 50ms delays for organic feel
 * - **Shake Effect**: Subtle shake during shuffle phase adds energy
 * - **Border Highlights**: Brief flashes on tiles as they move
 * - **Configurable Overlap**: 1.8s default transition overlap duration
 *
 * Use cases:
 * - Creating dynamic video transitions with puzzle-like reorganization
 * - Adding energetic transitions between video segments
 * - Building montages with unique tile-based effects
 * - Creating visually engaging video sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define preset parameters
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video'),
    duration: z.number().describe('Duration of first video in seconds'),
  }).describe('First (outgoing) video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of second video in seconds'),
  }).describe('Second (incoming) video configuration'),
  transitionDuration: z.number()
    .default(1.8)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Helper function to generate random transform values for outgoing tiles
  const getRandomOutgoingTransform = () => {
    const translateX = Math.random() * 400 - 200; // -200% to 200%
    const translateY = Math.random() * 400 - 200; // -200% to 200%
    return { translateX, translateY };
  };

  // Helper function to generate off-screen starting positions for incoming tiles
  const getRandomIncomingTransform = () => {
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let translateX = 0;
    let translateY = 0;

    switch (edge) {
      case 0: // Top
        translateX = Math.random() * 200 - 100; // -100% to 100%
        translateY = -200;
        break;
      case 1: // Right
        translateX = 200;
        translateY = Math.random() * 200 - 100;
        break;
      case 2: // Bottom
        translateX = Math.random() * 200 - 100;
        translateY = 200;
        break;
      case 3: // Left
        translateX = -200;
        translateY = Math.random() * 200 - 100;
        break;
    }

    return { translateX, translateY };
  };

  // Helper function to generate clip-path for grid tiles
  const getTileClipPath = (row: number, col: number) => {
    const top = (row * 25);
    const right = 100 - ((col + 1) * 25);
    const bottom = 100 - ((row + 1) * 25);
    const left = (col * 25);
    return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
  };

  // Calculate total duration
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;

  // Create 16 tiles for outgoing video (video1)
  const video1Tiles: RenderableComponentData[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const tileIndex = row * 4 + col;
      const tileId = `video1-tile-${row}-${col}`;
      const { translateX, translateY } = getRandomOutgoingTransform();
      const staggerDelay = tileIndex * 0.05; // 50ms stagger

      video1Tiles.push({
        id: tileId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          style: {
            clipPath: getTileClipPath(row, col),
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          },
          fit: 'cover',
          className: 'object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
        effects: [
          {
            id: `slide-fade-out-${row}-${col}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: staggerDelay,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [tileId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateY, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: `border-flash-${row}-${col}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: staggerDelay,
              duration: 0.3,
              mode: 'provider',
              targetIds: [tileId],
              ranges: [
                { key: 'boxShadow', val: '0 0 0 0px rgba(255,255,255,0)', prog: 0 },
                { key: 'boxShadow', val: '0 0 0 3px rgba(255,255,255,0.8)', prog: 0.5 },
                { key: 'boxShadow', val: '0 0 0 0px rgba(255,255,255,0)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // Create 16 tiles for incoming video (video2)
  const video2Tiles: RenderableComponentData[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const tileIndex = row * 4 + col;
      const tileId = `video2-tile-${row}-${col}`;
      const { translateX, translateY } = getRandomIncomingTransform();
      const staggerDelay = tileIndex * 0.05; // 50ms stagger

      video2Tiles.push({
        id: tileId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          style: {
            clipPath: getTileClipPath(row, col),
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          },
          fit: 'cover',
          className: 'object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration,
          },
        },
        effects: [
          {
            id: `slide-fade-in-${row}-${col}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: staggerDelay,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [tileId],
              ranges: [
                { key: 'translateX', val: translateX, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: translateY, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          {
            id: `border-flash-in-${row}-${col}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: staggerDelay + 0.05,
              duration: 0.3,
              mode: 'provider',
              targetIds: [tileId],
              ranges: [
                { key: 'boxShadow', val: '0 0 0 0px rgba(255,255,255,0)', prog: 0 },
                { key: 'boxShadow', val: '0 0 0 3px rgba(255,255,255,0.8)', prog: 0.5 },
                { key: 'boxShadow', val: '0 0 0 0px rgba(255,255,255,0)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // Create shake effect keyframes for containers
  const shakeRanges = [
    { key: 'translateX', val: 0, prog: 0 },
    { key: 'translateX', val: 2, prog: 0.1 },
    { key: 'translateX', val: -2, prog: 0.2 },
    { key: 'translateX', val: 1, prog: 0.3 },
    { key: 'translateX', val: -1, prog: 0.4 },
    { key: 'translateX', val: 0, prog: 0.5 },
    { key: 'translateY', val: 0, prog: 0 },
    { key: 'translateY', val: -2, prog: 0.1 },
    { key: 'translateY', val: 2, prog: 0.2 },
    { key: 'translateY', val: -1, prog: 0.3 },
    { key: 'translateY', val: 1, prog: 0.4 },
    { key: 'translateY', val: 0, prog: 0.5 },
  ];

  // Video 1 grid container (outgoing, z-index 0)
  const video1GridContainer: RenderableComponentData = {
    id: 'video1-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'shake-outgoing-container',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video1-grid-container'],
          ranges: shakeRanges,
        },
      },
    ],
    childrenData: video1Tiles,
  };

  // Video 2 grid container (incoming, z-index 10)
  const video2GridContainer: RenderableComponentData = {
    id: 'video2-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration,
      },
    },
    effects: [
      {
        id: 'shake-incoming-container',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video2-grid-container'],
          ranges: shakeRanges.map(range => ({
            ...range,
            val: typeof range.val === 'number' ? range.val * 0.5 : range.val,
          })),
        },
      },
    ],
    childrenData: video2Tiles,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'sliding-puzzle-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [video1GridContainer, video2GridContainer],
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
  id: 'sliding-puzzle-transition',
  title: 'Sliding Puzzle Shuffle Transition',
  description: 'Creates a dynamic sliding puzzle transition between two videos using a 4x4 grid of tiles. Outgoing video tiles slide to random positions while fading out, and incoming tiles slide in from off-screen edges to form the complete image.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'puzzle', 'grid', 'sliding', 'shuffle', 'dynamic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const slidingPuzzleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
