/**
 * Directional Swish Vertical Transition Preset
 *
 * Ultra-fast vertical whip transition with motion blur streaks that creates a fast upward
 * whoosh movement between scenes. This variation moves vertically instead of horizontally -
 * outgoing media whooshes upward and out while incoming media enters from below.
 *
 * Features:
 * - 0.18-second ultra-fast overlap for maximum impact
 * - Vertical blur filter combined with translateY animation
 * - Subtle brightness flash at transition midpoint (brightness: 1.3)
 * - Slight rotation (2-3 degrees) in the direction of movement for dynamism
 * - Perfect for reveal moments, topic changes, or high-energy YouTube intros
 *
 * Technical Specifications:
 * - BaseLayout: 'absolute inset-0 overflow-hidden'
 * - Duration calculation: outgoingDuration + incomingDuration - 0.18s overlap
 * - Outgoing: translateY [0%, -110%] over 0.18s, blur [0, 15px] bell curve, rotate [-2deg, 0deg]
 * - Incoming: translateY [110%, 0%] synchronized, blur matching curve, rotate [2deg, 0deg]
 * - Brightness effect on container: [1, 1.3, 1] during overlap
 * - Both media use 'object-cover' for full frame
 * - Provider mode effects with separate targetIds
 * - Relative timing: incoming starts at outgoingDuration - 0.18s
 * - Easing: ease-out for outgoing departure, ease-in-out for incoming arrival
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
    src: z.string().describe('Source URL of outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  incomingMedia: z.object({
    src: z.string().describe('Source URL of incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.18)
    .describe('Duration of transition overlap in seconds (ultra-fast: 0.18s)'),
  brightnessFlashIntensity: z
    .number()
    .min(1)
    .max(2)
    .default(1.3)
    .describe('Brightness flash intensity at transition midpoint'),
  rotationDegrees: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Rotation degrees for dynamic movement (2-3 recommended)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(30)
    .default(15)
    .describe('Maximum blur intensity in pixels (peak at midpoint)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingMedia,
    incomingMedia,
    transitionDuration,
    brightnessFlashIntensity,
    rotationDegrees,
    blurIntensity,
  } = params;

  // Calculate BaseLayout duration with overlap
  const baseLayoutDuration =
    outgoingMedia.duration + incomingMedia.duration - transitionDuration;

  // Determine component IDs
  const outgoingComponentId =
    outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Timing calculations (relative to BaseLayout)
  const outgoingStart = 0;
  const outgoingDuration = outgoingMedia.duration;
  const outgoingEffectStart = outgoingDuration - transitionDuration; // Last 0.18s of outgoing

  const incomingStart = outgoingDuration - transitionDuration; // Starts 0.18s before outgoing ends
  const incomingDuration = incomingMedia.duration + transitionDuration; // Extended to include overlap

  const brightnessStart = incomingStart; // Brightness flash starts with incoming media
  const brightnessDuration = transitionDuration; // Lasts the full overlap

  const childrenData: RenderableComponentData[] = [
    // Outgoing media container
    {
      id: 'outgoing-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {},
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: outgoingDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-exit-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingEffectStart, // Relative to outgoing-container start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-container'],
            ranges: [
              // Vertical translation: 0% to -110% (whoosh upward)
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '-110%', prog: 1 },
              // Blur: 0 -> 15px -> 0 (bell curve)
              { key: 'filter:blur', val: 0, prog: 0, unit: 'px' },
              { key: 'filter:blur', val: blurIntensity, prog: 0.5, unit: 'px' },
              { key: 'filter:blur', val: 0, prog: 1, unit: 'px' },
              // Rotation: -2deg to 0deg
              { key: 'rotate', val: -rotationDegrees, prog: 0, unit: 'deg' },
              { key: 'rotate', val: 0, prog: 1, unit: 'deg' },
            ],
          },
        },
      ],
      childrenData: [
        // Outgoing media atom
        {
          id: 'outgoing-media',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingMedia.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          },
          context: {
            timing: {
              start: 0, // Relative to outgoing-container
              duration: outgoingDuration,
            },
          },
          effects: [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming media container
    {
      id: 'incoming-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {},
        },
      },
      context: {
        timing: {
          start: incomingStart, // Relative to BaseLayout (outgoingDuration - 0.18)
          duration: incomingDuration,
        },
      },
      effects: [
        {
          id: 'incoming-entrance-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming-container start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-container'],
            ranges: [
              // Vertical translation: 110% to 0% (enter from below)
              { key: 'translateY', val: '110%', prog: 0 },
              { key: 'translateY', val: '0%', prog: 1 },
              // Blur: 0 -> 15px -> 0 (bell curve)
              { key: 'filter:blur', val: 0, prog: 0, unit: 'px' },
              { key: 'filter:blur', val: blurIntensity, prog: 0.5, unit: 'px' },
              { key: 'filter:blur', val: 0, prog: 1, unit: 'px' },
              // Rotation: 2deg to 0deg
              { key: 'rotate', val: rotationDegrees, prog: 0, unit: 'deg' },
              { key: 'rotate', val: 0, prog: 1, unit: 'deg' },
            ],
          },
        },
      ],
      childrenData: [
        // Incoming media atom
        {
          id: 'incoming-media',
          type: 'atom',
          componentId: incomingComponentId,
          data: {
            src: incomingMedia.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          },
          context: {
            timing: {
              start: 0, // Relative to incoming-container
              duration: incomingMedia.duration,
            },
          },
          effects: [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Brightness flash overlay
    {
      id: 'brightness-flash',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
        className: 'absolute inset-0',
        style: {},
      },
      context: {
        timing: {
          start: brightnessStart, // Relative to BaseLayout (same as incomingStart)
          duration: brightnessDuration,
        },
      },
      effects: [
        {
          id: 'brightness-flash-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to brightness-flash start
            duration: brightnessDuration,
            mode: 'provider',
            targetIds: ['brightness-flash'],
            ranges: [
              // Brightness: 1 -> 1.3 -> 1 (flash at midpoint)
              { key: 'filter:brightness', val: 1, prog: 0 },
              { key: 'filter:brightness', val: brightnessFlashIntensity, prog: 0.5 },
              { key: 'filter:brightness', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'directional-swish-vertical-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {},
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
  id: 'directional-swish-vertical-transition',
  title: 'Directional Swish Vertical Transition',
  description:
    'Ultra-fast vertical whip transition with motion blur streaks, upward whoosh movement, and brightness flash at midpoint. Outgoing media exits upward (-110%) while incoming media enters from below (110%) with synchronized vertical blur, subtle rotation (2-3 degrees), and brightness boost (1.3) during the 0.18s overlap. Perfect for high-energy reveals, topic changes, and YouTube intros.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'directional',
    'swish',
    'vertical',
    'whip',
    'motion-blur',
    'fast',
    'upward',
    'whoosh',
    'brightness-flash',
    'rotation',
    'high-energy',
    'reveal',
    'youtube',
    'intro',
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
      duration: 3,
    },
    transitionDuration: 0.18,
    brightnessFlashIntensity: 1.3,
    rotationDegrees: 2,
    blurIntensity: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const directionalSwishVerticalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
