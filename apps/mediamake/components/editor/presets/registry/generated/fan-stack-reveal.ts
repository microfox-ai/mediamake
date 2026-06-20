/**
 * Fan Stack Reveal Transition Preset
 *
 * Creates a card-fan reveal effect where images stack and fan out like a hand of cards.
 * The current image rotates clockwise from bottom-left while the next image fans in
 * counter-clockwise from bottom-right, creating a cascading card deck effect.
 *
 * Features:
 * - Card-like rotation with authentic transform origins
 * - Diagonal translation creating dynamic motion
 * - 3D shadow effects that intensify during transitions
 * - Rounded corners for physical card appearance
 * - Z-index management for proper layering during overlap
 * - 500-600ms overlap period with synchronized effects
 *
 * Use Cases:
 * - Photo album presentations
 * - Portfolio showcases
 * - Memory slideshow effects
 * - Card-based navigation transitions
 * - Album art displays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL or local path'),
        duration: z.number().describe('Duration to display this image in seconds'),
      }),
    )
    .min(2)
    .describe('Array of images with durations (minimum 2 images required)'),
  overlapDuration: z
    .number()
    .min(0.5)
    .max(0.6)
    .default(0.55)
    .describe('Overlap duration for transitions (500-600ms)'),
  rotationDegrees: z
    .number()
    .min(15)
    .max(20)
    .default(18)
    .describe('Rotation angle in degrees (15-20 degrees)'),
  translateXPercent: z
    .number()
    .default(15)
    .describe('Horizontal translation distance in percentage'),
  translateYPercent: z
    .number()
    .default(10)
    .describe('Vertical translation distance in percentage'),
  borderRadius: z
    .number()
    .min(12)
    .max(16)
    .default(14)
    .describe('Border radius in pixels for rounded corners (12-16px)'),
  containerClassName: z
    .string()
    .default('absolute inset-0 flex items-center justify-center')
    .describe('Container class names'),
  trackName: z
    .string()
    .default('fan-stack-reveal')
    .describe('Name for the track (used for IDs)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    overlapDuration,
    rotationDegrees,
    translateXPercent,
    translateYPercent,
    borderRadius,
    containerClassName,
    trackName,
  } = params;

  // Calculate total duration: sum of all image durations minus overlaps
  const totalDuration = images.reduce((sum, img) => sum + img.duration, 0) - (images.length - 1) * overlapDuration;

  // Helper function to create image pairs with transitions
  const createImagePairs = (): RenderableComponentData[] => {
    const pairs: RenderableComponentData[] = [];
    let accumulatedTime = 0;

    for (let i = 0; i < images.length; i++) {
      const currentImage = images[i];
      const nextImage = images[i + 1];
      const isLast = i === images.length - 1;

      // For all images except the last
      if (!isLast && nextImage) {
        // Create a pair container for overlapping images
        const pairContainer: RenderableComponentData = {
          id: `${trackName}-pair-${i}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: {
              start: accumulatedTime,
              duration: currentImage.duration,
            },
          },
          childrenData: [
            // Outgoing image (current)
            {
              id: `${trackName}-outgoing-${i}`,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: currentImage.src,
                className: 'absolute w-full h-full object-cover',
                style: {
                  transformOrigin: 'bottom left',
                  zIndex: 20,
                  borderRadius: `${borderRadius}px`,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: currentImage.duration,
                },
              },
              effects: [
                // Outgoing rotation, translation, and fade effect
                {
                  id: `${trackName}-outgoing-effect-${i}`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-in-out',
                    start: currentImage.duration - overlapDuration,
                    duration: overlapDuration,
                    mode: 'provider',
                    targetIds: [`${trackName}-outgoing-${i}`],
                    ranges: [
                      { key: 'rotate', val: 0, prog: 0, unit: 'deg' },
                      { key: 'rotate', val: rotationDegrees, prog: 1, unit: 'deg' },
                      { key: 'translateX', val: 0, prog: 0, unit: '%' },
                      { key: 'translateX', val: -translateXPercent, prog: 1, unit: '%' },
                      { key: 'translateY', val: 0, prog: 0, unit: '%' },
                      { key: 'translateY', val: translateYPercent, prog: 1, unit: '%' },
                      { key: 'opacity', val: 1, prog: 0 },
                      { key: 'opacity', val: 0, prog: 1 },
                      {
                        key: 'boxShadow',
                        val: '0 4px 6px rgba(0,0,0,0.1)',
                        prog: 0,
                      },
                      {
                        key: 'boxShadow',
                        val: '0 20px 40px rgba(0,0,0,0.4)',
                        prog: 0.5,
                      },
                      {
                        key: 'boxShadow',
                        val: '0 0px 0px rgba(0,0,0,0)',
                        prog: 1,
                      },
                    ],
                  },
                },
              ],
            } as RenderableComponentData,
            // Incoming image (next)
            {
              id: `${trackName}-incoming-${i}`,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: nextImage.src,
                className: 'absolute w-full h-full object-cover',
                style: {
                  transformOrigin: 'bottom right',
                  zIndex: 10,
                  borderRadius: `${borderRadius}px`,
                },
              },
              context: {
                timing: {
                  start: currentImage.duration - overlapDuration,
                  duration: nextImage.duration + overlapDuration,
                },
              },
              effects: [
                // Incoming rotation, translation, and fade effect
                {
                  id: `${trackName}-incoming-effect-${i}`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-in-out',
                    start: 0,
                    duration: overlapDuration,
                    mode: 'provider',
                    targetIds: [`${trackName}-incoming-${i}`],
                    ranges: [
                      { key: 'rotate', val: -rotationDegrees, prog: 0, unit: 'deg' },
                      { key: 'rotate', val: 0, prog: 1, unit: 'deg' },
                      { key: 'translateX', val: translateXPercent, prog: 0, unit: '%' },
                      { key: 'translateX', val: 0, prog: 1, unit: '%' },
                      { key: 'translateY', val: -translateYPercent, prog: 0, unit: '%' },
                      { key: 'translateY', val: 0, prog: 1, unit: '%' },
                      { key: 'opacity', val: 0, prog: 0 },
                      { key: 'opacity', val: 1, prog: 1 },
                      {
                        key: 'boxShadow',
                        val: '0 0px 0px rgba(0,0,0,0)',
                        prog: 0,
                      },
                      {
                        key: 'boxShadow',
                        val: '0 20px 40px rgba(0,0,0,0.4)',
                        prog: 0.5,
                      },
                      {
                        key: 'boxShadow',
                        val: '0 4px 6px rgba(0,0,0,0.1)',
                        prog: 1,
                      },
                    ],
                  },
                },
                // Z-index switch at midpoint of overlap
                {
                  id: `${trackName}-z-switch-${i}`,
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: overlapDuration / 2,
                    duration: 0.001,
                    mode: 'provider',
                    targetIds: [`${trackName}-incoming-${i}`],
                    ranges: [
                      { key: 'zIndex', val: 10, prog: 0 },
                      { key: 'zIndex', val: 30, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData,
          ],
        };

        pairs.push(pairContainer);
        accumulatedTime += currentImage.duration - overlapDuration;
      } else if (isLast) {
        // Last image: just display without transition
        const lastImageContainer: RenderableComponentData = {
          id: `${trackName}-last-${i}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: {
              start: accumulatedTime,
              duration: currentImage.duration,
            },
          },
          childrenData: [
            {
              id: `${trackName}-last-image-${i}`,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: currentImage.src,
                className: 'absolute w-full h-full object-cover',
                style: {
                  zIndex: 20,
                  borderRadius: `${borderRadius}px`,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: currentImage.duration,
                },
              },
            } as RenderableComponentData,
          ],
        };

        pairs.push(lastImageContainer);
      }
    }

    return pairs;
  };

  const imagePairs = createImagePairs();

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: containerClassName,
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: imagePairs,
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

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'fan-stack-reveal',
  title: 'Fan Stack Reveal Transition',
  description:
    'Images transition like a hand of cards being fanned out. The current image rotates and translates diagonally while revealing the next image underneath that fans in from the opposite direction. Features cascading card effect with 3D shadows, rounded corners like album art, and precise rotation origins for authentic card-deck motion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'images', 'cards', 'fan', 'stack', 'reveal', 'rotation'],
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
        duration: 3,
      },
      {
        src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
        duration: 3,
      },
      {
        src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=1080&fit=crop',
        duration: 3,
      },
    ],
    overlapDuration: 0.55,
    rotationDegrees: 18,
    translateXPercent: 15,
    translateYPercent: 10,
    borderRadius: 14,
    containerClassName: 'absolute inset-0 flex items-center justify-center',
    trackName: 'fan-stack-reveal',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export
export const fanStackRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
