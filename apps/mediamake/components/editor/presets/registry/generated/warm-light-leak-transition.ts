/**
 * Warm Analogue Light Leak Transition Preset
 *
 * This preset creates a vintage film burning transition effect between two videos with:
 * - Bright orange-white overexposed burn effect using CSS filters (brightness, contrast, saturate)
 * - Horizontal shake effect simulating film gate movement during burn peak
 * - Expanding radial gradient light leak overlay from center
 * - 1.5 second overlap with synchronized effects peaking at 0.75s
 *
 * Features:
 * - Outgoing video develops burn effect that peaks at midpoint
 * - Incoming video fades in through inverse burn effect
 * - Subtle horizontal shake (-3px to 3px) during burn peak
 * - Radial gradient expands from scale 0 to 1.5 with warm colors (orange to white)
 * - All effects synchronized to overlap period starting at video1.duration - 1.5s
 *
 * Use cases:
 * - Vintage film-style transitions between video clips
 * - Retro aesthetic video montages
 * - Music videos with analogue film feel
 * - Documentary transitions with historical/archival feel
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
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds (default: 1.5)'),
  burnBrightness: z
    .number()
    .default(2.5)
    .describe('Peak brightness value for burn effect (default: 2.5)'),
  burnContrast: z
    .number()
    .default(0.3)
    .describe('Contrast value at burn peak (default: 0.3)'),
  burnSaturate: z
    .number()
    .default(1.8)
    .describe('Saturation value at burn peak (default: 1.8)'),
  shakeAmplitude: z
    .number()
    .default(3)
    .describe('Maximum horizontal shake amplitude in pixels (default: 3)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    burnBrightness,
    burnContrast,
    burnSaturate,
    shakeAmplitude,
  } = params;

  // Calculate BaseLayout duration (sum of videos minus overlap)
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate transition start time (when overlap begins)
  const transitionStart = video1.duration - overlapDuration;

  // Create outgoing video with burn effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      muted: false,
      loop: false,
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Opacity fade out during transition
      {
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Brightness burn effect (peaks at 0.5 prog = 0.75s)
      {
        id: 'outgoing-brightness-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: burnBrightness, prog: 0.5 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Contrast burn effect
      {
        id: 'outgoing-contrast-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'contrast', val: 1, prog: 0 },
            { key: 'contrast', val: burnContrast, prog: 0.5 },
            { key: 'contrast', val: 1, prog: 1 },
          ],
        },
      },
      // Saturate burn effect
      {
        id: 'outgoing-saturate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'saturate', val: 1, prog: 0 },
            { key: 'saturate', val: burnSaturate, prog: 0.5 },
            { key: 'saturate', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video with inverse burn effects
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      muted: false,
      loop: false,
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      // Opacity fade in during transition
      {
        id: 'incoming-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Brightness inverse burn (starts bright, normalizes)
      {
        id: 'incoming-brightness-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'brightness', val: burnBrightness, prog: 0 },
            { key: 'brightness', val: 1, prog: 0.5 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Contrast inverse burn
      {
        id: 'incoming-contrast-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'contrast', val: burnContrast, prog: 0 },
            { key: 'contrast', val: 1, prog: 0.5 },
            { key: 'contrast', val: 1, prog: 1 },
          ],
        },
      },
      // Saturate inverse burn
      {
        id: 'incoming-saturate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'saturate', val: burnSaturate, prog: 0 },
            { key: 'saturate', val: 1, prog: 0.5 },
            { key: 'saturate', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create light leak overlay with radial gradient
  const lightLeakOverlay: RenderableComponentData = {
    id: 'light-leak-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle, transparent 0%, rgba(255, 200, 100, 0.7) 50%, white 100%);"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
    effects: [
      // Scale expansion from 0 to 1.5
      {
        id: 'light-leak-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['light-leak-overlay'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.5, prog: 0.5 },
            { key: 'scale', val: 1.5, prog: 1 },
          ],
        },
      },
      // Opacity peaks at midpoint
      {
        id: 'light-leak-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['light-leak-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing video container with z-0
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: [outgoingVideo],
  };

  // Incoming video container with z-10
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
    childrenData: [incomingVideo],
  };

  // Root container with shake effect
  const rootContainer: RenderableComponentData = {
    id: 'warm-light-leak-transition-container',
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
        duration: baseLayoutDuration,
      },
    },
    effects: [
      // Horizontal shake effect during transition
      {
        id: 'shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['warm-light-leak-transition-container'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -shakeAmplitude, prog: 0.25 },
            { key: 'translateX', val: shakeAmplitude, prog: 0.5 },
            { key: 'translateX', val: -shakeAmplitude * 0.67, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      lightLeakOverlay,
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
  id: 'warm-light-leak-transition',
  title: 'Warm Analogue Light Leak Transition',
  description:
    'Vintage film burning transition effect with warm orange-white overexposure, horizontal shake simulating film gate movement, and expanding radial gradient light leak overlay. Creates a 1.5-second cross-fade between two videos with synchronized burn effects and light leak expansion from center.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vintage',
    'film',
    'burn',
    'light-leak',
    'analogue',
    'warm',
    'shake',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 1.5,
    burnBrightness: 2.5,
    burnContrast: 0.3,
    burnSaturate: 1.8,
    shakeAmplitude: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const warmLightLeakTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
