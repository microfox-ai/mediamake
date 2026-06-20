/**
 * Gallery Push Transition Preset
 *
 * This preset creates a Pinterest-style gallery push transition where media items slide vertically
 * like scrolling through a feed. The outgoing media slides up and scales down to 0.85, while the
 * incoming media slides up from below and scales from 1.15 to 1.
 *
 * Features:
 * - Vertical push transition with scale effects
 * - Parallax effect with slightly different speeds
 * - Soft vignette overlay that intensifies during transition
 * - Configurable overlap duration (0.7s default)
 * - Support for both image and video media types
 *
 * Technical Details:
 * - BaseLayout container with relative positioning and overflow hidden
 * - Duration: media1 + media2 - 0.7s overlap
 * - Outgoing media: transforms from translateY(0%) scale(1) to translateY(-30%) scale(0.85)
 * - Incoming media: starts at media1 - 0.7s, transforms from translateY(100%) scale(1.15) to translateY(0%) scale(1)
 * - Vignette: radial gradient overlay with opacity 0 -> 0.4 -> 0 during transition
 *
 * Use cases:
 * - Creating Pinterest-style feed transitions
 * - Building gallery-style video sequences
 * - Adding cinematic vertical push effects
 * - Creating parallax scrolling effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of first media item'),
    type: z.enum(['image', 'video']).describe('Type of first media'),
    duration: z.number().describe('Duration of first media in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of second media item'),
    type: z.enum(['image', 'video']).describe('Type of second media'),
    duration: z.number().describe('Duration of second media in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(0.7)
    .describe('Duration of transition overlap in seconds'),
  fit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .describe('How to fit media within container'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration, fit } = params;

  // Calculate total duration
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Calculate timing points for effects
  const media1OverlapStart = media1.duration - overlapDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  const childrenData: RenderableComponentData[] = [
    // Media 1 container (outgoing)
    {
      id: 'gallery-push-media1-container',
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
          duration: media1.duration,
        },
      },
      childrenData: [
        {
          id: 'gallery-push-media1-atom',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            fit: fit,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
          effects: [
            {
              id: 'media1-slide-up-scale-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: media1.duration,
                mode: 'provider',
                targetIds: ['gallery-push-media1-atom'],
                ranges: [
                  // Initial state (hold)
                  { key: 'translateY', val: '0%', prog: 0 },
                  { key: 'scale', val: 1, prog: 0 },
                  // Hold state until overlap starts
                  {
                    key: 'translateY',
                    val: '0%',
                    prog: media1OverlapStart / media1.duration,
                  },
                  {
                    key: 'scale',
                    val: 1,
                    prog: media1OverlapStart / media1.duration,
                  },
                  // Final state (slide up and scale down)
                  { key: 'translateY', val: '-30%', prog: 1 },
                  { key: 'scale', val: 0.85, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Media 2 container (incoming)
    {
      id: 'gallery-push-media2-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: media1.duration - overlapDuration,
          duration: media2.duration,
        },
      },
      childrenData: [
        {
          id: 'gallery-push-media2-atom',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            fit: fit,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: media2.duration,
            },
          },
          effects: [
            {
              id: 'media2-slide-up-scale-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['gallery-push-media2-atom'],
                ranges: [
                  // Initial state (below viewport, scaled up)
                  { key: 'translateY', val: '100%', prog: 0 },
                  { key: 'scale', val: 1.15, prog: 0 },
                  // Final state (centered, normal scale)
                  { key: 'translateY', val: '0%', prog: 1 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Vignette overlay
    {
      id: 'gallery-push-vignette-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: 'vignette-intensify-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: media1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['gallery-push-vignette-overlay'],
            ranges: [
              // Initial state (invisible)
              { key: 'opacity', val: 0, prog: 0 },
              // Peak intensity at mid-transition
              { key: 'opacity', val: 0.4, prog: 0.5 },
              // Final state (invisible)
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'gallery-push-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-gray-900',
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
  id: 'gallery-push-transition',
  title: 'Gallery Push Transition',
  description:
    'Gallery-style vertical push transition with parallax effect and vignette overlay. Media items slide vertically like scrolling through a Pinterest feed, with the outgoing media sliding up and scaling down (0.85) while the incoming media slides up from below and scales from 1.15 to 1. Includes parallax effect with different speeds and a soft vignette that intensifies during the transition to focus attention on switching content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'gallery', 'vertical', 'push', 'parallax', 'vignette'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    overlapDuration: 0.7,
    fit: 'cover',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const galleryPushTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
