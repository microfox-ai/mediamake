/**
 * Signal Loss Effect - Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Simulates complete VHS signal dropout and recovery with multiple stages:
 * normal → interference → complete loss → static recovery → normal.
 *
 * This internal effect preset applies a complex multi-stage animation combining:
 * - Opacity transitions (fade to black during signal loss)
 * - Grayscale filters (color loss during interference)
 * - Contrast and brightness manipulation (simulating static and distortion)
 *
 * The effect progresses through normalized keyframes (prog values from 0 to 1):
 * - Normal (0): Full opacity, no filters
 * - Interference (0.15): Slight desaturation begins
 * - Intensifying interference (0.3): Heavy grayscale with high contrast
 * - Complete signal loss (0.4): Zero brightness (black screen)
 * - Static recovery begins (0.6): Low contrast grayscale (white noise simulation)
 * - Distortion artifacts (0.85): Partial recovery with slight desaturation
 * - Full recovery (1.0): Complete return to normal
 *
 * Use cases:
 * - Creating VHS tape damage effects
 * - Simulating broadcast signal interruption
 * - Adding glitch/distortion transitions between scenes
 * - Retro analog media aesthetic effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the signal loss effect to'),
  dropoutDuration: z
    .number()
    .min(0.5)
    .default(3)
    .describe('Total duration of the complete dropout cycle in seconds'),
  recoveryTime: z
    .number()
    .min(0.1)
    .default(1)
    .describe(
      'Duration of the recovery phase (from static to normal) in seconds',
    ),
  severity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe(
      'Severity of signal loss (0 = mild interference, 1 = complete dropout)',
    ),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect relative to parent timeline (seconds)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the generated effect'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate keyframe progress points based on timing
  const calculateProgressPoints = (
    totalDuration: number,
    recoveryDuration: number,
  ): {
    normal: number;
    interference: number;
    intensify: number;
    loss: number;
    staticRecovery: number;
    artifacts: number;
    fullRecovery: number;
  } => {
    const lossStartTime = totalDuration * 0.4;
    const recoveryStartTime = totalDuration - recoveryDuration;

    return {
      normal: 0,
      interference: 0.15,
      intensify: 0.3,
      loss: 0.4,
      staticRecovery: 0.6,
      artifacts: 0.85,
      fullRecovery: 1,
    };
  };

  // Calculate severity-based intensity values
  const calculateIntensityValues = (
    severity: number,
  ): {
    minOpacity: number;
    grayscaleIntensity: string;
    contrastBoost: number;
  } => {
    const minOpacity = 1 - severity * 1; // At max severity, opacity goes to 0
    const grayscaleIntensity = `${Math.round(severity * 100)}%`;
    const contrastBoost = 1 + severity * 1; // Max contrast boost: 200%

    return {
      minOpacity,
      grayscaleIntensity,
      contrastBoost,
    };
  };

  const duration = params.dropoutDuration;
  const recovery = params.recoveryTime;
  const severity = params.severity ?? 1;
  const effectStart = params.effectStart ?? 0;

  const prog = calculateProgressPoints(duration, recovery);
  const intensity = calculateIntensityValues(severity);

  // Construct opacity animation range
  const opacityRange = [
    { key: 'opacity', val: 1, prog: prog.normal }, // Normal
    { key: 'opacity', val: 0.8, prog: prog.interference }, // Slight fade
    { key: 'opacity', val: 0.2 * severity, prog: prog.intensify }, // Heavy fade
    {
      key: 'opacity',
      val: intensity.minOpacity * 0.05,
      prog: prog.loss,
    }, // Near-black
    { key: 'opacity', val: 0.3, prog: prog.staticRecovery }, // Static recovery
    { key: 'opacity', val: 0.9, prog: prog.artifacts }, // Almost recovered
    { key: 'opacity', val: 1, prog: prog.fullRecovery }, // Fully recovered
  ];

  // Construct filter animation range (grayscale, contrast, brightness)
  const filterRange = [
    { key: 'filter', val: 'grayscale(0%)', prog: prog.normal }, // Normal
    {
      key: 'filter',
      val: `grayscale(${Math.round(30 * severity)}%)`,
      prog: prog.interference,
    }, // Slight desaturation
    {
      key: 'filter',
      val: `grayscale(100%) contrast(${Math.round(100 + 100 * severity)}%)`,
      prog: prog.intensify,
    }, // Full grayscale + high contrast
    {
      key: 'filter',
      val: 'brightness(0)',
      prog: prog.loss,
    }, // Complete blackout
    {
      key: 'filter',
      val: `grayscale(100%) contrast(${Math.round(50 + 50 * severity)}%)`,
      prog: prog.staticRecovery,
    }, // Static/noise simulation
    {
      key: 'filter',
      val: `grayscale(${Math.round(20 * severity)}%)`,
      prog: prog.artifacts,
    }, // Partial desaturation
    { key: 'filter', val: 'grayscale(0%)', prog: prog.fullRecovery }, // Normal
  ];

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [...opacityRange, ...filterRange],
  };

  // Create the effect node
  const signalLossEffect = {
    id:
      params.effectId ||
      `signal-loss-effect-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect wrapped in a container structure
  const rootContainer: RenderableComponentData = {
    id: 'signal-loss-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: '',
      },
    },
    effects: [signalLossEffect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: [signalLossEffect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'signal-loss-effect',
  title: 'Signal Loss Effect',
  description:
    'Internal effect preset that simulates complete VHS signal dropout and recovery with multiple stages: normal → interference → complete loss → static recovery → normal. Applies opacity, grayscale, contrast, and brightness transformations to target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'vhs', 'glitch', 'signal', 'dropout', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['example-component'],
    dropoutDuration: 3,
    recoveryTime: 1,
    severity: 1,
    effectStart: 0,
  },
};

// --- Export ---

export const signalLossEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
