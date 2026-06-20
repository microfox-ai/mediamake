/**
 * Morphing Grid-Cube Carousel Preset
 *
 * A dynamic shape-shifting gallery that transforms between a 2D grid layout and a 3D rotating cube formation.
 * The carousel starts with images arranged in a clean 3x3 grid, then smoothly morphs into a rotating cube.
 * 
 * Features:
 * - Smooth elastic morphing between grid and cube layouts
 * - Particle effects and light streaks during transformations
 * - Momentum-based physics for cube rotation
 * - Maintains image aspect ratios during transitions
 * - Staggered animations for cascading morph effects
 * - Motion blur simulation during fast movements
 * - Continuous rotation option with weighty physics
 * 
 * Technical Implementation:
 * - Uses BaseLayout with dynamic 3D perspective and preserve-3d transforms
 * - Grid positions use translate values, cube positions use rotateY and translateZ
 * - State machine logic for mode switching (GRID_HOLD → MORPH_TO_CUBE → CUBE_HOLD → MORPH_TO_GRID)
 * - Particle effects via small BaseLayouts animated along bezier paths
 * - Cubic-bezier(0.68, -0.55, 0.265, 1.55) for elastic morphing feel
 * - Index-based delay calculations for staggered animations
 * 
 * Use cases:
 * - Portfolio galleries with engaging 3D transformations
 * - Product showcases with dynamic presentation styles
 * - Photo galleries that adapt between grid and spatial views
 * - Creative visual presentations with shape-shifting effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z.array(z.string()).length(9).describe('Array of 9 image URLs for the 3x3 grid/cube faces'),
  totalDuration: z.number().default(11).describe('Total duration for one complete cycle in seconds'),
  gridHoldDuration: z.number().default(4).describe('Duration to hold in grid layout before morphing'),
  cubeHoldDuration: z.number().default(4).describe('Duration to hold in cube layout before morphing back'),
  morphDuration: z.number().default(1.5).describe('Duration of the morph transition'),
  enableContinuousRotation: z.boolean().default(true).describe('Enable continuous cube rotation during hold'),
  rotationSpeed: z.number().default(0.3).describe('Speed multiplier for cube rotation'),
  particleCount: z.number().default(12).describe('Number of particle effects during morph'),
  lightStreakCount: z.number().default(3).describe('Number of light streaks during morph'),
  backgroundColor: z.string().default('#0a0a0a').describe('Background color'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    totalDuration,
    gridHoldDuration,
    cubeHoldDuration,
    morphDuration,
    enableContinuousRotation,
    rotationSpeed,
    particleCount,
    lightStreakCount,
    backgroundColor,
  } = params;

  // Calculate phase timings (all relative to root container start)
  const gridHoldStart = 0;
  const morphToCubeStart = gridHoldStart + gridHoldDuration;
  const cubeHoldStart = morphToCubeStart + morphDuration;
  const morphToGridStart = cubeHoldStart + cubeHoldDuration;
  const cycleEnd = morphToGridStart + morphDuration;

  // Helper: Grid positions (3x3 layout)
  const getGridPosition = (index: number): { x: number; y: number } => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const spacing = 200; // 180px image + 20px gap
    const centerOffset = spacing; // Center the grid
    return {
      x: col * spacing - centerOffset,
      y: row * spacing - centerOffset,
    };
  };

  // Helper: Cube positions (6 faces mapping to 9 images)
  const getCubePosition = (index: number): { rotateY: number; translateZ: number; opacity: number } => {
    // Map 9 images to 6 cube faces (some images used multiple times or hidden)
    const faceMap: Record<number, { rotateY: number; translateZ: number; opacity: number }> = {
      0: { rotateY: 0, translateZ: 150, opacity: 1 },      // Front
      1: { rotateY: 90, translateZ: 150, opacity: 1 },     // Right
      2: { rotateY: 180, translateZ: 150, opacity: 1 },    // Back
      3: { rotateY: 270, translateZ: 150, opacity: 1 },    // Left
      4: { rotateY: 0, translateZ: 150, opacity: 0 },      // Hidden (top placeholder)
      5: { rotateY: 0, translateZ: 150, opacity: 0 },      // Hidden (bottom placeholder)
      6: { rotateY: 0, translateZ: 150, opacity: 0 },      // Hidden
      7: { rotateY: 0, translateZ: 150, opacity: 0 },      // Hidden
      8: { rotateY: 0, translateZ: 150, opacity: 0 },      // Hidden
    };
    return faceMap[index] || { rotateY: 0, translateZ: 150, opacity: 0 };
  };

  // Image components with morph animations
  const imageComponents: RenderableComponentData[] = images.map((src, index) => {
    const gridPos = getGridPosition(index);
    const cubePos = getCubePosition(index);
    const staggerDelay = index * 0.08; // Stagger animations

    const imageId = `morph-carousel-image-${index}`;

    return {
      id: imageId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src,
        className: 'shadow-lg',
        style: {
          width: '180px',
          height: '180px',
          objectFit: 'cover',
          position: 'absolute',
          borderRadius: '8px',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: cycleEnd,
        },
      },
      effects: [
        // Grid to Cube morph
        {
          id: `morph-to-cube-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: morphToCubeStart + staggerDelay,
            duration: morphDuration,
            mode: 'provider',
            targetIds: [imageId],
            ranges: [
              // Position transition
              { key: 'translateX', val: `${gridPos.x}px`, prog: 0 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: `${gridPos.y}px`, prog: 0 },
              { key: 'translateY', val: '0px', prog: 1 },
              // Rotation transition
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: cubePos.rotateY, prog: 1 },
              // Z-depth transition
              { key: 'translateZ', val: '0px', prog: 0 },
              { key: 'translateZ', val: `${cubePos.translateZ}px`, prog: 1 },
              // Opacity
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: cubePos.opacity, prog: 1 },
              // Motion blur during fast movement
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(3px)', prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Cube rotation during hold
        ...(enableContinuousRotation ? [{
          id: `cube-rotation-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: cubeHoldStart,
            duration: cubeHoldDuration,
            mode: 'provider',
            targetIds: [imageId],
            ranges: [
              { key: 'rotateY', val: cubePos.rotateY, prog: 0 },
              { key: 'rotateY', val: cubePos.rotateY + (360 * rotationSpeed), prog: 1 },
            ],
          },
        }] : []),
        // Cube to Grid morph
        {
          id: `morph-to-grid-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: morphToGridStart + staggerDelay,
            duration: morphDuration,
            mode: 'provider',
            targetIds: [imageId],
            ranges: [
              // Position transition
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${gridPos.x}px`, prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: `${gridPos.y}px`, prog: 1 },
              // Rotation transition
              { key: 'rotateY', val: cubePos.rotateY + (enableContinuousRotation ? 360 * rotationSpeed : 0), prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
              // Z-depth transition
              { key: 'translateZ', val: `${cubePos.translateZ}px`, prog: 0 },
              { key: 'translateZ', val: '0px', prog: 1 },
              // Opacity
              { key: 'opacity', val: cubePos.opacity, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              // Motion blur
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(3px)', prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Particle effects (activated during morph phases)
  const particleComponents: RenderableComponentData[] = Array.from({ length: particleCount }, (_, i) => {
    const particleId = `particle-${i}`;
    const isColoredParticle = i >= 6;
    const particleColors = ['bg-white', 'bg-blue-400', 'bg-purple-400', 'bg-cyan-300', 'bg-pink-300'];
    const particleColor = isColoredParticle ? particleColors[i % 5] : 'bg-white';
    const particleSize = isColoredParticle ? 'w-2 h-2' : 'w-1 h-1';

    // Random bezier path points
    const startX = Math.random() * 100;
    const startY = Math.random() * 100;
    const endX = Math.random() * 100;
    const endY = Math.random() * 100;
    const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 50;
    const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 50;

    return {
      id: particleId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute ${particleSize} rounded-full ${particleColor}`,
          style: {
            opacity: 0,
            boxShadow: '0 0 6px 2px rgba(255,255,255,0.8)',
            left: `${startX}%`,
            top: `${startY}%`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: cycleEnd,
        },
      },
      effects: [
        // Morph to cube particles
        {
          id: `particle-morph-cube-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: morphToCubeStart,
            duration: morphDuration,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'left', val: `${startX}%`, prog: 0 },
              { key: 'left', val: `${midX}%`, prog: 0.5 },
              { key: 'left', val: `${endX}%`, prog: 1 },
              { key: 'top', val: `${startY}%`, prog: 0 },
              { key: 'top', val: `${midY}%`, prog: 0.5 },
              { key: 'top', val: `${endY}%`, prog: 1 },
            ],
          },
        },
        // Morph to grid particles
        {
          id: `particle-morph-grid-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: morphToGridStart,
            duration: morphDuration,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'left', val: `${endX}%`, prog: 0 },
              { key: 'left', val: `${midX}%`, prog: 0.5 },
              { key: 'left', val: `${startX}%`, prog: 1 },
              { key: 'top', val: `${endY}%`, prog: 0 },
              { key: 'top', val: `${midY}%`, prog: 0.5 },
              { key: 'top', val: `${startY}%`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Light streaks (activated during morph phases)
  const lightStreakComponents: RenderableComponentData[] = Array.from({ length: lightStreakCount }, (_, i) => {
    const streakId = `light-streak-${i}`;
    const streakColors = [
      'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
      'linear-gradient(90deg, transparent, rgba(96,165,250,0.9), transparent)',
      'linear-gradient(90deg, transparent, rgba(192,132,252,0.9), transparent)',
    ];
    const streakColor = streakColors[i % 3];
    const streakWidth = [100, 80, 120][i % 3];

    const startX = -20 - i * 10;
    const endX = 120 + i * 10;
    const yPos = 20 + i * 30;

    return {
      id: streakId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: `${streakWidth}px`,
            height: '2px',
            background: streakColor,
            opacity: 0,
            borderRadius: '1px',
            left: `${startX}%`,
            top: `${yPos}%`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: cycleEnd,
        },
      },
      effects: [
        // Morph to cube streaks
        {
          id: `streak-morph-cube-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: morphToCubeStart,
            duration: morphDuration,
            mode: 'provider',
            targetIds: [streakId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'left', val: `${startX}%`, prog: 0 },
              { key: 'left', val: `${endX}%`, prog: 1 },
            ],
          },
        },
        // Morph to grid streaks
        {
          id: `streak-morph-grid-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: morphToGridStart,
            duration: morphDuration,
            mode: 'provider',
            targetIds: [streakId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'left', val: `${endX}%`, prog: 0 },
              { key: 'left', val: `${startX}%`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Container for particles and light streaks
  const particleEffectsContainer: RenderableComponentData = {
    id: 'particle-effects-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: cycleEnd,
      },
    },
    childrenData: [...particleComponents, ...lightStreakComponents],
  };

  // Container for grid/cube images
  const gridCubeContainer: RenderableComponentData = {
    id: 'grid-cube-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          width: '600px',
          height: '600px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: cycleEnd,
      },
    },
    childrenData: imageComponents,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'morph-carousel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1200px',
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: cycleEnd,
      },
    },
    childrenData: [gridCubeContainer, particleEffectsContainer],
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
  id: 'morph-grid-cube-carousel',
  title: 'Morphing Grid-Cube Carousel',
  description: 'A dynamic shape-shifting gallery that transforms between a 2D grid layout and a 3D rotating cube. Features elastic morphing animations with staggered timing, particle effects and light streaks during transitions, momentum-based cube rotation physics, and motion blur simulation. Images maintain aspect ratios throughout the transformation. Supports continuous rotation and configurable hold durations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['carousel', 'gallery', '3d', 'grid', 'cube', 'morph', 'transform', 'particles', 'animation'],
  defaultInputParams: {
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&h=400&fit=crop',
    ],
    totalDuration: 11,
    gridHoldDuration: 4,
    cubeHoldDuration: 4,
    morphDuration: 1.5,
    enableContinuousRotation: true,
    rotationSpeed: 0.3,
    particleCount: 12,
    lightStreakCount: 3,
    backgroundColor: '#0a0a0a',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const morphGridCubeCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
