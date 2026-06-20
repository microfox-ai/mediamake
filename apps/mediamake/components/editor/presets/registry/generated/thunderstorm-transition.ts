/**
 * Thunderstorm Lightning Transition Preset
 *
 * Creates a dramatic thunderstorm-inspired video transition with multiple lightning flash patterns,
 * high-contrast reveals, dynamic shadows, and atmospheric blue-white color grading.
 *
 * Features:
 * - **Multiple Flash Patterns**: Quick successive flashes (close lightning) and longer rumbling flashes (distant lightning)
 * - **Dynamic Reveals**: Incoming video revealed with high contrast and overexposure during flashes
 * - **Silhouette Effects**: Outgoing video darkens into dramatic silhouette during flashes
 * - **Shifting Shadows**: Shadow directions change with each flash simulating different lightning positions
 * - **Atmospheric Color**: Blue-white color cast during flashes, deep blue-black tones between
 * - **Intensity Variations**: Rumbling flash with dynamic intensity variations
 *
 * Lightning sequence timing:
 * - 0.0s-0.3s: Quick flash (close lightning)
 * - 0.3s-0.4s: Dark period
 * - 0.4s-0.7s: Double flash sequence
 * - 0.7s-1.2s: Dark period
 * - 1.2s-1.6s: Long rumbling flash with intensity variations
 * - 1.6s-2.0s: Final fade to dark
 *
 * Use cases:
 * - Dramatic scene transitions between video clips
 * - Weather-themed video content
 * - High-energy transitions for action sequences
 * - Creating tension or dramatic reveals in storytelling
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
    startFrom: z
      .number()
      .optional()
      .describe('Start time in seconds for outgoing video playback'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z
      .number()
      .optional()
      .describe('Start time in seconds for incoming video playback'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Total duration of the transition in seconds'),
  flashIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Intensity of lightning flashes (0.1 to 1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, flashIntensity } =
    params;

  // Lightning flash timing configuration
  const flash1Start = 0;
  const flash1Duration = 0.3;
  const dark1Start = 0.3;
  const dark1Duration = 0.1;
  const flash2Start = 0.4;
  const flash2Duration = 0.3;
  const dark2Start = 0.7;
  const dark2Duration = 0.5;
  const flash3Start = 1.2;
  const flash3Duration = 0.4;
  const fadeOutStart = 1.6;
  const fadeOutDuration = 0.4;

  // Calculate flash opacity based on intensity
  const maxFlashOpacity = Math.min(0.3 * (flashIntensity / 0.3), 0.5);

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            startFrom: outgoingVideo.startFrom || 0,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Flash 1: Quick fade to dark silhouette
            {
              id: 'outgoing-flash-1',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: flash1Start,
                duration: flash1Duration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.2, prog: 0.5 },
                  { key: 'opacity', val: 1, prog: 1 },
                  {
                    key: 'filter',
                    val: 'brightness(100%) contrast(100%)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(20%) contrast(200%) hue-rotate(220deg)',
                    prog: 0.5,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(100%) contrast(100%)',
                    prog: 1,
                  },
                  { key: 'rotate', val: '0deg', prog: 0 },
                  { key: 'rotate', val: '-1deg', prog: 0.5 },
                  { key: 'rotate', val: '0deg', prog: 1 },
                ],
              },
            },
            // Dark period 1
            {
              id: 'outgoing-dark-1',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: dark1Start,
                duration: dark1Duration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  {
                    key: 'filter',
                    val: 'brightness(30%) hue-rotate(220deg)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(30%) hue-rotate(220deg)',
                    prog: 1,
                  },
                ],
              },
            },
            // Flash 2: Double flash pattern
            {
              id: 'outgoing-flash-2',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: flash2Start,
                duration: flash2Duration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.2, prog: 0.2 },
                  { key: 'opacity', val: 1, prog: 0.3 },
                  { key: 'opacity', val: 0.2, prog: 0.6 },
                  { key: 'opacity', val: 1, prog: 1 },
                  {
                    key: 'filter',
                    val: 'brightness(100%) contrast(100%)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(20%) contrast(200%) hue-rotate(220deg)',
                    prog: 0.2,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(100%) contrast(100%)',
                    prog: 0.3,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(20%) contrast(200%) hue-rotate(220deg)',
                    prog: 0.6,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(100%) contrast(100%)',
                    prog: 1,
                  },
                  { key: 'rotate', val: '0deg', prog: 0 },
                  { key: 'rotate', val: '1deg', prog: 0.2 },
                  { key: 'rotate', val: '0deg', prog: 0.3 },
                  { key: 'rotate', val: '-1deg', prog: 0.6 },
                  { key: 'rotate', val: '0deg', prog: 1 },
                ],
              },
            },
            // Dark period 2
            {
              id: 'outgoing-dark-2',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: dark2Start,
                duration: dark2Duration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  {
                    key: 'filter',
                    val: 'brightness(30%) hue-rotate(220deg)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(30%) hue-rotate(220deg)',
                    prog: 1,
                  },
                ],
              },
            },
            // Flash 3: Long rumbling flash
            {
              id: 'outgoing-flash-3',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: flash3Start,
                duration: flash3Duration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.15, prog: 0.3 },
                  { key: 'opacity', val: 0.25, prog: 0.5 },
                  { key: 'opacity', val: 0.15, prog: 0.7 },
                  { key: 'opacity', val: 0.2, prog: 1 },
                  {
                    key: 'filter',
                    val: 'brightness(100%) contrast(100%)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(15%) contrast(220%) hue-rotate(220deg)',
                    prog: 0.3,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(25%) contrast(200%) hue-rotate(220deg)',
                    prog: 0.5,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(15%) contrast(220%) hue-rotate(220deg)',
                    prog: 0.7,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(20%) contrast(210%) hue-rotate(220deg)',
                    prog: 1,
                  },
                  { key: 'rotate', val: '0deg', prog: 0 },
                  { key: 'rotate', val: '1deg', prog: 0.5 },
                  { key: 'rotate', val: '0deg', prog: 1 },
                ],
              },
            },
            // Final fade out
            {
              id: 'outgoing-fade-out',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: fadeOutStart,
                duration: fadeOutDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'opacity', val: 0.2, prog: 0 },
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
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            startFrom: incomingVideo.startFrom || 0,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Start hidden
            {
              id: 'incoming-initial',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: flash1Start,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [{ key: 'opacity', val: 0, prog: 0 }],
              },
            },
            // Flash 1: Quick reveal with overexposure
            {
              id: 'incoming-flash-1',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: flash1Start,
                duration: flash1Duration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                  {
                    key: 'filter',
                    val: 'brightness(200%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(150%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 0.5,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(200%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 1,
                  },
                  { key: 'rotate', val: '0deg', prog: 0 },
                  { key: 'rotate', val: '-1deg', prog: 0.5 },
                  { key: 'rotate', val: '0deg', prog: 1 },
                ],
              },
            },
            // Flash 2: Double flash reveal
            {
              id: 'incoming-flash-2',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: flash2Start,
                duration: flash2Duration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.2 },
                  { key: 'opacity', val: 0, prog: 0.3 },
                  { key: 'opacity', val: 1, prog: 0.6 },
                  { key: 'opacity', val: 0, prog: 1 },
                  {
                    key: 'filter',
                    val: 'brightness(200%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(150%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 0.2,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(200%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 0.3,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(150%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 0.6,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(200%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 1,
                  },
                  { key: 'rotate', val: '0deg', prog: 0 },
                  { key: 'rotate', val: '1deg', prog: 0.2 },
                  { key: 'rotate', val: '0deg', prog: 0.3 },
                  { key: 'rotate', val: '-1deg', prog: 0.6 },
                  { key: 'rotate', val: '0deg', prog: 1 },
                ],
              },
            },
            // Flash 3: Long rumbling reveal
            {
              id: 'incoming-flash-3',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: flash3Start,
                duration: flash3Duration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.3 },
                  { key: 'opacity', val: 0.8, prog: 0.5 },
                  { key: 'opacity', val: 1, prog: 0.7 },
                  { key: 'opacity', val: 0.9, prog: 1 },
                  {
                    key: 'filter',
                    val: 'brightness(200%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(160%) contrast(130%) saturate(80%) hue-rotate(-10deg)',
                    prog: 0.3,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(140%) contrast(120%) saturate(85%) hue-rotate(-8deg)',
                    prog: 0.5,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(150%) contrast(125%) saturate(85%) hue-rotate(-8deg)',
                    prog: 0.7,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(130%) contrast(115%) saturate(90%) hue-rotate(-5deg)',
                    prog: 1,
                  },
                  { key: 'rotate', val: '0deg', prog: 0 },
                  { key: 'rotate', val: '1deg', prog: 0.5 },
                  { key: 'rotate', val: '0deg', prog: 1 },
                ],
              },
            },
            // Final fade in to normal
            {
              id: 'incoming-fade-in',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: fadeOutStart,
                duration: fadeOutDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'opacity', val: 0.9, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                  {
                    key: 'filter',
                    val: 'brightness(130%) contrast(115%) saturate(90%) hue-rotate(-5deg)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'brightness(100%) contrast(100%) saturate(100%)',
                    prog: 1,
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Flash overlay 1 - Quick flash
    {
      id: 'flash-overlay-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div class='w-full h-full bg-white'></div>",
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: flash1Start,
          duration: flash1Duration,
        },
      },
      effects: [
        {
          id: 'flash-1-intensity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: flash1Duration,
            mode: 'provider',
            targetIds: ['flash-overlay-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: maxFlashOpacity, prog: 0.4 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Flash overlay 2 - Double flash
    {
      id: 'flash-overlay-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div class='w-full h-full bg-white'></div>",
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: flash2Start,
          duration: flash2Duration,
        },
      },
      effects: [
        {
          id: 'flash-2-intensity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: flash2Duration,
            mode: 'provider',
            targetIds: ['flash-overlay-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: maxFlashOpacity * 0.8, prog: 0.15 },
              { key: 'opacity', val: 0, prog: 0.25 },
              { key: 'opacity', val: maxFlashOpacity, prog: 0.55 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Flash overlay 3 - Long rumbling flash
    {
      id: 'flash-overlay-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div class='w-full h-full bg-white'></div>",
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: flash3Start,
          duration: flash3Duration,
        },
      },
      effects: [
        {
          id: 'flash-3-intensity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: flash3Duration,
            mode: 'provider',
            targetIds: ['flash-overlay-3'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: maxFlashOpacity * 0.7, prog: 0.2 },
              { key: 'opacity', val: maxFlashOpacity * 0.4, prog: 0.4 },
              { key: 'opacity', val: maxFlashOpacity * 0.6, prog: 0.6 },
              { key: 'opacity', val: maxFlashOpacity * 0.3, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'thunderstorm-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-950',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'thunderstorm-transition',
  title: 'Thunderstorm Lightning Transition',
  description:
    'Dramatic thunderstorm-inspired video transition with multiple lightning flash patterns, high-contrast reveals, dynamic shadows, and blue-white color grading. Features quick successive flashes like close lightning followed by rumbling distant flashes with intensity variations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'lightning',
    'thunderstorm',
    'dramatic',
    'weather',
    'flash',
    'reveal',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
    },
    transitionDuration: 2,
    flashIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const thunderstormTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
