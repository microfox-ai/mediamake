/**
 * Cyber Glitch Transition Preset
 *
 * A cutting-edge transition effect where the outgoing media fragments into digital noise
 * and binary artifacts while the incoming media assembles from scattered data blocks.
 * Features rapid electronic feel with quick opacity flickers simulating screen glitches,
 * brief screen shake effect during peak transition, and green/cyan color tint overlay
 * for a cyberpunk aesthetic.
 *
 * Features:
 * - Outgoing media: Staggered opacity drops (1→0.3→0.9→0.2→0.5→0) with subtle scale oscillations
 * - Incoming media: Inverse flickering pattern with slight position jitter
 * - Screen shake effect during peak transition (0.4s-0.8s)
 * - Green/cyan color overlay for cyberpunk aesthetic
 * - Rapid, electronic feel with glitch simulation
 *
 * Use cases:
 * - Tech and cyberpunk-themed video transitions
 * - Gaming content and esports highlights
 * - Digital/electronic music videos
 * - Futuristic product reveals
 * - Sci-fi storytelling sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media (image or video)'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming media (image or video)'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  const childrenData: RenderableComponentData[] = [
    // Outgoing media with glitch effects
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-opacity-flicker',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['outgoing-media'],
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.167 },
              { key: 'opacity', val: 0.9, prog: 0.333 },
              { key: 'opacity', val: 0.2, prog: 0.5 },
              { key: 'opacity', val: 0.5, prog: 0.667 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'outgoing-scale-oscillation',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['outgoing-media'],
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.02, prog: 0.25 },
              { key: 'scale', val: 0.98, prog: 0.5 },
              { key: 'scale', val: 1.05, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming media with inverse flicker and jitter
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration + 0.4,
          duration: media2.duration + transitionDuration - 0.4,
        },
      },
      effects: [
        {
          id: 'incoming-opacity-inverse-flicker',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['incoming-media'],
            type: 'linear',
            start: 0,
            duration: 0.8,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.25 },
              { key: 'opacity', val: 0.2, prog: 0.5 },
              { key: 'opacity', val: 0.8, prog: 0.75 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-position-jitter',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['incoming-media'],
            type: 'linear',
            start: 0,
            duration: 0.6,
            ranges: [
              { key: 'translateX', val: '2px', prog: 0 },
              { key: 'translateX', val: '-3px', prog: 0.2 },
              { key: 'translateX', val: '1px', prog: 0.4 },
              { key: 'translateX', val: '-1px', prog: 0.6 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: '-2px', prog: 0 },
              { key: 'translateY', val: '2px', prog: 0.3 },
              { key: 'translateY', val: '-1px', prog: 0.6 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Color overlay (green/cyan tint)
    {
      id: 'color-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background-color: #00ff0030;"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 30,
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
          id: 'overlay-opacity-effect',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['color-overlay'],
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.25 },
              { key: 'opacity', val: 0.4, prog: 0.75 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'cyber-glitch-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-[#0a0a0a] overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    effects: [
      {
        id: 'screen-shake-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['cyber-glitch-transition-container'],
          type: 'linear',
          start: media1.duration - transitionDuration + 0.4,
          duration: 0.4,
          ranges: [
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-3px', prog: 0.25 },
            { key: 'translateY', val: '2px', prog: 0.5 },
            { key: 'translateY', val: '-1px', prog: 0.75 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'cyber-glitch-transition',
  title: 'Cyber Glitch Transition',
  description:
    'A cutting-edge transition effect where the outgoing media fragments into digital noise and binary artifacts while the incoming media assembles from scattered data blocks. Features rapid electronic feel with quick opacity flickers simulating screen glitches, brief screen shake effect during peak transition, and green/cyan color tint overlay for a cyberpunk aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'cyber',
    'cyberpunk',
    'electronic',
    'digital',
    'futuristic',
    'tech',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cyberGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
