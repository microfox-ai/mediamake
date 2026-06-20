/**
 * Facial Blend Soft Transition Preset
 *
 * A smooth, gentle cross-dissolve transition optimized for talking head videos and facial content.
 * This transition emphasizes smooth, gentle cross-dissolves that work well when transitioning 
 * between similar subjects (like interview cuts or vlog segments).
 *
 * Features:
 * - **Long Overlap Period**: 1.0-1.5 seconds for soft blending
 * - **Custom Ease Curves**: Hold-then-drop for outgoing, rise-then-hold for incoming
 * - **Subtle Scale Animation**: Gentle 'breathing' motion (outgoing to 1.02, incoming from 0.98)
 * - **Brightness Adjustment**: +5% brightness boost during transition to mask blend point
 * - **No Blur**: Maintains facial clarity throughout transition
 * - **Morph Cut Illusion**: Creates seamless morph-cut effect without facial tracking
 *
 * Technical Implementation:
 * - Outgoing media: opacity holds then drops (ease-in), scales to 1.02
 * - Incoming media: opacity rises then holds (ease-out), scales from 0.98
 * - Both atoms: absolute positioning with object-fit cover
 * - Brightness effect: subtle +5% boost during overlap
 * - Z-index layering: incoming above outgoing
 *
 * Use cases:
 * - Interview cut transitions
 * - Vlog segment changes
 * - Talking head video editing
 * - Multi-angle conversation cuts
 * - Confessional-style content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of outgoing video'),
      startFrom: z.number().optional().describe('Start time in seconds'),
      endAt: z.number().optional().describe('End time in seconds'),
      volume: z.number().min(0).max(1).optional().describe('Volume level (0-1)'),
      muted: z.boolean().optional().describe('Mute video audio'),
    })
    .describe('Outgoing video configuration'),

  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of incoming video'),
      startFrom: z.number().optional().describe('Start time in seconds'),
      endAt: z.number().optional().describe('End time in seconds'),
      volume: z.number().min(0).max(1).optional().describe('Volume level (0-1)'),
      muted: z.boolean().optional().describe('Mute video audio'),
    })
    .describe('Incoming video configuration'),

  outgoingDuration: z
    .number()
    .positive()
    .describe('Duration of outgoing video in seconds'),

  incomingDuration: z
    .number()
    .positive()
    .describe('Duration of incoming video in seconds'),

  overlapDuration: z
    .number()
    .min(1.0)
    .max(1.5)
    .default(1.25)
    .describe('Overlap duration for soft blending (1.0-1.5 seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    outgoingDuration,
    incomingDuration,
    overlapDuration,
  } = params;

  // Calculate timing
  const incomingStartOffset = outgoingDuration - overlapDuration;

  // Outgoing video container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          className: 'absolute inset-0',
          fit: 'cover' as const,
          startFrom: outgoingVideo.startFrom ?? 0,
          endAt: outgoingVideo.endAt,
          volume: outgoingVideo.volume ?? 1,
          muted: outgoingVideo.muted ?? false,
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          // Opacity effect: holds visibility longer (1,1,0.3,0) then drops - ease-in behavior
          {
            id: 'outgoing-opacity-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in' as const,
              start: outgoingDuration - overlapDuration,
              duration: overlapDuration,
              mode: 'provider' as const,
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0.3, prog: 0.9 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Scale effect: subtle scale from 1 to 1.02 creating gentle breathing/expansion motion
          {
            id: 'outgoing-scale-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out' as const,
              start: outgoingDuration - overlapDuration,
              duration: overlapDuration,
              mode: 'provider' as const,
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.02, prog: 1 },
              ],
            },
          },
          // Brightness effect: boost from 1 to 1.05 during overlap, masking blend point
          {
            id: 'outgoing-brightness-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out' as const,
              start: outgoingDuration - overlapDuration,
              duration: overlapDuration,
              mode: 'provider' as const,
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'brightness', val: 1, prog: 0 },
                { key: 'brightness', val: 1.05, prog: 0.5 },
                { key: 'brightness', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: incomingStartOffset,
        duration: incomingDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          className: 'absolute inset-0',
          fit: 'cover' as const,
          startFrom: incomingVideo.startFrom ?? 0,
          endAt: incomingVideo.endAt,
          volume: incomingVideo.volume ?? 1,
          muted: incomingVideo.muted ?? false,
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
        effects: [
          // Opacity effect: rises quickly then holds (0,0.7,1,1) - ease-out behavior
          {
            id: 'incoming-opacity-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out' as const,
              start: 0,
              duration: overlapDuration,
              mode: 'provider' as const,
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          // Scale effect: subtle scale from 0.98 to 1 creating gentle breathing/contraction motion
          {
            id: 'incoming-scale-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in' as const,
              start: 0,
              duration: overlapDuration,
              mode: 'provider' as const,
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'scale', val: 0.98, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
          // Brightness effect: boost from 1 to 1.05 then back to 1 during overlap
          {
            id: 'incoming-brightness-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out' as const,
              start: 0,
              duration: overlapDuration,
              mode: 'provider' as const,
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'brightness', val: 1, prog: 0 },
                { key: 'brightness', val: 1.05, prog: 0.5 },
                { key: 'brightness', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'facial-blend-soft-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration + incomingDuration - overlapDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'facial-blend-soft-transition',
  title: 'Facial Blend Soft Transition',
  description:
    'A smooth, gentle cross-dissolve transition optimized for talking head videos and facial content. Features longer overlap period (1.0-1.5s), custom ease curves (hold-then-drop for outgoing, rise-then-hold for incoming), subtle breathing scale animation (outgoing to 1.02, incoming from 0.98), and brightness boost (+5%) during transition. No blur to maintain facial clarity. Creates morph-cut illusion without facial tracking.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'facial', 'talking-head', 'soft', 'morph-cut', 'interview'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/interview-shot-1.mp4',
      volume: 1,
      muted: false,
    },
    incomingVideo: {
      src: 'https://example.com/interview-shot-2.mp4',
      volume: 1,
      muted: false,
    },
    outgoingDuration: 10,
    incomingDuration: 10,
    overlapDuration: 1.25,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const facialBlendSoftTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
