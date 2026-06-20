/**
 * Motion Smear Crossfade Transition Preset
 *
 * This preset creates a hybrid transition combining the speed of a whip pan with a brief crossfade moment.
 * Unlike pure slide transitions, this keeps both media briefly visible at the midpoint while heavily motion-blurred.
 *
 * Features:
 * - 0.25-second overlap with 3-phase transition:
 *   1. First 0.1s: Outgoing starts sliding and blurring
 *   2. Middle 0.05s: Both visible but extremely blurred (abstract smear)
 *   3. Final 0.1s: Incoming sharpens while completing slide-in
 * - Horizontal blur values up to 30px at peak
 * - Saturation boost during blur phase for vibrant color smearing
 * - Film-like dreamy quality while maintaining whip pan energy
 *
 * Use cases:
 * - Music videos
 * - Travel montages
 * - Aesthetic YouTube content
 * - High-energy visual sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingMedia: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media configuration'),
  incomingMedia: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(0.25)
    .describe('Duration of transition overlap in seconds (0.25s recommended)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingMedia, incomingMedia, transitionDuration } = params;

  // Calculate BaseLayout duration (sum minus overlap)
  const baseLayoutDuration =
    outgoingMedia.duration + incomingMedia.duration - transitionDuration;

  // Determine component IDs based on media type
  const outgoingComponentId =
    outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Transition timing
  const outgoingBlurStart = outgoingMedia.duration - transitionDuration;
  const incomingStart = outgoingMedia.duration - transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing media wrapper
    {
      id: 'outgoing-media-wrapper',
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
          duration: outgoingMedia.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-media',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingMedia.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingMedia.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Opacity effect: 1 → 0.7 → 0
        {
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingBlurStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media-wrapper'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 }, // 0% (start)
              { key: 'opacity', val: 0.7, prog: 0.4 }, // 40% (0.1s)
              { key: 'opacity', val: 0, prog: 1 }, // 100% (0.25s)
            ],
          },
        },
        // TranslateX effect: 0% → -60%
        {
          id: 'outgoing-translateX-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingBlurStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media-wrapper'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-60%', prog: 1 },
            ],
          },
        },
        // Blur effect: 0 → 30px (peak at 40-60%)
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingBlurStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media-wrapper'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(30px)', prog: 0.4 }, // 40%
              { key: 'filter', val: 'blur(30px)', prog: 0.6 }, // 60% (peak)
              { key: 'filter', val: 'blur(30px)', prog: 1 },
            ],
          },
        },
        // Saturate effect: 1 → 1.4 → 1 (bell curve)
        {
          id: 'outgoing-saturate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingBlurStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media-wrapper'],
            ranges: [
              { key: 'saturate', val: 1, prog: 0 },
              { key: 'saturate', val: 1.4, prog: 0.5 }, // Peak at midpoint
              { key: 'saturate', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming media wrapper
    {
      id: 'incoming-media-wrapper',
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
          start: incomingStart,
          duration: incomingMedia.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-media',
          type: 'atom',
          componentId: incomingComponentId,
          data: {
            src: incomingMedia.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingMedia.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Opacity effect: 0 → 0.7 → 1
        {
          id: 'incoming-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media-wrapper'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 }, // 0%
              { key: 'opacity', val: 0.7, prog: 0.6 }, // 60% (0.15s)
              { key: 'opacity', val: 1, prog: 1 }, // 100%
            ],
          },
        },
        // TranslateX effect: 60% → 0%
        {
          id: 'incoming-translateX-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media-wrapper'],
            ranges: [
              { key: 'translateX', val: '60%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
            ],
          },
        },
        // Blur effect: 30px → 0 (sharpen at 60-100%)
        {
          id: 'incoming-blur-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media-wrapper'],
            ranges: [
              { key: 'filter', val: 'blur(30px)', prog: 0 },
              { key: 'filter', val: 'blur(30px)', prog: 0.4 }, // 40%
              { key: 'filter', val: 'blur(30px)', prog: 0.6 }, // 60% (peak)
              { key: 'filter', val: 'blur(0px)', prog: 1 }, // Sharpen
            ],
          },
        },
        // Saturate effect: 1 → 1.4 → 1 (bell curve)
        {
          id: 'incoming-saturate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media-wrapper'],
            ranges: [
              { key: 'saturate', val: 1, prog: 0 },
              { key: 'saturate', val: 1.4, prog: 0.5 }, // Peak at midpoint
              { key: 'saturate', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'motion-smear-crossfade-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
  id: 'motion-smear-crossfade-transition',
  title: 'Motion Smear Crossfade Transition',
  description:
    'Hybrid transition combining whip pan speed with crossfade dreaminess. Both media briefly visible at midpoint with extreme blur (up to 30px), creating abstract color smearing. Features horizontal slide motion, saturation boost during blur phase, and film-like quality. Perfect for music videos, travel montages, and aesthetic content. 0.25s overlap with synchronized blur, opacity, and position effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'motion',
    'smear',
    'crossfade',
    'whip-pan',
    'blur',
    'saturation',
    'music-video',
    'travel',
    'aesthetic',
  ],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    transitionDuration: 0.25,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const motionSmearCrossfadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
