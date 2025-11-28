/**
 * Watercolor Ink Bleed Transition Preset
 *
 * This preset creates an organic watercolor ink bleeding effect between two videos.
 * The incoming video appears to 'bleed' through the outgoing video like liquid ink spreading on wet paper.
 *
 * Features:
 * - **Organic Mask Animation**: Multiple circular masks expand from random points to create liquid spreading effect
 * - **Desaturation & Blur**: Outgoing video gradually desaturates and blurs (blur(4px)) during transition
 * - **Color Shift**: Incoming video experiences subtle hue-rotation to simulate watercolor mixing
 * - **Breathing Effect**: Both videos scale (1.0 → 1.05) to mimic paper absorbing water
 * - **Smooth Bezier Curves**: CSS animations use smooth easing for organic liquid effect
 * - **2-Second Overlap**: Configurable transition overlap period
 *
 * Use cases:
 * - Creating organic, artistic transitions between video clips
 * - Simulating watercolor/ink bleeding effects in video montages
 * - Adding unique, hand-crafted feel to video transitions
 * - Building artistic video sequences with natural flow
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
      src: z.string().describe('Source URL of the first (outgoing) video'),
      duration: z
        .number()
        .describe('Duration of the first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second (incoming) video'),
      duration: z
        .number()
        .describe('Duration of the second video in seconds'),
    })
    .describe('Second video configuration'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate container duration (video1 + video2 - overlap)
  const containerDuration =
    video1.duration + video2.duration - transitionDuration;

  // Timing calculations
  const outgoingVideoStart = 0;
  const outgoingVideoDuration = video1.duration;
  const outgoingEffectStart = video1.duration - transitionDuration;

  const incomingVideoStart = video1.duration - transitionDuration;
  const incomingVideoDuration = video2.duration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video (video1)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: outgoingVideoStart,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        // Opacity: 1 → 0.3
        {
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
        // Blur: 0 → 4px
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 1 },
            ],
          },
        },
        // Saturation: 1 → 0.3
        {
          id: 'outgoing-saturate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'saturate(1)', prog: 0 },
              { key: 'filter', val: 'saturate(0.3)', prog: 1 },
            ],
          },
        },
        // Scale: 1 → 1.05
        {
          id: 'outgoing-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.05, prog: 1 },
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
        style: {
          zIndex: 2,
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: incomingVideoDuration,
        },
      },
      effects: [
        // Opacity: 0 → 1
        {
          id: 'incoming-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
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
        // Clip-path animation (simulating circular mask expansion)
        // Using multiple circle keyframes to simulate organic bleeding
        {
          id: 'incoming-clippath-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              // Start with small circles at random positions
              {
                key: 'clipPath',
                val: 'circle(0% at 30% 40%), circle(0% at 70% 60%), circle(0% at 50% 80%)',
                prog: 0,
              },
              // Mid-transition: circles expanding
              {
                key: 'clipPath',
                val: 'circle(40% at 30% 40%), circle(35% at 70% 60%), circle(38% at 50% 80%)',
                prog: 0.5,
              },
              // End: circles merge and fill screen
              {
                key: 'clipPath',
                val: 'circle(70% at 30% 40%), circle(65% at 70% 60%), circle(68% at 50% 80%)',
                prog: 1,
              },
            ],
          },
        },
        // Hue-rotate: 0deg → 20deg → 0deg (simulating color mixing)
        {
          id: 'incoming-hue-rotate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
              { key: 'filter', val: 'hue-rotate(20deg)', prog: 0.5 },
              { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
            ],
          },
        },
        // Scale: 1.05 → 1 (breathing effect)
        {
          id: 'incoming-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: 1.05, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'watercolor-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
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
  id: 'watercolor-ink-bleed-transition',
  title: 'Watercolor Ink Bleed Transition',
  description:
    'Organic watercolor ink bleeding transition between two videos with expanding circular mask patterns, desaturation, blur, hue-rotation, and breathing scale animations',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'watercolor', 'ink', 'organic', 'artistic', 'mask'],
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

export const watercolorInkBleedTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
