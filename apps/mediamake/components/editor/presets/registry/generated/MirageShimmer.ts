/**
 * MirageShimmer Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates a shimmering, color-shifting effect reminiscent of desert mirages with overlapping
 * animation cycles. Returns multiple generic effects targeting hue-rotate, brightness, contrast,
 * and opacity properties with different cycle durations to create complex, non-repeating patterns.
 *
 * Features:
 * - Hue rotation cycling through full spectrum with ease-in-out easing
 * - Brightness oscillation between configurable bounds
 * - Contrast shifting for depth variation
 * - Subtle opacity fade creating ghosting effect
 * - Non-synchronized cycle durations for organic, evolving appearance
 * - Configurable speed, intensity, and fade parameters
 *
 * Use cases:
 * - Heat haze and mirage effects for desert/summer scenes
 * - Mystical or dreamlike visual treatments
 * - Energy field or aura effects
 * - Psychedelic color-shifting backgrounds
 * - Atmospheric visual storytelling elements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the shimmer effect to'),
  shimmerSpeed: z
    .number()
    .default(3000)
    .describe('Base speed of shimmer cycle in milliseconds'),
  colorShiftRange: z
    .number()
    .default(180)
    .describe('Range of hue rotation in degrees (0-360)'),
  brightnessVariance: z
    .number()
    .default(0.1)
    .describe('Amount of brightness variation (e.g., 0.1 = ±10%)'),
  fadeIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.05)
    .describe('Intensity of opacity fade effect (0-1, 0 = no fade)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    shimmerSpeed,
    colorShiftRange,
    brightnessVariance,
    fadeIntensity,
  } = params;

  // Convert shimmerSpeed from milliseconds to seconds
  const baseSpeed = shimmerSpeed / 1000;

  // Calculate brightness range based on variance
  const brightnessMin = 0.9 + (0.1 - brightnessVariance);
  const brightnessMax = 1.1 - (0.1 - brightnessVariance);

  // Calculate contrast range
  const contrastMin = 0.95;
  const contrastMax = 1.05;

  // Calculate opacity range based on fade intensity
  const opacityMin = 1 - fadeIntensity;
  const opacityMax = 1;

  // Effect 1: Hue rotation with 6 keyframes (full cycle)
  const hueRotateEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: baseSpeed,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'filter', val: `hue-rotate(0deg)`, prog: 0 },
      {
        key: 'filter',
        val: `hue-rotate(${colorShiftRange * 0.2}deg)`,
        prog: 0.2,
      },
      {
        key: 'filter',
        val: `hue-rotate(${colorShiftRange * 0.4}deg)`,
        prog: 0.4,
      },
      {
        key: 'filter',
        val: `hue-rotate(${colorShiftRange * 0.6}deg)`,
        prog: 0.6,
      },
      {
        key: 'filter',
        val: `hue-rotate(${colorShiftRange * 0.8}deg)`,
        prog: 0.8,
      },
      { key: 'filter', val: `hue-rotate(${colorShiftRange}deg)`, prog: 1 },
    ],
  };

  // Effect 2: Brightness oscillation (1.2x base speed)
  const brightnessEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: baseSpeed * 1.2,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'brightness', val: brightnessMin, prog: 0 },
      { key: 'brightness', val: brightnessMax, prog: 0.5 },
      { key: 'brightness', val: brightnessMin, prog: 1 },
    ],
  };

  // Effect 3: Contrast shift (0.8x base speed)
  const contrastEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: baseSpeed * 0.8,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'contrast', val: contrastMin, prog: 0 },
      { key: 'contrast', val: contrastMax, prog: 0.5 },
      { key: 'contrast', val: contrastMin, prog: 1 },
    ],
  };

  // Effect 4: Opacity fade (1.5x base speed)
  const opacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: baseSpeed * 1.5,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'opacity', val: opacityMin, prog: 0 },
      { key: 'opacity', val: opacityMax, prog: 0.33 },
      { key: 'opacity', val: opacityMin, prog: 0.66 },
      { key: 'opacity', val: opacityMax, prog: 1 },
    ],
  };

  // Create effect nodes
  const effects = [
    {
      id: `mirage-hue-${targetIds.join('-')}`,
      componentId: 'generic',
      data: hueRotateEffect,
    },
    {
      id: `mirage-brightness-${targetIds.join('-')}`,
      componentId: 'generic',
      data: brightnessEffect,
    },
    {
      id: `mirage-contrast-${targetIds.join('-')}`,
      componentId: 'generic',
      data: contrastEffect,
    },
    {
      id: `mirage-opacity-${targetIds.join('-')}`,
      componentId: 'generic',
      data: opacityEffect,
    },
  ];

  return {
    output: {
      childrenData: [
        {
          id: 'mirage-shimmer-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                opacity: 0,
                display: 'none',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
          effects: effects,
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'MirageShimmer',
  title: 'Mirage Shimmer Effect',
  description:
    'Internal effect preset that generates shimmering color-shifting effects with hue-rotate, brightness, contrast, and opacity animations in overlapping cycles. Returns effect objects for attachment to target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'shimmer', 'color-shift', 'mirage', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    shimmerSpeed: 3000,
    colorShiftRange: 180,
    brightnessVariance: 0.1,
    fadeIntensity: 0.05,
  },
};

export const MirageShimmerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
