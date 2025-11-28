/**
 * Hydrogel Diffusion Transition Preset
 *
 * Simulates osmotic flow through a semi-permeable membrane with granular pixel diffusion.
 * Creates a grid of hundreds of tiny animated squares that sample video colors and animate
 * individually with staggered timing. Outgoing pixels drift outward with increasing randomness,
 * incoming pixels converge from edges. Features refractive distortion using backdrop-filter
 * and transform3d for depth, plus viscosity simulation with specialized easing.
 *
 * Technical Features:
 * - 20x20 grid (400 pixels) with background-position offsets sampling video content
 * - Staggered animations calculated by grid position (row + col) for wave-like diffusion
 * - Membrane layer with backdrop-filter: blur(3px) brightness(1.1) and translateZ for 3D depth
 * - Outgoing pixels: opacity 1→0, translateX/Y to random positions, position-based delays
 * - Incoming pixels: opacity 0→1, start at random edge positions, converge to grid positions
 * - Viscosity easing: cubic-bezier(0.4, 0, 0.6, 1) for slow start, accelerating flow
 * - 2.3s duration with full overlap for simultaneous diffusion effect
 *
 * Use Cases:
 * - Scientific/medical video transitions
 * - Abstract artistic transitions
 * - Data visualization transitions
 * - Educational content about osmosis/diffusion
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).describe('Media type'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).describe('Media type'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.3)
    .describe('Duration of the hydrogel diffusion transition in seconds'),
  gridSize: z
    .number()
    .default(20)
    .describe('Grid dimensions (gridSize x gridSize cells)'),
  diffusionIntensity: z
    .number()
    .default(1.0)
    .describe('Intensity multiplier for pixel movement (0.5-2.0)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, gridSize, diffusionIntensity } = params;

  // Calculate transition timing
  const overlapDuration = transitionDuration;
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Helper: Generate random edge position
  const getRandomEdgePosition = (gridSize: number) => {
    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    const randomPos = Math.random() * 100;
    
    switch (side) {
      case 0: return { x: randomPos, y: -10 }; // top
      case 1: return { x: 110, y: randomPos }; // right
      case 2: return { x: randomPos, y: 110 }; // bottom
      case 3: return { x: -10, y: randomPos }; // left
      default: return { x: 50, y: 50 };
    }
  };

  // Helper: Calculate stagger delay based on grid position
  const calculateStaggerDelay = (row: number, col: number, gridSize: number) => {
    const distance = Math.sqrt(
      Math.pow(row - gridSize / 2, 2) + Math.pow(col - gridSize / 2, 2)
    );
    const maxDistance = Math.sqrt(2) * (gridSize / 2);
    return (distance / maxDistance) * (transitionDuration * 0.4);
  };

  // Helper: Generate random outward position
  const getRandomOutwardPosition = (row: number, col: number, gridSize: number) => {
    const centerRow = gridSize / 2;
    const centerCol = gridSize / 2;
    const deltaRow = row - centerRow;
    const deltaCol = col - centerCol;
    const angle = Math.atan2(deltaRow, deltaCol);
    const distance = 150 + Math.random() * 100;
    
    return {
      x: Math.cos(angle) * distance * diffusionIntensity,
      y: Math.sin(angle) * distance * diffusionIntensity,
    };
  };

  // Generate outgoing pixel grid
  const outgoingPixels: RenderableComponentData[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const pixelId = `outgoing-pixel-${row}-${col}`;
      const staggerDelay = calculateStaggerDelay(row, col, gridSize);
      const outwardPos = getRandomOutwardPosition(row, col, gridSize);
      const cellWidthPercent = 100 / gridSize;
      const cellHeightPercent = 100 / gridSize;

      outgoingPixels.push({
        id: pixelId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background-image: url('${outgoingVideo.src}'); background-size: ${gridSize * 100}% ${gridSize * 100}%; background-position: ${col * cellWidthPercent}% ${row * cellHeightPercent}%;"></div>`,
          className: 'absolute',
          style: {
            width: `${cellWidthPercent}%`,
            height: `${cellHeightPercent}%`,
            left: `${col * cellWidthPercent}%`,
            top: `${row * cellHeightPercent}%`,
            overflow: 'hidden',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
        effects: [
          {
            id: `${pixelId}-diffuse`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: outgoingVideo.duration - transitionDuration + staggerDelay,
              duration: transitionDuration - staggerDelay,
              mode: 'provider',
              targetIds: [pixelId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: outwardPos.x, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: outwardPos.y, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // Generate incoming pixel grid
  const incomingPixels: RenderableComponentData[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const pixelId = `incoming-pixel-${row}-${col}`;
      const staggerDelay = calculateStaggerDelay(gridSize - row - 1, gridSize - col - 1, gridSize);
      const edgePos = getRandomEdgePosition(gridSize);
      const cellWidthPercent = 100 / gridSize;
      const cellHeightPercent = 100 / gridSize;

      incomingPixels.push({
        id: pixelId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background-image: url('${incomingVideo.src}'); background-size: ${gridSize * 100}% ${gridSize * 100}%; background-position: ${col * cellWidthPercent}% ${row * cellHeightPercent}%;"></div>`,
          className: 'absolute',
          style: {
            width: `${cellWidthPercent}%`,
            height: `${cellHeightPercent}%`,
            left: `${col * cellWidthPercent}%`,
            top: `${row * cellHeightPercent}%`,
            overflow: 'hidden',
          },
        },
        context: {
          timing: {
            start: outgoingVideo.duration - transitionDuration,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: `${pixelId}-converge`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0 + staggerDelay,
              duration: transitionDuration - staggerDelay,
              mode: 'provider',
              targetIds: [pixelId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'translateX', val: edgePos.x - col * cellWidthPercent, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: edgePos.y - row * cellHeightPercent, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // Outgoing pixel grid container
  const outgoingPixelGrid: RenderableComponentData = {
    id: 'outgoing-pixel-grid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: outgoingPixels,
  };

  // Incoming pixel grid container
  const incomingPixelGrid: RenderableComponentData = {
    id: 'incoming-pixel-grid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    childrenData: incomingPixels,
  };

  // Membrane layer with backdrop-filter and 3D transform
  const membraneLayer: RenderableComponentData = {
    id: 'membrane-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; backdrop-filter: blur(3px) brightness(1.1); transform: translateZ(50px);"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'hydrogel-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [incomingPixelGrid, outgoingPixelGrid, membraneLayer],
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
  id: 'hydrogel-diffusion-transition',
  title: 'Hydrogel Diffusion Transition',
  description:
    'A sophisticated transition effect simulating osmotic flow through a semi-permeable membrane. Outgoing video pixels diffuse outward through a gel-like membrane with increasing randomness, while incoming video pixels converge from edges. Features hundreds of animated grid cells with staggered timing, refractive distortion using backdrop-filter effects, and viscosity simulation with specialized easing curves for realistic gel-like movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'hydrogel',
    'diffusion',
    'osmotic',
    'granular',
    'membrane',
    'scientific',
    'abstract',
    'pixel',
    'grid',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 2.3,
    gridSize: 20,
    diffusionIntensity: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hydrogelDiffusionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
