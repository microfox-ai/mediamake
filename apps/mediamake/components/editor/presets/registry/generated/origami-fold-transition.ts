/**
 * Origami Fold Transition Preset
 *
 * Creates a mesmerizing origami-fold transition where the current scene appears to fold into
 * itself through multiple creases, like paper origami, before unfolding to reveal the next
 * content. The screen is divided into a 3x3 grid, with each section folding sequentially
 * at slightly different times.
 *
 * Features:
 * - **3x3 Grid Structure**: Screen divided into 9 segments for complex folding pattern
 * - **Sequential Folding**: Each cell folds at staggered intervals (0.1s delays)
 * - **3D Transforms**: Combines rotateX, rotateY, and scale with varying transform-origins
 * - **Paper-like Shadows**: Crease shadows with linear gradients simulate folded paper
 * - **Light Simulation**: Brightness adjustments mimic light catching folded surfaces
 * - **Perspective Depth**: 1200px perspective with preserve-3d for realistic 3D space
 * - **Fold-Unfold Cycle**: Animates from 0 to 180 degrees and back to 0 for complete effect
 *
 * Use cases:
 * - Artistic content presentations
 * - Cultural showcase transitions
 * - Premium brand content
 * - Gallery or portfolio pieces
 * - Time-lapse style effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .default(1.5)
    .describe('Total duration of the origami fold transition in seconds'),
  transitionDuration: z
    .number()
    .default(0.5)
    .describe('Duration of each individual cell fold animation in seconds'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each cell animation start in seconds'),
  maxRotation: z
    .number()
    .default(180)
    .describe('Maximum rotation angle for the fold in degrees'),
  minBrightness: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Minimum brightness during fold (0-1)'),
  shadowOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Maximum opacity of crease shadows (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    transitionDuration,
    staggerDelay,
    maxRotation,
    minBrightness,
    shadowOpacity,
  } = params;

  // Grid configuration: 3x3 grid
  const gridCols = 3;
  const gridRows = 3;
  const totalCells = gridCols * gridRows;

  // Transform origins for different fold directions
  const transformOrigins = [
    'top center',    // 0: top-left
    'bottom center', // 1: top-center
    'top center',    // 2: top-right
    'center left',   // 3: middle-left
    'center center', // 4: center
    'center right',  // 5: middle-right
    'bottom center', // 6: bottom-left
    'top center',    // 7: bottom-center
    'bottom center', // 8: bottom-right
  ];

  // Rotation axes for varied fold directions
  const rotationAxes: Array<'rotateX' | 'rotateY'> = [
    'rotateX', // 0
    'rotateX', // 1
    'rotateX', // 2
    'rotateY', // 3
    'rotateX', // 4 (center gets both axes)
    'rotateY', // 5
    'rotateX', // 6
    'rotateX', // 7
    'rotateX', // 8
  ];

  // Shadow gradient directions based on fold direction
  const shadowGradients = [
    'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 20%, transparent 80%, rgba(0,0,0,0.3))',
    'linear-gradient(to top, rgba(0,0,0,0.3), transparent 20%, transparent 80%, rgba(0,0,0,0.3))',
    'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 20%, transparent 80%, rgba(0,0,0,0.3))',
    'linear-gradient(to right, rgba(0,0,0,0.3), transparent 20%, transparent 80%, rgba(0,0,0,0.3))',
    'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)', // Center gets radial
    'linear-gradient(to left, rgba(0,0,0,0.3), transparent 20%, transparent 80%, rgba(0,0,0,0.3))',
    'linear-gradient(to top, rgba(0,0,0,0.3), transparent 20%, transparent 80%, rgba(0,0,0,0.3))',
    'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 20%, transparent 80%, rgba(0,0,0,0.3))',
    'linear-gradient(to top, rgba(0,0,0,0.3), transparent 20%, transparent 80%, rgba(0,0,0,0.3))',
  ];

  // Calculate object-position for each grid cell to show correct image portion
  const getObjectPosition = (index: number): string => {
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    const xPercent = (col * 100) / (gridCols - 1);
    const yPercent = (row * 100) / (gridRows - 1);
    return `${xPercent}% ${yPercent}%`;
  };

  // Create grid cells with images and effects
  const gridCells: RenderableComponentData[] = [];

  for (let i = 0; i < totalCells; i++) {
    const cellId = `origami-cell-${i}`;
    const imageId = `origami-image-${i}`;
    const shadowId = `origami-shadow-${i}`;
    
    const cellDelay = i * staggerDelay;
    const rotationAxis = rotationAxes[i];
    const transformOrigin = transformOrigins[i];
    const shadowGradient = shadowGradients[i];
    const objectPosition = getObjectPosition(i);

    // Special handling for center cell (index 4) - combine both axes
    const isCenterCell = i === 4;

    // Create fold effect for this cell
    const foldEffect = {
      id: `fold-effect-${i}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: cellDelay,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [cellId],
        ranges: isCenterCell
          ? [
              // Center cell: combine rotateX and rotateY with scale
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: maxRotation / 2, prog: 0.5 },
              { key: 'rotateX', val: 0, prog: 1 },
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: maxRotation / 2, prog: 0.5 },
              { key: 'rotateY', val: 0, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.9, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'translateZ', val: 0, prog: 0 },
              { key: 'translateZ', val: 20, prog: 0.5 },
              { key: 'translateZ', val: 0, prog: 1 },
            ]
          : [
              // Other cells: single axis rotation with translateZ for depth
              { key: rotationAxis, val: 0, prog: 0 },
              { key: rotationAxis, val: maxRotation, prog: 0.5 },
              { key: rotationAxis, val: 0, prog: 1 },
              { key: 'translateZ', val: 0, prog: 0 },
              { key: 'translateZ', val: 10, prog: 0.5 },
              { key: 'translateZ', val: 0, prog: 1 },
            ],
      },
    };

    // Brightness adjustment during fold
    const brightnessEffect = {
      id: `brightness-effect-${i}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: cellDelay,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [imageId],
        ranges: [
          { key: 'brightness', val: 1, prog: 0 },
          { key: 'brightness', val: minBrightness, prog: 0.5 },
          { key: 'brightness', val: 1, prog: 1 },
        ],
      },
    };

    // Shadow opacity animation
    const shadowEffect = {
      id: `shadow-effect-${i}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: cellDelay,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [shadowId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: shadowOpacity, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };

    // Create cell container
    const cellContainer: RenderableComponentData = {
      id: cellId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [foldEffect],
      childrenData: [
        // Image segment
        {
          id: imageId,
          type: 'atom' as const,
          componentId: 'ImageAtom',
          data: {
            src: 'ref:currentImage',
            style: {
              width: '300%',
              height: '300%',
              objectFit: 'cover',
              objectPosition,
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          effects: [brightnessEffect],
        } as RenderableComponentData,
        // Crease shadow overlay
        {
          id: shadowId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background: shadowGradient,
                opacity: 0,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          effects: [shadowEffect],
        } as RenderableComponentData,
      ],
    };

    gridCells.push(cellContainer);
  }

  // Create root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'origami-fold-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1200px',
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
    childrenData: [
      {
        id: 'origami-grid',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'grid grid-cols-3 grid-rows-3 w-full h-full',
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
        childrenData: gridCells,
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

const presetMetadata: PresetMetadata = {
  id: 'origami-fold-transition',
  title: 'Origami Fold Transition',
  description:
    'A mesmerizing origami-fold transition where the current scene folds into itself through multiple creases using a 3x3 grid pattern. Each cell folds sequentially with staggered timing, paper-like crease shadows, and brightness adjustments simulating light catching folded paper. Features 3D transforms with rotateX/rotateY, varying transform-origins for different fold directions, and perspective depth. Perfect for artistic, cultural, or premium content presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'origami', 'fold', '3d', 'artistic', 'cultural', 'grid', 'paper'],
  defaultInputParams: {
    duration: 1.5,
    transitionDuration: 0.5,
    staggerDelay: 0.1,
    maxRotation: 180,
    minBrightness: 0.7,
    shadowOpacity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const origamiFoldTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};