/**
 * VHS Glitch Distortion Effect
 *
 * SINGLE EFFECT (INTERNAL):
 * This internal effect preset simulates VHS tracking errors through horizontal displacement
 * glitches and RGB channel separation. It creates sudden horizontal shifts combined with
 * chromatic aberration using deterministic but random-looking keyframe progressions.
 *
 * Features:
 * - Horizontal displacement glitches with sudden jumps
 * - RGB channel separation using CSS filter drop-shadows
 * - Deterministic random-looking keyframe patterns
 * - Subtle constant horizontal jitter throughout
 * - Configurable intensity, frequency, and color separation
 *
 * Technical Details:
 * - Effect type: generic (AnimationRange[])
 * - Properties: translateX (range: -50px to 50px), filter (multiple drop-shadows for RGB split)
 * - Mode: provider (applies directly to target components)
 * - Keyframe progression: Uses irregular intervals (0, 0.15, 0.16, 0.35, 0.36, 0.8, 0.81, 1) for unpredictable tracking errors
 *
 * Use Cases:
 * - VHS tape aesthetic effects
 * - Retro video glitch animations
 * - Digital corruption effects
 * - Nostalgic tracking error simulations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the VHS glitch effect to'),
  duration: z
    .number()
    .default(2000)
    .optional()
    .describe('Effect duration in milliseconds (default: 2000)'),
  start: z
    .number()
    .default(0)
    .optional()
    .describe('Effect start time in milliseconds (default: 0)'),
  intensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe(
      'Glitch intensity 0-1 (default: 0.7) - controls horizontal displacement amplitude',
    ),
  frequency: z
    .number()
    .default(4)
    .optional()
    .describe('Glitch frequency - number of glitch events (default: 4)'),
  colorSeparation: z
    .number()
    .default(3)
    .optional()
    .describe('RGB separation distance in pixels (default: 3)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const intensity = params.intensity ?? 0.7;
  const colorSeparation = params.colorSeparation ?? 3;
  const duration = (params.duration ?? 2000) / 1000; // Convert to seconds
  const start = (params.start ?? 0) / 1000; // Convert to seconds

  // Calculate glitch displacement amount
  const glitchAmount = intensity * 50; // Range: 0-50px

  // Calculate color separation with intensity
  const redShift = colorSeparation * intensity;
  const cyanShift = colorSeparation * intensity;
  const yellowShift = (colorSeparation * intensity) / 2; // Smaller shift for yellow

  // Helper function to generate jitter values (deterministic but random-looking)
  const generateJitterValue = (index: number): number => {
    // Use simple deterministic formula for "random-looking" but repeatable jitter
    const seed = index * 7919; // Prime number for better distribution
    const normalized = (seed % 100) / 50 - 1; // Range: -1 to 1
    return normalized * 2; // Range: -2px to 2px
  };

  // --- Main Glitch Effect (Horizontal Shifts + RGB Split) ---

  const glitchEffect = {
    id: `vhs-glitch-main-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: start,
      duration: duration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: [
        // Horizontal displacement with sudden jumps
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 0, prog: 0.15 },
        { key: 'translateX', val: glitchAmount, prog: 0.16 }, // Sudden jump right
        { key: 'translateX', val: glitchAmount, prog: 0.35 },
        { key: 'translateX', val: -glitchAmount, prog: 0.36 }, // Sudden jump left
        { key: 'translateX', val: -glitchAmount, prog: 0.8 },
        { key: 'translateX', val: 0, prog: 0.81 }, // Return to normal
        { key: 'translateX', val: 0, prog: 1 },

        // RGB channel separation using drop-shadows
        {
          key: 'filter',
          val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan) drop-shadow(0px 0 0 yellow)',
          prog: 0,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan) drop-shadow(0px 0 0 yellow)',
          prog: 0.15,
        },
        {
          key: 'filter',
          val: `drop-shadow(${redShift}px 0 0 red) drop-shadow(-${cyanShift}px 0 0 cyan) drop-shadow(0 ${yellowShift}px 0 yellow)`,
          prog: 0.16,
        },
        {
          key: 'filter',
          val: `drop-shadow(${redShift}px 0 0 red) drop-shadow(-${cyanShift}px 0 0 cyan) drop-shadow(0 ${yellowShift}px 0 yellow)`,
          prog: 0.35,
        },
        {
          key: 'filter',
          val: `drop-shadow(-${redShift}px 0 0 red) drop-shadow(${cyanShift}px 0 0 cyan) drop-shadow(0 -${yellowShift}px 0 yellow)`,
          prog: 0.36,
        },
        {
          key: 'filter',
          val: `drop-shadow(-${redShift}px 0 0 red) drop-shadow(${cyanShift}px 0 0 cyan) drop-shadow(0 -${yellowShift}px 0 yellow)`,
          prog: 0.8,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan) drop-shadow(0px 0 0 yellow)',
          prog: 0.81,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan) drop-shadow(0px 0 0 yellow)',
          prog: 1,
        },
      ],
    } as GenericEffectData,
  };

  // --- Subtle Constant Jitter Effect ---

  const jitterProgression = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  const jitterValues = jitterProgression.map((prog, index) => ({
    key: 'translateX',
    val: generateJitterValue(index),
    prog: prog,
  }));

  const jitterEffect = {
    id: `vhs-glitch-jitter-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: start,
      duration: duration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: jitterValues,
    } as GenericEffectData,
  };

  // --- Return Output ---

  const rootContainer: RenderableComponentData = {
    id: 'vhs-glitch-distortion-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: [glitchEffect, jitterEffect],
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
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'vhsGlitchDistortion',
  title: 'VHS Glitch Distortion Effect',
  description:
    'Internal effect preset that simulates VHS tracking errors through horizontal displacement glitches and RGB channel separation. Returns a generic effect with sudden horizontal shifts, chromatic aberration, and deterministic random-looking glitches. Includes subtle constant jitter throughout.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'vhs', 'distortion', 'rgb-split', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['target-component'],
    duration: 2000,
    start: 0,
    intensity: 0.7,
    frequency: 4,
    colorSeparation: 3,
  },
};

// --- Export ---

export const vhsGlitchDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
