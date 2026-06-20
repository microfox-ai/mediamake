/**
 * Tile Mosaic Mask Reveal Transition Preset
 *
 * This preset creates a dynamic tile mosaic mask reveal transition that splits the outgoing video
 * into a 3x3 grid of tiles. Each tile randomly flips and fades out with a 3D rotation effect,
 * revealing the incoming video underneath. The transition uses staggered timing for organic movement,
 * GPU-accelerated transform3d effects, and provider mode for all animations.
 *
 * Features:
 * - **3x3 Grid Split**: Outgoing video divided into 9 tiles using clipPath
 * - **Staggered Animation**: Tiles animate with 100-200ms stagger for organic feel
 * - **3D Rotation Effect**: rotateY from 0deg to 90deg with perspective(1000px)
 * - **Fade Out**: Simultaneous opacity fade from 1 to 0
 * - **GPU Acceleration**: Uses transform3d for smooth performance
 * - **Clean Reveal**: Incoming video sits underneath as a single VideoAtom
 * - **Configurable Timing**: 2-second overlap period with adjustable transition duration
 *
 * Use cases:
 * - Seamless video-to-video transitions
 * - Dynamic scene changes with mosaic effect
 * - Creative transitions for video montages
 * - Professional video editing with 3D effects
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
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
  trackName: z
    .string()
    .default('tile-mosaic-transition')
    .describe('Unique identifier for this transition track'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    trackName,
  } = params;

  // Calculate total duration: sum of video durations minus overlap
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Define stagger times for each tile (random pattern across 9 tiles)
  // Tile order: 0-8, staggered by 0-200ms
  const tileStaggerTimes = [
    0, // tile-0: starts immediately
    0.1, // tile-1: +100ms
    0.15, // tile-2: +150ms
    0.2, // tile-3: +200ms
    0.12, // tile-4: +120ms (center tile)
    0.18, // tile-5: +180ms
    0.08, // tile-6: +80ms
    0.14, // tile-7: +140ms
    0.16, // tile-8: +160ms
  ];

  // Define clipPath regions for 3x3 grid
  // Using inset(top right bottom left) format
  const tileClipPaths = [
    'inset(0% 66.67% 66.67% 0%)', // Top-left
    'inset(0% 33.33% 66.67% 33.33%)', // Top-center
    'inset(0% 0% 66.67% 66.67%)', // Top-right
    'inset(33.33% 66.67% 33.33% 0%)', // Middle-left
    'inset(33.33% 33.33% 33.33% 33.33%)', // Middle-center
    'inset(33.33% 0% 33.33% 66.67%)', // Middle-right
    'inset(66.67% 66.67% 0% 0%)', // Bottom-left
    'inset(66.67% 33.33% 0% 33.33%)', // Bottom-center
    'inset(66.67% 0% 0% 66.67%)', // Bottom-right
  ];

  // Object positions for each tile to show correct video portion
  const tileObjectPositions = [
    '0% 0%', // Top-left
    '-100% 0%', // Top-center
    '-200% 0%', // Top-right
    '0% -100%', // Middle-left
    '-100% -100%', // Middle-center
    '-200% -100%', // Middle-right
    '0% -200%', // Bottom-left
    '-100% -200%', // Bottom-center
    '-200% -200%', // Bottom-right
  ];

  // Create 9 tile VideoAtom instances for outgoing video
  const outgoingTiles: RenderableComponentData[] = Array.from(
    { length: 9 },
    (_, index) => {
      const tileId = `${trackName}-tile-${index}`;
      const staggerTime = tileStaggerTimes[index];

      return {
        id: tileId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'w-full h-full',
          style: {
            objectFit: 'cover',
            objectPosition: tileObjectPositions[index],
            clipPath: tileClipPaths[index],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
        effects: [
          {
            id: `${tileId}-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingVideoDuration - transitionDuration + staggerTime,
              duration: transitionDuration - staggerTime,
              mode: 'provider',
              targetIds: [tileId],
              ranges: [
                // Opacity fade out
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                // Rotate Y-axis (3D flip)
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: 90, prog: 1 },
                // Perspective for 3D effect (constant throughout)
                { key: 'perspective', val: 1000, prog: 0 },
                { key: 'perspective', val: 1000, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create incoming video (sits underneath tiles)
  const incomingVideo: RenderableComponentData = {
    id: `${trackName}-incoming-video`,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
  } as RenderableComponentData;

  // Create tile container with grid layout
  const tileContainer: RenderableComponentData = {
    id: `${trackName}-tile-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-3 grid-rows-3',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    childrenData: outgoingTiles,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [incomingVideo, tileContainer],
  } as RenderableComponentData;

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
  id: 'tile-mosaic-mask-reveal',
  title: 'Tile Mosaic Mask Reveal Transition',
  description:
    'Dynamic 3x3 tile grid transition that splits the outgoing video into tiles that randomly flip with 3D rotation and fade to reveal the incoming video underneath. Features staggered timing for organic movement, GPU-accelerated transforms, and perspective effects for a mosaic-like reveal pattern.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'mosaic',
    'tile',
    'grid',
    '3d',
    'rotation',
    'fade',
    'mask',
    'reveal',
    'stagger',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 2,
    trackName: 'tile-mosaic-transition',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const tileMosaicMaskRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
