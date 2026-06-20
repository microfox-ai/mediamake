/**
 * Organic Photo Collage Reveal Preset
 *
 * A fluid, physics-inspired photo grid where images flow into position using curved motion paths,
 * ripple effects on neighbors, and desaturation-to-color transitions. Creates a natural, ecosystem-like
 * organization with water-filling dynamics.
 *
 * Features:
 * - Curved motion paths using bezier-like keyframes
 * - Wave-like arcs rather than straight lines
 * - Ripple effects on neighboring images
 * - Desaturation to full color transition during movement
 * - Subtle rotation oscillation for fluid feel
 * - Physics-based timing where early arrivals affect later paths
 * - Transform-style preserve-3d for depth
 *
 * Use cases:
 * - Creating organic photo reveals
 * - Building living, breathing image grids
 * - Ecosystem-like visual organization
 * - Fluid water-filling animations
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
        alt: z.string().optional().describe('Alt text for accessibility'),
      }),
    )
    .describe('Array of images to display in the collage'),
  gridCols: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of grid columns'),
  gridRows: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Number of grid rows (auto if not specified)'),
  gap: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between images in pixels'),
  padding: z
    .number()
    .min(0)
    .max(100)
    .default(24)
    .describe('Container padding in pixels'),
  animationDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.4)
    .describe('Duration of each image animation in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Delay between each image animation in seconds'),
  rippleIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.02)
    .describe('Intensity of ripple effect (0-1)'),
  rotationAmount: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .describe('Maximum rotation oscillation in degrees'),
  trackId: z
    .string()
    .default('organic-photo-collage')
    .describe('Unique identifier for this track'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    gridCols,
    gridRows,
    gap,
    padding,
    animationDuration,
    staggerDelay,
    rippleIntensity,
    rotationAmount,
    trackId,
  } = params;

  // Calculate grid dimensions
  const totalImages = images.length;
  const actualRows = gridRows || Math.ceil(totalImages / gridCols);

  // Calculate total duration
  const totalAnimationTime =
    totalImages * staggerDelay + animationDuration + 0.5; // Extra settle time

  // Helper: Generate curved motion path keyframes
  const generateCurvedPath = (
    index: number,
    col: number,
    row: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    // Different entry points and arc patterns for variety
    const entryPatterns = [
      { startX: -120, startY: -80, midX: -40, midY: 60 }, // Top-left arc
      { startX: 120, startY: -100, midX: 50, midY: 50 }, // Top-right arc
      { startX: -100, startY: 120, midX: -30, midY: -50 }, // Bottom-left arc
      { startX: 100, startY: 100, midX: 40, midY: -60 }, // Bottom-right arc
      { startX: 0, startY: -150, midX: -60, midY: -40 }, // Top center arc
      { startX: -150, startY: 0, midX: 30, midY: -30 }, // Left center arc
    ];

    const pattern = entryPatterns[index % entryPatterns.length];

    return [
      // Start position (off-screen)
      { key: 'translateX', val: pattern.startX, prog: 0 },
      { key: 'translateY', val: pattern.startY, prog: 0 },
      // Arc midpoint 1
      { key: 'translateX', val: pattern.midX, prog: 0.3 },
      { key: 'translateY', val: pattern.midY, prog: 0.3 },
      // Arc midpoint 2 (approach)
      { key: 'translateX', val: pattern.midX * 0.3, prog: 0.6 },
      { key: 'translateY', val: pattern.midY * 0.3, prog: 0.6 },
      // Final position
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 1 },
    ];
  };

  // Helper: Generate rotation oscillation
  const generateRotation = (index: number) => {
    const rotationDirection = index % 2 === 0 ? 1 : -1;
    const maxRotation = rotationAmount * rotationDirection;

    return [
      { key: 'rotate', val: maxRotation * 2, prog: 0 },
      { key: 'rotate', val: maxRotation * 0.8, prog: 0.3 },
      { key: 'rotate', val: -maxRotation * 0.3, prog: 0.6 },
      { key: 'rotate', val: 0, prog: 1 },
    ];
  };

  // Helper: Generate desaturation effect
  const generateDesaturation = () => {
    return [
      { key: 'filter', val: 'grayscale(0.8)', prog: 0 },
      { key: 'filter', val: 'grayscale(0.4)', prog: 0.5 },
      { key: 'filter', val: 'grayscale(0)', prog: 1 },
    ];
  };

  // Helper: Calculate ripple timing for neighbors
  const calculateRippleDelay = (
    currentIndex: number,
    targetIndex: number,
  ): number => {
    const currentCol = currentIndex % gridCols;
    const currentRow = Math.floor(currentIndex / gridCols);
    const targetCol = targetIndex % gridCols;
    const targetRow = Math.floor(targetIndex / gridCols);

    const distance = Math.sqrt(
      Math.pow(currentCol - targetCol, 2) + Math.pow(currentRow - targetRow, 2),
    );

    // Ripple propagates at a fixed speed
    return distance * 0.1; // 0.1s per grid unit
  };

  // Generate image components
  const imageComponents: RenderableComponentData[] = images.map(
    (image, index) => {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);

      // Staggered start time (row-major order with column offset)
      const baseDelay = row * gridCols * staggerDelay + col * staggerDelay;

      const imageId = `${trackId}-image-${index}`;

      // Main animation effect (curved path + rotation + desaturation)
      const mainEffect = {
        id: `${imageId}-main-anim`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: baseDelay,
          duration: animationDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            // Opacity
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
            // Curved motion path
            ...generateCurvedPath(index, col, row),
            // Rotation oscillation
            ...generateRotation(index),
            // Desaturation
            ...generateDesaturation(),
          ],
        },
      };

      // Ripple effects from neighboring images
      const rippleEffects = images
        .slice(0, index)
        .map((_, prevIndex) => {
          const prevCol = prevIndex % gridCols;
          const prevRow = Math.floor(prevIndex / gridCols);

          // Check if within ripple range (adjacent or diagonal)
          const colDist = Math.abs(col - prevCol);
          const rowDist = Math.abs(row - prevRow);
          const isNeighbor = colDist <= 1 && rowDist <= 1 && prevIndex !== index;

          if (!isNeighbor) return null;

          const prevBaseDelay =
            prevRow * gridCols * staggerDelay + prevCol * staggerDelay;
          const rippleDelay = calculateRippleDelay(prevIndex, index);
          const rippleStart = prevBaseDelay + animationDuration * 0.7 + rippleDelay;

          return {
            id: `${imageId}-ripple-from-${prevIndex}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: rippleStart,
              duration: 0.3,
              mode: 'provider',
              targetIds: [imageId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1 - rippleIntensity, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          };
        })
        .filter(Boolean);

      return {
        id: imageId,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image.src,
          className: 'w-full h-full object-cover rounded-sm',
          style: {
            willChange: 'transform, filter',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalAnimationTime,
          },
        },
        effects: [mainEffect, ...rippleEffects],
      } as RenderableComponentData;
    },
  );

  // Grid container
  const gridContainer: RenderableComponentData = {
    id: `${trackId}-grid-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid',
        style: {
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gap: `${gap}px`,
          padding: `${padding}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalAnimationTime,
      },
    },
    childrenData: imageComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalAnimationTime,
      },
    },
    childrenData: [gridContainer],
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

const presetMetadata: PresetMetadata = {
  id: 'organic-photo-collage-reveal',
  title: 'Organic Photo Collage Reveal',
  description:
    'A fluid, physics-inspired photo grid where images flow into position using curved motion paths, ripple effects on neighbors, and desaturation-to-color transitions. Creates a natural, ecosystem-like organization with water-filling dynamics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'image',
    'collage',
    'grid',
    'organic',
    'fluid',
    'physics',
    'animation',
    'ripple',
    'curved-motion',
  ],
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        alt: 'Mountain landscape',
      },
      {
        src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
        alt: 'Forest scene',
      },
      {
        src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff',
        alt: 'Nature trail',
      },
      {
        src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
        alt: 'Sunset',
      },
      {
        src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e',
        alt: 'Coastal view',
      },
      {
        src: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29',
        alt: 'Lake',
      },
    ],
    gridCols: 3,
    gap: 8,
    padding: 24,
    animationDuration: 1.4,
    staggerDelay: 0.15,
    rippleIntensity: 0.02,
    rotationAmount: 5,
    trackId: 'organic-photo-collage',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const organicPhotoCollageRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
