/**
 * Penrose Tessellation Transition Preset
 *
 * This preset creates a geometric tessellation transition using repeating fractal patterns
 * inspired by Penrose tiles. The outgoing video fragments into interlocking pentagonal and
 * star shapes that replicate and rotate to fill the screen in a non-repeating pattern.
 *
 * Features:
 * - Geometric tessellation with pentagonal and star shapes
 * - Time-shifted mosaic effect with staggered video playback
 * - Non-repeating Penrose-inspired tile patterns
 * - Simultaneous mid-point flip rotation at 1 second
 * - Subtle glow effects on tile edges
 * - 2-second transition duration
 *
 * Technical Implementation:
 * - BaseLayout with CSS grid for precise tile positioning
 * - 30 tiles with alternating pentagon/star clip-path shapes
 * - Each tile contains both outgoing and incoming video with temporal offsets
 * - Tiles flip simultaneously at 1-second mark using rotateY transform
 * - Box-shadow glow effects on all tiles
 * - Transform-style: preserve-3d for clean flip animations
 *
 * Use Cases:
 * - High-impact video transitions
 * - Geometric/fractal-themed content
 * - Tech and science visualizations
 * - Creative video editing effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideoSrc, incomingVideoSrc, transitionDuration } = params;

  // Helper function to create pentagon clip-path
  const getPentagonClipPath = (): string => {
    return 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
  };

  // Helper function to create star clip-path
  const getStarClipPath = (): string => {
    return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
  };

  // Helper function to create rhombus/diamond clip-path
  const getRhombusClipPath = (): string => {
    return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
  };

  // Create 30 tiles in a 6x5 grid
  const tileCount = 30;
  const gridCols = 6;
  const gridRows = 5;

  const tiles: RenderableComponentData[] = [];

  for (let i = 0; i < tileCount; i++) {
    const tileIndex = i + 1;
    const col = (i % gridCols) + 1;
    const row = Math.floor(i / gridCols) + 1;

    // Alternate between pentagon, star, and rhombus shapes for variety
    let clipPath: string;
    if (i % 3 === 0) {
      clipPath = getPentagonClipPath();
    } else if (i % 3 === 1) {
      clipPath = getStarClipPath();
    } else {
      clipPath = getRhombusClipPath();
    }

    // Calculate temporal offset (staggered by 0.1s per tile)
    const temporalOffset = (i * 0.1) % 3; // Wrap around to keep reasonable offset

    const tileId = `tile-${tileIndex}`;
    const outgoingVideoId = `outgoing-video-${tileIndex}`;
    const incomingVideoId = `incoming-video-${tileIndex}`;

    // Create tile container
    const tile: RenderableComponentData = {
      id: tileId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            gridColumn: `${col} / ${col + 1}`,
            gridRow: `${row} / ${row + 1}`,
            clipPath: clipPath,
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            boxShadow: '0 0 10px rgba(255,255,255,0.5)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Outgoing video
        {
          id: outgoingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            startFrom: temporalOffset,
            className: 'absolute inset-0 w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration / 2,
            },
          },
        } as RenderableComponentData,
        // Incoming video
        {
          id: incomingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            startFrom: temporalOffset,
            className: 'absolute inset-0 w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: transitionDuration / 2,
              duration: transitionDuration / 2,
            },
          },
        } as RenderableComponentData,
      ],
    };

    tiles.push(tile);
  }

  // Get all tile IDs for effects
  const tileIds = tiles.map((tile) => tile.id);

  // Get all outgoing and incoming video IDs
  const outgoingVideoIds = tiles.map((tile) => `outgoing-video-${tile.id.split('-')[1]}`);
  const incomingVideoIds = tiles.map((tile) => `incoming-video-${tile.id.split('-')[1]}`);

  // Root container with effects
  const rootContainer: RenderableComponentData = {
    id: 'penrose-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)',
          overflow: 'hidden',
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: tiles,
    effects: [
      // Outgoing video opacity fade out (first half)
      {
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration / 2,
          mode: 'provider',
          targetIds: outgoingVideoIds,
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Outgoing tiles scale down (first half)
      {
        id: 'outgoing-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration / 2,
          mode: 'provider',
          targetIds: tileIds,
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.8, prog: 0.5 },
            { key: 'scale', val: 0, prog: 1 },
          ],
        },
      },
      // Flip all tiles at midpoint (simultaneous rotation)
      {
        id: 'flip-all-tiles-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionDuration / 2 - 0.1,
          duration: 0.2,
          mode: 'provider',
          targetIds: tileIds,
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 180, prog: 1 },
          ],
        },
      },
      // Incoming video opacity fade in (second half)
      {
        id: 'incoming-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionDuration / 2,
          duration: transitionDuration / 2,
          mode: 'provider',
          targetIds: incomingVideoIds,
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Incoming tiles scale up (second half)
      {
        id: 'incoming-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionDuration / 2,
          duration: transitionDuration / 2,
          mode: 'provider',
          targetIds: tileIds,
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 0.8, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
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
  id: 'penrose-tessellation-transition',
  title: 'Penrose Tessellation Transition',
  description:
    'A geometric tessellation transition using repeating fractal patterns inspired by Penrose tiles. The outgoing video fragments into interlocking pentagonal and star shapes that replicate and rotate to fill the screen in a non-repeating pattern. Each tile has a different phase of the video creating a time-shifted mosaic effect. The incoming video reconstructs from these tiles reorganizing into the correct temporal sequence with subtle glow effects on tile edges.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'geometric',
    'tessellation',
    'penrose',
    'fractal',
    'mosaic',
    'flip',
    'tiles',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const penroseTessellationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
