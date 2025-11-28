/**
 * MistLayer - Atmospheric Fog Effect Internal Preset
 *
 * This internal effect preset creates atmospheric transparency effects mimicking fog or mist layers.
 * It generates multiple depth layers with synchronized opacity, blur, and brightness animations.
 * Each layer has depth-based transparency values calculated from mistDensity and layer index.
 * Supports windEffect for horizontal drift animation.
 *
 * Features:
 * - Multiple depth layers (1-5 layers) with varying transparency
 * - Depth-based opacity: mistDensity * (1 - index * 0.2)
 * - Progressive blur: blurProgression * index
 * - Brightness adjustment: 1 + brightnessShift * (1 - index * 0.1)
 * - Optional wind effect (horizontal drift)
 * - Synchronized fade-in pattern for all layers
 *
 * Returns: AnimationRange[] effects (opacity, blur, brightness, translateX)
 * Output type: 'effects' (multiple effects per target)
 *
 * Use cases:
 * - Atmospheric overlays in videos
 * - Dreamy text effects with layered mist
 * - Soft image transitions with overlapping semi-transparent elements
 * - Creating depth and atmosphere in compositions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  mistDensity: z
    .number()
    .min(0.1)
    .max(0.9)
    .describe('Overall opacity level of mist layers (0.1-0.9)'),
  layerDepth: z
    .number()
    .min(1)
    .max(5)
    .describe('Number of depth layers to create (1-5)'),
  blurProgression: z
    .number()
    .min(0)
    .max(10)
    .describe('How blur increases with depth (0-10px per layer)'),
  brightnessShift: z
    .number()
    .min(-0.5)
    .max(0.5)
    .describe('Lighting adjustment per layer (-0.5 to 0.5)'),
  windEffect: z
    .boolean()
    .describe('Enable horizontal drift animation for wind effect'),
  duration: z
    .number()
    .describe('Duration of the effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    mistDensity,
    layerDepth,
    blurProgression,
    brightnessShift,
    windEffect,
    duration,
  } = params;

  // Helper function to calculate depth-based values
  const calculateLayerValues = (index: number) => {
    const depthRatio = index / Math.max(layerDepth - 1, 1);
    
    // Opacity calculation: mistDensity * (1 - index * 0.2)
    const baseOpacity = mistDensity * (1 - index * 0.2);
    const opacity = Math.max(0.1, Math.min(0.9, baseOpacity));
    
    // Blur calculation: blurProgression * index
    const blur = blurProgression * index;
    
    // Brightness calculation: 1 + brightnessShift * (1 - index * 0.1)
    const brightness = 1 + brightnessShift * (1 - index * 0.1);
    
    return { opacity, blur, brightness };
  };

  // Generate effects for all layers
  const allEffects: any[] = [];

  for (let i = 0; i < layerDepth; i++) {
    const layerId = `mist-layer-${i}`;
    const { opacity, blur, brightness } = calculateLayerValues(i);

    // Opacity effect with fade-in pattern
    const opacityEffect = {
      id: `opacity-effect-${layerId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [layerId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: opacity * 0.3, prog: 0.3 },
          { key: 'opacity', val: opacity * 0.7, prog: 0.7 },
          { key: 'opacity', val: opacity, prog: 1 },
        ],
      },
    };

    // Blur effect (progressive depth blur)
    const blurEffect = {
      id: `blur-effect-${layerId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [layerId],
        ranges: [
          { key: 'filter', val: `blur(0px)`, prog: 0 },
          { key: 'filter', val: `blur(${blur / 2}px)`, prog: 0.5 },
          { key: 'filter', val: `blur(${blur}px)`, prog: 1 },
        ],
      },
    };

    // Brightness effect (filter adjustment)
    const brightnessEffect = {
      id: `brightness-effect-${layerId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [layerId],
        ranges: [
          { key: 'filter', val: `brightness(${brightness})`, prog: 0 },
          { key: 'filter', val: `brightness(${brightness})`, prog: 1 },
        ],
      },
    };

    allEffects.push(opacityEffect, blurEffect, brightnessEffect);

    // Wind effect (horizontal drift) - optional
    if (windEffect) {
      const driftDistance = 20 + i * 10; // Increase drift with depth
      const windDriftEffect = {
        id: `wind-effect-${layerId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [layerId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: driftDistance, prog: 1 },
          ],
        },
      };
      allEffects.push(windDriftEffect);
    }
  }

  // Return structure with all effects
  const rootContainer: RenderableComponentData = {
    id: 'mist-layer-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: allEffects,
    childrenData: [],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'MistLayer',
  title: 'MistLayer - Atmospheric Fog Effect',
  description:
    'Internal effect preset that creates atmospheric transparency effects mimicking fog or mist layers. Generates multiple depth layers with synchronized opacity, blur, and brightness animations. Each layer has depth-based transparency values calculated from mistDensity and layer index. Supports windEffect for horizontal drift animation. Returns AnimationRange[] effects for opacity (fade-in pattern), blur (progressive depth blur), brightness (filter adjustment), and optional translateX (wind drift). Perfect for atmospheric overlays, dreamy text effects, and soft image transitions.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'atmosphere', 'mist', 'fog', 'layers', 'depth', 'internal', 'generic'],
  defaultInputParams: {
    mistDensity: 0.6,
    layerDepth: 3,
    blurProgression: 5,
    brightnessShift: 0.1,
    windEffect: true,
    duration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

// Export preset
export const MistLayerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
