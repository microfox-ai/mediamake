/**
 * Prismatic Solarization Transition Preset
 *
 * Creates a stunning chromatic aberration effect combined with solarization during video transitions.
 * The outgoing video's RGB channels separate horizontally (red shifts left, blue shifts right, green
 * stays center) while each channel inverts at different rates. The incoming video's channels converge
 * from these separated positions with inverse colors normalizing. Each channel has subtle rotation
 * for dynamic movement.
 *
 * Features:
 * - RGB channel separation with independent transforms
 * - Staggered color inversion (solarization effect)
 * - Horizontal translation (red left, blue right, green center)
 * - Subtle rotation on each channel (-2° to +2°)
 * - Smooth convergence of incoming video channels
 * - 1-second overlap period for transition
 * - Mix blend mode (screen) for proper channel compositing
 *
 * Use cases:
 * - Creating psychedelic video transitions
 * - Adding retro VHS/glitch aesthetics
 * - Building chromatic aberration effects
 * - Artistic music video transitions
 * - Experimental visual storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of incoming video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of transition overlap in seconds (default: 1.0)'),
  channelSeparation: z
    .number()
    .default(30)
    .describe('Distance in pixels for channel separation (default: 30)'),
  rotationAmount: z
    .number()
    .default(2)
    .describe('Rotation amount in degrees for channels (default: 2)'),
  greenInversionDelay: z
    .number()
    .default(0.2)
    .describe('Delay in seconds for green channel inversion (default: 0.2)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    channelSeparation,
    rotationAmount,
    greenInversionDelay,
  } = params;

  // Calculate base layout duration (sum minus overlap)
  const baseLayoutDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Calculate when incoming video starts (during overlap)
  const incomingStartTime = outgoingVideoDuration - transitionDuration;

  // Green channel inversion duration (adjusted for delay)
  const greenInversionDuration = transitionDuration - greenInversionDelay;

  // Create outgoing video layer with RGB channel separation
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [
      // Red channel (shifts left, rotates counter-clockwise)
      {
        id: 'outgoing-red-channel',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
          },
          fit: 'cover',
          muted: true,
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-red-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingVideoDuration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-red-channel'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: -channelSeparation, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: -rotationAmount, prog: 1 },
                { key: 'filter:invert', val: 0, prog: 0 },
                { key: 'filter:invert', val: 100, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Green channel (stays center, delayed inversion)
      {
        id: 'outgoing-green-channel',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
          },
          fit: 'cover',
          muted: true,
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-green-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start:
                outgoingVideoDuration -
                transitionDuration +
                greenInversionDelay,
              duration: greenInversionDuration,
              mode: 'provider',
              targetIds: ['outgoing-green-channel'],
              ranges: [
                { key: 'filter:invert', val: 0, prog: 0 },
                { key: 'filter:invert', val: 100, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Blue channel (shifts right, rotates clockwise)
      {
        id: 'outgoing-blue-channel',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
          },
          fit: 'cover',
          muted: true,
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-blue-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingVideoDuration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-blue-channel'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: channelSeparation, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotationAmount, prog: 1 },
                { key: 'filter:invert', val: 0, prog: 0 },
                { key: 'filter:invert', val: 100, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'outgoing-layer-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideoDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video layer with RGB channel convergence
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full',
        style: {},
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    childrenData: [
      // Red channel (converges from left)
      {
        id: 'incoming-red-channel',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
          },
          fit: 'cover',
          muted: true,
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-red-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-red-channel'],
              ranges: [
                { key: 'translateX', val: -channelSeparation, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'rotate', val: -rotationAmount, prog: 0 },
                { key: 'rotate', val: 0, prog: 1 },
                { key: 'filter:invert', val: 100, prog: 0 },
                { key: 'filter:invert', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Green channel (converges from center with delayed normalization)
      {
        id: 'incoming-green-channel',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
          },
          fit: 'cover',
          muted: true,
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-green-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: greenInversionDelay,
              duration: greenInversionDuration,
              mode: 'provider',
              targetIds: ['incoming-green-channel'],
              ranges: [
                { key: 'filter:invert', val: 100, prog: 0 },
                { key: 'filter:invert', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Blue channel (converges from right)
      {
        id: 'incoming-blue-channel',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
          },
          fit: 'cover',
          muted: true,
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-blue-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-blue-channel'],
              ranges: [
                { key: 'translateX', val: channelSeparation, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'rotate', val: rotationAmount, prog: 0 },
                { key: 'rotate', val: 0, prog: 1 },
                { key: 'filter:invert', val: 100, prog: 0 },
                { key: 'filter:invert', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'incoming-layer-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-solarization-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingVideoLayer, incomingVideoLayer],
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
  id: 'prismatic-solarization-transition',
  title: 'Prismatic Solarization Transition',
  description:
    'A prismatic solarization transition effect where RGB channels of outgoing and incoming videos separate horizontally with independent inversion and rotation. Red shifts left, blue shifts right, green stays center, creating a chromatic aberration effect combined with solarization during a 1-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'prismatic',
    'solarization',
    'rgb',
    'chromatic-aberration',
    'glitch',
    'psychedelic',
    'artistic',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 1.0,
    channelSeparation: 30,
    rotationAmount: 2,
    greenInversionDelay: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismaticSolarizationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
