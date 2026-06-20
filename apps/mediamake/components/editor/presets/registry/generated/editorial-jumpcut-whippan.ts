/**
 * Editorial Jump-Cut Whip Pan Preset
 *
 * This preset creates an editorial-style jump-cut effect with horizontal motion blur simulating
 * whip pan camera movements. Images snap in/out with directional blur suggesting rapid lateral
 * camera movement, mimicking handheld documentary or action sequence cinematography.
 *
 * Features:
 * - **Directional Motion Blur**: Horizontal stretch blur effect simulating whip pan motion
 * - **Quick Entrance with Overshoot**: 0.3s entrance with cubic-bezier bounce for impact
 * - **Gentle Exit**: 0.8s ease-in fade out for editorial aesthetic
 * - **Handheld Camera Feel**: Slight rotation (-2deg to 0deg) during entrance
 * - **Jump-Cut Aesthetic**: Minimal overlap (0.1s) between images for rapid cuts
 * - **Performance Optimized**: Uses will-change for smooth transforms and filters
 *
 * Use cases:
 * - Creating dynamic editorial-style image sequences
 * - Simulating handheld documentary camera work
 * - Building high-energy action sequence visuals
 * - Adding cinematic whip pan transitions to photos
 * - Creating rapid-cut montages with motion blur
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL or local path'),
      }),
    )
    .describe('Array of images to display in sequence'),
  imageDuration: z
    .number()
    .default(2.5)
    .describe('Duration each image is displayed (seconds)'),
  imageOverlap: z
    .number()
    .default(0.1)
    .describe('Overlap between consecutive images for jump-cut effect (seconds)'),
  entranceDuration: z
    .number()
    .default(0.3)
    .describe('Duration of entrance animation with motion blur (seconds)'),
  exitDuration: z
    .number()
    .default(0.8)
    .describe('Duration of exit fade animation (seconds)'),
  motionBlurAmount: z
    .number()
    .default(20)
    .describe('Amount of blur during entrance (pixels)'),
  motionStretch: z
    .number()
    .default(1.5)
    .describe('Horizontal stretch factor for motion blur effect'),
  whipPanDistance: z
    .number()
    .default(100)
    .describe('Distance of whip pan motion (pixels)'),
  rotationAmount: z
    .number()
    .default(-2)
    .describe('Rotation amount during entrance for handheld feel (degrees)'),
  imageFit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .describe('How to fit images within container'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    imageDuration,
    imageOverlap,
    entranceDuration,
    exitDuration,
    motionBlurAmount,
    motionStretch,
    whipPanDistance,
    rotationAmount,
    imageFit,
  } = params;

  // Calculate timing for each image
  const imageSpacing = imageDuration - imageOverlap;

  // Create image items with effects
  const imageItems: RenderableComponentData[] = images.map((image, index) => {
    const imageId = `whippan-image-${index}`;
    const startTime = index * imageSpacing;

    // Entrance effect: quick with motion blur, overshoot bounce, rotation
    const entranceEffect = {
      id: `entrance-${imageId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Overshoot bounce easing
        start: 0,
        duration: entranceDuration,
        mode: 'provider',
        targetIds: [imageId],
        ranges: [
          // Opacity fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          // Blur clearing (motion blur effect)
          { key: 'filter', val: `blur(${motionBlurAmount}px)`, prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
          // Horizontal stretch (motion blur stretch)
          { key: 'scaleX', val: motionStretch, prog: 0 },
          { key: 'scaleX', val: 1, prog: 1 },
          // Vertical scale (maintain aspect ratio base)
          { key: 'scaleY', val: 1, prog: 0 },
          { key: 'scaleY', val: 1, prog: 1 },
          // Whip pan motion (horizontal translation)
          { key: 'translateX', val: -whipPanDistance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          // Rotation (handheld camera feel)
          { key: 'rotate', val: rotationAmount, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      },
    };

    // Exit effect: gentle fade out
    const exitStartTime = imageDuration - exitDuration;
    const exitEffect = {
      id: `exit-${imageId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: exitStartTime,
        duration: exitDuration,
        mode: 'provider',
        targetIds: [imageId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };

    // Image container with effects
    const imageContainer: RenderableComponentData = {
      id: `container-${imageId}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 origin-center',
          style: {
            willChange: 'transform, filter',
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: imageDuration,
        },
      },
      effects: [entranceEffect, exitEffect],
      childrenData: [
        {
          id: imageId,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: image.src,
            className: 'w-full h-full object-cover',
            fit: imageFit,
          },
          context: {
            timing: {
              start: 0,
              duration: imageDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    return imageContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'editorial-jumpcut-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: imageItems,
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'editorial-jumpcut-whippan',
  title: 'Editorial Jump-Cut Whip Pan',
  description:
    'Editorial-style jump-cut preset with horizontal motion blur simulating whip pan camera movement. Features quick entrance with overshoot bounce, gentle exit, and slight rotation for handheld documentary feel. Images snap in/out with directional blur suggesting lateral camera movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'editorial',
    'jump-cut',
    'whip-pan',
    'motion-blur',
    'handheld',
    'documentary',
    'action',
    'cinematic',
  ],
  dependencies: {},
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      },
      {
        src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop',
      },
      {
        src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      },
    ],
    imageDuration: 2.5,
    imageOverlap: 0.1,
    entranceDuration: 0.3,
    exitDuration: 0.8,
    motionBlurAmount: 20,
    motionStretch: 1.5,
    whipPanDistance: 100,
    rotationAmount: -2,
    imageFit: 'cover',
  },
};

// Export preset
export const editorialJumpcutWhippanPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
