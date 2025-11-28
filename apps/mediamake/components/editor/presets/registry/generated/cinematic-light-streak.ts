/**
 * Cinematic Light Streak Effect Preset
 *
 * Creates horizontal bands of overexposed light that mimic the bloom effect of bright lights
 * hitting an anamorphic lens. Multiple thin rectangular overlays animate across the frame at
 * different speeds and opacities with soft Gaussian blur edges.
 *
 * Features:
 * - Multiple light streaks with varying widths and intensities
 * - Independent motion at different speeds to create depth
 * - Soft Gaussian blur edges for realistic bloom effect
 * - Customizable color tint (blue for sci-fi, amber for vintage)
 * - Subtle flicker animations simulating unstable light sources
 * - Adjustable bloom intensity and speed variance
 *
 * Use cases:
 * - Cinematic transitions and overlays
 * - Sci-fi or futuristic visual effects
 * - Vintage film aesthetic with warm tones
 * - Music video light effects
 * - Adding atmosphere and depth to scenes
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

const presetParams = z.object({
  streakCount: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of light streaks to generate (3-10)'),
  baseDuration: z
    .number()
    .min(2)
    .max(20)
    .default(8)
    .describe('Base duration for streaks in seconds'),
  intensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Overall bloom intensity (0-1)'),
  colorTint: z
    .string()
    .default('#4A9EFF')
    .describe(
      'Color tint for streaks (hex string, e.g., #4A9EFF for sci-fi blue, #FF9500 for amber)',
    ),
  speedVariance: z
    .number()
    .min(0)
    .max(3)
    .default(1.5)
    .describe('Speed variance for streaks (higher = more variation)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random values
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // Helper function to generate random height with bias toward smaller sizes
  const randomHeight = () => {
    const rand = Math.random();
    if (rand < 0.5) return random(1, 3); // 50% chance: thin streaks
    if (rand < 0.8) return random(3, 5); // 30% chance: medium streaks
    return random(5, 8); // 20% chance: thick streaks
  };

  // Helper function to generate random vertical position
  const randomY = (index: number, count: number) => {
    // Distribute across the frame with some randomness
    const baseSpacing = 100 / (count + 1);
    const basePosition = baseSpacing * (index + 1);
    const variance = random(-15, 15);
    return Math.max(5, Math.min(95, basePosition + variance));
  };

  // Helper function to generate random blur amount
  const randomBlur = () => {
    return random(6, 14);
  };

  // Helper function to generate random start delay
  const randomStartDelay = (index: number) => {
    return index * 0.15 + random(0, 0.3);
  };

  // Helper function to generate flicker keyframes for opacity
  const generateFlickerRanges = (baseIntensity: number) => {
    const flickerAmount = random(0.1, 0.25);
    return [
      { key: 'opacity', val: 0, prog: 0 },
      {
        key: 'opacity',
        val: baseIntensity * random(0.3, 0.5),
        prog: 0.05,
      },
      {
        key: 'opacity',
        val: baseIntensity * random(0.6, 0.8),
        prog: 0.15,
      },
      {
        key: 'opacity',
        val: baseIntensity * (1 - flickerAmount),
        prog: 0.25,
      },
      {
        key: 'opacity',
        val: baseIntensity,
        prog: 0.35,
      },
      {
        key: 'opacity',
        val: baseIntensity * (1 - flickerAmount * 0.5),
        prog: 0.5,
      },
      {
        key: 'opacity',
        val: baseIntensity,
        prog: 0.65,
      },
      {
        key: 'opacity',
        val: baseIntensity * (1 - flickerAmount),
        prog: 0.75,
      },
      {
        key: 'opacity',
        val: baseIntensity * random(0.4, 0.6),
        prog: 0.9,
      },
      { key: 'opacity', val: 0, prog: 1 },
    ];
  };

  // Generate streak components and effects
  const streaks: RenderableComponentData[] = [];
  const effects: any[] = [];

  for (let i = 0; i < params.streakCount; i++) {
    const streakId = `cinematic-streak-${i}`;
    const height = randomHeight();
    const yPosition = randomY(i, params.streakCount);
    const blur = randomBlur();
    const startDelay = randomStartDelay(i);
    const duration = params.baseDuration + random(0, params.speedVariance);
    const baseIntensity = params.intensity * random(0.3, 1);

    // Create streak atom (HTMLBlockAtom for custom styling)
    const streakAtom: RenderableComponentData = {
      id: streakId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='w-full h-full'></div>`,
        className: 'absolute opacity-0',
        style: {
          top: `${yPosition}%`,
          left: '-100%',
          height: `${height}px`,
          backgroundColor: params.colorTint,
          filter: `blur(${blur}px)`,
          boxShadow: `0 0 ${blur * 3}px ${params.colorTint}, 0 0 ${blur * 2}px ${params.colorTint}`,
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: startDelay,
          duration: duration,
        },
      },
    };

    streaks.push(streakAtom);

    // Create effect for this streak
    const streakEffect: GenericEffectData = {
      type: 'linear',
      start: startDelay,
      duration: duration,
      mode: 'provider',
      targetIds: [streakId],
      ranges: [
        // Opacity with flicker
        ...generateFlickerRanges(baseIntensity),
        // Horizontal movement
        { key: 'transform', val: 'translateX(-100%)', prog: 0 },
        { key: 'transform', val: 'translateX(200%)', prog: 1 },
      ],
    };

    effects.push({
      id: `cinematic-streak-effect-${i}`,
      componentId: 'generic',
      data: streakEffect,
    });
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-light-streak-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
        style: {
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.baseDuration + params.speedVariance + 1,
      },
    },
    effects: effects,
    childrenData: streaks,
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
  id: 'cinematic-light-streak',
  title: 'Cinematic Light Streak Effect',
  description:
    'Creates horizontal bands of overexposed light with anamorphic lens bloom effect. Multiple thin rectangular overlays animate across the frame at different speeds and opacities with soft Gaussian blur edges. Each streak varies in width and intensity with independent motion, simulating unstable practical light sources with subtle flicker animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'effects',
    'cinematic',
    'light',
    'streak',
    'bloom',
    'anamorphic',
    'lens-flare',
    'overlay',
    'sci-fi',
    'vintage',
    'atmosphere',
  ],
  dependencies: {},
  defaultInputParams: {
    streakCount: 5,
    baseDuration: 8,
    intensity: 0.7,
    colorTint: '#4A9EFF',
    speedVariance: 1.5,
  },
};

export const cinematicLightStreakPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
