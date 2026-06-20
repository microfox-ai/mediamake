/**
 * BitCrush Internal Effect Preset
 *
 * This preset simulates digital audio/video bit depth reduction artifacts. It creates
 * posterized colors, stepped opacity transitions, and quantization noise on positions.
 * Uses CSS filters to reduce color depth while simultaneously creating 'stepped' animations
 * that feel quantized rather than smooth.
 *
 * Features:
 * - **Bit Depth Control**: 1-8 bit simulation controls quantization steps
 * - **Color Posterization**: High contrast filters reduce color depth
 * - **Quantized Movement**: Position snaps to grid based on bit depth
 * - **Stepped Animations**: Progress values snap to discrete steps
 * - **Quantization Noise**: Random position jitter simulates digital artifacts
 * - **Dithering**: Optional noise pattern overlay
 * - **Bit Overflow**: Sudden clipping to extremes for dramatic effect
 *
 * Use cases:
 * - Creating retro digital aesthetics
 * - Simulating low-quality digital compression
 * - Adding glitch effects to modern content
 * - Building experimental visual experiences
 *
 * SINGLE EFFECT:
 * Returns a single generic effect with multiple animated properties for comprehensive
 * bit depth reduction simulation.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply bit crush effect to'),
  duration: z
    .number()
    .min(0.1)
    .describe('Duration of the effect in seconds'),
  bitDepth: z
    .number()
    .min(1)
    .max(8)
    .default(3)
    .describe('Bit depth (1-8) - controls quantization steps'),
  quantizationNoise: z
    .number()
    .min(0)
    .max(50)
    .default(5)
    .describe('Position jitter amount in pixels'),
  colorPosterize: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Level of color reduction (higher = more posterization)'),
  dithering: z
    .boolean()
    .default(false)
    .describe('Adds noise pattern for dithering effect'),
  overflowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability of bit overflow moments (0-1)'),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect (relative to component)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate quantization steps based on bit depth
  const calculateSteps = (bitDepth: number): number => {
    return Math.pow(2, bitDepth);
  };

  // Helper function to generate stepped progress values
  const generateSteppedProgress = (bitDepth: number): number[] => {
    const steps = calculateSteps(bitDepth);
    const progressValues: number[] = [];
    
    for (let i = 0; i < steps; i++) {
      const prog = i / (steps - 1);
      // Each step appears twice to create "held" values
      progressValues.push(prog);
      if (i < steps - 1) {
        progressValues.push(prog);
      }
    }
    
    return progressValues;
  };

  // Helper function to calculate quantized position value
  const quantizePosition = (
    value: number,
    bitDepth: number,
    noise: number,
  ): number => {
    const steps = calculateSteps(bitDepth);
    const stepSize = (value * 2) / steps; // Grid size based on bit depth
    const quantized = Math.round(value / stepSize) * stepSize;
    const jitter = (Math.random() - 0.5) * noise;
    return quantized + jitter;
  };

  // Helper function to create posterization filter based on color posterize level
  const createPosterizeFilter = (level: number, dithering: boolean): string => {
    const contrast = 1 + level * 0.5;
    const brightness = 1 + level * 0.2;
    const saturate = Math.max(0.3, 1 - level * 0.15);
    
    let filter = `contrast(${contrast}) brightness(${brightness}) saturate(${saturate})`;
    
    if (dithering) {
      // Add grainy noise effect through opacity and blur
      filter += ` opacity(0.95)`;
    }
    
    return filter;
  };

  const {
    bitDepth,
    quantizationNoise,
    colorPosterize,
    dithering,
    overflowIntensity,
    duration,
    effectStart,
    targetIds,
    effectId,
  } = params;

  // Generate stepped progress values
  const steppedProgress = generateSteppedProgress(bitDepth);
  
  // Calculate quantization parameters
  const steps = calculateSteps(bitDepth);
  const maxTranslate = 20; // Maximum translation distance
  
  // Build animation ranges with quantized values
  const ranges: Array<{ key: string; val: any; prog: number }> = [];

  // Posterize filter (color reduction)
  const posterizeFilter = createPosterizeFilter(colorPosterize, dithering);
  ranges.push({ key: 'filter', val: posterizeFilter, prog: 0 });
  ranges.push({ key: 'filter', val: posterizeFilter, prog: 1 });

  // Stepped opacity transitions
  steppedProgress.forEach((prog, index) => {
    const opacitySteps = Math.floor(steps / 2);
    const opacityLevel = Math.floor((index / steppedProgress.length) * opacitySteps) / opacitySteps;
    const opacity = 0.7 + opacityLevel * 0.3; // Range: 0.7 to 1.0
    ranges.push({ key: 'opacity', val: opacity, prog });
  });

  // Quantized position (translateX and translateY) with noise
  steppedProgress.forEach((prog, index) => {
    const isOverflow = Math.random() < overflowIntensity;
    
    if (isOverflow) {
      // Bit overflow: sudden extreme values
      const extremeX = (Math.random() > 0.5 ? 1 : -1) * maxTranslate * 2;
      const extremeY = (Math.random() > 0.5 ? 1 : -1) * maxTranslate * 2;
      ranges.push({ key: 'translateX', val: extremeX, prog });
      ranges.push({ key: 'translateY', val: extremeY, prog });
    } else {
      // Normal quantized movement
      const baseX = (prog - 0.5) * maxTranslate;
      const baseY = Math.sin(prog * Math.PI * 2) * maxTranslate * 0.5;
      
      const quantizedX = quantizePosition(baseX, bitDepth, quantizationNoise);
      const quantizedY = quantizePosition(baseY, bitDepth, quantizationNoise);
      
      ranges.push({ key: 'translateX', val: quantizedX, prog });
      ranges.push({ key: 'translateY', val: quantizedY, prog });
    }
  });

  // Optional: Add scale quantization for additional bit-crushed feel
  steppedProgress.forEach((prog, index) => {
    const scaleSteps = Math.max(2, Math.floor(steps / 2));
    const scaleLevel = Math.floor((index / steppedProgress.length) * scaleSteps) / scaleSteps;
    const scale = 0.95 + scaleLevel * 0.1; // Range: 0.95 to 1.05
    ranges.push({ key: 'scale', val: scale, prog });
  });

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for hard stepped transitions
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  // Create effect node
  const effect = {
    id: effectId || `bitcrush-effect-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return in container structure for effect extraction
  const rootContainer: RenderableComponentData = {
    id: 'bitcrush-effect-container',
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
        duration: 10, // Placeholder duration for container
      },
    },
    effects: [effect],
    childrenData: [],
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
  id: 'bitCrush',
  title: 'BitCrush Internal Effect',
  description:
    'Simulates digital bit depth reduction artifacts with posterized colors, stepped animations, quantization noise, and bit overflow moments',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'retro', 'digital'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    duration: 2,
    bitDepth: 3,
    quantizationNoise: 5,
    colorPosterize: 3,
    dithering: false,
    overflowIntensity: 0.3,
    effectStart: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const bitCrushPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
