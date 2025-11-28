/**
 * Glitch Breathing Animation Preset
 *
 * A cyberpunk-style breathing animation that combines smooth scale pulsing with
 * intermittent digital glitch effects. The animation creates a "breathing" effect
 * where content smoothly scales between 100-108%, occasionally interrupted by
 * random glitch moments featuring:
 * - Rapid scale spikes to 130%
 * - RGB color channel separation (chromatic aberration)
 * - Hue rotation, contrast, and brightness shifts
 * - Digital glow effects with neon colors
 *
 * The glitch events are triggered at controlled random intervals (3-5 seconds apart)
 * to create an unpredictable, corrupted-data aesthetic perfect for tech content,
 * cyberpunk visuals, or corrupted video effects.
 *
 * Features:
 * - Smooth breathing animation (scale 1.0 → 1.08 → 1.0)
 * - Random glitch events with RGB channel separation
 * - Chromatic aberration via translateX offsets on color channels
 * - Filter effects: hue-rotate, contrast, brightness
 * - Neon glow text shadows (#ff0000, #00ffff)
 * - Performance optimized with transform-gpu and CSS containment
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(5)
    .max(300)
    .default(30)
    .describe('Total duration of the glitch breathing animation in seconds'),
  baseBreathingDuration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Duration of one breathing cycle (scale pulse) in seconds'),
  glitchFrequency: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe(
      'Probability of glitch occurring per second (0.2 = 20% chance per second)',
    ),
  glitchDuration: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Duration of each glitch event in seconds'),
  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for glitch effects (scale, translation, filters)'),
  minGlitchInterval: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Minimum seconds between glitch events to prevent performance issues'),
  breathingScaleMin: z
    .number()
    .min(0.8)
    .max(1.2)
    .default(1)
    .describe('Minimum scale during breathing cycle'),
  breathingScaleMax: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.08)
    .describe('Maximum scale during breathing cycle'),
  glitchScalePeak: z
    .number()
    .min(1.1)
    .max(2)
    .default(1.3)
    .describe('Peak scale during glitch spike'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration;
  const baseBreathingDuration = params.baseBreathingDuration;
  const glitchFrequency = params.glitchFrequency;
  const glitchDuration = params.glitchDuration;
  const glitchIntensity = params.glitchIntensity;
  const minGlitchInterval = params.minGlitchInterval;
  const breathingScaleMin = params.breathingScaleMin;
  const breathingScaleMax = params.breathingScaleMax;
  const glitchScalePeak = params.glitchScalePeak;

  // Generate random glitch event timings
  const generateGlitchTimings = (
    totalDuration: number,
    frequency: number,
    minInterval: number,
  ): number[] => {
    const glitchTimes: number[] = [];
    let currentTime = minInterval; // Start after initial interval

    while (currentTime < totalDuration - glitchDuration) {
      // Random check: should glitch occur?
      const shouldGlitch = Math.random() < frequency;
      
      if (shouldGlitch) {
        glitchTimes.push(currentTime);
        currentTime += minInterval; // Enforce minimum interval
      } else {
        currentTime += 1; // Advance by 1 second and check again
      }
    }

    return glitchTimes;
  };

  const glitchTimings = generateGlitchTimings(
    duration,
    glitchFrequency,
    minGlitchInterval,
  );

  // Base breathing effect (smooth scale pulsing)
  const breathingEffect = {
    id: 'base-breathing',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: ['content-layer'],
      ranges: [
        { key: 'scale', val: breathingScaleMin, prog: 0 },
        { key: 'scale', val: breathingScaleMax, prog: 0.5 },
        { key: 'scale', val: breathingScaleMin, prog: 1 },
      ],
    },
  };

  // Generate glitch effects
  const glitchEffects = glitchTimings.flatMap((glitchTime, index) => {
    const rgbOffsetIntensity = 5 * glitchIntensity;
    const scaleIntensity = (glitchScalePeak - 1) * glitchIntensity + 1;

    return [
      // Glitch scale spike on content layer
      {
        id: `glitch-scale-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: glitchTime,
          duration: glitchDuration,
          mode: 'provider' as const,
          targetIds: ['content-layer'],
          ranges: [
            { key: 'scale', val: breathingScaleMax, prog: 0 },
            { key: 'scale', val: scaleIntensity, prog: 0.3 },
            { key: 'scale', val: breathingScaleMin, prog: 1 },
          ],
        },
      },
      // Red channel separation (translateX left)
      {
        id: `glitch-red-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: glitchTime,
          duration: glitchDuration,
          mode: 'provider' as const,
          targetIds: ['red-channel-layer'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -rgbOffsetIntensity, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Blue channel separation (translateX right)
      {
        id: `glitch-blue-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: glitchTime,
          duration: glitchDuration,
          mode: 'provider' as const,
          targetIds: ['blue-channel-layer'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: rgbOffsetIntensity, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Filter effects (hue-rotate, contrast, brightness)
      {
        id: `glitch-filter-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: glitchTime,
          duration: glitchDuration,
          mode: 'provider' as const,
          targetIds: ['content-layer'],
          ranges: [
            { key: 'filter', val: 'hue-rotate(0deg) contrast(100%) brightness(100%)', prog: 0 },
            { key: 'filter', val: `hue-rotate(${90 * glitchIntensity}deg) contrast(${200 * glitchIntensity}%) brightness(${150 * glitchIntensity}%)`, prog: 0.5 },
            { key: 'filter', val: 'hue-rotate(0deg) contrast(100%) brightness(100%)', prog: 1 },
          ],
        },
      },
    ];
  });

  // Root container with relative positioning and performance optimizations
  const rootContainer = {
    id: 'glitch-breathing-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full transform-gpu',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [breathingEffect, ...glitchEffects],
    childrenData: [
      // Red channel layer (screen blend, RGB separation)
      {
        id: 'red-channel-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              mixBlendMode: 'screen',
              willChange: 'transform',
              opacity: 0, // Starts invisible, glitch effects control visibility
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      },
      // Green channel layer (screen blend, no separation for green)
      {
        id: 'green-channel-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              mixBlendMode: 'screen',
              willChange: 'transform',
              opacity: 0, // Not actively used in this preset, kept for symmetry
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      },
      // Blue channel layer (multiply blend, RGB separation)
      {
        id: 'blue-channel-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              mixBlendMode: 'multiply',
              willChange: 'transform',
              opacity: 0, // Starts invisible, glitch effects control visibility
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      },
      // Content layer (main content with breathing and glitch effects)
      {
        id: 'content-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              willChange: 'transform, filter',
              textShadow: '2px 2px 0 #ff0000, -2px -2px 0 #00ffff', // Neon glow
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
          // Main content slot (placeholder for user content)
          {
            id: 'main-content-slot',
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            childrenData: [],
          },
        ],
      },
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

const presetMetadata: PresetMetadata = {
  id: 'glitch-breathing-animation',
  title: 'Glitch Breathing Animation',
  description:
    'A cyberpunk-inspired breathing animation that combines smooth scale pulsing (100-108%) with intermittent digital glitch effects. Features RGB color channel separation, chromatic aberration, rapid scale spikes to 130%, and authentic digital distortion including hue rotation, contrast boosts, and neon glow effects. The animation alternates between calm breathing cycles and sudden glitch bursts for a corrupted-data aesthetic. Optimized for performance with transform-gpu and CSS containment.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'animation',
    'glitch',
    'breathing',
    'cyberpunk',
    'rgb-split',
    'chromatic-aberration',
    'digital',
    'distortion',
    'tech',
    'corrupted',
    'neon',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    duration: 30,
    baseBreathingDuration: 2.5,
    glitchFrequency: 0.2,
    glitchDuration: 0.15,
    glitchIntensity: 1,
    minGlitchInterval: 3,
    breathingScaleMin: 1,
    breathingScaleMax: 1.08,
    glitchScalePeak: 1.3,
  },
};

export const glitchBreathingAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
