/**
 * Particle Burst Transition Preset
 *
 * This preset creates a dramatic 2.5-second video transition where the outgoing video
 * explodes into smoke particles that reform into the incoming video. It features:
 *
 * - **Explosive Dispersion**: Outgoing video scales up (1→1.5), rotates (0→5deg), fades out,
 *   and blurs heavily (0→40px) to simulate particle explosion.
 * - **Particle Reformation**: Incoming video starts blurred (50px) and rotated (-8deg),
 *   gradually resolving to focus and stability.
 * - **Brightness Illumination**: Midpoint brightness increases (100%→150%) to simulate
 *   particle glow, then fades to normal/black.
 * - **Depth-Based Blur**: Multiple blur stages create near (less blur) and far (more blur)
 *   particle depth perception.
 * - **Compound Transforms**: Scale, rotate, blur, brightness, and opacity all animate
 *   simultaneously for a complex, cinematic effect.
 *
 * Use cases:
 * - Dramatic scene transitions in action videos
 * - Music video cuts with explosive energy
 * - Title card transitions with impact
 * - Creative montages requiring visual intensity
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
      src: z.string().describe('Source URL of the outgoing video'),
      duration: z.number().describe('Duration of outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate BaseLayout duration (video1 + video2 - overlap)
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;

  // Outgoing video: explosion starts at (duration - 2.5s)
  const explosionStart = video1.duration - transitionDuration;

  // Brightness transitions: first half increases, second half decreases
  const brightnessHalfDuration = transitionDuration / 2;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video (explodes into particles)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Scale explosion (1 → 1.5)
        {
          id: 'explosive-scale',
          componentId: 'generic',
          data: {
            type: 'easeOutExpo',
            start: explosionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.5, prog: 1 },
            ],
          },
        },
        // Rotation explosion (0 → 5deg)
        {
          id: 'explosive-rotation',
          componentId: 'generic',
          data: {
            type: 'easeOutExpo',
            start: explosionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 5, prog: 1 },
            ],
          },
        },
        // Fade out (1 → 0)
        {
          id: 'explosive-fade',
          componentId: 'generic',
          data: {
            type: 'easeOutExpo',
            start: explosionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Blur explosion (0 → 40px) - particle dispersion depth
        {
          id: 'explosive-blur',
          componentId: 'generic',
          data: {
            type: 'easeOutExpo',
            start: explosionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'blur', val: 0, prog: 0 },
              { key: 'blur', val: 40, prog: 1 },
            ],
          },
        },
        // Brightness increase (100% → 150%) - particle illumination
        {
          id: 'explosive-brightness-up',
          componentId: 'generic',
          data: {
            type: 'easeOutExpo',
            start: explosionStart,
            duration: brightnessHalfDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'brightness', val: 100, prog: 0 },
              { key: 'brightness', val: 150, prog: 1 },
            ],
          },
        },
        // Brightness fade to black (150% → 0%)
        {
          id: 'explosive-brightness-down',
          componentId: 'generic',
          data: {
            type: 'easeOutExpo',
            start: explosionStart + brightnessHalfDuration,
            duration: brightnessHalfDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'brightness', val: 150, prog: 0 },
              { key: 'brightness', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming video (reforms from particles)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration, // Overlap starts
          duration: video2.duration,
        },
      },
      effects: [
        // Scale reformation (0.8 → 1)
        {
          id: 'reformation-scale',
          componentId: 'generic',
          data: {
            type: 'easeInExpo',
            start: 0, // Relative to incoming video start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Rotation stabilization (-8deg → 0deg)
        {
          id: 'reformation-rotation',
          componentId: 'generic',
          data: {
            type: 'easeInExpo',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'rotate', val: -8, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
        // Fade in (0 → 1)
        {
          id: 'reformation-fade',
          componentId: 'generic',
          data: {
            type: 'easeInExpo',
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
        // Blur resolution (50px → 0px) - particle focus depth
        {
          id: 'reformation-blur',
          componentId: 'generic',
          data: {
            type: 'easeInExpo',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'blur', val: 50, prog: 0 },
              { key: 'blur', val: 0, prog: 1 },
            ],
          },
        },
        // Brightness normalization (150% → 100%)
        {
          id: 'reformation-brightness',
          componentId: 'generic',
          data: {
            type: 'easeInExpo',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'brightness', val: 150, prog: 0 },
              { key: 'brightness', val: 100, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'particle-burst-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'particle-burst-transition',
  title: 'Particle Burst Transition',
  description:
    'Dramatic 2.5-second video transition where the outgoing video explodes into smoke particles that reform into the incoming video. Features compound transforms (scale, rotate, blur), brightness adjustments simulating particle illumination, and depth-based blur stages for near and far particles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'particle',
    'explosion',
    'dramatic',
    'cinematic',
    'smoke',
    'blur',
    'brightness',
    'compound',
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
    transitionDuration: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const particleBurstTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
