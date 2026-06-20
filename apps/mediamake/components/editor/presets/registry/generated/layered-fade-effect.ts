/**
 * LayeredFade Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Applies multi-dimensional fade effects where different visual properties
 * (opacity, boxShadow, border/outline, backgroundColor) fade independently
 * with their own timing offsets, durations, and easing curves.
 *
 * Features:
 * - **Independent Layer Control**: Each property (opacity, shadow, outline, background) has its own AnimationRange
 * - **Custom Timing per Layer**: Individual offsets and durations for sophisticated dissolve effects
 * - **Preset Combinations**: 'ghost' (outline fades last), 'melt' (bottom-up), 'evaporate' (particle-like)
 * - **Flexible Easing**: Different easing functions per layer for complex motion
 * - **Provider Mode**: Uses targetIds to apply effects directly to target components
 *
 * Use cases:
 * - Creating sophisticated dissolve effects where elements decompose rather than disappear
 * - Applying depth perception changes (shadow fading creates lifting effect)
 * - Building graceful exit animations with layered property transitions
 * - Creating preset-based multi-property fade combinations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Define the layer configuration schema
const layerConfigSchema = z.object({
  enabled: z.boolean().describe('Whether this layer is enabled'),
  offset: z.number().describe('Time offset for this layer in seconds'),
  duration: z.number().describe('Duration for this layer in seconds'),
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .describe('Easing function for this layer'),
});

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the layered fade to'),
  preset: z
    .enum(['ghost', 'melt', 'evaporate', 'custom'])
    .optional()
    .describe(
      'Preset combination: ghost (outline last), melt (bottom-up), evaporate (particles), or custom',
    ),
  layers: z
    .object({
      opacity: layerConfigSchema
        .optional()
        .describe('Opacity layer configuration'),
      shadow: layerConfigSchema
        .optional()
        .describe('Box shadow layer configuration'),
      outline: layerConfigSchema
        .optional()
        .describe('Border/outline layer configuration'),
      background: layerConfigSchema
        .optional()
        .describe('Background color layer configuration'),
    })
    .optional()
    .describe('Custom layer configurations (used when preset is "custom")'),
  baseDuration: z
    .number()
    .default(2)
    .optional()
    .describe('Base duration for all layers in seconds'),
  baseOffset: z
    .number()
    .default(0)
    .optional()
    .describe('Base offset for all layers in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, preset = 'custom', layers, baseDuration = 2, baseOffset = 0 } = params;

  // Helper function to get preset-specific layer configurations
  const getPresetLayers = (): Record<
    string,
    { enabled: boolean; offset: number; duration: number; easing: string }
  > => {
    switch (preset) {
      case 'ghost':
        // Outline fades last - creates ghosting effect
        return {
          opacity: { enabled: true, offset: 0, duration: baseDuration * 0.8, easing: 'ease-out' },
          shadow: { enabled: true, offset: 0, duration: baseDuration * 0.6, easing: 'ease-in' },
          background: { enabled: true, offset: 0, duration: baseDuration * 0.7, easing: 'ease-in-out' },
          outline: { enabled: true, offset: baseDuration * 0.5, duration: baseDuration * 0.5, easing: 'ease-in' },
        };
      case 'melt':
        // Bottom-up dissolve effect
        return {
          opacity: { enabled: true, offset: baseDuration * 0.3, duration: baseDuration * 0.7, easing: 'ease-in' },
          shadow: { enabled: true, offset: 0, duration: baseDuration * 0.5, easing: 'ease-out' },
          background: { enabled: true, offset: 0, duration: baseDuration * 0.8, easing: 'linear' },
          outline: { enabled: true, offset: baseDuration * 0.2, duration: baseDuration * 0.6, easing: 'ease-in-out' },
        };
      case 'evaporate':
        // Particle-like dissolve
        return {
          opacity: { enabled: true, offset: baseDuration * 0.4, duration: baseDuration * 0.6, easing: 'ease-in' },
          shadow: { enabled: true, offset: 0, duration: baseDuration * 0.4, easing: 'ease-out' },
          outline: { enabled: true, offset: 0, duration: baseDuration * 0.5, easing: 'ease-in' },
          background: { enabled: true, offset: baseDuration * 0.2, duration: baseDuration * 0.8, easing: 'ease-in-out' },
        };
      case 'custom':
      default:
        // Use custom layers or defaults
        return {
          opacity: layers?.opacity || { enabled: true, offset: 0, duration: baseDuration, easing: 'ease-out' },
          shadow: layers?.shadow || { enabled: true, offset: 0, duration: baseDuration, easing: 'ease-in-out' },
          outline: layers?.outline || { enabled: true, offset: 0, duration: baseDuration, easing: 'ease-in-out' },
          background: layers?.background || { enabled: true, offset: 0, duration: baseDuration, easing: 'ease-in-out' },
        };
    }
  };

  const layerConfigs = getPresetLayers();

  // Build effects for each enabled layer
  const effects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  // Opacity layer
  if (layerConfigs.opacity.enabled) {
    const opacityEffect: GenericEffectData = {
      type: layerConfigs.opacity.easing as any,
      start: baseOffset + layerConfigs.opacity.offset,
      duration: layerConfigs.opacity.duration,
      mode: 'provider',
      targetIds,
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    effects.push({
      id: `layered-fade-opacity-${targetIds.join('-')}`,
      componentId: 'generic',
      data: opacityEffect,
    });
  }

  // Shadow layer
  if (layerConfigs.shadow.enabled) {
    const shadowEffect: GenericEffectData = {
      type: layerConfigs.shadow.easing as any,
      start: baseOffset + layerConfigs.shadow.offset,
      duration: layerConfigs.shadow.duration,
      mode: 'provider',
      targetIds,
      ranges: [
        { key: 'boxShadow', val: '0 10px 20px rgba(0,0,0,0.3)', prog: 0 },
        { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 1 },
      ],
    };

    effects.push({
      id: `layered-fade-shadow-${targetIds.join('-')}`,
      componentId: 'generic',
      data: shadowEffect,
    });
  }

  // Outline layer
  if (layerConfigs.outline.enabled) {
    const outlineEffect: GenericEffectData = {
      type: layerConfigs.outline.easing as any,
      start: baseOffset + layerConfigs.outline.offset,
      duration: layerConfigs.outline.duration,
      mode: 'provider',
      targetIds,
      ranges: [
        { key: 'border', val: '2px solid rgba(255,255,255,1)', prog: 0 },
        { key: 'border', val: '2px solid rgba(255,255,255,0)', prog: 1 },
      ],
    };

    effects.push({
      id: `layered-fade-outline-${targetIds.join('-')}`,
      componentId: 'generic',
      data: outlineEffect,
    });
  }

  // Background layer
  if (layerConfigs.background.enabled) {
    const backgroundEffect: GenericEffectData = {
      type: layerConfigs.background.easing as any,
      start: baseOffset + layerConfigs.background.offset,
      duration: layerConfigs.background.duration,
      mode: 'provider',
      targetIds,
      ranges: [
        { key: 'backgroundColor', val: 'rgba(255,255,255,1)', prog: 0 },
        { key: 'backgroundColor', val: 'rgba(255,255,255,0)', prog: 1 },
      ],
    };

    effects.push({
      id: `layered-fade-background-${targetIds.join('-')}`,
      componentId: 'generic',
      data: backgroundEffect,
    });
  }

  // Return effect container with all layer effects
  return {
    output: {
      childrenData: [
        {
          id: 'layered-fade-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Placeholder duration
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'layered-fade-effect',
  title: 'LayeredFade Effect',
  description:
    'An internal effect preset that applies multi-dimensional fade effects to target components. Different visual properties (opacity, boxShadow, border/outline, backgroundColor) can fade independently with their own timing offsets, durations, and easing curves. Includes presets for common combinations: ghost (outline fades last), melt (bottom-up dissolve), and evaporate (particle-like). Each layer is a separate generic effect with its own AnimationRange array, creating sophisticated dissolve effects where elements gracefully decompose rather than simply disappearing.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'fade', 'layered', 'multi-dimensional', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    preset: 'ghost',
    baseDuration: 2,
    baseOffset: 0,
  },
};

export const layeredFadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
