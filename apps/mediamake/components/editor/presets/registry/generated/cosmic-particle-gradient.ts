/**
 * Cosmic Particle Gradient Preset
 *
 * A hypnotic particle-based gradient effect simulating cosmic dust flowing in a galaxy-like pattern.
 * Creates thousands of colored particles using CSS radial-gradients positioned absolutely,
 * with each layer having different animation speeds and directions to create depth.
 *
 * Features:
 * - 25-30 layers of CSS radial-gradient particles with random sizes (10-50px)
 * - Random positioning (top: 0-100%, left: 0-100%) for natural distribution
 * - Cosmic color palette (purples, blues, pinks, oranges) with random gradients
 * - Three-dimensional movement: translateX (random -100% to 100%), translateY (random -50% to 50%)
 * - Opacity pulse animation (0.3 → 1 → 0.3) for breathing effect
 * - Staggered delays based on particle index for wave-like motion
 * - Varying durations (5-15s per layer) for natural asynchronous movement
 * - Text with particle-illuminated glow effect (purple/indigo glow)
 * - Black background for maximum contrast
 *
 * Use cases:
 * - Creating cosmic/space-themed backgrounds
 * - Galaxy or nebula-like particle effects
 * - Hypnotic animated backgrounds for titles
 * - Ambient visual effects for intros/outros
 * - Sci-fi or space-themed content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  text: z
    .string()
    .default('COSMIC')
    .describe('Text to display with particle-illuminated glow'),
  particleCount: z
    .number()
    .min(10)
    .max(50)
    .default(28)
    .describe('Number of particle layers to generate (10-50, default: 28)'),
  duration: z
    .number()
    .default(30)
    .describe('Duration of the entire effect in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { text, particleCount, duration } = params;

  // Helper: Generate random number in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random integer in range
  const randomIntInRange = (min: number, max: number): number => {
    return Math.floor(randomInRange(min, max));
  };

  // Helper: Cosmic color palette
  const cosmicColors = [
    'rgba(147, 51, 234, 0.8)', // Purple
    'rgba(168, 85, 247, 0.8)', // Light purple
    'rgba(79, 70, 229, 0.8)', // Indigo
    'rgba(99, 102, 241, 0.8)', // Blue-indigo
    'rgba(59, 130, 246, 0.8)', // Blue
    'rgba(236, 72, 153, 0.8)', // Pink
    'rgba(244, 114, 182, 0.8)', // Light pink
    'rgba(251, 146, 60, 0.8)', // Orange
    'rgba(251, 191, 36, 0.8)', // Yellow-orange
  ];

  // Helper: Generate random color from palette
  const randomColor = (): string => {
    return cosmicColors[randomIntInRange(0, cosmicColors.length)];
  };

  // Generate particle layers
  const particleLayers: RenderableComponentData[] = [];

  for (let i = 0; i < particleCount; i++) {
    const particleSize = randomIntInRange(10, 50);
    const topPosition = randomInRange(0, 100);
    const leftPosition = randomInRange(0, 100);
    const particleColor = randomColor();
    const particleDuration = randomInRange(5, 15);
    const staggerDelay = i * 0.1;

    // Random movement ranges
    const translateXStart = randomInRange(-100, 100);
    const translateXEnd = randomInRange(-100, 100);
    const translateYStart = randomInRange(-50, 50);
    const translateYEnd = randomInRange(-50, 50);

    const particleId = `particle-layer-${i}`;

    // Create particle effects: translateX, translateY, opacity
    const particleEffects = [
      // TranslateX animation
      {
        id: `${particleId}-translateX`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: staggerDelay,
          duration: particleDuration,
          mode: 'provider' as const,
          targetIds: [particleId],
          ranges: [
            { key: 'translateX', val: `${translateXStart}%`, prog: 0 },
            { key: 'translateX', val: `${translateXEnd}%`, prog: 1 },
          ],
        },
      },
      // TranslateY animation
      {
        id: `${particleId}-translateY`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: staggerDelay,
          duration: particleDuration,
          mode: 'provider' as const,
          targetIds: [particleId],
          ranges: [
            { key: 'translateY', val: `${translateYStart}%`, prog: 0 },
            { key: 'translateY', val: `${translateYEnd}%`, prog: 1 },
          ],
        },
      },
      // Opacity pulse animation
      {
        id: `${particleId}-opacity`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: staggerDelay,
          duration: particleDuration,
          mode: 'provider' as const,
          targetIds: [particleId],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ];

    // Create particle layer
    const particleLayer: RenderableComponentData = {
      id: particleId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: `${particleSize}px`,
            height: `${particleSize}px`,
            top: `${topPosition}%`,
            left: `${leftPosition}%`,
            background: `radial-gradient(circle, ${particleColor}, transparent 70%)`,
            borderRadius: '50%',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: particleEffects,
      childrenData: [],
    };

    particleLayers.push(particleLayer);
  }

  // Text content with glow effect
  const textAtom: RenderableComponentData = {
    id: 'text-content',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'relative text-white text-7xl font-thin text-center',
      style: {
        filter:
          'drop-shadow(0 0 20px rgba(147, 51, 234, 0.6)) drop-shadow(0 0 40px rgba(79, 70, 229, 0.4))',
        textShadow: '0 0 30px rgba(168, 85, 247, 0.8)',
      },
      font: {
        family: 'Inter',
        weights: ['100', '200'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Text container (centered, z-index above particles)
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center z-50',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom],
  };

  // Particle field container (holds all particles)
  const particleFieldContainer: RenderableComponentData = {
    id: 'particle-field-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: particleLayers,
  };

  // Root container (black background, overflow hidden)
  const rootContainer: RenderableComponentData = {
    id: 'cosmic-particle-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [particleFieldContainer, textContainer],
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
  id: 'cosmic-particle-gradient',
  title: 'Cosmic Particle Gradient',
  description:
    'A hypnotic particle-based gradient effect simulating cosmic dust flowing in a galaxy-like pattern. Features multiple layers of CSS radial-gradient particles with three-dimensional movement at varying speeds to create depth. Includes text with particle-illuminated glow effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'background',
    'particles',
    'cosmic',
    'galaxy',
    'gradient',
    'animated',
    'glow',
    'space',
    'nebula',
    'hypnotic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'COSMIC',
    particleCount: 28,
    duration: 30,
  },
};

// Export preset
export const cosmicParticleGradientPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
