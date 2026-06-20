/**
 * Cinematic Film Strip Photo Collage Preset
 *
 * This preset creates a cinematic photo collage reveal that mimics a film strip unrolling
 * horizontally across the screen. Images slide into a grid formation with overlapping arrival,
 * rotation flip effects, and a film grain overlay that fades out.
 *
 * Features:
 * - **Film Strip Aesthetic**: Images arrive as frames on a continuous film reel
 * - **Horizontal Slide-In**: Images slide from right to left with overlapping motion
 * - **3D Rotation Flip**: Each photo flips into place with rotateY animation
 * - **Film Grain Overlay**: Vintage grain texture fades out as collage completes
 * - **Rhythmic Timing**: Staggered arrivals create a musical beat-like rhythm
 * - **Smooth Settlement**: Images scale up slightly as they settle into position
 * - **Perspective Depth**: 3D transforms use perspective for depth perception
 *
 * Use cases:
 * - Creating cinematic photo montages with film aesthetic
 * - Building dynamic image reveals for video intros
 * - Adding vintage film-reel style transitions
 * - Crafting rhythmic photo sequences synchronized to music beats
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
      }),
    )
    .min(1)
    .max(12)
    .describe('Array of images to display in the collage (1-12 images)'),
  gridColumns: z
    .number()
    .int()
    .min(2)
    .max(4)
    .default(3)
    .describe('Number of columns in the grid (2-4)'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(2.5)
    .default(1.0)
    .describe('Duration of slide-in and rotation animation (seconds)'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .describe('Delay between each image arrival (seconds)'),
  filmGrainOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Initial opacity of film grain overlay (0-1)'),
  filmGrainSrc: z
    .string()
    .optional()
    .describe('Optional custom film grain texture URL'),
  collageBackgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color of the collage container (hex or CSS color)'),
  totalDuration: z
    .number()
    .min(3)
    .max(30)
    .default(10)
    .describe('Total duration of the collage animation (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    gridColumns,
    transitionDuration,
    staggerDelay,
    filmGrainOpacity,
    filmGrainSrc,
    collageBackgroundColor,
    totalDuration,
  } = params;

  // Calculate grid rows based on image count and columns
  const gridRows = Math.ceil(images.length / gridColumns);

  // Calculate when film grain should fade out (after all images have settled)
  const lastImageStart = (images.length - 1) * staggerDelay;
  const filmGrainFadeStart = lastImageStart + transitionDuration;
  const filmGrainFadeDuration = Math.min(1.5, totalDuration - filmGrainFadeStart);

  // Build image cells with staggered timing
  const imageCells: RenderableComponentData[] = images.map((image, index) => {
    const cellId = `film-cell-${index}`;
    const imageId = `film-image-${index}`;
    const startTime = index * staggerDelay;

    return {
      id: cellId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative group overflow-hidden rounded-sm',
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: totalDuration - startTime,
        },
      },
      effects: [
        // Horizontal slide-in from right (translateX: 150% -> 0)
        {
          id: `slide-${cellId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [cellId],
            ranges: [
              { key: 'translateX', val: '150%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
            ],
          },
        },
        // 3D rotation flip (rotateY: -25deg -> 0deg)
        {
          id: `rotate-${cellId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [cellId],
            ranges: [
              { key: 'rotateY', val: -25, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
            ],
          },
        },
        // Scale settlement (0.95 -> 1.0 for smooth landing)
        {
          id: `scale-${cellId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [cellId],
            ranges: [
              { key: 'scale', val: 0.95, prog: 0 },
              { key: 'scale', val: 1.0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: imageId,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: image.src,
            className: 'w-full h-full object-cover',
            style: {
              objectFit: 'cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration - startTime,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Build grid container
  const gridContainer: RenderableComponentData = {
    id: 'film-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid auto-rows-fr p-4 gap-3',
        style: {
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: imageCells,
  };

  // Optional film grain overlay
  let filmGrainOverlay: RenderableComponentData | null = null;

  if (filmGrainOpacity > 0) {
    const grainSrc =
      filmGrainSrc ||
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&h=1080&fit=crop&q=60'; // Default film grain texture

    filmGrainOverlay = {
      id: 'film-grain-overlay',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: grainSrc,
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          objectFit: 'cover',
          mixBlendMode: 'overlay',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: 'grain-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: filmGrainFadeStart,
            duration: filmGrainFadeDuration,
            mode: 'provider',
            targetIds: ['film-grain-overlay'],
            ranges: [
              { key: 'opacity', val: filmGrainOpacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  }

  // Root container with perspective for 3D effects
  const rootContainer: RenderableComponentData = {
    id: 'film-collage-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: collageBackgroundColor,
          perspective: '1000px', // 3D perspective depth
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      ...(filmGrainOverlay ? [filmGrainOverlay] : []),
      gridContainer,
    ],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'cinematic-film-strip-collage',
  title: 'Cinematic Film Strip Photo Collage',
  description:
    'A cinematic photo collage that mimics a film strip unrolling horizontally across the screen. Images slide into a grid formation with rotation flip effects, starting overlapped and spreading out. Features film grain overlay that fades from vintage to modern aesthetic. Timing is rhythmic and musical with staggered arrivals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'collage',
    'film-strip',
    'cinematic',
    'photo-grid',
    'vintage',
    'film-grain',
    '3d-rotation',
    'slide-animation',
    'rhythmic',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=600&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop' },
    ],
    gridColumns: 3,
    transitionDuration: 1.0,
    staggerDelay: 0.15,
    filmGrainOpacity: 0.3,
    collageBackgroundColor: '#000000',
    totalDuration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const cinematicFilmStripCollagePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
