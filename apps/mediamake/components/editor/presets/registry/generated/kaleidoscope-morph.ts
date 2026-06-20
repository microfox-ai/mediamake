/**
 * Kaleidoscope Morph Effect Preset
 *
 * A combined internal effect preset that layers multiple psychedelic transformations including:
 * - Layer 1: Hue rotation (0-180deg) for complementary color inversions
 * - Layer 2: Pulsing contrast oscillation (50%-200%) with offset timing
 * - Layer 3: Slow rotation transform (0-360deg)
 *
 * Each layer operates on different timing cycles to create complex, evolving visual patterns.
 * The offset timing between layers creates a phase-shifting effect that produces mesmerizing
 * kaleidoscopic transformations.
 *
 * ARRAY OF EFFECTS:
 * Returns an array of three generic effects with different durations and easing types.
 *
 * Features:
 * - Three synchronized effect layers with independent timing
 * - Configurable morph duration, contrast intensity, and rotation speed
 * - Optional rainbow gradient overlay
 * - Phase-shifted timing creates complex evolving patterns
 * - Provider mode for clean component targeting
 *
 * Use cases:
 * - Psychedelic visual effects for music videos
 * - Attention-grabbing intro/outro sequences
 * - Abstract background transformations
 * - Creative transitions and overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the kaleidoscope effects to'),
  morphDuration: z
    .number()
    .min(1000)
    .max(60000)
    .default(6000)
    .describe(
      'Base duration for morph cycle in milliseconds (hue rotation completes in this time)',
    ),
  contrastIntensity: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe(
      'Intensity multiplier for contrast oscillation (1 = subtle, 2 = medium, 3 = extreme)',
    ),
  rotationSpeed: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.1)
    .describe(
      'Speed multiplier for rotation transform (0.1 = slow, 0.5 = medium, 1 = fast)',
    ),
  includeGradient: z
    .boolean()
    .default(false)
    .describe('Whether to include a rainbow gradient overlay effect'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  effectIds: z
    .object({
      hue: z.string().optional().describe('Custom ID for hue rotation effect'),
      contrast: z.string().optional().describe('Custom ID for contrast pulse effect'),
      rotation: z.string().optional().describe('Custom ID for rotation effect'),
      gradient: z.string().optional().describe('Custom ID for gradient overlay effect'),
    })
    .optional()
    .describe('Optional custom IDs for each effect layer'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert milliseconds to seconds for Remotion timing
  const morphDurationSec = params.morphDuration / 1000;
  const contrastDurationSec = morphDurationSec / 2; // Twice as fast
  const rotationDurationSec = morphDurationSec / params.rotationSpeed; // Inversely proportional to speed

  // Calculate contrast range based on intensity
  const minContrast = Math.max(0.5, 1 - (params.contrastIntensity - 1) * 0.25);
  const maxContrast = 1 + (params.contrastIntensity - 1) * 0.5;

  // Layer 1: Hue rotation (0-180deg) with ease-in-out
  const hueRotationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: morphDurationSec,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
      { key: 'filter', val: 'hue-rotate(180deg)', prog: 1 },
    ],
  };

  // Layer 2: Contrast pulse (50%-200%) with ease-in-out, offset timing
  const contrastPulseEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: contrastDurationSec,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'filter', val: `contrast(${minContrast})`, prog: 0 },
      { key: 'filter', val: `contrast(${maxContrast})`, prog: 0.5 },
      { key: 'filter', val: `contrast(${minContrast})`, prog: 1 },
    ],
  };

  // Layer 3: Rotation (0-360deg) linear
  const rotationEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: rotationDurationSec,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: 360, prog: 1 },
    ],
  };

  // Create effect objects with proper IDs
  const effects = [
    {
      id: params.effectIds?.hue || `kaleidoscope-hue-${params.targetIds[0]}`,
      componentId: 'generic' as const,
      data: hueRotationEffect,
    },
    {
      id: params.effectIds?.contrast || `kaleidoscope-contrast-${params.targetIds[0]}`,
      componentId: 'generic' as const,
      data: contrastPulseEffect,
    },
    {
      id: params.effectIds?.rotation || `kaleidoscope-rotation-${params.targetIds[0]}`,
      componentId: 'generic' as const,
      data: rotationEffect,
    },
  ];

  // Optional Layer 4: Rainbow gradient overlay
  if (params.includeGradient) {
    const gradientEffect: GenericEffectData = {
      type: 'linear',
      start: params.effectStart,
      duration: morphDurationSec,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: [
        {
          key: 'background',
          val: 'linear-gradient(90deg, rgba(255,0,0,0.2) 0%, rgba(255,154,0,0.2) 10%, rgba(208,222,33,0.2) 20%, rgba(79,220,74,0.2) 30%, rgba(63,218,216,0.2) 40%, rgba(47,201,226,0.2) 50%, rgba(28,127,238,0.2) 60%, rgba(95,21,242,0.2) 70%, rgba(186,12,248,0.2) 80%, rgba(251,7,217,0.2) 90%, rgba(255,0,0,0.2) 100%)',
          prog: 0,
        },
        {
          key: 'background',
          val: 'linear-gradient(90deg, rgba(255,0,0,0.2) 0%, rgba(255,154,0,0.2) 10%, rgba(208,222,33,0.2) 20%, rgba(79,220,74,0.2) 30%, rgba(63,218,216,0.2) 40%, rgba(47,201,226,0.2) 50%, rgba(28,127,238,0.2) 60%, rgba(95,21,242,0.2) 70%, rgba(186,12,248,0.2) 80%, rgba(251,7,217,0.2) 90%, rgba(255,0,0,0.2) 100%)',
          prog: 1,
        },
      ],
    };

    effects.push({
      id: params.effectIds?.gradient || `kaleidoscope-gradient-${params.targetIds[0]}`,
      componentId: 'generic' as const,
      data: gradientEffect,
    });
  }

  // Container to hold the effects (for internal preset extraction)
  const rootContainer: RenderableComponentData = {
    id: 'kaleidoscope-morph-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(morphDurationSec, contrastDurationSec, rotationDurationSec),
      },
    },
    effects: effects,
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

const presetMetadata: PresetMetadata = {
  id: 'kaleidoscope-morph',
  title: 'Kaleidoscope Morph Effect',
  description:
    'A combined internal effect preset that layers multiple psychedelic transformations including hue rotation (0-180deg), pulsing contrast oscillation (50%-200%), and slow rotation transform. Each layer operates on different timing cycles to create complex, evolving visual patterns. Accepts parameters for morph duration, contrast intensity, rotation speed, and optional rainbow gradient overlay.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'kaleidoscope', 'psychedelic', 'internal', 'generic', 'morph', 'hue', 'contrast'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    morphDuration: 6000,
    contrastIntensity: 2,
    rotationSpeed: 0.1,
    includeGradient: false,
    effectStart: 0,
  },
};

export const kaleidoscopeMorphPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
