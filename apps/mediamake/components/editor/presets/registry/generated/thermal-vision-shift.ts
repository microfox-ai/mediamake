/**
 * Thermal Vision Shift Effect Preset
 *
 * INTERNAL EFFECT PRESET - Returns effect data only, no visual composition.
 *
 * This preset simulates thermal camera color channel effects with dynamic heat mapping.
 * The effect shifts between normal colors and thermal-style false color mapping, with
 * RGB channels representing different temperature ranges:
 * - Red for hot areas (highlights)
 * - Blue for cold (shadows)
 * - Green for mid-tones
 *
 * Uses CSS filters with color matrix manipulation and blend modes. The effect can pulse
 * or transition smoothly between normal and thermal views.
 *
 * Features:
 * - Multiple thermal color palettes (iron, rainbow, medical)
 * - Adjustable heat sensitivity (contrast adjustment)
 * - Adjustable thermal intensity (effect strength)
 * - Pulse mode (constant vs pulsing)
 * - CSS filter-based implementation (invert, hue-rotate, contrast, brightness, saturate)
 *
 * Use cases:
 * - Creating sci-fi or surveillance-style visual effects
 * - Adding futuristic overlays to videos
 * - Simulating thermal imaging for creative effects
 * - Heat-map style visualizations
 *
 * SINGLE EFFECT or ARRAY OF EFFECTS:
 * Returns a single generic effect that applies thermal vision transformation.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of the components to apply thermal vision effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to target component)'),
  effectDuration: z
    .number()
    .default(3)
    .describe('Duration of the effect in seconds'),
  heatSensitivity: z
    .number()
    .min(0)
    .max(2)
    .default(1.5)
    .describe('Heat sensitivity (contrast adjustment), 0-2, default 1.5'),
  thermalIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Thermal effect intensity/strength, 0-1, default 0.8'),
  pulseMode: z
    .enum(['constant', 'pulse'])
    .default('pulse')
    .describe(
      'Whether effect transitions once (constant) or loops infinitely (pulse)',
    ),
  colorMap: z
    .enum(['iron', 'rainbow', 'medical'])
    .default('iron')
    .describe(
      'Predefined thermal color palette: iron (red-orange), rainbow (full spectrum), medical (blue-white)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID, auto-generated if not provided'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    effectStart,
    effectDuration,
    heatSensitivity,
    thermalIntensity,
    pulseMode,
    colorMap,
    effectId,
  } = params;

  // Helper function to generate thermal color filter based on colorMap
  const getThermalFilter = (
    map: 'iron' | 'rainbow' | 'medical',
    intensity: number,
    sensitivity: number,
  ): string => {
    // Base thermal transformation: invert colors, then apply palette-specific adjustments
    const baseTransform = `invert(${intensity})`;

    switch (map) {
      case 'iron':
        // Iron palette: Red-orange-yellow (hot) to dark blue-black (cold)
        // Emphasizes reds and oranges for hot areas
        return `${baseTransform} hue-rotate(180deg) contrast(${sensitivity}) brightness(${0.7 + intensity * 0.3}) saturate(${1.2 + intensity * 0.5})`;

      case 'rainbow':
        // Rainbow palette: Full spectrum from cold (blue-purple) to hot (red-yellow)
        // Creates vibrant, colorful thermal map
        return `${baseTransform} hue-rotate(${90 + intensity * 180}deg) contrast(${sensitivity}) brightness(${0.8 + intensity * 0.4}) saturate(${1.5 + intensity * 0.8})`;

      case 'medical':
        // Medical palette: Blue-white-yellow (clinical thermal imaging)
        // Cooler tones with high contrast
        return `${baseTransform} hue-rotate(200deg) contrast(${sensitivity * 1.2}) brightness(${0.9 + intensity * 0.3}) saturate(${0.8 + intensity * 0.4})`;

      default:
        return baseTransform;
    }
  };

  // Generate keyframes based on pulse mode
  const generateRanges = (): Array<{ key: string; val: string; prog: number }> => {
    const normalFilter = 'none';
    const thermalFilter = getThermalFilter(
      colorMap,
      thermalIntensity,
      heatSensitivity,
    );

    if (pulseMode === 'pulse') {
      // Pulsing: Normal -> Thermal -> Normal (loop infinitely)
      return [
        { key: 'filter', val: normalFilter, prog: 0 },
        { key: 'filter', val: thermalFilter, prog: 0.5 },
        { key: 'filter', val: normalFilter, prog: 1 },
      ];
    } else {
      // Constant: Normal -> Thermal (single transition)
      return [
        { key: 'filter', val: normalFilter, prog: 0 },
        { key: 'filter', val: thermalFilter, prog: 1 },
      ];
    }
  };

  // Construct effect data
  const effectData: GenericEffectData = {
    type: pulseMode === 'pulse' ? 'ease-in-out' : 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: generateRanges(),
    iterations: pulseMode === 'pulse' ? Infinity : 1,
  };

  // Create effect node
  const effect = {
    id: effectId || `thermal-vision-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in container structure (will be extracted by system)
  const rootContainer: RenderableComponentData = {
    id: 'thermal-vision-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [effect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'thermal-vision-shift',
  title: 'Thermal Vision Shift Effect',
  description:
    'Internal effect preset that simulates thermal camera color channel effects with dynamic heat mapping. Applies CSS filter-based thermal vision transformation with RGB channels representing temperature ranges (red=hot, blue=cold, green=mid). Supports multiple thermal color palettes and pulse/constant modes.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'thermal',
    'vision',
    'heat-map',
    'color-shift',
    'filters',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component'],
    effectStart: 0,
    effectDuration: 3,
    heatSensitivity: 1.5,
    thermalIntensity: 0.8,
    pulseMode: 'pulse',
    colorMap: 'iron',
  },
};

// Export preset
export const thermalVisionShiftPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
