/**
 * Broadcast Lower-Third Image Rotation Preset
 *
 * This preset creates a news broadcast-style lower-third image rotation where images slide up
 * from the bottom with professional motion blur. The blur decreases as images rise and settle
 * into position, similar to how broadcast graphics 'lock in'. Features a subtle bounce at the
 * end of movement (overshoot and settle). Images hold sharp for 70% of their duration, then
 * quickly blur and drop out. Includes a slight shadow/glow during movement for that 'floating
 * above background' broadcast effect.
 *
 * Features:
 * - Professional broadcast-style lower-third positioning
 * - Motion blur that decreases during entry animation
 * - Bounce easing with overshoot effect (cubic-bezier)
 * - Floating shadow/glow during movement
 * - Sharp hold period for 70% of duration
 * - Quick blur exit animation
 * - Minimal gaps between images (2.7s offset for 3s duration)
 * - GPU-accelerated transforms
 *
 * Use cases:
 * - News broadcast graphics packages
 * - Live TV-style image rotation
 * - Professional lower-third presentations
 * - Broadcast-quality image sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  trackId: z
    .string()
    .default('broadcast-lower-third')
    .describe('Unique ID for this broadcast track'),
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
      }),
    )
    .min(1)
    .describe('Array of images to rotate through'),
  imageDuration: z
    .number()
    .default(3)
    .describe('Duration each image is visible (seconds)'),
  imageOffset: z
    .number()
    .default(2.7)
    .describe('Time offset between consecutive images (seconds)'),
  entryDuration: z
    .number()
    .default(0.4)
    .describe('Duration of entry animation (seconds)'),
  exitDuration: z
    .number()
    .default(0.3)
    .describe('Duration of exit animation (seconds)'),
  entryBlur: z
    .number()
    .default(15)
    .describe('Motion blur amount during entry (pixels)'),
  exitBlur: z
    .number()
    .default(15)
    .describe('Motion blur amount during exit (pixels)'),
  shadowIntensity: z
    .number()
    .default(0.3)
    .describe('Shadow intensity during movement (0-1)'),
  imageFit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .describe('How the image should fit in its container'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    images,
    imageDuration,
    imageOffset,
    entryDuration,
    exitDuration,
    entryBlur,
    exitBlur,
    shadowIntensity,
    imageFit,
  } = params;

  // Calculate exit start time (70% of duration for hold)
  const exitStartTime = imageDuration * 0.7;

  // Build image containers with animations
  const imageContainers: RenderableComponentData[] = images.map(
    (image, index) => {
      const containerId = `${trackId}-image-container-${index}`;
      const imageId = `${trackId}-image-${index}`;
      const entryEffectId = `${trackId}-entry-effect-${index}`;
      const exitEffectId = `${trackId}-exit-effect-${index}`;

      // Container starts at staggered offset
      const containerStart = index * imageOffset;

      return {
        id: containerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: containerStart,
            duration: imageDuration,
          },
        },
        effects: [
          // Entry effect: slide up with blur and shadow
          {
            id: entryEffectId,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bounce easing
              start: 0, // Relative to container
              duration: entryDuration,
              mode: 'provider',
              targetIds: [containerId],
              ranges: [
                // Slide up from bottom
                { key: 'translateY', val: '100%', prog: 0 },
                { key: 'translateY', val: '0%', prog: 1 },
                // Blur decreases
                { key: 'filter:blur', val: `${entryBlur}px`, prog: 0 },
                { key: 'filter:blur', val: '0px', prog: 1 },
                // Shadow during movement
                {
                  key: 'boxShadow',
                  val: `0 10px 30px rgba(0,0,0,${shadowIntensity})`,
                  prog: 0,
                },
                { key: 'boxShadow', val: '0 0px 0px rgba(0,0,0,0)', prog: 1 },
              ],
            },
          },
          // Exit effect: drop down with blur
          {
            id: exitEffectId,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: exitStartTime, // Start at 70% of duration
              duration: exitDuration,
              mode: 'provider',
              targetIds: [containerId],
              ranges: [
                // Drop down
                { key: 'translateY', val: '0%', prog: 0 },
                { key: 'translateY', val: '100%', prog: 1 },
                // Blur increases
                { key: 'filter:blur', val: '0px', prog: 0 },
                { key: 'filter:blur', val: `${exitBlur}px`, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // Image atom
          {
            id: imageId,
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: image.src,
              className: 'w-full h-full object-cover',
              fit: imageFit,
              style: {},
            },
            context: {
              timing: {
                start: 0,
                duration: imageDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container with lower-third zone
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: images.length * imageOffset + imageDuration,
      },
    },
    childrenData: [
      {
        id: `${trackId}-lower-third-zone`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-0 left-0 right-0 h-3/4',
            style: {},
          },
        },
        context: {
          timing: {
            start: 0,
            duration: images.length * imageOffset + imageDuration,
          },
        },
        childrenData: imageContainers,
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

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
  id: 'broadcast-lower-third-image-rotation',
  title: 'Broadcast Lower-Third Image Rotation',
  description:
    'News broadcast-style lower-third image rotation with professional motion blur that decreases as images rise from bottom. Features broadcast-quality bounce easing (cubic-bezier overshoot), sharp hold period for 70% duration, quick blur exit, and floating shadow/glow during movement. Images slide up translateY(100%→0) with blur(15px→0px) over 0.4s, hold clear, then drop with blur over 0.3s.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'broadcast',
    'lower-third',
    'image',
    'rotation',
    'news',
    'motion-blur',
    'bounce',
    'professional',
  ],
  dependencies: {},
  defaultInputParams: {
    trackId: 'broadcast-lower-third',
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' },
      { src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff' },
      { src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e' },
      { src: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29' },
    ],
    imageDuration: 3,
    imageOffset: 2.7,
    entryDuration: 0.4,
    exitDuration: 0.3,
    entryBlur: 15,
    exitBlur: 15,
    shadowIntensity: 0.3,
    imageFit: 'cover',
  },
};

// Export preset
export const broadcastLowerThirdImageRotationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
