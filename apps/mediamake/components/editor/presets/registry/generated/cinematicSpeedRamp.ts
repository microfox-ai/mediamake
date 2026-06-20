/**
 * Cinematic Speed Ramp Internal Effect
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset creates a high-end film editing speed ramping effect with three distinct phases:
 * 1. Anticipation Phase (0-0.3 progress): Slow time stretch with subtle scale-down and slight blur
 * 2. Acceleration Phase (0.3-0.7 progress): Explosive burst with extreme blur, scale up, and dynamic rotation
 * 3. Deceleration Phase (0.7-1.0 progress): Dramatic slowdown with overshoot and settle back to normal
 *
 * This preset mimics the kinetic motion found in action sequences and high-end commercials,
 * where time manipulation creates dramatic emphasis on key moments.
 *
 * Features:
 * - Three-phase multi-property animation (blur, scale, rotate, opacity)
 * - Custom easing curves per phase for authentic film feel
 * - Configurable intensity parameters for each phase
 * - Adjustable phase timing ratios
 * - Subtle rotation during acceleration for dynamic motion
 * - Overshoot and settle mechanics in deceleration phase
 *
 * Use cases:
 * - Action sequence transitions
 * - Product reveal moments
 * - Dramatic emphasis on key content
 * - High-energy social media content
 * - Cinematic storytelling beats
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the speed ramp effect to'),
  totalDuration: z
    .number()
    .default(2000)
    .optional()
    .describe('Total duration of the entire effect in milliseconds'),
  anticipationIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe(
      'Intensity multiplier for the anticipation phase (0-2, affects scale-down and blur)',
    ),
  accelerationIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe(
      'Intensity multiplier for the acceleration phase (0-2, affects blur, scale, and rotation)',
    ),
  decelerationOvershoot: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe(
      'Overshoot amount in the deceleration phase (0-2, higher = more bounce)',
    ),
  phaseRatios: z
    .array(z.number())
    .length(3)
    .default([0.3, 0.4, 0.3])
    .optional()
    .describe(
      'Timing ratios for the three phases [anticipation, acceleration, deceleration], must sum to 1.0',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the generated effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract and validate parameters
  const totalDuration = params.totalDuration ?? 2000;
  const anticipationIntensity = params.anticipationIntensity ?? 1;
  const accelerationIntensity = params.accelerationIntensity ?? 1;
  const decelerationOvershoot = params.decelerationOvershoot ?? 1;
  const phaseRatios = params.phaseRatios ?? [0.3, 0.4, 0.3];

  // Validate phase ratios sum to 1.0 (with small tolerance for floating point)
  const ratioSum = phaseRatios.reduce((sum, ratio) => sum + ratio, 0);
  if (Math.abs(ratioSum - 1.0) > 0.01) {
    console.warn(
      `Phase ratios sum to ${ratioSum}, expected 1.0. Normalizing...`,
    );
    const normalizedRatios = phaseRatios.map((r) => r / ratioSum);
    phaseRatios[0] = normalizedRatios[0];
    phaseRatios[1] = normalizedRatios[1];
    phaseRatios[2] = normalizedRatios[2];
  }

  // Calculate phase boundaries
  const phase1End = phaseRatios[0];
  const phase2End = phase1End + phaseRatios[1];
  // phase3End is always 1.0

  // Phase 1: Anticipation - Time stretch feeling
  // Subtle scale down (0.95-0.98), slight blur (0-3px), maintain opacity
  const anticipationScaleDown = 0.95 + (1 - anticipationIntensity) * 0.03;
  const anticipationBlur = 3 * anticipationIntensity;

  // Phase 2: Acceleration - Explosive burst
  // Extreme blur (15-25px), scale up to 1.2, rotation (-5 to 5 deg), slight opacity dip
  const accelerationBlurMax = 15 + 10 * accelerationIntensity;
  const accelerationScaleMax = 1.0 + 0.2 * accelerationIntensity;
  const accelerationRotation = 5 * accelerationIntensity;

  // Phase 3: Deceleration - Overshoot and settle
  // Overshoot scale (1.05-1.15 depending on overshoot param), then settle to 1.0
  // Blur reduces back to 0, rotation returns to 0
  const decelerationOvershootScale = 1.0 + 0.05 + 0.1 * decelerationOvershoot;

  // Mid-point within acceleration for peak intensity
  const accelMidPoint = phase1End + phaseRatios[1] * 0.5;

  // Deceleration overshoot point (70% into decel phase)
  const decelOvershootPoint = phase2End + phaseRatios[2] * 0.7;

  // Construct animation ranges
  const ranges = [
    // === BLUR FILTER ===
    // Anticipation: 0 -> anticipationBlur
    { key: 'blur', val: '0px', prog: 0 },
    { key: 'blur', val: `${anticipationBlur}px`, prog: phase1End },
    // Acceleration: ramp up to max blur
    { key: 'blur', val: `${accelerationBlurMax}px`, prog: accelMidPoint },
    // Start reducing blur in late acceleration
    { key: 'blur', val: `${accelerationBlurMax * 0.5}px`, prog: phase2End },
    // Deceleration: blur reduces to 0
    { key: 'blur', val: '0px', prog: 1 },

    // === SCALE ===
    // Anticipation: scale down
    { key: 'scale', val: 1, prog: 0 },
    { key: 'scale', val: anticipationScaleDown, prog: phase1End },
    // Acceleration: explosive scale up
    { key: 'scale', val: accelerationScaleMax, prog: accelMidPoint },
    { key: 'scale', val: accelerationScaleMax * 0.95, prog: phase2End },
    // Deceleration: overshoot then settle
    { key: 'scale', val: decelerationOvershootScale, prog: decelOvershootPoint },
    { key: 'scale', val: 1, prog: 1 },

    // === ROTATION ===
    // Anticipation: no rotation
    { key: 'rotate', val: 0, prog: 0 },
    { key: 'rotate', val: 0, prog: phase1End },
    // Acceleration: rotate forward then back
    { key: 'rotate', val: accelerationRotation, prog: accelMidPoint },
    { key: 'rotate', val: -accelerationRotation * 0.3, prog: phase2End },
    // Deceleration: return to 0
    { key: 'rotate', val: 0, prog: 1 },

    // === OPACITY ===
    // Anticipation: full opacity
    { key: 'opacity', val: 1, prog: 0 },
    { key: 'opacity', val: 1, prog: phase1End },
    // Acceleration: slight dip for motion blur feel
    { key: 'opacity', val: 0.9, prog: accelMidPoint },
    { key: 'opacity', val: 0.95, prog: phase2End },
    // Deceleration: return to full
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Create effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out', // Use ease-in-out as base, individual phases create the effect
    start: 0,
    duration: totalDuration / 1000, // Convert ms to seconds
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: ranges,
  };

  // Create effect object
  const effect = {
    id: params.effectId || `cinematic-speed-ramp-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return as container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-speed-ramp-container',
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
        duration: totalDuration / 1000,
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
  id: 'cinematicSpeedRamp',
  title: 'Cinematic Speed Ramp Effect',
  description:
    'Internal effect preset that mimics high-end film editing techniques with multi-stage speed ramping: slow anticipation (time stretch), explosive acceleration (extreme blur/scale), and dramatic deceleration (overshoot and settle). Includes subtle rotation during acceleration for dynamic motion.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'cinematic', 'speed-ramp', 'action'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component'],
    totalDuration: 2000,
    anticipationIntensity: 1,
    accelerationIntensity: 1,
    decelerationOvershoot: 1,
    phaseRatios: [0.3, 0.4, 0.3],
  },
};

export const cinematicSpeedRampPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
