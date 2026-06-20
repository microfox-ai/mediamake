/**
 * NeonTextPulse Internal Effect Preset
 *
 * Creates a vibrant, pulsating neon glow effect for text elements with animated text-shadow,
 * color cycling through neon colors (cyan, magenta, yellow, green), letter-spacing animation,
 * and optional flicker effect.
 *
 * SINGLE EFFECT:
 * Returns a single generic effect that applies multiple animated properties:
 * - text-shadow with three layers (inner 2px, mid 8px, outer 20px glow)
 * - color cycling through vibrant neon colors
 * - letter-spacing expansion on pulse peaks
 * - optional random flicker effect
 *
 * Features:
 * - Multi-layered text-shadow animation for neon tube effect
 * - Color shift animation cycling through cyan, magenta, yellow, green
 * - Letter-spacing expansion synchronized with pulse
 * - Optional flicker effect with rapid opacity changes
 * - Configurable neon base color, pulse intensity, and color shift speed
 *
 * Parameters:
 * - targetIds: Array of component IDs to apply effect to
 * - neonColor: Base neon color (default: cyan)
 * - pulseIntensity: Shadow size multiplier (default: 1)
 * - colorShiftSpeed: How fast colors cycle (default: 4 seconds per cycle)
 * - enableFlicker: Enable random flicker effect (default: false)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the neon pulse effect to'),
  neonColor: z
    .string()
    .default('#00FFFF')
    .describe('Base neon color (CSS color value, default: cyan #00FFFF)'),
  pulseIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Shadow size multiplier for pulse intensity (0.1-3, default: 1)'),
  colorShiftSpeed: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe(
      'Duration in seconds for one complete color cycle (1-10, default: 4)',
    ),
  enableFlicker: z
    .boolean()
    .default(false)
    .describe('Enable random flicker effect (default: false)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  effectDuration: z
    .number()
    .default(6)
    .describe('Duration of the effect (seconds)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    neonColor,
    pulseIntensity,
    colorShiftSpeed,
    enableFlicker,
    effectStart,
    effectDuration,
    effectId,
  } = params;

  // Helper function to parse hex color to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 255, b: 255 }; // Default to cyan
  };

  // Helper function to create text-shadow string with multiple layers
  const createTextShadow = (
    color1: string,
    color2: string,
    color3: string,
    intensity: number,
  ): string => {
    const innerSize = 2 * intensity;
    const midSize = 8 * intensity;
    const outerSize = 20 * intensity;
    return `0 0 ${innerSize}px ${color1}, 0 0 ${midSize}px ${color2}, 0 0 ${outerSize}px ${color3}`;
  };

  // Neon color palette (cycling colors)
  const neonColors = [
    '#00FFFF', // Cyan
    '#FF00FF', // Magenta
    '#FFFF00', // Yellow
    '#00FF00', // Green
  ];

  // Parse base neon color
  const baseRgb = hexToRgb(neonColor);
  const baseColor = `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, 1)`;
  const baseColorDim = `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, 0.6)`;
  const baseColorBright = `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, 0.3)`;

  // Animation ranges for the effect
  const ranges: any[] = [];

  // Text-shadow animation (pulsating glow)
  // Progress keyframes: 0 (dim) -> 0.5 (bright) -> 1 (dim)
  const shadowDim = createTextShadow(
    baseColor,
    baseColorDim,
    baseColorBright,
    pulseIntensity * 0.5,
  );
  const shadowBright = createTextShadow(
    baseColor,
    baseColorDim,
    baseColorBright,
    pulseIntensity * 1.5,
  );

  ranges.push(
    { key: 'textShadow', val: shadowDim, prog: 0 },
    { key: 'textShadow', val: shadowBright, prog: 0.5 },
    { key: 'textShadow', val: shadowDim, prog: 1 },
  );

  // Color animation (cycling through neon colors)
  // Divide the animation into equal segments for each color
  const colorSteps = neonColors.length;
  const colorProgressStep = 1 / colorSteps;

  for (let i = 0; i < colorSteps; i++) {
    const progress = i * colorProgressStep;
    const colorRgb = hexToRgb(neonColors[i]);
    const colorValue = `rgb(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b})`;
    ranges.push({ key: 'color', val: colorValue, prog: progress });
  }
  // Close the loop by adding the first color at progress 1
  const firstColorRgb = hexToRgb(neonColors[0]);
  const firstColorValue = `rgb(${firstColorRgb.r}, ${firstColorRgb.g}, ${firstColorRgb.b})`;
  ranges.push({ key: 'color', val: firstColorValue, prog: 1 });

  // Letter-spacing animation (expand on pulse peaks)
  const baseSpacing = '0em';
  const expandedSpacing = `${0.1 * pulseIntensity}em`;

  ranges.push(
    { key: 'letterSpacing', val: baseSpacing, prog: 0 },
    { key: 'letterSpacing', val: expandedSpacing, prog: 0.5 },
    { key: 'letterSpacing', val: baseSpacing, prog: 1 },
  );

  // Optional flicker effect (rapid opacity changes)
  if (enableFlicker) {
    // Add random flicker points at strategic intervals
    const flickerPoints = [0.1, 0.15, 0.3, 0.35, 0.6, 0.65, 0.9, 0.95];
    flickerPoints.forEach((prog, index) => {
      const opacity = index % 2 === 0 ? 0.7 : 1; // Alternate between dim and full
      ranges.push({ key: 'opacity', val: opacity, prog });
    });
    // Ensure opacity is 1 at start and end
    ranges.push(
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    );
  }

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  // Create effect
  const effect = {
    id: effectId || `neon-text-pulse-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'neon-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration + 1, // Slightly longer to ensure effect completes
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
  id: 'neonTextPulseEffect',
  title: 'NeonTextPulse Internal Effect',
  description:
    'A vibrant, pulsating neon glow effect for text elements with animated text-shadow, color cycling through neon colors (cyan, magenta, yellow, green), letter-spacing animation, and optional flicker effect. Creates a neon tube effect with three shadow layers: inner (2px), mid (8px), and outer (20px) glow.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'neon',
    'pulse',
    'glow',
    'text',
    'text-shadow',
    'color-shift',
    'flicker',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-component-1'],
    neonColor: '#00FFFF',
    pulseIntensity: 1,
    colorShiftSpeed: 4,
    enableFlicker: false,
    effectStart: 0,
    effectDuration: 6,
  },
};

export const neonTextPulseEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
