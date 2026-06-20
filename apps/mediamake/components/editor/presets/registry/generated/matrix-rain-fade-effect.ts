/**
 * Matrix Rain Fade Effect Preset
 *
 * INTERNAL EFFECT PRESET:
 * Creates a Matrix-style digital rain effect for text elements. Characters fade in from top to bottom
 * with a trailing green glow effect that dissipates. Supports sequential or randomized character order,
 * variable rain speed, customizable glow colors, and optional flicker mode for digital interference.
 *
 * Features:
 * - Matrix-style digital rain animation with cascading character reveals
 * - Configurable rain speed (effect duration)
 * - Customizable glow color (default: Matrix green #00ff00)
 * - Character delay for staggered animation timing
 * - Glow decay control (how quickly the glow fades)
 * - Random order mode for non-sequential character appearance
 * - Flicker mode for digital interference effects
 * - Support for custom fonts and character sets
 *
 * Effect properties animated:
 * - opacity: 0 → 1 → 0.7 (fade in with slight dim at end)
 * - textShadow: glowing trail that peaks early and dissipates
 * - color: glowColor → inherit (color shift during animation)
 *
 * Use cases:
 * - Creating Matrix-style text reveals
 * - Building cyberpunk/tech-themed title sequences
 * - Adding digital rain effects to captions
 * - Creating hacker/code-style text animations
 *
 * USAGE:
 * This is an internal effect preset that returns an array of effects.
 * Each effect targets a single character component (via targetIds).
 * Call this preset with an array of character component IDs to animate.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of character component IDs to apply the Matrix rain fade effect to'),
  rainSpeed: z
    .number()
    .min(100)
    .max(5000)
    .default(1000)
    .optional()
    .describe('Duration of the rain effect in milliseconds - how fast characters fade in'),
  glowColor: z
    .string()
    .default('#00ff00')
    .optional()
    .describe('Color of the trailing glow effect (typically Matrix green)'),
  characterDelay: z
    .number()
    .min(10)
    .max(500)
    .default(50)
    .optional()
    .describe('Delay in milliseconds between each character animation start'),
  glowDecay: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Rate at which the glow fades (0-1, higher = slower fade)'),
  randomizeOrder: z
    .boolean()
    .default(false)
    .optional()
    .describe('If true, characters appear in random order instead of sequential'),
  flickerMode: z
    .boolean()
    .default(false)
    .optional()
    .describe('If true, adds random opacity fluctuations mimicking digital interference'),
  customFont: z
    .string()
    .optional()
    .describe('Custom font family for authentic Matrix appearance (applied via targetIds styling)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const targetIds = params.targetIds;
  const rainSpeed = (params.rainSpeed ?? 1000) / 1000; // Convert ms to seconds
  const glowColor = params.glowColor ?? '#00ff00';
  const characterDelay = (params.characterDelay ?? 50) / 1000; // Convert ms to seconds
  const glowDecay = params.glowDecay ?? 0.7;
  const randomizeOrder = params.randomizeOrder ?? false;
  const flickerMode = params.flickerMode ?? false;

  // Helper function to create random order array
  const createRandomOrder = (length: number): number[] => {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  };

  // Create order array (sequential or random)
  const orderIndices = randomizeOrder
    ? createRandomOrder(targetIds.length)
    : Array.from({ length: targetIds.length }, (_, i) => i);

  // Create effects for each character
  const effects = targetIds.map((targetId, actualIndex) => {
    // Get the display order index (for timing calculation)
    const orderIndex = orderIndices.indexOf(actualIndex);
    
    // Calculate start time based on order
    const effectStart = orderIndex * characterDelay;

    // Calculate glow intensity based on decay parameter
    const peakGlowSize = 8 + (1 - glowDecay) * 12; // 8px to 20px based on decay
    const glowPeakProgress = 0.1; // Glow peaks early (10% into animation)
    const glowEndProgress = 0.3 + glowDecay * 0.5; // Glow ends between 30% and 80% based on decay

    // Base animation ranges
    const baseRanges: Array<{ key: string; val: any; prog: number }> = [
      // Opacity animation: fade in from 0 to 1, then settle to 0.7
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.2 },
      { key: 'opacity', val: 0.7, prog: 1 },

      // Glow trail animation (textShadow)
      {
        key: 'textShadow',
        val: `0 0 ${peakGlowSize}px ${glowColor}`,
        prog: glowPeakProgress,
      },
      {
        key: 'textShadow',
        val: `0 0 ${peakGlowSize * 0.5}px ${glowColor}`,
        prog: glowEndProgress,
      },
      { key: 'textShadow', val: '0 0 0px transparent', prog: 1 },

      // Color shift: glowColor → inherit
      { key: 'color', val: glowColor, prog: 0 },
      { key: 'color', val: glowColor, prog: 0.2 },
      { key: 'color', val: 'inherit', prog: 0.5 },
    ];

    // Add flicker effect if enabled
    const flickerRanges: Array<{ key: string; val: any; prog: number }> = flickerMode
      ? [
          // Random opacity fluctuations throughout the animation
          { key: 'opacity', val: 0.85, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 0.35 },
          { key: 'opacity', val: 0.9, prog: 0.5 },
          { key: 'opacity', val: 0.75, prog: 0.55 },
          { key: 'opacity', val: 1, prog: 0.6 },
          { key: 'opacity', val: 0.8, prog: 0.75 },
        ]
      : [];

    // Combine all ranges
    const ranges = [...baseRanges, ...flickerRanges];

    // Create effect data
    const effectData: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: rainSpeed,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };

    // Create effect object
    return {
      id: `matrix-rain-effect-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return output with effects
  return {
    output: {
      childrenData: [
        {
          id: 'matrix-rain-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Placeholder duration
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'matrixRainFadeEffect',
  title: 'Matrix Rain Fade Effect',
  description:
    'An internal effect preset that creates a Matrix-style digital rain effect for text elements. Characters fade in from top to bottom with a green glow trail that dissipates. Supports parameters for rainSpeed, glowColor, characterDelay, glowDecay, randomizeOrder, and flickerMode for authentic Matrix appearance with digital interference.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'matrix', 'rain', 'fade', 'glow', 'digital', 'cyberpunk', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['char-1', 'char-2', 'char-3'],
    rainSpeed: 1000,
    glowColor: '#00ff00',
    characterDelay: 50,
    glowDecay: 0.7,
    randomizeOrder: false,
    flickerMode: false,
  },
};

// Export preset
export const matrixRainFadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
