/**
 * Mobile App Pull-to-Refresh Transition Preset
 *
 * Creates a mobile app-style transition between videos with:
 * - Outgoing video slides up with parallax effect (to -30%, not full -100%)
 * - Material design circular spinner rotates continuously during transition
 * - Incoming video slides up from below with elastic bounce effect
 * - Drop shadow grows as new video enters
 * - Clean overflow-hidden container for mobile-like aesthetics
 *
 * Technical implementation:
 * - 0.7s overlap duration between videos
 * - Outgoing: translateY 0 → -30%, opacity 1 → 0, ease-out
 * - Spinner: continuous 360° rotation, material design style
 * - Incoming: translateY 100% → -5% → 0% (bounce), shadow grows
 * - All timings relative to parent BaseLayout
 *
 * Use cases:
 * - Mobile app-style video transitions
 * - Social media content with native app feel
 * - Story-style video sequences
 * - Vertical video feeds with pull-to-refresh metaphor
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
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Duration of transition overlap in seconds'),
  spinnerColor: z
    .string()
    .default('#d1d5db')
    .describe('Color of the loading spinner border'),
  spinnerSize: z
    .number()
    .default(64)
    .describe('Size of the spinner in pixels (width/height)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, spinnerColor, spinnerSize } = params;

  // Calculate total duration with overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Outgoing video container with parallax slide-up and fade-out
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
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
        id: 'outgoing-parallax-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -30, prog: 1 }, // Parallax: -30% not -100%
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          muted: false,
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Spinner container (visible during transition)
  const spinnerContainer: RenderableComponentData = {
    id: 'spinner-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {},
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'spinner',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${spinnerSize}px; height: ${spinnerSize}px; border: 4px solid ${spinnerColor}; border-top-color: transparent; border-radius: 50%;"></div>`,
          className: '',
          style: {},
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'spinner-rotation',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['spinner'],
              ranges: [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: 360, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video container with bounce slide-up and shadow growth
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
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
        id: 'incoming-bounce-slide',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'translateY', val: 100, prog: 0 }, // Start from bottom (100%)
            { key: 'translateY', val: -5, prog: 0.8 }, // Overshoot to -5%
            { key: 'translateY', val: 0, prog: 1 }, // Settle at 0%
          ],
        },
      },
      {
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.3, // Fade in quickly (first 30%)
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-shadow-grow',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
            { key: 'boxShadow', val: '0 10px 25px rgba(0,0,0,0.3)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          muted: false,
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container with overflow-hidden
  const rootContainer: RenderableComponentData = {
    id: 'mobile-app-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, spinnerContainer, incomingContainer],
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
  id: 'mobileAppTransition',
  title: 'Mobile App Pull-to-Refresh Transition',
  description:
    'Mobile app-style transition with pull-to-refresh loading spinner between videos. Features parallax slide-up fade-out for outgoing video, material design rotating spinner, and elastic bounce slide-up with growing shadow for incoming video. Simulates native mobile app scroll behavior with overflow-hidden container.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'mobile',
    'app',
    'pull-to-refresh',
    'spinner',
    'bounce',
    'parallax',
    'video',
    'modern',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 0.7,
    spinnerColor: '#d1d5db',
    spinnerSize: 64,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const mobileAppTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
