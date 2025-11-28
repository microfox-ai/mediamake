/**
 * Organic Wind-Blown Text Animation Preset
 *
 * Nature-inspired text animation where words float along asymmetric wind-blown curved paths,
 * like autumn leaves caught in a gentle breeze. Each word has its own subtle rotation and flutter,
 * following a main bezier curve but with small random deviations. Includes particle effects like
 * small dust motes or light specs that follow similar paths. The curve feels asymmetric and natural,
 * not mathematically perfect. Features subtle color shifts from warm to cool tones as text moves
 * through the path.
 *
 * Technical Features:
 * - BaseLayout with natural gradient background (amber to orange)
 * - Multiple particle layers using absolute positioning
 * - TextAtom components with mix-blend-multiply for natural blending
 * - Particle HTMLBlockAtom for dust effects
 * - Main curve using cubic-bezier with slightly randomized control points
 * - Sine wave oscillations for flutter (amplitude: 5-10px, frequency: 2-3Hz)
 * - Rotation animation with random ranges (-15deg to 15deg)
 * - Color transitions using CSS filter hue-rotate (0deg to 30deg)
 * - Base duration 4-6 seconds with random variations per word (±0.3s)
 * - Stagger with irregular intervals (0.1-0.3s)
 * - Performance optimizations with batched particle animations
 *
 * Use cases:
 * - Documentary title sequences
 * - Nature-themed content intros
 * - Organic brand presentations
 * - Poetry or literary content
 * - Autumn/harvest themed videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  words: z
    .array(z.string())
    .default(['FLOATING', 'LEAVES', 'DANCING'])
    .describe('Array of words to animate along the wind-blown path'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size for text in pixels'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#b45309')
    .describe('Starting text color (warm tone)'),
  baseTextColor: z
    .string()
    .default('#b45309')
    .describe('Base text color for warm tones'),
  particleCount: z
    .number()
    .min(5)
    .max(20)
    .default(8)
    .describe('Total number of particle dust motes'),
  baseDuration: z
    .number()
    .min(3)
    .max(10)
    .default(4.8)
    .describe('Base duration for text animations in seconds'),
  staggerMin: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Minimum stagger delay between words in seconds'),
  staggerMax: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Maximum stagger delay between words in seconds'),
  backgroundGradientFrom: z
    .string()
    .default('#fef3c7')
    .describe('Background gradient start color (amber-50)'),
  backgroundGradientTo: z
    .string()
    .default('#fed7aa')
    .describe('Background gradient end color (orange-100)'),
  rotationRange: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum rotation angle in degrees for word flutter'),
  hueRotateRange: z
    .number()
    .min(0)
    .max(60)
    .default(30)
    .describe('Hue rotation range for color shift (degrees)'),
  flutterAmplitude: z
    .number()
    .min(3)
    .max(15)
    .default(8)
    .describe('Amplitude of sine wave flutter in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    fontSize,
    fontWeight,
    textColor,
    baseTextColor,
    particleCount,
    baseDuration,
    staggerMin,
    staggerMax,
    backgroundGradientFrom,
    backgroundGradientTo,
    rotationRange,
    hueRotateRange,
    flutterAmplitude,
  } = params;

  // Helper: Random number in range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper: Random stagger time
  const getStaggerTime = (index: number): number => {
    return index * randomInRange(staggerMin, staggerMax);
  };

  // Helper: Create particle HTML
  const createParticleHTML = (size: number, opacity: number): string => {
    return `<div style='width: ${size}px; height: ${size}px; border-radius: 50%; background: rgba(255,255,255,${opacity});'></div>`;
  };

  // Create particles for layer 1
  const particlesLayer1: RenderableComponentData[] = [];
  const halfParticles = Math.floor(particleCount / 2);

  for (let i = 0; i < halfParticles; i++) {
    const particleId = `particle-${i + 1}`;
    const size = randomInRange(2, 4);
    const opacity = randomInRange(0.3, 0.7);
    const startDelay = randomInRange(0, 1.5);
    const duration = randomInRange(4, 5);
    const startX = randomInRange(10, 90);
    const endX = randomInRange(10, 90);
    const startY = randomInRange(10, 90);
    const endY = randomInRange(10, 90);

    particlesLayer1.push({
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: createParticleHTML(size, opacity),
        className: 'absolute',
      },
      context: {
        timing: {
          start: startDelay,
          duration,
        },
      },
      effects: [
        {
          id: `${particleId}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateX', val: startX, prog: 0 },
              { key: 'translateX', val: endX, prog: 1 },
              { key: 'translateY', val: startY, prog: 0 },
              { key: 'translateY', val: endY, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: opacity, prog: 0.2 },
              { key: 'opacity', val: opacity, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    });
  }

  // Create particles for layer 2
  const particlesLayer2: RenderableComponentData[] = [];
  const remainingParticles = particleCount - halfParticles;

  for (let i = 0; i < remainingParticles; i++) {
    const particleId = `particle-${halfParticles + i + 1}`;
    const size = randomInRange(2, 3);
    const opacity = randomInRange(0.3, 0.6);
    const startDelay = randomInRange(0.3, 1.8);
    const duration = randomInRange(4, 4.8);
    const startX = randomInRange(20, 80);
    const endX = randomInRange(20, 80);
    const startY = randomInRange(15, 85);
    const endY = randomInRange(15, 85);

    particlesLayer2.push({
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: createParticleHTML(size, opacity),
        className: 'absolute',
      },
      context: {
        timing: {
          start: startDelay,
          duration,
        },
      },
      effects: [
        {
          id: `${particleId}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateX', val: startX, prog: 0 },
              { key: 'translateX', val: endX, prog: 1 },
              { key: 'translateY', val: startY, prog: 0 },
              { key: 'translateY', val: endY, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: opacity, prog: 0.2 },
              { key: 'opacity', val: opacity, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    });
  }

  // Create text word components
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `word-${index + 1}`;
      const staggerTime = getStaggerTime(index);
      const wordDuration = baseDuration + randomInRange(-0.3, 0.3);

      // Generate unique asymmetric path for each word
      const startX = randomInRange(-200, -100);
      const midX1 = randomInRange(-50, 200);
      const midX2 = randomInRange(-100, 150);
      const endX = randomInRange(50, 150);

      const startY = randomInRange(-100, -50);
      const midY1 = randomInRange(-80, 70);
      const midY2 = randomInRange(-40, 80);
      const endY = randomInRange(40, 100);

      // Rotation ranges (asymmetric)
      const startRot = randomInRange(-rotationRange, rotationRange);
      const midRot = randomInRange(-rotationRange * 0.6, rotationRange * 0.6);
      const endRot = randomInRange(-rotationRange * 0.4, rotationRange * 0.4);

      // Calculate color based on word index (warm to cool transition)
      const colorVariation = [
        baseTextColor,
        '#d97706',
        '#ea580c',
        '#dc2626',
        '#be123c',
      ];
      const wordColor = colorVariation[index % colorVariation.length];

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          className: 'mix-blend-multiply',
          style: {
            fontSize: `${fontSize}px`,
            fontWeight,
            color: wordColor,
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          },
        },
        context: {
          timing: {
            start: staggerTime,
            duration: wordDuration,
          },
        },
        effects: [
          // Main curved path with asymmetric bezier motion
          {
            id: `${wordId}-path-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: wordDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // X-axis asymmetric curve
                { key: 'translateX', val: startX, prog: 0 },
                { key: 'translateX', val: midX1, prog: 0.3 },
                { key: 'translateX', val: midX2, prog: 0.7 },
                { key: 'translateX', val: endX, prog: 1 },
                // Y-axis asymmetric curve with flutter
                { key: 'translateY', val: startY, prog: 0 },
                {
                  key: 'translateY',
                  val: midY1 + flutterAmplitude * Math.sin(index * 2),
                  prog: 0.25,
                },
                {
                  key: 'translateY',
                  val: midY1 - flutterAmplitude * Math.sin(index * 3),
                  prog: 0.5,
                },
                {
                  key: 'translateY',
                  val: midY2 + flutterAmplitude * Math.sin(index * 2.5),
                  prog: 0.75,
                },
                { key: 'translateY', val: endY, prog: 1 },
                // Asymmetric rotation for leaf-like flutter
                { key: 'rotate', val: startRot, prog: 0 },
                { key: 'rotate', val: midRot, prog: 0.5 },
                { key: 'rotate', val: endRot, prog: 1 },
                // Opacity fade in/out
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.15 },
                { key: 'opacity', val: 1, prog: 0.85 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Hue rotation for color shift (warm to cool)
          {
            id: `${wordId}-color-effect`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: wordDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'filter-hue-rotate', val: 0, prog: 0 },
                { key: 'filter-hue-rotate', val: hueRotateRange, prog: 1 },
              ],
            },
          },
        ],
      };
    },
  );

  // Build final structure
  const rootContainer: RenderableComponentData = {
    id: 'organic-wind-text-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: `linear-gradient(to bottom, ${backgroundGradientFrom}, ${backgroundGradientTo})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 5,
      },
    },
    childrenData: [
      // Particle layer 1
      {
        id: 'particle-layer-1',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
          repeatChildrenProps: {
            className: 'absolute',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 5,
          },
        },
        childrenData: particlesLayer1,
      },
      // Particle layer 2
      {
        id: 'particle-layer-2',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
          repeatChildrenProps: {
            className: 'absolute',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 5,
          },
        },
        childrenData: particlesLayer2,
      },
      // Text container
      {
        id: 'text-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 5,
          },
        },
        childrenData: wordComponents,
      },
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

const presetMetadata: PresetMetadata = {
  id: 'organic-wind-text',
  title: 'Organic Wind-Blown Text Animation',
  description:
    'Nature-inspired text animation where words float along asymmetric wind-blown curved paths like autumn leaves in a gentle breeze. Features subtle rotation, flutter effects, random deviations from bezier curves, particle dust motes, and warm-to-cool color transitions for documentary-style title sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'organic',
    'nature',
    'wind',
    'leaves',
    'autumn',
    'documentary',
    'kinetic',
    'particles',
    'gradient',
    'asymmetric',
    'bezier',
    'flutter',
    'title-sequence',
  ],
  defaultInputParams: {
    words: ['FLOATING', 'LEAVES', 'DANCING'],
    fontSize: 72,
    fontWeight: '700',
    textColor: '#b45309',
    baseTextColor: '#b45309',
    particleCount: 8,
    baseDuration: 4.8,
    staggerMin: 0,
    staggerMax: 0.5,
    backgroundGradientFrom: '#fef3c7',
    backgroundGradientTo: '#fed7aa',
    rotationRange: 15,
    hueRotateRange: 30,
    flutterAmplitude: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const organicWindTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
