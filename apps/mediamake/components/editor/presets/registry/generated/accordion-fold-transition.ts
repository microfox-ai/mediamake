/**
 * Accordion Fold Page Transition Preset
 *
 * Creates a hypnotic accordion-fold page transition where the scene compresses into vertical
 * pleats (like a paper fan or vintage camera bellows), rotates 180 degrees, and expands to
 * reveal new content. The current image folds into multiple vertical strips that alternate
 * forward and backward in 3D space, creating a zigzag pattern.
 *
 * Features:
 * - **3D Accordion Folding**: 10 vertical strips with alternating rotateY transforms
 * - **Three-Phase Animation**: Compress → Rotate → Expand sequence
 * - **Realistic Shadows**: Dynamic shadows in fold valleys and highlights on peaks
 * - **Depth Perspective**: Alternating translateZ for enhanced 3D effect
 * - **Transform Origins**: Alternating left/right origins for authentic accordion motion
 * - **Smooth Timing**: 1.2s total duration with cubic-bezier easing
 *
 * Use cases:
 * - Creating dramatic page transitions between scenes
 * - Building engaging scene changes for presentations
 * - Adding vintage mechanical effects to video transitions
 * - Creating hypnotic, smooth transition effects
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
  currentImageSrc: z
    .string()
    .describe('Source URL of the current scene image to fold away'),
  nextImageSrc: z
    .string()
    .describe('Source URL of the next scene image to reveal'),
  duration: z
    .number()
    .default(1.2)
    .describe('Total transition duration in seconds'),
  stripCount: z
    .number()
    .default(10)
    .describe('Number of vertical accordion strips (8-12 recommended)'),
  maxRotation: z
    .number()
    .default(45)
    .describe('Maximum rotation angle in degrees during compression'),
  scaleCompression: z
    .number()
    .default(0.3)
    .describe('Horizontal scale factor during maximum compression (0.3 = 30% width)'),
  depthOffset: z
    .number()
    .default(10)
    .describe('Depth offset in pixels for alternating strips (translateZ)'),
  scaleYCompression: z
    .number()
    .default(0.98)
    .describe('Vertical scale during maximum compression for realism'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    currentImageSrc,
    nextImageSrc,
    duration,
    stripCount,
    maxRotation,
    scaleCompression,
    depthOffset,
    scaleYCompression,
  } = params;

  // Calculate phase durations
  const compressDuration = duration * 0.33; // 0-0.4s
  const rotateDuration = duration * 0.33; // 0.4-0.8s
  const expandDuration = duration * 0.34; // 0.8-1.2s

  const compressStart = 0;
  const rotateStart = compressDuration;
  const expandStart = compressDuration + rotateDuration;

  // Calculate strip width percentage
  const stripWidth = 100 / stripCount;

  // Helper function to create a single strip
  const createStrip = (index: number): RenderableComponentData => {
    const isEven = index % 2 === 0;
    const stripId = `accordion-strip-${index}`;
    const rotationDirection = isEven ? maxRotation : -maxRotation;
    const transformOrigin = isEven ? 'left center' : 'right center';
    const translateZ = isEven ? depthOffset : -depthOffset;

    // Calculate image position offset for this strip
    const offsetX = -(index * stripWidth);

    return {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative h-full flex-1',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin,
            willChange: 'transform',
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: [
        // Current image (front face)
        {
          id: `${stripId}-current-image`,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: currentImageSrc,
            className: 'absolute inset-0 w-full h-full object-cover',
            style: {
              objectPosition: `${-index * 100}% center`,
              width: `${stripCount * 100}%`,
              left: `${index * 100}%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        } as RenderableComponentData,
        // Next image (back face, rotated 180deg)
        {
          id: `${stripId}-next-image`,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: nextImageSrc,
            className: 'absolute inset-0 w-full h-full object-cover',
            style: {
              objectPosition: `${-index * 100}% center`,
              width: `${stripCount * 100}%`,
              left: `${index * 100}%`,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        } as RenderableComponentData,
        // Shadow overlay
        {
          id: `${stripId}-shadow-overlay`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div class="w-full h-full"></div>',
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background:
                'linear-gradient(to right, rgba(0,0,0,0.3), transparent 30%, transparent 70%, rgba(0,0,0,0.3))',
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Phase 1: Compress (0 - compressDuration)
        {
          id: `${stripId}-compress`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: compressStart,
            duration: compressDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: rotationDirection, prog: 1 },
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: scaleCompression, prog: 1 },
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: scaleYCompression, prog: 1 },
              { key: 'translateZ', val: 0, prog: 0 },
              { key: 'translateZ', val: translateZ, prog: 1 },
            ],
          },
        },
        // Phase 2: Rotate (compressDuration - rotateStart + rotateDuration)
        {
          id: `${stripId}-rotate`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: rotateStart,
            duration: rotateDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotateY', val: rotationDirection, prog: 0 },
              { key: 'rotateY', val: rotationDirection + 180, prog: 1 },
              { key: 'scaleX', val: scaleCompression, prog: 0 },
              { key: 'scaleX', val: scaleCompression, prog: 1 },
              { key: 'scaleY', val: scaleYCompression, prog: 0 },
              { key: 'scaleY', val: scaleYCompression, prog: 1 },
              { key: 'translateZ', val: translateZ, prog: 0 },
              { key: 'translateZ', val: translateZ, prog: 1 },
            ],
          },
        },
        // Phase 3: Expand (expandStart - duration)
        {
          id: `${stripId}-expand`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: expandStart,
            duration: expandDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotateY', val: rotationDirection + 180, prog: 0 },
              { key: 'rotateY', val: 180, prog: 1 },
              { key: 'scaleX', val: scaleCompression, prog: 0 },
              { key: 'scaleX', val: 1, prog: 1 },
              { key: 'scaleY', val: scaleYCompression, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
              { key: 'translateZ', val: translateZ, prog: 0 },
              { key: 'translateZ', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Generate all strips
  const strips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    strips.push(createStrip(i));
  }

  // Build the composition
  const rootContainer: RenderableComponentData = {
    id: 'accordion-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex w-full h-full',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      {
        id: 'accordion-strips-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative w-full h-full flex flex-row',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: strips,
      } as RenderableComponentData,
    ],
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
  id: 'accordion-fold-transition',
  title: 'Accordion Fold Page Transition',
  description:
    'A 3D accordion-fold page transition where the scene folds into vertical pleats like a paper fan, compresses into a zigzag pattern, rotates 180 degrees, and expands to reveal new content. Features realistic shadows in fold valleys, highlights on peaks, and smooth hypnotic motion reminiscent of vintage camera bellows.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'accordion',
    'fold',
    '3d',
    'page-transition',
    'mechanical',
    'vintage',
    'bellows',
  ],
  defaultInputParams: {
    currentImageSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    nextImageSrc: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    duration: 1.2,
    stripCount: 10,
    maxRotation: 45,
    scaleCompression: 0.3,
    depthOffset: 10,
    scaleYCompression: 0.98,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const accordionFoldTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
