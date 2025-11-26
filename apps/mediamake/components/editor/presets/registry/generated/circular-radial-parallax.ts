/**
 * Circular Radial Parallax Carousel Preset
 *
 * This preset creates a mesmerizing circular/radial parallax effect with multiple concentric
 * rotating rings at different speeds, creating a turntable or carousel-like visual experience.
 * Imagine editing a 360-degree video with multiple orbital layers moving at different velocities.
 *
 * Features:
 * - **5 Concentric Rotating Rings**: Decreasing radius from outer to inner (90vmin → 18vmin)
 * - **Speed-Based Rotation**: Inner rings rotate faster, outer rings slower (parallax depth)
 * - **Orbital Elements**: Images, shapes, and icons that counter-rotate to stay upright
 * - **Radial Gradients**: Depth perception through gradient backgrounds
 * - **Pulsing Center Hub**: Breathing animation from center with logo/icon
 * - **Continuous Smooth Rotation**: Linear animation timing for seamless loops
 * - **Glass Morphism**: Blur effects and semi-transparent elements for depth
 * - **Customizable Assets**: User-provided images for orbital elements and center logo
 *
 * Use cases:
 * - 360-degree style video presentations
 * - Brand showcases with orbital product displays
 * - Hypnotic visual content for music videos
 * - Abstract motion graphics for intros/outros
 * - Creative loading screens or transitions
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  duration: z
    .number()
    .default(20)
    .describe('Total duration of the circular parallax animation in seconds'),
  
  centerLogo: z
    .string()
    .optional()
    .describe('URL for the center hub logo/icon image'),
  
  orbitalImage1: z
    .string()
    .optional()
    .describe('URL for first orbital image (outermost ring)'),
  
  orbitalImage2: z
    .string()
    .optional()
    .describe('URL for second orbital image'),
  
  orbitalImage3: z
    .string()
    .optional()
    .describe('URL for third orbital image'),
  
  orbitalImage4: z
    .string()
    .optional()
    .describe('URL for fourth orbital image'),
  
  rotationSpeedMultiplier: z
    .number()
    .default(1.0)
    .describe('Global multiplier for all rotation speeds (higher = faster rotation)'),
  
  pulseIntensity: z
    .number()
    .default(1.0)
    .describe('Intensity of the center hub pulse effect (0 = no pulse, higher = more dramatic)'),
  
  gradientColor1: z
    .string()
    .default('rgba(80,60,120,0.8)')
    .describe('Inner radial gradient color (center)'),
  
  gradientColor2: z
    .string()
    .default('rgba(20,10,40,1)')
    .describe('Middle radial gradient color'),
  
  gradientColor3: z
    .string()
    .default('rgba(0,0,0,1)')
    .describe('Outer radial gradient color (edges)'),
  
  enableBlur: z
    .boolean()
    .default(true)
    .describe('Enable backdrop blur effects for glass morphism depth'),
  
  ringOpacity: z
    .number()
    .default(0.3)
    .describe('Opacity multiplier for ring borders (0-1)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    centerLogo,
    orbitalImage1,
    orbitalImage2,
    orbitalImage3,
    orbitalImage4,
    rotationSpeedMultiplier,
    pulseIntensity,
    gradientColor1,
    gradientColor2,
    gradientColor3,
    enableBlur,
    ringOpacity,
  } = params;

  // Helper: Generate unique IDs
  const generateId = (prefix: string) => `circular-parallax-${prefix}-${Math.random().toString(36).substr(2, 9)}`;

  // Ring configuration: [radius, rotationDegrees, borderOpacity]
  const ringConfigs = [
    { radius: '90vmin', rotation: 72, borderOpacity: 0.1 * ringOpacity, orbitals: 3 },
    { radius: '72vmin', rotation: 144, borderOpacity: 0.15 * ringOpacity, orbitals: 2 },
    { radius: '54vmin', rotation: 216, borderOpacity: 0.2 * ringOpacity, orbitals: 4 },
    { radius: '36vmin', rotation: 288, borderOpacity: 0.25 * ringOpacity, orbitals: 2 },
    { radius: '18vmin', rotation: 360, borderOpacity: 0.3 * ringOpacity, orbitals: 1 },
  ];

  const allEffects: any[] = [];

  // --- Background Gradient ---
  const backgroundId = generateId('bg-gradient');
  const backgroundGradient: RenderableComponentData = {
    id: backgroundId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      type: 'rectangle',
      containerProps: {
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full',
        style: {
          background: `radial-gradient(circle at center, ${gradientColor1} 0%, ${gradientColor2} 70%, ${gradientColor3} 100%)`,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
        fitDurationTo: 'fill',
      },
    },
  };

  // --- Ring Layers with Orbital Elements ---
  const ringLayers: RenderableComponentData[] = [];

  ringConfigs.forEach((config, ringIndex) => {
    const ringId = generateId(`ring-${ringIndex}`);
    const ringRotationDuration = duration / rotationSpeedMultiplier;
    const actualRotation = config.rotation * rotationSpeedMultiplier;

    // Orbital element data
    const orbitalData = [
      { image: orbitalImage1, shape: 'circle', color: 'bg-purple-400/60', size: 'w-12 h-12', pos: { top: '0%', left: '50%' } },
      { image: orbitalImage2, shape: 'rectangle', color: 'bg-gradient-to-br from-pink-400 to-purple-600', size: 'w-10 h-10 rounded-lg', pos: { top: '50%', left: '100%' } },
      { image: orbitalImage3, shape: 'circle', color: 'bg-cyan-400/70', size: 'w-8 h-8', pos: { top: '100%', left: '50%' } },
      { image: orbitalImage4, shape: 'circle', color: 'bg-orange-400/70', size: 'w-8 h-8', pos: { top: '50%', left: '0%' } },
      { image: null, shape: 'circle', color: 'bg-white/80 shadow-lg', size: 'w-6 h-6', pos: { top: '25%', left: '75%' } },
      { image: null, shape: 'circle', color: 'bg-yellow-300/60', size: 'w-6 h-6', pos: { top: '75%', left: '25%' } },
    ];

    const orbitals: RenderableComponentData[] = [];
    const numOrbitals = config.orbitals;

    for (let i = 0; i < numOrbitals; i++) {
      const orbitalId = generateId(`ring-${ringIndex}-orbital-${i}`);
      const orbital = orbitalData[i % orbitalData.length];
      const orbitalImage = [orbitalImage1, orbitalImage2, orbitalImage3, orbitalImage4][ringIndex % 4];

      const shouldUseImage = i === 0 && orbitalImage;

      let orbitalComponent: RenderableComponentData;

      if (shouldUseImage) {
        orbitalComponent = {
          id: orbitalId,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: orbitalImage,
            containerProps: {
              className: `absolute ${orbital.size} rounded-full object-cover shadow-md`,
              style: {
                top: orbital.pos.top,
                left: orbital.pos.left,
                transform: 'translate(-50%, -50%)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
              fitDurationTo: 'fill',
            },
          },
        };
      } else {
        orbitalComponent = {
          id: orbitalId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            type: orbital.shape as 'circle' | 'rectangle',
            containerProps: {
              className: `absolute ${orbital.size} rounded-full ${orbital.color}`,
              style: {
                top: orbital.pos.top,
                left: orbital.pos.left,
                transform: 'translate(-50%, -50%)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
              fitDurationTo: 'fill',
            },
          },
        };
      }

      // Counter-rotation effect for orbital to stay upright
      const counterRotationEffect = {
        id: generateId(`counter-rotation-${orbitalId}`),
        componentId: orbitalId,
        data: {
          type: 'linear',
          start: 0,
          duration: ringRotationDuration,
          mode: 'provider',
          targetIds: [orbitalId],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -actualRotation, prog: 1 },
          ],
        },
      };

      allEffects.push(counterRotationEffect);
      orbitals.push(orbitalComponent);
    }

    // Ring container
    const ringLayer: RenderableComponentData = {
      id: ringId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2',
          style: {
            width: config.radius,
            height: config.radius,
            borderColor: `rgba(255, 255, 255, ${config.borderOpacity})`,
            ...(enableBlur ? { backdropFilter: 'blur(2px)' } : {}),
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
          fitDurationTo: 'fill',
        },
      },
      childrenData: orbitals,
    };

    // Ring rotation effect
    const ringRotationEffect = {
      id: generateId(`ring-rotation-${ringId}`),
      componentId: ringId,
      data: {
        type: 'linear',
        start: 0,
        duration: ringRotationDuration,
        mode: 'provider',
        targetIds: [ringId],
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: actualRotation, prog: 1 },
        ],
      },
    };

    allEffects.push(ringRotationEffect);
    ringLayers.push(ringLayer);
  });

  // --- Center Hub with Pulse ---
  const centerHubId = generateId('center-hub');
  const centerLogoId = generateId('center-logo');

  const centerHub: RenderableComponentData = {
    id: centerHubId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[12vmin] h-[12vmin] rounded-full flex items-center justify-center',
        style: {
          background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(200,180,255,0.8) 50%, rgba(100,80,150,0.6) 100%)',
          boxShadow: '0 0 40px 10px rgba(200,150,255,0.5)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
        fitDurationTo: 'fill',
      },
    },
    childrenData: centerLogo
      ? [
          {
            id: centerLogoId,
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: centerLogo,
              containerProps: {
                className: 'w-3/4 h-3/4 object-contain rounded-full',
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
                fitDurationTo: 'fill',
              },
            },
          } as RenderableComponentData,
        ]
      : [],
  };

  // Pulse effect for center hub
  if (pulseIntensity > 0) {
    const pulseEffect = {
      id: generateId('center-pulse'),
      componentId: centerHubId,
      data: {
        type: 'ease-in-out',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [centerHubId],
        ranges: [
          { key: 'scale', val: 1.0, prog: 0 },
          { key: 'scale', val: 1.0 + 0.1 * pulseIntensity, prog: 0.25 },
          { key: 'scale', val: 1.0, prog: 0.5 },
          { key: 'scale', val: 1.0 + 0.1 * pulseIntensity, prog: 0.75 },
          { key: 'scale', val: 1.0, prog: 1 },
        ],
      },
    };
    allEffects.push(pulseEffect);
  }

  // --- Root Container ---
  const rootContainerId = generateId('root-container');
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
        fitDurationTo: 'fill',
      },
    },
    childrenData: [backgroundGradient, ...ringLayers.reverse(), centerHub],
    effects: allEffects,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'circular-radial-parallax',
  title: 'Circular Radial Parallax Carousel',
  description:
    'A mesmerizing circular parallax effect with 5 concentric rotating rings at different speeds (inner fast, outer slow) creating a turntable/carousel visual. Features orbital elements (images, shapes) that counter-rotate to stay upright, a pulsing center hub with logo, radial gradient backgrounds for depth, and smooth continuous rotation. Perfect for 360-degree style presentations, brand showcases, or hypnotic visual content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'circular',
    'radial',
    'parallax',
    'carousel',
    'rotation',
    'turntable',
    '360-degree',
    'orbital',
    'concentric',
    'rings',
    'depth',
    'motion-graphics',
    'abstract',
    'hypnotic',
  ],
  defaultInputParams: {
    duration: 20,
    centerLogo: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=200&h=200&fit=crop',
    orbitalImage1: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&h=200&fit=crop',
    orbitalImage2: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=200&h=200&fit=crop',
    orbitalImage3: 'https://images.unsplash.com/photo-1557683304-673a23048d34?w=200&h=200&fit=crop',
    orbitalImage4: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200&h=200&fit=crop',
    rotationSpeedMultiplier: 1.0,
    pulseIntensity: 1.0,
    gradientColor1: 'rgba(80,60,120,0.8)',
    gradientColor2: 'rgba(20,10,40,1)',
    gradientColor3: 'rgba(0,0,0,1)',
    enableBlur: true,
    ringOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const circularRadialParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
