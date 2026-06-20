/**
 * Chromatic Aberration Effect Preset
 *
 * This internal effect preset simulates the color separation effect seen through heated air
 * or distorted glass by animating text-shadow or box-shadow properties with RGB color offsets.
 * Creates three shadow layers - red shifted left, green centered, blue shifted right - that move
 * independently with a breathing animation. Includes a subtle scale animation for a floating effect.
 *
 * SINGLE EFFECT (returns one effect with complex shadow animation):
 * - Applies to both text and container elements
 * - Creates RGB shadow separation with independent movement
 * - Breathing chromatic effect with offset distance animation
 * - Subtle floating scale animation
 * - Dreamy, heat-distorted appearance
 *
 * Features:
 * - **RGB Shadow Layers**: Red, green, and blue shadows with independent offsets
 * - **Breathing Animation**: Shadow offsets animate in/out to create distortion effect
 * - **Floating Scale**: Subtle scale variance for enhanced floating appearance
 * - **Universal Application**: Works on text (textShadow) and containers (boxShadow)
 * - **Configurable Parameters**: Aberration strength, pulse speed, color intensity, float amount
 *
 * Use cases:
 * - Creating heat distortion effects
 * - Adding chromatic aberration to titles
 * - Simulating optical distortions
 * - Creating dreamy, ethereal text effects
 * - Adding retro VHS-style glitches
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply chromatic aberration effect'),
  aberrationStrength: z
    .number()
    .min(1)
    .max(20)
    .default(3)
    .optional()
    .describe('Pixel offset for RGB shadow separation (1-20, default: 3)'),
  pulseSpeed: z
    .number()
    .min(500)
    .max(5000)
    .default(2500)
    .optional()
    .describe('Animation duration in milliseconds (500-5000, default: 2500)'),
  colorIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Opacity of shadow layers (0.1-1.0, default: 0.4)'),
  floatAmount: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.02)
    .optional()
    .describe('Scale variance for floating effect (0.01-0.1, default: 0.02)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the chromatic effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const aberrationStrength = params.aberrationStrength ?? 3;
  const pulseSpeed = (params.pulseSpeed ?? 2500) / 1000; // Convert to seconds
  const colorIntensity = params.colorIntensity ?? 0.4;
  const floatAmount = params.floatAmount ?? 0.02;
  const targetIds = params.targetIds;

  // Generate RGB color values with specified opacity
  const redColor = `rgba(255, 0, 0, ${colorIntensity})`;
  const greenColor = `rgba(0, 255, 0, ${colorIntensity})`;
  const blueColor = `rgba(0, 0, 255, ${colorIntensity})`;

  // Helper function to create shadow string
  const createShadow = (
    redOffsetX: number,
    greenOffsetX: number,
    blueOffsetX: number,
    blur: number,
  ): string => {
    return `${redOffsetX}px 0 ${blur}px ${redColor}, ${greenOffsetX}px 0 ${blur}px ${greenColor}, ${blueOffsetX}px 0 ${blur}px ${blueColor}`;
  };

  // Create chromatic shadow effect
  const chromaticEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: pulseSpeed,
    mode: 'provider',
    targetIds: targetIds,
    loop: true,
    ranges: [
      // Start state: minimal separation
      {
        key: 'textShadow',
        val: createShadow(0, 0, 0, 0),
        prog: 0,
      },
      // Mid state: maximum separation (breathing out)
      {
        key: 'textShadow',
        val: createShadow(
          -aberrationStrength,
          0,
          aberrationStrength,
          aberrationStrength * 0.5,
        ),
        prog: 0.5,
      },
      // End state: return to minimal (breathing in)
      {
        key: 'textShadow',
        val: createShadow(0, 0, 0, 0),
        prog: 1,
      },
      // Also apply as boxShadow for container elements
      {
        key: 'boxShadow',
        val: createShadow(0, 0, 0, 0),
        prog: 0,
      },
      {
        key: 'boxShadow',
        val: createShadow(
          -aberrationStrength,
          0,
          aberrationStrength,
          aberrationStrength * 0.5,
        ),
        prog: 0.5,
      },
      {
        key: 'boxShadow',
        val: createShadow(0, 0, 0, 0),
        prog: 1,
      },
    ],
  };

  // Create floating scale effect
  const floatScaleEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: pulseSpeed,
    mode: 'provider',
    targetIds: targetIds,
    loop: true,
    ranges: [
      // Start scale
      { key: 'scale', val: 1.0, prog: 0 },
      // Scale up slightly
      { key: 'scale', val: 1.0 + floatAmount, prog: 0.5 },
      // Return to original
      { key: 'scale', val: 1.0, prog: 1 },
    ],
  };

  // Create effect nodes
  const chromaticEffectNode = {
    id:
      params.effectId ||
      `chromatic-aberration-${targetIds[0] || 'default'}-shadow`,
    componentId: 'generic',
    data: chromaticEffect,
  };

  const floatEffectNode = {
    id:
      params.effectId ||
      `chromatic-aberration-${targetIds[0] || 'default'}-scale`,
    componentId: 'generic',
    data: floatScaleEffect,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'chromatic-aberration-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          effects: [chromaticEffectNode, floatEffectNode],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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
  id: 'chromatic-aberration-effect',
  title: 'Chromatic Aberration Effect',
  description:
    'Internal effect preset that simulates color separation through heated air or distorted glass. Creates RGB shadow layers (red left, green center, blue right) with breathing chromatic animation and subtle floating scale effect. Works on text and container elements for a dreamy, heat-distorted appearance.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'chromatic',
    'aberration',
    'rgb',
    'shadow',
    'distortion',
    'heat',
    'glitch',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-component-1'],
    aberrationStrength: 3,
    pulseSpeed: 2500,
    colorIntensity: 0.4,
    floatAmount: 0.02,
  },
};

export const chromaticAberrationEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
