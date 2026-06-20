/**
 * ColorWaveTransition Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates a color shift effect across multiple elements, simulating a wave of color change.
 * Animates text color and/or background color properties with smooth RGB interpolation.
 * The wave passes through elements sequentially based on their index and wave direction.
 *
 * Features:
 * - Smooth RGB interpolation for color transitions
 * - Multiple wave directions: horizontal, vertical, radial
 * - Color properties: color, backgroundColor, or both
 * - Pulse mode: colors oscillate between start and end values
 * - Configurable wave duration and per-element timing
 *
 * Usage:
 * This internal effect preset returns an array of generic effects, one per target element.
 * Each effect is timed to create a sequential wave pattern across all elements.
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply wave effect to'),
  startColor: z.string().describe('Starting color (hex format, e.g., #FF0000)'),
  endColor: z.string().describe('Ending color (hex format, e.g., #0000FF)'),
  waveDuration: z.number().describe('Total duration for wave to pass through all elements (ms)'),
  waveDirection: z.enum(['horizontal', 'vertical', 'radial']).describe('Direction of wave propagation'),
  colorProperty: z.enum(['color', 'backgroundColor', 'both']).describe('Which color property to animate'),
  pulseMode: z.boolean().default(false).optional().describe('If true, colors pulse between start and end; if false, transition once'),
  effectStart: z.number().default(0).optional().describe('Start time of the effect (relative to parent, in seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Convert hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Helper function: Calculate wave delay based on element index and direction
  const calculateWaveDelay = (
    index: number,
    totalElements: number,
    direction: 'horizontal' | 'vertical' | 'radial',
  ): number => {
    switch (direction) {
      case 'horizontal':
        // Linear delay from left to right
        return index / totalElements;
      case 'vertical':
        // Linear delay from top to bottom
        return index / totalElements;
      case 'radial':
        // Delay based on distance from center
        const center = (totalElements - 1) / 2;
        const distanceFromCenter = Math.abs(index - center);
        const maxDistance = Math.max(center, totalElements - 1 - center);
        return distanceFromCenter / maxDistance;
      default:
        return index / totalElements;
    }
  };

  const {
    targetIds,
    startColor,
    endColor,
    waveDuration,
    waveDirection,
    colorProperty,
    pulseMode = false,
    effectStart = 0,
  } = params;

  // Convert colors to RGB
  const startRgb = hexToRgb(startColor);
  const endRgb = hexToRgb(endColor);

  if (!startRgb || !endRgb) {
    throw new Error('Invalid hex color format. Use format: #RRGGBB');
  }

  // Convert waveDuration from ms to seconds
  const waveDurationSeconds = waveDuration / 1000;

  // Calculate individual element duration
  const elementDuration = waveDurationSeconds / targetIds.length;

  // Create effects for each target element
  const effects = targetIds.map((targetId, index) => {
    // Calculate wave delay for this element (0-1 normalized)
    const normalizedDelay = calculateWaveDelay(index, targetIds.length, waveDirection);
    
    // Calculate actual start time (relative to effectStart)
    const elementStart = effectStart + normalizedDelay * waveDurationSeconds;

    // Create color ranges based on mode
    const colorRanges: Array<{ key: string; val: string; prog: number }> = [];
    
    const createColorRanges = (property: 'color' | 'backgroundColor') => {
      if (pulseMode) {
        // Pulse mode: oscillate between start and end
        return [
          { key: property, val: `rgb(${startRgb.r},${startRgb.g},${startRgb.b})`, prog: 0 },
          { key: property, val: `rgb(${endRgb.r},${endRgb.g},${endRgb.b})`, prog: 0.5 },
          { key: property, val: `rgb(${startRgb.r},${startRgb.g},${startRgb.b})`, prog: 1 },
        ];
      } else {
        // Transition mode: go from start to end once
        return [
          { key: property, val: `rgb(${startRgb.r},${startRgb.g},${startRgb.b})`, prog: 0 },
          { key: property, val: `rgb(${endRgb.r},${endRgb.g},${endRgb.b})`, prog: 1 },
        ];
      }
    };

    // Add ranges based on colorProperty
    if (colorProperty === 'color' || colorProperty === 'both') {
      colorRanges.push(...createColorRanges('color'));
    }
    if (colorProperty === 'backgroundColor' || colorProperty === 'both') {
      colorRanges.push(...createColorRanges('backgroundColor'));
    }

    // Create effect data
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: elementStart,
      duration: elementDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: colorRanges,
    };

    return {
      id: `color-wave-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  return {
    output: {
      childrenData: [
        {
          id: 'color-wave-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: waveDurationSeconds + elementDuration,
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
  id: 'color-wave-transition-effect',
  title: 'ColorWaveTransition Effect',
  description: 'Internal effect preset that creates a color shift effect across multiple elements, simulating a wave of color change. Animates text color and/or background color properties with smooth RGB interpolation, creating a gradient wave that passes through elements sequentially. Supports horizontal, vertical, and radial wave directions with optional pulse mode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'color', 'wave', 'transition', 'gradient', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3'],
    startColor: '#FF0000',
    endColor: '#0000FF',
    waveDuration: 2000,
    waveDirection: 'horizontal',
    colorProperty: 'color',
    pulseMode: false,
    effectStart: 0,
  },
};

export const colorWaveTransitionEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
