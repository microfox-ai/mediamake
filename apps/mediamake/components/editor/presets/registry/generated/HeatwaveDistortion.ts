/**
 * Heatwave Distortion Effect Preset
 *
 * ARRAY OF EFFECTS
 * This internal effect preset simulates atmospheric heat distortion through multi-layered
 * transform animations with sine-wave oscillations, horizontal waviness, and pulsing blur effects.
 *
 * Features:
 * - Multi-layered sine-wave vertical oscillation (translateY)
 * - Horizontal waviness through subtle scaleX distortion
 * - Pulsing blur effects simulating focus shift through heated air
 * - Configurable intensity, speed, blur amount, and wave frequency
 * - Spring easing for organic, natural motion
 * - 8+ keyframes creating smooth sine-wave patterns
 *
 * Technical Details:
 * - Returns array of 3 synchronized generic effects (translateY, scaleX, filter)
 * - Uses AnimationRange with prog values distributed across 0-1
 * - All effects target the same component via targetIds
 * - Timing is relative to target component's timeline
 *
 * Use cases:
 * - Creating atmospheric heat distortion effects
 * - Simulating hot surface mirages
 * - Adding organic motion to static elements
 * - Creating environmental weather effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the heatwave distortion effect to'),
  intensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Distortion intensity (0-1, controls amplitude of wave motion)'),
  speed: z
    .number()
    .default(2000)
    .optional()
    .describe('Animation duration in milliseconds for one complete oscillation cycle'),
  blurAmount: z
    .number()
    .default(3)
    .optional()
    .describe('Maximum blur amount in pixels (0-10px recommended)'),
  waveFrequency: z
    .number()
    .default(3)
    .optional()
    .describe('Number of oscillations in the wave pattern (affects keyframe distribution)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect relative to target component timeline'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix for the generated effects'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const intensity = params.intensity ?? 0.5;
  const speed = params.speed ?? 2000;
  const blurAmount = params.blurAmount ?? 3;
  const waveFrequency = params.waveFrequency ?? 3;
  const effectStart = params.effectStart ?? 0;
  const targetIds = params.targetIds;
  const effectIdPrefix = params.effectId || `heatwave-distortion`;

  // Convert speed from milliseconds to seconds
  const durationInSeconds = speed / 1000;

  // Calculate amplitude based on intensity
  const translateYAmplitude = intensity * 20; // Max 20px vertical movement
  const scaleXMin = 0.98;
  const scaleXMax = 1.02;

  // Helper function to generate sine wave keyframes
  const generateSineWaveKeyframes = (
    key: string,
    amplitude: number,
    offset: number = 0,
    numKeyframes: number = 9,
  ) => {
    const keyframes = [];
    for (let i = 0; i < numKeyframes; i++) {
      const prog = i / (numKeyframes - 1); // 0 to 1
      const angle = prog * Math.PI * 2 * waveFrequency; // Multiple oscillations
      const sineValue = Math.sin(angle + offset);
      const val = sineValue * amplitude;
      keyframes.push({ key, val, prog });
    }
    return keyframes;
  };

  // Helper function to generate scale oscillation keyframes
  const generateScaleKeyframes = (numKeyframes: number = 9) => {
    const keyframes = [];
    for (let i = 0; i < numKeyframes; i++) {
      const prog = i / (numKeyframes - 1);
      const angle = prog * Math.PI * 2 * waveFrequency + Math.PI / 4; // Offset by 45 degrees
      const sineValue = Math.sin(angle);
      // Map sine (-1 to 1) to scaleX range (0.98 to 1.02)
      const val = scaleXMin + ((sineValue + 1) / 2) * (scaleXMax - scaleXMin);
      keyframes.push({ key: 'scaleX', val, prog });
    }
    return keyframes;
  };

  // Helper function to generate blur pulse keyframes
  const generateBlurKeyframes = (numKeyframes: number = 9) => {
    const keyframes = [];
    for (let i = 0; i < numKeyframes; i++) {
      const prog = i / (numKeyframes - 1);
      const angle = prog * Math.PI * 2 * waveFrequency - Math.PI / 3; // Different phase offset
      const sineValue = Math.sin(angle);
      // Map sine (-1 to 1) to blur range (0 to blurAmount)
      const blurValue = ((sineValue + 1) / 2) * blurAmount;
      const val = `blur(${blurValue.toFixed(2)}px)`;
      keyframes.push({ key: 'filter', val, prog });
    }
    return keyframes;
  };

  // Generate keyframes for each effect layer
  const translateYKeyframes = generateSineWaveKeyframes('translateY', translateYAmplitude, 0, 9);
  const scaleXKeyframes = generateScaleKeyframes(9);
  const blurKeyframes = generateBlurKeyframes(9);

  // Construct effect data for translateY (vertical oscillation)
  const translateYEffect: GenericEffectData = {
    type: 'spring',
    start: effectStart,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: translateYKeyframes,
  };

  // Construct effect data for scaleX (horizontal waviness)
  const scaleXEffect: GenericEffectData = {
    type: 'spring',
    start: effectStart,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: scaleXKeyframes,
  };

  // Construct effect data for blur (pulsing blur)
  const blurEffect: GenericEffectData = {
    type: 'spring',
    start: effectStart,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: blurKeyframes,
  };

  // Create effect objects
  const effects = [
    {
      id: `${effectIdPrefix}-translateY`,
      componentId: 'generic',
      data: translateYEffect,
    },
    {
      id: `${effectIdPrefix}-scaleX`,
      componentId: 'generic',
      data: scaleXEffect,
    },
    {
      id: `${effectIdPrefix}-blur`,
      componentId: 'generic',
      data: blurEffect,
    },
  ];

  // Return the effects array in a container structure
  // The system will extract these effects when _internalPresetOutput: 'effects'
  return {
    output: {
      childrenData: [
        {
          id: 'heatwave-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: durationInSeconds,
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
  id: 'HeatwaveDistortion',
  title: 'Heatwave Distortion Effect',
  description:
    'Internal effect preset that simulates atmospheric heat distortion through multi-layered transform animations with sine-wave oscillations, horizontal waviness, and pulsing blur effects',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'heatwave', 'distortion', 'atmospheric', 'heat', 'wave', 'blur'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    intensity: 0.5,
    speed: 2000,
    blurAmount: 3,
    waveFrequency: 3,
    effectStart: 0,
  },
};

export const HeatwaveDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
