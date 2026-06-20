/**
 * Circular Iris Wipe Transition Preset
 *
 * This preset creates a classic film-style iris wipe transition that starts as a small circle
 * in the center and expands outward to reveal the incoming video. The transition features:
 * - Expanding circular reveal from center point
 * - Subtle white border (2px) with glowing effect
 * - Complementary zoom effects (zoom-in on incoming, zoom-out on outgoing)
 * - Soft vignette effects that fade during transition
 * - 1.2-second transition duration
 * - Black background container
 *
 * The preset handles two video sources and creates a smooth, cinematic transition between them.
 * All timing is carefully calculated to ensure proper overlap and synchronization.
 *
 * Use cases:
 * - Creating classic film-style transitions
 * - Mimicking vintage cinema effects
 * - Professional video transitions with elegant reveals
 * - Story transitions with dramatic circular wipes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video (outgoing video)'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video (incoming video)'),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the iris wipe transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration (overlap reduces total time)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Transition starts this many seconds before video1 ends
  const transitionStartTime = video1.duration - transitionDuration;

  // Build the composition structure
  const childrenData: RenderableComponentData[] = [
    // Outgoing video with zoom-out effect and vignette
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 z-10',
          style: {
            transformOrigin: 'center center',
          },
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
          id: 'outgoing-zoom-out',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: [
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: 0.95, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
        {
          id: 'outgoing-vignette',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.6) 100%);"></div>',
            className: 'absolute inset-0 pointer-events-none',
            style: {
              opacity: 0,
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
              id: 'vignette-fade-in',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: transitionStartTime,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-vignette'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.8, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Iris mask container (circular reveal)
    {
      id: 'iris-mask-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute z-20',
          style: {
            top: '50%',
            left: '50%',
            width: '150vmax',
            height: '150vmax',
            transform: 'translate(-50%, -50%) scale(0)',
            transformOrigin: 'center center',
            borderRadius: '50%',
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'iris-expand',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['iris-mask-container'],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'incoming-video-wrapper',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute',
              style: {
                top: '50%',
                left: '50%',
                width: '100vw',
                height: '100vh',
                transform: 'translate(-50%, -50%)',
                transformOrigin: 'center center',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
          effects: [
            {
              id: 'incoming-zoom-in',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video-wrapper'],
                ranges: [
                  { key: 'scale', val: 1.0, prog: 0 },
                  { key: 'scale', val: 1.05, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'incoming-video',
              type: 'atom',
              componentId: 'VideoAtom',
              data: {
                src: video2.src,
                fit: 'cover',
                className: 'w-full h-full object-cover',
                style: {
                  transformOrigin: 'center center',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: video2.duration + transitionDuration,
                },
              },
            } as RenderableComponentData,
            {
              id: 'incoming-vignette',
              type: 'atom',
              componentId: 'HTMLBlockAtom',
              data: {
                html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.6) 100%);"></div>',
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  opacity: 0.8,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: video2.duration + transitionDuration,
                },
              },
              effects: [
                {
                  id: 'incoming-vignette-fade-out',
                  componentId: 'generic',
                  data: {
                    type: 'ease-out',
                    start: 0,
                    duration: transitionDuration,
                    mode: 'provider',
                    targetIds: ['incoming-vignette'],
                    ranges: [
                      { key: 'opacity', val: 0.8, prog: 0 },
                      { key: 'opacity', val: 0, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Iris border ring (glowing white border)
    {
      id: 'iris-border-ring',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px 2px rgba(255,255,255,0.5), 0 0 16px 4px rgba(255,255,255,0.3);"></div>',
        className: 'absolute z-30 pointer-events-none',
        style: {
          top: '50%',
          left: '50%',
          width: '150vmax',
          height: '150vmax',
          transform: 'translate(-50%, -50%) scale(0)',
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'border-expand',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['iris-border-ring'],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'circular-iris-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'circular-iris-wipe-transition',
  title: 'Circular Iris Wipe Transition',
  description:
    'A classic film-style iris wipe transition that reveals the incoming video through an expanding circle from the center. Features a glowing white border ring, complementary zoom effects on both videos (zoom-out on outgoing, zoom-in on incoming), and vignette effects that draw focus to the transition point. The 1.2-second transition uses scale transforms for smooth animations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'iris', 'wipe', 'circular', 'classic', 'film', 'vintage'],
  defaultInputParams: {
    video1: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 5,
    },
    transitionDuration: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const circularIrisWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
