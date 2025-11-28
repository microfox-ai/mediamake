/**
 * Mechanical Iris Transition Preset
 *
 * A vintage projector-inspired iris transition featuring circular clip-path animations.
 * The outgoing video closes via an iris effect (100% to 0% radius) while the incoming
 * video opens (0% to 100% radius), with a bright white flash occurring at the moment
 * the iris is fully closed. Creates a smooth mechanical feel reminiscent of classic
 * film projector aperture mechanisms.
 *
 * Features:
 * - Circular iris closing/opening animations using clip-path
 * - Bright white flash at iris fully closed point (0.4s mark)
 * - Precise mechanical timing (0.5s total overlap)
 * - Smooth ease-in/ease-out animations for authentic mechanical feel
 * - Center point of circles at 50% 50%
 * - Total transition duration: 0.5s overlap between videos
 *
 * Use cases:
 * - Creating vintage film projector-style transitions
 * - Building cinematic scene transitions
 * - Adding retro mechanical effects to video montages
 * - Creating dramatic reveal/hide effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z
      .enum(['video', 'image'])
      .default('video')
      .describe('Media type (video or image)'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z
      .enum(['video', 'image'])
      .default('video')
      .describe('Media type (video or image)'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.5)
    .describe('Total duration of the iris transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate timing parameters
  const irisCloseDuration = 0.4; // Outgoing iris closes over 0.4s
  const irisOpenStart = 0.3; // Incoming iris starts opening at 0.3s
  const irisOpenDuration = 0.4; // Incoming iris opens over 0.4s
  const flashStart = 0.4; // Flash occurs at 0.4s (iris fully closed)
  const flashDuration = 0.1; // Flash lasts 0.1s

  // BaseLayout duration = sum of video durations minus overlap
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Determine component IDs based on media type
  const outgoingComponentId =
    outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  const childrenData: RenderableComponentData[] = [
    // Outgoing video with iris closing animation
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: 'iris-close-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingVideo.duration - irisCloseDuration,
            duration: irisCloseDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              {
                key: 'clipPath',
                val: 'circle(100% at 50% 50%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'circle(0% at 50% 50%)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video with iris opening animation
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration + irisOpenStart,
          duration: incomingVideo.duration + (transitionDuration - irisOpenStart),
        },
      },
      effects: [
        {
          id: 'iris-open-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: irisOpenDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              {
                key: 'clipPath',
                val: 'circle(0% at 50% 50%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'circle(100% at 50% 50%)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Flash overlay (white flash at iris fully closed moment)
    {
      id: 'flash-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          style: {
            position: 'absolute',
            inset: 0,
            backgroundColor: '#ffffff',
            zIndex: 40,
            opacity: 0,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        {
          id: 'flash-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingVideo.duration - transitionDuration + flashStart,
            duration: flashDuration,
            mode: 'provider',
            targetIds: ['flash-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'mechanical-iris-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
  id: 'mechanical-iris-transition',
  title: 'Mechanical Iris Transition',
  description:
    'A vintage projector-inspired iris transition featuring circular clip-path animations. The outgoing video closes via an iris effect (100% to 0% radius) while the incoming video opens (0% to 100% radius), with a bright white flash occurring at the moment the iris is fully closed. Creates a smooth mechanical feel reminiscent of classic film projector aperture mechanisms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'iris',
    'mechanical',
    'vintage',
    'projector',
    'circular',
    'clip-path',
    'flash',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 3,
    },
    transitionDuration: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const mechanicalIrisTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
