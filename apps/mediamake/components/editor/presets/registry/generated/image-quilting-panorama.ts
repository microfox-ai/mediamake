/**
 * Dynamic Image Quilting Panorama Preset
 *
 * This preset creates a stunning video wall installation effect where images start scattered
 * and rotated at random angles across the screen, then magnetically snap together like puzzle
 * pieces to form a cohesive panoramic mosaic with 3D perspective transforms and depth layers.
 *
 * Features:
 * - **Scattered Entry**: Images start at random positions and angles off-screen
 * - **Magnetic Snapping**: Each image animates to its grid position with ease-out timing
 * - **Staggered Animation**: Layer-based timing like After Effects (0s, 0.2s, 0.4s, etc.)
 * - **3D Perspective**: Subtle rotateY transforms create depth during assembly
 * - **Depth Layers**: Z-index and scale variations (0.95-1.05) for parallax effect
 * - **Panoramic Pan**: Once assembled, the entire quilt pans across the screen
 * - **Parallax Scrolling**: Background layers move slower than foreground layers
 *
 * Use cases:
 * - Creating dynamic video wall installations
 * - Building motion graphics showcases
 * - Creating photo mosaic animations
 * - Building panoramic image reveals
 * - Creating layered depth effects
 */

import { z } from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  images: z
    .array(z.string())
    .min(6)
    .max(12)
    .describe('Array of 6-12 image URLs to form the quilting mosaic'),

  duration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Total duration of the animation in seconds'),

  assemblyDuration: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe(
      'Duration for images to snap together (starts at beginning, ends at this time)',
    ),

  panDuration: z
    .number()
    .min(3)
    .max(15)
    .default(6)
    .describe(
      'Duration of the panoramic pan after assembly (starts after assemblyDuration)',
    ),

  gridColumns: z
    .number()
    .min(2)
    .max(4)
    .default(3)
    .describe('Number of columns in the grid layout'),

  gridRows: z
    .number()
    .min(2)
    .max(4)
    .default(2)
    .describe('Number of rows in the grid layout'),

  panDistance: z
    .number()
    .min(-500)
    .max(500)
    .default(-200)
    .describe(
      'Distance to pan the entire quilt in pixels (negative = left, positive = right)',
    ),

  staggerDelay: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Delay between each image animation start in seconds'),

  scatterDistance: z
    .number()
    .min(100)
    .max(400)
    .default(200)
    .describe(
      'Maximum distance images scatter from their final position in pixels',
    ),

  rotationRange: z
    .number()
    .min(10)
    .max(45)
    .default(30)
    .describe('Maximum rotation angle for scattered images in degrees'),

  perspectiveRotation: z
    .number()
    .min(5)
    .max(20)
    .default(15)
    .describe('Maximum 3D perspective rotation (rotateY) in degrees'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Get random sign
  const randomSign = (): number => {
    return Math.random() > 0.5 ? 1 : -1;
  };

  // Calculate grid dimensions
  const cols = params.gridColumns;
  const rows = params.gridRows;
  const totalCells = cols * rows;
  const imageCount = Math.min(params.images.length, totalCells);

  // Grid cell dimensions (percentage)
  const cellWidth = 100 / cols;
  const cellHeight = 100 / rows;

  // Build image components with scatter and snap effects
  const imageComponents: RenderableComponentData[] = [];

  for (let i = 0; i < imageCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Final grid position
    const finalTop = row * cellHeight;
    const finalLeft = col * cellWidth;

    // Random scatter values
    const scatterX = randomSign() * randomInRange(150, params.scatterDistance);
    const scatterY = randomSign() * randomInRange(100, params.scatterDistance);
    const scatterRotateZ = randomSign() * randomInRange(15, params.rotationRange);
    const scatterRotateY = randomSign() * randomInRange(5, params.perspectiveRotation);

    // Depth layer (z-index and scale variations)
    const zIndex = Math.floor(randomInRange(1, 4)); // 1-3
    const finalScale = randomInRange(0.95, 1.05);

    // Staggered start time
    const imageStart = i * params.staggerDelay;
    const snapDuration = 2; // Fixed 2s snap animation

    const imageId = `image-${i}`;

    // Create scatter-to-grid effect
    const scatterEffect = {
      id: `scatter-effect-${i}`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [imageId],
        type: 'ease-out',
        start: imageStart,
        duration: snapDuration,
        ranges: [
          { key: 'translateX', val: scatterX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: scatterY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'rotateZ', val: scatterRotateZ, prog: 0 },
          { key: 'rotateZ', val: 0, prog: 1 },
          { key: 'rotateY', val: scatterRotateY, prog: 0 },
          { key: 'rotateY', val: 0, prog: 1 },
          { key: 'scale', val: 0.95, prog: 0 },
          { key: 'scale', val: finalScale, prog: 1 },
        ],
      },
    };

    // Parallax effect during pan (based on z-index)
    // Higher z-index = foreground = faster movement
    // Lower z-index = background = slower movement
    const parallaxMultiplier = zIndex === 3 ? 1.5 : zIndex === 2 ? 1.0 : 0.5;
    const parallaxDistance = params.panDistance * parallaxMultiplier * 0.4; // Scale down individual parallax

    const parallaxEffect = {
      id: `parallax-effect-${i}`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [imageId],
        type: 'linear',
        start: params.assemblyDuration,
        duration: params.panDuration,
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: parallaxDistance, prog: 1 },
        ],
      },
    };

    // Image component
    const imageComponent: RenderableComponentData = {
      id: imageId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: params.images[i],
        className: 'absolute w-full h-full object-cover',
        style: {
          transformStyle: 'preserve-3d',
          top: `${finalTop}%`,
          left: `${finalLeft}%`,
          width: `${cellWidth}%`,
          height: `${cellHeight}%`,
          zIndex,
        },
      },
      context: {
        timing: {
          start: imageStart,
          duration: params.duration - imageStart,
        },
      },
      effects: [scatterEffect, parallaxEffect],
    };

    imageComponents.push(imageComponent);
  }

  // Quilting container (holds all images)
  const quiltingContainer: RenderableComponentData = {
    id: 'quilting-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: imageComponents,
    effects: [
      // Pan the entire container after assembly
      {
        id: 'panorama-pan-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['quilting-container'],
          type: 'linear',
          start: params.assemblyDuration,
          duration: params.panDuration,
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: params.panDistance, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root perspective container
  const rootContainer: RenderableComponentData = {
    id: 'root-perspective-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [quiltingContainer],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'image-quilting-panorama',
  title: 'Dynamic Image Quilting Panorama',
  description:
    'Images start scattered and rotated at random angles, then magnetically snap together like puzzle pieces to form a cohesive panoramic mosaic with 3D perspective transforms. Once assembled, the entire quilt slowly pans across the screen with parallax depth effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'quilting', 'mosaic', 'panorama', '3d', 'parallax', 'motion-graphics'],
  dependencies: {},
  defaultInputParams: {
    images: [
      'https://picsum.photos/seed/1/800/600',
      'https://picsum.photos/seed/2/800/600',
      'https://picsum.photos/seed/3/800/600',
      'https://picsum.photos/seed/4/800/600',
      'https://picsum.photos/seed/5/800/600',
      'https://picsum.photos/seed/6/800/600',
    ],
    duration: 10,
    assemblyDuration: 4,
    panDuration: 6,
    gridColumns: 3,
    gridRows: 2,
    panDistance: -200,
    staggerDelay: 0.2,
    scatterDistance: 200,
    rotationRange: 30,
    perspectiveRotation: 15,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const imageQuiltingPanoramaPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
