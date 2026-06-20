/**
 * ViewMaster Carousel Preset
 *
 * A retro ViewMaster-style 3D cube carousel with mechanical rotation snap effects.
 * Features circular vignette frame, vintage color grading, barrel distortion simulation,
 * and optional stereoscopic binocular view mode. Creates satisfying click-snap transitions
 * that mimic the classic ViewMaster reel advancement.
 *
 * Features:
 * - **Mechanical Rotation**: Sharp acceleration/deceleration with physical snap-into-place
 * - **Vintage Aesthetics**: Sepia tone, contrast boost, circular vignette, barrel distortion
 * - **Film Grain Overlay**: Animated texture for authentic retro feel
 * - **Stereoscopic Mode**: Optional dual offset images for true 3D effect
 * - **Smooth Cube Rotation**: 3D cube with 4 faces rotating on Y-axis
 * - **Configurable Duration**: Control rotation speed and hold time
 *
 * Use cases:
 * - Creating retro photo slideshows with mechanical feel
 * - Building nostalgic image carousels
 * - Adding vintage ViewMaster aesthetic to presentations
 * - Creating stereoscopic 3D image experiences
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
    .array(z.string())
    .min(1)
    .max(4)
    .describe('Array of image URLs (1-4 images for cube faces)'),
  rotationDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.4)
    .describe('Duration of cube rotation in seconds'),
  holdDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration to hold each image before rotating'),
  stereoscopicMode: z
    .boolean()
    .default(false)
    .describe('Enable dual offset images for stereoscopic 3D effect'),
  stereoscopicOffset: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .describe('Horizontal offset in pixels for stereoscopic effect'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of circular vignette (0 = none, 1 = strong)'),
  grainOpacity: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.08)
    .describe('Opacity of film grain texture overlay'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    rotationDuration,
    holdDuration,
    stereoscopicMode,
    stereoscopicOffset,
    vignetteIntensity,
    grainOpacity,
  } = params;

  // Calculate total duration: each image gets rotation + hold time
  const segmentDuration = rotationDuration + holdDuration;
  const totalDuration = images.length * segmentDuration;

  // Cubic bezier for mechanical snap effect
  const mechanicalEasing = 'cubic-bezier(0.785, 0.135, 0.15, 0.86)';

  // Helper: Create cube rotation effect for a segment
  const createCubeRotation = (
    targetId: string,
    segmentIndex: number,
  ): any => {
    const startTime = segmentIndex * segmentDuration;
    const rotationStart = startTime;

    // Calculate rotation angles: 90deg per face
    const startAngle = segmentIndex * 90;
    const endAngle = (segmentIndex + 1) * 90;

    return {
      id: `cube-rotation-${segmentIndex}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: rotationStart,
        duration: rotationDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'rotateY', val: startAngle, prog: 0 },
          { key: 'rotateY', val: endAngle, prog: 1 },
        ],
        props: {
          easing: mechanicalEasing,
        },
      },
    };
  };

  // Helper: Create single cube instance
  const createCube = (cubeId: string, offsetX: number = 0): any => {
    // Create cube faces
    const cubeFaces = images.map((imageSrc, index) => {
      const faceId = `${cubeId}-face-${index}`;
      let transform = '';

      switch (index) {
        case 0:
          transform = 'rotateY(0deg) translateZ(200px)';
          break;
        case 1:
          transform = 'rotateY(90deg) translateZ(200px)';
          break;
        case 2:
          transform = 'rotateY(180deg) translateZ(200px)';
          break;
        case 3:
          transform = 'rotateY(270deg) translateZ(200px)';
          break;
      }

      return {
        id: faceId,
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: imageSrc,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData;
    });

    // Cube rotation effects for all segments
    const cubeEffects = images.map((_, index) =>
      createCubeRotation(cubeId, index),
    );

    // Cube container with 3D transform
    return {
      id: cubeId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'w-3/4 h-3/4 relative',
          style: {
            transformStyle: 'preserve-3d',
            transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: cubeEffects,
      childrenData: cubeFaces.map((face, index) => ({
        ...face,
        data: {
          ...face.data,
          containerProps: {
            className: 'absolute inset-0',
            style: {
              backfaceVisibility: 'hidden',
              transform:
                index === 0
                  ? 'rotateY(0deg) translateZ(200px)'
                  : index === 1
                    ? 'rotateY(90deg) translateZ(200px)'
                    : index === 2
                      ? 'rotateY(180deg) translateZ(200px)'
                      : 'rotateY(270deg) translateZ(200px)',
            },
          },
        },
      })),
    } as RenderableComponentData;
  };

  // Film grain overlay
  const filmGrainOverlay: RenderableComponentData = {
    id: 'film-grain-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'url(\'data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noise)"/%3E%3C/svg%3E\')',
          opacity: grainOpacity,
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none rounded-full',
        style: {
          background: `radial-gradient(circle, transparent 0%, transparent 60%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Barrel distortion overlay
  const barrelDistortionOverlay: RenderableComponentData = {
    id: 'barrel-distortion-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none rounded-full',
        style: {
          background:
            'radial-gradient(circle, transparent 0%, transparent 70%, rgba(0,0,0,0.1) 100%)',
          transform: 'scale(1.02)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Create cube(s) based on stereoscopic mode
  let cubeContainerChildren: RenderableComponentData[];

  if (stereoscopicMode) {
    // Stereoscopic mode: two cubes side by side with offset
    const leftCube = createCube('cube-left', -stereoscopicOffset);
    const rightCube = createCube('cube-right', stereoscopicOffset);

    cubeContainerChildren = [
      {
        id: 'stereoscopic-grid',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-full h-full grid grid-cols-2 gap-4',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [leftCube, rightCube],
      } as RenderableComponentData,
    ];
  } else {
    // Normal mode: single cube centered
    cubeContainerChildren = [createCube('cube-3d')];
  }

  // Cube container wrapper with vintage filter
  const cubeContainerWrapper: RenderableComponentData = {
    id: 'cube-container-wrapper',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'w-full h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
          filter: 'sepia(0.2) contrast(1.1) brightness(1.05)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: cubeContainerChildren,
  };

  // ViewMaster frame container
  const viewmasterFrame: RenderableComponentData = {
    id: 'viewmaster-frame',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-4 rounded-full overflow-hidden',
        style: {
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.3)',
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
      cubeContainerWrapper,
      vignetteOverlay,
      barrelDistortionOverlay,
    ],
  };

  // Root container with radial gradient background
  const rootContainer: RenderableComponentData = {
    id: 'viewmaster-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          background: 'radial-gradient(circle, #fffbeb 0%, #fef3c7 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [viewmasterFrame, filmGrainOverlay],
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
  id: 'viewmaster-carousel',
  title: 'ViewMaster Carousel',
  description:
    'A retro ViewMaster-style 3D cube carousel with mechanical rotation snap effects, circular vignette frame, vintage color grading, barrel distortion simulation, and optional stereoscopic binocular view mode. Features satisfying click-snap transitions mimicking the classic ViewMaster reel advancement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'carousel',
    '3d',
    'cube',
    'viewmaster',
    'retro',
    'vintage',
    'stereoscopic',
    'mechanical',
    'rotation',
  ],
  defaultInputParams: {
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&h=600&fit=crop',
    ],
    rotationDuration: 0.4,
    holdDuration: 2,
    stereoscopicMode: false,
    stereoscopicOffset: 30,
    vignetteIntensity: 0.4,
    grainOpacity: 0.08,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const viewmasterCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
