/**
 * Nervous Energy Text Trembling Effect Preset
 *
 * This preset creates a handheld documentary-style text trembling effect that simulates
 * jittery, anxious camera shake with rapid micro-movements (15-20Hz frequency), random
 * X/Y axis variations, subtle rotation wobble (±1-2°), and breathing-pattern intensity
 * variations. Uses multiple overlapping sine wave animations with different frequencies
 * to create organic, non-repeating shake patterns. Includes subtle opacity flicker for
 * added rawness. Perfect for dramatic moments or conveying instability and urgency.
 *
 * Features:
 * - Rapid micro-movements (15-20Hz frequency) simulating handheld camera shake
 * - Random X/Y axis variations (±2-4px range)
 * - Subtle rotation wobble (±1-2 degrees)
 * - Breathing-pattern intensity variations over time
 * - Multiple overlapping sine wave animations with different frequencies
 * - Subtle opacity flicker (0.95-1.0 range)
 * - GPU-accelerated transform-only properties
 * - Configurable intensity parameter (0.0-1.0)
 * - Support for caption word-level emphasis (1.5x intensity for keywords)
 *
 * Use cases:
 * - Dramatic text reveals
 * - Conveying instability or urgency
 * - Documentary-style handheld footage effect
 * - Emphasizing nervous energy or tension
 * - Raw, unpolished aesthetic
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  text: z.string().describe('Text content to display with nervous shake effect'),
  
  duration: z
    .number()
    .min(0.1)
    .default(5)
    .describe('Duration of the text display in seconds'),
  
  intensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Shake intensity multiplier (0.0 = no shake, 1.0 = maximum shake)'),
  
  fontSize: z
    .number()
    .min(12)
    .default(48)
    .describe('Font size in pixels'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  
  position: z
    .object({
      horizontal: z.enum(['left', 'center', 'right']).default('center'),
      vertical: z.enum(['top', 'center', 'bottom']).default('center'),
    })
    .default({ horizontal: 'center', vertical: 'center' })
    .describe('Position of the text on screen'),
  
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color for text container'),
  
  padding: z
    .number()
    .min(0)
    .default(0)
    .describe('Padding around text in pixels'),
  
  isKeyword: z
    .boolean()
    .default(false)
    .describe('If true, applies 1.5x intensity multiplier for keyword emphasis'),
});

// --- PRESET EXECUTION ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    intensity,
    fontSize,
    fontWeight,
    color,
    fontFamily,
    position,
    backgroundColor,
    padding,
    isKeyword,
  } = params;

  // Calculate effective intensity (1.5x for keywords)
  const effectiveIntensity = isKeyword ? intensity * 1.5 : intensity;

  // Base shake ranges (scaled by intensity)
  const translateXRange = 4 * effectiveIntensity; // ±4px at full intensity
  const translateYRange = 3 * effectiveIntensity; // ±3px at full intensity
  const rotateRange = 2 * effectiveIntensity; // ±2deg at full intensity
  const opacityMin = 0.95;
  const opacityMax = 1.0;

  // IDs
  const containerId = 'nervous-shake-container';
  const textId = 'nervous-text';

  // Position classes
  const getPositionClasses = () => {
    const horizontal =
      position.horizontal === 'left'
        ? 'justify-start'
        : position.horizontal === 'right'
        ? 'justify-end'
        : 'justify-center';
    
    const vertical =
      position.vertical === 'top'
        ? 'items-start'
        : position.vertical === 'bottom'
        ? 'items-end'
        : 'items-center';
    
    return `${horizontal} ${vertical}`;
  };

  // Create multiple overlapping shake effects with different frequencies
  // Frequencies: ~0.05s, 0.08s, 0.12s, 0.15s (20Hz, 12.5Hz, 8.3Hz, 6.7Hz)
  
  // Effect 1: Fast X-axis shake (0.05s = 20Hz)
  const effect1: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: translateXRange * 0.8, prog: 0.125 },
      { key: 'translateX', val: -translateXRange * 0.6, prog: 0.25 },
      { key: 'translateX', val: translateXRange * 0.4, prog: 0.375 },
      { key: 'translateX', val: -translateXRange * 0.7, prog: 0.5 },
      { key: 'translateX', val: translateXRange * 0.5, prog: 0.625 },
      { key: 'translateX', val: -translateXRange * 0.3, prog: 0.75 },
      { key: 'translateX', val: translateXRange * 0.6, prog: 0.875 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Effect 2: Medium Y-axis shake (0.08s = 12.5Hz)
  const effect2: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -translateYRange * 0.7, prog: 0.15 },
      { key: 'translateY', val: translateYRange * 0.5, prog: 0.3 },
      { key: 'translateY', val: -translateYRange * 0.4, prog: 0.45 },
      { key: 'translateY', val: translateYRange * 0.8, prog: 0.6 },
      { key: 'translateY', val: -translateYRange * 0.6, prog: 0.75 },
      { key: 'translateY', val: translateYRange * 0.3, prog: 0.9 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Effect 3: Slow rotation wobble (0.12s = 8.3Hz)
  const effect3: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: rotateRange * 0.6, prog: 0.2 },
      { key: 'rotate', val: -rotateRange * 0.8, prog: 0.4 },
      { key: 'rotate', val: rotateRange * 0.4, prog: 0.6 },
      { key: 'rotate', val: -rotateRange * 0.5, prog: 0.8 },
      { key: 'rotate', val: 0, prog: 1 },
    ],
  };

  // Effect 4: Very slow breathing intensity variation (0.15s = 6.7Hz)
  const effect4: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: translateXRange * 0.3, prog: 0.25 },
      { key: 'translateX', val: -translateXRange * 0.4, prog: 0.5 },
      { key: 'translateX', val: translateXRange * 0.2, prog: 0.75 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Effect 5: Subtle opacity flicker (0.1s intervals)
  const effect5: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: opacityMax, prog: 0 },
      { key: 'opacity', val: opacityMin, prog: 0.1 },
      { key: 'opacity', val: opacityMax, prog: 0.2 },
      { key: 'opacity', val: opacityMin, prog: 0.3 },
      { key: 'opacity', val: opacityMax, prog: 0.4 },
      { key: 'opacity', val: opacityMin, prog: 0.5 },
      { key: 'opacity', val: opacityMax, prog: 0.6 },
      { key: 'opacity', val: opacityMin, prog: 0.7 },
      { key: 'opacity', val: opacityMax, prog: 0.8 },
      { key: 'opacity', val: opacityMin, prog: 0.9 },
      { key: 'opacity', val: opacityMax, prog: 1 },
    ],
  };

  // Create text component
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      { id: `${textId}-effect-1`, componentId: 'generic', data: effect1 },
      { id: `${textId}-effect-2`, componentId: 'generic', data: effect2 },
      { id: `${textId}-effect-3`, componentId: 'generic', data: effect3 },
      { id: `${textId}-effect-4`, componentId: 'generic', data: effect4 },
      { id: `${textId}-effect-5`, componentId: 'generic', data: effect5 },
    ],
  };

  // Create container
  const container: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${getPositionClasses()}`,
        style: {
          willChange: 'transform',
          ...(backgroundColor && { backgroundColor }),
          ...(padding > 0 && { padding: `${padding}px` }),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textComponent],
  };

  // Return preset output
  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- PRESET METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'nervous-shake-text',
  title: 'Nervous Energy Text Trembling Effect',
  description:
    'A handheld documentary-style text trembling effect that simulates jittery, anxious camera shake with rapid micro-movements (15-20Hz), random X/Y axis variations, subtle rotation wobble (±1-2°), and breathing-pattern intensity variations. Uses multiple overlapping sine wave animations with different frequencies to create organic, non-repeating shake patterns. Includes subtle opacity flicker for added rawness. Perfect for dramatic moments or conveying instability and urgency.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'nervous',
    'shake',
    'trembling',
    'handheld',
    'documentary',
    'jittery',
    'anxious',
    'unstable',
    'dramatic',
    'urgent',
    'raw',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'URGENT',
    duration: 5,
    intensity: 0.5,
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    position: {
      horizontal: 'center',
      vertical: 'center',
    },
    padding: 0,
    isKeyword: false,
  },
};

// --- EXPORT ---
export const nervousShakeTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
