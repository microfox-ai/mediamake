/**
 * VolumetricDepthFog Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates atmospheric depth and volumetric fog through multi-layered animations.
 * Each layer moves at different speeds to create parallax depth with fog density,
 * light rays, and atmospheric haze effects.
 *
 * Features:
 * - Multiple depth planes (foreground fog, midground rays, background haze)
 * - Parallax movement with different speeds per layer
 * - Opacity gradients for fog density control
 * - Transform3d for depth perception
 * - Filter combinations (blur + brightness) for atmospheric scattering
 * - Configurable fog density, ray angle, parallax speed, and layer count
 *
 * Technical Details:
 * - Returns array of generic effects (one per layer)
 * - Each layer has different opacity, translateY, and blur ranges
 * - Foreground layers move slower (parallax effect)
 * - Background layers have more blur (depth cue)
 * - Ease-in-out easing for natural atmospheric movement
 *
 * Use cases:
 * - Creating atmospheric depth in scenes
 * - Adding god rays and volumetric lighting
 * - Simulating fog and mist effects
 * - Building immersive environmental effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply fog effects to'),
  fogDensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Fog density multiplier (0 = transparent, 1 = opaque)'),
  rayAngle: z
    .number()
    .default(15)
    .describe('Angle of light rays in degrees (rotation range)'),
  parallaxSpeed: z
    .number()
    .default(1)
    .describe('Parallax speed multiplier (higher = faster movement)'),
  fogColor: z
    .string()
    .default('#e3f2fd')
    .describe('Fog color in hex format (e.g., #e3f2fd for light blue)'),
  layerCount: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of fog layers to create (1-5 for performance)'),
  duration: z
    .number()
    .default(5000)
    .describe('Duration of fog animation cycle in milliseconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    fogDensity = 0.5,
    rayAngle = 15,
    parallaxSpeed = 1,
    layerCount = 3,
    duration = 5000,
  } = params;

  // Helper function to calculate layer-specific parameters
  const calculateLayerParams = (layerIndex: number, totalLayers: number) => {
    // Normalized layer position (0 = foreground, 1 = background)
    const layerDepth = layerIndex / Math.max(totalLayers - 1, 1);

    // Parallax speed: foreground moves fastest, background slowest
    const speedMultiplier = (1 - layerDepth * 0.7) * parallaxSpeed;

    // Opacity: varies by layer to create depth
    const baseOpacity = fogDensity * (0.15 + layerDepth * 0.35);
    const peakOpacity = fogDensity * (0.3 + layerDepth * 0.2);

    // Movement distance: foreground moves more, background less
    const moveDistance = 100 * speedMultiplier;

    // Blur intensity: background more blurred for depth
    const blurIntensity = layerDepth * 10;

    // Rotation for light ray effect (midground layers)
    const isMidLayer = layerIndex === Math.floor(totalLayers / 2);
    const rotationRange = isMidLayer ? rayAngle : 0;

    return {
      speedMultiplier,
      baseOpacity,
      peakOpacity,
      moveDistance,
      blurIntensity,
      rotationRange,
      layerDepth,
    };
  };

  // Create effects array for all layers
  const effects = Array.from({ length: layerCount }, (_, i) => {
    const params = calculateLayerParams(i, layerCount);
    const durationInSeconds = duration / 1000;

    // Build animation ranges for this layer
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    // Opacity animation (breathing fog effect)
    ranges.push(
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: params.baseOpacity, prog: 0.25 },
      { key: 'opacity', val: params.peakOpacity, prog: 0.5 },
      { key: 'opacity', val: params.baseOpacity, prog: 0.75 },
      { key: 'opacity', val: 0, prog: 1 },
    );

    // TranslateY animation (vertical drift)
    const startY = -params.moveDistance;
    const midY = 0;
    const endY = params.moveDistance;
    ranges.push(
      { key: 'translateY', val: startY, prog: 0 },
      { key: 'translateY', val: midY, prog: 0.25 },
      { key: 'translateY', val: midY, prog: 0.5 },
      { key: 'translateY', val: midY, prog: 0.75 },
      { key: 'translateY', val: endY, prog: 1 },
    );

    // Blur animation (atmospheric scattering)
    const blurStart = 0;
    const blurPeak = params.blurIntensity;
    ranges.push(
      { key: 'blur', val: `${blurStart}px`, prog: 0 },
      { key: 'blur', val: `${blurPeak * 0.5}px`, prog: 0.25 },
      { key: 'blur', val: `${blurPeak}px`, prog: 0.5 },
      { key: 'blur', val: `${blurPeak * 0.5}px`, prog: 0.75 },
      { key: 'blur', val: `${blurStart}px`, prog: 1 },
    );

    // Brightness animation (light scattering)
    const brightnessBase = 1 + params.layerDepth * 0.2;
    const brightnessPeak = brightnessBase + 0.3;
    ranges.push(
      { key: 'brightness', val: brightnessBase, prog: 0 },
      { key: 'brightness', val: brightnessPeak, prog: 0.5 },
      { key: 'brightness', val: brightnessBase, prog: 1 },
    );

    // Rotation animation (light rays for midground)
    if (params.rotationRange > 0) {
      ranges.push(
        { key: 'rotate', val: -params.rotationRange, prog: 0 },
        { key: 'rotate', val: 0, prog: 0.25 },
        { key: 'rotate', val: params.rotationRange, prog: 0.5 },
        { key: 'rotate', val: 0, prog: 0.75 },
        { key: 'rotate', val: -params.rotationRange, prog: 1 },
      );
    }

    // Create effect data
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: i * 0.1, // Stagger start times slightly
      duration: durationInSeconds,
      mode: 'provider',
      targetIds: targetIds,
      ranges: ranges,
    };

    return {
      id: `volumetric-fog-layer-${i}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  return {
    output: {
      childrenData: [
        {
          id: 'volumetric-fog-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: duration / 1000,
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

const presetMetadata: PresetMetadata = {
  id: 'VolumetricDepthFog',
  title: 'Volumetric Depth Fog',
  description:
    'Internal effect preset that creates atmospheric depth and god ray effects through multi-layered fog animations with parallax movement, opacity gradients, and filter-based atmospheric scattering.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'fog', 'volumetric', 'atmospheric', 'depth', 'parallax', 'god-rays'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    fogDensity: 0.5,
    rayAngle: 15,
    parallaxSpeed: 1,
    fogColor: '#e3f2fd',
    layerCount: 3,
    duration: 5000,
  },
};

export const VolumetricDepthFogPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
