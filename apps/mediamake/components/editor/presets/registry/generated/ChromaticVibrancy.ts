/**
 * Chromatic Vibrancy Gradient Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset generates background gradient animations with shifting,
 * saturated colors. It morphs between a two-color gradient and a five-color rainbow burst,
 * with simultaneous rotation animation for the gradient angle (0deg to 360deg) and
 * position shifts for each color stop.
 *
 * Features:
 * - Morphs from 2-color gradient → 5-color rainbow burst → back to 2-color
 * - Simultaneous gradient angle rotation (0deg → 360deg)
 * - Color stop position shifts for dynamic gradient flow
 * - High saturation HSL values with vibrancy boost
 * - GPU-accelerated transforms where possible
 * - Smooth keyframe interpolation with ease-in-out timing
 *
 * Use cases:
 * - Creating vibrant, animated backgrounds for content
 * - Adding dynamic gradient effects to containers
 * - Building colorful, energetic visual experiences
 * - Extracting gradient effects for use in other presets
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the gradient effect to'),
  baseColors: z
    .array(z.string())
    .min(2)
    .default(['#FF006E', '#8338EC'])
    .describe('Starting colors for the gradient (minimum 2 colors)'),
  morphDuration: z
    .number()
    .default(4)
    .describe('Duration in seconds for the gradient morph cycle'),
  rotationSpeed: z
    .number()
    .default(8)
    .describe('Duration in seconds for one complete rotation (0deg to 360deg)'),
  vibrancyBoost: z
    .number()
    .min(1)
    .max(2)
    .default(1.5)
    .describe('Multiplier for color saturation (1 = normal, 2 = maximum)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the gradient animation'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to convert hex to HSL and boost saturation
  const hexToHSL = (hex: string, saturationBoost: number): string => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    // Boost saturation
    const boostedS = Math.min(100, s * 100 * saturationBoost);
    
    return `hsl(${Math.round(h * 360)}, ${Math.round(boostedS)}%, ${Math.round(l * 100)}%)`;
  };

  // Helper function to generate rainbow colors at peak morph
  const generateRainbowColors = (saturationBoost: number): string[] => {
    return [
      hexToHSL('#FF006E', saturationBoost), // Red-pink
      hexToHSL('#FFBE0B', saturationBoost), // Yellow-orange
      hexToHSL('#3A86FF', saturationBoost), // Blue
      hexToHSL('#8338EC', saturationBoost), // Purple
      hexToHSL('#06FFA5', saturationBoost), // Cyan-green
    ];
  };

  // Helper function to build gradient string
  const buildGradient = (
    angle: number,
    colors: string[],
    positions: number[],
  ): string => {
    const colorStops = colors
      .map((color, i) => `${color} ${positions[i]}%`)
      .join(', ');
    return `linear-gradient(${angle}deg, ${colorStops})`;
  };

  const { baseColors, morphDuration, rotationSpeed, vibrancyBoost, targetIds } = params;
  const totalDuration = Math.max(morphDuration, rotationSpeed);

  // Convert base colors to HSL with vibrancy boost
  const baseColorHSL = baseColors.map((color) =>
    hexToHSL(color, vibrancyBoost),
  );

  // Generate rainbow colors
  const rainbowColors = generateRainbowColors(vibrancyBoost);

  // Define keyframe states for gradient morph
  // State 1 (prog: 0): 2-color gradient
  // State 2 (prog: 0.5): 5-color rainbow burst
  // State 3 (prog: 1): back to 2-color gradient

  // Keyframes for gradient animation
  const gradientKeyframes: Array<{
    prog: number;
    angle: number;
    colors: string[];
    positions: number[];
  }> = [
    // Start: 2-color gradient, 0deg
    {
      prog: 0,
      angle: 0,
      colors: baseColorHSL,
      positions: [0, 100],
    },
    // Quarter: transitioning to rainbow, 90deg
    {
      prog: 0.25,
      angle: 90,
      colors: [
        baseColorHSL[0],
        rainbowColors[0],
        rainbowColors[1],
        rainbowColors[2],
        baseColorHSL[1],
      ],
      positions: [0, 20, 40, 60, 100],
    },
    // Peak: 5-color rainbow burst, 180deg
    {
      prog: 0.5,
      angle: 180,
      colors: rainbowColors,
      positions: [0, 25, 50, 75, 100],
    },
    // Three-quarter: transitioning back, 270deg
    {
      prog: 0.75,
      angle: 270,
      colors: [
        baseColorHSL[0],
        rainbowColors[3],
        rainbowColors[4],
        rainbowColors[1],
        baseColorHSL[1],
      ],
      positions: [0, 25, 50, 75, 100],
    },
    // End: back to 2-color gradient, 360deg
    {
      prog: 1,
      angle: 360,
      colors: baseColorHSL,
      positions: [0, 100],
    },
  ];

  // Build animation ranges for the background property
  const ranges = gradientKeyframes.map((keyframe) => ({
    key: 'background',
    val: buildGradient(keyframe.angle, keyframe.colors, keyframe.positions),
    prog: keyframe.prog,
  }));

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  // Create effect
  const gradientEffect = {
    id: params.effectId || `chromatic-vibrancy-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return output with effect attached to a container
  const rootContainer: RenderableComponentData = {
    id: 'chromatic-vibrancy-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [gradientEffect],
    childrenData: [],
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
  id: 'ChromaticVibrancy',
  title: 'Chromatic Vibrancy Gradient Effect',
  description:
    'Internal effect preset that animates background gradients with shifting, saturated colors. Morphs between a two-color gradient and a five-color rainbow burst with rotation and position shifts. Creates smooth, GPU-accelerated gradient animations using generic effects with interpolated CSS gradient strings.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'gradient', 'internal', 'generic', 'animated', 'colorful'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-container'],
    baseColors: ['#FF006E', '#8338EC'],
    morphDuration: 4,
    rotationSpeed: 8,
    vibrancyBoost: 1.5,
  },
};

// Export preset
export const ChromaticVibrancyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
