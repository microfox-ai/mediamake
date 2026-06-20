/**
 * ElasticBounce Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This preset generates smooth elastic overshoot animations using spring-based easing.
 * Creates a bouncy, elastic feel with customizable overshoot amplitude for scale and rotate properties.
 * Includes anticipation dip before main motion, mimicking classic animation principles.
 *
 * Features:
 * - Spring-based elastic easing with 8-point progression curve
 * - Initial backward motion (anticipation) at prog 0.1
 * - Main motion peak with overshoot at prog 0.7
 * - Secondary overshoot at prog 0.85
 * - Smooth settle by prog 1.0
 * - Customizable overshoot intensity (0.1 to 0.5)
 * - Animates scale and rotate properties simultaneously
 * - Accepts target element IDs for provider mode
 *
 * Use cases:
 * - Creating bouncy entrance animations
 * - Adding elastic feedback to interactive elements
 * - Building playful, energetic motion effects
 * - Applying spring physics to UI elements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  duration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Duration of the elastic bounce animation in seconds'),
  overshoot: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe(
      'Overshoot intensity multiplier (0.1 = subtle, 0.5 = extreme bounce)',
    ),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of target element IDs to apply the elastic bounce effect'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix for generated effects'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { duration, overshoot, targetIds, effectId } = params;

  // Helper function to calculate overshoot values
  const calculateOvershootValue = (
    baseValue: number,
    multiplier: number,
  ): number => {
    return baseValue + overshoot * multiplier;
  };

  // Generate unique effect IDs
  const scaleEffectId =
    effectId || `elastic-bounce-scale-${targetIds.join('-')}`;
  const rotateEffectId =
    effectId || `elastic-bounce-rotate-${targetIds.join('-')}`;

  // Scale effect with elastic overshoot curve
  const scaleEffectData: GenericEffectData = {
    type: 'spring',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Start at normal scale
      { key: 'scale', val: 1, prog: 0 },
      // Anticipation dip (slight scale down)
      { key: 'scale', val: 0.95, prog: 0.1 },
      // Main motion peak with overshoot
      { key: 'scale', val: calculateOvershootValue(1, 0.5), prog: 0.7 },
      // Secondary overshoot (settling)
      { key: 'scale', val: calculateOvershootValue(1, 0.27), prog: 0.85 },
      // Near settle
      { key: 'scale', val: calculateOvershootValue(1, 0.07), prog: 0.95 },
      // Final settle to normal scale
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // Rotate effect with elastic overshoot curve
  const rotateEffectData: GenericEffectData = {
    type: 'spring',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Start at no rotation
      { key: 'rotate', val: 0, prog: 0 },
      // Anticipation rotation (slight backward)
      { key: 'rotate', val: -2 * overshoot * 10, prog: 0.1 },
      // Main rotation peak with overshoot
      { key: 'rotate', val: overshoot * 15, prog: 0.7 },
      // Secondary overshoot (settling)
      { key: 'rotate', val: overshoot * 8, prog: 0.85 },
      // Near settle
      { key: 'rotate', val: overshoot * 2, prog: 0.95 },
      // Final settle to no rotation
      { key: 'rotate', val: 0, prog: 1 },
    ],
  };

  // Create effect objects
  const scaleEffect = {
    id: scaleEffectId,
    componentId: 'generic',
    data: scaleEffectData,
  };

  const rotateEffect = {
    id: rotateEffectId,
    componentId: 'generic',
    data: rotateEffectData,
  };

  // Return effects in container structure
  const rootContainer: RenderableComponentData = {
    id: 'elastic-bounce-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 0,
      },
    },
    effects: [scaleEffect, rotateEffect],
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
  id: 'elastic-bounce-effect',
  title: 'Elastic Bounce Effect',
  description:
    'Internal effect preset that provides smooth elastic overshoot animations for target elements. Uses spring-based easing with customizable overshoot amplitude, animating scale and rotate properties with anticipation dip before main motion. Accepts duration (default 0.8s), overshoot intensity (0.1-0.5), and target element IDs. Returns effects array with 8-point progression curves including initial backward motion, main motion peak, overshoot, and settle points.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'elastic',
    'bounce',
    'spring',
    'overshoot',
    'scale',
    'rotate',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    duration: 0.8,
    overshoot: 0.3,
    targetIds: ['target-element'],
  },
};

// Export preset
export const elasticBounceEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
