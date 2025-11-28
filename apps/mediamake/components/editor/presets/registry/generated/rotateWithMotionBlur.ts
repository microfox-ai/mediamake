/**
 * Rotate With Motion Blur Effect
 *
 * ARRAY OF EFFECTS
 *
 * This internal effect preset simulates cinematic motion blur during rotation by combining
 * rotation animation with strategic blur and opacity effects. It creates the illusion of
 * motion blur by duplicating the rotation with slight offsets and varying opacities,
 * similar to video editing motion blur techniques.
 *
 * Features:
 * - **Motion Blur Simulation**: Creates ghost frames with staggered timings
 * - **Velocity-Based Blur**: Blur intensity calculated from rotation velocity
 * - **Configurable Samples**: Control number of blur samples (2-5 ghost frames)
 * - **Velocity Curves**: Linear or ease-in-out rotation curves
 * - **Cinematic Quality**: More realistic rotation compared to simple linear rotation
 *
 * Use cases:
 * - Creating cinematic rotation effects with realistic motion blur
 * - Adding professional-quality rotation animations to images and text
 * - Building dynamic spinning transitions with natural blur
 * - Enhancing visual interest with realistic motion blur effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply rotation blur to'),
  rotationDegrees: z
    .number()
    .describe('Total rotation amount in degrees (positive = clockwise, negative = counter-clockwise)'),
  duration: z.number().describe('Duration of the rotation effect in seconds'),
  blurSamples: z
    .number()
    .min(2)
    .max(5)
    .default(3)
    .optional()
    .describe('Number of blur samples (ghost frames) to create (2-5, default: 3)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe('Blur intensity multiplier (0-2, default: 1)'),
  velocityCurve: z
    .enum(['linear', 'ease-in-out'])
    .default('ease-in-out')
    .optional()
    .describe('Velocity curve for rotation (linear or ease-in-out)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect relative to parent (seconds)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate blur amount based on rotation velocity
  const calculateBlurAtProgress = (
    progress: number,
    totalRotation: number,
    duration: number,
    curve: 'linear' | 'ease-in-out',
    intensityMultiplier: number,
  ): number => {
    // Calculate instantaneous velocity at this progress point
    let velocity = 0;

    if (curve === 'linear') {
      // Constant velocity
      velocity = Math.abs(totalRotation) / duration;
    } else {
      // ease-in-out: velocity peaks at 0.5 progress
      // Derivative of ease-in-out curve: 3 * (1 - 2t) at t
      const t = progress;
      const velocityFactor = Math.abs(3 * (1 - 2 * t));
      velocity = (Math.abs(totalRotation) / duration) * velocityFactor;
    }

    // Convert velocity to blur amount (pixels)
    // Higher rotation speed = more blur
    // Base formula: blur = velocity * intensity * 0.05 (scaling factor)
    const baseBlur = velocity * intensityMultiplier * 0.05;

    // Clamp blur between 0 and 20px
    return Math.max(0, Math.min(20, baseBlur));
  };

  // Extract parameters
  const {
    targetId,
    rotationDegrees,
    duration,
    blurSamples = 3,
    blurIntensity = 1,
    velocityCurve = 'ease-in-out',
    effectStart = 0,
    effectId,
  } = params;

  const effects = [];

  // Main rotation effect with blur that follows rotation velocity
  const mainRotationEffect: GenericEffectData = {
    type: velocityCurve === 'linear' ? 'linear' : 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      // Rotation keyframes
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: rotationDegrees, prog: 1 },
      // Blur keyframes based on velocity curve
      {
        key: 'filter',
        val: `blur(${calculateBlurAtProgress(0, rotationDegrees, duration, velocityCurve, blurIntensity)}px)`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `blur(${calculateBlurAtProgress(0.25, rotationDegrees, duration, velocityCurve, blurIntensity)}px)`,
        prog: 0.25,
      },
      {
        key: 'filter',
        val: `blur(${calculateBlurAtProgress(0.5, rotationDegrees, duration, velocityCurve, blurIntensity)}px)`,
        prog: 0.5,
      },
      {
        key: 'filter',
        val: `blur(${calculateBlurAtProgress(0.75, rotationDegrees, duration, velocityCurve, blurIntensity)}px)`,
        prog: 0.75,
      },
      {
        key: 'filter',
        val: `blur(${calculateBlurAtProgress(1, rotationDegrees, duration, velocityCurve, blurIntensity)}px)`,
        prog: 1,
      },
    ],
  };

  effects.push({
    id: effectId ? `${effectId}-main-rotation` : `rotate-blur-main-${targetId}`,
    componentId: 'generic',
    data: mainRotationEffect,
  });

  // Create ghost frame effects for motion blur simulation
  // Each ghost is slightly behind the main rotation with decreasing opacity
  const opacityStep = 1 / (blurSamples + 1);
  const timeOffsetStep = duration / (blurSamples * 8); // Small time offset between ghosts

  for (let i = 0; i < blurSamples; i++) {
    const ghostOpacity = 1 - (i + 1) * opacityStep;
    const ghostTimeOffset = (i + 1) * timeOffsetStep;
    const ghostRotationLag = (rotationDegrees * (i + 1)) / (blurSamples * 2); // Rotation lag

    const ghostEffect: GenericEffectData = {
      type: velocityCurve === 'linear' ? 'linear' : 'ease-in-out',
      start: effectStart + ghostTimeOffset,
      duration: duration - ghostTimeOffset,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Ghost rotation lags behind main rotation
        { key: 'rotate', val: -ghostRotationLag, prog: 0 },
        { key: 'rotate', val: rotationDegrees - ghostRotationLag, prog: 1 },
        // Ghost opacity decreases with each sample
        { key: 'opacity', val: ghostOpacity, prog: 0 },
        { key: 'opacity', val: ghostOpacity * 0.5, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
        // Ghost blur follows velocity curve (slightly more blur than main)
        {
          key: 'filter',
          val: `blur(${calculateBlurAtProgress(0, rotationDegrees, duration, velocityCurve, blurIntensity) * 1.2}px)`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `blur(${calculateBlurAtProgress(0.5, rotationDegrees, duration, velocityCurve, blurIntensity) * 1.2}px)`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: `blur(${calculateBlurAtProgress(1, rotationDegrees, duration, velocityCurve, blurIntensity) * 1.2}px)`,
          prog: 1,
        },
      ],
    };

    effects.push({
      id: effectId
        ? `${effectId}-ghost-${i + 1}`
        : `rotate-blur-ghost-${i + 1}-${targetId}`,
      componentId: 'generic',
      data: ghostEffect,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'rotate-blur-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: duration + effectStart,
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
  id: 'rotateWithMotionBlur',
  title: 'Rotate With Motion Blur Effect',
  description:
    'Internal effect preset that simulates motion blur during rotation by combining rotation animation with strategic blur and opacity effects. Creates cinematic rotation by generating multiple ghost frame effects with staggered timings, decreasing opacities, and velocity-based blur amounts.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'rotation', 'motion-blur', 'internal', 'generic', 'cinematic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    rotationDegrees: 360,
    duration: 2,
    blurSamples: 3,
    blurIntensity: 1,
    velocityCurve: 'ease-in-out',
    effectStart: 0,
  },
};

export const rotateWithMotionBlurPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
