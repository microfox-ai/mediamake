/**
 * Cinematic Depth Parallax Preset
 *
 * This preset creates professional multi-layer parallax effects that mimic cinematic depth-of-field
 * found in high-end video production. It implements a dolly zoom effect with 7 layers moving at
 * calculated speed ratios to create compelling dimensionality.
 *
 * Features:
 * - **7-Layer Depth System**: Background (2 layers), midground (2 layers), foreground (2 layers), and particles
 * - **Calculated Speed Ratios**: Furthest layers move at 0.1x, mid at 0.5x, foreground at 1x speed
 * - **Atmospheric Perspective**: Progressive blur (0-8px) and opacity reduction (0.4-1.0) on distant layers
 * - **GPU-Accelerated Transforms**: will-change properties and translateX/Y animations
 * - **Floating Particle Effects**: 12 animated particles providing depth cues between layers
 * - **Cinematic Easing**: Cubic-bezier curves (0.45, 0, 0.55, 1) mimicking real camera dolly movement
 * - **Saturation Control**: Color desaturation increases with distance for realistic atmospheric haze
 *
 * Use cases:
 * - Creating cinematic title sequences with depth
 * - Building immersive background environments
 * - Adding professional depth-of-field to static images
 * - Creating parallax hero sections for video content
 * - Simulating camera dolly zoom effects
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  backgroundImage1: z.string().describe('Image source for the furthest background layer (most atmospheric/blurred)'),
  backgroundImage2: z.string().describe('Image source for the second background layer'),
  midgroundImage1: z.string().describe('Image source for the first midground layer'),
  midgroundImage2: z.string().describe('Image source for the second midground layer'),
  foregroundImage1: z.string().describe('Image source for the first foreground layer (sharp)'),
  foregroundImage2: z.string().describe('Image source for the closest foreground layer (sharpest)'),
  movementIntensity: z.number().default(1.0).describe('Global multiplier for parallax movement intensity (0.5 = subtle, 2.0 = dramatic)'),
  direction: z.enum(['horizontal', 'vertical', 'both']).default('horizontal').describe('Direction of parallax movement'),
  particleColor: z.string().default('rgba(255, 255, 255, 0.6)').describe('Color for floating particle elements'),
  enableParticles: z.boolean().default(true).describe('Whether to show floating particle depth cues'),
  duration: z.number().optional().describe('Duration in seconds (defaults to scene duration)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    backgroundImage1,
    backgroundImage2,
    midgroundImage1,
    midgroundImage2,
    foregroundImage1,
    foregroundImage2,
    movementIntensity = 1.0,
    direction = 'horizontal',
    particleColor = 'rgba(255, 255, 255, 0.6)',
    enableParticles = true,
    duration,
  } = params;

  const { config } = props;
  const sceneDuration = duration || config?.durationInFrames / config?.fps || 10;

  // Helper function to generate particle properties
  const generateParticleProps = (index: number) => {
    // Seed-based deterministic "random" values for consistent particle placement
    const seed = index * 2654435761;
    const random = (n: number) => ((seed * n) % 10000) / 10000;

    const size = 4 + random(1) * 12; // 4-16px
    const x = random(2) * 100; // 0-100%
    const y = random(3) * 100; // 0-100%
    const opacity = 0.2 + random(4) * 0.5; // 0.2-0.7
    const blur = random(5) * 3; // 0-3px
    const layer = Math.floor(random(6) * 7) + 1; // Depth layer 1-7

    return {
      size: `${size}px`,
      x: `${x}%`,
      y: `${y}%`,
      opacity,
      blur: `${blur}px`,
      layer,
    };
  };

  // Helper function to create parallax animation effect
  const createParallaxEffect = (
    targetId: string,
    speedRatio: number,
    layerDuration: number,
    effectId: string,
  ) => {
    const baseMovement = 50 * movementIntensity * speedRatio;

    let ranges = [];

    if (direction === 'horizontal') {
      ranges = [
        { key: 'translateX', val: `${-baseMovement}%`, prog: 0 },
        { key: 'translateX', val: `${baseMovement}%`, prog: 0.5 },
        { key: 'translateX', val: `${-baseMovement}%`, prog: 1 },
      ];
    } else if (direction === 'vertical') {
      ranges = [
        { key: 'translateY', val: `${-baseMovement}%`, prog: 0 },
        { key: 'translateY', val: `${baseMovement}%`, prog: 0.5 },
        { key: 'translateY', val: `${-baseMovement}%`, prog: 1 },
      ];
    } else {
      // both
      ranges = [
        { key: 'translateX', val: `${-baseMovement * 0.7}%`, prog: 0 },
        { key: 'translateX', val: `${baseMovement * 0.7}%`, prog: 0.5 },
        { key: 'translateX', val: `${-baseMovement * 0.7}%`, prog: 1 },
        { key: 'translateY', val: `${-baseMovement * 0.5}%`, prog: 0 },
        { key: 'translateY', val: `${baseMovement * 0.5}%`, prog: 0.7 },
        { key: 'translateY', val: `${-baseMovement * 0.5}%`, prog: 1 },
      ];
    }

    return {
      id: effectId,
      componentId: targetId,
      data: {
        type: 'AnimationRange',
        start: 0,
        duration: layerDuration,
        mode: 'provider',
        targetIds: [targetId],
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
        loop: true,
        ranges,
      },
    };
  };

  // Helper function to create particle float animation
  const createParticleEffect = (targetId: string, particleIndex: number, effectId: string) => {
    const seed = particleIndex * 2654435761;
    const random = (n: number) => ((seed * n) % 10000) / 10000;

    const floatDuration = 3 + random(1) * 5; // 3-8s
    const floatDistance = 20 + random(2) * 30; // 20-50px

    return {
      id: effectId,
      componentId: targetId,
      data: {
        type: 'AnimationRange',
        start: 0,
        duration: floatDuration,
        mode: 'provider',
        targetIds: [targetId],
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
        loop: true,
        ranges: [
          { key: 'translateY', val: `${-floatDistance}px`, prog: 0 },
          { key: 'translateY', val: `${floatDistance}px`, prog: 0.5 },
          { key: 'translateY', val: `${-floatDistance}px`, prog: 1 },
          { key: 'opacity', val: 0.2, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.5 },
          { key: 'opacity', val: 0.2, prog: 1 },
        ],
      },
    };
  };

  // Create layer configurations
  const layers = [
    {
      id: 'layer-back-1',
      imageSrc: backgroundImage1,
      alt: 'Background layer 1',
      zIndex: 1,
      blur: 8,
      saturation: 0.5,
      opacity: 0.4,
      speedRatio: 0.1,
      duration: 25,
    },
    {
      id: 'layer-back-2',
      imageSrc: backgroundImage2,
      alt: 'Background layer 2',
      zIndex: 2,
      blur: 6,
      saturation: 0.6,
      opacity: 0.5,
      speedRatio: 0.15,
      duration: 20,
    },
    {
      id: 'layer-mid-1',
      imageSrc: midgroundImage1,
      alt: 'Midground layer 1',
      zIndex: 3,
      blur: 3,
      saturation: 0.75,
      opacity: 0.7,
      speedRatio: 0.5,
      duration: 14,
    },
    {
      id: 'layer-mid-2',
      imageSrc: midgroundImage2,
      alt: 'Midground layer 2',
      zIndex: 4,
      blur: 1.5,
      saturation: 0.85,
      opacity: 0.85,
      speedRatio: 0.7,
      duration: 10,
    },
    {
      id: 'layer-fore-1',
      imageSrc: foregroundImage1,
      alt: 'Foreground layer 1',
      zIndex: 5,
      blur: 0,
      saturation: 1,
      opacity: 0.95,
      speedRatio: 1.0,
      duration: 7,
    },
    {
      id: 'layer-fore-2',
      imageSrc: foregroundImage2,
      alt: 'Foreground layer 2',
      zIndex: 6,
      blur: 0,
      saturation: 1,
      opacity: 1,
      speedRatio: 1.2,
      duration: 5,
    },
  ];

  // Build layer components with effects
  const layerComponents = layers.map((layer) => {
    const layerId = `${layer.id}`;
    const contentId = `${layer.id}-content`;
    const effectId = `${layer.id}-parallax-effect`;

    const layerEffect = createParallaxEffect(
      layerId,
      layer.speedRatio,
      layer.duration,
      effectId,
    );

    return {
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: layer.zIndex,
            filter: `blur(${layer.blur}px) saturate(${layer.saturation})`,
            opacity: layer.opacity,
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: sceneDuration,
        },
      },
      effects: [layerEffect],
      childrenData: [
        {
          id: contentId,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: layer.imageSrc,
            alt: layer.alt,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: sceneDuration,
            },
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create particle components
  const particleComponents: RenderableComponentData[] = [];
  
  if (enableParticles) {
    for (let i = 0; i < 12; i++) {
      const particleProps = generateParticleProps(i);
      const particleId = `particle-${i}`;
      const particleEffectId = `particle-${i}-float-effect`;

      const particleEffect = createParticleEffect(particleId, i, particleEffectId);

      particleComponents.push({
        id: particleId,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'circle',
          className: 'absolute',
          containerProps: {
            style: {
              width: particleProps.size,
              height: particleProps.size,
              backgroundColor: particleColor,
              opacity: particleProps.opacity,
              left: particleProps.x,
              top: particleProps.y,
              filter: `blur(${particleProps.blur})`,
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: sceneDuration,
          },
        },
        effects: [particleEffect],
      } as RenderableComponentData);
    }
  }

  // Particles layer container
  const particlesLayer: RenderableComponentData | null = enableParticles ? {
    id: 'particles-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 7,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: sceneDuration,
      },
    },
    childrenData: particleComponents,
  } as RenderableComponentData : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-depth-parallax-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: sceneDuration,
      },
    },
    childrenData: [
      ...layerComponents,
      ...(particlesLayer ? [particlesLayer] : []),
    ],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'cinematic-depth-parallax',
  title: 'Cinematic Depth Parallax',
  description: 'A professional multi-layer parallax preset that mimics cinematic depth-of-field effects with 7 layers moving at calculated speed ratios. Features atmospheric perspective through progressive blur and opacity reduction on distant layers, GPU-accelerated transforms, floating particle depth cues, and smooth cubic-bezier easing that mirrors real camera dolly movement.',
  type: 'predefined',
  presetType: 'children',
  tags: ['parallax', 'cinematic', 'depth-of-field', 'dolly-zoom', 'visual-effects', 'layered', 'atmospheric'],
  defaultInputParams: {
    backgroundImage1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    backgroundImage2: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    midgroundImage1: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop',
    midgroundImage2: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&h=1080&fit=crop',
    foregroundImage1: 'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=1920&h=1080&fit=crop',
    foregroundImage2: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&h=1080&fit=crop',
    movementIntensity: 1.0,
    direction: 'horizontal',
    particleColor: 'rgba(255, 255, 255, 0.6)',
    enableParticles: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const cinematicDepthParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
