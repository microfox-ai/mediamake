/**
 * Aurora Borealis Transition Preset
 *
 * This preset creates a stunning aurora borealis (northern lights) transition effect
 * between two videos. The outgoing video is overlaid with flowing, semi-transparent
 * gradient layers that undulate and shift through ethereal colors (green, purple, blue, pink).
 * These aurora layers increase in opacity and blur intensity, obscuring the outgoing video
 * while the incoming video fades in beneath them.
 *
 * Features:
 * - Multiple animated gradient layers with screen blend modes
 * - Organic light interaction through different gradients and skew animations
 * - Increasing blur and decreasing opacity on outgoing video
 * - Incoming video fades in with blur effect
 * - Twinkling star particles for celestial atmosphere
 * - Configurable transition duration (default 2.5s)
 *
 * Technical Details:
 * - 4 aurora layers with different gradients and timing offsets
 * - Each layer animates skewY (-5deg to 5deg) and opacity (0.2 to 0.8)
 * - Outgoing video: blur(0→20px), opacity(1→0)
 * - Incoming video: blur(35px→0), opacity(0→1)
 * - 12 star particles with twinkle animations
 * - BaseLayout duration: media1.duration + media2.duration - transitionDuration
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
  media1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the aurora transition effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate BaseLayout duration (sum of both videos minus overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Helper function to create star particles
  const createStarParticle = (
    index: number,
    top: string,
    left: string,
    delayOffset: number,
  ): RenderableComponentData => {
    return {
      id: `star-${index}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='w-1 h-1 bg-white rounded-full' style='position: absolute; top: ${top}; left: ${left};'></div>`,
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `star-${index}-twinkle`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: delayOffset,
            duration: transitionDuration - delayOffset,
            mode: 'provider',
            targetIds: [`star-${index}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.25 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 0.75 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Create children data array
  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: media1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(20px)', prog: 1 },
            ],
          },
        },
        {
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Aurora layer 1 (green → purple)
    {
      id: 'aurora-layer-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div class='absolute inset-0 bg-gradient-to-br from-green-400/20 via-transparent to-purple-400/20' style='mix-blend-mode: screen;'></div>",
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'aurora-1-skew',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['aurora-layer-1'],
            ranges: [
              { key: 'skewY', val: -5, prog: 0 },
              { key: 'skewY', val: 5, prog: 0.5 },
              { key: 'skewY', val: -5, prog: 1 },
            ],
          },
        },
        {
          id: 'aurora-1-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['aurora-layer-1'],
            ranges: [
              { key: 'opacity', val: 0.2, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0.4, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Aurora layer 2 (blue → pink)
    {
      id: 'aurora-layer-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div class='absolute inset-0 bg-gradient-to-tl from-blue-400/20 via-transparent to-pink-400/20' style='mix-blend-mode: screen;'></div>",
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration + 0.3,
          duration: transitionDuration - 0.3,
        },
      },
      effects: [
        {
          id: 'aurora-2-skew',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration - 0.3,
            mode: 'provider',
            targetIds: ['aurora-layer-2'],
            ranges: [
              { key: 'skewY', val: 3, prog: 0 },
              { key: 'skewY', val: -4, prog: 0.5 },
              { key: 'skewY', val: 3, prog: 1 },
            ],
          },
        },
        {
          id: 'aurora-2-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration - 0.3,
            mode: 'provider',
            targetIds: ['aurora-layer-2'],
            ranges: [
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Aurora layer 3 (purple → green)
    {
      id: 'aurora-layer-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div class='absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-green-300/20' style='mix-blend-mode: screen;'></div>",
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration + 0.6,
          duration: transitionDuration - 0.6,
        },
      },
      effects: [
        {
          id: 'aurora-3-skew',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration - 0.6,
            mode: 'provider',
            targetIds: ['aurora-layer-3'],
            ranges: [
              { key: 'skewY', val: -3, prog: 0 },
              { key: 'skewY', val: 4, prog: 0.5 },
              { key: 'skewY', val: -3, prog: 1 },
            ],
          },
        },
        {
          id: 'aurora-3-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration - 0.6,
            mode: 'provider',
            targetIds: ['aurora-layer-3'],
            ranges: [
              { key: 'opacity', val: 0.25, prog: 0 },
              { key: 'opacity', val: 0.75, prog: 0.5 },
              { key: 'opacity', val: 0.35, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Aurora layer 4 (pink → blue)
    {
      id: 'aurora-layer-4',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div class='absolute inset-0 bg-gradient-to-bl from-pink-400/20 via-transparent to-blue-500/20' style='mix-blend-mode: screen;'></div>",
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration + 0.9,
          duration: transitionDuration - 0.9,
        },
      },
      effects: [
        {
          id: 'aurora-4-skew',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration - 0.9,
            mode: 'provider',
            targetIds: ['aurora-layer-4'],
            ranges: [
              { key: 'skewY', val: 4, prog: 0 },
              { key: 'skewY', val: -5, prog: 0.5 },
              { key: 'skewY', val: 4, prog: 1 },
            ],
          },
        },
        {
          id: 'aurora-4-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration - 0.9,
            mode: 'provider',
            targetIds: ['aurora-layer-4'],
            ranges: [
              { key: 'opacity', val: 0.2, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: media2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'blur(35px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Stars container
    {
      id: 'stars-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: [
        createStarParticle(1, '15%', '20%', 0),
        createStarParticle(2, '25%', '75%', 0.1),
        createStarParticle(3, '40%', '10%', 0.2),
        createStarParticle(4, '55%', '85%', 0.15),
        createStarParticle(5, '70%', '30%', 0),
        createStarParticle(6, '80%', '65%', 0.25),
        createStarParticle(7, '20%', '50%', 0.3),
        createStarParticle(8, '35%', '90%', 0.05),
        createStarParticle(9, '60%', '5%', 0.18),
        createStarParticle(10, '75%', '55%', 0.12),
        createStarParticle(11, '10%', '40%', 0.08),
        createStarParticle(12, '90%', '80%', 0.22),
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'aurora-borealis-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-b from-indigo-950 to-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData,
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
  id: 'aurora-borealis-transition',
  title: 'Aurora Borealis Transition',
  description:
    'Ethereal aurora borealis (northern lights) transition where videos blend through flowing, semi-transparent gradient layers with color shifts (green, purple, blue, pink). Features multiple animated aurora layers with screen blend modes, blur effects, and sparkling star particles for a celestial, dreamy atmosphere.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'aurora',
    'northern-lights',
    'ethereal',
    'celestial',
    'gradient',
    'blur',
    'particles',
    'dreamy',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const auroraBorealisTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
