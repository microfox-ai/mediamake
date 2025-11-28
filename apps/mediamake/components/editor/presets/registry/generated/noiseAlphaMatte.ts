/**
 * Noise Alpha Matte Effect - Internal Effect Preset
 *
 * SINGLE EFFECT:
 * This internal effect preset generates organic noise-based opacity reveal effects.
 * Uses a simplified Perlin noise algorithm to create flowing, random reveal patterns
 * that control visibility over time.
 *
 * Features:
 * - Perlin/Simplex noise pattern generation for organic reveals
 * - Threshold-based revealing (areas above threshold become visible)
 * - Animated noise patterns via shifting offset values
 * - Multiple octaves blending for natural-looking reveals
 * - Configurable noise scale, speed, threshold, and smoothness
 * - 2D and 3D noise support for different complexity levels
 *
 * Technical Implementation:
 * - Generates noise values at each progress step (0-1) of the effect
 * - Calculates opacity values based on noise threshold
 * - Creates flowing reveal patterns by animating noise offset over time
 * - Blends multiple noise octaves using persistence parameter
 * - Returns generic effect with dynamically calculated opacity ranges
 *
 * Use Cases:
 * - Organic reveal animations for images/videos
 * - Random, flowing transitions between content
 * - Texture-based fade effects
 * - Natural-looking animated masks
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the noise alpha matte effect'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the noise reveal effect (seconds, relative to parent)'),
  effectDuration: z
    .number()
    .default(2)
    .describe('Duration of the noise reveal effect (seconds)'),
  noiseScale: z
    .number()
    .min(0.1)
    .max(50)
    .default(10)
    .describe('Scale of the noise pattern (higher = larger features)'),
  speed: z
    .number()
    .min(0.1)
    .max(10)
    .default(1)
    .describe('Animation speed multiplier for noise offset shifting'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Threshold value for visibility (0 = all visible, 1 = all hidden)'),
  octaves: z
    .number()
    .int()
    .min(1)
    .max(8)
    .default(3)
    .describe('Number of noise octaves to blend for natural patterns'),
  persistence: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Amplitude decrease per octave (0.5 = half amplitude per octave)'),
  smoothness: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Smoothness of threshold transition (0 = hard edge, 1 = soft gradient)'),
  use3DNoise: z
    .boolean()
    .default(false)
    .describe('Use 3D noise for more complex patterns (slower but more variation)'),
  samples: z
    .number()
    .int()
    .min(10)
    .max(100)
    .default(30)
    .describe('Number of keyframe samples to generate for the animation'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetId,
    effectStart,
    effectDuration,
    noiseScale,
    speed,
    threshold,
    octaves,
    persistence,
    smoothness,
    use3DNoise,
    samples,
    effectId,
  } = params;

  // Simplified Perlin noise implementation
  // This is a basic implementation - in production you might want a more robust library
  const fade = (t: number): number => {
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  const lerp = (a: number, b: number, t: number): number => {
    return a + t * (b - a);
  };

  // Simple hash function for pseudo-random gradients
  const hash = (x: number, y: number, z: number = 0): number => {
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 43.758) * 43758.5453;
    return h - Math.floor(h);
  };

  // 2D Perlin noise
  const noise2D = (x: number, y: number): number => {
    const X = Math.floor(x);
    const Y = Math.floor(y);

    const xf = x - X;
    const yf = y - Y;

    const u = fade(xf);
    const v = fade(yf);

    const a = hash(X, Y);
    const b = hash(X + 1, Y);
    const c = hash(X, Y + 1);
    const d = hash(X + 1, Y + 1);

    const x1 = lerp(a, b, u);
    const x2 = lerp(c, d, u);

    return lerp(x1, x2, v);
  };

  // 3D Perlin noise
  const noise3D = (x: number, y: number, z: number): number => {
    const X = Math.floor(x);
    const Y = Math.floor(y);
    const Z = Math.floor(z);

    const xf = x - X;
    const yf = y - Y;
    const zf = z - Z;

    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const a = hash(X, Y, Z);
    const b = hash(X + 1, Y, Z);
    const c = hash(X, Y + 1, Z);
    const d = hash(X + 1, Y + 1, Z);
    const e = hash(X, Y, Z + 1);
    const f = hash(X + 1, Y, Z + 1);
    const g = hash(X, Y + 1, Z + 1);
    const h = hash(X + 1, Y + 1, Z + 1);

    const x1 = lerp(a, b, u);
    const x2 = lerp(c, d, u);
    const y1 = lerp(x1, x2, v);

    const x3 = lerp(e, f, u);
    const x4 = lerp(g, h, u);
    const y2 = lerp(x3, x4, v);

    return lerp(y1, y2, w);
  };

  // Multi-octave noise function
  const multiOctaveNoise = (
    x: number,
    y: number,
    z: number,
    octaveCount: number,
    persistenceVal: number,
  ): number => {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaveCount; i++) {
      const noiseValue = use3DNoise
        ? noise3D(x * frequency, y * frequency, z * frequency)
        : noise2D(x * frequency, y * frequency);

      total += noiseValue * amplitude;
      maxValue += amplitude;

      amplitude *= persistenceVal;
      frequency *= 2;
    }

    return total / maxValue;
  };

  // Apply smooth threshold transition
  const applyThreshold = (
    noiseValue: number,
    thresholdVal: number,
    smoothnessVal: number,
  ): number => {
    if (smoothnessVal === 0) {
      // Hard threshold
      return noiseValue > thresholdVal ? 1 : 0;
    }

    // Soft threshold with smoothstep
    const edge0 = thresholdVal - smoothnessVal * 0.5;
    const edge1 = thresholdVal + smoothnessVal * 0.5;

    if (noiseValue <= edge0) return 0;
    if (noiseValue >= edge1) return 1;

    const t = (noiseValue - edge0) / (edge1 - edge0);
    return t * t * (3 - 2 * t); // Smoothstep
  };

  // Generate noise-based opacity ranges
  const generateNoiseRanges = (): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    // Generate samples across the animation timeline
    for (let i = 0; i <= samples; i++) {
      const prog = i / samples;

      // Calculate animated noise offset based on time and speed
      const timeOffset = prog * speed * 10;

      // Sample noise at a fixed spatial position with animated time offset
      // Using prog as spatial coordinate and timeOffset for animation
      const noiseValue = multiOctaveNoise(
        prog * noiseScale,
        0.5 * noiseScale,
        timeOffset,
        octaves,
        persistence,
      );

      // Normalize noise value from [-1, 1] to [0, 1]
      const normalizedNoise = (noiseValue + 1) / 2;

      // Apply threshold to get opacity value
      const opacity = applyThreshold(normalizedNoise, threshold, smoothness);

      ranges.push({
        key: 'opacity',
        val: opacity,
        prog: prog,
      });
    }

    return ranges;
  };

  // Generate the noise-based animation ranges
  const noiseRanges = generateNoiseRanges();

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Use linear interpolation for smooth noise animation
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: noiseRanges,
  };

  // Create the effect object
  const effect = {
    id: effectId || `noise-alpha-matte-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return preset output with effect in a container structure
  // The _internalPresetOutput: 'effects' in metadata will extract this automatically
  return {
    output: {
      childrenData: [
        {
          id: 'noise-alpha-matte-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'noiseAlphaMatte',
  title: 'Noise Alpha Matte Effect',
  description:
    'Internal effect preset that uses Perlin noise patterns to create organic, random reveal effects. Generates noise-based opacity values that control visibility over time, creating flowing, organic reveal patterns.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'noise', 'reveal', 'organic', 'matte', 'alpha', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 2,
    noiseScale: 10,
    speed: 1,
    threshold: 0.5,
    octaves: 3,
    persistence: 0.5,
    smoothness: 0.5,
    use3DNoise: false,
    samples: 30,
  },
};

export const noiseAlphaMattePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
