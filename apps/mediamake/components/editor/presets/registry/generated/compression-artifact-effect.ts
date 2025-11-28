/**
 * Compression Artifact Effect
 *
 * This preset creates a realistic video compression artifact effect that mimics
 * low-quality video compression with blocky, pixelated distortions. It combines
 * scale snapping (rounds to nearest 0.05), contrast manipulation (50%-150%),
 * saturation drops (0%-100%), and optional blur to create distinct 'macro blocks'
 * typical of heavy compression.
 *
 * Features:
 * - **Scale Snapping**: Rounds scale to nearest 0.05 (1.0, 1.05, 0.95) for blocky effect
 * - **Contrast Manipulation**: Random contrast shifts between 50%-150%
 * - **Saturation Drops**: Desaturation effect from 0%-100%
 * - **Custom Blur**: Variable blur intensity for pixelation
 * - **Block Size Control**: Adjustable granularity for macro block effect
 * - **Quality Degradation**: Controls overall intensity of compression artifacts
 * - **Color Banding**: Optional posterization effect for reduced color depth
 *
 * Use cases:
 * - Creating retro/glitch aesthetic effects
 * - Simulating low-bandwidth video streaming
 * - Adding distressed/degraded video looks
 * - Creating VHS or digital compression artifacts
 * - Building transition effects with compression distortion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .default([])
    .describe('Array of component IDs to apply compression effect to'),
  duration: z
    .number()
    .min(0.1)
    .default(1)
    .describe('Duration of the compression effect in seconds'),
  blockSize: z
    .number()
    .min(1)
    .max(50)
    .default(8)
    .describe(
      'Size of macro blocks in pixels - higher values create larger blocky artifacts',
    ),
  qualityDegradation: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'Overall quality degradation level (0 = minimal artifacts, 1 = heavy compression)',
    ),
  colorBanding: z
    .boolean()
    .default(true)
    .describe(
      'Enable color banding effect to simulate reduced color depth (posterization)',
    ),
  contrastRange: z
    .object({
      min: z.number().min(0).max(200).default(50),
      max: z.number().min(0).max(200).default(150),
    })
    .optional()
    .describe(
      'Custom contrast range in percentage (default: 50%-150%). Values represent CSS contrast filter values.',
    ),
  saturationRange: z
    .object({
      min: z.number().min(0).max(100).default(0),
      max: z.number().min(0).max(100).default(100),
    })
    .optional()
    .describe(
      'Custom saturation range in percentage (default: 0%-100%). Lower values create more desaturation.',
    ),
  blurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(3)
    .describe(
      'Maximum blur intensity in pixels - creates pixelation effect when combined with scale snapping',
    ),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect relative to parent component (seconds)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate stepped progression for compression artifacts
  const createSteppedRanges = (
    keyName: string,
    values: number[],
    progs: number[],
  ) => {
    return values.map((val, idx) => ({
      key: keyName,
      val,
      prog: progs[idx],
    }));
  };

  // Calculate degradation-based parameters
  const degradation = params.qualityDegradation;
  const contrastMin = params.contrastRange?.min ?? 50;
  const contrastMax = params.contrastRange?.max ?? 150;
  const saturationMin = params.saturationRange?.min ?? 0;
  const saturationMax = params.saturationRange?.max ?? 100;

  // Scale values snapped to 0.05 increments (1.0, 1.05, 0.95, etc.)
  const scaleValues = [1.0, 1.05, 1.0, 0.95, 1.0];
  const scaleProgs = [0, 0.25, 0.5, 0.75, 1.0];

  // Contrast manipulation with stepped progressions
  // Higher degradation = more extreme contrast shifts
  const contrastValues = [
    100, // Normal
    contrastMax * (0.7 + degradation * 0.3), // Boost
    contrastMin * (1 - degradation * 0.3), // Drop
    100, // Return
  ];
  const contrastProgs = [0, 0.33, 0.66, 1.0];

  // Saturation drops - higher degradation = more desaturation
  const saturationValues = [
    100, // Normal
    saturationMax * (1 - degradation * 0.5), // Slight drop
    saturationMin + (100 - saturationMin) * (1 - degradation), // Heavy drop
    100, // Return
  ];
  const saturationProgs = [0, 0.33, 0.66, 1.0];

  // Blur intensity based on blockSize and degradation
  // Creates pixelation effect when combined with scale snapping
  const maxBlur = Math.min(
    params.blurIntensity,
    params.blockSize / 2 + degradation * 5,
  );
  const blurValues = [
    0,
    maxBlur * 0.4,
    maxBlur * 0.4,
    maxBlur,
    maxBlur,
    0,
  ];
  const blurProgs = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  // Create scale snapping effect (X and Y independently for blocky distortion)
  const scaleEffect: GenericEffectData = {
    type: 'linear', // Linear for hard transitions
    start: params.effectStart,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      ...createSteppedRanges('scaleX', scaleValues, scaleProgs),
      ...createSteppedRanges(
        'scaleY',
        [1.0, 0.95, 1.05, 1.0, 1.0],
        scaleProgs,
      ),
    ],
  };

  // Create filter degradation effect (contrast + saturation)
  const filterRanges: Array<{ key: string; val: number; prog: number }> = [
    ...createSteppedRanges('contrast', contrastValues, contrastProgs),
    ...createSteppedRanges('saturate', saturationValues, saturationProgs),
  ];

  // Add color banding (posterization) if enabled
  if (params.colorBanding) {
    // Brightness shifts for banding effect
    const brightnessValues = [
      100,
      110 + degradation * 20,
      90 - degradation * 20,
      100,
    ];
    filterRanges.push(
      ...createSteppedRanges('brightness', brightnessValues, contrastProgs),
    );
  }

  const filterEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: filterRanges,
  };

  // Create blur/pixelation effect
  const blurEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: createSteppedRanges('blur', blurValues, blurProgs),
  };

  // Build effect container
  const effectContainer: RenderableComponentData = {
    id: 'compression-effect-container',
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
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'scale-snapping-effect',
        componentId: 'generic',
        data: scaleEffect,
      },
      {
        id: 'filter-degradation-effect',
        componentId: 'generic',
        data: filterEffect,
      },
      {
        id: 'pixelation-blur-effect',
        componentId: 'generic',
        data: blurEffect,
      },
    ],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [effectContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'compression-artifact-effect',
  title: 'Compression Artifact Effect',
  description:
    'Mimics low-quality video compression artifacts with blocky, pixelated distortions using scale snapping, contrast manipulation, and saturation drops. Creates distinct macro blocks typical of heavy compression.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'compression', 'glitch', 'distortion', 'degradation'],
  dependencies: {},
  defaultInputParams: {
    targetIds: ['video-component'],
    duration: 1,
    blockSize: 8,
    qualityDegradation: 0.5,
    colorBanding: true,
    contrastRange: {
      min: 50,
      max: 150,
    },
    saturationRange: {
      min: 0,
      max: 100,
    },
    blurIntensity: 3,
    effectStart: 0,
  },
};

// Export preset
export const compressionArtifactEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
