/**
 * Liquid Solarization Morph Transition Preset
 *
 * Creates a liquid solarization morph transition where colors invert while videos appear to melt and reform.
 * The outgoing video's colors invert progressively from bottom to top (like liquid draining) while the shape 
 * warps with wave distortions. The incoming video flows in from top with inverted colors that normalize as 
 * it settles into place.
 *
 * Features:
 * - Progressive color inversion (solarization effect)
 * - Liquid draining animation with vertical melting
 * - Wave distortion effects synchronized with color inversion
 * - Smooth cubic-bezier easing for liquid-like motion
 * - Configurable transition duration (default 2 seconds)
 * - Support for both image and video media types
 *
 * Use cases:
 * - Creative video transitions with color manipulation
 * - Artistic video montages with liquid morphing effects
 * - Music videos with psychedelic visual transitions
 * - Abstract video art with melting and reforming effects
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
    src: z.string().describe('Source URL of outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Outgoing media configuration'),
  
  media2: z.object({
    src: z.string().describe('Source URL of incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Incoming media configuration'),
  
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.0)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate BaseLayout duration (overlap reduces total time)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate timing for overlapping transition
  const media1Start = 0;
  const media1FullDuration = media1.duration;
  
  const media2Start = media1.duration - transitionDuration;
  const media2FullDuration = media2.duration + transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing media with liquid drain and inversion effects
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        ...(media1.type === 'video' ? { muted: false, volume: 1 } : {}),
      },
      context: {
        timing: {
          start: media1Start,
          duration: media1FullDuration,
        },
      },
      effects: [
        // Progressive color inversion from 0% to 100%
        {
          id: 'outgoing-video-effect-invert',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter:invert', val: 0, prog: 0 },
              { key: 'filter:invert', val: 100, prog: 1 },
            ],
          },
        },
        // Melting effect: scaleY and translateY
        {
          id: 'outgoing-video-effect-melt',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 0.8, prog: 1 },
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '20%', prog: 1 },
            ],
          },
        },
        // Wave distortion with sinusoidal skewX
        {
          id: 'outgoing-video-effect-wave',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'skewX', val: 0, prog: 0 },
              { key: 'skewX', val: 5, prog: 0.25 },
              { key: 'skewX', val: -5, prog: 0.5 },
              { key: 'skewX', val: 5, prog: 0.75 },
              { key: 'skewX', val: 0, prog: 1 },
            ],
          },
        },
        // Fade out during last second of transition
        {
          id: 'outgoing-video-effect-opacity',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
            start: media1.duration - transitionDuration + (transitionDuration * 0.5),
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Incoming media with inverted colors that normalize
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        ...(media2.type === 'video' ? { muted: false, volume: 1 } : {}),
      },
      context: {
        timing: {
          start: media2Start,
          duration: media2FullDuration,
        },
      },
      effects: [
        // Fade in during first part of transition
        {
          id: 'incoming-video-effect-opacity',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
            start: 0,
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Color inversion normalization (100% to 0% over 1.5s starting at 0.5s)
        {
          id: 'incoming-video-effect-invert',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
            start: transitionDuration * 0.25,
            duration: transitionDuration * 0.75,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter:invert', val: 100, prog: 0 },
              { key: 'filter:invert', val: 0, prog: 1 },
            ],
          },
        },
        // Flow in effect: reverse melt (scaleY and translateY)
        {
          id: 'incoming-video-effect-flow',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
            start: 0,
            duration: transitionDuration * 0.75,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scaleY', val: 0.8, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
              { key: 'translateY', val: '-20%', prog: 0 },
              { key: 'translateY', val: '0%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'liquid-solarization-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          overflow: 'hidden',
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
  id: 'liquid-solarization-morph',
  title: 'Liquid Solarization Morph Transition',
  description:
    'A transition effect where videos undergo color inversion (solarization) while melting/warping with wave distortions. The outgoing video inverts progressively from bottom to top with liquid-draining effect, while the incoming video flows in from top with colors normalizing as it settles.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'solarization', 'liquid', 'morph', 'invert', 'melt', 'wave', 'distortion'],
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
    transitionDuration: 2.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidSolarizationMorphPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};