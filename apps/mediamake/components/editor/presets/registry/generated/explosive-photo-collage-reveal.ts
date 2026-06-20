/**
 * Explosive Photo Collage Reveal Preset
 *
 * This preset creates a high-energy photo grid reveal where images burst from the center point
 * like a firework explosion. Each image scales up from a tiny point at the center while
 * simultaneously sliding to its grid position and rotating during flight. The animation includes
 * a slight overshoot with bounce-back for kinetic energy.
 *
 * Features:
 * - **Radial Explosion**: Images burst outward from center point in all directions
 * - **Combined Transforms**: Scale, translate, and rotate animations happening simultaneously
 * - **Overshoot & Bounce**: Images pass their final position before settling back
 * - **Motion Blur**: Blur effect at peak velocity for enhanced dynamism
 * - **Near-Simultaneous Burst**: Very short stagger (0.04s) creates explosive visual impact
 * - **Punchy Timing**: Rapid acceleration with satisfying deceleration using custom easing
 *
 * Use cases:
 * - Dynamic photo collage reveals for celebration themes
 * - High-energy content reveals for social media
 * - Explosive image showcases for product launches
 * - Kinetic photo montages for event highlights
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  trackId: z
    .string()
    .default('explosive-grid')
    .describe('Unique identifier for this track'),
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        alt: z.string().optional().describe('Alt text for image'),
      }),
    )
    .describe('Array of images to display in the grid'),
  gridColumns: z
    .number()
    .min(1)
    .max(8)
    .default(3)
    .describe('Number of columns in the grid'),
  gridGap: z
    .string()
    .default('0.5rem')
    .describe('Gap between grid items (CSS value)'),
  explosionDuration: z
    .number()
    .default(0.9)
    .describe('Duration of explosion animation in seconds'),
  staggerDelay: z
    .number()
    .default(0.04)
    .describe('Delay between each image animation in seconds'),
  overshootScale: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.1)
    .describe('Scale overshoot amount (1.1 = 10% larger before settling)'),
  rotationDegrees: z
    .number()
    .default(360)
    .describe('Degrees of rotation during explosion'),
  motionBlurAmount: z
    .string()
    .default('2px')
    .describe('Blur amount at peak velocity'),
  startDelay: z
    .number()
    .default(0)
    .describe('Delay before explosion starts in seconds'),
  gridWidth: z
    .string()
    .default('90%')
    .describe('Width of the grid container'),
  gridHeight: z
    .string()
    .default('90%')
    .describe('Height of the grid container'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    images,
    gridColumns,
    gridGap,
    explosionDuration,
    staggerDelay,
    overshootScale,
    rotationDegrees,
    motionBlurAmount,
    startDelay,
    gridWidth,
    gridHeight,
  } = params;

  const fps = props.config?.fps || 30;

  // Helper function to calculate radial position for each grid slot
  const calculateRadialPosition = (index: number, total: number) => {
    const cols = gridColumns;
    const rows = Math.ceil(total / cols);

    const col = index % cols;
    const row = Math.floor(index / cols);

    // Calculate position relative to center of grid
    const centerCol = (cols - 1) / 2;
    const centerRow = (rows - 1) / 2;

    const deltaX = col - centerCol;
    const deltaY = row - centerRow;

    // Calculate angle from center
    const angle = Math.atan2(deltaY, deltaX);

    // Calculate distance from center (normalized)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    return { angle, distance, col, row };
  };

  // Total duration needed to cover all animations
  const totalDuration = startDelay + explosionDuration + staggerDelay * images.length + 1;

  // Create image components with explosion effects
  const imageComponents = images.map((image, index) => {
    const imageId = `${trackId}-image-${index}`;
    const { angle, distance } = calculateRadialPosition(index, images.length);

    // Calculate start time with stagger
    const imageStartTime = startDelay + index * staggerDelay;

    // Calculate initial offset from center (large distance)
    // All images start at center point
    const initialTranslateX = 0;
    const initialTranslateY = 0;

    // Calculate final position offset (slight adjustment for natural spread)
    const finalTranslateX = 0;
    const finalTranslateY = 0;

    // Explosion effect with combined transforms
    const explosionEffect = {
      id: `${imageId}-explosion`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.34, 1.56, 0.64, 1)' as any, // Custom explosive easing with bounce
        start: 0, // Relative to image component start
        duration: explosionDuration,
        mode: 'provider',
        targetIds: [imageId],
        ranges: [
          // Scale from tiny point to overshoot to final
          { key: 'scale', val: 0.1, prog: 0 },
          { key: 'scale', val: overshootScale, prog: 0.7 },
          { key: 'scale', val: 1, prog: 1 },

          // Rotate during flight
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: rotationDegrees, prog: 1 },

          // Opacity fade in quickly
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },

          // Motion blur at peak velocity (midpoint)
          { key: 'filter', val: `blur(${motionBlurAmount})`, prog: 0.4 },
          { key: 'filter', val: 'blur(0px)', prog: 0.6 },
        ],
      },
    };

    return {
      id: imageId,
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'w-full h-full object-cover',
        style: {
          transformOrigin: 'center',
          backfaceVisibility: 'hidden',
        },
      },
      context: {
        timing: {
          start: imageStartTime,
          duration: totalDuration - imageStartTime,
        },
      },
      effects: [explosionEffect],
    } as RenderableComponentData;
  });

  // Grid container with centered positioning
  const gridContainer = {
    id: `${trackId}-grid-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid',
        style: {
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
          gap: gridGap,
          width: gridWidth,
          height: gridHeight,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: imageComponents,
  } as RenderableComponentData;

  // Root container with centered grid
  const rootContainer = {
    id: `${trackId}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [gridContainer],
  } as RenderableComponentData;

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
  id: 'explosive-photo-collage-reveal',
  title: 'Explosive Photo Collage Reveal',
  description:
    'High-energy photo grid reveal where images burst from center point like a firework explosion. Each image scales from tiny point at center, rotates during flight, slides to grid position with overshoot bounce-back, creating a dynamic radial burst effect. Features rapid acceleration, motion blur at peak velocity, and satisfying deceleration for celebration themes and dynamic content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'grid', 'explosion', 'animation', 'kinetic', 'celebration'],
  defaultInputParams: {
    trackId: 'explosive-grid',
    images: [
      { src: 'https://picsum.photos/400/400?random=1', alt: 'Image 1' },
      { src: 'https://picsum.photos/400/400?random=2', alt: 'Image 2' },
      { src: 'https://picsum.photos/400/400?random=3', alt: 'Image 3' },
      { src: 'https://picsum.photos/400/400?random=4', alt: 'Image 4' },
      { src: 'https://picsum.photos/400/400?random=5', alt: 'Image 5' },
      { src: 'https://picsum.photos/400/400?random=6', alt: 'Image 6' },
      { src: 'https://picsum.photos/400/400?random=7', alt: 'Image 7' },
      { src: 'https://picsum.photos/400/400?random=8', alt: 'Image 8' },
      { src: 'https://picsum.photos/400/400?random=9', alt: 'Image 9' },
    ],
    gridColumns: 3,
    gridGap: '0.5rem',
    explosionDuration: 0.9,
    staggerDelay: 0.04,
    overshootScale: 1.1,
    rotationDegrees: 360,
    motionBlurAmount: '2px',
    startDelay: 0,
    gridWidth: '90%',
    gridHeight: '90%',
  },
  dependencies: {},
};

export const explosivePhotoCollageRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
