/**
 * ImpactTremor Internal Effect Preset
 *
 * ARRAY OF EFFECTS (can return multiple overlapping tremor effects)
 *
 * Simulates realistic shaking caused by nearby impacts, explosions, or heavy footsteps.
 * Creates directional physics-based displacement with initial sharp movement followed by
 * exponentially decaying oscillations. Supports multiple impact events with overlapping tremors.
 *
 * Features:
 * - Directional shaking emanating from source point with configurable direction (0-360°)
 * - Physics-based animation: sharp initial displacement → dampened oscillations
 * - Two-layer movement system: primary shake (low frequency) + debris rattle (high frequency)
 * - Three shake modes: groundShake (vertical bias), shockwave (radial), omnidirectional
 * - Multiple impact handling with independent time offsets and force values
 * - Exponential decay with configurable decay rate
 * - Force-based displacement scaling (max 30px * force at peak)
 *
 * Use cases:
 * - Action sequences with explosions or heavy impacts
 * - Earthquake or tremor effects in dramatic scenes
 * - Footsteps from large creatures or mechs
 * - Shockwave effects radiating from a point
 * - Layered impact effects with multiple overlapping tremors
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  impactForce: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Impact force intensity from 0 (weak) to 1 (maximum)'),

  direction: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe('Direction of impact in degrees (0 = right, 90 = down, 180 = left, 270 = up)'),

  shakeMode: z
    .enum(['groundShake', 'shockwave', 'omnidirectional'])
    .default('omnidirectional')
    .describe(
      'Shake mode: groundShake (vertical bias), shockwave (radial outward), omnidirectional (all directions)',
    ),

  debrisRattle: z
    .boolean()
    .default(true)
    .describe('Enable high-frequency debris rattle layer on top of primary shake'),

  multipleImpacts: z
    .array(
      z.object({
        time: z
          .number()
          .min(0)
          .describe('Time offset in seconds when this impact occurs'),
        force: z
          .number()
          .min(0)
          .max(1)
          .describe('Force intensity for this specific impact (0-1)'),
        direction: z
          .number()
          .min(0)
          .max(360)
          .optional()
          .describe('Optional direction override for this impact (degrees)'),
      }),
    )
    .optional()
    .describe('Array of multiple impact events with independent timing and force'),

  decayRate: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.5)
    .describe('Speed of oscillation decay - higher values = faster decay'),

  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the tremor effect to'),

  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix for generated effects'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Calculate directional vector from angle
  const getDirectionalVector = (angleDeg: number, magnitude: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: Math.cos(angleRad) * magnitude,
      y: Math.sin(angleRad) * magnitude,
    };
  };

  // Helper: Apply shake mode bias to directional vector
  const applyShakeModeBias = (
    vector: { x: number; y: number },
    mode: string,
  ) => {
    switch (mode) {
      case 'groundShake':
        // Vertical bias (primarily Y-axis movement)
        return {
          x: vector.x * 0.3,
          y: vector.y * 1.5 + Math.abs(vector.x) * 0.5,
        };
      case 'shockwave':
        // Radial outward (preserve direction, emphasize magnitude)
        return {
          x: vector.x * 1.2,
          y: vector.y * 1.2,
        };
      case 'omnidirectional':
      default:
        // Equal all directions
        return vector;
    }
  };

  // Helper: Generate primary shake keyframes with exponential decay
  const generatePrimaryShake = (
    force: number,
    direction: number,
    mode: string,
    decayRate: number,
    startTime: number,
    duration: number,
  ): GenericEffectData['ranges'] => {
    const maxDisplacement = force * 30; // Max 30px at full force
    const numKeyframes = 7; // Sharp initial + 5 oscillations + settle
    const ranges: GenericEffectData['ranges'] = [];

    // Calculate directional vector
    const dirVector = getDirectionalVector(direction, maxDisplacement);
    const biasedVector = applyShakeModeBias(dirVector, mode);

    // Initial sharp displacement (prog: 0 → 0.05)
    ranges.push(
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateX', val: biasedVector.x, prog: 0.05 },
      { key: 'translateY', val: biasedVector.y, prog: 0.05 },
    );

    // Damped oscillations (prog: 0.05 → 1.0)
    for (let i = 1; i <= 5; i++) {
      const progress = 0.05 + i * 0.19; // Spread oscillations from 0.05 to 1.0
      const decay = Math.exp(-decayRate * (progress - 0.05));
      const oscillation = Math.pow(-1, i) * decay; // Alternating direction

      ranges.push(
        {
          key: 'translateX',
          val: biasedVector.x * oscillation,
          prog: progress,
        },
        {
          key: 'translateY',
          val: biasedVector.y * oscillation,
          prog: progress,
        },
      );
    }

    // Final settle to 0
    ranges.push(
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 1 },
    );

    return ranges;
  };

  // Helper: Generate debris rattle keyframes (high frequency micro-movements)
  const generateDebrisRattle = (
    force: number,
    startTime: number,
    duration: number,
  ): GenericEffectData['ranges'] => {
    const rattleIntensity = force * 3; // Max 3px micro-movements
    const numMicroKeyframes = 24; // High frequency micro-shakes
    const ranges: GenericEffectData['ranges'] = [];

    for (let i = 0; i <= numMicroKeyframes; i++) {
      const progress = i / numMicroKeyframes;
      const decay = Math.exp(-4 * progress); // Faster decay for rattle

      // Random micro-displacement with decay
      const randomX =
        (Math.random() - 0.5) * 2 * rattleIntensity * decay * 0.5;
      const randomY = (Math.random() - 0.5) * 2 * rattleIntensity * decay;

      ranges.push(
        { key: 'translateX', val: randomX, prog: progress },
        { key: 'translateY', val: randomY, prog: progress },
      );
    }

    return ranges;
  };

  // Build impact events array
  const impacts =
    params.multipleImpacts && params.multipleImpacts.length > 0
      ? params.multipleImpacts
      : [
          {
            time: 0,
            force: params.impactForce,
            direction: params.direction,
          },
        ];

  // Calculate maximum duration needed for all impacts
  const impactDuration = 1.5; // Each impact lasts ~1.5 seconds based on decay
  const maxImpactTime = Math.max(...impacts.map((imp) => imp.time));
  const totalDuration = maxImpactTime + impactDuration;

  // Generate effects for each target component
  const allEffects: any[] = [];

  params.targetIds.forEach((targetId, targetIndex) => {
    // Generate primary shake effects for each impact
    impacts.forEach((impact, impactIndex) => {
      const impactDirection = impact.direction ?? params.direction;
      const effectIdBase =
        params.effectId || `impact-tremor-${targetId}-${impactIndex}`;

      // Primary shake effect
      const primaryShakeRanges = generatePrimaryShake(
        impact.force,
        impactDirection,
        params.shakeMode,
        params.decayRate,
        impact.time,
        impactDuration,
      );

      const primaryShakeEffect = {
        id: `${effectIdBase}-primary`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: impact.time,
          duration: impactDuration,
          mode: 'provider' as const,
          targetIds: [targetId],
          ranges: primaryShakeRanges,
        } as GenericEffectData,
      };

      allEffects.push(primaryShakeEffect);

      // Debris rattle layer (if enabled)
      if (params.debrisRattle) {
        const rattleRanges = generateDebrisRattle(
          impact.force,
          impact.time,
          impactDuration * 0.8, // Rattle fades faster
        );

        const rattleEffect = {
          id: `${effectIdBase}-rattle`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: impact.time + 0.05, // Start slightly after initial impact
            duration: impactDuration * 0.8,
            mode: 'provider' as const,
            targetIds: [targetId],
            ranges: rattleRanges,
          } as GenericEffectData,
        };

        allEffects.push(rattleEffect);
      }
    });
  });

  // Create container with all effects
  const rootContainer: RenderableComponentData = {
    id: `impact-tremor-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      description:
        'ImpactTremor effect container - applies physics-based shaking to target components',
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
        duration: totalDuration,
      },
    },
    effects: allEffects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      // For internal preset extraction
      _extractedEffects: allEffects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'ImpactTremor',
  title: 'ImpactTremor Effect',
  description:
    'Internal effect preset simulating realistic shaking from impacts, explosions, or heavy footsteps with directional physics-based displacement, dampened oscillations, and layered frequency components (primary shake + debris rattle)',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'generic',
    'impact',
    'tremor',
    'shake',
    'physics',
    'explosion',
    'earthquake',
    'directional',
    'multi-layer',
  ],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    impactForce: 0.7,
    direction: 0,
    shakeMode: 'omnidirectional' as const,
    debrisRattle: true,
    decayRate: 2.5,
    targetIds: ['target-component-id'],
    multipleImpacts: [
      { time: 0, force: 0.8, direction: 45 },
      { time: 1.5, force: 0.5, direction: 225 },
    ],
  },
};

// --- Export ---

export const ImpactTremorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
