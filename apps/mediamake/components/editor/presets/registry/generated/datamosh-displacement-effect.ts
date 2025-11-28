/**
 * Datamosh Displacement Internal Effect
 *
 * SINGLE EFFECT (or ARRAY OF EFFECTS):
 * Creates pixel-sorting artifacts through transform manipulation and blur effects.
 * Animates translateX and translateY with jagged, stepped progressions (creating a 'broken transmission' look),
 * while simultaneously applying dynamic blur that pulses between 0 and 8px. Adds skewX animations that create
 * horizontal tearing effects. Uses linear easing to maintain the harsh, digital aesthetic.
 *
 * This is an INTERNAL effect preset - returns effect data objects only, not component structure.
 * To be called by other presets via props.presets['datamosh-displacement-effect'](params, props).
 *
 * Features:
 * - Stepped, jagged horizontal displacement (translateX)
 * - Random-like vertical displacement (translateY)
 * - Horizontal tearing effect (skewX)
 * - Pulsing blur synchronized with displacement
 * - Configurable displacement range, tear intensity, and blur amount
 * - Linear easing for harsh, digital aesthetic
 *
 * Use cases:
 * - Creating glitch/datamosh effects on text or images
 * - Simulating broken transmission or digital corruption
 * - Adding aggressive motion artifacts to elements
 * - Building experimental, glitch-art visuals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the datamosh effect to'),
  displacementRange: z
    .number()
    .min(0)
    .max(100)
    .default(25)
    .optional()
    .describe('Maximum pixel displacement for translations (default: 25px)'),
  tearIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe(
      'Intensity of skewX tearing effect, 0-1 scale (default: 0.5, creates ±2.5deg tears)'
    ),
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(8)
    .optional()
    .describe('Maximum blur amount in pixels, 0-10 range (default: 8px)'),
  start: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe(
      'Start time of the effect in seconds, relative to parent timeline (default: 0)'
    ),
  duration: z
    .number()
    .min(0.1)
    .default(2)
    .optional()
    .describe('Duration of the effect in seconds (default: 2s)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the generated effect'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  // Extract parameters with defaults
  const displacementRange = params.displacementRange ?? 25;
  const tearIntensity = params.tearIntensity ?? 0.5;
  const blurAmount = params.blurAmount ?? 8;
  const start = params.start ?? 0;
  const duration = params.duration ?? 2;
  const effectId =
    params.effectId || `datamosh-displacement-${params.targetIds.join('-')}`;

  // Construct the generic effect data with all animation ranges
  const effectData: GenericEffectData = {
    type: 'linear', // Linear easing for harsh, digital aesthetic
    start,
    duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      // --- translateX: Stepped jagged horizontal displacement ---
      { key: 'translateX', val: 0, prog: 0 }, // Start neutral
      { key: 'translateX', val: -displacementRange * 0.8, prog: 0.15 }, // -20px default
      { key: 'translateX', val: displacementRange * 0.6, prog: 0.3 }, // 15px default
      { key: 'translateX', val: -displacementRange * 0.32, prog: 0.5 }, // -8px default
      { key: 'translateX', val: displacementRange, prog: 0.7 }, // 25px default
      { key: 'translateX', val: 0, prog: 1 }, // Return to neutral

      // --- translateY: Stepped jagged vertical displacement ---
      { key: 'translateY', val: 0, prog: 0 }, // Start neutral
      { key: 'translateY', val: displacementRange * 0.4, prog: 0.1 }, // 10px default
      { key: 'translateY', val: -displacementRange * 0.24, prog: 0.25 }, // -6px default
      { key: 'translateY', val: displacementRange * 0.64, prog: 0.45 }, // 16px default
      { key: 'translateY', val: -displacementRange * 0.48, prog: 0.65 }, // -12px default
      { key: 'translateY', val: displacementRange * 0.28, prog: 0.85 }, // 7px default
      { key: 'translateY', val: 0, prog: 1 }, // Return to neutral

      // --- skewX: Horizontal tearing effect ---
      { key: 'skewX', val: 0, prog: 0 }, // Start neutral
      { key: 'skewX', val: tearIntensity * 5, prog: 0.2 }, // 2.5deg default
      { key: 'skewX', val: -tearIntensity * 5, prog: 0.4 }, // -2.5deg default
      { key: 'skewX', val: tearIntensity * 5, prog: 0.6 }, // 2.5deg default
      { key: 'skewX', val: -tearIntensity * 3, prog: 0.8 }, // -1.5deg default
      { key: 'skewX', val: 0, prog: 1 }, // Return to neutral

      // --- blur: Pulsing blur synchronized with displacement ---
      { key: 'blur', val: 0, prog: 0 }, // Start sharp
      { key: 'blur', val: blurAmount * 0.75, prog: 0.15 }, // 6px default
      { key: 'blur', val: blurAmount * 0.25, prog: 0.3 }, // 2px default
      { key: 'blur', val: blurAmount, prog: 0.5 }, // 8px default (max)
      { key: 'blur', val: blurAmount * 0.5, prog: 0.7 }, // 4px default
      { key: 'blur', val: blurAmount * 0.625, prog: 0.85 }, // 5px default
      { key: 'blur', val: 0, prog: 1 }, // Return to sharp
    ],
  };

  // Create the effect node
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };

  // Return output structure with effect attached to a container
  // System will extract effects via _extractedEffects
  const rootContainer: RenderableComponentData = {
    id: 'datamosh-displacement-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Placeholder duration
      },
    },
    effects: [effect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: [effect], // Provide easy extraction for calling presets
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'datamosh-displacement-effect',
  title: 'Datamosh Displacement Effect',
  description:
    'Internal effect preset that creates pixel-sorting artifacts through transform manipulation and blur effects. Animates translateX and translateY with jagged, stepped progressions (creating a "broken transmission" look), while simultaneously applying dynamic blur that pulses between 0 and 8px. Adds skewX animations that create horizontal tearing effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'datamosh', 'displacement', 'transform', 'blur', 'tearing'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['example-component'],
    displacementRange: 25,
    tearIntensity: 0.5,
    blurAmount: 8,
    start: 0,
    duration: 2,
  },
};

// --- Export ---

export const datamoshDisplacementEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
