/**
 * Liquid Wave Distortion Effect Preset
 *
 * SINGLE EFFECT:
 * Applies a wavy, liquid-like distortion effect using CSS transforms (skewX, skewY)
 * and blur filters. The effect animates with sinusoidal progression creating an
 * undulating, fluid motion. Includes scale oscillation to enhance the liquid feel.
 *
 * Features:
 * - Sinusoidal wave animation using skewX and skewY transforms
 * - Subtle blur filter synchronized with skew deformation
 * - Scale oscillation (1.0 to 1.05) for enhanced liquid feel
 * - Spring easing for organic, natural motion
 * - Configurable intensity multiplier for skew values
 * - Adjustable blur amount
 * - Reusable for any component type (text, images, video)
 *
 * Animation Pattern:
 * - prog: 0.0  → skewX: 0deg, skewY: 0deg, blur: 0px, scale: 1.0
 * - prog: 0.25 → skewX: 8deg, skewY: -5deg, blur: 2px, scale: 1.05 (peak forward)
 * - prog: 0.5  → skewX: 0deg, skewY: 0deg, blur: 1px, scale: 1.0 (neutral midpoint)
 * - prog: 0.75 → skewX: -8deg, skewY: 5deg, blur: 2px, scale: 1.05 (peak reverse)
 * - prog: 1.0  → skewX: 0deg, skewY: 0deg, blur: 0px, scale: 1.0 (return to neutral)
 *
 * Use cases:
 * - Creating fluid, organic motion effects
 * - Adding liquid-like distortion to text overlays
 * - Applying wavy animations to images and video
 * - Building dynamic, flowing visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the liquid wave effect to'),
  duration: z
    .number()
    .default(2000)
    .optional()
    .describe('Duration of the effect in milliseconds'),
  intensity: z
    .number()
    .min(0)
    .max(2)
    .default(1.0)
    .optional()
    .describe('Intensity multiplier for skew values (0-2, default 1.0)'),
  blurAmount: z
    .number()
    .default(2)
    .optional()
    .describe('Maximum blur amount in pixels (default 2)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the liquid wave effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const duration = (params.duration ?? 2000) / 1000; // Convert ms to seconds
  const intensity = params.intensity ?? 1.0;
  const blurAmount = params.blurAmount ?? 2;
  const targetIds = params.targetIds;

  // Calculate skew values with intensity multiplier
  const maxSkewX = 8 * intensity;
  const maxSkewY = 5 * intensity;

  // Construct the generic effect with sinusoidal animation ranges
  const effectData: GenericEffectData = {
    type: 'spring',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // SkewX animation: 0 → 8deg → 0 → -8deg → 0
      { key: 'skewX', val: `0deg`, prog: 0 },
      { key: 'skewX', val: `${maxSkewX}deg`, prog: 0.25 },
      { key: 'skewX', val: `0deg`, prog: 0.5 },
      { key: 'skewX', val: `${-maxSkewX}deg`, prog: 0.75 },
      { key: 'skewX', val: `0deg`, prog: 1 },

      // SkewY animation: 0 → -5deg → 0 → 5deg → 0 (inverted from skewX)
      { key: 'skewY', val: `0deg`, prog: 0 },
      { key: 'skewY', val: `${-maxSkewY}deg`, prog: 0.25 },
      { key: 'skewY', val: `0deg`, prog: 0.5 },
      { key: 'skewY', val: `${maxSkewY}deg`, prog: 0.75 },
      { key: 'skewY', val: `0deg`, prog: 1 },

      // Blur animation: 0 → 2px → 1px → 2px → 0
      { key: 'blur', val: `0px`, prog: 0 },
      { key: 'blur', val: `${blurAmount}px`, prog: 0.25 },
      { key: 'blur', val: `${blurAmount * 0.5}px`, prog: 0.5 },
      { key: 'blur', val: `${blurAmount}px`, prog: 0.75 },
      { key: 'blur', val: `0px`, prog: 1 },

      // Scale animation: 1.0 → 1.05 → 1.0 → 1.05 → 1.0
      { key: 'scale', val: 1.0, prog: 0 },
      { key: 'scale', val: 1.05, prog: 0.25 },
      { key: 'scale', val: 1.0, prog: 0.5 },
      { key: 'scale', val: 1.05, prog: 0.75 },
      { key: 'scale', val: 1.0, prog: 1 },
    ],
  };

  // Create the effect node
  const effect = {
    id:
      params.effectId ||
      `liquid-wave-${targetIds.length > 0 ? targetIds[0] : 'effect'}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect in a minimal container structure
  return {
    output: {
      childrenData: [
        {
          id: 'liquid-wave-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          effects: [effect],
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
  id: 'LiquidWaveDistortion',
  title: 'Liquid Wave Distortion Effect',
  description:
    'Internal effect preset that returns a wavy, liquid-like distortion effect using CSS transforms (skewX, skewY) and blur filters. Provides sinusoidal animation with spring easing for organic, fluid motion. Accepts parameters for duration, intensity, blur amount, and target component IDs. Returns effect data only - no visual components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'distortion', 'liquid', 'wave', 'skew', 'blur', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    duration: 2000,
    intensity: 1.0,
    blurAmount: 2,
  },
};

export const LiquidWaveDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
