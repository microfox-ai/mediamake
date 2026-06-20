/**
 * Double Exposure Light Leak Transition Preset
 *
 * This preset creates a classic film-style double exposure transition between two media items.
 * It simulates accidentally exposed film with beautiful, unpredictable light patterns that animate
 * across the frame during the transition overlap period.
 *
 * Features:
 * - **Double Exposure Effect**: Outgoing media fades to 60% opacity with 'screen' blend mode while
 *   incoming media gradually appears from 0% to 40% to 100%
 * - **Light Leak Overlays**: Three animated light leak textures (warm orange, cool blue, neutral white)
 *   with different blend modes ('overlay', 'soft-light', 'screen') and trajectories
 * - **Halation Glow**: Film-like glow effects around bright areas using CSS drop-shadow filters
 * - **Organic Animations**: All animations use cubic-bezier easing for natural, film-like movement
 * - **Extended Overlap**: 1.5 second overlap period where both media items are visible simultaneously
 *
 * Use cases:
 * - Creating artistic transitions between video clips or images
 * - Simulating vintage film photography aesthetics
 * - Adding organic, unpredictable visual interest to media transitions
 * - Building nostalgic or dreamy video sequences
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
    src: z.string().describe('Source URL of the outgoing media (image or video)'),
    type: z.enum(['image', 'video']).describe('Type of outgoing media'),
    duration: z.number().describe('Duration of outgoing media in seconds'),
  }).describe('Outgoing media item'),
  
  incomingMedia: z.object({
    src: z.string().describe('Source URL of the incoming media (image or video)'),
    type: z.enum(['image', 'video']).describe('Type of incoming media'),
    duration: z.number().describe('Duration of incoming media in seconds'),
  }).describe('Incoming media item'),
  
  lightLeaks: z.object({
    orange: z.string().describe('Source URL for warm orange light leak texture'),
    blue: z.string().describe('Source URL for cool blue light leak texture'),
    white: z.string().describe('Source URL for neutral white light leak texture'),
  }).describe('Light leak texture sources'),
  
  overlapDuration: z.number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
  
  halationIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of halation glow effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingMedia, incomingMedia, lightLeaks, overlapDuration, halationIntensity } = params;

  // Calculate total duration: sum of media durations minus overlap
  const totalDuration = outgoingMedia.duration + incomingMedia.duration - overlapDuration;

  // Determine component IDs based on media type
  const outgoingComponentId = outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate timing points
  const outgoingFadeStart = 0.5; // Start fading at 0.5s
  const incomingStart = outgoingMedia.duration - overlapDuration; // Overlap starts before outgoing ends
  const incomingFirstPhase = 0.7; // First phase of incoming fade (0 to 0.4 opacity)

  // Custom cubic-bezier for organic feel
  const organicEasing = 'cubic-bezier(0.4, 0.0, 0.2, 1)';

  const childrenData: RenderableComponentData[] = [
    // Outgoing Media
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingMedia.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          filter: `drop-shadow(0 0 20px rgba(255, 200, 100, ${halationIntensity}))`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingMedia.duration,
        },
      },
      effects: [
        // Opacity fade from 1 to 0.6 (0.5s to 1.5s)
        {
          id: 'outgoing-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingFadeStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Apply screen blend mode after 0.5s (using filter for blend simulation)
        {
          id: 'outgoing-blend',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingFadeStart,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'mixBlendMode', val: 'normal', prog: 0 },
              { key: 'mixBlendMode', val: 'screen', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming Media
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingMedia.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          filter: `drop-shadow(0 0 20px rgba(255, 200, 100, ${halationIntensity}))`,
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingMedia.duration + overlapDuration,
        },
      },
      effects: [
        // Two-phase opacity fade: 0 to 0.4 (0-0.7s), then 0.4 to 1 (0.7-1.5s)
        {
          id: 'incoming-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4, prog: incomingFirstPhase / overlapDuration },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Light Leak - Orange (Overlay blend, diagonal sweep)
    {
      id: 'light-leak-orange',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: lightLeaks.orange,
        className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: overlapDuration,
        },
      },
      effects: [
        // Sweep diagonally from top-left to bottom-right
        {
          id: 'orange-leak-movement',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['light-leak-orange'],
            ranges: [
              { key: 'translateX', val: '-30%', prog: 0 },
              { key: 'translateX', val: '30%', prog: 1 },
              { key: 'translateY', val: '-20%', prog: 0 },
              { key: 'translateY', val: '20%', prog: 1 },
              { key: 'rotate', val: -5, prog: 0 },
              { key: 'rotate', val: 5, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Light Leak - Blue (Soft-light blend, vertical sweep)
    {
      id: 'light-leak-blue',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: lightLeaks.blue,
        className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
        style: {
          mixBlendMode: 'soft-light',
        },
      },
      context: {
        timing: {
          start: incomingStart + 0.2,
          duration: overlapDuration - 0.2,
        },
      },
      effects: [
        // Sweep vertically from bottom to top
        {
          id: 'blue-leak-movement',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration - 0.2,
            mode: 'provider',
            targetIds: ['light-leak-blue'],
            ranges: [
              { key: 'translateY', val: '50%', prog: 0 },
              { key: 'translateY', val: '-50%', prog: 1 },
              { key: 'rotate', val: 3, prog: 0 },
              { key: 'rotate', val: -3, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Light Leak - White (Screen blend, horizontal sweep)
    {
      id: 'light-leak-white',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: lightLeaks.white,
        className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: incomingStart + 0.5,
          duration: overlapDuration - 0.5,
        },
      },
      effects: [
        // Sweep horizontally from right to left
        {
          id: 'white-leak-movement',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration - 0.5,
            mode: 'provider',
            targetIds: ['light-leak-white'],
            ranges: [
              { key: 'translateX', val: '60%', prog: 0 },
              { key: 'translateX', val: '-60%', prog: 1 },
              { key: 'scale', val: 1.2, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'double-exposure-light-leak-container',
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
  id: 'double-exposure-light-leak',
  title: 'Double Exposure Light Leak Transition',
  description:
    'Classic film-style double exposure transition with beautiful light leak overlays. Simulates accidentally exposed film with warm orange, cool blue, and neutral white light patterns animating across media. Features complex opacity animations where outgoing media fades to 60% with screen blend mode while incoming media gradually appears, combined with halation glow effects around bright areas for authentic film aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'double-exposure', 'light-leak', 'film', 'vintage', 'artistic'],
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
    lightLeaks: {
      orange: 'https://example.com/light-leak-orange.png',
      blue: 'https://example.com/light-leak-blue.png',
      white: 'https://example.com/light-leak-white.png',
    },
    overlapDuration: 1.5,
    halationIntensity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const doubleExposureLightLeakPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
