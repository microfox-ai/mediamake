/**
 * Venetian Blinds Particle Dissolve Transition Preset
 *
 * High-end motion graphics transition where 6 vertical blinds break into particles
 * and scatter as they slide horizontally. Each blind is composed of a 5x20 grid of
 * particle divs (100 particles total per blind). As the blind slides left, particles
 * scatter with random transforms (translateX/Y, rotation, scale) and fade out with
 * a frosted glass effect (backdrop-filter blur).
 *
 * Features:
 * - 6 vertical blinds sliding left with staggered timing (0s, 0.05s, 0.1s, 0.15s, 0.2s, 0.25s)
 * - Each blind contains 5x20 grid (100 particles) using BaseLayout grid system
 * - Particles have individual animations: random translateX/Y, rotation, scale, opacity fadeout
 * - Wave-like particle dissolution: delay based on (row * 20ms + col * 10ms)
 * - Backdrop-filter blur on particles for frosted glass effect
 * - Spring easing for organic scatter motion
 * - GPU-accelerated transforms (will-change-transform)
 *
 * Use cases:
 * - Transition between scenes with dramatic particle effect
 * - High-end motion graphics transitions
 * - Creative scene transitions with organic dissolution
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Total duration of the transition in seconds'),
  blindCount: z
    .number()
    .min(3)
    .max(10)
    .default(6)
    .describe('Number of vertical blinds'),
  gridCols: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Number of particle columns in each blind grid'),
  gridRows: z
    .number()
    .min(5)
    .max(30)
    .default(20)
    .describe('Number of particle rows in each blind grid'),
  blindStagger: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.05)
    .describe('Delay between each blind animation start (seconds)'),
  particleScatterRange: z
    .number()
    .min(10)
    .max(200)
    .default(50)
    .describe('Maximum scatter distance for particles (pixels)'),
  particleRotationRange: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .describe('Maximum rotation for particles (degrees)'),
  particleRowDelay: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Delay per row for wave effect (milliseconds)'),
  particleColDelay: z
    .number()
    .min(0)
    .max(100)
    .default(10)
    .describe('Delay per column for wave effect (milliseconds)'),
  backdropBlur: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Backdrop filter blur amount (pixels)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    transitionDuration,
    blindCount,
    gridCols,
    gridRows,
    blindStagger,
    particleScatterRange,
    particleRotationRange,
    particleRowDelay,
    particleColDelay,
    backdropBlur,
  } = params;

  // Calculate particle count and create particle grids
  const particleCount = gridCols * gridRows;
  const blindSlideDuration = 1.0; // Duration for blind to slide out

  // Helper function to generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper function to create particle effects for a single blind
  const createParticleEffects = (
    blindIndex: number,
  ): RenderableComponentData[] => {
    const effects: RenderableComponentData[] = [];

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const particleIndex = row * gridCols + col;
        const particleId = `blind-${blindIndex}-particle-${particleIndex}`;

        // Calculate staggered delay based on grid position
        const particleDelay = (row * particleRowDelay + col * particleColDelay) / 1000; // Convert ms to seconds

        // Random scatter transforms
        const randomTranslateX = randomInRange(
          -particleScatterRange,
          particleScatterRange,
        );
        const randomTranslateY = randomInRange(
          -particleScatterRange,
          particleScatterRange,
        );
        const randomRotation = randomInRange(
          -particleRotationRange,
          particleRotationRange,
        );

        // Create particle scatter effect
        const particleEffect = {
          id: `${particleId}-scatter`,
          componentId: 'generic' as const,
          data: {
            type: 'spring' as const,
            start: particleDelay, // Relative to blind start
            duration: blindSlideDuration - particleDelay, // Complete before blind ends
            mode: 'provider' as const,
            targetIds: [particleId],
            ranges: [
              // Translate X
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: randomTranslateX, prog: 1, unit: 'px' },
              // Translate Y
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: randomTranslateY, prog: 1, unit: 'px' },
              // Rotation
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: randomRotation, prog: 1 },
              // Scale
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              // Opacity (fade out in final 40%)
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        };

        effects.push(particleEffect as RenderableComponentData);
      }
    }

    return effects;
  };

  // Helper function to create particle grid for a single blind
  const createParticleGrid = (blindIndex: number): RenderableComponentData => {
    const particles: RenderableComponentData[] = [];

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const particleIndex = row * gridCols + col;
        const particleId = `blind-${blindIndex}-particle-${particleIndex}`;

        particles.push({
          id: particleId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: `w-full h-full bg-black/80`,
              style: {
                backdropFilter: `blur(${backdropBlur}px)`,
                willChange: 'transform, opacity',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: blindSlideDuration,
            },
          },
          childrenData: [],
        } as RenderableComponentData);
      }
    }

    return {
      id: `blind-${blindIndex}-particles`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 grid grid-cols-${gridCols} grid-rows-${gridRows} gap-0`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: blindSlideDuration,
        },
      },
      childrenData: particles,
      effects: createParticleEffects(blindIndex),
    } as RenderableComponentData;
  };

  // Create all blinds
  const blinds: RenderableComponentData[] = [];

  for (let i = 0; i < blindCount; i++) {
    const blindStartTime = i * blindStagger;

    blinds.push({
      id: `blind-${i}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex-1 relative overflow-hidden',
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `blind-${i}-slide`,
          componentId: 'generic' as const,
          data: {
            type: 'spring' as const,
            start: blindStartTime, // Staggered start relative to container
            duration: blindSlideDuration,
            mode: 'provider' as const,
            targetIds: [`blind-${i}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: -100, prog: 1, unit: '%' },
            ],
          },
        },
      ],
      childrenData: [createParticleGrid(i)],
    } as RenderableComponentData);
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blinds-particle-dissolve-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-row',
        style: {
          gap: '0px',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: blinds,
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
  id: 'venetian-blinds-particle-dissolve',
  title: 'Venetian Blinds Particle Dissolve Transition',
  description:
    'High-end motion graphics transition where vertical blinds break into particles and scatter with random transforms as they slide horizontally. Features spring easing, staggered particle dissolution, backdrop-filter blur, and opacity fadeout for a frosted glass effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'blinds',
    'particle',
    'dissolve',
    'scatter',
    'motion-graphics',
    'high-end',
    'frosted-glass',
    'spring',
    'staggered',
  ],
  defaultInputParams: {
    transitionDuration: 1.5,
    blindCount: 6,
    gridCols: 5,
    gridRows: 20,
    blindStagger: 0.05,
    particleScatterRange: 50,
    particleRotationRange: 180,
    particleRowDelay: 20,
    particleColDelay: 10,
    backdropBlur: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const venetianBlindsParticleDissolvePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};