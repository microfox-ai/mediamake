/**
 * Liquid Ripple Displacement Transition Preset
 *
 * This preset creates a water distortion transition effect between two videos using CSS filters,
 * blur effects, and scale transforms to simulate liquid ripples. The outgoing video appears to
 * liquify and ripple outward from the center while the incoming video emerges through the ripples.
 *
 * Features:
 * - **Liquid Distortion Effects**: CSS blur and scale transforms create water-like distortion
 * - **1.5-Second Overlap**: Smooth transition period where both videos are visible
 * - **Ripple Animation**: Sinusoidal horizontal translation simulates wave movement
 * - **Scale Pulsation**: Outgoing video scales from 1.0 → 1.05 → 0.95 for organic effect
 * - **Heavy Blur Start**: Incoming video starts with 30px blur, animates to normal
 * - **Z-Index Layering**: Incoming video layers above outgoing during transition
 *
 * Use cases:
 * - Creating water-themed transitions between video clips
 * - Simulating liquid displacement effects
 * - Adding organic, flowing transitions to video content
 * - Creating dream-like or underwater transition sequences
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
      src: z.string().describe('Source URL of the first video (outgoing)'),
      duration: z
        .number()
        .describe('Duration of the first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second video (incoming)'),
      duration: z
        .number()
        .describe('Duration of the second video in seconds'),
    })
    .describe('Second video configuration'),
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap period in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate when incoming video starts (overlaps with outgoing)
  const incomingStart = video1.duration - overlapDuration;

  // Calculate when outgoing effect starts
  const outgoingEffectStart = video1.duration - overlapDuration;

  // Outgoing video with liquid ripple effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 10,
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
        id: 'outgoing-liquid-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          cubicBezier: [0.45, 0.05, 0.55, 0.95],
          start: outgoingEffectStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            // Blur increase (0px to 20px)
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 20, prog: 1 },
            // Scale pulsation (1.0 → 1.05 → 0.95)
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.05, prog: 0.5 },
            { key: 'scale', val: 0.95, prog: 1 },
            // Sinusoidal horizontal translation for wave effect
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -10, prog: 0.25 },
            { key: 'translateX', val: 10, prog: 0.5 },
            { key: 'translateX', val: -10, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video with liquid emergence effects
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: video2.duration,
      },
    },
    effects: [
      {
        id: 'incoming-liquid-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Heavy blur to normal (30px to 0px)
            { key: 'blur', val: 30, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
            // Scale up from 0.8 to 1.0
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container holding both videos
  const rootContainer: RenderableComponentData = {
    id: 'liquid-ripple-transition-container',
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
  id: 'liquid-ripple-transition',
  title: 'Liquid Ripple Displacement Transition',
  description:
    'A water distortion transition preset that creates liquid ripple effects between two videos with CSS blur, scale transforms, and sinusoidal horizontal translation. Uses a 1.5-second overlap period where the outgoing video liquifies and ripples outward while the incoming video emerges through the ripples.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'liquid', 'ripple', 'water', 'displacement', 'blur'],
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
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidRippleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
