/**
 * Dramatic Diagonal Slide Transition with Ken Burns Zoom
 *
 * Creates a parallax-like transition between two videos with diagonal sliding motion,
 * Ken Burns zoom effects, blur animations, and subtle rotation. Features staggered
 * timing where the incoming video begins moving 0.3s before the outgoing video starts
 * its exit animation.
 *
 * Key Features:
 * - Diagonal slide transition (outgoing: bottom-right, incoming: top-left)
 * - Ken Burns zoom (outgoing: 100%→120%, incoming: 130%→100%)
 * - Progressive blur (0→3px on exit, 3px→0 on entrance)
 * - Subtle rotation (-5deg on exit, 5deg→0 on entrance)
 * - Staggered timing with 1.5s overlap (incoming starts 0.3s before outgoing exits)
 * - Overflow-hidden container to clip sliding videos
 *
 * Use Cases:
 * - Creating dynamic video transitions with depth
 * - Building cinematic parallax effects between clips
 * - Adding professional motion to video montages
 * - Creating visually engaging video sequences
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
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
  staggerDelay: z
    .number()
    .default(0.3)
    .describe(
      'Time (seconds) before outgoing video exits that incoming video starts entering',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, staggerDelay } = params;

  // Calculate timing
  // Total duration = video1.duration + video2.duration - (transitionDuration + staggerDelay)
  // This accounts for the overlap period where both videos are visible
  const totalOverlap = transitionDuration + staggerDelay;
  const baseLayoutDuration = video1.duration + video2.duration - totalOverlap;

  // Incoming video starts at: video1.duration - totalOverlap
  const incomingStartTime = video1.duration - totalOverlap;

  // Outgoing video exit animation starts at: video1.duration - transitionDuration
  const outgoingExitStart = video1.duration - transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing Video (video1)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 object-cover w-full h-full',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Transform animation: translate, scale, rotate
        {
          id: 'outgoing-transform',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingExitStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              // Diagonal slide to bottom-right
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: 100, prog: 1, unit: '%' },
              { key: 'translateY', val: 0, prog: 0, unit: '%' },
              { key: 'translateY', val: 100, prog: 1, unit: '%' },
              // Ken Burns zoom out
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.2, prog: 1 },
              // Subtle rotation
              { key: 'rotate', val: 0, prog: 0, unit: 'deg' },
              { key: 'rotate', val: -5, prog: 1, unit: 'deg' },
            ],
          },
        },
        // Blur animation
        {
          id: 'outgoing-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingExitStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'blur', val: 0, prog: 0, unit: 'px' },
              { key: 'blur', val: 3, prog: 1, unit: 'px' },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming Video (video2)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 object-cover w-full h-full',
        fit: 'cover',
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: video2.duration + totalOverlap,
        },
      },
      effects: [
        // Transform animation: translate, scale, rotate
        {
          id: 'incoming-transform',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0, // Relative to incoming video start
            duration: transitionDuration + staggerDelay,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              // Diagonal slide from top-left
              { key: 'translateX', val: -100, prog: 0, unit: '%' },
              { key: 'translateX', val: 0, prog: 1, unit: '%' },
              { key: 'translateY', val: -100, prog: 0, unit: '%' },
              { key: 'translateY', val: 0, prog: 1, unit: '%' },
              // Ken Burns zoom in
              { key: 'scale', val: 1.3, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Subtle rotation
              { key: 'rotate', val: 5, prog: 0, unit: 'deg' },
              { key: 'rotate', val: 0, prog: 1, unit: 'deg' },
            ],
          },
        },
        // Blur animation
        {
          id: 'incoming-blur',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0, // Relative to incoming video start
            duration: transitionDuration + staggerDelay,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'blur', val: 3, prog: 0, unit: 'px' },
              { key: 'blur', val: 0, prog: 1, unit: 'px' },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'diagonal-slide-ken-burns-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
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
  id: 'diagonal-slide-ken-burns-transition',
  title: 'Dramatic Diagonal Slide with Ken Burns Zoom',
  description:
    'Creates a parallax-like transition between two videos with diagonal sliding, Ken Burns zoom effects, blur animations, and subtle rotation. Features staggered timing with 0.3s overlap for smooth handoff between videos.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'diagonal',
    'slide',
    'ken-burns',
    'zoom',
    'parallax',
    'blur',
    'rotation',
    'cinematic',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.5,
    staggerDelay: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const diagonalSlideKenBurnsTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
