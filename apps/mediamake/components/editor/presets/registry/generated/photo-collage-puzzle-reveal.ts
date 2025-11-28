/**
 * Photo Collage Puzzle Reveal Preset
 *
 * This preset creates an animated photo collage where images slide in from scattered
 * off-screen positions like magnetized puzzle pieces converging to form a grid. Each
 * image starts from a random position outside the viewport and slides toward its final
 * position in the grid with spring-based easing that provides natural momentum.
 *
 * Features:
 * - **Random Off-Screen Start Positions**: Images begin at random positions between
 *   -200% to 200% from viewport edges, creating varied entry angles
 * - **Convergence Animation**: All images move toward their final grid positions,
 *   creating an implosion/magnetized effect converging toward center
 * - **Blur-to-Focus Transition**: Each image starts with 8px blur that reduces to 0px
 *   as it approaches its destination, simulating depth of field changes
 * - **Spring-Based Easing**: Uses cubic-bezier(0.68, -0.55, 0.265, 1.55) for organic,
 *   bouncy motion that feels natural and fluid
 * - **Staggered Timing**: Animations are staggered with 0.08s delays radiating from
 *   center outward, creating a wave-like reveal pattern
 * - **Lock-In Pulse**: Subtle scale pulse (1.0 → 1.05 → 1.0) when each image reaches
 *   its final position, emphasizing the "snap into place" moment
 * - **Backdrop Blur**: Images have backdrop-blur-sm during motion for visual polish
 *
 * Use cases:
 * - Creating dynamic photo collages with kinetic energy
 * - Building visual stories where each photo contributes to a narrative
 * - Presenting image galleries with impactful reveal animations
 * - Assembling photo grids with organic, fluid motion
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
      }),
    )
    .min(1)
    .max(16)
    .describe('Array of images to display in the collage (1-16 images)'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Total duration of the reveal animation in seconds'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .describe('Duration for each image to slide into position (seconds)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.08)
    .describe('Delay between each image animation start (seconds)'),
  gridGap: z
    .number()
    .min(0)
    .max(50)
    .default(12)
    .describe('Gap between grid items in pixels'),
  trackId: z
    .string()
    .default('photo-collage-reveal')
    .describe('Unique ID for this collage track'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    duration,
    transitionDuration,
    staggerDelay,
    gridGap,
    trackId,
  } = params;

  // Helper: Generate random off-screen position (-200% to 200%)
  const generateRandomPosition = (index: number): { x: number; y: number } => {
    // Use index as seed for pseudo-random but consistent positions
    const seed = index * 137.508; // Golden angle for distribution
    const angle = (seed % 360) * (Math.PI / 180);
    const distance = 200 + (index % 3) * 50; // Vary distance 200-300%
    
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Helper: Calculate grid dimensions based on image count
  const calculateGridLayout = (
    count: number,
  ): { cols: number; rows: number } => {
    if (count === 1) return { cols: 1, rows: 1 };
    if (count <= 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 4, rows: 3 };
    return { cols: 4, rows: 4 };
  };

  // Helper: Calculate stagger delay based on distance from center
  const calculateStaggerDelay = (
    index: number,
    cols: number,
    rows: number,
  ): number => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const centerCol = (cols - 1) / 2;
    const centerRow = (rows - 1) / 2;
    
    // Calculate Euclidean distance from center
    const distance = Math.sqrt(
      Math.pow(col - centerCol, 2) + Math.pow(row - centerRow, 2),
    );
    
    return distance * staggerDelay;
  };

  const { cols, rows } = calculateGridLayout(images.length);
  
  // Generate image slots with effects
  const imageSlots: RenderableComponentData[] = images.map((image, index) => {
    const startPos = generateRandomPosition(index);
    const delay = calculateStaggerDelay(index, cols, rows);
    const imageSlotId = `${trackId}-image-slot-${index}`;
    const imageAtomId = `${trackId}-image-${index}`;

    // Convergence animation (slide + blur)
    const convergenceEffect = {
      id: `${trackId}-convergence-${index}`,
      componentId: 'generic',
      data: {
        type: 'spring' as const,
        start: delay,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [imageSlotId],
        ranges: [
          // Slide from random off-screen position to final position
          { key: 'translateX', val: `${startPos.x}%`, prog: 0 },
          { key: 'translateX', val: '0%', prog: 1 },
          { key: 'translateY', val: `${startPos.y}%`, prog: 0 },
          { key: 'translateY', val: '0%', prog: 1 },
          // Blur-to-focus transition
          { key: 'filter', val: 'blur(8px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    };

    // Lock-in pulse animation
    const pulseEffect = {
      id: `${trackId}-pulse-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: delay + transitionDuration,
        duration: 0.3,
        mode: 'provider' as const,
        targetIds: [imageSlotId],
        ranges: [
          { key: 'scale', val: 1.0, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 1.0, prog: 1 },
        ],
      },
    };

    return {
      id: imageSlotId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative rounded-lg overflow-hidden shadow-lg backdrop-blur-sm',
          style: {},
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [convergenceEffect, pulseEffect],
      childrenData: [
        {
          id: imageAtomId,
          type: 'atom' as const,
          componentId: 'ImageAtom',
          data: {
            src: image.src,
            fit: 'cover',
            className: 'w-full h-full',
            style: {},
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
      ] as RenderableComponentData[],
    } as RenderableComponentData;
  });

  // Grid container
  const gridContainer: RenderableComponentData = {
    id: `${trackId}-grid-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid',
        style: {
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: '1fr',
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
    childrenData: imageSlots,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [gridContainer],
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
  id: 'photo-collage-puzzle-reveal',
  title: 'Photo Collage Puzzle Reveal',
  description:
    'Animated photo collage where images slide in from scattered off-screen positions like magnetized puzzle pieces converging to form a grid. Features spring-based easing, blur-to-focus transitions simulating depth of field, and subtle scale pulse on lock-in. Staggered animations radiate from center outward creating an organic implosion effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'photo',
    'collage',
    'puzzle',
    'reveal',
    'grid',
    'convergence',
    'implosion',
    'spring',
    'blur',
    'magnetized',
    'kinetic',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&h=600&fit=crop' },
    ],
    duration: 3,
    transitionDuration: 1.2,
    staggerDelay: 0.08,
    gridGap: 12,
    trackId: 'photo-collage-reveal',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const photoCollagePuzzleRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
