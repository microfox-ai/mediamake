/**
 * Gallery Carousel 3D Transition Preset
 *
 * This preset creates a horizontal gallery carousel transition with a 3D perspective shift
 * that mimics a physical rotating display case. Images rotate on the Y-axis with scaling
 * and motion blur effects, creating an elegant cylindrical gallery space illusion.
 *
 * Features:
 * - 3D perspective transform with preserve-3d style
 * - Cylindrical rotation with Y-axis transforms
 * - Motion blur during transition peak
 * - Scale animation (0.85 to 1.0)
 * - Organic vertical offset movement
 * - Smooth 1-second overlap period
 *
 * Use cases:
 * - Creating elegant image transitions
 * - Building photo gallery presentations
 * - Showcasing product images with depth
 * - Creating cinematic slideshow effects
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
    src: z.string().describe('Source URL of the first image'),
    duration: z.number().describe('Duration of the first image in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the second image'),
    duration: z.number().describe('Duration of the second image in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate container duration (sum of media durations minus overlap)
  const containerDuration = media1.duration + media2.duration - transitionDuration;

  // Outgoing image (media1) - slides left and rotates
  const outgoingImage: RenderableComponentData = {
    id: 'gallery-outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: media1.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      // Opacity fade out
      {
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gallery-outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Transform: rotateY + translateX + scale
      {
        id: 'outgoing-transform-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gallery-outgoing-image'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -45, prog: 1 },
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -50, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.85, prog: 1 },
          ],
        },
      },
      // Blur effect (0px -> 3px -> 0px)
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gallery-outgoing-image'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 3, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming image (media2) - enters from right with opposite rotation
  const incomingImage: RenderableComponentData = {
    id: 'gallery-incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: media2.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: media2.duration,
      },
    },
    effects: [
      // Opacity fade in
      {
        id: 'incoming-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gallery-incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Transform: rotateY + translateX + scale + translateY
      {
        id: 'incoming-transform-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gallery-incoming-image'],
          ranges: [
            { key: 'rotateY', val: 45, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'translateX', val: 50, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'scale', val: 0.85, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'translateY', val: -10, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      // Blur effect (3px -> 0px)
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gallery-incoming-image'],
          ranges: [
            { key: 'blur', val: 3, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'gallery-carousel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '800px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
      },
    },
    childrenData: [outgoingImage, incomingImage],
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
  id: 'gallery-carousel-3d-transition',
  title: 'Gallery Carousel 3D Transition',
  description:
    'Horizontal gallery carousel transition with 3D perspective shift that mimics a physical rotating display case. Features preserve-3d transform style, cylindrical rotation with Y-axis transforms, motion blur, and organic vertical offset movement.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'gallery', 'carousel', '3d', 'rotation', 'perspective'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const galleryCarousel3dTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
