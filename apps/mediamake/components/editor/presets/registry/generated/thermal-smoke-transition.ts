/**
 * Thermal Smoke Transition Preset
 *
 * A 2.4-second thermal smoke transition that simulates heat haze and smoke between videos.
 * Features heat-like warping with compound transform effects (scaleX/scaleY oscillations, 
 * translateY shimmer), progressive blur with oscillation, sepia warmth filters, and 
 * turbulence simulation through rapid keyframe intervals.
 *
 * Technical Implementation:
 * - 2.4-second overlap between outgoing and incoming videos
 * - Outgoing video: scaleX oscillating (1, 1.02, 0.98, 1), translateY shimmer (-2px, 3px, -1px, 2px, 0),
 *   opacity 1→0, blur 0→16px with oscillation, sepia 0%→40% for warmth
 * - Incoming video: inverse scale pattern, translateY shimmer (2px, -3px, 1px, -2px, 0),
 *   opacity 0→1, blur 20px→0, sepia 40%→0%
 * - Both videos: contrast reduction to 70% at midpoint
 * - Rapid keyframe intervals (every 0.1-0.25s progress) for shimmer effect with linear easing
 *
 * Use Cases:
 * - Creating heat-based transitions between video clips
 * - Simulating environmental effects (smoke, haze, thermal distortion)
 * - Adding dramatic, atmospheric transitions to video sequences
 * - Creating cinematic effects for action, explosion, or heat-themed content
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
    src: z.string().describe('Source URL of first video'),
    duration: z.number().describe('Duration of first video in seconds'),
  }).describe('First video (outgoing) configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of second video'),
    duration: z.number().describe('Duration of second video in seconds'),
  }).describe('Second video (incoming) configuration'),
  transitionDuration: z
    .number()
    .default(2.4)
    .describe('Duration of the thermal transition overlap in seconds'),
  fit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .describe('How videos should fit within the container'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, fit } = params;

  // Calculate total duration (sum of video durations minus overlap)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate timing for incoming video (starts before outgoing ends)
  const incomingStart = video1.duration - transitionDuration;

  // Create outgoing video with thermal effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      fit: fit,
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Opacity fade out (1 → 0)
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Blur with oscillation (0 → 8 → 12 → 8 → 16)
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 8, prog: 0.3 },
            { key: 'blur', val: 12, prog: 0.5 },
            { key: 'blur', val: 8, prog: 0.7 },
            { key: 'blur', val: 16, prog: 1 },
          ],
        },
      },
      // Sepia warmth (0% → 40%)
      {
        id: 'outgoing-sepia',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'sepia', val: 0, prog: 0 },
            { key: 'sepia', val: 40, prog: 1 },
          ],
        },
      },
      // Contrast reduction (100% → 70% → 70%)
      {
        id: 'outgoing-contrast',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'contrast', val: 100, prog: 0 },
            { key: 'contrast', val: 70, prog: 0.5 },
            { key: 'contrast', val: 70, prog: 1 },
          ],
        },
      },
      // ScaleX oscillation (1, 1.02, 0.98, 1.01, 1)
      {
        id: 'outgoing-scaleX',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.02, prog: 0.25 },
            { key: 'scaleX', val: 0.98, prog: 0.5 },
            { key: 'scaleX', val: 1.01, prog: 0.75 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      // ScaleY oscillation (1, 1.01, 0.99, 1.02, 0.98, 1)
      {
        id: 'outgoing-scaleY',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 1.01, prog: 0.2 },
            { key: 'scaleY', val: 0.99, prog: 0.4 },
            { key: 'scaleY', val: 1.02, prog: 0.6 },
            { key: 'scaleY', val: 0.98, prog: 0.8 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
      // TranslateY shimmer (-2px, 3px, -1px, 2px, -2px, 0)
      {
        id: 'outgoing-translateY',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateY', val: -2, prog: 0 },
            { key: 'translateY', val: 3, prog: 0.2 },
            { key: 'translateY', val: -1, prog: 0.4 },
            { key: 'translateY', val: 2, prog: 0.6 },
            { key: 'translateY', val: -2, prog: 0.8 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video with inverse thermal effects
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      fit: fit,
    },
    context: {
      timing: {
        start: incomingStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      // Opacity fade in (0 → 1)
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'linear',
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
      // Blur reduction (20px → 12 → 8 → 4 → 0)
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'blur', val: 20, prog: 0 },
            { key: 'blur', val: 12, prog: 0.3 },
            { key: 'blur', val: 8, prog: 0.5 },
            { key: 'blur', val: 4, prog: 0.7 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
      // Sepia reduction (40% → 0%)
      {
        id: 'incoming-sepia',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'sepia', val: 40, prog: 0 },
            { key: 'sepia', val: 0, prog: 1 },
          ],
        },
      },
      // Contrast restoration (70% → 70% → 100%)
      {
        id: 'incoming-contrast',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'contrast', val: 70, prog: 0 },
            { key: 'contrast', val: 70, prog: 0.5 },
            { key: 'contrast', val: 100, prog: 1 },
          ],
        },
      },
      // ScaleX inverse pattern (1, 0.98, 1.02, 0.99, 1)
      {
        id: 'incoming-scaleX',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 0.98, prog: 0.25 },
            { key: 'scaleX', val: 1.02, prog: 0.5 },
            { key: 'scaleX', val: 0.99, prog: 0.75 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      // ScaleY inverse pattern (1, 0.99, 1.01, 0.98, 1.02, 1)
      {
        id: 'incoming-scaleY',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.99, prog: 0.2 },
            { key: 'scaleY', val: 1.01, prog: 0.4 },
            { key: 'scaleY', val: 0.98, prog: 0.6 },
            { key: 'scaleY', val: 1.02, prog: 0.8 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
      // TranslateY inverse shimmer (2px, -3px, 1px, -2px, 1px, 0)
      {
        id: 'incoming-translateY',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateY', val: 2, prog: 0 },
            { key: 'translateY', val: -3, prog: 0.2 },
            { key: 'translateY', val: 1, prog: 0.4 },
            { key: 'translateY', val: -2, prog: 0.6 },
            { key: 'translateY', val: 1, prog: 0.8 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'thermal-smoke-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo],
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
  id: 'thermal-smoke-transition',
  title: 'Thermal Smoke Transition',
  description:
    'A 2.4-second thermal smoke transition with heat haze simulation, shimmer effects, and color temperature shifts between videos. Features compound transform effects (scaleX/scaleY oscillations, translateY shimmer), progressive blur with oscillation, sepia warmth filters, and turbulence simulation through rapid keyframe intervals. Both videos undergo inverse warping patterns with contrast reduction at midpoint for realistic heat distortion effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'thermal',
    'smoke',
    'heat',
    'haze',
    'warping',
    'distortion',
    'shimmer',
    'video',
    'cinematic',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2.4,
    fit: 'cover',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const thermalSmokeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};