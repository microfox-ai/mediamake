/**
 * LiquidOverlap Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Generates fluid, overlapping transparency animations mimicking liquid behavior.
 * Elements flow with varying opacity, creating organic overlap patterns like water or oil.
 *
 * Parameters:
 * - viscosity: Controls flow speed (0.1 - 2, lower = faster)
 * - surfaceTension: How elements attract/repel (0 - 1)
 * - transparencyGradient: Opacity variation (base + amplitude)
 * - flowDirection: Movement vector { x, y }
 * - turbulence: Random distortion (0 - 1)
 * - temperature: Affects movement speed and mixing
 *
 * Effect Structure:
 * - Type: Generic (AnimationRange[])
 * - Complex bezier-based animations for organic movement
 * - Flow paths using sine/cosine combinations with turbulence noise
 * - Multiple prog points (0, 0.2, 0.4, 0.6, 0.8, 1) for smooth curves
 * - Opacity varies using gradient function: opacity = base + sin(prog * PI * 2 + phaseOffset) * amplitude
 * - Position animations use cubic-bezier for fluid motion
 * - Transform-origin variations for rotation around different points
 *
 * Returns: { effects: [...] } with opacity, translateX/Y, rotate, and scale effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply liquid effects'),
  effectStart: z
    .number()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the liquid animation'),
  viscosity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe(
      'Flow speed multiplier (0.1 = very fast, 2 = very slow, affects duration)',
    ),
  surfaceTension: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'How elements attract/repel (0 = loose/scattered, 1 = tight/cohesive)',
    ),
  transparencyGradient: z
    .object({
      base: z
        .number()
        .min(0)
        .max(1)
        .default(0.5)
        .describe('Base opacity value'),
      amplitude: z
        .number()
        .min(0)
        .max(1)
        .default(0.4)
        .describe('Opacity variation amplitude'),
    })
    .default({ base: 0.5, amplitude: 0.4 })
    .describe('Opacity gradient configuration'),
  flowDirection: z
    .object({
      x: z.number().default(1).describe('Horizontal flow direction'),
      y: z.number().default(0).describe('Vertical flow direction'),
    })
    .default({ x: 1, y: 0 })
    .describe('Movement vector for fluid flow'),
  turbulence: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Random distortion intensity (0 = smooth, 1 = chaotic)'),
  temperature: z
    .number()
    .default(1)
    .describe('Affects movement speed and mixing (higher = more active)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for tracking'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate smooth noise-like value using sine waves
  const generateNoise = (
    seed: number,
    frequency: number,
    amplitude: number,
  ): number => {
    return Math.sin(seed * frequency) * amplitude;
  };

  // Helper function: Calculate opacity at specific progress
  const calculateOpacity = (prog: number, phaseOffset: number): number => {
    const { base, amplitude } = params.transparencyGradient;
    const opacity = base + Math.sin(prog * Math.PI * 2 + phaseOffset) * amplitude;
    return Math.max(0, Math.min(1, opacity));
  };

  // Helper function: Calculate position with turbulence
  const calculatePosition = (
    prog: number,
    direction: number,
    turbulence: number,
    seed: number,
  ): number => {
    const baseMovement = direction * prog * 100; // Base flow movement
    const turbulenceNoise =
      generateNoise(prog * 5 + seed, 3, 1) * turbulence * 50;
    const waveMotion = Math.sin(prog * Math.PI * 4 + seed) * 20 * (1 - params.surfaceTension);
    return baseMovement + turbulenceNoise + waveMotion;
  };

  // Helper function: Calculate rotation based on flow
  const calculateRotation = (prog: number, seed: number): number => {
    const flowRotation = params.flowDirection.x * prog * 360 * params.temperature;
    const turbulenceRotation =
      generateNoise(prog * 3 + seed, 2, 1) * params.turbulence * 45;
    return flowRotation + turbulenceRotation;
  };

  // Helper function: Calculate scale with surface tension
  const calculateScale = (prog: number, seed: number): number => {
    const baseScale = 1 + Math.sin(prog * Math.PI * 2 + seed) * 0.2 * params.temperature;
    const tensionScale = params.surfaceTension * 0.15;
    return Math.max(0.5, Math.min(1.5, baseScale + tensionScale));
  };

  // Phase offset for opacity variation
  const phaseOffset = Math.random() * Math.PI * 2;

  // Seed for consistent turbulence across properties
  const turbulenceSeed = Math.random() * 10;

  // Progress points for smooth curves
  const progPoints = [0, 0.2, 0.4, 0.6, 0.8, 1];

  // Generate animation ranges
  const ranges: Array<{ key: string; val: any; prog: number }> = [];

  // Opacity animation (liquid transparency)
  progPoints.forEach((prog) => {
    ranges.push({
      key: 'opacity',
      val: calculateOpacity(prog, phaseOffset),
      prog,
    });
  });

  // TranslateX animation (horizontal flow)
  progPoints.forEach((prog) => {
    ranges.push({
      key: 'translateX',
      val: `${calculatePosition(prog, params.flowDirection.x, params.turbulence, turbulenceSeed)}px`,
      prog,
    });
  });

  // TranslateY animation (vertical flow)
  progPoints.forEach((prog) => {
    ranges.push({
      key: 'translateY',
      val: `${calculatePosition(prog, params.flowDirection.y, params.turbulence, turbulenceSeed + 1)}px`,
      prog,
    });
  });

  // Rotation animation (liquid swirl)
  progPoints.forEach((prog) => {
    ranges.push({
      key: 'rotate',
      val: calculateRotation(prog, turbulenceSeed + 2),
      prog,
    });
  });

  // Scale animation (liquid expansion/contraction)
  progPoints.forEach((prog) => {
    ranges.push({
      key: 'scale',
      val: calculateScale(prog, turbulenceSeed + 3),
      prog,
    });
  });

  // Calculate effective duration based on viscosity
  const effectiveDuration = params.effectDuration / params.viscosity;

  // Construct effect data with cubic-bezier for fluid motion
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: effectiveDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // Custom cubic-bezier for organic feel
  };

  // Create effect node
  const effect = {
    id:
      params.effectId ||
      `liquid-overlap-${params.targetId}-${Date.now()}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'liquid-overlap-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectiveDuration,
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
  id: 'liquid-overlap-effect',
  title: 'LiquidOverlap',
  description:
    'Internal effect preset that generates fluid, overlapping transparency animations mimicking liquid behavior. Creates organic overlap patterns like water or oil with configurable viscosity, surface tension, transparency gradients, flow direction, turbulence, and temperature parameters. Returns AnimationRange[] effects for opacity, translateX/Y, rotate, and scale with cubic-bezier easing for smooth, organic transitions.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'liquid',
    'fluid',
    'organic',
    'overlap',
    'transparency',
    'internal',
    'generic',
  ],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 3,
    viscosity: 1,
    surfaceTension: 0.5,
    transparencyGradient: {
      base: 0.5,
      amplitude: 0.4,
    },
    flowDirection: {
      x: 1,
      y: 0,
    },
    turbulence: 0.3,
    temperature: 1,
  },
};

export const liquidOverlapEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
