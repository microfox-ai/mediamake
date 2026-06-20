/**
 * Gentle Float Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Combines subtle scale oscillation (0.98-1.02) with slight Y-axis translation (-2px to 2px)
 * in an offset sine pattern to create a floating effect. Includes optional rotation sway
 * for ambient motion in backgrounds or idle states.
 *
 * This is an internal effect preset that generates effect data only, not visual components.
 * Perfect for creating ambient motion that keeps scenes alive without distraction.
 *
 * Features:
 * - Scale oscillation between 0.98-1.02
 * - Y-axis translation between -2px to 2px with phase offset
 * - Optional rotation sway (-1° to 1°)
 * - Configurable float speed and amplitudes
 * - Smooth sine wave motion using linear easing between keyframes
 * - Loop-enabled for continuous animation
 *
 * Technical Details:
 * - Uses 16 keyframes to approximate smooth sine wave motion
 * - Scale and translateY are phase-offset by 0.25 (90 degrees)
 * - Rotation sway uses a separate sine pattern
 * - All animations use linear easing with dense keyframes for smoothness
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  floatSpeed: z
    .number()
    .min(0.5)
    .max(20)
    .default(4)
    .describe('Duration of one float cycle in seconds'),
  scaleAmplitude: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.02)
    .describe('Scale variation amplitude (±0.02 = 0.98-1.02)'),
  translateAmplitude: z
    .number()
    .min(1)
    .max(20)
    .default(2)
    .describe('Vertical translation amplitude in pixels (±2px)'),
  withSway: z
    .boolean()
    .default(false)
    .describe('Whether to include slight rotation sway'),
  swayAmount: z
    .number()
    .min(0.5)
    .max(10)
    .default(1)
    .describe('Rotation sway amplitude in degrees (±1°)'),
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(4)
    .describe('Total duration of the effect in seconds'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to target with this effect'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    floatSpeed,
    scaleAmplitude,
    translateAmplitude,
    withSway,
    swayAmount,
    duration,
    targetIds,
    effectId,
    effectStart,
  } = params;

  // Generate keyframes with offset sine waves
  // 16 keyframes for smooth approximation
  const numKeyframes = 16;
  const ranges: Array<{ key: string; val: number; prog: number }> = [];

  // Generate scale and translateY keyframes
  for (let i = 0; i < numKeyframes; i++) {
    const prog = i / (numKeyframes - 1);

    // Scale: 1 ± scaleAmplitude * sin(prog * 2π)
    const scaleVal = 1 + scaleAmplitude * Math.sin(prog * Math.PI * 2);

    // TranslateY: translateAmplitude * sin((prog + 0.25) * 2π)
    // 0.25 offset creates 90-degree phase shift
    const translateVal =
      translateAmplitude * Math.sin((prog + 0.25) * Math.PI * 2);

    ranges.push(
      { key: 'scale', val: scaleVal, prog },
      { key: 'translateY', val: translateVal, prog },
    );
  }

  // Add rotation sway if enabled
  if (withSway) {
    for (let i = 0; i < numKeyframes; i++) {
      const prog = i / (numKeyframes - 1);
      // Rotation: swayAmount * sin(prog * 2π)
      const rotateVal = swayAmount * Math.sin(prog * Math.PI * 2);
      ranges.push({ key: 'rotate', val: rotateVal, prog });
    }
  }

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear easing between keyframes for smooth sine wave
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
    loop: true, // Enable looping for continuous animation
  };

  // Create effect object
  const effect = {
    id: effectId || `gentle-float-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure
  // The system will extract this effect automatically
  const container: RenderableComponentData = {
    id: 'gentle-float-effect-container',
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
        duration: duration,
      },
    },
    effects: [effect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
      _extractedEffects: [effect], // Provide direct access to the effect
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'gentle-float',
  title: 'Gentle Float Effect',
  description:
    'Internal effect preset that combines subtle scale oscillation (0.98-1.02) with slight Y-axis translation (-2px to 2px) in an offset sine pattern to create a floating effect. Includes optional rotation sway for ambient motion in backgrounds or idle states.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'float', 'subtle', 'ambient', 'motion'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    floatSpeed: 4,
    scaleAmplitude: 0.02,
    translateAmplitude: 2,
    withSway: false,
    swayAmount: 1,
    duration: 4,
    targetIds: ['target-component'],
    effectStart: 0,
  },
};

export const gentleFloatPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
