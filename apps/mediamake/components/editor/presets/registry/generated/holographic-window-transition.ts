/**
 * Holographic Window Transition Preset
 *
 * This preset creates a futuristic holographic window transition with:
 * - Triangular shard fragmentation of the outgoing video (8 shards dispersing outwards)
 * - Hi-tech circular loading interface with rotating arcs and percentage display
 * - Radial wipe effect for the incoming video materializing from center
 * - Digital grid lines that fade away during the transition
 * - Glowing neon edges and particle effects for sci-fi aesthetic
 *
 * Features:
 * - Fragmentation: 8 VideoAtom copies with different clip-path polygons
 * - Each shard has unique transform animations (translate and rotate)
 * - Circular loader: Multiple rotating rings with percentage text
 * - Radial wipe: Incoming video scales from center with mask effect
 * - Grid overlay: Grid pattern with opacity fade
 * - Glow effects: Neon box-shadow animations (cyan, magenta, green)
 * - Particle effects: Animated glowing particles with motion
 *
 * Use cases:
 * - Futuristic video transitions
 * - Sci-fi loading sequences
 * - High-tech content transitions
 * - Digital transformation effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video that fragments'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video that materializes'),
  transitionDuration: z
    .number()
    .default(1.3)
    .describe('Duration of the transition overlap in seconds'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color during transition'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    backgroundColor,
  } = params;

  // Timing calculations
  const outgoingDuration = 0.5;
  const shardStart = 0.2;
  const shardDuration = 0.9;
  const loaderStart = 0.4;
  const loaderDuration = 0.9;
  const incomingStart = 0.5;
  const incomingDuration = 0.8;
  const gridStart = 0.5;
  const gridDuration = 0.8;
  const particleStart = 0.2;
  const particleDuration = 1.1;

  // Total transition duration
  const totalDuration = transitionDuration;

  // Helper: Create shard with video and effects
  const createShard = (
    index: number,
    clipPath: string,
    translateX: number,
    translateY: number,
    rotate: number,
  ): RenderableComponentData => {
    const shardWrapperId = `shard-wrapper-${index}`;
    const shardVideoId = `shard-video-${index}`;

    return {
      id: shardWrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: shardDuration,
        },
      },
      childrenData: [
        {
          id: shardVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: shardDuration,
            },
          },
          effects: [
            {
              id: `shard-${index}-disperse`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: shardDuration,
                mode: 'provider',
                targetIds: [shardWrapperId],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: translateX, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: translateY, prog: 1 },
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: rotate, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Helper: Create loader ring
  const createLoaderRing = (
    id: string,
    size: number,
    borderWidth: number,
    borderColor: string,
    borderTopColor: string,
    rotationDegrees: number,
  ): RenderableComponentData => {
    return {
      id,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: ${size}px; height: ${size}px; border-radius: 50%; border: ${borderWidth}px solid ${borderColor}; border-top-color: ${borderTopColor}; box-shadow: 0 0 20px ${borderTopColor};'></div>`,
        className: 'absolute',
      },
      context: {
        timing: {
          start: 0,
          duration: loaderDuration,
        },
      },
      effects: [
        {
          id: `${id}-rotation`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: loaderDuration,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationDegrees, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.1 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create grid line
  const createGridLine = (
    id: string,
    isHorizontal: boolean,
    position: string,
  ): RenderableComponentData => {
    const html = isHorizontal
      ? `<div style='width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.6), transparent);'></div>`
      : `<div style='width: 1px; height: 100%; background: linear-gradient(180deg, transparent, rgba(0, 255, 255, 0.6), transparent);'></div>`;

    const positionStyle = isHorizontal
      ? { top: position }
      : { left: position };

    return {
      id,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html,
        className: 'absolute',
        style: positionStyle,
      },
      context: {
        timing: {
          start: 0,
          duration: gridDuration,
        },
      },
      effects: [
        {
          id: `${id}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: gridDuration,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create particle
  const createParticle = (
    id: string,
    size: number,
    color: string,
    top: string,
    left: string,
    translateX: number,
    translateY: number,
  ): RenderableComponentData => {
    return {
      id,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}; box-shadow: 0 0 10px ${color};'></div>`,
        className: 'absolute',
        style: {
          top,
          left,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: particleDuration,
        },
      },
      effects: [
        {
          id: `${id}-movement`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: particleDuration,
            mode: 'provider',
            targetIds: [id],
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
      ],
    } as RenderableComponentData;
  };

  // Build shard children
  const shardChildren: RenderableComponentData[] = [
    createShard(1, 'polygon(0% 0%, 33% 0%, 16% 50%)', -150, -120, -35),
    createShard(2, 'polygon(33% 0%, 66% 0%, 50% 50%)', 0, -180, 15),
    createShard(3, 'polygon(66% 0%, 100% 0%, 83% 50%)', 150, -120, 35),
    createShard(4, 'polygon(0% 50%, 16% 50%, 0% 100%)', -180, 100, -45),
    createShard(5, 'polygon(16% 50%, 50% 50%, 33% 100%)', -50, 150, -20),
    createShard(6, 'polygon(50% 50%, 83% 50%, 66% 100%)', 50, 150, 20),
    createShard(7, 'polygon(83% 50%, 100% 50%, 100% 100%)', 180, 100, 45),
    createShard(8, 'polygon(33% 100%, 50% 50%, 66% 100%)', 0, 200, 10),
  ];

  // Build loader children
  const loaderChildren: RenderableComponentData[] = [
    createLoaderRing(
      'loader-ring-outer',
      200,
      4,
      'rgba(0, 255, 255, 0.3)',
      'rgba(0, 255, 255, 1)',
      360,
    ),
    createLoaderRing(
      'loader-ring-middle',
      150,
      3,
      'rgba(255, 0, 255, 0.3)',
      'rgba(255, 0, 255, 1)',
      -270,
    ),
    createLoaderRing(
      'loader-ring-inner',
      100,
      2,
      'rgba(0, 255, 100, 0.3)',
      'rgba(0, 255, 100, 1)',
      540,
    ),
    {
      id: 'loader-percentage-text',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: '100%',
        className: 'absolute text-center',
        style: {
          fontSize: '32px',
          fontWeight: '700',
          color: '#00ffff',
          textShadow:
            '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.5)',
          fontFamily: 'Inter',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: loaderDuration,
        },
      },
      effects: [
        {
          id: 'percentage-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: loaderDuration,
            mode: 'provider',
            targetIds: ['loader-percentage-text'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Build grid children
  const gridChildren: RenderableComponentData[] = [
    createGridLine('grid-horizontal-1', true, '33%'),
    createGridLine('grid-horizontal-2', true, '50%'),
    createGridLine('grid-horizontal-3', true, '66%'),
    createGridLine('grid-vertical-1', false, '33%'),
    createGridLine('grid-vertical-2', false, '50%'),
    createGridLine('grid-vertical-3', false, '66%'),
  ];

  // Build particle children
  const particleChildren: RenderableComponentData[] = [
    createParticle(
      'particle-1',
      4,
      'rgba(0, 255, 255, 1)',
      '20%',
      '30%',
      80,
      -60,
    ),
    createParticle(
      'particle-2',
      3,
      'rgba(255, 0, 255, 1)',
      '50%',
      '50%',
      -100,
      80,
    ),
    createParticle(
      'particle-3',
      5,
      'rgba(0, 255, 100, 1)',
      '70%',
      '60%',
      120,
      -90,
    ),
    createParticle(
      'particle-4',
      4,
      'rgba(255, 255, 0, 1)',
      '40%',
      '80%',
      -70,
      100,
    ),
    createParticle(
      'particle-5',
      3,
      'rgba(0, 200, 255, 1)',
      '60%',
      '20%',
      90,
      -110,
    ),
    createParticle(
      'particle-6',
      5,
      'rgba(255, 100, 200, 1)',
      '30%',
      '70%',
      -130,
      70,
    ),
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'holographic-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor,
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
      // Outgoing video wrapper
      {
        id: 'outgoing-video-wrapper',
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
            start: 0,
            duration: outgoingDuration,
          },
        },
        childrenData: [
          {
            id: 'outgoing-video-base',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: outgoingVideoSrc,
              fit: 'cover',
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: outgoingDuration,
              },
            },
            effects: [
              {
                id: 'outgoing-fade-out',
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: 0,
                  duration: outgoingDuration,
                  mode: 'provider',
                  targetIds: ['outgoing-video-base'],
                  ranges: [
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
      // Shard container
      {
        id: 'shard-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 2,
            },
          },
        },
        context: {
          timing: {
            start: shardStart,
            duration: shardDuration,
          },
        },
        childrenData: shardChildren,
      } as RenderableComponentData,
      // Loading interface container
      {
        id: 'loading-interface-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              zIndex: 3,
            },
          },
        },
        context: {
          timing: {
            start: loaderStart,
            duration: loaderDuration,
          },
        },
        childrenData: loaderChildren,
      } as RenderableComponentData,
      // Incoming video container
      {
        id: 'incoming-video-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 4,
            },
          },
        },
        context: {
          timing: {
            start: incomingStart,
            duration: incomingDuration,
          },
        },
        childrenData: [
          {
            id: 'incoming-video-atom',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: incomingVideoSrc,
              fit: 'cover',
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: incomingDuration,
              },
            },
            effects: [
              {
                id: 'incoming-radial-wipe',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: incomingDuration,
                  mode: 'provider',
                  targetIds: ['incoming-video-atom'],
                  ranges: [
                    { key: 'scale', val: 0, prog: 0 },
                    { key: 'scale', val: 1.5, prog: 1 },
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 0.3 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
      // Grid overlay container
      {
        id: 'grid-overlay-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 5,
            },
          },
        },
        context: {
          timing: {
            start: gridStart,
            duration: gridDuration,
          },
        },
        childrenData: gridChildren,
      } as RenderableComponentData,
      // Particle effects container
      {
        id: 'particle-effects-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 6,
            },
          },
        },
        context: {
          timing: {
            start: particleStart,
            duration: particleDuration,
          },
        },
        childrenData: particleChildren,
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
  id: 'holographic-window-transition',
  title: 'Holographic Window Transition',
  description:
    'Futuristic holographic transition with triangular shard fragmentation, circular hi-tech loading interface with rotating arcs and percentage display, and radial wipe materialization with digital grid overlay. Features glowing neon edges and sci-fi particle effects for next-gen visual storytelling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'holographic',
    'futuristic',
    'sci-fi',
    'fragmentation',
    'shards',
    'loading',
    'radial',
    'wipe',
    'grid',
    'particles',
    'glow',
    'neon',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1.3,
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const holographicWindowTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
