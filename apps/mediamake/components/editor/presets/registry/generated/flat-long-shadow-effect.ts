/**
 * Flat Long Shadow Text Effect Preset
 *
 * This internal effect preset generates a dynamic flat long shadow projection using multiple
 * stacked text-shadow layers. The effect animates the shadow length and angle over time,
 * creating a dramatic 'stretching' motion as if the light source is moving around the text.
 *
 * Features:
 * - **Multiple Stacked Layers**: Smooth shadow gradation using configurable layer count
 * - **Dynamic Animation**: Shadow extends and retracts with ease-in-out easing
 * - **Customizable Parameters**: Shadow color, maximum length, angle, and layer density
 * - **Smooth Motion**: Natural light source movement effect
 *
 * SINGLE EFFECT:
 * Returns a single generic effect that applies animated text-shadow to target text elements.
 *
 * Use cases:
 * - Creating dramatic text shadow animations
 * - Simulating moving light sources
 * - Adding depth to text elements
 * - Building cinematic title effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the shadow effect to'),
  duration: z
    .number()
    .optional()
    .default(2)
    .describe('Duration of the shadow animation in seconds'),
  shadowColor: z
    .string()
    .optional()
    .default('rgba(0, 0, 0, 0.3)')
    .describe('Color of the shadow (CSS color value, supports rgba for transparency)'),
  maxLength: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum shadow projection length in pixels'),
  angle: z
    .number()
    .optional()
    .default(45)
    .describe('Shadow projection angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)'),
  layerCount: z
    .number()
    .optional()
    .default(10)
    .describe('Number of shadow layers for smooth gradation (higher = smoother but more expensive)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate text-shadow layers
  const calculateShadowLayers = (progress: number): string => {
    const shadowColor = params.shadowColor ?? 'rgba(0, 0, 0, 0.3)';
    const maxLength = params.maxLength ?? 50;
    const angle = params.angle ?? 45;
    const layerCount = params.layerCount ?? 10;

    // Convert angle to radians
    const angleRad = (angle * Math.PI) / 180;

    // Calculate current shadow length based on progress
    // Progress animation: 0 (short) -> 0.5 (maximum extension) -> 1 (short)
    let currentLength: number;
    if (progress <= 0.5) {
      // Extend from 0 to maxLength
      currentLength = (progress / 0.5) * maxLength;
    } else {
      // Retract from maxLength to 0
      currentLength = ((1 - progress) / 0.5) * maxLength;
    }

    // Generate multiple shadow layers
    const shadows: string[] = [];
    for (let i = 1; i <= layerCount; i++) {
      const layerLength = (currentLength * i) / layerCount;
      const offsetX = Math.cos(angleRad) * layerLength;
      const offsetY = Math.sin(angleRad) * layerLength;
      
      // Fade opacity for each layer to create smooth gradation
      const layerOpacity = 1 - (i / layerCount) * 0.7; // Keep some opacity even at furthest layer
      const layerColor = shadowColor.replace(/[\d.]+\)$/, `${layerOpacity * 0.3})`); // Adjust alpha
      
      shadows.push(`${offsetX.toFixed(2)}px ${offsetY.toFixed(2)}px 2px ${layerColor}`);
    }

    return shadows.join(', ');
  };

  // Construct effect data with three keyframes
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration ?? 2,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      // Start: short shadow
      { key: 'textShadow', val: calculateShadowLayers(0), prog: 0 },
      // Middle: maximum extension
      { key: 'textShadow', val: calculateShadowLayers(0.5), prog: 0.5 },
      // End: return to short shadow
      { key: 'textShadow', val: calculateShadowLayers(1), prog: 1 },
    ],
  };

  // Create effect node
  const effect = {
    id: params.effectId || `flat-long-shadow-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'flat-long-shadow-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.duration ?? 2,
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
  id: 'flat-long-shadow-effect',
  title: 'Flat Long Shadow Effect',
  description:
    'An internal effect preset that generates dynamic flat long shadow projection using multiple stacked text-shadow layers. The effect animates shadow length and angle over time, creating a dramatic stretching motion as if the light source is moving. Configurable shadow color, maximum length, angle, and layer count for smooth gradation. Uses ease-in-out easing for natural motion.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'text-shadow', 'shadow', 'animation', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-component-1'],
    duration: 2,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    maxLength: 50,
    angle: 45,
    layerCount: 10,
  },
};

// Export preset
export const flatLongShadowEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
