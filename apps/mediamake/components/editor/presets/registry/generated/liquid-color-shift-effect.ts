/**
 * LiquidColorShift Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a liquid, iridescent appearance through animated color shifts using hue-rotate filters,
 * brightness oscillation, and text-shadow glow effects. Cycles through a spectrum of colors
 * (original → cyan → magenta → yellow → back) with smooth transitions.
 *
 * Features:
 * - Hue-rotate filter animation for continuous color cycling
 * - Brightness oscillation (100%-120%-100%) for shimmer effect
 * - Text-shadow glow animation for liquid glow on text elements
 * - Configurable cycle speed, color intensity, glow radius
 * - Optional custom color sequence support
 *
 * Use Cases:
 * - Create liquid iridescent text effects
 * - Add shimmer animations to images/videos
 * - Build dynamic color-shifting overlays
 * - Enhance visual elements with glowing liquid effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the liquid color shift effect to'),
  cycleSpeed: z
    .number()
    .min(500)
    .max(10000)
    .default(3000)
    .optional()
    .describe('Duration of one complete color cycle in milliseconds (default: 3000ms)'),
  colorIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Saturation intensity for color effects (0-1, default: 0.8)'),
  glowRadius: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .optional()
    .describe('Radius of text shadow glow in pixels (default: 4px)'),
  customColors: z
    .array(z.string())
    .optional()
    .describe('Optional array of custom colors for the sequence (hex format, e.g., ["#FF0000", "#00FF00"])'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(10)
    .optional()
    .describe('Duration of the effect in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const cycleSpeed = (params.cycleSpeed ?? 3000) / 1000; // Convert to seconds
  const colorIntensity = params.colorIntensity ?? 0.8;
  const glowRadius = params.glowRadius ?? 4;
  const effectStart = params.effectStart ?? 0;
  const effectDuration = params.effectDuration ?? 10;
  const targetIds = params.targetIds;

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number = 1): string => {
    const sanitized = hex.replace('#', '');
    const r = parseInt(sanitized.substring(0, 2), 16);
    const g = parseInt(sanitized.substring(2, 4), 16);
    const b = parseInt(sanitized.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  // Default color sequence: cyan → magenta → yellow → back
  const defaultColors = ['#00FFFF', '#FF00FF', '#FFFF00'];
  const colorSequence = params.customColors ?? defaultColors;

  // Build hue-rotate animation ranges
  // Full cycle: 0deg → 120deg → 240deg → 360deg (back to 0)
  const hueRotateRanges = [
    { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
    { key: 'filter', val: 'hue-rotate(120deg)', prog: 0.33 },
    { key: 'filter', val: 'hue-rotate(240deg)', prog: 0.67 },
    { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
  ];

  // Build brightness oscillation ranges
  // 100% → 120% → 100%
  const brightnessRanges = [
    { key: 'brightness', val: 1.0, prog: 0 },
    { key: 'brightness', val: 1.2, prog: 0.5 },
    { key: 'brightness', val: 1.0, prog: 1 },
  ];

  // Build text-shadow glow animation
  // Cycle through the color spectrum with glow
  const textShadowRanges = colorSequence.map((color, index) => {
    const progress = index / (colorSequence.length - 1);
    const rgba = hexToRgba(color, colorIntensity);
    return {
      key: 'textShadow',
      val: `0 0 ${glowRadius}px ${rgba}`,
      prog: progress,
    };
  });

  // Add final keyframe to loop back to first color
  if (textShadowRanges.length > 0) {
    const firstColor = hexToRgba(colorSequence[0], colorIntensity);
    textShadowRanges.push({
      key: 'textShadow',
      val: `0 0 ${glowRadius}px ${firstColor}`,
      prog: 1,
    });
  }

  // Combine all animation ranges
  const allRanges = [
    ...hueRotateRanges,
    ...brightnessRanges,
    ...textShadowRanges,
  ];

  // Construct the effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: cycleSpeed,
    mode: 'provider',
    targetIds: targetIds,
    ranges: allRanges,
    loop: true, // Loop the effect continuously
  };

  const effect = {
    id: params.effectId || `liquid-color-shift-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'liquid-color-shift-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'hidden',
            },
          },
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
  id: 'liquidColorShiftEffect',
  title: 'Liquid Color Shift Effect',
  description:
    'Internal effect preset that animates color properties to create a liquid, iridescent appearance using hue-rotate filters, brightness oscillation, and text-shadow glow effects',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'color', 'liquid', 'iridescent', 'hue-rotate', 'glow', 'shimmer', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    cycleSpeed: 3000,
    colorIntensity: 0.8,
    glowRadius: 4,
    effectStart: 0,
    effectDuration: 10,
  },
};

export const liquidColorShiftEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
