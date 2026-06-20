/**
 * Wave Warp Transition Preset
 *
 * This preset creates a horizontal wave distortion transition that warps the outgoing video
 * into 3 horizontal bands with staggered sine-wave transforms while the incoming video
 * slides in from the right with inverse wave motion.
 *
 * Features:
 * - **Wave Distortion**: Outgoing video splits into 3 horizontal bands (top, middle, bottom)
 * - **Staggered Animation**: Each band uses different phase offsets for wave-like propagation
 * - **Sine Wave Motion**: Transform animations use translateX and skewY to simulate waves
 * - **Inverse Motion**: Incoming video uses complementary wave motion, starting distorted
 * - **Smooth Transition**: 2-second overlap period with synchronized effects
 * - **Clip-Path Bands**: Uses clip-path to divide video into horizontal thirds
 *
 * Use cases:
 * - Creating dynamic video transitions with wave effects
 * - Building cinematic transitions between clips
 * - Adding organic motion to video sequences
 * - Creating professional video montages with fluid transitions
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
      src: z.string().describe('Source URL of first video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video (outgoing)'),
  video2: z
    .object({
      src: z.string().describe('Source URL of second video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video (incoming)'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of wave transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate base layout duration (sum minus overlap)
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;

  // Outgoing video bands (3 horizontal thirds)
  const outgoingBandTop: RenderableComponentData = {
    id: 'outgoing-band-top',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        clipPath: 'inset(0 0 66.67% 0)', // Top third
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
        id: 'outgoing-band-top-wave',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-band-top'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 30, prog: 0.25 },
            { key: 'translateX', val: -30, prog: 0.5 },
            { key: 'translateX', val: 15, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'skewY', val: 0, prog: 0 },
            { key: 'skewY', val: 3, prog: 0.25 },
            { key: 'skewY', val: -3, prog: 0.5 },
            { key: 'skewY', val: 2, prog: 0.75 },
            { key: 'skewY', val: 0, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const outgoingBandMiddle: RenderableComponentData = {
    id: 'outgoing-band-middle',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        clipPath: 'inset(33.33% 0 33.34% 0)', // Middle third
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
        id: 'outgoing-band-middle-wave',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-band-middle'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -30, prog: 0.33 },
            { key: 'translateX', val: 30, prog: 0.67 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'skewY', val: 0, prog: 0 },
            { key: 'skewY', val: -3, prog: 0.33 },
            { key: 'skewY', val: 3, prog: 0.67 },
            { key: 'skewY', val: 0, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const outgoingBandBottom: RenderableComponentData = {
    id: 'outgoing-band-bottom',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        clipPath: 'inset(66.67% 0 0 0)', // Bottom third
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
        id: 'outgoing-band-bottom-wave',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-band-bottom'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 25, prog: 0.2 },
            { key: 'translateX', val: -25, prog: 0.4 },
            { key: 'translateX', val: 20, prog: 0.6 },
            { key: 'translateX', val: -10, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'skewY', val: 0, prog: 0 },
            { key: 'skewY', val: 2, prog: 0.2 },
            { key: 'skewY', val: -2, prog: 0.4 },
            { key: 'skewY', val: 3, prog: 0.6 },
            { key: 'skewY', val: -1, prog: 0.8 },
            { key: 'skewY', val: 0, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing container (holds all 3 bands)
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: [
      outgoingBandTop,
      outgoingBandMiddle,
      outgoingBandBottom,
    ] as RenderableComponentData[],
  };

  // Incoming video (slides in from right with inverse wave)
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-video-wave',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateX', val: 100, prog: 0, unit: '%' },
            { key: 'translateX', val: 0, prog: 1, unit: '%' },
            { key: 'skewY', val: 5, prog: 0 },
            { key: 'skewY', val: 3, prog: 0.3 },
            { key: 'skewY', val: 1, prog: 0.6 },
            { key: 'skewY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: [incomingVideo] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'wave-warp-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingContainer,
      incomingContainer,
    ] as RenderableComponentData[],
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
  id: 'wave-warp-transition',
  title: 'Wave Warp Transition',
  description:
    'A horizontal wave distortion transition that warps the outgoing video into 3 bands with staggered sine-wave transforms while the incoming video slides in with inverse wave motion',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wave', 'warp', 'distortion', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const waveWarpTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
