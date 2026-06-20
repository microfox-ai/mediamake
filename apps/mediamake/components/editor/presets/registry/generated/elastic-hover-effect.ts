/**
 * Elastic Hover Effect Preset
 *
 * SINGLE EFFECT
 *
 * An internal effect preset that creates spring-based elastic hovering motion.
 * Elements appear suspended by invisible elastic bands, drifting away from their
 * origin point with momentum, then snapping back with physics-based spring easing.
 *
 * Features:
 * - Spring-based physics for realistic elastic motion
 * - Configurable elastic strength (snapback speed)
 * - Adjustable drift distance
 * - Optional tilting during stretch phase
 * - Continuous mode (constant hovering) or triggered mode (one-time snap)
 * - Overshoot effect for realistic spring behavior
 *
 * Movement pattern:
 * rest (prog 0) → drift out (prog 0.3, ease-out) → snap back (prog 0.5, spring)
 * → overshoot (prog 0.7) → settle to rest (prog 1.0)
 *
 * Use cases:
 * - Playful floating elements
 * - Interactive hover states
 * - Bouncy logo animations
 * - Suspended UI components
 * - Physics-based motion effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfx/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the elastic hover effect to'),
  effectStart: z.number().describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().describe('Total duration of the effect in seconds'),
  elasticity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Elastic strength - how quickly elements snap back (0.1 = slow, 1 = fast)'),
  driftDistance: z
    .number()
    .min(10)
    .max(200)
    .default(50)
    .describe('Maximum drift distance from origin in pixels'),
  includeTilt: z
    .boolean()
    .default(true)
    .describe('Whether to include tilting/rotation during the stretch phase'),
  continuous: z
    .boolean()
    .default(false)
    .describe('Continuous mode (constant elastic hovering with loop) or triggered mode (one-time elastic snap)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the elastic hover effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    targetId,
    effectStart,
    effectDuration,
    elasticity = 0.5,
    driftDistance = 50,
    includeTilt = true,
    continuous = false,
    effectId,
  } = params;

  // Calculate duration based on elasticity
  // Lower elasticity = slower snapback = longer duration multiplier
  const baseDuration = 2000; // Base duration in ms
  const calculatedDuration = (baseDuration / elasticity) / 1000; // Convert to seconds
  const finalDuration = effectDuration || calculatedDuration;

  // Calculate overshoot distance
  const overshootDistance = driftDistance * 0.2;

  // Generate random drift direction for natural feel
  const driftAngle = Math.random() * 360;
  const driftX = Math.cos((driftAngle * Math.PI) / 180) * driftDistance;
  const driftY = Math.sin((driftAngle * Math.PI) / 180) * driftDistance;
  
  // Overshoot in opposite direction
  const overshootX = -Math.cos((driftAngle * Math.PI) / 180) * overshootDistance;
  const overshootY = -Math.sin((driftAngle * Math.PI) / 180) * overshootDistance;

  // Tilt angle during stretch (opposite to drift direction)
  const tiltAngle = includeTilt ? ((driftAngle + 180) % 360) - 180 : 0;
  const maxTilt = includeTilt ? 5 : 0; // Max 5 degrees tilt

  // Build animation ranges
  const ranges: Array<{ key: string; val: any; prog: number }> = [
    // Rest position (start)
    { key: 'translateX', val: 0, prog: 0 },
    { key: 'translateY', val: 0, prog: 0 },
    { key: 'rotate', val: 0, prog: 0 },
    
    // Drift out (ease-out momentum)
    { key: 'translateX', val: driftX, prog: 0.3 },
    { key: 'translateY', val: driftY, prog: 0.3 },
    { key: 'rotate', val: maxTilt, prog: 0.3 },
    
    // Snap back past center (spring effect)
    { key: 'translateX', val: overshootX, prog: 0.5 },
    { key: 'translateY', val: overshootY, prog: 0.5 },
    { key: 'rotate', val: -maxTilt * 0.5, prog: 0.5 },
    
    // Overshoot correction
    { key: 'translateX', val: overshootX * 0.3, prog: 0.7 },
    { key: 'translateY', val: overshootY * 0.3, prog: 0.7 },
    { key: 'rotate', val: maxTilt * 0.2, prog: 0.7 },
    
    // Settle to rest
    { key: 'translateX', val: 0, prog: 1.0 },
    { key: 'translateY', val: 0, prog: 1.0 },
    { key: 'rotate', val: 0, prog: 1.0 },
  ];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'spring', // Spring easing for realistic physics
    start: effectStart,
    duration: finalDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges,
    loop: continuous, // Enable looping for continuous mode
  };

  // Create effect object
  const effect = {
    id: effectId || `elastic-hover-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in container structure
  const rootContainer: RenderableComponentData = {
    id: 'elastic-hover-effect-container',
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

const presetMetadata: PresetMetadata = {
  id: 'elastic-hover-effect',
  title: 'Elastic Hover Effect',
  description:
    'An internal effect preset that creates spring-based elastic hovering motion. Elements appear suspended by invisible elastic bands, drifting away from origin with momentum then snapping back with physics-based spring easing. Supports configurable elasticity strength, drift distance, optional tilt during stretch, and continuous/triggered modes.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'elastic', 'spring', 'hover', 'physics', 'bouncy', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 4,
    elasticity: 0.5,
    driftDistance: 50,
    includeTilt: true,
    continuous: false,
  },
};

export const elasticHoverEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
