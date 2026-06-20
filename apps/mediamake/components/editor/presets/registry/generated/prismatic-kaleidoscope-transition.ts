/**
 * Prismatic Kaleidoscope Transition Preset
 *
 * This preset creates a spectacular hexagonal honeycomb transition that splits the outgoing video
 * into RGB color channels, refracts them into rainbow spectrums through prism-like hexagonal cells,
 * then converges the incoming video from dispersed color channels with pulsing chromatic energy
 * and light leak effects.
 *
 * Features:
 * - **Hexagonal Honeycomb Grid**: Creates a grid of hexagonal cells using CSS Grid with clip-paths
 * - **RGB Color Channel Separation**: Splits video into red, green, and blue channels with hue rotation
 * - **Prism Refraction**: Each hexagon acts as a prism with independent rotation and color separation
 * - **Light Leak Effects**: CSS gradients with blend modes create chromatic aberration effects
 * - **Chromatic Convergence**: Incoming video assembles from dispersed color channels
 * - **Pulsing Energy**: Scale pulsing effects create dynamic chromatic energy
 * - **Staggered Animation**: Cascading timing based on grid position for wave-like dispersal
 *
 * Use cases:
 * - Creating prismatic video transitions with kaleidoscopic effects
 * - Building color-separated transitions with RGB channel manipulation
 * - Adding refraction and spectral effects to video transitions
 * - Creating honeycomb pattern transitions with independent cell animations
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
      src: z.string().describe('Source URL of outgoing video'),
    })
    .describe('Outgoing video configuration'),
  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of incoming video'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.7)
    .describe('Duration of the transition in seconds'),
  gridCols: z
    .number()
    .default(6)
    .describe('Number of hexagon columns in the grid'),
  gridRows: z
    .number()
    .default(8)
    .describe('Number of hexagon rows in the grid'),
  rgbOffset: z
    .number()
    .default(8)
    .describe('Pixel offset for RGB channel separation'),
  rotationSpeed: z
    .number()
    .default(360)
    .describe('Rotation degrees for hexagon prism effect'),
  pulseIntensity: z
    .number()
    .default(0.2)
    .describe('Intensity of scale pulsing (0-1)'),
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
    gridCols,
    gridRows,
    rgbOffset,
    rotationSpeed,
    pulseIntensity,
  } = params;

  const totalCells = gridCols * gridRows;

  // Calculate stagger delay for each cell
  const getStaggerDelay = (index: number): number => {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    const distance = Math.sqrt(
      Math.pow(col - gridCols / 2, 2) + Math.pow(row - gridRows / 2, 2),
    );
    return (distance / Math.sqrt(Math.pow(gridCols, 2) + Math.pow(gridRows, 2))) * 0.3;
  };

  // Generate hexagon cells with RGB channels
  const hexagonCells: RenderableComponentData[] = [];

  for (let i = 0; i < totalCells; i++) {
    const cellId = `hexagon-cell-${i}`;
    const staggerDelay = getStaggerDelay(i);

    // Red channel (outgoing)
    const redChannelId = `${cellId}-red`;
    const redChannel: RenderableComponentData = {
      id: redChannelId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          filter: 'hue-rotate(-120deg) saturate(2)',
          mixBlendMode: 'screen',
          transform: `translateX(${-rgbOffset}px)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${redChannelId}-rotate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [redChannelId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationSpeed, prog: 1 },
            ],
          },
        },
        {
          id: `${redChannelId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration * 0.6 + staggerDelay,
            duration: transitionDuration * 0.4,
            mode: 'provider',
            targetIds: [redChannelId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    // Green channel (outgoing)
    const greenChannelId = `${cellId}-green`;
    const greenChannel: RenderableComponentData = {
      id: greenChannelId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${greenChannelId}-rotate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [greenChannelId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationSpeed, prog: 1 },
            ],
          },
        },
        {
          id: `${greenChannelId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration * 0.6 + staggerDelay,
            duration: transitionDuration * 0.4,
            mode: 'provider',
            targetIds: [greenChannelId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    // Blue channel (outgoing)
    const blueChannelId = `${cellId}-blue`;
    const blueChannel: RenderableComponentData = {
      id: blueChannelId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          filter: 'hue-rotate(120deg) saturate(2)',
          mixBlendMode: 'screen',
          transform: `translateX(${rgbOffset}px)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${blueChannelId}-rotate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [blueChannelId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationSpeed, prog: 1 },
            ],
          },
        },
        {
          id: `${blueChannelId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration * 0.6 + staggerDelay,
            duration: transitionDuration * 0.4,
            mode: 'provider',
            targetIds: [blueChannelId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    // Hexagon cell container with light leak
    const hexagonCell: RenderableComponentData = {
      id: cellId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            clipPath:
              'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
            mixBlendMode: 'screen',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${cellId}-pulse`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [cellId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1 + pulseIntensity, prog: 0.2 },
              { key: 'scale', val: 1 - pulseIntensity, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        redChannel,
        greenChannel,
        blueChannel,
        // Light leak overlay
        {
          id: `${cellId}-light-leak`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 100%; background: linear-gradient(45deg, rgba(255,0,255,0.3), rgba(0,255,255,0.3), rgba(255,255,0,0.3)); mix-blend-mode: overlay; pointer-events: none;"></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    };

    hexagonCells.push(hexagonCell);
  }

  // Honeycomb grid container
  const honeycombGrid: RenderableComponentData = {
    id: 'honeycomb-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
          gap: '2px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: hexagonCells,
  };

  // Background gradient layer
  const backgroundGradient: RenderableComponentData = {
    id: 'background-gradient',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(45deg, rgba(255,0,255,0.3), rgba(0,255,255,0.3), rgba(255,255,0,0.3)); mix-blend-mode: overlay;"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Incoming video - red channel
  const incomingRedId = 'incoming-red-channel';
  const incomingRed: RenderableComponentData = {
    id: incomingRedId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        filter: 'hue-rotate(-120deg) saturate(2)',
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: transitionDuration * 0.5,
        duration: transitionDuration * 0.5,
      },
    },
    effects: [
      {
        id: `${incomingRedId}-converge`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: [incomingRedId],
          ranges: [
            { key: 'translateX', val: `${-rgbOffset * 3}px`, prog: 0 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video - green channel
  const incomingGreenId = 'incoming-green-channel';
  const incomingGreen: RenderableComponentData = {
    id: incomingGreenId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: transitionDuration * 0.5,
        duration: transitionDuration * 0.5,
      },
    },
    effects: [
      {
        id: `${incomingGreenId}-converge`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: [incomingGreenId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video - blue channel
  const incomingBlueId = 'incoming-blue-channel';
  const incomingBlue: RenderableComponentData = {
    id: incomingBlueId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        filter: 'hue-rotate(120deg) saturate(2)',
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: transitionDuration * 0.5,
        duration: transitionDuration * 0.5,
      },
    },
    effects: [
      {
        id: `${incomingBlueId}-converge`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: [incomingBlueId],
          ranges: [
            { key: 'translateX', val: `${rgbOffset * 3}px`, prog: 0 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video layer
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: transitionDuration * 0.5,
        duration: transitionDuration * 0.5,
      },
    },
    childrenData: [incomingRed, incomingGreen, incomingBlue],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-kaleidoscope-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [backgroundGradient, honeycombGrid, incomingVideoLayer],
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
  id: 'prismatic-kaleidoscope-transition',
  title: 'Prismatic Kaleidoscope Transition',
  description:
    'A spectacular hexagonal honeycomb transition that splits outgoing video into RGB color channels, refracts them into rainbow spectrums through prism-like hexagonal cells, then converges incoming video from dispersed color channels with pulsing chromatic energy and light leak effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'kaleidoscope',
    'prismatic',
    'hexagonal',
    'honeycomb',
    'rgb',
    'color-separation',
    'chromatic',
    'refraction',
    'spectral',
    'light-leak',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
    },
    transitionDuration: 1.7,
    gridCols: 6,
    gridRows: 8,
    rgbOffset: 8,
    rotationSpeed: 360,
    pulseIntensity: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismaticKaleidoscopeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
