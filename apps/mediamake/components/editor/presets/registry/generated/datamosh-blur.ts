/**
 * Datamosh Blur Internal Effect Preset
 *
 * Creates progressive blur degradation mimicking video compression artifacts.
 * Uses generic effects with blur filter animation that pulses between sharp and
 * heavily blurred states in irregular patterns.
 *
 * The effect layers multiple blur passes:
 * - Base oscillating blur (0-10px)
 * - Spike blurs that hit suddenly (up to 20px based on compressionLevel)
 * - Recovery phase that returns to normal
 *
 * Features:
 * - Compression artifacts simulation with irregular blur spikes
 * - Brightness fluctuations synchronized with blur intensity
 * - Optional RGB channel separation via translateX and hue-rotate
 * - Configurable compression level, artifact density, and recovery speed
 * - Mimics exposure issues in corrupted video frames
 *
 * Use cases:
 * - Creating glitch/datamosh visual effects
 * - Simulating video compression artifacts
 * - Adding retro digital corruption aesthetics
 * - Creating dynamic distortion effects synchronized with intensity
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  compressionLevel: z
    .number()
    .min(1)
    .max(10)
    .describe('Compression level controlling max blur intensity (1-10)'),
  artifactDensity: z
    .number()
    .min(1)
    .max(20)
    .describe('Number of blur spike artifacts to generate'),
  recoverySpeed: z
    .number()
    .min(0.1)
    .max(1)
    .describe('Speed of blur recovery phase (0.1-1, higher = faster)'),
  colorShift: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable RGB channel separation and hue rotation effects'),
  duration: z.number().min(0.1).describe('Total effect duration in seconds'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply effect to'),
  effectStart: z
    .number()
    .optional()
    .default(0)
    .describe('Start time of effect relative to parent'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the datamosh blur effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate irregular progression points for sudden spikes
  const generateIrregularProgression = (
    artifactCount: number,
    duration: number,
  ): number[] => {
    const basePoints = [0]; // Always start at 0
    const recoveryStart = 0.8; // Recovery phase starts at 80%

    // Distribute artifact spikes across the first 80% of duration
    for (let i = 0; i < artifactCount; i++) {
      // Random position in the first 80%
      const spikePos = (Math.random() * recoveryStart * 0.95 + 0.05); // Avoid very start/end
      const preSpike = spikePos - 0.01; // Just before spike
      const postSpike = spikePos + 0.01; // Just after spike (sudden jump)
      
      basePoints.push(preSpike, postSpike);
    }

    // Add recovery phase points
    basePoints.push(recoveryStart, 1);

    // Sort and remove duplicates
    return Array.from(new Set(basePoints)).sort((a, b) => a - b);
  };

  // Helper: Calculate blur value at progression point
  const calculateBlurValue = (
    prog: number,
    compressionLevel: number,
    artifactDensity: number,
    recoverySpeed: number,
  ): string => {
    const maxBlur = compressionLevel * 2; // Max 20px at level 10
    const baseOscillation = 10; // Base oscillation 0-10px

    // Recovery phase (prog > 0.8)
    if (prog >= 0.8) {
      const recoveryProg = (prog - 0.8) / 0.2;
      const recoveryFactor = Math.pow(recoveryProg, 1 / recoverySpeed);
      const currentBlur = maxBlur * (1 - recoveryFactor);
      return `blur(${Math.max(0, currentBlur).toFixed(1)}px)`;
    }

    // Check if this is a spike point (look for sudden jumps)
    // Use sine wave for base oscillation + random spikes
    const baseBlur = (Math.sin(prog * Math.PI * 4) * 0.5 + 0.5) * baseOscillation;
    
    // Random spike probability based on artifact density
    const spikeChance = artifactDensity / 20;
    const isSpike = Math.random() < spikeChance && prog > 0.05 && prog < 0.75;
    
    if (isSpike) {
      // Sudden spike to high blur
      const spikeIntensity = 0.7 + Math.random() * 0.3; // 70-100% of max
      return `blur(${(maxBlur * spikeIntensity).toFixed(1)}px)`;
    }

    return `blur(${baseBlur.toFixed(1)}px)`;
  };

  // Helper: Calculate brightness at progression point
  const calculateBrightness = (
    prog: number,
    blurValue: string,
    recoverySpeed: number,
  ): number => {
    // Extract blur amount from "blur(Npx)" string
    const blurMatch = blurValue.match(/blur\((\d+\.?\d*)px\)/);
    const blurAmount = blurMatch ? parseFloat(blurMatch[1]) : 0;

    // Higher blur = lower brightness (simulate exposure issues)
    const maxBlur = 20;
    const minBrightness = 0.7;
    const maxBrightness = 1.3;

    // Recovery phase - return to normal brightness
    if (prog >= 0.8) {
      const recoveryProg = (prog - 0.8) / 0.2;
      const recoveryFactor = Math.pow(recoveryProg, 1 / recoverySpeed);
      const targetBrightness = minBrightness + (1 - minBrightness) * recoveryFactor;
      return Math.max(minBrightness, Math.min(maxBrightness, targetBrightness));
    }

    // Inverse relationship: more blur = darker
    const blurRatio = blurAmount / maxBlur;
    const brightness = maxBrightness - (maxBrightness - minBrightness) * blurRatio;

    return Math.max(minBrightness, Math.min(maxBrightness, brightness));
  };

  // Helper: Calculate RGB shift translateX
  const calculateTranslateX = (
    prog: number,
    blurValue: string,
  ): number => {
    const blurMatch = blurValue.match(/blur\((\d+\.?\d*)px\)/);
    const blurAmount = blurMatch ? parseFloat(blurMatch[1]) : 0;

    // More blur = more channel separation
    const maxShift = 5;
    const blurRatio = blurAmount / 20;
    
    // Oscillate between positive and negative for RGB separation effect
    const direction = Math.sin(prog * Math.PI * 8) > 0 ? 1 : -1;
    return direction * blurRatio * maxShift;
  };

  // Helper: Calculate hue rotation
  const calculateHueRotate = (
    prog: number,
    blurValue: string,
  ): string => {
    const blurMatch = blurValue.match(/blur\((\d+\.?\d*)px\)/);
    const blurAmount = blurMatch ? parseFloat(blurMatch[1]) : 0;

    // More blur = more color distortion
    const maxRotation = 10;
    const blurRatio = blurAmount / 20;
    const rotation = blurRatio * maxRotation;

    return `hue-rotate(${rotation.toFixed(1)}deg)`;
  };

  // Generate irregular progression points
  const progressionPoints = generateIrregularProgression(
    params.artifactDensity,
    params.duration,
  );

  // Build blur ranges
  const blurRanges = progressionPoints.map((prog) => {
    const blurValue = calculateBlurValue(
      prog,
      params.compressionLevel,
      params.artifactDensity,
      params.recoverySpeed,
    );
    return {
      key: 'blur',
      val: blurValue,
      prog,
    };
  });

  // Build brightness ranges synchronized with blur
  const brightnessRanges = progressionPoints.map((prog) => {
    const blurValue = calculateBlurValue(
      prog,
      params.compressionLevel,
      params.artifactDensity,
      params.recoverySpeed,
    );
    const brightness = calculateBrightness(prog, blurValue, params.recoverySpeed);
    return {
      key: 'brightness',
      val: brightness,
      prog,
    };
  });

  // Build ranges array
  const ranges = [...blurRanges, ...brightnessRanges];

  // Add color shift effects if enabled
  if (params.colorShift) {
    // TranslateX for RGB channel separation
    const translateXRanges = progressionPoints.map((prog) => {
      const blurValue = calculateBlurValue(
        prog,
        params.compressionLevel,
        params.artifactDensity,
        params.recoverySpeed,
      );
      const translateX = calculateTranslateX(prog, blurValue);
      return {
        key: 'translateX',
        val: translateX,
        prog,
      };
    });

    // Hue rotation for color distortion
    const filterRanges = progressionPoints.map((prog) => {
      const blurValue = calculateBlurValue(
        prog,
        params.compressionLevel,
        params.artifactDensity,
        params.recoverySpeed,
      );
      const hueRotate = calculateHueRotate(prog, blurValue);
      return {
        key: 'filter',
        val: hueRotate,
        prog,
      };
    });

    ranges.push(...translateXRanges, ...filterRanges);
  }

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear',
    start: params.effectStart || 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges,
  };

  // Create effect node
  const effect = {
    id: params.effectId || `datamosh-blur-${params.targetIds[0]}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return container with effect
  const container = {
    id: 'datamosh-blur-effect-container',
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
        duration: params.duration,
      },
    },
    effects: [effect],
    childrenData: [],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'datamosh-blur',
  title: 'Datamosh Blur Effect',
  description:
    'Internal effect preset that creates progressive blur degradation mimicking video compression artifacts. Generates irregular blur spikes, brightness fluctuations, and optional RGB channel separation to simulate corrupted video frames.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'blur', 'glitch', 'datamosh', 'corruption', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    compressionLevel: 5,
    artifactDensity: 8,
    recoverySpeed: 0.6,
    colorShift: false,
    duration: 5,
    targetIds: ['target-component'],
    effectStart: 0,
  },
};

// Export preset
export const datamoshBlurPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
