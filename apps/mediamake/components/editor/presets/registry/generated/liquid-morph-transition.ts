/**
 * Liquid Morph Transition Preset
 *
 * This preset creates a fluid morphing transition between two videos using synchronized
 * scale and border-radius animations. The outgoing video shrinks into a bubble while
 * the incoming video expands from a centered circle, creating an organic liquid-like
 * motion effect with synchronized opacity fades and subtle position drift.
 *
 * Features:
 * - **Liquid Bubble Effect**: Outgoing video shrinks with border-radius animation to 50%
 * - **Circle Expansion**: Incoming video expands from a small centered circle
 * - **Synchronized Opacity**: Both videos fade in/out during transition
 * - **Position Drift**: Organic movement with opposite-direction drift during scaling
 * - **Smooth Easing**: cubic-bezier(0.4, 0, 0.2, 1) for organic motion
 * - **2.2s Overlap**: Configurable transition duration with proper overlap timing
 *
 * Use cases:
 * - Creating fluid video transitions between clips
 * - Organic morphing effects for video montages
 * - Dynamic scene changes with liquid-like motion
 * - Modern video editing with advanced shape transitions
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
      duration: z.number().describe('Duration of the outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of the incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration: sum of video durations minus overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Outgoing video plays from 0 to video1.duration
  const outgoingStart = 0;
  const outgoingDuration = video1.duration;

  // Incoming video starts before outgoing ends (to create overlap)
  const incomingStart = video1.duration - transitionDuration;
  const incomingDuration = video2.duration + transitionDuration;

  // Effect timings relative to each video's start
  const outgoingEffectStart = video1.duration - transitionDuration;
  const incomingEffectStart = 0;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 overflow-hidden',
          style: {
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: outgoingDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full',
            style: {
              width: '100%',
              height: '100%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
          effects: [
            {
              id: 'outgoing-morph-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: outgoingEffectStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  // Border-radius: 0% → 50%
                  { key: 'borderRadius', val: '0%', prog: 0 },
                  { key: 'borderRadius', val: '50%', prog: 1 },
                  // Scale: 1 → 0.3
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0.3, prog: 1 },
                  // TranslateX: 0 → 10%
                  { key: 'translateX', val: '0%', prog: 0 },
                  { key: 'translateX', val: '10%', prog: 1 },
                  // TranslateY: 0 → -10%
                  { key: 'translateY', val: '0%', prog: 0 },
                  { key: 'translateY', val: '-10%', prog: 1 },
                  // Opacity: 1 → 0
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    // Incoming video container
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 overflow-hidden flex items-center justify-center',
          style: {
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full',
            style: {
              width: '100%',
              height: '100%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration,
            },
          },
          effects: [
            {
              id: 'incoming-morph-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: incomingEffectStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  // Border-radius: 50% → 0%
                  { key: 'borderRadius', val: '50%', prog: 0 },
                  { key: 'borderRadius', val: '0%', prog: 1 },
                  // Scale: 0.3 → 1
                  { key: 'scale', val: 0.3, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                  // TranslateX: 0 → -10%
                  { key: 'translateX', val: '0%', prog: 0 },
                  { key: 'translateX', val: '-10%', prog: 1 },
                  // TranslateY: 0 → 10%
                  { key: 'translateY', val: '0%', prog: 0 },
                  { key: 'translateY', val: '10%', prog: 1 },
                  // Opacity: 0 → 1
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#000000',
        },
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
  id: 'liquid-morph-transition',
  title: 'Liquid Morph Transition',
  description:
    'A fluid morphing transition between two videos using scale and border-radius animations. The outgoing video shrinks into a bubble while the incoming video expands from a centered circle, creating an organic liquid-like motion effect with synchronized opacity fades and position drift.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'liquid', 'morph', 'video', 'fluid', 'bubble', 'organic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
