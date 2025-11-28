/**
 * Scientific Microscope Lens Transition Preset
 *
 * Simulates focusing through different magnification levels with chromatic aberration,
 * lens flare, and circular viewport transitions. Features three distinct focus pulls
 * (1x, 2x, 4x) with blur animations and brightness peaks at focus transitions.
 *
 * Technical features:
 * - Three-stage transform animation: scale(1) -> scale(1.5) -> scale(2) -> scale(1)
 * - Outgoing video: blur 0 -> 8px -> 4px -> 12px (defocus progression)
 * - Incoming video: blur 12px -> 4px -> 0 (sharpen into view)
 * - Chromatic aberration via drop-shadow with red/blue offset channels
 * - Circular clip-path expanding from 30% to 100%
 * - Brightness peaks at focus transitions (100% -> 140% -> 100%)
 * - Z-layering: incoming z-20, outgoing z-10
 * - GPU optimization via will-change-transform
 *
 * Use cases:
 * - Scientific presentation transitions
 * - Educational microscopy content
 * - Technical documentary transitions
 * - Laboratory or research video styles
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoing: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).describe('Type of outgoing media'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incoming: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).describe('Type of incoming media'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(4)
    .describe('Duration of microscope transition overlap in seconds (extended focus effect)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoing, incoming, overlapDuration } = params;

  // Calculate base layout duration
  const baseLayoutDuration =
    outgoing.duration + incoming.duration - overlapDuration;

  // Transition timing calculations
  const incomingStart = outgoing.duration - overlapDuration;
  const stage1Duration = overlapDuration / 3; // First focus pull (1x -> 1.5x)
  const stage2Duration = overlapDuration / 3; // Second focus pull (1.5x -> 2x)
  const stage3Duration = overlapDuration / 3; // Third focus pull (2x -> 1x)

  // Helper function to determine component ID
  const getComponentId = (type: 'video' | 'image'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Outgoing video container with defocus blur progression
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 will-change-transform',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoing.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: getComponentId(outgoing.type),
        data: {
          src: outgoing.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoing.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Three-stage transform animation for outgoing
      {
        id: 'outgoing-scale-stage1',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoing.duration - overlapDuration,
          duration: stage1Duration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.5, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-scale-stage2',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoing.duration - overlapDuration + stage1Duration,
          duration: stage2Duration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'scale', val: 1.5, prog: 0 },
            { key: 'scale', val: 2, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-scale-stage3',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoing.duration - overlapDuration + stage1Duration + stage2Duration,
          duration: stage3Duration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'scale', val: 2, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Blur progression: 0 -> 8px -> 4px -> 12px (defocus)
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoing.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 0.33 },
            { key: 'filter', val: 'blur(4px)', prog: 0.66 },
            { key: 'filter', val: 'blur(12px)', prog: 1 },
          ],
        },
      },
      // Brightness peaks at focus transitions
      {
        id: 'outgoing-brightness',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoing.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 1.4, prog: 0.33 },
            { key: 'brightness', val: 1, prog: 0.5 },
            { key: 'brightness', val: 1.4, prog: 0.66 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Opacity fade out
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoing.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video container with sharpening progression
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 will-change-transform',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incoming.duration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: getComponentId(incoming.type),
        data: {
          src: incoming.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incoming.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Three-stage transform animation for incoming
      {
        id: 'incoming-scale-stage1',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: stage1Duration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.5, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-scale-stage2',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: stage1Duration,
          duration: stage2Duration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'scale', val: 1.5, prog: 0 },
            { key: 'scale', val: 2, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-scale-stage3',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: stage1Duration + stage2Duration,
          duration: stage3Duration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'scale', val: 2, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Blur progression: 12px -> 4px -> 0 (sharpen into view)
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'blur(12px)', prog: 0 },
            { key: 'filter', val: 'blur(4px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Brightness peaks at focus transitions
      {
        id: 'incoming-brightness',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 1.4, prog: 0.33 },
            { key: 'brightness', val: 1, prog: 0.5 },
            { key: 'brightness', val: 1.4, prog: 0.66 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Opacity fade in
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Chromatic aberration with red/blue drop-shadow offset
      {
        id: 'incoming-chromatic-aberration',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(3px 0 0 rgba(255,0,0,0.6)) drop-shadow(-3px 0 0 rgba(0,0,255,0.6))',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'drop-shadow(2px 0 0 rgba(255,0,0,0.4)) drop-shadow(-2px 0 0 rgba(0,0,255,0.4))',
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0px 0 0 rgba(255,0,0,0)) drop-shadow(0px 0 0 rgba(0,0,255,0))',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Circular viewport mask expanding from 30% to 100%
  const circularMaskContainer: RenderableComponentData = {
    id: 'circular-mask-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: overlapDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'circular-mask-expand',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'clipPath', val: 'circle(30% at center)', prog: 0 },
            { key: 'clipPath', val: 'circle(50% at center)', prog: 0.5 },
            { key: 'clipPath', val: 'circle(100% at center)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Lens flare overlay (subtle light refraction effect)
  const lensFlareOverlay: RenderableComponentData = {
    id: 'lens-flare-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 40%); pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: {
        zIndex: 25,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'lens-flare-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['lens-flare-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.33 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 0.6, prog: 0.66 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'microscope-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      lensFlareOverlay,
      circularMaskContainer,
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
  id: 'microscope-lens-transition',
  title: 'Scientific Microscope Lens Transition',
  description:
    'Simulates focusing through different magnification levels with chromatic aberration, lens flare, and circular viewport transitions. Features three distinct focus pulls (1x, 2x, 4x) with blur animations and brightness peaks at focus transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'microscope',
    'scientific',
    'focus',
    'chromatic-aberration',
    'lens',
    'magnification',
    'blur',
    'advanced',
  ],
  defaultInputParams: {
    outgoing: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incoming: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    overlapDuration: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const microscopeLensTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
