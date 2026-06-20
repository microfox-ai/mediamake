/**
 * Depth-Focused 3D Photo Collage Reveal Preset
 *
 * Creates a cinematic photo collage reveal where images slide into a 3D grid with perspective
 * and depth layering. Images start far away (small, blurred) and slide forward to their grid
 * positions, building the composition from back to front. Features:
 *
 * - 3D perspective space with z-axis movement
 * - Depth-based layering (corners = back, center = front)
 * - Depth of field simulation (blur-to-sharp transition)
 * - Approach animation with scale and position
 * - Subtle perspective rotation based on grid position
 * - Fog overlay that clears as images approach
 * - Shadow intensity increasing with proximity
 * - Staggered timing for sequential reveal
 *
 * Use cases:
 * - Cinematic photo reveals
 * - Portfolio presentations
 * - Memory/photo albums
 * - Immersive gallery experiences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
      }),
    )
    .length(9)
    .describe('Exactly 9 images for the 3x3 grid'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Total duration of the reveal animation in seconds'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('3D perspective distance in pixels'),
  startDistance: z
    .number()
    .min(300)
    .max(1000)
    .default(500)
    .describe('Initial z-distance of images (pixels)'),
  depthRange: z
    .tuple([z.number(), z.number()])
    .default([0, 200])
    .describe('Z-position range for final depth layers [min, max]'),
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Initial blur amount for depth of field (pixels)'),
  rotationAmount: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum rotation amount for perspective enhancement (degrees)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between each image reveal (seconds)'),
  fogDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Duration of fog clearing effect (seconds)'),
  gridGap: z
    .number()
    .min(0)
    .max(32)
    .default(16)
    .describe('Gap between grid items in pixels'),
});

// Main preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    duration,
    perspective,
    startDistance,
    depthRange,
    blurAmount,
    rotationAmount,
    staggerDelay,
    fogDuration,
    gridGap,
  } = params;

  // Calculate depth layers based on grid position
  // Grid positions (0-8):
  // 0 1 2
  // 3 4 5
  // 6 7 8
  // Corners (0,2,6,8) = back, edges (1,3,5,7) = mid, center (4) = front
  const calculateDepth = (index: number): number => {
    const depthMap: Record<number, number> = {
      0: depthRange[0], // top-left corner (back)
      1: depthRange[0] + (depthRange[1] - depthRange[0]) * 0.33, // top edge
      2: depthRange[0], // top-right corner (back)
      3: depthRange[0] + (depthRange[1] - depthRange[0]) * 0.33, // left edge
      4: depthRange[1], // center (front)
      5: depthRange[0] + (depthRange[1] - depthRange[0]) * 0.33, // right edge
      6: depthRange[0], // bottom-left corner (back)
      7: depthRange[0] + (depthRange[1] - depthRange[0]) * 0.33, // bottom edge
      8: depthRange[0], // bottom-right corner (back)
    };
    return depthMap[index] || depthRange[0];
  };

  // Calculate effect duration based on depth (distant = longer)
  const calculateEffectDuration = (finalZ: number): number => {
    const normalized = (finalZ - depthRange[0]) / (depthRange[1] - depthRange[0]);
    return 0.8 + normalized * 0.7; // 0.8s (front) to 1.5s (back)
  };

  // Calculate rotation based on grid position
  const calculateRotation = (
    index: number,
  ): { rotateX: number; rotateY: number } => {
    const row = Math.floor(index / 3);
    const col = index % 3;

    // Calculate rotation based on position from center
    const rotateX = (row - 1) * rotationAmount * -1; // -rotationAmount, 0, rotationAmount
    const rotateY = (col - 1) * rotationAmount; // -rotationAmount, 0, rotationAmount

    return { rotateX, rotateY };
  };

  // Create image components with approach effects
  const imageComponents = images.map((image, index) => {
    const finalZ = calculateDepth(index);
    const effectDuration = calculateEffectDuration(finalZ);
    const { rotateX, rotateY } = calculateRotation(index);
    const effectStart = index * staggerDelay;

    const imageId = `depth-photo-${index}`;

    return {
      id: imageId,
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'w-full h-full object-cover rounded-lg',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${imageId}-approach`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: effectStart,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [imageId],
            ranges: [
              // Z-axis approach
              { key: 'translateZ', val: -startDistance, prog: 0 },
              { key: 'translateZ', val: finalZ, prog: 1 },
              // Scale adjustment for perspective
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Depth of field blur
              { key: 'blur', val: blurAmount, prog: 0 },
              { key: 'blur', val: 0, prog: 1 },
              // Perspective rotation (if not zero)
              ...(rotateX !== 0
                ? [
                    { key: 'rotateX', val: rotateX, prog: 0 },
                    { key: 'rotateX', val: 0, prog: 1 },
                  ]
                : []),
              ...(rotateY !== 0
                ? [
                    { key: 'rotateY', val: rotateY, prog: 0 },
                    { key: 'rotateY', val: 0, prog: 1 },
                  ]
                : []),
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Grid container with 3D transform style
  const gridContainer: RenderableComponentData = {
    id: 'depth-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid grid-cols-3 grid-rows-3 w-full h-full p-8',
        style: {
          transformStyle: 'preserve-3d',
          gap: `${gridGap}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: imageComponents,
  };

  // Fog overlay that clears as images approach
  const fogOverlay: RenderableComponentData = {
    id: 'depth-fog-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background:
          'radial-gradient(ellipse at center, rgba(255,255,255,0) 0%, rgba(200,200,200,0.3) 100%)',
        zIndex: 1000,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'fog-clear-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: fogDuration,
          mode: 'provider',
          targetIds: ['depth-fog-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root perspective container
  const rootContainer: RenderableComponentData = {
    id: 'depth-photo-collage-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [fogOverlay, gridContainer],
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
  id: 'depth-photo-collage-reveal',
  title: '3D Depth Photo Collage Reveal',
  description:
    'A cinematic photo collage with 3D depth and perspective. Images slide into a grid from far away (small, blurred) to their final positions (sharp, close), building from back to front. Features depth of field simulation, parallax effects, and z-axis movement creating an immersive viewfinder experience.',
  type: 'predefined',
  presetType: 'children',
  tags: ['3d', 'depth', 'photo', 'collage', 'grid', 'perspective', 'cinematic'],
  defaultInputParams: {
    images: [
      { src: '{{image-1}}' },
      { src: '{{image-2}}' },
      { src: '{{image-3}}' },
      { src: '{{image-4}}' },
      { src: '{{image-5}}' },
      { src: '{{image-6}}' },
      { src: '{{image-7}}' },
      { src: '{{image-8}}' },
      { src: '{{image-9}}' },
    ],
    duration: 3,
    perspective: 1000,
    startDistance: 500,
    depthRange: [0, 200],
    blurAmount: 4,
    rotationAmount: 2,
    staggerDelay: 0.1,
    fogDuration: 2,
    gridGap: 16,
  },
  dependencies: {},
};

// Export preset
export const depthPhotoCollageRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
