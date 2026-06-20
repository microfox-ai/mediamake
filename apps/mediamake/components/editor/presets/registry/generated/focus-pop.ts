/**
 * Focus Pop Effect - Internal Effect Preset
 *
 * SINGLE EFFECT (or array if multiple property animations combined):
 * Creates a cinematic focusing effect that combines scale, blur, and brightness adjustments
 * to simulate a depth-of-field focus pull. Starts slightly blurred and dimmed at scale 0.96,
 * pops to sharp focus with scale boost and brightness increase, then settles to normal.
 * Perfect for drawing attention to hero elements like a cinematographer uses focus pulls
 * and exposure adjustments to guide viewer attention.
 *
 * Effect properties animated:
 * - scale: 0.96 → peakScale (default 1.02) → 1.0
 * - blur: initialBlur (default 3px) → 0 (sharp focus)
 * - brightness: 0.9 → brightBoost (default 1.1) → 1.0
 *
 * Use cases:
 * - Drawing attention to hero elements or CTA buttons
 * - Highlighting important text or images
 * - Creating cinematic focus pull effects
 * - Guiding viewer attention through exposure and focus changes
 * - Adding depth and dimension to flat UI elements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the focus pop effect to'),
  initialBlur: z
    .number()
    .min(0)
    .max(20)
    .default(3)
    .optional()
    .describe('Starting blur radius in pixels (depth-of-field simulation)'),
  peakScale: z
    .number()
    .min(0.8)
    .max(1.5)
    .default(1.02)
    .optional()
    .describe('Maximum scale at focus peak (slight pop effect)'),
  brightBoost: z
    .number()
    .min(0.8)
    .max(2)
    .default(1.1)
    .optional()
    .describe('Brightness multiplier at peak (exposure adjustment)'),
  duration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.6)
    .optional()
    .describe('Total effect duration in seconds'),
  holdDuration: z
    .number()
    .min(0)
    .max(2)
    .default(0.1)
    .optional()
    .describe(
      'Hold time at peak before settling (unused in current keyframe structure but kept for compatibility)',
    ),
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-in-out')
    .optional()
    .describe('Easing function for the animation'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const targetIds = params.targetIds;
  const initialBlur = params.initialBlur ?? 3;
  const peakScale = params.peakScale ?? 1.02;
  const brightBoost = params.brightBoost ?? 1.1;
  const duration = params.duration ?? 0.6;
  const easing = params.easing ?? 'ease-in-out';
  const effectId = params.effectId || `focus-pop-effect-${targetIds.join('-')}`;

  // Build the generic effect data with all three property animations
  const effectData = {
    type: easing,
    start: 0,
    duration,
    mode: 'provider' as const,
    targetIds,
    ranges: [
      // Scale animation: start slightly smaller, pop to peak, settle to normal
      { key: 'scale', val: 0.96, prog: 0 },
      { key: 'scale', val: peakScale, prog: 0.4 },
      { key: 'scale', val: 1, prog: 1 },

      // Blur animation: start blurred (depth-of-field), sharpen quickly
      { key: 'blur', val: initialBlur, prog: 0 },
      { key: 'blur', val: 0, prog: 0.3 },

      // Brightness animation: start dimmed, brighten at peak (exposure), settle to normal
      { key: 'brightness', val: 0.9, prog: 0 },
      { key: 'brightness', val: brightBoost, prog: 0.4 },
      { key: 'brightness', val: 1, prog: 1 },
    ],
  };

  // Create the effect object
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'focus-pop-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
    effects: [effect],
    childrenData: [] as RenderableComponentData[],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'focus-pop',
  title: 'Focus Pop Effect',
  description:
    'Internal effect preset that combines scale, blur, and brightness adjustments to create a cinematic focusing effect. Starts slightly blurred and dimmed at scale 0.96, pops to sharp focus with scale boost and brightness increase, then settles to normal. Simulates depth-of-field and exposure adjustments like a cinematographer\'s focus pull to guide viewer attention to hero elements.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'generic',
    'focus',
    'cinematic',
    'scale',
    'blur',
    'brightness',
    'attention',
    'hero',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['hero-element'],
    initialBlur: 3,
    peakScale: 1.02,
    brightBoost: 1.1,
    duration: 0.6,
    holdDuration: 0.1,
    easing: 'ease-in-out',
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const focusPopPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
