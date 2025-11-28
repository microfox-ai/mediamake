/**
 * Cinematic Image Gallery Preset
 *
 * This preset creates a professional cinematic image gallery with staggered fade-in/out transitions
 * and progressive blur effects. Each image fades in with a subtle blur that clears as opacity increases
 * (simulating rack focus in cinematography), then blurs again as it fades out.
 *
 * Features:
 * - Staggered crossfade transitions with 30% overlap between images
 * - Progressive blur effect synchronized with opacity (12px → 0px → 12px)
 * - Smooth ease-in-out timing for professional feel
 * - GPU-optimized with will-change hints
 * - Absolute positioning for layered image composition
 * - Cover fit for consistent framing
 *
 * Technical Details:
 * - Each image layer is a BaseLayout with absolute positioning
 * - Generic effects animate both opacity and blur simultaneously
 * - 30% crossfade overlap creates smooth transitions between images
 * - 4-second duration per image with 1-second transitions
 * - Total duration: approximately 15.2 seconds for 5 images
 *
 * Use cases:
 * - Creating cinematic photo galleries
 * - Professional image slideshows with film-like transitions
 * - Portfolio presentations
 * - Memory montages with emotional impact
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
      }),
    )
    .min(2)
    .max(10)
    .describe('Array of images to display in the gallery'),
  imageDuration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Duration each image is displayed (in seconds)'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Duration of fade-in and fade-out transitions (in seconds)'),
  crossfadeOverlap: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe(
      'Overlap percentage for crossfade transitions (0.3 = 30% overlap)',
    ),
  blurAmount: z
    .number()
    .min(0)
    .max(20)
    .default(12)
    .describe('Maximum blur amount in pixels during transitions'),
  trackName: z
    .string()
    .default('cinematic-gallery')
    .describe('Unique identifier for this gallery instance'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    imageDuration,
    transitionDuration,
    crossfadeOverlap,
    blurAmount,
    trackName,
  } = params;

  // Calculate timing
  const overlapTime = imageDuration * crossfadeOverlap;
  const imageInterval = imageDuration - overlapTime;

  // Calculate total duration
  const totalDuration =
    images.length * imageInterval + overlapTime + transitionDuration;

  // Create image layers
  const imageLayersData: RenderableComponentData[] = images.map(
    (image, index) => {
      const layerId = `${trackName}-layer-${index}`;
      const imageId = `${trackName}-image-${index}`;
      const effectId = `${trackName}-fade-blur-${index}`;

      // Calculate start time for this image
      const startTime = index * imageInterval;

      // Calculate fade-in and fade-out progress points
      const fadeInEndProg = transitionDuration / imageDuration;
      const fadeOutStartProg = 1 - transitionDuration / imageDuration;

      return {
        id: layerId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              willChange: 'filter, opacity',
            },
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: imageDuration + overlapTime,
          },
        },
        effects: [
          {
            id: effectId,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [layerId],
              type: 'ease-in-out',
              start: 0,
              duration: imageDuration + overlapTime,
              ranges: [
                // Opacity animation: 0 → 1 → 1 → 0
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: fadeInEndProg },
                { key: 'opacity', val: 1, prog: fadeOutStartProg },
                { key: 'opacity', val: 0, prog: 1 },
                // Blur animation: blurAmount → 0 → 0 → blurAmount
                { key: 'filter:blur', val: `${blurAmount}px`, prog: 0 },
                { key: 'filter:blur', val: '0px', prog: fadeInEndProg },
                { key: 'filter:blur', val: '0px', prog: fadeOutStartProg },
                { key: 'filter:blur', val: `${blurAmount}px`, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: imageId,
            type: 'atom' as const,
            componentId: 'ImageAtom',
            data: {
              src: image.src,
              fit: 'cover',
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: imageDuration + overlapTime,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: imageLayersData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'cinematic-image-gallery',
  title: 'Cinematic Image Gallery',
  description:
    'A cinematic image gallery preset with staggered fade-in/out transitions and progressive blur effect. Each image fades in with a subtle blur that clears as opacity increases (like rack focus), then blurs again as they fade out. Uses 30% crossfade overlap between images for smooth transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['gallery', 'images', 'cinematic', 'transitions', 'blur', 'fade'],
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05' },
      { src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e' },
      { src: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5' },
    ],
    imageDuration: 4,
    transitionDuration: 1,
    crossfadeOverlap: 0.3,
    blurAmount: 12,
    trackName: 'cinematic-gallery',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const cinematicImageGalleryPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
