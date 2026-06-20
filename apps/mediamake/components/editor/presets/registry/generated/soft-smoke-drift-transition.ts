/**
 * Soft Smoke Drift Transition Preset
 *
 * Creates a peaceful fog-like transition where videos drift upward like smoke particles
 * with subtle horizontal oscillation, opacity fade, blur, and contrast adjustments.
 * Features 2-second overlap with organic floating motion and foggy atmosphere effects.
 *
 * Features:
 * - Outgoing video drifts upward (translateY: 0 → -10%) with dissipating effect
 * - Incoming video emerges from below (translateY: 5% → 0) materializing from fog
 * - Subtle horizontal drift simulating air currents (translateX oscillation)
 * - Progressive blur effects (0→18px outgoing, 22px→0 incoming)
 * - Contrast reduction during transition (100%→60%→100%) for foggy atmosphere
 * - Gentle rotation for organic movement (-1deg to 1deg)
 * - Smooth easeInOutSine easing for peaceful floating motion
 *
 * Use cases:
 * - Creating peaceful video transitions with smoke-like effects
 * - Building atmospheric transitions for nature/meditation content
 * - Adding organic movement to video sequences
 * - Creating fog/mist-themed transitions
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
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total composition duration (with overlap)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Outgoing video: Drifts upward and fades out
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Vertical drift upward
      {
        id: 'outgoing-drift-y',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0, unit: '%' },
            { key: 'translateY', val: -10, prog: 1, unit: '%' },
          ],
        },
      },
      // Horizontal oscillation (simulating air currents)
      {
        id: 'outgoing-drift-x',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateX', val: -2, prog: 0, unit: 'px' },
            { key: 'translateX', val: 2, prog: 0.33, unit: 'px' },
            { key: 'translateX', val: -1, prog: 0.66, unit: 'px' },
            { key: 'translateX', val: 0, prog: 1, unit: 'px' },
          ],
        },
      },
      // Subtle rotation for organic movement
      {
        id: 'outgoing-rotate',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0, unit: 'deg' },
            { key: 'rotate', val: 1, prog: 0.5, unit: 'deg' },
            { key: 'rotate', val: -1, prog: 1, unit: 'deg' },
          ],
        },
      },
      // Opacity fade out
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
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
      // Blur (smoke dissipating)
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(18px)', prog: 1 },
          ],
        },
      },
      // Contrast reduction (foggy atmosphere)
      {
        id: 'outgoing-contrast',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'contrast', val: 100, prog: 0, unit: '%' },
            { key: 'contrast', val: 60, prog: 1, unit: '%' },
          ],
        },
      },
    ],
  };

  // Incoming video: Emerges from below and materializes
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      // Vertical drift (emerge from below)
      {
        id: 'incoming-drift-y',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateY', val: 5, prog: 0, unit: '%' },
            { key: 'translateY', val: 0, prog: 1, unit: '%' },
          ],
        },
      },
      // Horizontal drift
      {
        id: 'incoming-drift-x',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateX', val: 1, prog: 0, unit: 'px' },
            { key: 'translateX', val: -2, prog: 0.5, unit: 'px' },
            { key: 'translateX', val: 0, prog: 1, unit: 'px' },
          ],
        },
      },
      // Subtle rotation
      {
        id: 'incoming-rotate',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'rotate', val: -1, prog: 0, unit: 'deg' },
            { key: 'rotate', val: 1, prog: 0.5, unit: 'deg' },
            { key: 'rotate', val: 0, prog: 1, unit: 'deg' },
          ],
        },
      },
      // Opacity fade in
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
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
      // Blur (materializing from fog)
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'blur(22px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Contrast adjustment
      {
        id: 'incoming-contrast',
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'contrast', val: 60, prog: 0, unit: '%' },
            { key: 'contrast', val: 100, prog: 1, unit: '%' },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'soft-smoke-drift-container',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'soft-smoke-drift-transition',
  title: 'Soft Smoke Drift Transition',
  description:
    'A peaceful fog-like transition where videos drift upward like smoke particles with subtle horizontal oscillation, opacity fade, blur, and contrast adjustments. Features 2-second overlap with organic floating motion and foggy atmosphere effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'smoke',
    'fog',
    'drift',
    'atmospheric',
    'peaceful',
    'organic',
    'blur',
    'float',
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
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const softSmokeDriftTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
