/**
 * Elastic Pop Animation Effect (Internal)
 *
 * SINGLE EFFECT:
 * Creates a bouncy, elastic scale animation inspired by cartoon physics.
 * Animation sequence:
 * 1. Start at rest (scale 1.0)
 * 2. Compress slightly (scale 0.92 by default)
 * 3. Overshoot target (scale 1.12 by default)
 * 4. Oscillate with decreasing amplitude
 * 5. Settle back at rest (scale 1.0)
 *
 * Features:
 * - Configurable tension, friction, and overshoot parameters
 * - Optional rotation for playful motion
 * - Elastic overshoot with damped oscillation
 * - Adds personality and exaggerated motion to elements
 *
 * Use cases:
 * - Button press animations with bounce-back
 * - Attention-grabbing entrance effects
 * - Playful UI element interactions
 * - Cartoon-style pop-in animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  tension: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe(
      'Tension parameter controlling elasticity (0 = soft, 1 = stiff)',
    ),
  friction: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Friction parameter controlling damping (0 = no damping, 1 = heavy damping)',
    ),
  overshoot: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.12)
    .describe(
      'Overshoot amount (how much scale exceeds 1.0 at peak, default 0.12 = 112% scale)',
    ),
  withRotation: z
    .boolean()
    .default(false)
    .describe('Enable rotation for additional playful motion'),
  maxRotation: z
    .number()
    .min(0)
    .max(45)
    .default(5)
    .describe('Maximum rotation in degrees when withRotation is enabled'),
  duration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Duration of the elastic pop animation in seconds'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to target with the effect'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent component'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    tension,
    friction,
    overshoot,
    withRotation,
    maxRotation,
    duration,
    targetIds,
    effectStart,
    effectId,
  } = params;

  // Calculate compression based on tension and friction
  // Lower tension = more compression, higher friction = less compression
  const compressionAmount = overshoot * 0.75 * (1 - tension * 0.3);

  // Calculate oscillation amplitudes with damping based on friction
  const dampingFactor = 1 - friction;
  const secondOscillation = overshoot * 0.3 * dampingFactor;
  const thirdOscillation = overshoot * 0.15 * dampingFactor * dampingFactor;

  // Build scale animation ranges with elastic physics
  const scaleRanges = [
    { key: 'scale', val: 1, prog: 0 }, // Start at rest
    { key: 'scale', val: 1 - compressionAmount, prog: 0.15 }, // Compress
    { key: 'scale', val: 1 + overshoot, prog: 0.35 }, // Overshoot peak
    { key: 'scale', val: 1 - secondOscillation, prog: 0.55 }, // First bounce
    { key: 'scale', val: 1 + thirdOscillation, prog: 0.75 }, // Second bounce
    { key: 'scale', val: 1, prog: 1 }, // Settle at rest
  ];

  // Build rotation ranges if enabled
  const rotationRanges = withRotation
    ? [
        { key: 'rotate', val: 0, prog: 0 }, // Start
        { key: 'rotate', val: -maxRotation * 0.6, prog: 0.15 }, // Counter-rotate on compress
        { key: 'rotate', val: maxRotation, prog: 0.35 }, // Rotate on overshoot
        { key: 'rotate', val: -maxRotation * 0.4, prog: 0.55 }, // Counter bounce
        { key: 'rotate', val: maxRotation * 0.2, prog: 0.75 }, // Small bounce
        { key: 'rotate', val: 0, prog: 1 }, // Settle
      ]
    : [];

  // Combine scale and rotation ranges
  const animationRanges = [...scaleRanges, ...rotationRanges];

  // Construct effect data with elastic easing
  const effectData: GenericEffectData = {
    type: 'ease-out', // Ease-out provides smooth deceleration for elastic feel
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: animationRanges,
  };

  // Create effect node
  const effect = {
    id: effectId || `elastic-pop-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'elastic-pop-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    effects: [effect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
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

const presetMetadata: PresetMetadata = {
  id: 'elastic-pop',
  title: 'Elastic Pop Animation Effect',
  description:
    'Internal effect preset that creates a bouncy, elastic scale animation with cartoon-style physics. Features compression, overshoot, oscillation with decreasing amplitude, and optional rotation for playful motion with configurable tension and friction parameters.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'elastic', 'bounce', 'pop', 'animation', 'cartoon'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    tension: 0.8,
    friction: 0.3,
    overshoot: 0.12,
    withRotation: false,
    maxRotation: 5,
    duration: 0.8,
    targetIds: ['target-component'],
    effectStart: 0,
  },
};

export const elasticPopPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
