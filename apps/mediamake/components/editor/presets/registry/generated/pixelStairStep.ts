/**
 * PixelStairStep Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a staggered pixel sorting effect where content appears to shift in rectangular blocks
 * with different timing offsets. The effect divides animation into 5 distinct phases, each affecting
 * a different 'layer' of the pixel sort, creating a 'staircase' displacement pattern.
 *
 * Phase breakdown:
 * - Phase 1: translateX from 0 to 30px (prog 0-0.2)
 * - Phase 2: translateY from 0 to -20px (prog 0.15-0.35)
 * - Phase 3: skewX from 0deg to 8deg (prog 0.3-0.5)
 * - Phase 4: translateX reverses through -40px (prog 0.45-0.75)
 * - Phase 5: normalizes all values back to 0 (prog 0.7-1.0)
 *
 * Features:
 * - Brightness filter that pulses from 100% to 130% during displacement peaks
 * - Configurable blockSize (affects displacement distances)
 * - Adjustable skewIntensity
 * - Optional reverseTiming to reverse the entire sequence
 * - Spring easing for skew effect, ease-in-out for translations
 *
 * Use cases:
 * - Creating glitch-style transitions
 * - Adding staggered reveal effects to text or images
 * - Building dynamic displacement animations
 * - Creating layered motion graphics effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  blockSize: z
    .number()
    .min(10)
    .max(200)
    .default(100)
    .describe('Base size for displacement calculations in pixels'),
  skewIntensity: z
    .number()
    .min(0)
    .max(15)
    .default(8)
    .describe('Skew transformation intensity in degrees'),
  reverseTiming: z
    .boolean()
    .default(false)
    .describe('Reverse the entire sequence timing'),
  duration: z
    .number()
    .optional()
    .describe('Effect duration in milliseconds (default: 1500)'),
  start: z
    .number()
    .optional()
    .describe('Effect start time relative to parent in milliseconds (default: 0)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for identification'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract and validate parameters
  const blockSize = params.blockSize ?? 100;
  const skewIntensity = params.skewIntensity ?? 8;
  const reverseTiming = params.reverseTiming ?? false;
  const duration = params.duration ?? 1500;
  const start = params.start ?? 0;
  const effectId =
    params.effectId || `pixelstairstep-effect-${params.targetIds.join('-')}`;

  // Helper function to reverse progress values if needed
  const getProgress = (prog: number): number => {
    return reverseTiming ? 1 - prog : prog;
  };

  // Build animation ranges according to specifications
  const translateXRange = [
    {
      key: 'translateX' as const,
      val: 0,
      prog: getProgress(0),
    },
    {
      key: 'translateX' as const,
      val: blockSize * 0.3,
      prog: getProgress(0.2),
    },
    {
      key: 'translateX' as const,
      val: blockSize * 0.3,
      prog: getProgress(0.45),
    },
    {
      key: 'translateX' as const,
      val: blockSize * -0.4,
      prog: getProgress(0.75),
    },
    {
      key: 'translateX' as const,
      val: 0,
      prog: getProgress(1),
    },
  ];

  const translateYRange = [
    {
      key: 'translateY' as const,
      val: 0,
      prog: getProgress(0),
    },
    {
      key: 'translateY' as const,
      val: 0,
      prog: getProgress(0.15),
    },
    {
      key: 'translateY' as const,
      val: blockSize * -0.2,
      prog: getProgress(0.35),
    },
    {
      key: 'translateY' as const,
      val: blockSize * -0.2,
      prog: getProgress(0.7),
    },
    {
      key: 'translateY' as const,
      val: 0,
      prog: getProgress(1),
    },
  ];

  const skewXRange = [
    {
      key: 'skewX' as const,
      val: '0deg',
      prog: getProgress(0),
    },
    {
      key: 'skewX' as const,
      val: '0deg',
      prog: getProgress(0.3),
    },
    {
      key: 'skewX' as const,
      val: `${skewIntensity}deg`,
      prog: getProgress(0.5),
    },
    {
      key: 'skewX' as const,
      val: '0deg',
      prog: getProgress(1),
    },
  ];

  const filterRange = [
    {
      key: 'filter' as const,
      val: 'brightness(100%)',
      prog: getProgress(0),
    },
    {
      key: 'filter' as const,
      val: 'brightness(130%)',
      prog: getProgress(0.25),
    },
    {
      key: 'filter' as const,
      val: 'brightness(100%)',
      prog: getProgress(0.5),
    },
    {
      key: 'filter' as const,
      val: 'brightness(120%)',
      prog: getProgress(0.6),
    },
    {
      key: 'filter' as const,
      val: 'brightness(100%)',
      prog: getProgress(1),
    },
  ];

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out', // Overall easing (translations use this)
    start: start / 1000, // Convert milliseconds to seconds
    duration: duration / 1000, // Convert milliseconds to seconds
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      ...translateXRange,
      ...translateYRange,
      ...skewXRange,
      ...filterRange,
    ],
  };

  // Create the effect node
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'pixelstairstep-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    effects: [effect],
    childrenData: [] as RenderableComponentData[],
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
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

// Preset metadata with internal preset flags
const presetMetadata: PresetMetadata = {
  id: 'pixelStairStep',
  title: 'PixelStairStep Internal Effect Preset',
  description:
    'Internal effect preset that creates a staggered pixel sorting effect with 5-phase staircase displacement pattern. Applies translateX, translateY, skewX transformations with brightness filter pulse across distinct timing phases. Supports configurable blockSize, skewIntensity, and reverseTiming parameters.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'displacement', 'pixel-sort', 'staircase', 'glitch'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    blockSize: 100,
    skewIntensity: 8,
    reverseTiming: false,
    duration: 1500,
    start: 0,
  },
};

// Export the preset
export const pixelStairStepPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
