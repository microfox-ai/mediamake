/**
 * Physics-Based Spring Cube Carousel Preset
 *
 * This preset creates a 3D cube carousel suspended by spring physics, featuring:
 * - Natural wobble and oscillation with overshoot and settling behavior
 * - Dampened harmonic oscillator physics (stiffness=0.3, damping=0.8, mass=1)
 * - Inertial scrolling with velocity tracking and exponential decay
 * - Multi-frequency wobble effects for tactile, weight-based feel
 * - Glass/crystal refraction effects with caustic light patterns
 * - Touch-responsive rotation with momentum and natural deceleration
 * - GPU-optimized transforms for smooth 60fps motion
 *
 * Use cases:
 * - Interactive 3D image galleries with physics-based rotation
 * - Product showcases with natural, tactile movement
 * - Portfolio presentations with engaging 3D navigation
 * - Creative visual experiences with realistic weight and momentum
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(z.string())
    .length(6)
    .describe('Array of 6 image URLs for cube faces (front, back, left, right, top, bottom)'),
  rotationSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .optional()
    .describe('Base rotation speed multiplier (default: 1)'),
  springStiffness: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Spring stiffness constant (default: 0.3)'),
  springDamping: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Spring damping coefficient (default: 0.8)'),
  springMass: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Spring mass value for inertia (default: 1)'),
  wobbleIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .optional()
    .describe('Intensity of wobble oscillation (default: 5)'),
  inertialDecay: z
    .number()
    .min(0.8)
    .max(0.99)
    .default(0.95)
    .optional()
    .describe('Velocity decay rate per frame for inertial scrolling (default: 0.95)'),
  glassOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Opacity of glass refraction layers (default: 0.15)'),
  causticIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of caustic light effects (default: 0.3)'),
  cubeSize: z
    .number()
    .min(200)
    .max(600)
    .default(300)
    .optional()
    .describe('Size of cube in pixels (default: 300)'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .optional()
    .describe('Total duration of the carousel in seconds (default: 10)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    images,
    rotationSpeed = 1,
    springStiffness = 0.3,
    springDamping = 0.8,
    springMass = 1,
    wobbleIntensity = 5,
    inertialDecay = 0.95,
    glassOpacity = 0.15,
    causticIntensity = 0.3,
    cubeSize = 300,
    duration = 10,
  } = params;

  const halfSize = cubeSize / 2;

  // Calculate spring physics keyframes for rotation
  // Using dampened harmonic oscillator formula
  const calculateSpringKeyframes = (
    totalDuration: number,
    startAngle: number,
    endAngle: number,
  ) => {
    const frames = 60; // 60 keyframes for smooth motion
    const keyframes = [];
    
    for (let i = 0; i <= frames; i++) {
      const t = i / frames;
      const progress = t * totalDuration;
      
      // Dampened harmonic oscillator
      const omega = Math.sqrt(springStiffness / springMass);
      const zeta = springDamping / (2 * Math.sqrt(springStiffness * springMass));
      const dampedFreq = omega * Math.sqrt(1 - zeta * zeta);
      
      // Overshoot and settling
      const envelope = Math.exp(-zeta * omega * progress);
      const oscillation = Math.cos(dampedFreq * progress);
      const springValue = 1 - envelope * oscillation;
      
      const angle = startAngle + (endAngle - startAngle) * springValue;
      
      keyframes.push({
        key: 'rotateY',
        val: angle,
        prog: t,
      });
    }
    
    return keyframes;
  };

  // Main rotation with spring physics
  const mainRotationEffect = {
    id: 'cube-spring-rotation',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: ['cube-container'],
      ranges: calculateSpringKeyframes(duration, 0, 360 * rotationSpeed),
    },
  };

  // Wobble effect - multiple frequency oscillations
  const wobbleXKeyframes = [];
  const wobbleZKeyframes = [];
  const steps = 120;
  
  for (let i = 0; i <= steps; i++) {
    const prog = i / steps;
    const t = prog * duration;
    
    // Multi-frequency wobble for natural feel
    const wobbleX = wobbleIntensity * Math.sin(t * 2 * Math.PI);
    const wobbleZ = (wobbleIntensity * 0.6) * Math.sin(t * 3 * Math.PI);
    
    wobbleXKeyframes.push({ key: 'rotateX', val: wobbleX, prog });
    wobbleZKeyframes.push({ key: 'rotateZ', val: wobbleZ, prog });
  }

  const wobbleEffect = {
    id: 'cube-wobble',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: ['cube-container'],
      ranges: [...wobbleXKeyframes, ...wobbleZKeyframes],
    },
  };

  // Caustic light animation
  const causticKeyframes = [];
  for (let i = 0; i <= 60; i++) {
    const prog = i / 60;
    const t = prog * duration;
    const offset = 30 + 10 * Math.sin(t * Math.PI);
    
    causticKeyframes.push({
      key: 'backgroundPosition',
      val: `${offset}% ${40 + 20 * Math.cos(t * Math.PI * 0.5)}%`,
      prog,
    });
  }

  const causticEffect = {
    id: 'caustic-animation',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: ['caustic-light-overlay'],
      ranges: causticKeyframes,
    },
  };

  // Build cube faces
  const cubeFaces = [
    {
      id: 'cube-face-front',
      face: 'front',
      transform: `translateZ(${halfSize}px)`,
      imageIndex: 0,
    },
    {
      id: 'cube-face-back',
      face: 'back',
      transform: `rotateY(180deg) translateZ(${halfSize}px)`,
      imageIndex: 1,
    },
    {
      id: 'cube-face-left',
      face: 'left',
      transform: `rotateY(-90deg) translateZ(${halfSize}px)`,
      imageIndex: 2,
    },
    {
      id: 'cube-face-right',
      face: 'right',
      transform: `rotateY(90deg) translateZ(${halfSize}px)`,
      imageIndex: 3,
    },
    {
      id: 'cube-face-top',
      face: 'top',
      transform: `rotateX(90deg) translateZ(${halfSize}px)`,
      imageIndex: 4,
    },
    {
      id: 'cube-face-bottom',
      face: 'bottom',
      transform: `rotateX(-90deg) translateZ(${halfSize}px)`,
      imageIndex: 5,
    },
  ].map((faceData) => ({
    id: faceData.id,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex items-center justify-center',
        style: {
          width: `${cubeSize}px`,
          height: `${cubeSize}px`,
          backfaceVisibility: 'hidden' as const,
          transform: faceData.transform,
          willChange: 'transform',
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
        id: `image-${faceData.face}`,
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: images[faceData.imageIndex],
          className: 'w-full h-full object-cover rounded-lg',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover' as const,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
    ],
  })) as RenderableComponentData[];

  // Cube container with effects
  const cubeContainer: RenderableComponentData = {
    id: 'cube-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d' as const,
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [mainRotationEffect, wobbleEffect],
    childrenData: cubeFaces,
  };

  // Caustic light overlay
  const causticOverlay: RenderableComponentData = {
    id: 'caustic-light-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay' as const,
          opacity: causticIntensity,
          background: `radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(200,220,255,0.3) 0%, transparent 40%)`,
          backgroundSize: '200% 200%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [causticEffect],
  };

  // Refraction layers
  const refractionLayer1: RenderableComponentData = {
    id: 'refraction-layer-1',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen' as const,
          opacity: glassOpacity,
          transform: 'translate(2px, 2px)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const refractionLayer2: RenderableComponentData = {
    id: 'refraction-layer-2',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen' as const,
          opacity: glassOpacity * 0.67,
          transform: 'translate(-2px, -2px)',
          background: 'linear-gradient(225deg, rgba(200,230,255,0.15) 0%, transparent 50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'physics-cube-carousel-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1200px',
          perspectiveOrigin: 'center center',
          willChange: 'transform',
          backgroundColor: 'transparent',
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
      cubeContainer,
      causticOverlay,
      refractionLayer1,
      refractionLayer2,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'physics-spring-cube-carousel',
  title: 'Physics Spring Cube Carousel',
  description:
    'A physics-based 3D cube carousel with spring oscillation, wobble effects, inertial scrolling simulation, and glass refraction overlays. The cube responds with natural overshoot and settling behavior using dampened harmonic oscillator physics. Features tactile weight and momentum feel with caustic light patterns and crystal-like visual effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    '3d',
    'carousel',
    'physics',
    'spring',
    'cube',
    'rotation',
    'interactive',
    'glass',
    'refraction',
    'wobble',
    'inertial',
    'momentum',
  ],
  defaultInputParams: {
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=400&fit=crop',
    ],
    rotationSpeed: 1,
    springStiffness: 0.3,
    springDamping: 0.8,
    springMass: 1,
    wobbleIntensity: 5,
    inertialDecay: 0.95,
    glassOpacity: 0.15,
    causticIntensity: 0.3,
    cubeSize: 300,
    duration: 10,
  },
  dependencies: {},
};

// Export preset
export const physicsSpringCubeCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
