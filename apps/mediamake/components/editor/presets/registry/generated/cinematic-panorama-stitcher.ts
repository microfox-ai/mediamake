/**
 * Cinematic Panoramic Image Stitcher Preset
 *
 * This preset creates a seamless panoramic image stitcher with a Ken Burns-style documentary effect.
 * Multiple images are blended together with overlapping gradient masks to create an invisible transition
 * between images, appearing as a single continuous photograph. The composition starts compressed with
 * a fade-in/scale-up animation, then smoothly pans from left to right across the panoramic view.
 *
 * Features:
 * - **Seamless Image Blending**: Overlapping images with gradient masks create invisible transitions
 * - **Ken Burns Effect**: Smooth horizontal pan with contemplative pacing (8-12 seconds)
 * - **Initial Animation**: Fade-in with scale-up effect (0.8 to 1.0) over 1 second
 * - **GPU-Accelerated**: Uses transform: translateX with will-change for smooth performance
 * - **Flexible Configuration**: Adjustable duration, overlap percentage, and number of images
 * - **Responsive Layout**: Calculates widths dynamically based on viewport and overlap settings
 *
 * Use cases:
 * - Creating documentary-style panoramic sequences
 * - Building immersive photo galleries with smooth scrolling
 * - Adding cinematic movement to still photography
 * - Creating professional presentation transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        alt: z.string().optional().describe('Alternative text for image'),
      }),
    )
    .min(2)
    .describe('Array of images to stitch together (minimum 2 images)'),
  totalDuration: z
    .number()
    .min(8)
    .max(20)
    .default(10)
    .describe('Total duration of the panoramic animation in seconds (8-12 recommended)'),
  fadeInDuration: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Duration of initial fade-in and scale-up animation in seconds'),
  overlapPercentage: z
    .number()
    .min(10)
    .max(30)
    .default(20)
    .describe('Percentage of image width that overlaps with adjacent images (10-30%)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color for the container'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    totalDuration,
    fadeInDuration,
    overlapPercentage,
    backgroundColor,
  } = params;

  // Get viewport dimensions
  const viewportWidth = props.config?.width ?? 1920;
  const viewportHeight = props.config?.height ?? 1080;

  // Calculate image widths and overlap
  const numImages = images.length;
  const overlapFactor = overlapPercentage / 100;
  
  // Each image takes up enough space to fill viewport + overlap on one side
  // The first image doesn't need left overlap, the last doesn't need right overlap
  const baseImageWidth = viewportWidth * (1 + overlapFactor);
  
  // Calculate total width of panorama
  // First image: baseImageWidth
  // Middle images: baseImageWidth (includes overlap on both sides)
  // Last image: baseImageWidth
  // Total scroll distance accounts for overlaps
  const totalPanoramaWidth = baseImageWidth * numImages - (viewportWidth * overlapFactor * (numImages - 1));
  const maxTranslateX = -(totalPanoramaWidth - viewportWidth);

  // Calculate animation timing
  const panStartTime = fadeInDuration;
  const panDuration = totalDuration - fadeInDuration;

  // Helper function to generate gradient mask for each image position
  const getGradientMask = (index: number): string => {
    const isFirst = index === 0;
    const isLast = index === numImages - 1;

    if (isFirst) {
      // First image: fade out on the right
      return `linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${80 - overlapPercentage}%, rgba(0,0,0,0) 100%)`;
    } else if (isLast) {
      // Last image: fade in on the left
      return `linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${overlapPercentage}%, rgba(0,0,0,1) 100%)`;
    } else {
      // Middle images: fade in on left, fade out on right
      return `linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${overlapPercentage}%, rgba(0,0,0,1) ${80 - overlapPercentage}%, rgba(0,0,0,0) 100%)`;
    }
  };

  // Create image nodes
  const imageNodes: RenderableComponentData[] = images.map((image, index) => {
    const isFirst = index === 0;
    const marginLeft = isFirst ? 0 : -(baseImageWidth * overlapFactor);

    return {
      id: `panorama-image-${index}`,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'relative h-full object-cover',
        style: {
          width: `${baseImageWidth}px`,
          marginLeft: `${marginLeft}px`,
          WebkitMaskImage: getGradientMask(index),
          maskImage: getGradientMask(index),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData;
  });

  // Create the scrolling container with all images
  const scrollContainer: RenderableComponentData = {
    id: 'panorama-scroll-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex flex-row h-full',
        style: {
          willChange: 'transform',
          left: 0,
          top: 0,
          width: `${totalPanoramaWidth}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: imageNodes,
    effects: [
      // Initial fade-in and scale-up effect
      {
        id: 'initial-fade-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: ['panorama-scroll-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Panoramic scroll effect
      {
        id: 'panoramic-scroll-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: panStartTime,
          duration: panDuration,
          mode: 'provider',
          targetIds: ['panorama-scroll-container'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: maxTranslateX, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'panorama-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [scrollContainer],
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
  id: 'cinematic-panorama-stitcher',
  title: 'Cinematic Panoramic Image Stitcher',
  description:
    'Seamlessly blends multiple images into a continuous horizontal panoramic scroll with Ken Burns-style documentary feel. Images overlap with soft gradient masks and smoothly pan from left to right with contemplative pacing. Features initial fade-in/scale-up animation followed by smooth horizontal translation using GPU-accelerated transforms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'panorama',
    'images',
    'cinematic',
    'ken-burns',
    'documentary',
    'stitching',
    'seamless',
    'scroll',
    'animation',
    'visual',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://example.com/image1.jpg', alt: 'Image 1' },
      { src: 'https://example.com/image2.jpg', alt: 'Image 2' },
      { src: 'https://example.com/image3.jpg', alt: 'Image 3' },
    ],
    totalDuration: 10,
    fadeInDuration: 1,
    overlapPercentage: 20,
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicPanoramaStitcherPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
