/**
 * Soft Dissolve Internal Effect Preset
 *
 * SINGLE EFFECT:
 * A sophisticated multi-stage dissolve effect that combines blur, scale, opacity, brightness,
 * and optional grain texture overlay for cinematic transitions. Perfect for revealing hero content
 * or transitioning between scenes with a gentle, professional feel.
 *
 * Features:
 * - Multi-stage blur reduction (3px → 0px)
 * - Scale animation with subtle overshoot (0.95 → 1.02 → 1)
 * - Smooth opacity fade-in (0 → 1)
 * - Brightness boost that peaks midway (1 → 1.15 → 1)
 * - Optional grain texture overlay that fades out as element becomes clear
 * - Fully configurable parameters for custom intensity and timing
 *
 * Use Cases:
 * - Cinematic scene transitions
 * - Revealing hero content with impact
 * - Sophisticated dissolve effects for premium content
 * - Image/video reveals with depth and dimension
 *
 * Parameters:
 * - initialBlur: Starting blur amount (default: 3px)
 * - scaleRange: Array of [start, peak, end] scale values (default: [0.95, 1.02, 1])
 * - brightnessBoost: Peak brightness multiplier (default: 1.15)
 * - includeGrain: Enable grain texture overlay (default: false)
 * - duration: Effect duration in seconds (default: 1.8s)
 * - targetIds: Array of component IDs to apply effect to
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  initialBlur: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .describe('Starting blur amount in pixels (default: 3)'),
  scaleRange: z
    .array(z.number())
    .length(3)
    .optional()
    .describe('Array of [start, peak, end] scale values (default: [0.95, 1.02, 1])'),
  brightnessBoost: z
    .number()
    .min(1)
    .max(2)
    .optional()
    .describe('Peak brightness multiplier at midpoint (default: 1.15)'),
  includeGrain: z
    .boolean()
    .optional()
    .describe('Enable grain texture overlay that fades out (default: false)'),
  duration: z
    .number()
    .min(0.3)
    .max(5)
    .optional()
    .describe('Effect duration in seconds (default: 1.8)'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the dissolve effect to'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const initialBlur = params.initialBlur ?? 3;
  const scaleRange = params.scaleRange ?? [0.95, 1.02, 1];
  const brightnessBoost = params.brightnessBoost ?? 1.15;
  const includeGrain = params.includeGrain ?? false;
  const duration = params.duration ?? 1.8;
  const targetIds = params.targetIds;

  // Validate scaleRange length
  if (scaleRange.length !== 3) {
    throw new Error('scaleRange must contain exactly 3 values: [start, peak, end]');
  }

  // Construct filter values based on includeGrain parameter
  const filterValues = includeGrain
    ? [
        'contrast(1.1) grayscale(0.1)',
        'contrast(1.05) grayscale(0.05)',
        'contrast(1) grayscale(0)',
      ]
    : ['none', 'none', 'none'];

  // Build the multi-stage generic effect
  const effectData: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Blur: 3px → 1px → 0px (at progress 0 → 0.5 → 1)
      { key: 'blur', val: `${initialBlur}px`, prog: 0 },
      { key: 'blur', val: '1px', prog: 0.5 },
      { key: 'blur', val: '0px', prog: 1 },

      // Scale: 0.95 → 1.02 → 1 (at progress 0 → 0.7 → 1)
      { key: 'scale', val: scaleRange[0], prog: 0 },
      { key: 'scale', val: scaleRange[1], prog: 0.7 },
      { key: 'scale', val: scaleRange[2], prog: 1 },

      // Opacity: 0 → 0.8 → 1 (at progress 0 → 0.4 → 0.8)
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.8, prog: 0.4 },
      { key: 'opacity', val: 1, prog: 0.8 },

      // Brightness: 1 → 1.15 → 1 (at progress 0 → 0.5 → 1)
      { key: 'brightness', val: 1, prog: 0 },
      { key: 'brightness', val: brightnessBoost, prog: 0.5 },
      { key: 'brightness', val: 1, prog: 1 },

      // Filter (grain texture): fades out from grainy to clear (at progress 0 → 0.5 → 1)
      { key: 'filter', val: filterValues[0], prog: 0 },
      { key: 'filter', val: filterValues[1], prog: 0.5 },
      { key: 'filter', val: filterValues[2], prog: 1 },
    ],
  };

  // Create the effect object
  const effect = {
    id: params.effectId || `soft-dissolve-effect-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect wrapped in the expected structure
  return {
    output: {
      childrenData: [
        {
          id: 'soft-dissolve-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {},
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
          effects: [effect],
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'soft-dissolve-effect',
  title: 'Soft Dissolve Internal Effect',
  description:
    'A sophisticated multi-stage dissolve effect combining blur, scale, opacity, brightness, and optional grain texture for cinematic transitions. Designed as an internal effect preset that applies to target components via the generic effect system.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'dissolve', 'blur', 'scale', 'opacity', 'brightness', 'grain', 'cinematic', 'transition', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    initialBlur: 3,
    scaleRange: [0.95, 1.02, 1],
    brightnessBoost: 1.15,
    includeGrain: false,
    duration: 1.8,
    targetIds: ['target-component'],
  },
};

export const softDissolveEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};