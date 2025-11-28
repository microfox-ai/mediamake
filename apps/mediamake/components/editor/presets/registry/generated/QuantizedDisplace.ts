/**
 * QuantizedDisplace Internal Effect Preset
 *
 * SINGLE EFFECT OBJECT (generic type, returns effects array):
 *
 * Creates a digital quantization effect where displacement happens in discrete, grid-aligned steps
 * rather than smooth transitions. The effect simulates low-resolution digital compression artifacts
 * by snapping transforms between preset displacement states at regular intervals.
 *
 * Features:
 * - Quantized displacement: Transforms snap between discrete states (no smooth interpolation)
 * - Grid-aligned movement: Displacement happens in multiples of gridSize parameter
 * - Pixelation effect: Uses image-rendering: pixelated and snapping scale values
 * - Digital noise overlay: Toggles grayscale() and contrast() filters for compression artifacts
 * - Configurable quantization: Control number of discrete states and grid snap distances
 *
 * Technical Implementation:
 * - Uses duplicate prog values in animation ranges to create instant snapping (no interpolation)
 * - Randomly selects from preset displacement states for each quantization block
 * - Combines transform, scale, filter, and imageRendering properties for digital artifact effect
 * - Effect type: Generic (AnimationRange[])
 *
 * Use cases:
 * - Retro/lo-fi digital aesthetics
 * - Glitch art and compression artifact simulations
 * - 8-bit/pixel art style animations
 * - Digital noise and distortion effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData, AnimationRange } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the quantized displacement effect'),
  gridSize: z
    .number()
    .min(8)
    .max(64)
    .default(32)
    .describe('Grid size in pixels - determines displacement snap distances'),
  quantizationSteps: z
    .number()
    .min(4)
    .max(16)
    .default(8)
    .describe('Number of discrete quantization blocks/states in the timeline'),
  pixelationAmount: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Scale variation amount for pixelation effect (0 = none, 0.2 = max)'),
  duration: z
    .number()
    .optional()
    .default(1600)
    .describe('Total duration of the effect in milliseconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    gridSize,
    quantizationSteps,
    pixelationAmount,
    duration,
  } = params;

  // Convert duration from milliseconds to seconds
  const durationSeconds = (duration ?? 1600) / 1000;

  // Helper: Generate quantized transform ranges with instant snapping
  const generateQuantizedTransforms = (
    gridSizeParam: number,
    steps: number,
  ): AnimationRange[] => {
    // Preset displacement states (grid-aligned)
    const displacementStates = [
      { x: 0, y: 0 },
      { x: gridSizeParam, y: 0 },
      { x: -gridSizeParam, y: 0 },
      { x: 0, y: gridSizeParam * 0.75 },
      { x: 0, y: -gridSizeParam * 0.75 },
      { x: gridSizeParam, y: gridSizeParam * 0.75 },
      { x: -gridSizeParam, y: gridSizeParam * 0.75 },
      { x: gridSizeParam, y: -gridSizeParam * 0.75 },
      { x: -gridSizeParam, y: -gridSizeParam * 0.75 },
    ];

    const ranges: AnimationRange[] = [];
    const progressStep = 1 / steps;

    for (let i = 0; i < steps; i++) {
      const prog = i * progressStep;
      // Randomly select displacement state
      const state =
        displacementStates[
          Math.floor(Math.random() * displacementStates.length)
        ];

      // Instant transition: duplicate prog values
      // First keyframe: transition TO this state
      ranges.push({
        key: 'transform',
        val: `translate(${state.x}px, ${state.y}px)`,
        prog: prog,
      });

      // Second keyframe: HOLD this state (same prog as next block start)
      if (i < steps - 1) {
        ranges.push({
          key: 'transform',
          val: `translate(${state.x}px, ${state.y}px)`,
          prog: (i + 1) * progressStep,
        });
      } else {
        // Final state holds until end
        ranges.push({
          key: 'transform',
          val: `translate(${state.x}px, ${state.y}px)`,
          prog: 1,
        });
      }
    }

    return ranges;
  };

  // Helper: Generate pixelated scale ranges with snapping
  const generatePixelatedScale = (amount: number): AnimationRange[] => {
    const steps = quantizationSteps;
    const ranges: AnimationRange[] = [];
    const progressStep = 1 / steps;

    const scaleMin = 1 - amount;
    const scaleMax = 1 + amount;

    for (let i = 0; i < steps; i++) {
      const prog = i * progressStep;
      // Randomly snap between scaleMin and scaleMax
      const scaleValue = Math.random() > 0.5 ? scaleMax : scaleMin;

      // Instant snap: duplicate prog values
      ranges.push({
        key: 'scale',
        val: scaleValue,
        prog: prog,
      });

      if (i < steps - 1) {
        ranges.push({
          key: 'scale',
          val: scaleValue,
          prog: (i + 1) * progressStep,
        });
      } else {
        ranges.push({
          key: 'scale',
          val: scaleValue,
          prog: 1,
        });
      }
    }

    return ranges;
  };

  // Generate animation ranges
  const transformRanges = generateQuantizedTransforms(
    gridSize,
    quantizationSteps,
  );
  const scaleRanges = generatePixelatedScale(pixelationAmount);

  // Digital noise filter ranges (quantized toggle between states)
  const filterRanges: AnimationRange[] = [
    { key: 'filter', val: 'grayscale(0%) contrast(100%)', prog: 0 },
    { key: 'filter', val: 'grayscale(0%) contrast(100%)', prog: 0.124 },
    { key: 'filter', val: 'grayscale(20%) contrast(110%)', prog: 0.125 },
    { key: 'filter', val: 'grayscale(20%) contrast(110%)', prog: 0.249 },
    { key: 'filter', val: 'grayscale(0%) contrast(90%)', prog: 0.25 },
    { key: 'filter', val: 'grayscale(0%) contrast(90%)', prog: 0.374 },
    { key: 'filter', val: 'grayscale(10%) contrast(105%)', prog: 0.375 },
    { key: 'filter', val: 'grayscale(10%) contrast(105%)', prog: 0.499 },
    { key: 'filter', val: 'grayscale(0%) contrast(100%)', prog: 0.5 },
    { key: 'filter', val: 'grayscale(0%) contrast(100%)', prog: 0.624 },
    { key: 'filter', val: 'grayscale(15%) contrast(95%)', prog: 0.625 },
    { key: 'filter', val: 'grayscale(15%) contrast(95%)', prog: 0.749 },
    { key: 'filter', val: 'grayscale(0%) contrast(100%)', prog: 0.75 },
    { key: 'filter', val: 'grayscale(0%) contrast(100%)', prog: 1 },
  ];

  // Image rendering ranges (pixelated CSS property)
  const imageRenderingRanges: AnimationRange[] = [
    { key: 'imageRendering', val: 'pixelated', prog: 0 },
    { key: 'imageRendering', val: 'pixelated', prog: 1 },
  ];

  // Combine all ranges
  const allRanges: AnimationRange[] = [
    ...transformRanges,
    ...scaleRanges,
    ...filterRanges,
    ...imageRenderingRanges,
  ];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for instant snapping (no easing)
    start: 0,
    duration: durationSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: allRanges,
  };

  // Create effect object
  const effect = {
    id: `quantized-displace-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'quantized-displace-effect-container',
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
        duration: durationSeconds,
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
  id: 'QuantizedDisplace',
  title: 'QuantizedDisplace Effect',
  description:
    'Internal effect preset that creates a digital quantization effect with discrete, grid-aligned displacement steps. Simulates low-resolution digital compression artifacts using snapping transforms, pixelation, and digital noise overlay.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'quantized', 'digital', 'pixelation', 'compression', 'lo-fi'],
  defaultInputParams: {
    targetIds: ['component-1'],
    gridSize: 32,
    quantizationSteps: 8,
    pixelationAmount: 0.05,
    duration: 1600,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const QuantizedDisplacePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
