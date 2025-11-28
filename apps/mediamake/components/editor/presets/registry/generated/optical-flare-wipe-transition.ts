/**
 * Optical Flare Wipe Transition Preset
 * 
 * This preset creates a cinematic optical flare wipe transition between two media items
 * using horizontal light streaks that mimic anamorphic lens flares sweeping across the frame.
 * 
 * Features:
 * - 3-5 horizontal gradient light streaks sliding across the screen at different speeds
 * - Staggered timing offsets (0.1s between each flare) for layered optical effect
 * - Complementary scale and blur animations on both media items
 * - Outgoing media: scales down to 0.95 and blurs during transition
 * - Incoming media: scales up from 1.05 and blurs-to-focus during transition
 * - Customizable flare colors (blue/orange gradients), widths, and intensities
 * - 0.8-second overlap transition period
 * 
 * Use cases:
 * - Professional transitions between video clips
 * - Cinematic scene changes
 * - Dynamic media montages
 * - Music video transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) media item'),
    type: z.enum(['image', 'video']).describe('Type of the first media'),
    duration: z.number().describe('Duration of the first media in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the second (incoming) media item'),
    type: z.enum(['image', 'video']).describe('Type of the second media'),
    duration: z.number().describe('Duration of the second media in seconds'),
  }),
  transitionDuration: z.number().default(0.8).describe('Duration of the transition overlap in seconds'),
  flareCount: z.number().min(3).max(5).default(5).describe('Number of horizontal light streak flares (3-5)'),
  flareColors: z.array(z.object({
    color: z.string().describe('Tailwind color class for the flare (e.g., blue-400, orange-400)'),
    opacity: z.number().min(0).max(1).describe('Opacity of the flare gradient (0-1)'),
    height: z.string().default('h-1').describe('Tailwind height class for the flare (e.g., h-1, h-2, h-3)'),
  })).default([
    { color: 'blue-400', opacity: 0.6, height: 'h-1' },
    { color: 'orange-400', opacity: 0.5, height: 'h-2' },
    { color: 'blue-300', opacity: 0.7, height: 'h-1' },
    { color: 'orange-300', opacity: 0.4, height: 'h-3' },
    { color: 'blue-500', opacity: 0.5, height: 'h-1' },
  ]).describe('Array of flare configurations (colors, opacities, heights)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, flareCount, flareColors } = params;

  // Calculate BaseLayout duration (sum of media durations minus overlap)
  const baseLayoutDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  const childrenData: RenderableComponentData[] = [];

  // ===== OUTGOING MEDIA (media1) =====
  // Positioned at z-0, scales down to 0.95 and blurs during transition
  const outgoingMediaContainer: RenderableComponentData = {
    id: 'outgoing-media-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
        },
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
        id: 'outgoing-media',
        type: 'atom',
        componentId: media1ComponentId,
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Scale down effect (1 -> 0.95)
      {
        id: 'outgoing-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.95, prog: 1 },
          ],
        },
      },
      // Blur effect (0px -> 8px)
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-container'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 1 },
          ],
        },
      },
      // Opacity fade out
      {
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };
  childrenData.push(outgoingMediaContainer);

  // ===== INCOMING MEDIA (media2) =====
  // Positioned at z-5, scales up from 1.05 to 1 and blur-to-focus during transition
  const incomingMediaContainer: RenderableComponentData = {
    id: 'incoming-media-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
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
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Scale up effect (1.05 -> 1)
      {
        id: 'incoming-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media-container'],
          ranges: [
            { key: 'scale', val: 1.05, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Blur-to-focus effect (8px -> 0px)
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media-container'],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Opacity fade in
      {
        id: 'incoming-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };
  childrenData.push(incomingMediaContainer);

  // ===== OPTICAL FLARES =====
  // Create 3-5 horizontal gradient bars (HTMLBlockAtom) sliding across screen at staggered timings
  const actualFlareCount = Math.min(flareCount, flareColors.length);
  const flareStaggerDelay = 0.1; // 0.1s offset between each flare

  for (let i = 0; i < actualFlareCount; i++) {
    const flareConfig = flareColors[i];
    const flareStartTime = media1.duration - transitionDuration + (i * flareStaggerDelay);
    const zIndex = 10 + (i * 5); // z-10, z-15, z-20, z-25, z-30

    const flareHTML = `<div class="absolute top-1/2 -translate-y-1/2 ${flareConfig.height} w-full bg-gradient-to-r from-transparent via-${flareConfig.color}/${Math.round(flareConfig.opacity * 100)} to-transparent"></div>`;

    const flareComponent: RenderableComponentData = {
      id: `flare-${i + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: flareHTML,
        className: 'absolute inset-0',
        style: {
          zIndex: zIndex,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: flareStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `flare-${i + 1}-slide-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0, // Relative to flare start time
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`flare-${i + 1}`],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
            ],
          },
        },
      ],
    };
    childrenData.push(flareComponent);
  }

  // ===== ROOT CONTAINER =====
  const rootContainer: RenderableComponentData = {
    id: 'optical-flare-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
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
  id: 'optical-flare-wipe-transition',
  title: 'Optical Flare Wipe Transition',
  description: 'Horizontal anamorphic lens flare wipe transition between two media items with layered gradient streaks, scale and blur animations. Features 3-5 gradient bars sweeping left to right at staggered speeds, with complementary scale and blur effects on incoming/outgoing media.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'flare', 'wipe', 'optical', 'anamorphic', 'cinematic'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 0.8,
    flareCount: 5,
    flareColors: [
      { color: 'blue-400', opacity: 0.6, height: 'h-1' },
      { color: 'orange-400', opacity: 0.5, height: 'h-2' },
      { color: 'blue-300', opacity: 0.7, height: 'h-1' },
      { color: 'orange-300', opacity: 0.4, height: 'h-3' },
      { color: 'blue-500', opacity: 0.5, height: 'h-1' },
    ],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const opticalFlareWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};