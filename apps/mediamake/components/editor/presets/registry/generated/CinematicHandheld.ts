/**
 * Cinematic Handheld Camera Effect Preset
 *
 * This internal effect preset replicates professional handheld camera movement with natural
 * human micro-movements including breathing patterns, hand tremor, and occasional readjustments.
 *
 * Unlike simple shake effects, this layered approach combines three movement frequencies:
 * - Layer 1 (Breathing - Low Frequency): 2-4 second oscillation with slow drift (translateX/Y)
 * - Layer 2 (Sway - Medium Frequency): 0.5-1 second oscillation with subtle rotation and movement
 * - Layer 3 (Tremor - High Frequency): 0.1-0.2 second oscillation with micro translations
 *
 * The effect uses overlapping sine waves with different frequencies and phase offsets to ensure
 * organic, non-repeating motion patterns that feel authentic to real handheld footage.
 *
 * SINGLE EFFECT (returns one generic effect with combined ranges)
 *
 * Features:
 * - **Operator Steadiness**: Control shake intensity (0 = steady, 1 = very shaky)
 * - **Camera Weight**: Affects movement dampening (light/medium/heavy)
 * - **Shooting Scenario**: Adjusts motion intensity (standing/walking/running)
 * - **Breathing Amplitude**: Control low-frequency drift amount
 * - **Three-Layer Movement**: Combines breathing, sway, and tremor for realistic motion
 * - **Non-Repeating**: Uses phase offsets to create organic movement patterns
 *
 * Use cases:
 * - Creating realistic handheld camera effects for interviews or vlogs
 * - Adding documentary-style authenticity to footage
 * - Simulating different operator experience levels
 * - Creating dynamic motion for static images or graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData, AnimationRange } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the handheld effect to'),
  duration: z.number().describe('Duration of the effect in seconds'),
  operatorSteadiness: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'Operator experience level: 0 = very steady (professional), 1 = very shaky (novice)',
    ),
  cameraWeight: z
    .enum(['light', 'medium', 'heavy'])
    .default('medium')
    .describe(
      'Camera weight affects movement dampening: light = more tremor, heavy = less tremor',
    ),
  scenario: z
    .enum(['standing', 'walking', 'running'])
    .default('standing')
    .describe(
      'Shooting scenario affects overall motion intensity and amplitude',
    ),
  breathingAmplitude: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe(
      'Amplitude of breathing layer (low-frequency drift) in pixels. Higher = more drift',
    ),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent component'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID. If not provided, auto-generated'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate sine wave keyframes for a given frequency
  const generateSineWave = (
    frequency: number,
    amplitude: number,
    phaseOffset: number,
    numKeyframes: number,
  ): number[] => {
    const values: number[] = [];
    for (let i = 0; i < numKeyframes; i++) {
      const prog = i / (numKeyframes - 1);
      const time = prog * params.duration;
      const value =
        amplitude * Math.sin(2 * Math.PI * frequency * time + phaseOffset);
      values.push(value);
    }
    return values;
  };

  // Calculate scenario-based amplitude multipliers
  const scenarioMultipliers = {
    standing: 1.0,
    walking: 1.8,
    running: 3.0,
  };
  const scenarioMultiplier = scenarioMultipliers[params.scenario];

  // Calculate steadiness factor (inverted so 0 = steady, 1 = shaky)
  const shakinessFactor = params.operatorSteadiness;
  const steadinessFactor = 1 - shakinessFactor;

  // Camera weight dampening for tremor layer
  const weightDampening = {
    light: 1.0,
    medium: 0.6,
    heavy: 0.35,
  };
  const tremorDampening = weightDampening[params.cameraWeight];

  // LAYER 1: BREATHING (Low Frequency - 2-4 second period)
  // Uses 0.25 Hz (4 second period) for breathing
  const breathingFrequency = 0.25;
  const breathingKeyframeCount = 4; // Start, mid1, mid2, end
  const breathingAmplitudeX =
    params.breathingAmplitude * scenarioMultiplier * (0.7 + shakinessFactor);
  const breathingAmplitudeY =
    params.breathingAmplitude * scenarioMultiplier * (0.5 + shakinessFactor);

  const breathingX = generateSineWave(
    breathingFrequency,
    breathingAmplitudeX,
    0, // Phase offset 0
    breathingKeyframeCount,
  );
  const breathingY = generateSineWave(
    breathingFrequency,
    breathingAmplitudeY,
    Math.PI / 3, // Phase offset for Y
    breathingKeyframeCount,
  );

  // LAYER 2: SWAY (Medium Frequency - 0.5-1 second period)
  // Uses 1.2 Hz (0.83 second period) for sway
  const swayFrequency = 1.2;
  const swayKeyframeCount = 10;
  const swayAmplitudeX =
    (3 + shakinessFactor * 5) * scenarioMultiplier * steadinessFactor * 0.8;
  const swayAmplitudeY =
    (3 + shakinessFactor * 5) * scenarioMultiplier * steadinessFactor * 0.8;
  const swayRotationAmplitude = 0.5 + shakinessFactor * 0.5; // -1 to +1 degree

  const swayX = generateSineWave(
    swayFrequency,
    swayAmplitudeX,
    Math.PI * 0.3, // Phase offset 0.3
    swayKeyframeCount,
  );
  const swayY = generateSineWave(
    swayFrequency,
    swayAmplitudeY,
    Math.PI * 0.7, // Different phase for Y
    swayKeyframeCount,
  );
  const swayRotation = generateSineWave(
    swayFrequency,
    swayRotationAmplitude,
    Math.PI * 0.5, // Phase offset for rotation
    swayKeyframeCount,
  );

  // LAYER 3: TREMOR (High Frequency - 0.1-0.2 second period)
  // Uses 8 Hz (0.125 second period) for tremor
  const tremorFrequency = 8;
  const tremorKeyframeCount = Math.max(
    30,
    Math.ceil(params.duration / 0.1),
  ); // At least 30 or one every 0.1s
  const tremorAmplitudeBase = 1 + shakinessFactor * 2;
  const tremorAmplitudeX =
    tremorAmplitudeBase * tremorDampening * scenarioMultiplier * 0.7;
  const tremorAmplitudeY =
    tremorAmplitudeBase * tremorDampening * scenarioMultiplier * 0.7;

  const tremorX = generateSineWave(
    tremorFrequency,
    tremorAmplitudeX,
    Math.PI * 0.7, // Phase offset 0.7
    tremorKeyframeCount,
  );
  const tremorY = generateSineWave(
    tremorFrequency,
    tremorAmplitudeY,
    Math.PI * 1.3, // Phase offset 1.3
    tremorKeyframeCount,
  );

  // Combine all three layers into final AnimationRange arrays
  // We'll use the tremor layer's keyframe count as it has the most keyframes
  const finalKeyframeCount = tremorKeyframeCount;

  // Helper to get interpolated value from a layer
  const interpolateLayer = (
    layerValues: number[],
    progress: number,
  ): number => {
    const layerCount = layerValues.length;
    const index = progress * (layerCount - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(Math.ceil(index), layerCount - 1);
    const fraction = index - lowerIndex;

    if (lowerIndex === upperIndex) return layerValues[lowerIndex];

    return (
      layerValues[lowerIndex] * (1 - fraction) +
      layerValues[upperIndex] * fraction
    );
  };

  // Generate combined translateX, translateY, and rotate ranges
  const translateXRanges: AnimationRange[] = [];
  const translateYRanges: AnimationRange[] = [];
  const rotateRanges: AnimationRange[] = [];

  for (let i = 0; i < finalKeyframeCount; i++) {
    const prog = i / (finalKeyframeCount - 1);

    // Interpolate breathing and sway at this progress point
    const breathingXVal = interpolateLayer(breathingX, prog);
    const breathingYVal = interpolateLayer(breathingY, prog);
    const swayXVal = interpolateLayer(swayX, prog);
    const swayYVal = interpolateLayer(swayY, prog);
    const swayRotVal = interpolateLayer(swayRotation, prog);

    // Tremor is already at the target keyframe count
    const tremorXVal = tremorX[i];
    const tremorYVal = tremorY[i];

    // Combine all layers
    const finalX = breathingXVal + swayXVal + tremorXVal;
    const finalY = breathingYVal + swayYVal + tremorYVal;
    const finalRotation = swayRotVal;

    translateXRanges.push({
      key: 'translateX',
      val: finalX,
      prog,
    });

    translateYRanges.push({
      key: 'translateY',
      val: finalY,
      prog,
    });

    rotateRanges.push({
      key: 'rotate',
      val: finalRotation,
      prog,
    });
  }

  // Combine all ranges
  const combinedRanges: AnimationRange[] = [
    ...translateXRanges,
    ...translateYRanges,
    ...rotateRanges,
  ];

  // Construct the effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear interpolation between keyframes for smooth organic motion
    start: params.effectStart,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: combinedRanges,
  };

  // Create the effect object
  const effect = {
    id:
      params.effectId ||
      `cinematic-handheld-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect in a container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'cinematic-handheld-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.duration,
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
  id: 'CinematicHandheld',
  title: 'Cinematic Handheld Camera Effect',
  description:
    'Internal effect preset that replicates professional handheld camera movement with natural human micro-movements including breathing patterns, hand tremor, and readjustments. Layers three movement frequencies: low (breathing), medium (sway), and high (tremor) for organic, non-repeating motion.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'handheld', 'camera', 'cinematic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['target-component'],
    duration: 10,
    operatorSteadiness: 0.5,
    cameraWeight: 'medium',
    scenario: 'standing',
    breathingAmplitude: 10,
    effectStart: 0,
  },
};

// Export preset
export const CinematicHandheldPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
