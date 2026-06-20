/**
 * Cross-Fade Slide Projector Transition
 *
 * Creates a dreamy, nostalgic cross-fade transition between two images with a desaturated
 * film burn aesthetic. Simulates vintage slide projector transitions with warm sepia tones,
 * gradual desaturation, and vignette effects that intensify during the transition moment.
 *
 * Features:
 * - **Warm Sepia Transition**: Outgoing image develops warm sepia tone as it fades
 * - **Desaturation Effect**: Gradual desaturation during fade-out
 * - **Cross-Dissolve Overlap**: Longer overlap period (0.8-1.2s) for dreamy effect
 * - **Vignette Pulse**: Subtle vignette that intensifies during transition
 * - **Saturation Recovery**: Incoming image fades in with increasing saturation
 * - **Nostalgic Aesthetic**: Simulates home movie night projector changes
 *
 * Use cases:
 * - Creating nostalgic image slideshow transitions
 * - YouTube image carousel presentations
 * - Vintage photography compilations
 * - Memory montage sequences
 * - Retro-style presentations
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
    duration: z.number().describe('Duration in seconds for the first image'),
  }).describe('First image configuration'),
  
  image2: z.object({
    src: z.string().describe('Source URL of the second (incoming) image'),
    duration: z.number().describe('Duration in seconds for the second image'),
  }).describe('Second image configuration'),
  
  overlapDuration: z
    .number()
    .min(0.8)
    .max(1.2)
    .default(1.0)
    .describe('Duration of the cross-fade overlap in seconds (0.8-1.2s for dreamy nostalgic feel)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, overlapDuration } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration = image1.duration + image2.duration - overlapDuration;

  // Calculate when the transition (overlap) begins relative to root
  const transitionStartTime = image1.duration - overlapDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing image (image1)
    {
      id: 'outgoing-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        // Opacity fade: 1 → 0.8 → 0
        {
          id: 'outgoing-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: image1.duration - overlapDuration, // Relative to outgoing-image timeline
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Desaturation + Sepia: saturate 1→0.3, sepia 0→0.6
        {
          id: 'outgoing-saturation-sepia',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: image1.duration - overlapDuration, // Relative to outgoing-image timeline
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              { key: 'saturate', val: 1, prog: 0 },
              { key: 'saturate', val: 0.3, prog: 1 },
              { key: 'sepia', val: 0, prog: 0 },
              { key: 'sepia', val: 0.6, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming image (image2)
    {
      id: 'incoming-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: transitionStartTime, // Starts during overlap (relative to root)
          duration: image2.duration,
        },
      },
      effects: [
        // Opacity fade-in: 0 → 0.2 → 1
        {
          id: 'incoming-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0, // Relative to incoming-image timeline
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.2, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Saturation recovery: 0.5 → 1
        {
          id: 'incoming-saturation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0, // Relative to incoming-image timeline
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: [
              { key: 'saturate', val: 0.5, prog: 0 },
              { key: 'saturate', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Vignette overlay (radial gradient)
    {
      id: 'vignette-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle, transparent 40%, rgba(0, 0, 0, 0.7) 100%);"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 30,
          mixBlendMode: 'multiply',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        // Vignette pulse: 0.3 → 0.6 → 0.3
        {
          id: 'vignette-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStartTime, // Relative to vignette timeline (starts at 0, so this is absolute)
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['vignette-overlay'],
            ranges: [
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'cross-fade-slide-projector-container',
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
  id: 'cross-fade-slide-projector',
  title: 'Cross-Fade Slide Projector Transition',
  description:
    'A dreamy, nostalgic cross-fade transition between two images with desaturated film burn aesthetic, warm sepia tones, and vignette effect simulating vintage slide projector aesthetics for YouTube image slideshows',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'cross-fade',
    'slide-projector',
    'nostalgic',
    'vintage',
    'sepia',
    'desaturate',
    'vignette',
    'film-burn',
    'image-slideshow',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    overlapDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crossFadeSlideProjectorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
