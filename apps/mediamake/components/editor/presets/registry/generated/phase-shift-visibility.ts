/**
 * PhaseShift Instant Visibility Preset
 *
 * An instant visibility preset that toggles element visibility through a phase-shifting effect.
 * Elements instantly appear/disappear with an accompanying horizontal phase displacement - appearing
 * shifted 50-100px horizontally then snapping back to position, or shifting away then disappearing.
 * Creates a glitchy, dimensional shift effect perfect for UI elements or text reveals.
 *
 * Features:
 * - Instant visibility change with phase shift animation
 * - Configurable shift distance (20-200px)
 * - Shift direction: left, right, or alternate
 * - Adjustable snap speed (50-500ms)
 * - Cascade delay for multiple targets
 * - For 'in' direction: opacity instantly to 1, translateX from shiftDistance to 0
 * - For 'out' direction: translateX instantly to shiftDistance, then opacity to 0
 *
 * Use cases:
 * - Glitchy UI element reveals
 * - Dimensional shift effects for text
 * - Phase-based navigation transitions
 * - Cyberpunk/tech-style animations
 * - Interactive element state changes
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the phase shift effect to'),
  shiftDistance: z
    .number()
    .min(20)
    .max(200)
    .describe('Distance in pixels to shift horizontally (20-200)'),
  shiftDirection: z
    .enum(['left', 'right', 'alternate'])
    .describe(
      'Direction of phase shift: left (negative X), right (positive X), or alternate (alternates between targets)',
    ),
  snapSpeed: z
    .number()
    .min(50)
    .max(500)
    .describe('Speed of snap-back animation in milliseconds (50-500)'),
  cascadeDelay: z
    .number()
    .min(0)
    .max(1000)
    .default(0)
    .optional()
    .describe(
      'Delay between each target in milliseconds for cascading effect (0-1000)',
    ),
  direction: z
    .enum(['in', 'out'])
    .describe(
      'Animation direction: in (appear with shift) or out (shift then disappear)',
    ),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time of the effect in seconds (relative to parent)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate shift distance based on direction and index
  const calculateShiftDistance = (index: number): number => {
    const baseDistance = params.shiftDistance;

    switch (params.shiftDirection) {
      case 'left':
        return -baseDistance;
      case 'right':
        return baseDistance;
      case 'alternate':
        return index % 2 === 0 ? baseDistance : -baseDistance;
      default:
        return baseDistance;
    }
  };

  // Helper function to create phase shift effect for a single target
  const createPhaseEffect = (
    targetId: string,
    cascadeIndex: number,
  ): {
    id: string;
    componentId: string;
    data: GenericEffectData;
  } => {
    const shiftDistance = calculateShiftDistance(cascadeIndex);
    const snapDuration = params.snapSpeed / 1000; // Convert ms to seconds
    const cascadeDelay = (params.cascadeDelay ?? 0) / 1000; // Convert ms to seconds
    const effectStart = (params.effectStart ?? 0) + cascadeIndex * cascadeDelay;

    let ranges: Array<{ key: string; val: any; prog: number }> = [];

    if (params.direction === 'in') {
      // For 'in' direction:
      // - opacity instantly to 1 at prog 0.01
      // - translateX from shiftDistance at prog 0 to 0 at prog 1
      ranges = [
        // Instant opacity
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.01 },
        { key: 'opacity', val: 1, prog: 1 },
        // Phase shift animation
        { key: 'translateX', val: shiftDistance, prog: 0 },
        { key: 'translateX', val: shiftDistance, prog: 0.01 },
        { key: 'translateX', val: 0, prog: 1 },
      ];
    } else {
      // For 'out' direction:
      // - translateX instantly to shiftDistance at prog 0.01
      // - opacity to 0 at prog 1
      ranges = [
        // Phase shift instant
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: shiftDistance, prog: 0.01 },
        { key: 'translateX', val: shiftDistance, prog: 1 },
        // Fade out
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.99 },
        { key: 'opacity', val: 0, prog: 1 },
      ];
    }

    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: effectStart,
      duration: snapDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };

    return {
      id: `phase-shift-effect-${targetId}-${cascadeIndex}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Create effects for all targets
  const effects = params.targetIds.map((targetId, index) =>
    createPhaseEffect(targetId, index),
  );

  // Create root container with effects
  const rootContainer: RenderableComponentData = {
    id: 'phase-shift-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Default duration, should be overridden by parent
      },
    },
    effects: effects,
    childrenData: [],
  } as RenderableComponentData;

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
  id: 'phase-shift-visibility',
  title: 'PhaseShift Instant Visibility',
  description:
    'An instant visibility preset that toggles element visibility through a phase-shifting effect. Elements instantly appear/disappear with an accompanying horizontal phase displacement - appearing shifted 50-100px horizontally then snapping back to position, or shifting away then disappearing. Creates a glitchy, dimensional shift effect perfect for UI elements or text reveals. Supports configurable shift distance, direction (left/right/alternate), snap speed, and cascade delay for multiple targets.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'visibility',
    'phase',
    'shift',
    'glitch',
    'instant',
    'dimensional',
    'generic',
  ],
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    shiftDistance: 75,
    shiftDirection: 'right',
    snapSpeed: 200,
    cascadeDelay: 50,
    direction: 'in',
    effectStart: 0,
  },
};

// Export preset
export const phaseShiftVisibilityPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
