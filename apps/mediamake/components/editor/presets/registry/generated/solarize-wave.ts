/**
 * Solarize Wave Internal Effect Preset
 *
 * This internal effect preset creates a psychedelic solarization effect with animated threshold values,
 * producing partial color inversions that wave through the image/video like a scanner.
 *
 * Features:
 * - **Solarization Effect**: Uses CSS filter combinations (invert, contrast, hue-rotate) to create psychedelic color inversions
 * - **Animated Thresholds**: Oscillating brightness thresholds create dynamic partial inversions
 * - **Scanning Wave**: Visible gradient mask travels across the element horizontally
 * - **Color Shifting**: Secondary color curves shift hues toward complementary palettes
 * - **Customizable Parameters**: Wave speed, solarization intensity, threshold range, and color shift amount
 *
 * Use cases:
 * - Creating psychedelic visual effects for music videos
 * - Adding retro/glitch effects to video content
 * - Building dynamic color inversion transitions
 * - Creating scanning/wipe effects with color manipulation
 *
 * Technical Implementation:
 * - Returns TWO effects:
 *   1. Solarization filter effect (generic) - animates CSS filter properties through keyframe ranges
 *   2. Scanner wave effect (generic) - animates translateX for visible gradient mask movement
 * - Both effects use mode: 'provider' with targetIds
 * - Effect durations calculated from waveSpeed parameter
 * - Solarization intensity, threshold range, and color shift control the filter animation ranges
 *
 * ARRAY OF EFFECTS: Returns two effects that must be extracted and applied to target components
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  waveSpeed: z
    .number()
    .min(500)
    .max(10000)
    .default(2000)
    .describe('Duration of one wave cycle in milliseconds (default: 2000ms = 2s)'),
  solarizeIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of the solarization effect (0-1, default: 0.7)'),
  thresholdMin: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Minimum inversion threshold (0-1, default: 0.3)'),
  thresholdMax: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Maximum inversion threshold (0-1, default: 0.8)'),
  colorShift: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .describe('Hue rotation amount in degrees for color shift (0-360, default: 180)'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the solarize wave effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .optional()
    .describe('Duration of the effect in seconds (optional, defaults to waveSpeed cycles)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert waveSpeed from milliseconds to seconds
  const waveSpeedSeconds = params.waveSpeed / 1000;
  const effectDuration = params.effectDuration ?? waveSpeedSeconds * 2; // Default to 2 wave cycles

  // Calculate interpolated invert values based on intensity
  const minInvert = params.thresholdMin * params.solarizeIntensity;
  const maxInvert = params.thresholdMax * params.solarizeIntensity;
  const midInvert = (minInvert + maxInvert) / 2;

  // Calculate contrast values (inverse relationship with invert for psychedelic effect)
  const maxContrast = 2.0;
  const minContrast = 0.5;
  const midContrast = 1.5;

  // Create solarization filter effect with oscillating values
  const solarizeEffectData: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      // Start state
      {
        key: 'filter',
        val: `invert(${minInvert}) contrast(${maxContrast}) hue-rotate(0deg)`,
        prog: 0,
      },
      // Peak state (midpoint)
      {
        key: 'filter',
        val: `invert(${maxInvert}) contrast(${minContrast}) hue-rotate(${params.colorShift}deg)`,
        prog: 0.5,
      },
      // Return to start state (full cycle)
      {
        key: 'filter',
        val: `invert(${minInvert}) contrast(${maxContrast}) hue-rotate(${params.colorShift * 2}deg)`,
        prog: 1,
      },
    ],
  };

  // Create scanner wave overlay container with gradient
  const scannerOverlayId = `${params.effectId || 'solarize-wave'}-scanner-overlay`;

  // Create translateX effect for the scanner wave
  const scannerWaveEffectData: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: waveSpeedSeconds,
    mode: 'provider',
    targetIds: [scannerOverlayId],
    ranges: [
      { key: 'translateX', val: '0%', prog: 0 },
      { key: 'translateX', val: '100%', prog: 1 },
    ],
  };

  // Create the two effects
  const solarizeEffect = {
    id: `${params.effectId || 'solarize-wave'}-filter-effect`,
    componentId: 'generic',
    data: solarizeEffectData,
  };

  const scannerWaveEffect = {
    id: `${params.effectId || 'solarize-wave'}-scanner-effect`,
    componentId: 'generic',
    data: scannerWaveEffectData,
  };

  // Build the scanner overlay component
  const scannerOverlay: RenderableComponentData = {
    id: scannerOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 10%, transparent 20%)',
          width: '200%',
          left: '-100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [scannerWaveEffect],
    childrenData: [],
  };

  // Return output with both effects in a container structure
  return {
    output: {
      childrenData: [
        {
          id: `${params.effectId || 'solarize-wave'}-effect-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                overflow: 'hidden',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
            },
          },
          effects: [solarizeEffect],
          childrenData: [scannerOverlay],
        } as RenderableComponentData,
      ] as RenderableComponentData[],
      // Expose effects for extraction
      _extractedEffects: [solarizeEffect, scannerWaveEffect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'solarize-wave',
  title: 'Solarize Wave Effect',
  description:
    'Internal effect preset that creates a solarization effect with animated threshold values, producing psychedelic partial color inversions. The effect waves through the target element like a scanner, inverting colors based on brightness thresholds that oscillate. Includes secondary color curves that shift hues toward complementary palettes. The scanning wave is visible as a subtle gradient mask traveling across the element.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'solarize', 'psychedelic', 'wave', 'scanner', 'color-inversion'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    waveSpeed: 2000,
    solarizeIntensity: 0.7,
    thresholdMin: 0.3,
    thresholdMax: 0.8,
    colorShift: 180,
    targetIds: ['component-1'],
    effectStart: 0,
  },
};

export const solarizeWavePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
