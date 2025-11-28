/**
 * Liquid Displacement Ripple Transition Preset
 *
 * This preset creates a sophisticated water surface distortion transition between two videos.
 * The transition simulates liquid displacement with ripples emanating from the center, where the
 * outgoing video appears disturbed by ripples while the incoming video emerges through the
 * liquid distortion.
 *
 * Features:
 * - 1.5 second overlap period with both videos visible
 * - Outgoing video: increasing blur (0 to 8px) with scale pulsing (1.0 → 1.05 → 0.95)
 * - Incoming video: heavy blur start (12px) with scale-down (1.2 → 1.0) and decreasing blur
 * - Subtle rotation effect (-2deg to 2deg) for enhanced liquid feel
 * - CSS filter blur and transform scale/rotate animations
 * - Cover object-fit with overflow-hidden container
 *
 * Use cases:
 * - Creating organic water-like transitions between video clips
 * - Building cinematic video sequences with liquid distortion effects
 * - Adding sophisticated visual transitions for storytelling
 * - Creating music video transitions with fluid motion
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
  }).describe('First video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  
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

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Timing calculations
  const video1Start = 0;
  const video1Duration = video1.duration;
  const video2Start = video1.duration - overlapDuration;
  const video2Duration = video2.duration;

  // Effect timing (relative to each video's start)
  const video1EffectStart = video1Duration - overlapDuration;
  const video2EffectStart = 0;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video (video1)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: video1Start,
          duration: video1Duration,
        },
      },
      effects: [
        // Opacity fade out
        {
          id: 'video1-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video1EffectStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Blur increase (0px to 8px)
        {
          id: 'video1-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video1EffectStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 0.5 },
              { key: 'filter', val: 'blur(8px)', prog: 1 },
            ],
          },
        },
        // Scale pulsing (1.0 → 1.05 → 0.95)
        {
          id: 'video1-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video1EffectStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: 1.05, prog: 0.4 },
              { key: 'scale', val: 0.95, prog: 1 },
            ],
          },
        },
        // Rotation (-2deg to 2deg)
        {
          id: 'video1-rotate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video1EffectStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: -2, prog: 0.3 },
              { key: 'rotate', val: 2, prog: 0.7 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Incoming video (video2)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: video2Start,
          duration: video2Duration,
        },
      },
      effects: [
        // Opacity fade in
        {
          id: 'video2-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video2EffectStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Blur decrease (12px to 0px)
        {
          id: 'video2-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video2EffectStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'blur(12px)', prog: 0 },
              { key: 'filter', val: 'blur(6px)', prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Scale down (1.2 to 1.0)
        {
          id: 'video2-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video2EffectStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: 1.2, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.3 },
              { key: 'scale', val: 1.0, prog: 1 },
            ],
          },
        },
        // Rotation (2deg to -2deg to 0deg)
        {
          id: 'video2-rotate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video2EffectStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'rotate', val: 2, prog: 0 },
              { key: 'rotate', val: -2, prog: 0.5 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'liquid-ripple-transition-container',
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
        duration: totalDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'liquid-ripple-transition',
  title: 'Liquid Displacement Ripple Transition',
  description:
    'A sophisticated video transition preset that simulates water surface distortion between two videos using CSS blur and transform animations. Features ripple emanation from center with scale pulsing and rotation effects to create an organic liquid feel during the 1.5 second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'liquid',
    'ripple',
    'water',
    'distortion',
    'blur',
    'scale',
    'rotation',
    'cinematic',
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
