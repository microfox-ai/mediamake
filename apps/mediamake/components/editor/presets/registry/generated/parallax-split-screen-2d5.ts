/**
 * Parallax Split-Screen 2.5D Effect Preset
 *
 * This preset creates a multi-layered parallax composition inspired by multiplane camera
 * techniques in animation. Multiple panels slide at different speeds to create a dimensional
 * 2.5D effect, with each layer appearing on a different z-plane.
 *
 * Features:
 * - **Multi-layer Depth**: Background, midground, foreground, and UI layers with distinct z-indices
 * - **Staggered Animation**: Different slide speeds per layer (background 1.5s, midground 1.0s, foreground 0.7s, UI 0.3s)
 * - **Perspective Transforms**: Container uses CSS perspective with depth-based scale and blur
 * - **Dynamic Shadows**: Drop shadows vary by perceived depth (farther = softer/larger shadow)
 * - **GPU Acceleration**: All transforms use translate3d() for optimal performance
 * - **Customizable Content**: All image sources and UI text are parameter-driven
 *
 * Use cases:
 * - Creating dimensional split-screen effects for presentations
 * - Building cinematic parallax transitions
 * - Adding depth to static image compositions
 * - Creating engaging multi-layer visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  backgroundImage: z
    .object({
      src: z.string().describe('Background image source URL'),
    })
    .describe('Background layer image (slowest movement, scale 0.95, blur 2px)'),
  
  midgroundLeftImage: z
    .object({
      src: z.string().describe('Left midground panel image source URL'),
    })
    .describe('Left midground panel image'),
  
  midgroundRightImage: z
    .object({
      src: z.string().describe('Right midground panel image source URL'),
    })
    .describe('Right midground panel image'),
  
  foregroundLeftImage: z
    .object({
      src: z.string().describe('Left foreground panel image source URL'),
    })
    .describe('Left foreground panel image (faster movement, scale 1.05)'),
  
  foregroundRightImage: z
    .object({
      src: z.string().describe('Right foreground panel image source URL'),
    })
    .describe('Right foreground panel image (faster movement, scale 1.05)'),
  
  uiText: z
    .string()
    .default('Parallax Effect')
    .describe('UI layer text content (fastest movement)'),
  
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the composition in seconds'),
  
  slideDirection: z
    .enum(['left', 'right'])
    .default('left')
    .describe('Direction of the parallax slide movement'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { duration, slideDirection } = params;
  
  // Slide distances and timing based on layer depth
  const slideMultiplier = slideDirection === 'left' ? -1 : 1;
  const backgroundSlideDistance = 50 * slideMultiplier; // Slowest, least movement
  const midgroundSlideDistance = 100 * slideMultiplier;
  const foregroundSlideDistance = 150 * slideMultiplier; // Fastest, most movement
  const uiSlideDistance = 200 * slideMultiplier; // UI moves fastest
  
  // Animation timings per layer
  const backgroundDuration = 1.5;
  const midgroundDuration = 1.0;
  const foregroundDuration = 0.7;
  const uiDuration = 0.3;
  
  // Helper function to create slide effect
  const createSlideEffect = (
    targetId: string,
    slideDistance: number,
    slideDuration: number,
    effectId: string,
  ): GenericEffectData => ({
    type: 'ease-out',
    start: 0,
    duration: slideDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'translateX', val: slideDistance, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  });
  
  // Background layer (z-index 0, scale 0.95, blur 2px, slowest slide)
  const backgroundLayer: RenderableComponentData = {
    id: 'background-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
          transform: 'scale(0.95) translateZ(0)',
          filter: 'blur(2px)',
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
    effects: [
      {
        id: 'background-slide',
        componentId: 'generic',
        data: createSlideEffect(
          'background-image',
          backgroundSlideDistance,
          backgroundDuration,
          'background-slide',
        ),
      },
    ],
    childrenData: [
      {
        id: 'background-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: params.backgroundImage.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      },
    ],
  };
  
  // Midground layer (z-index 10, standard scale, split panels)
  const midgroundLayer: RenderableComponentData = {
    id: 'midground-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-row',
        style: {
          zIndex: 10,
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
    effects: [
      {
        id: 'midground-left-slide',
        componentId: 'generic',
        data: createSlideEffect(
          'midground-left',
          midgroundSlideDistance,
          midgroundDuration,
          'midground-left-slide',
        ),
      },
      {
        id: 'midground-right-slide',
        componentId: 'generic',
        data: createSlideEffect(
          'midground-right',
          midgroundSlideDistance,
          midgroundDuration,
          'midground-right-slide',
        ),
      },
    ],
    childrenData: [
      {
        id: 'midground-left',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-1/2 h-full relative overflow-hidden',
            style: {
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
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
            id: 'midground-left-image',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: params.midgroundLeftImage.src,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
          },
        ],
      },
      {
        id: 'midground-right',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-1/2 h-full relative overflow-hidden',
            style: {
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
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
            id: 'midground-right-image',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: params.midgroundRightImage.src,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
          },
        ],
      },
    ],
  };
  
  // Foreground layer (z-index 20, scale 1.05, faster slide)
  const foregroundLayer: RenderableComponentData = {
    id: 'foreground-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-row gap-8 px-8 py-8',
        style: {
          zIndex: 20,
          transform: 'scale(1.05) translateZ(0)',
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
    effects: [
      {
        id: 'foreground-left-slide',
        componentId: 'generic',
        data: createSlideEffect(
          'foreground-left',
          foregroundSlideDistance,
          foregroundDuration,
          'foreground-left-slide',
        ),
      },
      {
        id: 'foreground-right-slide',
        componentId: 'generic',
        data: createSlideEffect(
          'foreground-right',
          foregroundSlideDistance,
          foregroundDuration,
          'foreground-right-slide',
        ),
      },
    ],
    childrenData: [
      {
        id: 'foreground-left',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-1/3 h-2/3 relative overflow-hidden rounded-lg',
            style: {
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
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
            id: 'foreground-left-image',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: params.foregroundLeftImage.src,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
          },
        ],
      },
      {
        id: 'foreground-right',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-1/3 h-2/3 relative overflow-hidden rounded-lg self-end',
            style: {
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
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
            id: 'foreground-right-image',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: params.foregroundRightImage.src,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
          },
        ],
      },
    ],
  };
  
  // UI layer (z-index 30, fastest slide)
  const uiLayer: RenderableComponentData = {
    id: 'ui-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          zIndex: 30,
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
    effects: [
      {
        id: 'ui-slide',
        componentId: 'generic',
        data: createSlideEffect(
          'ui-text-container',
          uiSlideDistance,
          uiDuration,
          'ui-slide',
        ),
      },
    ],
    childrenData: [
      {
        id: 'ui-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'px-12 py-6 rounded-2xl',
            style: {
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
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
            id: 'ui-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: params.uiText,
              className: 'text-white text-5xl font-bold text-center',
              style: {
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
              },
              font: {
                family: 'Inter',
                weights: ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
          },
        ],
      },
    ],
  };
  
  // Root perspective container
  const rootContainer: RenderableComponentData = {
    id: 'parallax-split-screen-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
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
      backgroundLayer,
      midgroundLayer,
      foregroundLayer,
      uiLayer,
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

const presetMetadata: PresetMetadata = {
  id: 'parallax-split-screen-2d5',
  title: 'Parallax Split-Screen 2.5D Effect',
  description:
    'Multi-layer parallax composition with staggered slide animations at different speeds and depths, creating a 2.5D multiplane camera effect. Features background (1.5s slide, blur, scale-down), midground panels (standard speed), foreground panels (0.7s slide, scale-up), and UI elements (0.3s fastest slide). Includes perspective transforms, depth-based blur, and dynamic drop shadows for dimensional glass-plane layering effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'parallax',
    'split-screen',
    '2.5d',
    'multiplane',
    'depth',
    'layered',
    'perspective',
    'animation',
    'cinematic',
  ],
  defaultInputParams: {
    backgroundImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    midgroundLeftImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=960&h=1080&fit=crop',
    },
    midgroundRightImage: {
      src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=960&h=1080&fit=crop',
    },
    foregroundLeftImage: {
      src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=640&h=720&fit=crop',
    },
    foregroundRightImage: {
      src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=640&h=720&fit=crop',
    },
    uiText: 'Parallax Effect',
    duration: 5,
    slideDirection: 'left',
  },
  dependencies: {},
};

export const parallaxSplitScreen2d5Preset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
