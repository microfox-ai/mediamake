/**
 * Quantum Superposition Text Effect Preset
 *
 * This preset creates a quantum superposition text effect where multiple probability states
 * of the text exist simultaneously as translucent ghosts that phase in and out of existence
 * with wave-like probability distributions. Each ghost represents a different quantum state
 * with slight variations in position, rotation, and scale. The effect includes interference
 * patterns where ghosts overlap, creating areas of constructive and destructive interference,
 * and particle-wave duality effects where the text occasionally disperses into a probability
 * cloud before reforming. Think of this as visualizing Schrödinger's text - simultaneously
 * existing in multiple states.
 *
 * Features:
 * - **Multiple Quantum States**: 6-8 translucent ghost copies of the text
 * - **Wave-like Oscillations**: Sine wave opacity oscillations with different phases
 * - **Position Uncertainty**: Small random transforms (±5px translate, ±3deg rotate, 0.95-1.05 scale)
 * - **Interference Patterns**: CSS blend modes for constructive/destructive interference
 * - **Probability Cloud Effect**: Blur filter animating from 0 to 10px with opacity fade
 * - **Quantum Collapse**: Periodic collapse where all ghosts converge to main position
 * - **GPU Optimized**: Uses transform: translate3d() and CSS custom properties
 *
 * Use cases:
 * - Creating ethereal, uncertain text presence
 * - Visualizing quantum superposition concepts
 * - Adding mysterious, sci-fi text effects
 * - Building abstract, physics-inspired animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  userText: z
    .string()
    .default('QUANTUM')
    .describe('Text to display in quantum superposition'),
  fontSize: z
    .union([z.string(), z.number()])
    .default('96px')
    .describe('Font size of the text'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the quantum ghost text'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('700')
    .describe('Font weight of the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text'),
  ghostCount: z
    .number()
    .min(4)
    .max(10)
    .default(8)
    .describe('Number of quantum ghost states (4-10)'),
  baseOpacity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe('Base opacity of ghost states (0.1-0.5)'),
  oscillationSpeed: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Speed of wave oscillations (1=slow, 5=fast)'),
  cloudFrequency: z
    .number()
    .min(3)
    .max(10)
    .default(6)
    .describe('How often probability cloud effect occurs (in seconds)'),
  uncertaintyAmount: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Amount of position uncertainty (0.5=subtle, 2=extreme)'),
  duration: z.number().default(10).describe('Duration of the effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate Box-Muller random values (quantum-inspired)
  const boxMullerRandom = (mean: number, stdDev: number): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  };

  // Helper function to calculate oscillation duration
  const calculateOscillationDuration = (index: number): number => {
    // Vary between 2-4 seconds based on speed parameter
    const baseDuration = 3 - (params.oscillationSpeed - 3) * 0.3;
    const variance = 0.3 * params.oscillationSpeed * 0.2;
    return baseDuration + boxMullerRandom(0, variance);
  };

  // Helper function to calculate phase offset
  const calculatePhaseOffset = (index: number): number => {
    // Phase = index * π/4, distributed across ghosts
    return (index * Math.PI) / 4 / (Math.PI * 2); // Convert to time in seconds
  };

  // Helper function to generate random transforms
  const generateTransforms = (index: number) => {
    const uncertainty = params.uncertaintyAmount;
    const translateXRange = 5 * uncertainty;
    const translateYRange = 5 * uncertainty;
    const rotateRange = 3 * uncertainty;
    const scaleRange = 0.05 * uncertainty;

    return {
      translateXStart: boxMullerRandom(0, translateXRange * 0.6),
      translateXEnd: boxMullerRandom(0, translateXRange * 0.6),
      translateYStart: boxMullerRandom(0, translateYRange * 0.6),
      translateYEnd: boxMullerRandom(0, translateYRange * 0.6),
      rotateStart: boxMullerRandom(0, rotateRange),
      rotateEnd: boxMullerRandom(0, rotateRange),
      scaleStart: 1 + boxMullerRandom(0, scaleRange),
      scaleEnd: 1 + boxMullerRandom(0, scaleRange),
    };
  };

  // Helper function to calculate opacity range
  const calculateOpacityRange = (index: number) => {
    const baseOp = params.baseOpacity;
    const opacityVariance = 0.1;
    const minOpacity = Math.max(0.15, baseOp - opacityVariance);
    const maxOpacity = Math.min(0.5, baseOp + opacityVariance);
    
    return {
      min: minOpacity + boxMullerRandom(0, 0.05),
      max: maxOpacity + boxMullerRandom(0, 0.05),
    };
  };

  // Create ghost TextAtom components with effects
  const ghostComponents: RenderableComponentData[] = [];

  for (let i = 0; i < params.ghostCount; i++) {
    const ghostId = `ghost-${i + 1}`;
    const transforms = generateTransforms(i);
    const opacityRange = calculateOpacityRange(i);
    const oscillationDuration = calculateOscillationDuration(i);
    const phaseOffset = calculatePhaseOffset(i);
    const cloudStartOffset = (i * params.cloudFrequency) / params.ghostCount;

    // Oscillation effect (wave-like probability distribution)
    const oscillationEffect = {
      id: `oscillation-${ghostId}`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [ghostId],
        type: 'linear',
        start: phaseOffset,
        duration: oscillationDuration,
        loop: true,
        ranges: [
          // Opacity oscillation (sine wave)
          { key: 'opacity', val: opacityRange.min, prog: 0 },
          { key: 'opacity', val: opacityRange.max, prog: 0.5 },
          { key: 'opacity', val: opacityRange.min, prog: 1 },
          // Position uncertainty (translateX)
          { key: 'translateX', val: transforms.translateXStart, prog: 0 },
          { key: 'translateX', val: transforms.translateXEnd, prog: 1 },
          // Position uncertainty (translateY)
          { key: 'translateY', val: transforms.translateYStart, prog: 0 },
          { key: 'translateY', val: transforms.translateYEnd, prog: 1 },
          // Rotation uncertainty
          { key: 'rotate', val: transforms.rotateStart, prog: 0 },
          { key: 'rotate', val: transforms.rotateEnd, prog: 1 },
          // Scale uncertainty
          { key: 'scale', val: transforms.scaleStart, prog: 0 },
          { key: 'scale', val: transforms.scaleEnd, prog: 1 },
        ],
      },
    };

    // Probability cloud effect (particle-wave duality)
    const cloudEffect = {
      id: `probability-cloud-${ghostId}`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [ghostId],
        type: 'ease-in-out',
        start: cloudStartOffset,
        duration: 1.2,
        loop: true,
        loopInterval: params.cloudFrequency + boxMullerRandom(0, 0.5),
        ranges: [
          // Blur (disperse into probability cloud)
          { key: 'blur', val: 0, prog: 0 },
          { key: 'blur', val: 10, prog: 0.5 },
          { key: 'blur', val: 0, prog: 1 },
          // Opacity fade during cloud state
          { key: 'opacity', val: opacityRange.max * 0.8, prog: 0 },
          { key: 'opacity', val: opacityRange.min * 0.3, prog: 0.5 },
          { key: 'opacity', val: opacityRange.max * 0.8, prog: 1 },
        ],
      },
    };

    const ghostComponent: RenderableComponentData = {
      id: ghostId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.userText,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: params.fontWeight,
          fontFamily: params.fontFamily,
        },
        className: 'absolute inset-0 mix-blend-screen',
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'quantum-container',
        },
      },
      effects: [oscillationEffect, cloudEffect],
    };

    ghostComponents.push(ghostComponent);
  }

  // Root container with isolate for stacking context
  const rootContainer: RenderableComponentData = {
    id: 'quantum-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full isolate flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: ghostComponents,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'quantum-superposition-text',
  title: 'Quantum Superposition Text Effect',
  description:
    "Visualizes Schrödinger's text - multiple probability states exist simultaneously as translucent ghosts that phase in and out with wave-like probability distributions. Features interference patterns, particle-wave duality effects, and periodic quantum collapse animations.",
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'quantum',
    'superposition',
    'ghost',
    'probability',
    'wave',
    'interference',
    'particle',
    'physics',
    'ethereal',
    'mysterious',
    'sci-fi',
  ],
  dependencies: {},
  defaultInputParams: {
    userText: 'QUANTUM',
    fontSize: '96px',
    textColor: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Inter',
    ghostCount: 8,
    baseOpacity: 0.3,
    oscillationSpeed: 3,
    cloudFrequency: 6,
    uncertaintyAmount: 1,
    duration: 10,
  },
};

// Export preset
export const quantumSuperpositionTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
