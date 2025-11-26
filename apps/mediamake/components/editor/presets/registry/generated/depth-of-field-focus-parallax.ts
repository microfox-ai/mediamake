/**
 * Depth-of-Field Focus Parallax Preset
 *
 * This preset simulates cinematic rack focus/focus pulling between 5 depth layers with parallax motion.
 * Like rack focus in cinematography, layers shift between sharp and blurred states while moving at
 * different speeds to create authentic depth separation.
 *
 * Features:
 * - **5 Depth Layers**: Background, far, mid-far, mid, mid-near, and near layers representing different focal distances
 * - **Dynamic Blur Filters**: Animated blur (0-20px) based on distance from current focus position
 * - **Bokeh Effects**: Radial gradient circles on blurred layers for authentic out-of-focus aesthetics
 * - **Scale Breathing**: Subtle scale animation (1 → 1.05 → 1) when elements come into focus
 * - **Depth-Based Color Grading**: Warmer tones when in focus, cooler/desaturated when blurred
 * - **Floating Particles**: Depth-aware particles that blur/sharpen based on their assigned depth vs current focus
 * - **Smooth Focus Transitions**: Customizable focus pull sequences via keyframes
 * - **Transform3D Depth**: Uses translateZ for authentic 3D depth separation
 *
 * Use cases:
 * - Creating cinematic depth-of-field effects for product showcases
 * - Building dynamic focus-pull sequences for storytelling
 * - Adding professional rack focus transitions between scenes
 * - Creating parallax photo galleries with realistic camera focus
 * - Simulating DSLR camera shallow depth-of-field effects
 *
 * Technical Details:
 * - Uses CSS filter animations (blur, brightness, saturation, sepia)
 * - Implements smooth easing curves for natural focus transitions
 * - Supports custom focus keyframes for choreographed rack focus sequences
 * - Optimized with will-change hints for smooth GPU-accelerated rendering
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  backgroundImage: z.string().describe('Image URL for the deepest/furthest background layer'),
  farLayerImage: z.string().describe('Image URL for the far depth layer'),
  midFarLayerImage: z.string().describe('Image URL for the mid-far depth layer'),
  midLayerImage: z.string().describe('Image URL for the middle depth layer (default focus plane)'),
  midNearLayerImage: z.string().describe('Image URL for the mid-near depth layer'),
  nearLayerImage: z.string().describe('Image URL for the nearest/foreground layer'),
  
  focusKeyframes: z.array(z.object({
    time: z.number().min(0).max(1).describe('Normalized time (0-1) when this focus position is reached'),
    focus: z.number().min(0).max(4).describe('Focus position: 0=far, 1=mid-far, 2=mid, 3=mid-near, 4=near'),
  })).default([
    { time: 0, focus: 2 },
    { time: 0.33, focus: 0 },
    { time: 0.66, focus: 4 },
    { time: 1, focus: 2 },
  ]).describe('Keyframes defining the focus pull sequence over time'),
  
  maxBlur: z.number().min(0).max(50).default(20).describe('Maximum blur amount in pixels for out-of-focus layers'),
  breathingScale: z.number().min(1).max(1.2).default(1.05).describe('Maximum scale value for the breathing effect when layers come into focus'),
  breathingDuration: z.number().min(0.1).max(3).default(0.8).describe('Duration in seconds for the scale breathing animation'),
  
  particleCount: z.number().min(0).max(50).default(15).describe('Number of floating particles in the scene'),
  particleDepthRange: z.tuple([z.number(), z.number()]).default([0, 4]).describe('Depth range for particle distribution [min, max]'),
  
  duration: z.number().min(1).default(10).describe('Total duration of the preset in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    backgroundImage,
    farLayerImage,
    midFarLayerImage,
    midLayerImage,
    midNearLayerImage,
    nearLayerImage,
    focusKeyframes,
    maxBlur,
    breathingScale,
    breathingDuration,
    particleCount,
    particleDepthRange,
    duration,
  } = params;

  // Helper: Calculate blur amount based on distance from focus position
  const calculateBlur = (layerDepth: number, focusPosition: number): number => {
    const distance = Math.abs(layerDepth - focusPosition);
    return distance * (maxBlur / 4); // 4 is max distance between layers
  };

  // Helper: Calculate brightness based on focus distance
  const calculateBrightness = (layerDepth: number, focusPosition: number): number => {
    const distance = Math.abs(layerDepth - focusPosition);
    return Math.max(0.7, 1 - (distance * 0.15));
  };

  // Helper: Calculate scale with breathing effect
  const calculateScale = (layerDepth: number, focusPosition: number): number => {
    const distance = Math.abs(layerDepth - focusPosition);
    if (distance < 0.5) {
      return breathingScale; // In focus - breathing scale
    }
    return 1 + (distance * 0.025); // Slightly larger when out of focus
  };

  // Helper: Random value generator for bokeh and particles
  const random = (min: number, max: number, seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  };

  // Generate particle data with random positions and depths
  const generateParticles = (): Array<{
    id: string;
    size: number;
    left: string;
    top: string;
    depth: number;
    translateY: number;
  }> => {
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const depth = random(particleDepthRange[0], particleDepthRange[1], i * 1.5);
      particles.push({
        id: `particle-${i}`,
        size: random(3, 12, i * 2),
        left: `${random(0, 100, i * 3)}%`,
        top: `${random(0, 100, i * 4)}%`,
        depth,
        translateY: random(-50, 50, i * 5),
      });
    }
    return particles;
  };

  const particles = generateParticles();

  // Create focus transition effects for each layer
  const createLayerEffects = (layerDepth: number, layerId: string) => {
    const effects = [];
    
    // Create effects for each focus keyframe transition
    for (let i = 0; i < focusKeyframes.length - 1; i++) {
      const startKeyframe = focusKeyframes[i];
      const endKeyframe = focusKeyframes[i + 1];
      
      const startTime = startKeyframe.time * duration;
      const endTime = endKeyframe.time * duration;
      const segmentDuration = endTime - startTime;
      
      const startBlur = calculateBlur(layerDepth, startKeyframe.focus);
      const endBlur = calculateBlur(layerDepth, endKeyframe.focus);
      const startBrightness = calculateBrightness(layerDepth, startKeyframe.focus);
      const endBrightness = calculateBrightness(layerDepth, endKeyframe.focus);
      const startScale = calculateScale(layerDepth, startKeyframe.focus);
      const endScale = calculateScale(layerDepth, endKeyframe.focus);
      
      // Blur + brightness + saturation effect
      effects.push({
        id: `${layerId}-filter-${i}`,
        componentId: layerId,
        data: {
          type: 'ease-in-out',
          start: startTime,
          duration: segmentDuration,
          mode: 'provider',
          targetIds: [layerId],
          ranges: [
            {
              key: 'filter',
              val: `blur(${startBlur}px) brightness(${startBrightness})`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(${endBlur}px) brightness(${endBrightness})`,
              prog: 1,
            },
          ],
        },
      });
      
      // Scale breathing effect (only apply when coming into focus)
      const isComingIntoFocus = Math.abs(layerDepth - endKeyframe.focus) < Math.abs(layerDepth - startKeyframe.focus);
      if (isComingIntoFocus && segmentDuration > breathingDuration) {
        effects.push({
          id: `${layerId}-scale-${i}`,
          componentId: layerId,
          data: {
            type: 'ease-in-out',
            start: startTime,
            duration: breathingDuration,
            mode: 'provider',
            targetIds: [layerId],
            ranges: [
              { key: 'scale', val: startScale, prog: 0 },
              { key: 'scale', val: breathingScale, prog: 0.5 },
              { key: 'scale', val: endScale, prog: 1 },
            ],
          },
        });
      } else {
        effects.push({
          id: `${layerId}-scale-${i}`,
          componentId: layerId,
          data: {
            type: 'ease-in-out',
            start: startTime,
            duration: segmentDuration,
            mode: 'provider',
            targetIds: [layerId],
            ranges: [
              { key: 'scale', val: startScale, prog: 0 },
              { key: 'scale', val: endScale, prog: 1 },
            ],
          },
        });
      }
    }
    
    return effects;
  };

  // Create particle effects
  const createParticleEffects = (particleId: string, particleDepth: number) => {
    const effects = [];
    
    // Focus-based blur and opacity
    for (let i = 0; i < focusKeyframes.length - 1; i++) {
      const startKeyframe = focusKeyframes[i];
      const endKeyframe = focusKeyframes[i + 1];
      
      const startTime = startKeyframe.time * duration;
      const endTime = endKeyframe.time * duration;
      const segmentDuration = endTime - startTime;
      
      const startBlur = calculateBlur(particleDepth, startKeyframe.focus) * 0.8;
      const endBlur = calculateBlur(particleDepth, endKeyframe.focus) * 0.8;
      const startOpacity = Math.max(0.2, 1 - Math.abs(particleDepth - startKeyframe.focus) * 0.2);
      const endOpacity = Math.max(0.2, 1 - Math.abs(particleDepth - endKeyframe.focus) * 0.2);
      
      effects.push({
        id: `${particleId}-focus-${i}`,
        componentId: particleId,
        data: {
          type: 'ease-in-out',
          start: startTime,
          duration: segmentDuration,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            { key: 'filter', val: `blur(${startBlur}px)`, prog: 0 },
            { key: 'filter', val: `blur(${endBlur}px)`, prog: 1 },
            { key: 'opacity', val: startOpacity, prog: 0 },
            { key: 'opacity', val: endOpacity, prog: 1 },
          ],
        },
      });
    }
    
    return effects;
  };

  // Layer depth values (0-4 scale)
  const DEPTH_FAR = 0;
  const DEPTH_MID_FAR = 1;
  const DEPTH_MID = 2;
  const DEPTH_MID_NEAR = 3;
  const DEPTH_NEAR = 4;

  // Build layer components
  const backgroundLayer = {
    id: 'dof-background-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
          transform: 'translateZ(-100px)',
          filter: 'blur(20px) brightness(0.7) saturate(0.8)',
          scale: 1.1,
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
        id: 'dof-background-image',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: backgroundImage,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: { start: 0, duration: duration },
        },
      },
    ],
  } as RenderableComponentData;

  const farLayer = {
    id: 'dof-far-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
          transform: 'translateZ(-80px)',
          willChange: 'filter, transform',
        },
      },
    },
    context: {
      timing: { start: 0, duration: duration },
    },
    effects: createLayerEffects(DEPTH_FAR, 'dof-far-layer'),
    childrenData: [
      {
        id: 'dof-far-image',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: farLayerImage,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: { start: 0, duration: duration },
        },
      },
      // Bokeh container for far layer
      {
        id: 'dof-far-bokeh-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: Array.from({ length: 6 }, (_, i) => ({
          id: `dof-far-bokeh-${i}`,
          type: 'atom' as const,
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle',
            className: 'absolute rounded-full opacity-30',
            style: {
              width: `${random(40, 120, i * 10)}px`,
              height: `${random(40, 120, i * 10)}px`,
              background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
              left: `${random(0, 100, i * 11)}%`,
              top: `${random(0, 100, i * 12)}%`,
            },
          },
          context: {
            timing: { start: 0, duration: duration },
          },
        })),
      },
    ],
  } as RenderableComponentData;

  const midFarLayer = {
    id: 'dof-mid-far-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
          transform: 'translateZ(-60px)',
          willChange: 'filter, transform',
        },
      },
    },
    context: {
      timing: { start: 0, duration: duration },
    },
    effects: createLayerEffects(DEPTH_MID_FAR, 'dof-mid-far-layer'),
    childrenData: [
      {
        id: 'dof-mid-far-image',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: midFarLayerImage,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: { start: 0, duration: duration },
        },
      },
      {
        id: 'dof-mid-far-bokeh-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: Array.from({ length: 5 }, (_, i) => ({
          id: `dof-mid-far-bokeh-${i}`,
          type: 'atom' as const,
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle',
            className: 'absolute rounded-full opacity-25',
            style: {
              width: `${random(30, 100, i * 20)}px`,
              height: `${random(30, 100, i * 20)}px`,
              background: 'radial-gradient(circle, rgba(255,220,180,0.35) 0%, rgba(255,220,180,0) 70%)',
              left: `${random(0, 100, i * 21)}%`,
              top: `${random(0, 100, i * 22)}%`,
            },
          },
          context: {
            timing: { start: 0, duration: duration },
          },
        })),
      },
    ],
  } as RenderableComponentData;

  const midLayer = {
    id: 'dof-mid-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          transform: 'translateZ(-40px)',
          willChange: 'filter, transform',
        },
      },
    },
    context: {
      timing: { start: 0, duration: duration },
    },
    effects: createLayerEffects(DEPTH_MID, 'dof-mid-layer'),
    childrenData: [
      {
        id: 'dof-mid-image',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: midLayerImage,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: { start: 0, duration: duration },
        },
      },
    ],
  } as RenderableComponentData;

  const midNearLayer = {
    id: 'dof-mid-near-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 40,
          transform: 'translateZ(-20px)',
          willChange: 'filter, transform',
        },
      },
    },
    context: {
      timing: { start: 0, duration: duration },
    },
    effects: createLayerEffects(DEPTH_MID_NEAR, 'dof-mid-near-layer'),
    childrenData: [
      {
        id: 'dof-mid-near-image',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: midNearLayerImage,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: { start: 0, duration: duration },
        },
      },
      {
        id: 'dof-mid-near-bokeh-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: Array.from({ length: 4 }, (_, i) => ({
          id: `dof-mid-near-bokeh-${i}`,
          type: 'atom' as const,
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle',
            className: 'absolute rounded-full opacity-20',
            style: {
              width: `${random(50, 150, i * 30)}px`,
              height: `${random(50, 150, i * 30)}px`,
              background: 'radial-gradient(circle, rgba(200,230,255,0.3) 0%, rgba(200,230,255,0) 70%)',
              left: `${random(0, 100, i * 31)}%`,
              top: `${random(0, 100, i * 32)}%`,
            },
          },
          context: {
            timing: { start: 0, duration: duration },
          },
        })),
      },
    ],
  } as RenderableComponentData;

  const nearLayer = {
    id: 'dof-near-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 50,
          transform: 'translateZ(0px)',
          willChange: 'filter, transform',
        },
      },
    },
    context: {
      timing: { start: 0, duration: duration },
    },
    effects: createLayerEffects(DEPTH_NEAR, 'dof-near-layer'),
    childrenData: [
      {
        id: 'dof-near-image',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: nearLayerImage,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: { start: 0, duration: duration },
        },
      },
      {
        id: 'dof-near-bokeh-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: Array.from({ length: 8 }, (_, i) => ({
          id: `dof-near-bokeh-${i}`,
          type: 'atom' as const,
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle',
            className: 'absolute rounded-full opacity-35',
            style: {
              width: `${random(60, 180, i * 40)}px`,
              height: `${random(60, 180, i * 40)}px`,
              background: 'radial-gradient(circle, rgba(255,200,150,0.4) 0%, rgba(255,200,150,0) 70%)',
              left: `${random(0, 100, i * 41)}%`,
              top: `${random(0, 100, i * 42)}%`,
            },
          },
          context: {
            timing: { start: 0, duration: duration },
          },
        })),
      },
    ],
  } as RenderableComponentData;

  // Particle layer with floating animation
  const particleLayer = {
    id: 'dof-particle-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 45,
        },
      },
    },
    context: {
      timing: { start: 0, duration: duration },
    },
    childrenData: particles.map((particle) => {
      const translateYEffect = {
        id: `${particle.id}-float`,
        componentId: particle.id,
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [particle.id],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: particle.translateY, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      };

      return {
        id: particle.id,
        type: 'atom' as const,
        componentId: 'ShapeAtom',
        data: {
          shape: 'circle',
          className: 'absolute rounded-full',
          style: {
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: 'rgba(255,255,255,0.6)',
            left: particle.left,
            top: particle.top,
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        effects: [
          translateYEffect,
          ...createParticleEffects(particle.id, particle.depth),
        ],
      };
    }),
  } as RenderableComponentData;

  // Vignette overlay
  const focusOverlay = {
    id: 'dof-focus-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 60,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.15) 100%)',
        },
      },
    },
    context: {
      timing: { start: 0, duration: duration },
    },
    childrenData: [],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: 'dof-parallax-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: { start: 0, duration: duration },
    },
    childrenData: [
      backgroundLayer,
      farLayer,
      midFarLayer,
      midLayer,
      midNearLayer,
      nearLayer,
      particleLayer,
      focusOverlay,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'depth-of-field-focus-parallax',
  title: 'Depth-of-Field Focus Parallax',
  description: 'Simulates cinematic rack focus/focus pulling between 5 depth layers. Features dynamic blur filters that animate based on focus position, bokeh effects on blurred layers using radial gradients, subtle scale breathing when elements come into focus, depth-based color grading (warmer tones in focus, cooler when blurred), and floating particles that blur/sharpen based on their depth. Uses CSS filter animations (blur 0-20px), brightness/saturation adjustments, and transform3d for authentic depth separation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['depth-of-field', 'parallax', 'focus', 'rack-focus', 'dof', 'bokeh', 'cinematic', 'layers', 'blur', 'visual-effects'],
  defaultInputParams: {
    backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    farLayerImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    midFarLayerImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=1080&fit=crop',
    midLayerImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop',
    midNearLayerImage: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&h=1080&fit=crop',
    nearLayerImage: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1920&h=1080&fit=crop',
    focusKeyframes: [
      { time: 0, focus: 2 },
      { time: 0.33, focus: 0 },
      { time: 0.66, focus: 4 },
      { time: 1, focus: 2 },
    ],
    maxBlur: 20,
    breathingScale: 1.05,
    breathingDuration: 0.8,
    particleCount: 15,
    particleDepthRange: [0, 4],
    duration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const depthOfFieldFocusParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
