/**
 * Glitch-Style Chromatic Aberration Effect (Internal Preset)
 *
 * Creates digital corruption effects with randomized RGB channel splits, jittery movements,
 * scan lines, and pixel-sorting artifacts. Perfect for cyberpunk aesthetics or error state animations.
 *
 * ARRAY OF EFFECTS:
 * Returns an array of three effects:
 * 1. Main glitch effect - RGB channel splits with jittery motion and random keyframes
 * 2. Scan lines effect - Horizontal scan line artifacts using clipPath
 * 3. Pixel sort effect - Vertical pixel-sorting distortion using filters and transforms
 *
 * Features:
 * - Randomized keyframe positions using seeded Math.random() for reproducibility
 * - Digital vs analog corruption styles
 * - Controllable glitch frequency for dramatic split occurrences
 * - Jittery movements with step-function easing for digital feel
 * - Maximum aberration distance control
 *
 * Use cases:
 * - Cyberpunk UI elements
 * - Error state animations
 * - Digital glitch transitions
 * - Tech-themed video effects
 * - VHS/digital corruption aesthetics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfex/remotion';
import { RenderableComponentData } from '@microfex/datamotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply glitch effects to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the glitch effects (relative to parent)'),
  effectDuration: z
    .number()
    .default(5)
    .describe('Duration of the glitch effects in seconds'),
  glitchFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'How often dramatic glitch splits occur (0 = rare, 1 = frequent)',
    ),
  maxAberration: z
    .number()
    .min(0)
    .max(100)
    .default(15)
    .describe('Maximum RGB channel offset distance in pixels'),
  style: z
    .enum(['analog', 'digital'])
    .default('digital')
    .describe('Corruption style: analog (smooth VHS-like) or digital (sharp/jittery)'),
  seed: z
    .number()
    .default(42)
    .describe('Random seed for reproducible glitch patterns'),
  scanLineIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of scan line artifacts (0 = none, 1 = heavy)'),
  pixelSortIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of pixel-sorting distortion (0 = none, 1 = extreme)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Seeded random number generator for reproducibility
  const seededRandom = (function() {
    let seed = params.seed;
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  })();

  // Generate random keyframes for jittery motion
  const generateRandomKeyframes = (
    count: number,
    maxVal: number,
  ): Array<{ prog: number; val: number }> => {
    const keyframes = [];
    for (let i = 0; i < count; i++) {
      keyframes.push({
        prog: seededRandom(),
        val: (seededRandom() - 0.5) * 2 * maxVal,
      });
    }
    // Sort by progress for proper animation
    keyframes.sort((a, b) => a.prog - b.prog);
    // Ensure start and end keyframes
    if (keyframes[0].prog > 0) {
      keyframes.unshift({ prog: 0, val: 0 });
    }
    if (keyframes[keyframes.length - 1].prog < 1) {
      keyframes.push({ prog: 1, val: 0 });
    }
    return keyframes;
  };

  // Calculate number of glitch events based on frequency
  const glitchEventCount = Math.max(
    2,
    Math.floor(params.glitchFrequency * 10 + 2),
  );

  // Generate RGB channel offset keyframes
  const redOffsetX = generateRandomKeyframes(
    glitchEventCount,
    params.maxAberration,
  );
  const greenOffsetX = generateRandomKeyframes(
    glitchEventCount,
    params.maxAberration * 0.8,
  );
  const blueOffsetX = generateRandomKeyframes(
    glitchEventCount,
    params.maxAberration * 1.2,
  );
  const offsetY = generateRandomKeyframes(
    glitchEventCount,
    params.maxAberration * 0.5,
  );

  // Generate contrast/brightness glitches
  const contrastGlitches = generateRandomKeyframes(
    glitchEventCount,
    params.style === 'digital' ? 0.8 : 0.4,
  );
  const brightnessGlitches = generateRandomKeyframes(
    glitchEventCount,
    params.style === 'digital' ? 0.6 : 0.3,
  );

  // Main glitch effect with RGB channel splits
  const mainGlitchEffect: GenericEffectData = {
    type: params.style === 'digital' ? 'linear' : 'ease-in-out',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Red channel X offset
      ...redOffsetX.map((kf) => ({
        key: 'translateX' as const,
        val: kf.val,
        prog: kf.prog,
      })),
      // Y offset (applies to all channels)
      ...offsetY.map((kf) => ({
        key: 'translateY' as const,
        val: kf.val,
        prog: kf.prog,
      })),
      // Contrast variations
      ...contrastGlitches.map((kf) => ({
        key: 'filter' as const,
        val: `contrast(${1 + kf.val}) brightness(${1 + brightnessGlitches.find((b) => Math.abs(b.prog - kf.prog) < 0.1)?.val || 0})`,
        prog: kf.prog,
      })),
    ],
  };

  // Scan lines effect using clipPath
  const scanLinesEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      {
        key: 'clipPath' as const,
        val: 'inset(0% 0% 0% 0%)',
        prog: 0,
      },
      // Random scan line positions
      ...[...Array(Math.floor(glitchEventCount * params.scanLineIntensity))].map(
        (_, i) => {
          const prog = seededRandom();
          const height = seededRandom() * 5 + 1; // 1-6% height
          const position = seededRandom() * 90; // 0-90% position
          return {
            key: 'clipPath' as const,
            val: `polygon(0% ${position}%, 100% ${position}%, 100% ${position + height}%, 0% ${position + height}%)`,
            prog,
          };
        },
      ),
      {
        key: 'clipPath' as const,
        val: 'inset(0% 0% 0% 0%)',
        prog: 1,
      },
    ],
  };

  // Pixel sort effect using vertical stretching and blur
  const pixelSortKeyframes = generateRandomKeyframes(
    Math.floor(glitchEventCount * params.pixelSortIntensity),
    params.maxAberration * 2,
  );

  const pixelSortEffect: GenericEffectData = {
    type: params.style === 'digital' ? 'linear' : 'ease-in-out',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Vertical scale for pixel-sort look
      ...pixelSortKeyframes.map((kf) => ({
        key: 'scaleY' as const,
        val: 1 + Math.abs(kf.val) * 0.02,
        prog: kf.prog,
      })),
      // Horizontal compression
      ...pixelSortKeyframes.map((kf) => ({
        key: 'scaleX' as const,
        val: 1 - Math.abs(kf.val) * 0.01,
        prog: kf.prog,
      })),
      // Blur for pixel-bleed effect
      ...pixelSortKeyframes.map((kf) => ({
        key: 'filter' as const,
        val: `blur(${Math.abs(kf.val) * 0.1}px)`,
        prog: kf.prog,
      })),
    ],
  };

  // Create effect nodes
  const effects = [
    {
      id: `glitch-main-${params.targetId}`,
      componentId: 'generic',
      data: mainGlitchEffect,
    },
    {
      id: `glitch-scanlines-${params.targetId}`,
      componentId: 'generic',
      data: scanLinesEffect,
    },
    {
      id: `glitch-pixelsort-${params.targetId}`,
      componentId: 'generic',
      data: pixelSortEffect,
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'glitch-chromatic-aberration-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration,
      },
    },
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
  id: 'glitch-chromatic-aberration-internal',
  title: 'Glitch Chromatic Aberration Effect',
  description:
    'Internal effect preset that creates digital corruption effects with randomized RGB channel splits, jittery movements, scan lines, and pixel-sorting artifacts. Generates glitch effects with controlled randomness using seed-based Math.random() for reproducible results. Perfect for cyberpunk aesthetics or error state animations.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'chromatic-aberration', 'digital', 'cyberpunk', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 5,
    glitchFrequency: 0.3,
    maxAberration: 15,
    style: 'digital',
    seed: 42,
    scanLineIntensity: 0.4,
    pixelSortIntensity: 0.3,
  },
};

export const glitchChromaticAberrationInternalPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
