/**
 * Venetian Blind Photo Collage Reveal Preset
 *
 * Creates a sophisticated photo collage reveal using a venetian blind effect where images 
 * slide in as horizontal strips that assemble into complete photos. Each image is divided 
 * into horizontal slices that slide in with alternating directions (odd rows from left, 
 * even from right), creating a mechanical yet elegant reveal.
 *
 * Features:
 * - Horizontal strip division (5-8 strips per image)
 * - Alternating slide directions (odd strips from left, even from right)
 * - Staggered timing for sequential strip assembly
 * - Brightness animation from dimmed to full as strips lock into place
 * - Precision mechanical feel with linear easing
 * - Grid layout supporting multiple images
 * - Configurable strip count and timing parameters
 *
 * Technical approach:
 * - Uses BaseLayout grid with overflow-hidden containers
 * - Each image divided into strips using clip-path
 * - Generic effects for translateX animations (alternating directions)
 * - Brightness filter animation synchronized with slide
 * - Staggered timing: 0.05s between strips, 0.2s between images
 *
 * Use cases:
 * - Dynamic photo galleries with mechanical transitions
 * - Portfolio showcases with precision reveals
 * - Product image displays with structured assembly
 * - Visual storytelling with controlled timing
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
        src: z.string().describe('Image source URL'),
      }),
    )
    .min(1)
    .max(6)
    .describe('Array of images to display (1-6 images)'),
  
  stripCount: z
    .number()
    .int()
    .min(5)
    .max(8)
    .default(7)
    .describe('Number of horizontal strips per image (5-8)'),
  
  stripDuration: z
    .number()
    .min(0.3)
    .max(1.5)
    .default(0.6)
    .describe('Duration in seconds for each strip to slide in'),
  
  stripStagger: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Delay in seconds between consecutive strip reveals'),
  
  imageStagger: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Delay in seconds between image reveals'),
  
  brightnessStart: z
    .number()
    .min(0.3)
    .max(1)
    .default(0.7)
    .describe('Starting brightness value (0.3-1, dimmed)'),
  
  brightnessEnd: z
    .number()
    .min(0.8)
    .max(1.5)
    .default(1)
    .describe('Ending brightness value (0.8-1.5, full brightness)'),
  
  gridColumns: z
    .number()
    .int()
    .min(1)
    .max(3)
    .default(3)
    .describe('Number of columns in the grid layout'),
  
  gap: z
    .number()
    .min(0)
    .max(40)
    .default(16)
    .describe('Gap between images in pixels'),
  
  padding: z
    .number()
    .min(0)
    .max(40)
    .default(16)
    .describe('Padding around the grid in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    stripCount,
    stripDuration,
    stripStagger,
    imageStagger,
    brightnessStart,
    brightnessEnd,
    gridColumns,
    gap,
    padding,
  } = params;

  // Calculate total duration for the entire animation
  const singleImageRevealDuration = stripCount * stripStagger + stripDuration;
  const totalDuration = images.length * imageStagger + singleImageRevealDuration;

  const childrenData: RenderableComponentData[] = [];

  // Create each image slot
  images.forEach((image, imageIndex) => {
    const imageStartTime = imageIndex * imageStagger;
    const imageId = `venetian-image-${imageIndex}`;
    
    // Create strips for this image
    const stripChildren: RenderableComponentData[] = [];
    
    for (let stripIndex = 0; stripIndex < stripCount; stripIndex++) {
      const stripId = `${imageId}-strip-${stripIndex}`;
      const isOddStrip = stripIndex % 2 === 0;
      
      // Calculate strip height and position
      const stripHeightPercent = 100 / stripCount;
      const topPositionPercent = stripIndex * stripHeightPercent;
      
      // Calculate timing for this strip
      const stripStartTime = stripIndex * stripStagger;
      
      // Determine slide direction
      const translateXStart = isOddStrip ? '-100%' : '100%';
      
      // Create the strip as a container with the image inside
      const stripContainer: RenderableComponentData = {
        id: stripId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full overflow-hidden',
            style: {
              height: `${stripHeightPercent}%`,
              top: `${topPositionPercent}%`,
            },
          },
        },
        context: {
          timing: {
            start: stripStartTime,
            duration: stripDuration + (stripCount - stripIndex) * stripStagger,
          },
        },
        childrenData: [
          {
            id: `${stripId}-image`,
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: image.src,
              className: 'w-full h-full object-cover',
              style: {
                objectPosition: 'center',
                position: 'absolute',
                width: '100%',
                height: `${stripCount * 100}%`,
                top: `${-stripIndex * 100}%`,
                left: '0',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: stripDuration,
              },
            },
          } as RenderableComponentData,
        ],
        effects: [
          // Slide animation
          {
            id: `${stripId}-slide`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: stripDuration,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'translateX', val: translateXStart, prog: 0 },
                { key: 'translateX', val: '0%', prog: 1 },
              ],
            },
          },
          // Brightness animation
          {
            id: `${stripId}-brightness`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: stripDuration,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'brightness', val: brightnessStart, prog: 0 },
                { key: 'brightness', val: brightnessEnd, prog: 1 },
              ],
            },
          },
        ],
      };
      
      stripChildren.push(stripContainer);
    }
    
    // Create the image slot container
    const imageSlot: RenderableComponentData = {
      id: imageId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full overflow-hidden',
        },
      },
      context: {
        timing: {
          start: imageStartTime,
          duration: singleImageRevealDuration + stripStagger,
        },
      },
      childrenData: stripChildren,
    };
    
    childrenData.push(imageSlot);
  });

  // Create the root grid container
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blind-collage-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: `${gap}px`,
          padding: `${padding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'venetian-blind-collage-reveal',
  title: 'Venetian Blind Photo Collage Reveal',
  description:
    'Sophisticated photo collage reveal using venetian blind effect where images slide in as horizontal strips that assemble into complete photos with alternating directions and precision timing',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'venetian-blind',
    'collage',
    'photo',
    'reveal',
    'strips',
    'mechanical',
    'grid',
    'transition',
  ],
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600',
      },
      {
        src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600',
      },
      {
        src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600',
      },
    ],
    stripCount: 7,
    stripDuration: 0.6,
    stripStagger: 0.05,
    imageStagger: 0.2,
    brightnessStart: 0.7,
    brightnessEnd: 1,
    gridColumns: 3,
    gap: 16,
    padding: 16,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const venetianBlindCollageRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
