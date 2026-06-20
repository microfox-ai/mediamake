/**
 * Color Gradient Wipe Effect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 * Creates a vibrant color gradient wipe transition that reveals content with animated color overlays.
 * This internal effect preset generates multiple layered effects for a spectrum color wipe animation.
 *
 * Features:
 * - Customizable color stops with position control
 * - Multiple wipe patterns (linear/radial/conic)
 * - Animated opacity transitions
 * - Color overlay shifts using blend modes
 * - Hue rotation for dynamic color flow
 * - Support for custom start/end colors
 *
 * Use cases:
 * - Adding vibrant reveals to monochrome content
 * - Creating artistic color transitions
 * - Building dynamic color-based animations
 * - Enhancing visual interest with gradient effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the wipe effect to'),
  startColor: z.string().default('#FF6B6B').describe('Starting color of the gradient'),
  endColor: z.string().default('#4ECDC4').describe('Ending color of the gradient'),
  colorStops: z.array(
    z.object({
      color: z.string().describe('Color value at this stop'),
      position: z.number().min(0).max(1).describe('Position of color stop (0-1)'),
    })
  ).default([
    { color: '#FF6B6B', position: 0 },
    { color: '#FFE66D', position: 0.33 },
    { color: '#4ECDC4', position: 0.66 },
    { color: '#A78BFA', position: 1 },
  ]).describe('Array of color stops for gradient animation'),
  wipePattern: z.enum(['linear', 'radial', 'conic']).default('linear').describe('Gradient pattern type'),
  effectStart: z.number().default(0).describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().default(2).describe('Duration of the wipe effect in seconds'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    startColor,
    endColor,
    colorStops,
    wipePattern,
    effectStart,
    effectDuration,
    effectId,
  } = params;

  // Helper function to generate gradient CSS based on pattern
  const generateGradient = (pattern: string, colors: string[]): string => {
    const colorString = colors.join(', ');
    switch (pattern) {
      case 'radial':
        return `radial-gradient(circle, ${colorString})`;
      case 'conic':
        return `conic-gradient(${colorString})`;
      case 'linear':
      default:
        return `linear-gradient(to right, ${colorString})`;
    }
  };

  // Generate gradient backgrounds for animation
  const gradientStart = generateGradient(wipePattern, [startColor, endColor]);
  const gradientMid = generateGradient(
    wipePattern,
    colorStops.map(cs => cs.color)
  );

  // Create effects array
  const effects: any[] = [];

  // Effect 1: Main opacity wipe - fades in the overlay
  const opacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.8, prog: 0.5 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  effects.push({
    id: effectId ? `${effectId}-opacity` : `color-wipe-opacity-${targetId}`,
    componentId: 'generic',
    data: opacityEffect,
  });

  // Effect 2: Hue rotation for color spectrum animation
  const hueRotateEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
      { key: 'filter', val: 'hue-rotate(180deg)', prog: 0.5 },
      { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
    ],
  };

  effects.push({
    id: effectId ? `${effectId}-hue` : `color-wipe-hue-${targetId}`,
    componentId: 'generic',
    data: hueRotateEffect,
  });

  // Effect 3: Background color animation through color stops
  const backgroundColorRanges = colorStops.map(stop => ({
    key: 'backgroundColor',
    val: stop.color,
    prog: stop.position,
  }));

  const colorStopsEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: backgroundColorRanges,
  };

  effects.push({
    id: effectId ? `${effectId}-colors` : `color-wipe-colors-${targetId}`,
    componentId: 'generic',
    data: colorStopsEffect,
  });

  // Effect 4: Scale animation for dynamic reveal
  const scaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: effectStart,
    duration: effectDuration * 0.6,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'scale', val: 0.9, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  effects.push({
    id: effectId ? `${effectId}-scale` : `color-wipe-scale-${targetId}`,
    componentId: 'generic',
    data: scaleEffect,
  });

  // Effect 5: Brightness pulse for visual interest
  const brightnessEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'filter', val: 'brightness(0.8)', prog: 0 },
      { key: 'filter', val: 'brightness(1.2)', prog: 0.5 },
      { key: 'filter', val: 'brightness(1)', prog: 1 },
    ],
  };

  effects.push({
    id: effectId ? `${effectId}-brightness` : `color-wipe-brightness-${targetId}`,
    componentId: 'generic',
    data: brightnessEffect,
  });

  // Create container with all effects
  const effectContainer: RenderableComponentData = {
    id: 'color-gradient-wipe-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [effectContainer],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'color-gradient-wipe',
  title: 'Color Gradient Wipe Effect',
  description: 'Internal effect preset that creates a vibrant color gradient wipe transition with animated color overlays. Features customizable color stops, multiple wipe patterns, and dynamic color shifts.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'color', 'gradient', 'wipe', 'transition', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    startColor: '#FF6B6B',
    endColor: '#4ECDC4',
    colorStops: [
      { color: '#FF6B6B', position: 0 },
      { color: '#FFE66D', position: 0.33 },
      { color: '#4ECDC4', position: 0.66 },
      { color: '#A78BFA', position: 1 },
    ],
    wipePattern: 'linear',
    effectStart: 0,
    effectDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const colorGradientWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
