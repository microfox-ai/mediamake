/**
 * Gentle Drift Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates subtle floating movement with easing. Elements drift upward (or custom direction)
 * while rotating slightly with a very soft ease-out curve. Includes a gentle opacity fade
 * from a configurable start opacity to full opacity during the first 30% of the animation.
 *
 * Perfect for creating atmospheric, dreamy effects on text overlays or image elements.
 *
 * Parameters:
 * - driftDistance: Distance to drift (default: -20 for upward, positive for downward)
 * - rotationAmount: Degrees to rotate (default: 3)
 * - startOpacity: Initial opacity value (default: 0.8)
 * - duration: Animation duration in milliseconds (default: 2000ms)
 * - targetIds: Array of component IDs to apply the effect to
 * - effectId: Optional custom effect ID
 *
 * Usage:
 * Call this preset from other presets to apply a gentle drift effect to any component.
 * The effect uses ease-out timing for a soft, natural deceleration.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  driftDistance: z
    .number()
    .optional()
    .describe('Distance to drift in pixels (negative = upward, positive = downward, default: -20)'),
  rotationAmount: z
    .number()
    .optional()
    .describe('Rotation amount in degrees (default: 3)'),
  startOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Starting opacity value (0-1, default: 0.8)'),
  duration: z
    .number()
    .optional()
    .describe('Animation duration in milliseconds (default: 2000)'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
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
  // Extract parameters with defaults
  const driftDistance = params.driftDistance ?? -20;
  const rotationAmount = params.rotationAmount ?? 3;
  const startOpacity = params.startOpacity ?? 0.8;
  const durationMs = params.duration ?? 2000;
  const targetIds = params.targetIds;
  
  // Convert duration from milliseconds to seconds for effect timing
  const durationSeconds = durationMs / 1000;

  // Construct generic effect data with ease-out timing
  const effectData: GenericEffectData = {
    type: 'ease-out', // Soft ease-out curve for gentle deceleration
    start: 0,
    duration: durationSeconds,
    mode: 'provider', // Always use provider mode with targetIds
    targetIds: targetIds,
    ranges: [
      // Drift upward (translateY from 0 to driftDistance)
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: driftDistance, prog: 1 },
      
      // Rotate slightly (from 0 to rotationAmount degrees)
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: rotationAmount, prog: 1 },
      
      // Gentle opacity fade (from startOpacity to 1 in first 30%)
      { key: 'opacity', val: startOpacity, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 1 }, // Hold at full opacity
    ],
  };

  // Create the effect node
  const effect = {
    id: params.effectId || `gentle-drift-${targetIds.join('-')}`,
    componentId: 'generic', // Use 'generic' for UniversalEffect
    data: effectData,
  };

  // Return effect wrapped in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'gentle-drift-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: durationSeconds,
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
  id: 'gentle-drift-effect',
  title: 'Gentle Drift Effect',
  description:
    'Internal effect preset that creates subtle floating movement with easing. Elements drift upward by 20px while rotating slightly (3 degrees) with a very soft ease-out curve. Includes gentle opacity fade from 0.8 to 1 during the first 30% of the animation. Perfect for creating atmospheric, dreamy effects on text overlays or image elements.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'drift', 'float', 'gentle', 'ease-out', 'internal', 'generic'],
  dependencies: {},
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    driftDistance: -20,
    rotationAmount: 3,
    startOpacity: 0.8,
    duration: 2000,
    targetIds: ['example-component-id'],
  },
};

// Export preset
export const gentleDriftEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
