/**
 * Double Exposure Screen Blend Transition Preset
 *
 * This preset creates a cinematic double exposure transition between two images using blend modes.
 * The transition features a 1.5-second overlap period where:
 * - Outgoing image maintains full opacity with 'screen' blend mode and brightness boost (1.2)
 * - Incoming image fades in from opacity 0 to 1 underneath with 'multiply' blend mode
 * 
 * Features:
 * - 1.5-second overlap transition period
 * - Screen blend mode on outgoing image (z-index: 20)
 * - Multiply blend mode on incoming image (z-index: 10)
 * - Brightness boost (1.2) on outgoing image during transition
 * - Smooth ease-in-out opacity transitions
 * - Absolute positioning with 'inset-0 object-cover'
 * - Target dimensions: 1280x720 (YouTube thumbnail)
 * - Duration: image1.duration + image2.duration - 1.5s overlap
 * 
 * Use cases:
 * - Film-inspired double exposure mashups
 * - Cinematic image transitions
 * - Creative photo blending effects
 * - Artistic visual storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) image'),
    duration: z.number().describe('Duration of the first image in seconds'),
  }).describe('First image (outgoing) with screen blend mode'),
  image2: z.object({
    src: z.string().describe('Source URL of the second (incoming) image'),
    duration: z.number().describe('Duration of the second image in seconds'),
  }).describe('Second image (incoming) with multiply blend mode'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the overlap transition in seconds (default: 1.5)'),
  brightnessBoost: z
    .number()
    .default(1.2)
    .min(1)
    .max(2)
    .describe('Brightness boost applied to outgoing image during transition (default: 1.2)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, transitionDuration, brightnessBoost } = params;

  // Calculate total duration: sum of both image durations minus overlap
  const totalDuration = image1.duration + image2.duration - transitionDuration;

  // Outgoing image: extends by 0.75s to accommodate the full 1.5s overlap
  // (starts at relative 0, ends 0.75s into image2's territory)
  const outgoingDuration = image1.duration + 0.75;

  // Incoming image: starts 0.75s before the outgoing image ends (creating 1.5s overlap)
  // and extends by 0.75s
  const incomingStart = image1.duration - 0.75;
  const incomingDuration = image2.duration + 0.75;

  // Transition effects start time (last 1.5s of outgoing image)
  const outgoingTransitionStart = outgoingDuration - transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing image (screen blend mode, z-index: 20)
    {
      id: 'outgoing-img',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 20,
          mixBlendMode: 'screen',
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
        // Opacity fade: maintains 1 for most of duration, then fades to 0 in last 1.5s
        {
          id: 'outgoing-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingTransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-img'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.01 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Brightness boost during transition (maintains 1.2 throughout most of transition, then returns to 1)
        {
          id: 'outgoing-brightness',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingTransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-img'],
            ranges: [
              { key: 'filter:brightness', val: brightnessBoost, prog: 0 },
              { key: 'filter:brightness', val: brightnessBoost, prog: 0.5 },
              { key: 'filter:brightness', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming image (multiply blend mode, z-index: 10)
    {
      id: 'incoming-img',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 10,
          mixBlendMode: 'multiply',
          width: '100%',
          height: '100%',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: [
        // Opacity fade in: starts at 0, animates to 1 over 1.5s
        {
          id: 'incoming-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming image start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-img'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'double-exposure-screen-blend-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
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
  id: 'double-exposure-screen-blend-transition',
  title: 'Double Exposure Screen Blend Transition',
  description:
    'A cinematic double exposure transition preset that layers two images with screen and multiply blend modes. Features 1.5-second overlap with outgoing image using screen blend + brightness boost, incoming image using multiply blend fading in underneath. Smooth ease-in-out opacity transitions create a film-inspired mashup effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'double-exposure', 'blend-mode', 'cinematic', 'image'],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1280&h=720&fit=crop',
      duration: 5,
    },
    transitionDuration: 1.5,
    brightnessBoost: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const doubleExposureScreenBlendTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
