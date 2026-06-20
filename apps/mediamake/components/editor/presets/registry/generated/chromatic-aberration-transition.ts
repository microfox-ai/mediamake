/**
 * Chromatic Aberration Light Leak Transition Preset
 *
 * This preset creates a stunning prismatic transition effect where RGB color channels
 * separate and drift apart during media switches, simulating light refraction through
 * a prism or damaged camera lens. The effect creates dramatic color fringing and lens
 * distortion as the outgoing media's RGB channels split and fade while the incoming
 * media's channels converge from separated positions.
 *
 * Features:
 * - RGB channel separation with independent movement for red, green, and blue
 * - Horizontal and vertical drift creating prismatic color fringing
 * - Lens distortion via rotation and scale transforms
 * - GPU-accelerated animations with will-change optimization
 * - Screen blend mode for authentic chromatic aberration effect
 * - Coordinated opacity animations across all channels
 * - 1-second overlap period for smooth transition
 *
 * Use cases:
 * - Creating glitch-style transitions between video clips
 * - Simulating analog camera lens effects
 * - Adding prismatic light leak aesthetics to video content
 * - Artistic transitions with chromatic aberration styling
 * - Music video transitions with optical distortion effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingMedia: z.object({
    src: z.string().describe('Source URL of the outgoing media'),
    type: z.enum(['image', 'video']).describe('Type of outgoing media'),
    duration: z.number().describe('Duration of outgoing media in seconds'),
  }),
  incomingMedia: z.object({
    src: z.string().describe('Source URL of the incoming media'),
    type: z.enum(['image', 'video']).describe('Type of incoming media'),
    duration: z.number().describe('Duration of incoming media in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the chromatic transition overlap in seconds'),
  channelSeparation: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .describe('Maximum pixel separation for RGB channels (default: 20px)'),
  rotationAmount: z
    .number()
    .min(0)
    .max(5)
    .default(1.5)
    .describe('Maximum rotation angle for lens distortion in degrees'),
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Maximum blur amount in pixels during separation'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingMedia,
    incomingMedia,
    overlapDuration,
    channelSeparation,
    rotationAmount,
    blurAmount,
  } = params;

  // Calculate total duration accounting for overlap
  const totalDuration =
    outgoingMedia.duration + incomingMedia.duration - overlapDuration;

  // Determine component IDs based on media type
  const outgoingComponentId =
    outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Base media style
  const mediaStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  };

  // RGB channel overlay style with screen blend mode
  const channelStyle = {
    ...mediaStyle,
    mixBlendMode: 'screen' as const,
    willChange: 'transform, opacity, filter',
  };

  const childrenData: RenderableComponentData[] = [
    // ============================================
    // OUTGOING MEDIA CONTAINER
    // ============================================
    {
      id: 'outgoing-media-container',
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
          duration: outgoingMedia.duration,
        },
      },
      childrenData: [
        // Base outgoing media (fades out during transition)
        {
          id: 'outgoing-media-base',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingMedia.src,
            style: mediaStyle,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingMedia.duration,
            },
          },
          effects: [
            {
              id: 'outgoing-base-fade',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: outgoingMedia.duration - overlapDuration,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['outgoing-media-base'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Red channel (separates left and up)
        {
          id: 'outgoing-red-channel',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingMedia.src,
            style: {
              ...channelStyle,
              filter: 'brightness(1) contrast(1.2) drop-shadow(0 0 10px rgba(255, 0, 0, 0.8))',
            },
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingMedia.duration,
            },
          },
          effects: [
            {
              id: 'outgoing-red-separation',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: outgoingMedia.duration - overlapDuration,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['outgoing-red-channel'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: -channelSeparation * 0.75, prog: 0.5 },
                  { key: 'translateX', val: -channelSeparation, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: -channelSeparation * 0.15, prog: 1 },
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: -rotationAmount, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'blur', val: 0, prog: 0 },
                  { key: 'blur', val: blurAmount, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Green channel (stays mostly centered with slight vertical drift)
        {
          id: 'outgoing-green-channel',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingMedia.src,
            style: {
              ...channelStyle,
              filter: 'brightness(1) contrast(1.2) drop-shadow(0 0 10px rgba(0, 255, 0, 0.8))',
            },
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingMedia.duration,
            },
          },
          effects: [
            {
              id: 'outgoing-green-separation',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: outgoingMedia.duration - overlapDuration,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['outgoing-green-channel'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: channelSeparation * 0.1, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'blur', val: 0, prog: 0 },
                  { key: 'blur', val: blurAmount * 0.75, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Blue channel (separates right and down)
        {
          id: 'outgoing-blue-channel',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingMedia.src,
            style: {
              ...channelStyle,
              filter: 'brightness(1) contrast(1.2) drop-shadow(0 0 10px rgba(0, 0, 255, 0.8))',
            },
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingMedia.duration,
            },
          },
          effects: [
            {
              id: 'outgoing-blue-separation',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: outgoingMedia.duration - overlapDuration,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['outgoing-blue-channel'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: channelSeparation * 0.75, prog: 0.5 },
                  { key: 'translateX', val: channelSeparation, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: channelSeparation * 0.15, prog: 1 },
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: rotationAmount, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'blur', val: 0, prog: 0 },
                  { key: 'blur', val: blurAmount, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // ============================================
    // INCOMING MEDIA CONTAINER
    // ============================================
    {
      id: 'incoming-media-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: outgoingMedia.duration - overlapDuration,
          duration: incomingMedia.duration + overlapDuration,
        },
      },
      childrenData: [
        // Base incoming media (fades in during transition)
        {
          id: 'incoming-media-base',
          type: 'atom',
          componentId: incomingComponentId,
          data: {
            src: incomingMedia.src,
            style: mediaStyle,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingMedia.duration + overlapDuration,
            },
          },
          effects: [
            {
              id: 'incoming-base-fade',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['incoming-media-base'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Red channel (converges from left and up)
        {
          id: 'incoming-red-channel',
          type: 'atom',
          componentId: incomingComponentId,
          data: {
            src: incomingMedia.src,
            style: {
              ...channelStyle,
              filter: 'brightness(1) contrast(1.2) drop-shadow(0 0 10px rgba(255, 0, 0, 0.8))',
            },
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingMedia.duration + overlapDuration,
            },
          },
          effects: [
            {
              id: 'incoming-red-convergence',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['incoming-red-channel'],
                ranges: [
                  { key: 'translateX', val: -channelSeparation, prog: 0 },
                  { key: 'translateX', val: -channelSeparation * 0.75, prog: 0.5 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'translateY', val: -channelSeparation * 0.15, prog: 0 },
                  { key: 'translateY', val: 0, prog: 1 },
                  { key: 'rotate', val: -rotationAmount, prog: 0 },
                  { key: 'rotate', val: 0, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                  { key: 'blur', val: blurAmount, prog: 0 },
                  { key: 'blur', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Green channel (converges from slight vertical offset)
        {
          id: 'incoming-green-channel',
          type: 'atom',
          componentId: incomingComponentId,
          data: {
            src: incomingMedia.src,
            style: {
              ...channelStyle,
              filter: 'brightness(1) contrast(1.2) drop-shadow(0 0 10px rgba(0, 255, 0, 0.8))',
            },
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingMedia.duration + overlapDuration,
            },
          },
          effects: [
            {
              id: 'incoming-green-convergence',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['incoming-green-channel'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'translateY', val: channelSeparation * 0.1, prog: 0 },
                  { key: 'translateY', val: 0, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                  { key: 'blur', val: blurAmount * 0.75, prog: 0 },
                  { key: 'blur', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Blue channel (converges from right and down)
        {
          id: 'incoming-blue-channel',
          type: 'atom',
          componentId: incomingComponentId,
          data: {
            src: incomingMedia.src,
            style: {
              ...channelStyle,
              filter: 'brightness(1) contrast(1.2) drop-shadow(0 0 10px rgba(0, 0, 255, 0.8))',
            },
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingMedia.duration + overlapDuration,
            },
          },
          effects: [
            {
              id: 'incoming-blue-convergence',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['incoming-blue-channel'],
                ranges: [
                  { key: 'translateX', val: channelSeparation, prog: 0 },
                  { key: 'translateX', val: channelSeparation * 0.75, prog: 0.5 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'translateY', val: channelSeparation * 0.15, prog: 0 },
                  { key: 'translateY', val: 0, prog: 1 },
                  { key: 'rotate', val: rotationAmount, prog: 0 },
                  { key: 'rotate', val: 0, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                  { key: 'blur', val: blurAmount, prog: 0 },
                  { key: 'blur', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'chromatic-aberration-transition-root',
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
  id: 'chromatic-aberration-transition',
  title: 'Chromatic Aberration Light Leak Transition',
  description:
    'A prismatic RGB channel separation transition effect that creates chromatic aberration and lens flare effects during media switches. RGB color channels separate horizontally creating color fringing, with lens distortion via scale and rotation transforms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'chromatic',
    'aberration',
    'rgb',
    'prism',
    'lens',
    'glitch',
    'light-leak',
    'optical',
  ],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    overlapDuration: 1.0,
    channelSeparation: 20,
    rotationAmount: 1.5,
    blurAmount: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const chromaticAberrationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};