/**
 * Dust Particle System Preset
 *
 * This preset generates a dynamic dust and particle overlay system with multiple layers
 * of particles featuring different sizes, opacities, and movement patterns. It creates
 * an organic, three-dimensional atmospheric overlay with parallax-like depth.
 *
 * Features:
 * - **Multiple Particle Layers**: Small, medium, and large dust particles with unique movement
 * - **Organic Movement**: Downward drift with horizontal wobble for realistic floating
 * - **Particle Rotation**: Larger particles rotate as they fall
 * - **Floating Fibers**: Horizontal fiber animations that drift across the frame
 * - **Static Accumulation**: Dust buildup in corners and edges that fades in over time
 * - **Configurable Density**: Sparse, moderate, or heavy particle counts
 * - **Size Variation**: Fine, mixed, or coarse particle sizes
 * - **Speed Control**: Slow, normal, or fast movement speeds
 * - **Parallax Depth**: Layered z-index creates three-dimensional feel
 *
 * Use cases:
 * - Adding atmospheric dust overlays to videos
 * - Creating vintage or aged film effects
 * - Enhancing environmental ambiance
 * - Adding depth and texture to static scenes
 * - Creating organic, living backgrounds
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ================================================================================
// PARAMS SCHEMA
// ================================================================================

const presetParams = z.object({
  particleDensity: z
    .enum(['sparse', 'moderate', 'heavy'])
    .default('moderate')
    .describe('Density of particles in the system (sparse: 10-15, moderate: 20-25, heavy: 30-40 particles)'),
  particleSize: z
    .enum(['fine', 'mixed', 'coarse'])
    .default('mixed')
    .describe('Size range of particles (fine: 1-3px, mixed: 1-6px, coarse: 4-8px)'),
  movementSpeed: z
    .enum(['slow', 'normal', 'fast'])
    .default('normal')
    .describe('Speed of particle movement (slow: 15-25s, normal: 8-18s, fast: 5-12s fall durations)'),
  includeAccumulation: z
    .boolean()
    .default(true)
    .describe('Whether to include static dust accumulation in corners and edges'),
  duration: z
    .number()
    .default(10)
    .describe('Duration of the particle system in seconds'),
  targetIds: z
    .array(z.string())
    .default([])
    .describe('Array of component IDs to target (empty array means no specific targets)'),
});

// ================================================================================
// PRESET EXECUTION
// ================================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate random number in range
  const random = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Get particle count based on density
  const getParticleCount = (density: string): number => {
    switch (density) {
      case 'sparse':
        return Math.floor(random(10, 15));
      case 'moderate':
        return Math.floor(random(20, 25));
      case 'heavy':
        return Math.floor(random(30, 40));
      default:
        return 20;
    }
  };

  // Helper: Get particle size range based on size parameter
  const getParticleSizeRange = (sizeType: string): { min: number; max: number } => {
    switch (sizeType) {
      case 'fine':
        return { min: 1, max: 3 };
      case 'mixed':
        return { min: 1, max: 6 };
      case 'coarse':
        return { min: 4, max: 8 };
      default:
        return { min: 1, max: 6 };
    }
  };

  // Helper: Get duration range based on speed and particle size
  const getDurationRange = (
    speedType: string,
    particleSize: number,
  ): { min: number; max: number } => {
    // Larger particles fall faster (shorter duration)
    const sizeMultiplier = 1 - (particleSize / 10) * 0.4; // 10% to 50% reduction for larger particles

    switch (speedType) {
      case 'slow':
        return { min: 15 * sizeMultiplier, max: 25 * sizeMultiplier };
      case 'normal':
        return { min: 8 * sizeMultiplier, max: 18 * sizeMultiplier };
      case 'fast':
        return { min: 5 * sizeMultiplier, max: 12 * sizeMultiplier };
      default:
        return { min: 8 * sizeMultiplier, max: 18 * sizeMultiplier };
    }
  };

  // Helper: Get opacity based on particle size
  const getOpacity = (particleSize: number): number => {
    // Small particles: 0.2-0.4, Large particles: 0.3-0.6
    const baseOpacity = particleSize <= 3 ? 0.2 : 0.3;
    const maxOpacity = particleSize <= 3 ? 0.4 : 0.6;
    return random(baseOpacity, maxOpacity);
  };

  // Helper: Generate particle data
  const generateParticles = () => {
    const particleCount = getParticleCount(params.particleDensity);
    const sizeRange = getParticleSizeRange(params.particleSize);
    const particles: any[] = [];

    for (let i = 0; i < particleCount; i++) {
      const size = random(sizeRange.min, sizeRange.max);
      const durationRange = getDurationRange(params.movementSpeed, size);
      const duration = random(durationRange.min, durationRange.max);
      const startDelay = random(0, params.duration * 0.5); // Stagger start times
      const opacity = getOpacity(size);
      const wobbleAmount = random(2, size * 2); // Wobble increases with size
      const leftPosition = random(0, 100);
      const topPosition = random(-10, -2);
      const blur = size <= 2 ? 0.5 : size <= 4 ? 1 : 1.5;

      const particleId = `dust-particle-${i}`;

      // Create particle component
      const particleComponent: any = {
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: rgba(255, 255, 255, ${opacity}); border-radius: 50%; filter: blur(${blur}px);"></div>`,
          className: 'absolute',
          style: {
            left: `${leftPosition}%`,
            top: `${topPosition}%`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          // Vertical drift (downward)
          {
            id: `${particleId}-drift`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [particleId],
              type: 'linear',
              start: startDelay,
              duration: duration,
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 110, prog: 1 }, // Move 110vh down
              ],
            },
          },
          // Horizontal wobble
          {
            id: `${particleId}-wobble`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [particleId],
              type: 'ease-in-out',
              start: startDelay,
              duration: duration,
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: wobbleAmount, prog: 0.25 },
                { key: 'translateX', val: -wobbleAmount, prog: 0.5 },
                { key: 'translateX', val: wobbleAmount, prog: 0.75 },
                { key: 'translateX', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      // Add rotation for larger particles
      if (size >= 4) {
        particleComponent.effects.push({
          id: `${particleId}-rotation`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [particleId],
            type: 'linear',
            start: startDelay,
            duration: duration,
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360, prog: 1 },
            ],
          },
        });
      }

      particles.push(particleComponent);
    }

    return particles;
  };

  // Helper: Generate fiber particles (horizontal drifting fibers)
  const generateFibers = () => {
    const fiberCount = params.particleDensity === 'sparse' ? 2 : params.particleDensity === 'moderate' ? 3 : 5;
    const fibers: any[] = [];

    for (let i = 0; i < fiberCount; i++) {
      const fiberId = `fiber-${i}`;
      const fiberLength = random(15, 30);
      const fiberWidth = random(0.5, 1.5);
      const topPosition = random(20, 80);
      const duration = random(8, 15);
      const startDelay = random(0, params.duration * 0.3);
      const opacity = random(0.2, 0.4);
      const verticalWobble = random(2, 5);

      fibers.push({
        id: fiberId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${fiberLength}px; height: ${fiberWidth}px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, ${opacity}), transparent); filter: blur(0.5px);"></div>`,
          className: 'absolute',
          style: {
            left: '-10%',
            top: `${topPosition}%`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          // Horizontal drift (left to right)
          {
            id: `${fiberId}-horizontal-drift`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [fiberId],
              type: 'linear',
              start: startDelay,
              duration: duration,
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 120, prog: 1 }, // Move 120vw to the right
              ],
            },
          },
          // Vertical wobble
          {
            id: `${fiberId}-vertical-wobble`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [fiberId],
              type: 'ease-in-out',
              start: startDelay,
              duration: duration,
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -verticalWobble, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      });
    }

    return fibers;
  };

  // Helper: Generate accumulation elements
  const generateAccumulation = () => {
    if (!params.includeAccumulation) return [];

    const accumulation: any[] = [];

    // Corner accumulation: top-left
    accumulation.push({
      id: 'accumulation-corner-tl',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100px; height: 100px; background: radial-gradient(circle at top left, rgba(200, 200, 200, 0.35), transparent); filter: blur(10px);"></div>',
        className: 'absolute top-0 left-0',
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: 'accumulation-tl-fade',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['accumulation-corner-tl'],
            type: 'ease-in',
            start: 0,
            duration: params.duration,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.7 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    });

    // Corner accumulation: top-right
    accumulation.push({
      id: 'accumulation-corner-tr',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100px; height: 100px; background: radial-gradient(circle at top right, rgba(200, 200, 200, 0.35), transparent); filter: blur(10px);"></div>',
        className: 'absolute top-0 right-0',
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: 'accumulation-tr-fade',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['accumulation-corner-tr'],
            type: 'ease-in',
            start: 0,
            duration: params.duration,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.7 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    });

    // Corner accumulation: bottom-left
    accumulation.push({
      id: 'accumulation-corner-bl',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100px; height: 100px; background: radial-gradient(circle at bottom left, rgba(200, 200, 200, 0.35), transparent); filter: blur(10px);"></div>',
        className: 'absolute bottom-0 left-0',
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: 'accumulation-bl-fade',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['accumulation-corner-bl'],
            type: 'ease-in',
            start: 0,
            duration: params.duration,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.7 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    });

    // Corner accumulation: bottom-right
    accumulation.push({
      id: 'accumulation-corner-br',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100px; height: 100px; background: radial-gradient(circle at bottom right, rgba(200, 200, 200, 0.35), transparent); filter: blur(10px);"></div>',
        className: 'absolute bottom-0 right-0',
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: 'accumulation-br-fade',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['accumulation-corner-br'],
            type: 'ease-in',
            start: 0,
            duration: params.duration,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.7 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    });

    // Edge accumulation: bottom
    accumulation.push({
      id: 'accumulation-edge-bottom',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 70px; background: linear-gradient(to top, rgba(200, 200, 200, 0.3), transparent); filter: blur(8px);"></div>',
        className: 'absolute bottom-0 left-0',
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: 'accumulation-bottom-fade',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['accumulation-edge-bottom'],
            type: 'ease-in',
            start: 0,
            duration: params.duration,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.7 },
              { key: 'opacity', val: 0.25, prog: 1 },
            ],
          },
        },
      ],
    });

    return accumulation;
  };

  // Generate all particle elements
  const particles = generateParticles();
  const fibers = generateFibers();
  const accumulation = generateAccumulation();

  // Build layer structure
  const particleLayer: RenderableComponentData = {
    id: 'dust-particle-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: particles as RenderableComponentData[],
  };

  const fiberLayer: RenderableComponentData = {
    id: 'fiber-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: fibers as RenderableComponentData[],
  };

  const accumulationLayer: RenderableComponentData = {
    id: 'accumulation-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-30 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: accumulation as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'dust-particle-system-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [particleLayer, fiberLayer, accumulationLayer],
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

// ================================================================================
// PRESET METADATA
// ================================================================================

const presetMetadata: PresetMetadata = {
  id: 'DustParticleSystem',
  title: 'Dust Particle System',
  description:
    'Dynamic dust and particle overlay system with multiple layers of particles, organic movement patterns, parallax-like depth, and optional static accumulation effects. Features particles with varied sizes, opacities, drift/wobble animations, and rotations creating a three-dimensional atmospheric overlay.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'effects',
    'particles',
    'dust',
    'overlay',
    'atmospheric',
    'organic',
    'parallax',
    'depth',
    'accumulation',
    'floating',
    'drift',
    'vintage',
  ],
  dependencies: {},
  defaultInputParams: {
    particleDensity: 'moderate',
    particleSize: 'mixed',
    movementSpeed: 'normal',
    includeAccumulation: true,
    duration: 10,
    targetIds: [],
  },
};

// ================================================================================
// PRESET EXPORT
// ================================================================================

export const DustParticleSystemPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
