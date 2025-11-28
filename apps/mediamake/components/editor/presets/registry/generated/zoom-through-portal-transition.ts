/**
 * Zoom-Through Portal Transition Preset
 *
 * Creates a dramatic portal effect between two media items where the outgoing media
 * scales up dramatically (to 3x) while fading out, as if the camera is zooming through it.
 * The incoming media starts very small (0.1x) at the center and scales to full size.
 *
 * Features:
 * - Dramatic zoom effect (outgoing scales to 3x, incoming from 0.1x)
 * - Motion blur during scaling for speed sensation (0px -> 4px)
 * - Chromatic aberration at edges during peak zoom (RGB drop-shadows)
 * - Smooth easing (ease-in for outgoing, ease-out for incoming)
 * - Quick transition overlap (0.5s)
 *
 * Use cases:
 * - Dynamic video transitions with portal/zoom effect
 * - High-energy content transitions
 * - Creating dramatic scene changes
 * - Portal-style media switches
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media item (zooms out/away)'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media item (zooms in from center)'),
  transitionDuration: z
    .number()
    .default(0.5)
    .describe('Duration of transition overlap in seconds (quick transition)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate BaseLayout duration (with overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const getComponentId = (type: string): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  const media1ComponentId = getComponentId(media1.type);
  const media2ComponentId = getComponentId(media2.type);

  // Timing calculations
  const outgoingEffectStart = media1.duration - transitionDuration;
  const incomingStart = media1.duration - transitionDuration;
  const chromaticMidpoint = media1.duration - transitionDuration / 2;

  const childrenData: RenderableComponentData[] = [
    // Outgoing media container
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
          duration: media1.duration,
        },
      },
      effects: [
        // Scale effect: 1 -> 3 (ease-in)
        {
          id: 'outgoing-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media-container'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 3, prog: 1 },
            ],
          },
        },
        // Opacity effect: 1 -> 0 (ease-in)
        {
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media-container'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Motion blur effect: 0px -> 4px (ease-in)
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media-container'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'outgoing-media',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'absolute inset-0 object-cover w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming media container
    {
      id: 'incoming-media-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: media2.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-media',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'absolute inset-0 object-cover w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: media2.duration + transitionDuration,
            },
          },
          effects: [
            // Scale effect: 0.1 -> 1 (ease-out)
            {
              id: 'incoming-scale-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-media'],
                ranges: [
                  { key: 'scale', val: 0.1, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Chromatic aberration overlay (appears at midpoint)
    {
      id: 'chromatic-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: chromaticMidpoint - 0.125,
          duration: 0.25,
        },
      },
      effects: [
        // Chromatic aberration peak effect (rise and fall)
        {
          id: 'chromatic-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.25,
            mode: 'provider',
            targetIds: ['chromatic-overlay'],
            ranges: [
              {
                key: 'filter',
                val: 'drop-shadow(0px 0 0 rgba(255,0,0,0)) drop-shadow(0px 0 0 rgba(0,255,255,0))',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'drop-shadow(-2px 0 0 rgba(255,0,0,0.3)) drop-shadow(2px 0 0 rgba(0,255,255,0.3))',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0px 0 0 rgba(255,0,0,0)) drop-shadow(0px 0 0 rgba(0,255,255,0))',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'zoom-portal-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-black w-full h-full',
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
  id: 'zoom-through-portal-transition',
  title: 'Zoom-Through Portal Transition',
  description:
    'Creates a dramatic portal effect where the camera zooms through the outgoing media (scaling to 3x with fade out) while the incoming media scales from 0.1x to full size. Includes motion blur during scaling and chromatic aberration at peak zoom for visual intensity.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'zoom', 'portal', 'dramatic', 'blur', 'chromatic'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
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

export const zoomThroughPortalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};