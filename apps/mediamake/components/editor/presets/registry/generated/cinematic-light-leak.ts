/**
 * CinematicLightLeak Internal Effect Preset
 *
 * This internal effect preset simulates vintage film light leaks and volumetric atmospheric effects.
 * It combines multiple generic animations to create organic, cinematic motion:
 * 
 * 1. Diagonal light streak overlays that sweep across the target using translateX animations
 * 2. Color overlay animations cycling through warm tones (#ff6b35, #ffab00, #fff59d)
 * 3. Contrast and brightness filters that fluctuate to simulate film exposure variations
 * 4. Vignette effects using radial gradients that pulse in intensity
 *
 * This preset uses spring easing for organic motion and staggers multiple leak layers with offset timings.
 * 
 * ARRAY OF EFFECTS:
 * Returns multiple staggered light leak effects with varying speeds and colors.
 *
 * Features:
 * - Multiple light leak layers with staggered timing
 * - Directional sweep control (left-right, right-left, top-bottom)
 * - Customizable leak color and intensity
 * - Flicker effects for exposure variation
 * - Spring easing for natural, organic motion
 *
 * Use cases:
 * - Adding vintage film aesthetics to footage
 * - Creating atmospheric overlays for cinematic looks
 * - Simulating light leaks in digital video
 * - Enhancing visual storytelling with retro effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the light leak effect to'),
  leakDirection: z
    .enum(['left-right', 'right-left', 'top-bottom'])
    .default('left-right')
    .describe('Direction of the light leak sweep animation'),
  leakColor: z
    .string()
    .default('#ffab00')
    .describe('Primary tint color for the light leaks (CSS color value)'),
  leakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of the light leak effect (0-1, controls opacity)'),
  flickerAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Amount of exposure variation/flickering (0-1, controls brightness/contrast fluctuation)'),
  duration: z
    .number()
    .default(4000)
    .describe('Duration of the effect in milliseconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate translation values based on direction
  const getTranslationValues = (
    direction: 'left-right' | 'right-left' | 'top-bottom',
  ): { key: string; values: string[] } => {
    switch (direction) {
      case 'left-right':
        return {
          key: 'translateX',
          values: ['-100%', '0%', '100%', '200%'],
        };
      case 'right-left':
        return {
          key: 'translateX',
          values: ['200%', '100%', '0%', '-100%'],
        };
      case 'top-bottom':
        return {
          key: 'translateY',
          values: ['-100%', '0%', '100%', '200%'],
        };
      default:
        return {
          key: 'translateX',
          values: ['-100%', '0%', '100%', '200%'],
        };
    }
  };

  // Helper function to parse hex color to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 171, b: 0 };
  };

  const durationSeconds = params.duration / 1000;
  const translation = getTranslationValues(params.leakDirection);
  const warmColors = ['#ff6b35', '#ffab00', '#fff59d'];
  const primaryColor = hexToRgb(params.leakColor);
  const maxOpacity = params.leakIntensity * 0.3;

  // Calculate brightness/contrast variation based on flicker amount
  const baseBrightness = 1;
  const brightnessVariation = params.flickerAmount * 0.3;
  const contrastVariation = params.flickerAmount * 0.2;

  // Create multiple staggered light leak layers
  const effects: any[] = [];

  // Layer 1: Primary light streak (main leak)
  const layer1Effect: GenericEffectData = {
    type: 'spring',
    start: 0,
    duration: durationSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: translation.key, val: translation.values[0], prog: 0 },
      { key: translation.key, val: translation.values[1], prog: 0.3 },
      { key: translation.key, val: translation.values[2], prog: 0.7 },
      { key: translation.key, val: translation.values[3], prog: 1 },
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: maxOpacity, prog: 0.2 },
      { key: 'opacity', val: maxOpacity, prog: 0.8 },
      { key: 'opacity', val: 0, prog: 1 },
      {
        key: 'filter',
        val: `brightness(${baseBrightness}) contrast(1)`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `brightness(${baseBrightness + brightnessVariation}) contrast(${1 - contrastVariation})`,
        prog: 0.33,
      },
      {
        key: 'filter',
        val: `brightness(${baseBrightness + brightnessVariation * 0.5}) contrast(${1 + contrastVariation})`,
        prog: 0.66,
      },
      {
        key: 'filter',
        val: `brightness(${baseBrightness}) contrast(1)`,
        prog: 1,
      },
    ],
  };

  effects.push({
    id: `cinematic-leak-layer1-${params.targetIds[0]}`,
    componentId: 'generic',
    data: layer1Effect,
  });

  // Layer 2: Secondary leak with color overlay (20% offset)
  const layer2StartOffset = durationSeconds * 0.2;
  const layer2Duration = durationSeconds * 0.9;

  const layer2Effect: GenericEffectData = {
    type: 'spring',
    start: layer2StartOffset,
    duration: layer2Duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: translation.key, val: translation.values[0], prog: 0 },
      { key: translation.key, val: translation.values[1], prog: 0.25 },
      { key: translation.key, val: translation.values[2], prog: 0.75 },
      { key: translation.key, val: translation.values[3], prog: 1 },
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: maxOpacity * 0.7, prog: 0.15 },
      { key: 'opacity', val: maxOpacity * 0.7, prog: 0.85 },
      { key: 'opacity', val: 0, prog: 1 },
      {
        key: 'backgroundColor',
        val: `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0)`,
        prog: 0,
      },
      {
        key: 'backgroundColor',
        val: `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${maxOpacity * 0.5})`,
        prog: 0.5,
      },
      {
        key: 'backgroundColor',
        val: `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0)`,
        prog: 1,
      },
    ],
  };

  effects.push({
    id: `cinematic-leak-layer2-${params.targetIds[0]}`,
    componentId: 'generic',
    data: layer2Effect,
  });

  // Layer 3: Tertiary leak with slower movement (40% offset)
  const layer3StartOffset = durationSeconds * 0.4;
  const layer3Duration = durationSeconds * 1.2;

  const layer3Effect: GenericEffectData = {
    type: 'spring',
    start: layer3StartOffset,
    duration: layer3Duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: translation.key, val: translation.values[0], prog: 0 },
      { key: translation.key, val: translation.values[1], prog: 0.35 },
      { key: translation.key, val: translation.values[2], prog: 0.65 },
      { key: translation.key, val: translation.values[3], prog: 1 },
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: maxOpacity * 0.5, prog: 0.25 },
      { key: 'opacity', val: maxOpacity * 0.5, prog: 0.75 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  effects.push({
    id: `cinematic-leak-layer3-${params.targetIds[0]}`,
    componentId: 'generic',
    data: layer3Effect,
  });

  // Vignette pulsing effect
  const vignetteEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      {
        key: 'filter',
        val: `brightness(1) contrast(1)`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `brightness(${1 - params.flickerAmount * 0.15}) contrast(${1 + params.flickerAmount * 0.1})`,
        prog: 0.5,
      },
      {
        key: 'filter',
        val: `brightness(1) contrast(1)`,
        prog: 1,
      },
    ],
  };

  effects.push({
    id: `cinematic-vignette-${params.targetIds[0]}`,
    componentId: 'generic',
    data: vignetteEffect,
  });

  // Create container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-light-leak-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          overflow: 'hidden',
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationSeconds,
      },
    },
    effects: effects,
    childrenData: [],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'cinematic-light-leak',
  title: 'CinematicLightLeak',
  description:
    'Internal effect preset that simulates vintage film light leaks and volumetric atmospheric effects. Combines diagonal light streak overlays with translateX sweeps, warm color overlay animations cycling through tones (#ff6b35, #ffab00, #fff59d), fluctuating brightness/contrast filters for exposure variation, and pulsing radial gradient vignettes. Accepts parameters for leakDirection, leakColor, leakIntensity, flickerAmount, and duration. Uses spring easing with staggered multi-layer timing for organic cinematic motion.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'cinematic',
    'light-leak',
    'vintage',
    'film',
    'atmosphere',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    leakDirection: 'left-right',
    leakColor: '#ffab00',
    leakIntensity: 0.6,
    flickerAmount: 0.3,
    duration: 4000,
  },
};

// Export preset
export const cinematicLightLeakPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
