/**
 * Pixelation Mosaic Block Dissolve Transition Preset
 *
 * This preset creates a transition where the outgoing video breaks apart into increasingly
 * larger pixel blocks that fade out while the incoming video simultaneously assembles from
 * scattered pixel blocks. Uses a CSS grid-based approach with multiple div overlays that
 * simulate pixelation through background-position manipulation.
 *
 * Features:
 * - **8x8 Grid Mosaic**: Creates an 8x8 grid of blocks overlaying the videos
 * - **Radial Staggered Timing**: Blocks dissolve from center outward in a radial pattern
 * - **1.5s Overlap**: Both videos are visible through the mosaic effect during transition
 * - **Filter Effects**: Blur and brightness variations applied to each block
 * - **Background Position Manipulation**: Each block shows a portion of the video
 *
 * Technical Implementation:
 * - BaseLayout container duration: video1.duration + video2.duration - 1.5s overlap
 * - Two VideoAtom elements: outgoing (z-10) and incoming (z-0)
 * - Mosaic grid overlay (z-20) with 64 blocks (8x8)
 * - Each block: absolute positioning with 12.5% width/height
 * - Staggered delays: 0-0.3s increments based on distance from center
 * - Blur transitions: 0px → 8px (outgoing), 8px → 0px (incoming)
 * - Brightness transitions: 100% → 0% (outgoing), 0% → 100% (incoming)
 *
 * Use cases:
 * - Creating pixelated video transitions
 * - Building mosaic-style crossfades
 * - Adding digital/glitch effects to transitions
 * - Creating dynamic block-based transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
    startFrom: z.number().default(0).optional().describe('Start time of video1'),
    volume: z.number().default(1).optional().describe('Volume of video1 (0-1)'),
  }).describe('First video configuration (outgoing)'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
    startFrom: z.number().default(0).optional().describe('Start time of video2'),
    volume: z.number().default(1).optional().describe('Volume of video2 (0-1)'),
  }).describe('Second video configuration (incoming)'),
  overlapDuration: z.number().default(1.5).describe('Duration of the transition overlap in seconds'),
  gridSize: z.number().default(8).describe('Number of blocks per row/column (creates gridSize x gridSize blocks)'),
  maxDelay: z.number().default(0.3).describe('Maximum stagger delay in seconds for outer blocks'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, gridSize, maxDelay } = params;

  // Helper: Calculate distance from center for radial pattern
  const calculateDistanceFromCenter = (row: number, col: number): number => {
    const centerRow = (gridSize - 1) / 2;
    const centerCol = (gridSize - 1) / 2;
    const dx = col - centerCol;
    const dy = row - centerRow;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper: Calculate normalized delay based on distance
  const calculateDelay = (row: number, col: number): number => {
    const distance = calculateDistanceFromCenter(row, col);
    const maxDistance = calculateDistanceFromCenter(0, 0); // Corner distance
    const normalizedDistance = distance / maxDistance;
    return normalizedDistance * maxDelay;
  };

  // Calculate BaseLayout duration
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate transition timing
  const transitionStart = video1.duration - overlapDuration;

  // Generate grid blocks
  const blockSize = 100 / gridSize;
  const mosaicBlocks: RenderableComponentData[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const blockId = `block-${row}-${col}`;
      const delay = calculateDelay(row, col);
      const top = row * blockSize;
      const left = col * blockSize;

      // Each block shows both videos with background-position to create mosaic effect
      mosaicBlocks.push({
        id: blockId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute overflow-hidden',
            style: {
              width: `${blockSize}%`,
              height: `${blockSize}%`,
              top: `${top}%`,
              left: `${left}%`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: baseLayoutDuration,
          },
        },
        childrenData: [
          // Outgoing video block
          {
            id: `${blockId}-outgoing`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video1.src,
              startFrom: video1.startFrom ?? 0,
              volume: 0, // Muted for visual effect
              className: 'absolute w-full h-full object-cover',
              style: {
                width: `${gridSize * 100}%`,
                height: `${gridSize * 100}%`,
                left: `${-col * 100}%`,
                top: `${-row * 100}%`,
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
                id: `${blockId}-outgoing-fade`,
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: transitionStart + delay,
                  duration: overlapDuration - delay,
                  mode: 'provider',
                  targetIds: [`${blockId}-outgoing`],
                  ranges: [
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                    { key: 'filter', val: 'blur(0px) brightness(100%)', prog: 0 },
                    { key: 'filter', val: 'blur(8px) brightness(0%)', prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          // Incoming video block
          {
            id: `${blockId}-incoming`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video2.src,
              startFrom: video2.startFrom ?? 0,
              volume: video2.volume ?? 1, // Only incoming video has audio
              className: 'absolute w-full h-full object-cover',
              style: {
                width: `${gridSize * 100}%`,
                height: `${gridSize * 100}%`,
                left: `${-col * 100}%`,
                top: `${-row * 100}%`,
              },
            },
            context: {
              timing: {
                start: transitionStart,
                duration: video2.duration + overlapDuration,
              },
            },
            effects: [
              {
                id: `${blockId}-incoming-fade`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: delay,
                  duration: overlapDuration - delay,
                  mode: 'provider',
                  targetIds: [`${blockId}-incoming`],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                    { key: 'filter', val: 'blur(8px) brightness(0%)', prog: 0 },
                    { key: 'filter', val: 'blur(0px) brightness(100%)', prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData);
    }
  }

  // Root container structure
  const rootContainer: RenderableComponentData = {
    id: 'pixelation-mosaic-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      // Incoming video (bottom layer, z-0)
      {
        id: 'incoming-video-base',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          startFrom: video2.startFrom ?? 0,
          volume: 0, // Muted since block version has audio
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            zIndex: 0,
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: video2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
      // Outgoing video (middle layer, z-10)
      {
        id: 'outgoing-video-base',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          startFrom: video1.startFrom ?? 0,
          volume: video1.volume ?? 1,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            zIndex: 10,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
      // Mosaic grid overlay (top layer, z-20)
      {
        id: 'mosaic-grid-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 20,
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: baseLayoutDuration,
          },
        },
        childrenData: mosaicBlocks,
      } as RenderableComponentData,
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
  id: 'pixelation-mosaic-block-dissolve-transition',
  title: 'Pixelation Mosaic Block Dissolve Transition',
  description:
    'A transition preset where the outgoing video breaks apart into pixelated blocks that fade out radially from center while the incoming video assembles from scattered pixel blocks. Features an 8x8 grid overlay with staggered timing based on distance from center, blur and brightness filter animations, and a 1.5-second overlap window where both videos are visible through the mosaic effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'pixelation',
    'mosaic',
    'blocks',
    'grid',
    'dissolve',
    'radial',
    'filter',
    'blur',
    'brightness',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
      startFrom: 0,
      volume: 1,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
      startFrom: 0,
      volume: 1,
    },
    overlapDuration: 1.5,
    gridSize: 8,
    maxDelay: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pixelationMosaicBlockDissolveTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
