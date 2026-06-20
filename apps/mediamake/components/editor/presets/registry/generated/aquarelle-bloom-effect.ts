/**
 * AquarelleBloomEffect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 *
 * Simulates watercolor blooming behavior on wet paper with organic expansion
 * and color bleeding at edges. Creates multi-phase animation (dot → wet expansion
 * → bloom spread → final settle) with chromatic aberration via separate RGB channel
 * transforms and brightness pulsing during the bloom phase.
 *
 * Features:
 * - Multi-phase bloom animation: initial dot (scale: 0.1) → wet expansion (scale: 0.6, blur: 12px)
 *   → bloom spread (scale: 1.2, blur: 6px) → final settle (scale: 1.0, blur: 1px)
 * - Chromatic aberration: Separate RGB channel effects with offset transforms
 * - Brightness pulse that peaks during bloom phase
 * - Configurable bloom size, wetness (blur control), bloom speed, color separation, and pulse intensity
 *
 * Technical Implementation:
 * - Returns array of 3 generic effects: main bloom, red channel, blue channel
 * - Main effect: scale + blur + brightness animation
 * - RGB separation: Red channel leads (+translateX), blue channel lags (-translateX)
 * - All animations use ease-out interpolation between phases
 * - bloomSpeed parameter acts as timing multiplier
 *
 * Use cases:
 * - Organic reveal animations
 * - Paint splash transitions
 * - Watercolor-style text/image effects
 * - Artistic video intros/outros
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the bloom effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(2)
    .describe('Total duration of the bloom effect in seconds'),
  bloomSize: z
    .number()
    .min(0.8)
    .max(1.5)
    .default(1.0)
    .describe('Maximum scale multiplier at bloom peak (0.8-1.5)'),
  wetness: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Controls blur amount - 0=no blur, 1=full blur effect (0-1)'),
  bloomSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Timing multiplier for bloom progression speed (0.5-2)'),
  colorSeparation: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Chromatic aberration amount in pixels (0-5)'),
  pulseIntensity: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.3)
    .describe('Brightness pulse intensity during bloom phase (0-0.5)'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs to ensure uniqueness'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetIds,
    effectStart,
    effectDuration,
    bloomSize,
    wetness,
    bloomSpeed,
    colorSeparation,
    pulseIntensity,
    effectIdPrefix = 'aquarelle-bloom',
  } = params;

  // Calculate phase progression based on bloomSpeed
  // Phases: dot (0) → expansion (0.2) → bloom (0.5) → settle (1.0)
  const expansionProg = 0.2 / bloomSpeed;
  const bloomProg = 0.5 / bloomSpeed;
  const settleProg = 1.0;

  // Calculate scale values
  const dotScale = 0.1;
  const expansionScale = 0.6 * bloomSize;
  const bloomScale = 1.2 * bloomSize;
  const settleScale = 1.0 * bloomSize;

  // Calculate blur values based on wetness
  const dotBlur = 0;
  const expansionBlur = 12 * wetness;
  const bloomBlur = 6 * wetness;
  const settleBlur = 1 * wetness;

  // Calculate brightness values for pulse effect
  const baseBrightness = 100; // percentage
  const peakBrightness = baseBrightness + pulseIntensity * 100;

  // Main bloom effect: scale + blur + brightness
  const mainBloomEffect: GenericEffectData = {
    type: 'ease-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Scale animation: dot → expansion → bloom → settle
      { key: 'scale', val: dotScale, prog: 0 },
      { key: 'scale', val: expansionScale, prog: expansionProg },
      { key: 'scale', val: bloomScale, prog: bloomProg },
      { key: 'scale', val: settleScale, prog: settleProg },

      // Blur animation: follows wetness pattern
      { key: 'blur', val: `${dotBlur}px`, prog: 0 },
      { key: 'blur', val: `${expansionBlur}px`, prog: expansionProg },
      { key: 'blur', val: `${bloomBlur}px`, prog: bloomProg },
      { key: 'blur', val: `${settleBlur}px`, prog: settleProg },

      // Brightness pulse: peaks during bloom phase
      { key: 'brightness', val: baseBrightness / 100, prog: 0 },
      { key: 'brightness', val: baseBrightness / 100, prog: 0.3 },
      { key: 'brightness', val: peakBrightness / 100, prog: 0.5 }, // Peak at bloom
      { key: 'brightness', val: baseBrightness / 100, prog: 0.7 },
      { key: 'brightness', val: baseBrightness / 100, prog: 1 },
    ],
  };

  // Red channel effect: leads with positive X offset
  const redChannelEffect: GenericEffectData = {
    type: 'ease-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Red channel leads ahead
      { key: 'translateX', val: colorSeparation, prog: 0 },
      { key: 'translateX', val: colorSeparation * 0.8, prog: expansionProg },
      { key: 'translateX', val: colorSeparation * 0.5, prog: bloomProg },
      { key: 'translateX', val: 0, prog: settleProg },

      // Apply red filter
      {
        key: 'filter',
        val: 'url(#red-channel-filter)',
        prog: 0,
      },
      {
        key: 'filter',
        val: 'url(#red-channel-filter)',
        prog: 1,
      },
    ],
  };

  // Blue channel effect: lags with negative X offset
  const blueChannelEffect: GenericEffectData = {
    type: 'ease-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Blue channel lags behind
      { key: 'translateX', val: -colorSeparation, prog: 0 },
      { key: 'translateX', val: -colorSeparation * 0.8, prog: expansionProg },
      { key: 'translateX', val: -colorSeparation * 0.5, prog: bloomProg },
      { key: 'translateX', val: 0, prog: settleProg },

      // Apply blue filter
      {
        key: 'filter',
        val: 'url(#blue-channel-filter)',
        prog: 0,
      },
      {
        key: 'filter',
        val: 'url(#blue-channel-filter)',
        prog: 1,
      },
    ],
  };

  // Construct effect array
  const effects = [
    {
      id: `${effectIdPrefix}-main`,
      componentId: 'generic',
      data: mainBloomEffect,
    },
    {
      id: `${effectIdPrefix}-red-channel`,
      componentId: 'generic',
      data: redChannelEffect,
    },
    {
      id: `${effectIdPrefix}-blue-channel`,
      componentId: 'generic',
      data: blueChannelEffect,
    },
  ];

  // Return output structure
  return {
    output: {
      childrenData: [
        {
          id: `${effectIdPrefix}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                zIndex: 1000,
              },
            },
          },
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
            },
          },
        },
      ],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'aquarelle-bloom-effect',
  title: 'AquarelleBloomEffect',
  description:
    'Internal effect preset simulating watercolor blooming behavior on wet paper. Creates organic expansion with color bleeding at edges through multi-phase animation (dot→expansion→bloom→settle) with chromatic aberration via separate RGB channel transforms and brightness pulsing during bloom phase. Returns generic AnimationRange[] arrays for scale, blur, brightness, and RGB channel separation effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'bloom',
    'watercolor',
    'organic',
    'chromatic-aberration',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    effectDuration: 2,
    bloomSize: 1.0,
    wetness: 1,
    bloomSpeed: 1,
    colorSeparation: 2,
    pulseIntensity: 0.3,
  },
};

// Export preset
export const aquarelleBloomEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
