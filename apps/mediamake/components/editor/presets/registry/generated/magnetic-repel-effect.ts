/**
 * Magnetic Repel Effect - Internal Effect Preset
 *
 * SINGLE EFFECT (or ARRAY OF EFFECTS):
 * This internal effect preset creates a subtle repulsion effect that makes elements appear to be
 * gently pushed away from an invisible center point, then slowly drift back to origin.
 * 
 * The effect uses calculated radial movement with translateX and translateY to create outward
 * movement from the element's center position. Optional rotation and scale can be added for
 * enhanced visual interest. The movement pattern follows: rest → push out radially → slow drift
 * back → rest, creating a breathing/pulsing effect.
 *
 * Technical Implementation:
 * - Calculates radial direction from element center (0,0) outward
 * - Uses ease-out for repel phase (0 → 0.2 prog), ease-in for return phase (0.2 → 1.0 prog)
 * - Supports multiple target elements with staggered timing offsets
 * - Optional rotation during repulsion for enhanced dynamism
 * - Optional scale pulsing (1 → 1.05 → 1) in pulse mode
 * - Loop: true for continuous gentle pulsing effect
 *
 * Returns: Array of effects (one per targetId) for staggered application
 *
 * Use cases:
 * - Creating breathing room around important content
 * - Adding subtle dynamism to grouped elements
 * - Periodic repulsion triggers for attention
 * - Continuous gentle pulsing for ambient motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the magnetic repel effect to'),
  repelStrength: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .describe('Strength of the repulsion effect in pixels (10-100px)'),
  returnSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Speed multiplier for the return animation (0.5-2, higher = faster)'),
  includeSpin: z
    .boolean()
    .default(false)
    .describe('Whether to add slight rotation during repulsion'),
  pulseMode: z
    .boolean()
    .default(false)
    .describe('Whether to add subtle scale pulsing (1 → 1.05 → 1) during repulsion'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Delay between each target element in seconds (for staggered timing)'),
  radialAngleOffset: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe('Base angle offset in degrees for radial direction calculation'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate radial direction based on element index
  const calculateRadialDirection = (
    index: number,
    totalElements: number,
  ): { x: number; y: number; angle: number } => {
    // Distribute elements evenly in a circle (360 degrees / totalElements)
    const angleStep = 360 / totalElements;
    const angle = params.radialAngleOffset + index * angleStep;
    const radians = (angle * Math.PI) / 180;

    // Calculate normalized direction vector
    const x = Math.cos(radians);
    const y = Math.sin(radians);

    return { x, y, angle };
  };

  // Calculate base duration from returnSpeed
  const baseDuration = 3000 / params.returnSpeed; // 3000ms base * (1/returnSpeed)
  const durationInSeconds = baseDuration / 1000;

  // Generate effects for each target with staggered timing
  const effects = params.targetIds.map((targetId, index) => {
    const { x, y, angle } = calculateRadialDirection(
      index,
      params.targetIds.length,
    );

    // Calculate repel displacement
    const translateX = x * params.repelStrength;
    const translateY = y * params.repelStrength;

    // Calculate rotation for spin effect
    const rotationAmount = params.includeSpin ? 15 : 0; // ±15 degrees
    const rotationDirection = index % 2 === 0 ? 1 : -1; // Alternate direction

    // Build animation ranges
    const ranges: Array<{ key: string; val: any; prog: number }> = [
      // TranslateX animation: origin → repel → return → origin
      { key: 'translateX', val: 0, prog: 0 }, // Rest at origin
      { key: 'translateX', val: translateX, prog: 0.2 }, // Max repel (ease-out)
      { key: 'translateX', val: translateX * 0.1, prog: 0.8 }, // Slow drift back (ease-in)
      { key: 'translateX', val: 0, prog: 1.0 }, // Return to origin

      // TranslateY animation: origin → repel → return → origin
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: translateY, prog: 0.2 },
      { key: 'translateY', val: translateY * 0.1, prog: 0.8 },
      { key: 'translateY', val: 0, prog: 1.0 },
    ];

    // Add rotation if enabled
    if (params.includeSpin) {
      const rotation = rotationAmount * rotationDirection;
      ranges.push(
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: rotation, prog: 0.2 },
        { key: 'rotate', val: rotation * 0.3, prog: 0.8 },
        { key: 'rotate', val: 0, prog: 1.0 },
      );
    }

    // Add scale pulsing if pulseMode is enabled
    if (params.pulseMode) {
      ranges.push(
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.2 },
        { key: 'scale', val: 1.02, prog: 0.8 },
        { key: 'scale', val: 1, prog: 1.0 },
      );
    }

    // Calculate staggered start time
    const staggeredStart = params.effectStart + index * params.staggerDelay;

    // Construct effect data
    const effectData: GenericEffectData = {
      type: 'ease-out', // Ease-out for repel, ease-in handled by keyframe timing
      start: staggeredStart,
      duration: durationInSeconds,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
      loop: true, // Enable looping for continuous pulsing
    };

    return {
      id: `magnetic-repel-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return effects in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'magnetic-repel-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: durationInSeconds + params.staggerDelay * params.targetIds.length,
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
  id: 'magnetic-repel-effect',
  title: 'Magnetic Repel Effect',
  description:
    'Internal effect preset that creates a subtle repulsion effect, making elements appear to be gently pushed away from an invisible center point, then slowly drift back. Returns effect configuration with radial movement calculations for translateX, translateY, optional rotate, and optional scale. Supports multiple targets with staggered timing and continuous pulse mode for breathing room around important content.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'repel', 'radial', 'motion', 'pulse'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    repelStrength: 30,
    returnSpeed: 1,
    includeSpin: false,
    pulseMode: false,
    effectStart: 0,
    staggerDelay: 0.1,
    radialAngleOffset: 0,
  },
};

export const magneticRepelEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
