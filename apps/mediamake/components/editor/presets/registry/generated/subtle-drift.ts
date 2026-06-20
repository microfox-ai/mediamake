/**
 * Subtle Drift Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Applies a gentle, continuous floating motion creating a figure-8 or infinity loop pattern.
 * Uses sinusoidal translateX and translateY with optional rotation to create organic drift
 * suitable for ambient backgrounds or subtle text overlays.
 *
 * Parameters:
 * - targetId: ID of the component to apply drift motion
 * - effectStart: Start time of the effect (relative to parent)
 * - effectDuration: Duration of the effect (calculated as speed * 4000ms)
 * - driftRadius: How far elements move from origin (in pixels, default 20)
 * - speed: Speed multiplier for drift motion (default 1, higher = slower)
 * - includeRotation: Whether to include slight rotation during drift (default false)
 * - rotationAmount: Amount of rotation in degrees (default 5)
 *
 * The effect creates a figure-8 motion pattern using:
 * - translateX: sin wave pattern (horizontal movement)
 * - translateY: cos wave pattern with phase offset (vertical movement)
 * - rotate: optional sinusoidal rotation
 *
 * The animation loops seamlessly with 5 keyframes at prog: 0, 0.25, 0.5, 0.75, 1.0
 * creating a complete figure-8 cycle.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target with drift motion'),
  effectStart: z.number().describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  driftRadius: z.number().default(20).optional().describe('How far elements move from origin in pixels (default 20)'),
  speed: z.number().default(1).optional().describe('Speed multiplier - higher values create slower drift (default 1)'),
  includeRotation: z.boolean().default(false).optional().describe('Whether to include slight rotation during drift (default false)'),
  rotationAmount: z.number().default(5).optional().describe('Amount of rotation in degrees when includeRotation is true (default 5)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const driftRadius = params.driftRadius ?? 20;
  const speed = params.speed ?? 1;
  const includeRotation = params.includeRotation ?? false;
  const rotationAmount = params.rotationAmount ?? 5;

  // Calculate duration based on speed (base 4 seconds)
  const duration = speed * 4;

  // Create figure-8 motion using sinusoidal patterns
  // translateX follows sin wave: sin(θ) creates horizontal oscillation
  // translateY follows cos wave with phase offset: creates vertical oscillation
  // Combined, they create infinity loop / figure-8 pattern

  const ranges: Array<{ key: string; val: any; prog: number }> = [
    // prog: 0 (start position)
    { key: 'translateX', val: 0, prog: 0 },
    { key: 'translateY', val: driftRadius, prog: 0 },
    
    // prog: 0.25 (quarter cycle - right side)
    { key: 'translateX', val: driftRadius, prog: 0.25 },
    { key: 'translateY', val: 0, prog: 0.25 },
    
    // prog: 0.5 (half cycle - bottom)
    { key: 'translateX', val: 0, prog: 0.5 },
    { key: 'translateY', val: -driftRadius, prog: 0.5 },
    
    // prog: 0.75 (three quarter cycle - left side)
    { key: 'translateX', val: -driftRadius, prog: 0.75 },
    { key: 'translateY', val: 0, prog: 0.75 },
    
    // prog: 1.0 (complete cycle - back to start)
    { key: 'translateX', val: 0, prog: 1.0 },
    { key: 'translateY', val: driftRadius, prog: 1.0 },
  ];

  // Add optional rotation ranges
  if (includeRotation) {
    ranges.push(
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: rotationAmount, prog: 0.25 },
      { key: 'rotate', val: 0, prog: 0.5 },
      { key: 'rotate', val: -rotationAmount, prog: 0.75 },
      { key: 'rotate', val: 0, prog: 1.0 },
    );
  }

  // Construct generic effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for smooth continuous motion
    start: params.effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: ranges,
    loop: true, // Loop seamlessly
  };

  // Create effect node
  const effect = {
    id: params.effectId || `subtle-drift-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'subtle-drift-effect-container',
          type: 'layout' as const,
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
  id: 'subtleDrift',
  title: 'Subtle Drift Effect',
  description: 'Internal effect preset that applies a gentle, continuous floating motion creating a figure-8/infinity loop pattern. Uses sinusoidal translateX and translateY with optional rotation to create organic drift suitable for ambient backgrounds or subtle text overlays.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'drift', 'float', 'subtle', 'motion', 'figure-8', 'infinity', 'loop', 'ambient', 'internal', 'generic'],
  dependencies: {},
  // REQUIRED: Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 4,
    driftRadius: 20,
    speed: 1,
    includeRotation: false,
    rotationAmount: 5,
  },
};

// Export preset
export const subtleDriftPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
