/**
 * Isometric 3D Hexagonal Carousel Preset
 *
 * This preset creates an architectural-style 3D carousel featuring a hexagonal prism
 * rotating in 3D space with 6 image faces. Each face displays an image with gradient
 * overlays that simulate lighting angles. The prism includes glossy floor reflections,
 * ambient occlusion-style shadows in corners, and optional scanline/holographic effects
 * for a futuristic aesthetic. The rotation pauses slightly longer on front-facing panels
 * with a subtle bounce ease at each stop.
 *
 * Features:
 * - **Hexagonal Prism Structure**: 6 faces at 60-degree increments with 3D transforms
 * - **Gradient Overlays**: Each face has a subtle gradient that shifts based on rotation angle
 * - **Floor Reflections**: Glossy reflection plane below the prism using mirrored duplication
 * - **Ambient Occlusion**: Corner shadows for depth using inset box-shadow
 * - **Scanline Effects**: Optional holographic scanline overlay for futuristic feel
 * - **Bounce Easing**: Rotation pauses longer on front faces with cubic-bezier bounce
 * - **Architectural Precision**: Clean lines, geometric accuracy, perspective rendering
 *
 * Use cases:
 * - Creating 3D product showcases with rotating hexagonal display
 * - Building architectural visualizations with geometric precision
 * - Adding futuristic holographic carousel effects
 * - Creating engaging image presentations with depth and lighting
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL for carousel face'),
      }),
    )
    .length(6)
    .describe('Array of 6 images for hexagon faces'),
  cycleDuration: z
    .number()
    .default(18)
    .describe('Total rotation cycle duration in seconds'),
  pauseDuration: z
    .number()
    .default(2)
    .describe('Pause duration on each front-facing panel in seconds'),
  enableScanlines: z
    .boolean()
    .default(true)
    .describe('Enable holographic scanline overlay'),
  enableFloorReflection: z
    .boolean()
    .default(true)
    .describe('Enable glossy floor reflection'),
  backgroundColor: z
    .string()
    .default('#0a0a0f')
    .describe('Background color of the container'),
  prismSize: z
    .number()
    .default(256)
    .describe('Size of the hexagonal prism in pixels (width and height)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    cycleDuration,
    pauseDuration,
    enableScanlines,
    enableFloorReflection,
    backgroundColor,
    prismSize,
  } = params;

  // Calculate prism depth (translateZ distance)
  const prismDepth = prismSize / 2;

  // Calculate keyframe percentages for 6 faces with pauses
  // Total cycle: 18s, 6 faces = 3s per face (2s pause + 1s transition)
  const transitionDuration = cycleDuration / 6 - pauseDuration;
  const keyframeStep = 100 / 6; // 16.66% per face

  // Generate rotation keyframes with pauses
  const generateRotationKeyframes = () => {
    const keyframes: Array<{ progress: number; rotateY: number }> = [];

    for (let i = 0; i < 6; i++) {
      const angle = i * 60;
      const startProgress = i * keyframeStep;
      const pauseProgress = startProgress + (pauseDuration / cycleDuration) * 100;

      // Pause at this angle
      keyframes.push({ progress: startProgress / 100, rotateY: angle });
      keyframes.push({ progress: pauseProgress / 100, rotateY: angle });
    }

    // Return to start (360° = 0°)
    keyframes.push({ progress: 1, rotateY: 360 });

    return keyframes;
  };

  const rotationKeyframes = generateRotationKeyframes();

  // Create hexagon prism rotation effect
  const prismRotationEffect = {
    id: 'hexagon-rotation',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' as any, // Bounce easing
      start: 0,
      duration: cycleDuration,
      mode: 'provider' as const,
      targetIds: ['hexagon-prism'],
      ranges: rotationKeyframes.map((kf) => ({
        key: 'rotateY',
        val: kf.rotateY,
        prog: kf.progress,
      })),
    },
  };

  // Create hexagon faces
  const createFace = (index: number, isReflection: boolean = false): RenderableComponentData => {
    const angle = index * 60;
    const image = images[index];

    // Calculate gradient intensity based on angle (simulates lighting)
    const gradientOpacity = 0.2 + (Math.abs(Math.sin((angle * Math.PI) / 180)) * 0.15);

    const faceId = isReflection ? `reflection-face-${index}` : `face-${index}`;

    return {
      id: faceId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transform: `rotateY(${angle}deg) translateZ(${prismDepth}px)`,
            backfaceVisibility: 'hidden' as const,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: cycleDuration,
        },
      },
      childrenData: [
        // Image
        {
          id: `${faceId}-image`,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: image.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: cycleDuration,
            },
          },
        } as RenderableComponentData,
        // Gradient overlay (skip for reflections to reduce complexity)
        ...(isReflection
          ? []
          : [
              {
                id: `${faceId}-gradient`,
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'absolute inset-0',
                    style: {
                      background: `linear-gradient(135deg, transparent 0%, transparent 60%, rgba(0,0,0,${gradientOpacity}) 100%)`,
                      pointerEvents: 'none' as const,
                    },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: cycleDuration,
                  },
                },
                childrenData: [],
              } as RenderableComponentData,
            ]),
      ] as RenderableComponentData[],
    } as RenderableComponentData;
  };

  // Create all 6 faces
  const faces = Array.from({ length: 6 }, (_, i) => createFace(i));

  // Create hexagon prism container
  const hexagonPrism: RenderableComponentData = {
    id: 'hexagon-prism',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: `${prismSize}px`,
          height: `${prismSize}px`,
          transformStyle: 'preserve-3d' as const,
          left: '50%',
          top: '50%',
          marginLeft: `-${prismSize / 2}px`,
          marginTop: `-${prismSize / 2}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: cycleDuration,
      },
    },
    effects: [prismRotationEffect],
    childrenData: faces,
  };

  // Create floor reflection (mirrored prism)
  const floorReflection: RenderableComponentData | null = enableFloorReflection
    ? ({
        id: 'floor-reflection',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${prismSize}px`,
              height: `${prismSize}px`,
              transformStyle: 'preserve-3d' as const,
              transform: 'scaleY(-1) translateY(100%)',
              opacity: 0.3,
              filter: 'blur(4px)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
              left: '50%',
              top: '50%',
              marginLeft: `-${prismSize / 2}px`,
              marginTop: `-${prismSize / 2}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: cycleDuration,
          },
        },
        effects: [
          {
            id: 'reflection-rotation',
            componentId: 'generic',
            data: {
              type: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' as any,
              start: 0,
              duration: cycleDuration,
              mode: 'provider' as const,
              targetIds: ['floor-reflection'],
              ranges: rotationKeyframes.map((kf) => ({
                key: 'rotateY',
                val: kf.rotateY,
                prog: kf.progress,
              })),
            },
          },
        ],
        childrenData: Array.from({ length: 6 }, (_, i) => createFace(i, true)),
      } as RenderableComponentData)
    : null;

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData | null = enableScanlines
    ? ({
        id: 'scanline-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background:
                'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
              mixBlendMode: 'overlay' as const,
              opacity: 0.6,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: cycleDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData)
    : null;

  // Ambient occlusion corners
  const ambientCorners: RenderableComponentData = {
    id: 'ambient-corners',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          boxShadow: 'inset 0 0 150px 50px rgba(0,0,0,0.8)',
          borderRadius: '0px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: cycleDuration,
      },
    },
    childrenData: [],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'isometric-carousel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1200px',
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: cycleDuration,
      },
    },
    childrenData: [
      hexagonPrism,
      ...(floorReflection ? [floorReflection] : []),
      ...(scanlineOverlay ? [scanlineOverlay] : []),
      ambientCorners,
    ] as RenderableComponentData[],
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
  id: 'isometric-hexagon-carousel',
  title: 'Isometric 3D Hexagonal Carousel',
  description:
    'An architectural-style 3D carousel featuring a hexagonal prism rotating in 3D space with 6 image faces. Includes gradient overlays simulating lighting angles, glossy floor reflections, ambient occlusion corner shadows, scanline/holographic effects for a futuristic aesthetic, and bounce-eased rotation that pauses longer on front-facing panels.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'carousel',
    '3d',
    'isometric',
    'hexagon',
    'architectural',
    'futuristic',
    'holographic',
    'reflection',
    'geometric',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800' },
      { src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800' },
      { src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800' },
      { src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800' },
    ],
    cycleDuration: 18,
    pauseDuration: 2,
    enableScanlines: true,
    enableFloorReflection: true,
    backgroundColor: '#0a0a0f',
    prismSize: 256,
  },
  dependencies: {},
};

// Export preset
export const isometricHexagonCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
