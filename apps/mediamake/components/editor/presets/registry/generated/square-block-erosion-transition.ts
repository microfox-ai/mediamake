/**
 * Square Block Erosion Transition Preset
 *
 * A minimalist transition effect where the outgoing video dissolves into a 20x20 grid
 * of small square pixels that fade away in a random pattern, revealing the incoming video underneath.
 *
 * Features:
 * - 20x20 grid (400 total squares) that disappear with staggered random delays (0-1.6s)
 * - Each square shrinks (scale 1→0) and fades (opacity 1→0) simultaneously over 0.3s
 * - Subtle rotation (-15deg to 15deg) on each square for organic movement
 * - Gentle zoom-out on outgoing video (scale 1.0→0.98) for depth
 * - Gentle zoom-in on incoming video (scale 1.02→1.0) for depth
 * - Scanline overlay during transition for digital aesthetic
 *
 * Use cases:
 * - Creating digital/glitch-style transitions between video clips
 * - Building pixelated dissolve effects for retro/tech aesthetics
 * - Adding organic erosion transitions with depth perception
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of outgoing video'),
      duration: z.number().describe('Duration of outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of incoming video'),
      duration: z.number().describe('Duration of incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the erosion transition in seconds'),
  gridSize: z
    .number()
    .default(20)
    .describe('Number of squares per row/column (default 20x20 = 400 squares)'),
  squareAnimationDuration: z
    .number()
    .default(0.3)
    .describe('Duration for each square fade/shrink animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    gridSize,
    squareAnimationDuration,
  } = params;

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Calculate total duration (overlap period)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Transition starts when outgoing video is about to end
  const transitionStartTime = video1.duration - transitionDuration;

  // Generate 400 square blocks programmatically
  const squares: RenderableComponentData[] = [];
  const totalSquares = gridSize * gridSize;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const squareId = `square-${row}-${col}`;
      const randomDelay = randomInRange(0, transitionDuration);
      const randomRotation = randomInRange(-15, 15);

      // Each square: white background, positioned via CSS grid
      const squareNode: RenderableComponentData = {
        id: squareId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; background-color: white;"></div>',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `square-effect-${row}-${col}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: transitionStartTime + randomDelay,
              duration: squareAnimationDuration,
              mode: 'provider',
              targetIds: [squareId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'rotateZ', val: 0, prog: 0 },
                { key: 'rotateZ', val: randomRotation, prog: 1 },
              ],
            },
          },
        ],
      };

      squares.push(squareNode);
    }
  }

  // Incoming video layer (z-10) - zooms in from 1.02 to 1.0
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-video-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'scale', val: 1.02, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing video layer (z-20) - zooms out from 1.0 to 0.98, masked by grid
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 20,
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
        id: 'outgoing-video-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: 0.98, prog: 1 },
          ],
        },
      },
    ],
  };

  // Grid mask container (z-25) - contains all 400 squares
  const gridMaskContainer: RenderableComponentData = {
    id: 'grid-mask-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 25,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: squares,
  };

  // Scanline overlay (z-30) - fades in during transition, fades out after
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 30,
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px)',
        backgroundSize: '100% 4px',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'scanline-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStartTime,
          duration: transitionDuration * 0.3,
          mode: 'provider',
          targetIds: ['scanline-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'scanline-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionStartTime + transitionDuration * 0.7,
          duration: transitionDuration * 0.3,
          mode: 'provider',
          targetIds: ['scanline-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'square-block-erosion-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      incomingVideoLayer,
      outgoingVideoLayer,
      gridMaskContainer,
      scanlineOverlay,
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
  id: 'square-block-erosion-transition',
  title: 'Square Block Erosion Transition',
  description:
    'A minimalist transition effect where the outgoing video dissolves into a 20x20 grid of small square pixels that fade away in a random pattern, revealing the incoming video underneath. Features staggered square animations with scale, opacity, and subtle rotation, plus gentle zoom effects on both videos and scanline overlay for digital aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'erosion', 'grid', 'pixel', 'digital', 'glitch'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.6,
    gridSize: 20,
    squareAnimationDuration: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const squareBlockErosionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
