/**
 * Parallax Zoom Depth Effect Preset
 *
 * Creates a multiplane camera effect by zooming image layers at different rates
 * to produce a sense of depth and dimensionality. The effect separates a single
 * image into conceptual layers (background, midground, foreground) and zooms each
 * at different speeds, mimicking classic animation multiplane techniques.
 *
 * Features:
 * - **Three-Layer Depth System**: Background (slow zoom), midground (moderate zoom), foreground (fast zoom)
 * - **Differential Zoom Rates**: Background (1→1.3x), midground (1→2x), foreground (1→3x)
 * - **Custom Easing per Layer**: Background (ease-in), midground (ease-in-out), foreground (ease-out)
 * - **Floating Particles**: 5 animated particles with independent trajectories to enhance parallax
 * - **Layer Masking**: Foreground uses mask-image gradient for natural blending
 * - **Configurable Parameters**: Parallax intensity, focal depth, layer opacities, particle count
 *
 * Use cases:
 * - Creating cinematic depth reveals for photos
 * - Building engaging image intros with dimensionality
 * - Adding dynamic movement to static images
 * - Creating Ken Burns-style effects with parallax depth
 * - Enhancing visual storytelling with layered motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  imageSrc: z.string().describe('Main image source URL for all layers'),
  foregroundSrc: z
    .string()
    .optional()
    .describe('Optional foreground overlay image (transparent PNG recommended)'),
  duration: z
    .number()
    .default(5)
    .describe('Duration of the parallax zoom effect in seconds'),
  parallaxIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Multiplier for parallax zoom intensity (higher = more dramatic)'),
  focalDepth: z
    .enum(['background', 'midground', 'foreground'])
    .default('midground')
    .describe('Which layer to emphasize as the focal point'),
  layerOpacities: z
    .object({
      background: z.number().min(0).max(1).default(1).optional(),
      midground: z.number().min(0).max(1).default(1).optional(),
      foreground: z.number().min(0).max(1).default(0.3).optional(),
    })
    .default({})
    .optional()
    .describe('Opacity values for each layer (0-1)'),
  particleCount: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(5)
    .describe('Number of floating particles to enhance parallax effect'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color for the composition'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    imageSrc,
    foregroundSrc,
    duration,
    parallaxIntensity,
    focalDepth,
    layerOpacities = {},
    particleCount,
    backgroundColor,
  } = params;

  // Helper: Generate particle data
  const generateParticles = (count: number) => {
    const particles = [];
    const positions = [
      { top: '20%', left: '15%', size: 8 },
      { top: '45%', left: '75%', size: 12 },
      { top: '70%', left: '30%', size: 6 },
      { top: '35%', left: '50%', size: 10 },
      { top: '60%', left: '85%', size: 9 },
      { top: '25%', left: '65%', size: 7 },
      { top: '55%', left: '20%', size: 11 },
      { top: '80%', left: '55%', size: 8 },
      { top: '15%', left: '40%', size: 9 },
      { top: '50%', left: '90%', size: 10 },
    ];

    const movements = [
      { x: -50, y: 30, opacity: 0.8 },
      { x: 80, y: -40, opacity: 0.7 },
      { x: 60, y: 20, opacity: 0.6 },
      { x: -70, y: -25, opacity: 0.75 },
      { x: 40, y: 50, opacity: 0.65 },
      { x: -30, y: -35, opacity: 0.7 },
      { x: 55, y: 45, opacity: 0.68 },
      { x: -45, y: 35, opacity: 0.72 },
      { x: 70, y: -30, opacity: 0.66 },
      { x: -60, y: 40, opacity: 0.74 },
    ];

    const easings = ['linear', 'ease-out', 'ease-in', 'ease-in-out', 'linear'];

    for (let i = 0; i < Math.min(count, 10); i++) {
      const pos = positions[i] || positions[0];
      const move = movements[i] || movements[0];
      const easing = easings[i % easings.length];

      particles.push({
        id: `particle-${i + 1}`,
        position: pos,
        movement: move,
        easing: easing as 'linear' | 'ease-out' | 'ease-in' | 'ease-in-out',
      });
    }

    return particles;
  };

  // Helper: Calculate zoom scale based on layer and intensity
  const calculateZoomScale = (
    layer: 'background' | 'midground' | 'foreground',
    intensity: number,
  ) => {
    const baseScales = {
      background: 1.3,
      midground: 2.0,
      foreground: 3.0,
    };
    return 1 + (baseScales[layer] - 1) * intensity;
  };

  const particles = generateParticles(particleCount);

  // Create particle components
  const particleComponents = particles.map((particle) => ({
    id: particle.id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="rounded-full bg-white/20" style="width: ${particle.position.size}px; height: ${particle.position.size}px;"></div>`,
      className: 'absolute',
      style: {
        top: particle.position.top,
        left: particle.position.left,
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
        id: `${particle.id}-movement`,
        componentId: 'generic',
        data: {
          type: particle.easing,
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [particle.id],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: particle.movement.x, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: particle.movement.y, prog: 1 },
            { key: 'opacity', val: particle.movement.opacity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  }));

  // Layer opacity defaults
  const bgOpacity = layerOpacities.background ?? 1;
  const mgOpacity = layerOpacities.midground ?? 1;
  const fgOpacity = layerOpacities.foreground ?? 0.3;

  // Calculate zoom scales
  const bgScale = calculateZoomScale('background', parallaxIntensity);
  const mgScale = calculateZoomScale('midground', parallaxIntensity);
  const fgScale = calculateZoomScale('foreground', parallaxIntensity);

  // Build component tree
  const backgroundLayer: RenderableComponentData = {
    id: 'background-layer-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'background-image',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: imageSrc,
          className: 'w-full h-full object-cover',
          style: {
            filter: 'blur(2px)',
            opacity: bgOpacity,
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
            id: 'background-zoom-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['background-image'],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: bgScale, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };

  const midgroundLayer: RenderableComponentData = {
    id: 'midground-layer-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'midground-image',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: imageSrc,
          className: 'max-w-full max-h-full object-contain',
          style: {
            opacity: mgOpacity,
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
            id: 'midground-zoom-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['midground-image'],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: mgScale, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };

  const foregroundLayer: RenderableComponentData = {
    id: 'foreground-layer-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'foreground-image',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: foregroundSrc || imageSrc,
          className: 'w-full h-full object-cover',
          style: {
            opacity: fgOpacity,
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
            id: 'foreground-zoom-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['foreground-image'],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: fgScale, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };

  const particlesContainer: RenderableComponentData = {
    id: 'particles-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 4,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: particleComponents as RenderableComponentData[],
  };

  const rootContainer: RenderableComponentData = {
    id: 'parallax-zoom-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      backgroundLayer,
      midgroundLayer,
      foregroundLayer,
      particlesContainer,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'parallax-zoom',
  title: 'Parallax Zoom Depth Effect',
  description:
    'Creates a multiplane camera effect with depth illusion by zooming image layers at different rates (background slow, midground moderate, foreground fast) with floating particle effects to enhance parallax dimensionality',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'image',
    'parallax',
    'zoom',
    'depth',
    'multiplane',
    'cinematic',
    'animation',
    'particles',
    'visual-effects',
  ],
  defaultInputParams: {
    imageSrc: 'https://example.com/photo.jpg',
    duration: 5,
    parallaxIntensity: 1,
    focalDepth: 'midground',
    layerOpacities: {
      background: 1,
      midground: 1,
      foreground: 0.3,
    },
    particleCount: 5,
    backgroundColor: '#000000',
  },
  dependencies: {},
};

// ============================================================================
// EXPORT
// ============================================================================

export const parallaxZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
