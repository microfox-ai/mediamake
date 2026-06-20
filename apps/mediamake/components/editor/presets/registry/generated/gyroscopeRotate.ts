/**
 * Gyroscope Rotate Effect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This preset generates multiple layered generic effects that simulate multi-axis rotation
 * like a gyroscope or gimbal system using only 2D transforms (rotate, scaleX, scaleY, skewX, skewY).
 * 
 * It creates the illusion of 3D rotation by combining:
 * - Primary rotation axis (continuous spin based on primarySpeed)
 * - Secondary oscillations (scaleX/scaleY using sine/cosine for tilt simulation)
 * - Precession effects (skewX/skewY for wobbling rotation)
 * 
 * Supports three rotation patterns:
 * - 'stable': Smooth continuous spin with gentle oscillations
 * - 'chaotic': Unpredictable tumbling with randomized phase offsets
 * - 'precession': Controlled wobbling rotation like a spinning top
 * 
 * Parameters control independent rotation speeds for each virtual axis, precession amount,
 * chaos level, and stabilization dampening.
 * 
 * Technical approach:
 * - Uses 5 layered generic effects (rotate, scaleX, scaleY, skewX, skewY)
 * - Samples sine/cosine functions at keyframe points (0, 0.25, 0.5, 0.75, 1)
 * - Phase offsets create multi-axis illusion
 * - Pattern parameter modifies amplitude and frequency relationships
 * 
 * Returns an array of effects ready to be applied to target components.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the gyroscope rotation effect to'),
  effectStart: z.number().describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  
  primarySpeed: z.number().min(0.1).max(10).default(1).describe('Primary rotation speed multiplier (rotations per effect duration)'),
  secondarySpeed: z.number().min(0.1).max(10).default(0.5).describe('Secondary oscillation speed multiplier for tilt simulation'),
  precessionAmount: z.number().min(0).max(1).default(0.3).describe('Amount of precession wobble (0 = none, 1 = maximum)'),
  chaosLevel: z.number().min(0).max(1).default(0).describe('Chaos level for unpredictable variations (0 = none, 1 = maximum)'),
  stabilization: z.number().min(0).max(1).default(0.5).describe('Stabilization factor to dampen oscillations (0 = wild, 1 = stable)'),
  
  pattern: z.enum(['stable', 'chaotic', 'precession']).default('stable').describe('Rotation pattern type: stable (smooth spin), chaotic (tumble), or precession (wobble)'),
  
  effectIdPrefix: z.string().optional().describe('Optional prefix for effect IDs (default: gyroscope)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    effectStart,
    effectDuration,
    primarySpeed,
    secondarySpeed,
    precessionAmount,
    chaosLevel,
    stabilization,
    pattern,
    effectIdPrefix = 'gyroscope',
  } = params;

  // Helper function: Calculate rotation value at progress
  const calcRotation = (prog: number, speed: number, offset: number = 0): number => {
    return (prog * 360 * speed + offset) % 360;
  };

  // Helper function: Calculate sine wave oscillation
  const calcSineWave = (prog: number, frequency: number, amplitude: number, phase: number = 0): number => {
    const stabilizationFactor = 1 - stabilization * 0.5;
    const effectiveAmplitude = amplitude * stabilizationFactor;
    return 1 + Math.sin(prog * Math.PI * 2 * frequency + phase) * effectiveAmplitude;
  };

  // Helper function: Calculate cosine wave oscillation
  const calcCosineWave = (prog: number, frequency: number, amplitude: number, phase: number = 0): number => {
    const stabilizationFactor = 1 - stabilization * 0.5;
    const effectiveAmplitude = amplitude * stabilizationFactor;
    return 1 + Math.cos(prog * Math.PI * 2 * frequency + phase) * effectiveAmplitude;
  };

  // Helper function: Calculate skew for precession
  const calcSkew = (prog: number, frequency: number, amplitude: number, phase: number = 0): number => {
    const stabilizationFactor = 1 - stabilization * 0.3;
    const effectiveAmplitude = amplitude * precessionAmount * stabilizationFactor;
    return Math.sin(prog * Math.PI * 2 * frequency + phase) * effectiveAmplitude * 15; // Max 15 degrees
  };

  // Pattern-specific modifications
  let rotationSpeedMod = 1;
  let scaleAmplitude = 0.15;
  let skewAmplitude = 1;
  let secondaryFreqMod = 1;
  let phaseOffsetBase = 0;

  if (pattern === 'stable') {
    rotationSpeedMod = 1;
    scaleAmplitude = 0.1;
    skewAmplitude = 0.3;
    secondaryFreqMod = 1;
  } else if (pattern === 'chaotic') {
    rotationSpeedMod = 1 + chaosLevel * 2;
    scaleAmplitude = 0.2 + chaosLevel * 0.15;
    skewAmplitude = 1 + chaosLevel * 0.5;
    secondaryFreqMod = 1 + chaosLevel * 1.5;
    phaseOffsetBase = chaosLevel * Math.PI;
  } else if (pattern === 'precession') {
    rotationSpeedMod = 0.7;
    scaleAmplitude = 0.12;
    skewAmplitude = 1.5;
    secondaryFreqMod = 0.8;
  }

  // Add chaos-based random phase offsets
  const chaosPhaseX = chaosLevel * Math.random() * Math.PI;
  const chaosPhaseY = chaosLevel * Math.random() * Math.PI;
  const chaosPhaseSkewX = chaosLevel * Math.random() * Math.PI;
  const chaosPhaseSkewY = chaosLevel * Math.random() * Math.PI;

  // Calculate keyframe values
  const progressPoints = [0, 0.25, 0.5, 0.75, 1];

  // Effect 1: Primary rotation (continuous spin)
  const rotationRanges = progressPoints.map((prog) => ({
    key: 'rotate',
    val: calcRotation(prog, primarySpeed * rotationSpeedMod, phaseOffsetBase * 57.3),
    prog,
  }));

  // Effect 2: ScaleX oscillation (simulates Y-axis tilt using cosine)
  const scaleXRanges = progressPoints.map((prog) => ({
    key: 'scaleX',
    val: calcCosineWave(
      prog,
      secondarySpeed * secondaryFreqMod,
      scaleAmplitude,
      chaosPhaseX
    ),
    prog,
  }));

  // Effect 3: ScaleY oscillation (simulates X-axis tilt using sine, phase-offset from scaleX)
  const scaleYRanges = progressPoints.map((prog) => ({
    key: 'scaleY',
    val: calcSineWave(
      prog,
      secondarySpeed * secondaryFreqMod,
      scaleAmplitude,
      Math.PI / 2 + chaosPhaseY
    ),
    prog,
  }));

  // Effect 4: SkewX for precession wobble
  const skewXRanges = progressPoints.map((prog) => ({
    key: 'skewX',
    val: calcSkew(
      prog,
      secondarySpeed * secondaryFreqMod * 0.7,
      skewAmplitude,
      chaosPhaseSkewX
    ),
    prog,
  }));

  // Effect 5: SkewY phase-offset from skewX for complete precession
  const skewYRanges = progressPoints.map((prog) => ({
    key: 'skewY',
    val: calcSkew(
      prog,
      secondarySpeed * secondaryFreqMod * 0.7,
      skewAmplitude,
      Math.PI / 2 + chaosPhaseSkewY
    ),
    prog,
  }));

  // Construct effect data objects
  const rotateEffectData: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: rotationRanges,
  };

  const scaleXEffectData: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: scaleXRanges,
  };

  const scaleYEffectData: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: scaleYRanges,
  };

  const skewXEffectData: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: skewXRanges,
  };

  const skewYEffectData: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: skewYRanges,
  };

  // Create effect nodes (full BaseEffect shape)
  const effects = [
    {
      id: `${effectIdPrefix}-rotate-${targetId}`,
      componentId: 'generic',
      data: rotateEffectData,
    },
    {
      id: `${effectIdPrefix}-scaleX-${targetId}`,
      componentId: 'generic',
      data: scaleXEffectData,
    },
    {
      id: `${effectIdPrefix}-scaleY-${targetId}`,
      componentId: 'generic',
      data: scaleYEffectData,
    },
    {
      id: `${effectIdPrefix}-skewX-${targetId}`,
      componentId: 'generic',
      data: skewXEffectData,
    },
    {
      id: `${effectIdPrefix}-skewY-${targetId}`,
      componentId: 'generic',
      data: skewYEffectData,
    },
  ];

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: `${effectIdPrefix}-effect-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'gyroscopeRotate',
  title: 'Gyroscope Rotate Effect',
  description: 'Internal effect preset that simulates multi-axis rotation like a gyroscope using 2D transforms. Combines rotate, scaleX, scaleY, skewX, and skewY properties with sine/cosine wave functions to create a 3D rotation illusion. Supports three patterns: stable (smooth continuous spin), chaotic (unpredictable tumbling), and precession (controlled wobbling). Parameters control primary/secondary rotation speeds, precession amount, chaos level, and stabilization dampening.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'rotation', 'gyroscope', 'internal', 'generic', '3d-illusion', 'multi-axis'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 5,
    primarySpeed: 1,
    secondarySpeed: 0.5,
    precessionAmount: 0.3,
    chaosLevel: 0,
    stabilization: 0.5,
    pattern: 'stable',
    effectIdPrefix: 'gyroscope',
  },
};

// Export preset
export const gyroscopeRotatePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
