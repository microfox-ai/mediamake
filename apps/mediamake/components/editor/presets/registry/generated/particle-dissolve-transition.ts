/**
 * Particle Dissolve Transition Preset
 *
 * This preset simulates a smoke fog dispersion effect between two video clips,
 * creating an atmospheric particle-dissolve transition. The outgoing video
 * gradually dissolves into particles with increasing blur and scale expansion,
 * while the incoming video emerges from a fog-like state with decreasing blur
 * and scale contraction.
 *
 * Features:
 * - **2-Second Overlap Period**: Both videos visible during transition
 * - **Atmospheric Effects**: Blur filters (0-20px outgoing, 30-0px incoming)
 * - **Opacity Animations**: Smooth fade transitions (1→0, 0→1)
 * - **Scale Transforms**: Subtle expansion/contraction (1→1.1, 0.95→1)
 * - **Absolute Positioning**: Both videos positioned absolutely with z-index layering
 *
 * Use cases:
 * - Creating smoke-like transitions between video clips
 * - Building atmospheric video montages
 * - Adding cinematic fog effects to transitions
 * - Professional video sequencing with particle-dissolve style
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
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap period in seconds'),
  outgoingBlurMax: z
    .number()
    .default(20)
    .describe('Maximum blur for outgoing video in pixels'),
  incomingBlurMax: z
    .number()
    .default(30)
    .describe('Maximum blur for incoming video in pixels (at start)'),
  outgoingScaleMax: z
    .number()
    .default(1.1)
    .describe('Maximum scale for outgoing video (expansion)'),
  incomingScaleMin: z
    .number()
    .default(0.95)
    .describe('Minimum scale for incoming video (at start)'),
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
    outgoingBlurMax,
    incomingBlurMax,
    outgoingScaleMax,
    incomingScaleMin,
  } = params;

  // Calculate total duration (subtract overlap to avoid extending total time)
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Outgoing video: full duration, effects in last 2 seconds
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 z-10',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Opacity fade out
      {
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Blur increase
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${outgoingBlurMax}px)`, prog: 1 },
          ],
        },
      },
      // Scale expansion
      {
        id: 'outgoing-scale-effect',
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: outgoingScaleMax, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video: starts at overlap point, effects in first 2 seconds
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 z-20',
      fit: 'cover',
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration,
        duration: video2.duration,
      },
    },
    effects: [
      // Opacity fade in
      {
        id: 'incoming-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Blur decrease
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: `blur(${incomingBlurMax}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Scale contraction
      {
        id: 'incoming-scale-effect',
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: incomingScaleMin, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with both videos
  const rootContainer: RenderableComponentData = {
    id: 'particle-dissolve-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoNode, incomingVideoNode],
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
  id: 'particle-dissolve-transition',
  title: 'Particle Dissolve Transition',
  description:
    'Simulates smoke fog dispersion between two video clips with particle-like dissolve effect. Uses 2-second overlap period with opacity, blur, and scale animations for atmospheric transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'particle', 'smoke', 'fog', 'dissolve', 'blur', 'atmospheric'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 2,
    outgoingBlurMax: 20,
    incomingBlurMax: 30,
    outgoingScaleMax: 1.1,
    incomingScaleMin: 0.95,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const particleDissolveTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
