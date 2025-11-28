/**
 * Prismatic Refraction Effect Preset
 *
 * Creates rainbow-like color dispersions at element edges by simulating light passing through a prism.
 * Uses multiple overlapping color layers with progressive hue rotations, blend modes, staggered timing,
 * and subtle skew distortions to achieve realistic light dispersion without heavy performance costs.
 *
 * Features:
 * - **Progressive Hue Rotation**: 5-7 color layers with graduated hue-rotate values (0°, 60°, 120°, 180°, 240°, 300°, 360°)
 * - **Cascading Rainbow Effect**: Staggered timing (0-0.3s offsets) creates sequential color appearance
 * - **Blend Modes**: Screen blend mode for realistic color mixing and light dispersion
 * - **Subtle Distortion**: Skew transforms simulate light refraction through prism angles
 * - **Shimmer Animation**: Optional subtle animation for dynamic prismatic effects
 * - **Performance Optimized**: Uses CSS filters (hue-rotate, saturate, contrast) for efficient rendering
 * - **Customizable Parameters**: Control refraction angle, intensity (number of layers), shimmer, and duration
 *
 * Use cases:
 * - Adding prismatic color dispersions to text, images, or any visual elements
 * - Creating rainbow edge effects that simulate light refraction
 * - Building dynamic color-shifting overlays with realistic physics
 * - Adding premium visual polish to headings, CTAs, or featured content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  angle: z
    .number()
    .min(0)
    .max(360)
    .default(45)
    .describe('Refraction angle in degrees (0-360) that determines color spread direction'),
  intensity: z
    .number()
    .min(3)
    .max(10)
    .default(7)
    .describe('Number of color layers (3-10) - more layers create denser rainbow effect'),
  shimmer: z
    .boolean()
    .default(true)
    .describe('Enable subtle animation shimmer effect for dynamic prismatic dispersion'),
  duration: z
    .number()
    .min(1)
    .default(3)
    .describe('Duration of the effect in seconds'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the prismatic refraction effect to'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { angle, intensity, shimmer, duration, targetIds } = params;

  // Helper function to calculate translation offset based on angle
  const calculateOffset = (layerIndex: number, totalLayers: number): { x: number; y: number } => {
    const angleRad = (angle * Math.PI) / 180;
    const maxOffset = 12;
    const layerOffset = (layerIndex / (totalLayers - 1)) * maxOffset;
    return {
      x: Math.cos(angleRad) * layerOffset,
      y: Math.sin(angleRad) * layerOffset,
    };
  };

  // Helper function to calculate opacity based on layer index
  const calculateOpacity = (layerIndex: number, totalLayers: number): number => {
    // Decreasing opacity from 0.6 to 0.15
    const maxOpacity = 0.6;
    const minOpacity = 0.15;
    return maxOpacity - (layerIndex / (totalLayers - 1)) * (maxOpacity - minOpacity);
  };

  // Helper function to calculate skew intensity
  const calculateSkew = (layerIndex: number, totalLayers: number): number => {
    if (!shimmer) return 0;
    // Skew intensity decreases with layer index
    const maxSkew = 1;
    const minSkew = -0.4;
    return maxSkew - (layerIndex / (totalLayers - 1)) * (maxSkew - minSkew);
  };

  // Generate color layers based on intensity parameter
  const colorLayers: RenderableComponentData[] = [];

  for (let i = 0; i < intensity; i++) {
    const hueRotate = (i / intensity) * 360; // Distribute hue evenly across 360°
    const layerOpacity = calculateOpacity(i, intensity);
    const offset = calculateOffset(i, intensity);
    const skewIntensity = calculateSkew(i, intensity);
    const startOffset = (i / intensity) * 0.3; // Stagger start times over 0.3s

    const layerId = `prismatic-layer-${i}`;

    // Create effect for this layer
    const layerEffect = {
      id: `${layerId}-effect`,
      componentId: 'generic',
      data: {
        type: 'spring' as const,
        start: 0,
        duration: null, // Match component duration
        mode: 'provider' as const,
        targetIds: targetIds,
        ranges: [
          // Opacity animation
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: layerOpacity, prog: 0.3 },
          { key: 'opacity', val: layerOpacity, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
          // Hue rotation (constant throughout)
          { key: 'filter:hue-rotate', val: hueRotate, prog: 0 },
          { key: 'filter:hue-rotate', val: hueRotate, prog: 1 },
          // Saturation boost
          { key: 'filter:saturate', val: 100, prog: 0 },
          { key: 'filter:saturate', val: 150, prog: 0.5 },
          { key: 'filter:saturate', val: 100, prog: 1 },
          // Contrast boost
          { key: 'filter:contrast', val: 100, prog: 0 },
          { key: 'filter:contrast', val: 120, prog: 0.5 },
          { key: 'filter:contrast', val: 100, prog: 1 },
          // Translation offset (constant)
          { key: 'translateX', val: offset.x, prog: 0 },
          { key: 'translateX', val: offset.x, prog: 1 },
          { key: 'translateY', val: offset.y, prog: 0 },
          { key: 'translateY', val: offset.y, prog: 1 },
          // Skew distortion (shimmer effect)
          { key: 'skewX', val: 0, prog: 0 },
          { key: 'skewX', val: shimmer ? skewIntensity : 0, prog: 0.5 },
          { key: 'skewX', val: 0, prog: 1 },
        ],
      },
    };

    // Create layer component
    const layerComponent: RenderableComponentData = {
      id: layerId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 100%; height: 100%;'></div>",
        style: {
          position: 'absolute' as const,
          inset: 0,
          mixBlendMode: 'screen' as const,
          pointerEvents: 'none' as const,
        },
      },
      context: {
        timing: {
          start: startOffset,
          fitDurationTo: 'prismatic-refraction-root',
        },
      },
      effects: [layerEffect],
      childrenData: [],
    };

    colorLayers.push(layerComponent);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-refraction-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: colorLayers,
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
  id: 'prismatic-refraction-effect',
  title: 'Prismatic Refraction Effect',
  description:
    'Creates rainbow-like color dispersions at element edges by simulating light passing through a prism. Uses multiple overlapping color layers with progressive hue rotations (0°-360°), blend modes (screen), staggered timing (0-0.3s offsets), and subtle skew distortions. Each layer animates with spring easing across opacity, filter (hue-rotate, saturate, contrast), transform (translateX/Y, skewX) properties. Parameters control refraction angle (color spread direction), intensity (3-10 layers), shimmer (animation), and duration. Applies as overlay effect to any content using mode: provider with targetIds.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'prismatic', 'refraction', 'rainbow', 'color', 'dispersion', 'prism', 'light', 'overlay', 'visual'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    angle: 45,
    intensity: 7,
    shimmer: true,
    duration: 3,
    targetIds: ['example-component'],
  },
};

// Export preset
export const prismaticRefractionEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
