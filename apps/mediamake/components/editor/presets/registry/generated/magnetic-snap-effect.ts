/**
 * MagneticSnap Effect Preset
 *
 * INTERNAL COMBINED EFFECT PRESET (ARRAY OF EFFECTS)
 *
 * This internal effect preset simulates magnetic attraction for precise element placement.
 * It creates physics-based movement with three phases:
 * 1. Tension Build: Elements slightly repel (scale down, rotate) as if building magnetic tension
 * 2. Snap Motion: Accelerating movement to target position with magnetic pull
 * 3. Elastic Settle: Subtle overshoot and elastic settling at final position
 *
 * Features:
 * - **Physics-Based Animation**: Realistic magnetic attraction simulation
 * - **Multi-Phase Effect**: Tension → Snap → Settle sequence
 * - **Customizable Strength**: Control attraction intensity and acceleration curves
 * - **Axis Control**: Apply magnetic pull on both, horizontal, or vertical axis only
 * - **Glow Effect**: Synchronized box-shadow animation that intensifies during attraction
 * - **Elastic Overshoot**: Natural bounce effect on snap completion
 *
 * Technical:
 * - Returns array of effects: [tensionEffect, snapEffect, glowEffect]
 * - All timings are relative to component timeline
 * - Uses 'provider' mode with targetIds for direct component targeting
 * - Effect start times are sequential (tension → snap phases)
 *
 * Use cases:
 * - Precise element positioning with visual feedback
 * - UI element snapping animations
 * - Magnetic grid alignment effects
 * - Interactive placement simulations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply magnetic snap effect to'),
  targetPositions: z
    .array(
      z.object({
        x: z.number().describe('Target X position in pixels'),
        y: z.number().describe('Target Y position in pixels'),
      }),
    )
    .describe(
      'Array of target positions for each element (must match targetIds length)',
    ),
  attractionStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Magnetic attraction strength (0-1) - affects acceleration curve intensity',
    ),
  snapDistance: z
    .number()
    .default(100)
    .describe(
      'Distance threshold in pixels for triggering magnetic effect (not used in current implementation but reserved for future)',
    ),
  tensionDuration: z
    .number()
    .optional()
    .default(0.3)
    .describe('Duration in seconds for the pre-snap tension build phase'),
  magneticAxis: z
    .enum(['both', 'horizontal', 'vertical'])
    .default('both')
    .describe(
      'Axis for magnetic pull - both axes, horizontal only, or vertical only',
    ),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs (for uniqueness)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate random sign for rotation variation
  const randomSign = () => (Math.random() > 0.5 ? 1 : -1);

  // Helper function: Calculate magnetic curve values based on target position and strength
  const calculateMagneticCurve = (
    targetValue: number,
    strength: number,
  ): number[] => {
    const overshoot = targetValue * 0.08 * strength; // 8% overshoot scaled by strength
    return [
      0, // Start at origin
      targetValue * 0.6 * strength, // 60% progress (accelerating)
      targetValue + overshoot, // Overshoot beyond target
      targetValue, // Settle at final position
    ];
  };

  // Extract parameters
  const {
    targetIds,
    targetPositions,
    attractionStrength,
    tensionDuration,
    magneticAxis,
    effectIdPrefix = 'magnetic-snap',
  } = params;

  // Validate matching lengths
  if (targetIds.length !== targetPositions.length) {
    throw new Error(
      'targetIds and targetPositions arrays must have the same length',
    );
  }

  // Generate effects for each target
  const allEffects: any[] = [];

  targetIds.forEach((targetId, index) => {
    const position = targetPositions[index];
    const baseId = `${effectIdPrefix}-${targetId}`;

    // --- PHASE 1: TENSION EFFECT ---
    // Scale down and rotate to simulate magnetic tension building
    const tensionRanges: any[] = [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 0.92, prog: 1 },
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: randomSign() * 5, prog: 1 },
    ];

    const tensionEffect = {
      id: `${baseId}-tension`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: tensionDuration || 0.3,
        mode: 'provider',
        targetIds: [targetId],
        ranges: tensionRanges,
      } as GenericEffectData,
    };

    // --- PHASE 2: SNAP EFFECT ---
    // Accelerating movement to target with overshoot and elastic settle
    const snapRanges: any[] = [
      // Scale recovery and overshoot
      { key: 'scale', val: 0.92, prog: 0 },
      { key: 'scale', val: 1.08, prog: 0.5 },
      { key: 'scale', val: 0.97, prog: 0.75 },
      { key: 'scale', val: 1, prog: 1 },
      // Rotation settle
      { key: 'rotate', val: randomSign() * 5, prog: 0 },
      { key: 'rotate', val: 0, prog: 0.6 },
    ];

    // Add translation based on magnetic axis
    if (magneticAxis === 'both' || magneticAxis === 'horizontal') {
      const xCurve = calculateMagneticCurve(position.x, attractionStrength);
      snapRanges.push(
        { key: 'translateX', val: xCurve[0], prog: 0 },
        { key: 'translateX', val: xCurve[1], prog: 0.6 },
        { key: 'translateX', val: xCurve[2], prog: 0.8 },
        { key: 'translateX', val: xCurve[3], prog: 1 },
      );
    }

    if (magneticAxis === 'both' || magneticAxis === 'vertical') {
      const yCurve = calculateMagneticCurve(position.y, attractionStrength);
      snapRanges.push(
        { key: 'translateY', val: yCurve[0], prog: 0 },
        { key: 'translateY', val: yCurve[1], prog: 0.6 },
        { key: 'translateY', val: yCurve[2], prog: 0.8 },
        { key: 'translateY', val: yCurve[3], prog: 1 },
      );
    }

    const snapEffect = {
      id: `${baseId}-snap`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: tensionDuration || 0.3,
        duration: 0.6,
        mode: 'provider',
        targetIds: [targetId],
        ranges: snapRanges,
      } as GenericEffectData,
    };

    // --- PHASE 3: GLOW EFFECT ---
    // Box-shadow animation that intensifies during attraction and pulses on snap
    const glowIntensity = 10 + attractionStrength * 20; // 10-30px based on strength
    const glowColor = `rgba(59, 130, 246, ${0.3 + attractionStrength * 0.4})`; // Blue glow, opacity 0.3-0.7

    const glowRanges: any[] = [
      // Phase 1: Build up during tension
      {
        key: 'filter',
        val: 'drop-shadow(0 0 0px rgba(59, 130, 246, 0))',
        prog: 0,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${glowIntensity * 0.5}px ${glowColor})`,
        prog: 0.3,
      },
      // Phase 2: Peak during snap
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${glowIntensity}px ${glowColor})`,
        prog: 0.6,
      },
      // Phase 3: Pulse and settle
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${glowIntensity * 0.7}px ${glowColor})`,
        prog: 0.8,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${glowIntensity * 0.3}px ${glowColor})`,
        prog: 1,
      },
    ];

    const glowEffect = {
      id: `${baseId}-glow`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: (tensionDuration || 0.3) + 0.6,
        mode: 'provider',
        targetIds: [targetId],
        ranges: glowRanges,
      } as GenericEffectData,
    };

    // Collect all effects for this target
    allEffects.push(tensionEffect, snapEffect, glowEffect);
  });

  // Return effects in a container structure
  // The system will extract these effects via _internalPresetOutput: 'effects'
  return {
    output: {
      childrenData: [
        {
          id: `${effectIdPrefix}-container`,
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
              duration: (tensionDuration || 0.3) + 0.6,
            },
          },
          effects: allEffects,
          childrenData: [],
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
  id: 'magnetic-snap-effect',
  title: 'MagneticSnap Effect',
  description:
    'Internal combined effect preset that simulates magnetic attraction for precise element placement. Creates physics-based movement with tension build (scale/rotate), accelerating snap to target position, overshoot, and elastic settle. Includes synchronized glow effect that intensifies during attraction and pulses on snap completion. Returns an effects array to be applied to target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'magnetic',
    'snap',
    'physics',
    'attraction',
    'internal',
    'generic',
    'combined',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1', 'element-2'],
    targetPositions: [
      { x: 100, y: 50 },
      { x: -80, y: 120 },
    ],
    attractionStrength: 0.7,
    snapDistance: 100,
    tensionDuration: 0.3,
    magneticAxis: 'both',
  },
};

// Export preset
export const magneticSnapEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
