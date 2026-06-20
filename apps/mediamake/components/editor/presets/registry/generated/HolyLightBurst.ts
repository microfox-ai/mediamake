/**
 * HolyLightBurst Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates dramatic god ray bursts emanating from text/media centers, like divine light breaking through clouds.
 * The effect combines:
 * 1) Radial scale animations from scale(0) to scale(2) for expanding light burst
 * 2) Opacity fades creating light bloom effect (0 to 0.8 to 0)
 * 3) Multiple rotation layers spinning at different speeds for dynamic rays
 * 4) Color temperature shifts from cool (#e1f5fe) to warm (#fff9c4) simulating sunlight
 *
 * Each burst has a hold period at peak intensity before fading.
 * Uses ease-out for explosive expansion, ease-in for gentle fade.
 *
 * Advanced Usage:
 * Apply to container elements to create dramatic lighting effects around text or media.
 * Adjust burstIntensity, rayRotationSpeed, and warmthAmount for different moods.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfex/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of the components to apply the holy light burst effect to'),
  burstIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of the burst effect (0-1, controls peak opacity)'),
  rayRotationSpeed: z
    .number()
    .default(180)
    .describe('Rotation speed of rays in degrees per second'),
  bloomRadius: z
    .number()
    .default(2)
    .describe('Scale factor for the bloom expansion (higher = larger burst)'),
  warmthAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Color temperature warmth (0 = cool blue, 1 = warm yellow/white)',
    ),
  burstDuration: z
    .number()
    .default(2000)
    .describe('Duration of the burst effect in milliseconds'),
  delay: z
    .number()
    .default(0)
    .describe('Delay before the effect starts in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert duration from milliseconds to seconds
  const durationInSeconds = params.burstDuration / 1000;

  // Calculate intensity-scaled values
  const peakOpacity = 0.8 * params.burstIntensity;
  const midOpacity = peakOpacity * 0.5;

  // Calculate color progression based on warmth
  const warmth = params.warmthAmount;
  const coolColor = '#e1f5fe'; // Cool blue
  const warmColor = '#fff9c4'; // Warm yellow
  const hotColor = '#ffffff'; // White hot

  // Helper function to interpolate colors (simplified RGB mixing)
  const interpolateColor = (
    color1: string,
    color2: string,
    factor: number,
  ): string => {
    // Simple hex to RGB conversion
    const hex2rgb = (hex: string) => {
      const bigint = parseInt(hex.slice(1), 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    };

    const c1 = hex2rgb(color1);
    const c2 = hex2rgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return `rgb(${r},${g},${b})`;
  };

  // Create color progression based on warmth amount
  const color1 = coolColor;
  const color2 = interpolateColor(coolColor, warmColor, warmth);
  const color3 = interpolateColor(warmColor, hotColor, warmth);
  const color4 = interpolateColor(coolColor, warmColor, warmth * 0.7);

  // Calculate rotation values based on rayRotationSpeed
  // Total rotation over duration
  const totalRotation = (params.rayRotationSpeed * durationInSeconds) / 1000;
  const rotation1 = 0;
  const rotation2 = totalRotation * 0.25;
  const rotation3 = totalRotation * 0.5;
  const rotation4 = totalRotation * 0.75;
  const rotation5 = totalRotation;

  // Create the effects array
  const effects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  // Effect 1: Scale animation (explosive expansion with hold and fade)
  const scaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: params.delay,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'scale', val: 0, prog: 0 },
      { key: 'scale', val: 1.5 * params.bloomRadius, prog: 0.3 },
      { key: 'scale', val: 2 * params.bloomRadius, prog: 0.5 },
      { key: 'scale', val: 2 * params.bloomRadius, prog: 0.7 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  effects.push({
    id: `${params.effectId || 'holy-light'}-scale`,
    componentId: 'generic',
    data: scaleEffect,
  });

  // Effect 2: Opacity fade (bloom effect with hold)
  const opacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.delay,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: peakOpacity, prog: 0.2 },
      { key: 'opacity', val: peakOpacity, prog: 0.5 },
      { key: 'opacity', val: midOpacity, prog: 0.8 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  effects.push({
    id: `${params.effectId || 'holy-light'}-opacity`,
    componentId: 'generic',
    data: opacityEffect,
  });

  // Effect 3: Rotation animation (continuous spinning)
  const rotationEffect: GenericEffectData = {
    type: 'linear',
    start: params.delay,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'rotate', val: rotation1, prog: 0 },
      { key: 'rotate', val: rotation2, prog: 0.25 },
      { key: 'rotate', val: rotation3, prog: 0.5 },
      { key: 'rotate', val: rotation4, prog: 0.75 },
      { key: 'rotate', val: rotation5, prog: 1 },
    ],
  };

  effects.push({
    id: `${params.effectId || 'holy-light'}-rotation`,
    componentId: 'generic',
    data: rotationEffect,
  });

  // Effect 4: Background color temperature shift
  const colorEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.delay,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'backgroundColor', val: color1, prog: 0 },
      { key: 'backgroundColor', val: color2, prog: 0.3 },
      { key: 'backgroundColor', val: color3, prog: 0.5 },
      { key: 'backgroundColor', val: color4, prog: 0.7 },
      { key: 'backgroundColor', val: 'transparent', prog: 1 },
    ],
  };

  effects.push({
    id: `${params.effectId || 'holy-light'}-color`,
    componentId: 'generic',
    data: colorEffect,
  });

  // Create container structure
  const rootContainer = {
    id: 'holy-light-burst-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds + 1,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'HolyLightBurst',
  title: 'Holy Light Burst',
  description:
    'Internal effect preset creating dramatic god ray bursts with radial scale animations, opacity bloom, rotation layers, and color temperature shifts from cool to warm',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'holy-light',
    'burst',
    'god-rays',
    'bloom',
    'radial',
    'rotation',
    'color-temperature',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component'],
    burstIntensity: 0.8,
    rayRotationSpeed: 180,
    bloomRadius: 2,
    warmthAmount: 0.7,
    burstDuration: 2000,
    delay: 0,
  },
};

// Export preset
export const HolyLightBurstPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
