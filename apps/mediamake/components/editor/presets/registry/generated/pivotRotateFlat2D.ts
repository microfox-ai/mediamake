/**
 * Pivot Rotate Flat 2D Effect Preset
 *
 * INTERNAL EFFECT PRESET - Returns generic AnimationRange[] for transform property
 *
 * This internal effect performs a flat 2D rotation animation around a customizable pivot point.
 * The effect calculates translation offsets to maintain visual position during rotation,
 * creating the appearance of rotating around a specified pivot point.
 *
 * Features:
 * - Customizable pivot position (0-100% for x/y coordinates)
 * - Rotation in degrees (clockwise or counterclockwise)
 * - Configurable duration and easing
 * - Optional return to origin animation
 * - Works with text, video, image atoms via targetIds
 *
 * Technical Details:
 * - Type: Generic effect (AnimationRange[])
 * - Properties: transform (rotate + translate)
 * - Mode: provider (targets specific component IDs)
 * - Pivot compensation: Translates element to maintain visual position during rotation
 *
 * Use cases:
 * - Creating dynamic rotation effects with custom pivot points
 * - Building rotating text animations
 * - Adding spinning transitions to media elements
 * - Creating compound rotation effects with pivot control
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the rotation effect to'),

  pivotX: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Horizontal pivot position as percentage (0-100, where 0=left, 50=center, 100=right)'),

  pivotY: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Vertical pivot position as percentage (0-100, where 0=top, 50=center, 100=bottom)'),

  rotation: z
    .number()
    .default(360)
    .describe('Rotation angle in degrees (positive=clockwise, negative=counterclockwise)'),

  duration: z
    .number()
    .min(0.1)
    .default(2)
    .describe('Duration of the rotation animation in seconds'),

  effectStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect relative to the component timeline'),

  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-in-out')
    .describe('Easing function for the rotation animation'),

  returnToOrigin: z
    .boolean()
    .default(false)
    .describe('Whether to return to the original position after rotation'),

  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (defaults to auto-generated)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    pivotX,
    pivotY,
    rotation,
    duration,
    effectStart,
    easing,
    returnToOrigin,
    effectId,
  } = params;

  // Helper function to calculate translation offset for pivot compensation
  const calculatePivotOffset = (
    pivotPercent: number,
    dimension: number,
  ): number => {
    // Convert percentage to offset from center (-50 to +50)
    // 0% = -50 (far left/top), 50% = 0 (center), 100% = +50 (far right/bottom)
    return (pivotPercent - 50) * (dimension / 100);
  };

  // For a 2D flat rotation with pivot compensation:
  // We need to translate the element so the pivot point becomes the rotation center
  // Standard assumption: element is 100 units wide/tall for percentage calculations
  const elementWidth = 100;
  const elementHeight = 100;

  const offsetX = calculatePivotOffset(pivotX, elementWidth);
  const offsetY = calculatePivotOffset(pivotY, elementHeight);

  // Build animation ranges
  // We combine translate and rotate transforms to achieve pivot rotation
  const ranges: Array<{ key: string; val: any; prog: number }> = [];

  if (returnToOrigin) {
    // Animation: start → rotate → return to start
    // Phase 1: Rotate to target angle (0 → 0.5 progress)
    ranges.push(
      // Start position
      { key: 'translateX', val: offsetX, prog: 0 },
      { key: 'translateY', val: offsetY, prog: 0 },
      { key: 'rotate', val: 0, prog: 0 },

      // Mid position (full rotation)
      { key: 'translateX', val: offsetX, prog: 0.5 },
      { key: 'translateY', val: offsetY, prog: 0.5 },
      { key: 'rotate', val: rotation, prog: 0.5 },

      // End position (return to start)
      { key: 'translateX', val: offsetX, prog: 1 },
      { key: 'translateY', val: offsetY, prog: 1 },
      { key: 'rotate', val: 0, prog: 1 },
    );
  } else {
    // Animation: start → rotate (stays rotated)
    ranges.push(
      // Start position
      { key: 'translateX', val: offsetX, prog: 0 },
      { key: 'translateY', val: offsetY, prog: 0 },
      { key: 'rotate', val: 0, prog: 0 },

      // End position (rotated)
      { key: 'translateX', val: offsetX, prog: 1 },
      { key: 'translateY', val: offsetY, prog: 1 },
      { key: 'rotate', val: rotation, prog: 1 },
    );
  }

  // Construct effect data
  const effectData: GenericEffectData = {
    type: easing,
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: ranges,
  };

  // Create effect node
  const effect = {
    id: effectId || `pivot-rotate-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return output structure for internal effect preset
  return {
    output: {
      childrenData: [
        {
          id: 'pivot-rotate-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'pivotRotateFlat2D',
  title: 'Pivot Rotate Flat 2D Effect',
  description:
    'Internal effect preset that performs a flat 2D rotation animation with customizable pivot points. Accepts parameters for pivot position (0-100% for x/y), rotation degrees, duration, easing, direction (clockwise/counterclockwise), and whether to return to origin. Generates generic AnimationRange[] for the transform property combining rotate() and translate() values to achieve rotation around a specified pivot point by compensating for the rotation origin offset.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'rotation',
    'pivot',
    'transform',
    'animate',
    'generic',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    pivotX: 50,
    pivotY: 50,
    rotation: 360,
    duration: 2,
    effectStart: 0,
    easing: 'ease-in-out',
    returnToOrigin: false,
  },
};

// Export preset
export const pivotRotateFlat2DPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
