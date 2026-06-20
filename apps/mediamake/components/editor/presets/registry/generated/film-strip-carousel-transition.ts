/**
 * Film Strip Carousel Transition Preset
 *
 * This preset creates a horizontal slide carousel transition that emulates a mechanical film strip
 * advancing through a projector gate. The transition creates the illusion of videos sliding horizontally
 * like frames on a film reel, with a brief moment of motion blur and light leak between frames.
 *
 * Features:
 * - **Horizontal Slide Animation**: Videos slide left/right during transition
 * - **Light Streak Effect**: Semi-transparent vertical light sweep simulating projector light bleed
 * - **Vignette Effect**: Subtle vignetting that intensifies during transition
 * - **Configurable Overlap**: Adjustable transition duration (default 0.5s)
 * - **Smooth Easing**: Ease-out curve for natural motion
 * - **Media Type Support**: Works with both images and videos
 *
 * Use cases:
 * - Creating film-like transitions between video clips
 * - Building cinematic slideshows with projector aesthetics
 * - Adding retro film strip effects to modern content
 * - Professional video transitions with mechanical feel
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
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Duration of transition overlap in seconds'),
  lightStreakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .optional()
    .describe('Intensity of the light streak effect (0-1)'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Intensity of the vignette effect during transition (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    lightStreakIntensity = 0.9,
    vignetteIntensity = 0.5,
  } = params;

  // Calculate BaseLayout duration (sum minus overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const getComponentId = (type: 'image' | 'video'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  const media1ComponentId = getComponentId(media1.type);
  const media2ComponentId = getComponentId(media2.type);

  // Calculate timing for incoming media (starts before outgoing ends)
  const incomingMediaStart = media1.duration - transitionDuration;

  // Outgoing video node
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      ...(media1.type === 'video' && {
        muted: false,
        volume: 1,
      }),
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-slide-out',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-100%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video node
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      ...(media2.type === 'video' && {
        muted: false,
        volume: 1,
      }),
    },
    context: {
      timing: {
        start: incomingMediaStart,
        duration: media2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-slide-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming media start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateX', val: '100%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Light streak effect node (sweeps across during transition)
  const lightStreakEffect: RenderableComponentData = {
    id: 'light-streak',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, 
          transparent 0%, 
          transparent 35%, 
          rgba(255,255,255,${lightStreakIntensity * 0.6}) 45%, 
          rgba(255,255,255,${lightStreakIntensity}) 50%, 
          rgba(255,255,255,${lightStreakIntensity * 0.6}) 55%, 
          transparent 65%, 
          transparent 100%);
        pointer-events: none;
      "></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: incomingMediaStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'light-streak-sweep',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['light-streak'],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '200%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Vignette overlay (intensifies during transition)
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at center, 
          transparent 40%, 
          rgba(0,0,0,0.3) 100%);
        pointer-events: none;
      "></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    effects: [
      {
        id: 'vignette-intensify',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: incomingMediaStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: vignetteIntensity + 0.3, prog: 0.5 },
            { key: 'opacity', val: 0.5, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'film-strip-carousel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingVideo,
      incomingVideo,
      lightStreakEffect,
      vignetteOverlay,
    ] as RenderableComponentData[],
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
  id: 'film-strip-carousel-transition',
  title: 'Film Strip Carousel Transition',
  description:
    'A horizontal slide carousel transition that emulates a mechanical film strip advancing through a projector gate. Creates the illusion of videos sliding horizontally like frames on a film reel, with motion blur simulation, light leak effects between frames, and intensifying vignette during the 0.5 second overlap transition.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'carousel',
    'film-strip',
    'projector',
    'slide',
    'horizontal',
    'light-leak',
    'vignette',
    'cinematic',
  ],
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
    transitionDuration: 0.5,
    lightStreakIntensity: 0.9,
    vignetteIntensity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const filmStripCarouselTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
