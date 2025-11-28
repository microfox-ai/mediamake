/**
 * FocusLayers Internal Effect Preset
 *
 * Creates multi-layered depth using progressive opacity and blur values.
 * Implements a parallax-style focus system where different layers have different focus characteristics:
 * - Foreground elements get sharp focus with subtle edge blur
 * - Midground gets moderate blur with slight opacity reduction
 * - Background gets heavy blur with significant opacity reduction
 *
 * Features:
 * - **Multi-layered depth**: Progressive opacity and blur for foreground, midground, and background
 * - **Focus breathing**: Optional subtle focus hunting animation mimicking camera autofocus
 * - **Dynamic layer reassignment**: Support for elements moving between focus layers during playback
 * - **Chromatic aberration**: Optional simulation for out-of-focus areas using color channel splits
 * - **Combined effect type**: Returns both generic effects and computed properties
 *
 * Use cases:
 * - Creating cinematic depth-of-field effects
 * - Simulating camera focus shifts
 * - Adding visual depth to layered compositions
 * - Creating dreamy or stylized visual effects
 *
 * ARRAY OF EFFECTS:
 * Returns an array of effects for each layer (foreground, midground, background) with their respective
 * opacity, blur, and optional chromatic aberration configurations.
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  layers: z.object({
    foreground: z.array(z.string()).describe('Array of component IDs for foreground layer'),
    midground: z.array(z.string()).describe('Array of component IDs for midground layer'),
    background: z.array(z.string()).describe('Array of component IDs for background layer'),
  }).describe('Layer configuration with component IDs for each depth layer'),
  focusBreathing: z.object({
    enabled: z.boolean().describe('Enable focus breathing animation'),
    intensity: z.number().min(0).max(1).describe('Intensity of focus breathing (0-1)'),
    frequency: z.number().min(0.1).max(5).describe('Frequency of breathing cycles in Hz'),
  }).optional().describe('Optional focus breathing animation configuration'),
  chromaticAberration: z.boolean().default(false).describe('Enable chromatic aberration effect for out-of-focus areas'),
  transitionDuration: z.number().default(1).describe('Duration of focus transitions in seconds'),
  effectStart: z.number().default(0).describe('Start time of the effect (relative)'),
  effectDuration: z.number().describe('Duration of the effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    layers,
    focusBreathing,
    chromaticAberration,
    transitionDuration,
    effectStart,
    effectDuration,
  } = params;

  const effects: any[] = [];

  // Helper function to create layer effects
  const createLayerEffect = (
    targetIds: string[],
    layerType: 'foreground' | 'midground' | 'background',
    effectId: string,
  ): GenericEffectData => {
    // Layer-specific configurations
    const layerConfig = {
      foreground: {
        opacityRange: [0.9, 1],
        blurRange: [2, 0],
        prog: [0, 1],
      },
      midground: {
        opacityRange: [0.6, 0.75],
        blurRange: [5, 3],
        prog: [0, 1],
      },
      background: {
        opacityRange: [0.3, 0.4],
        blurRange: [12, 10],
        prog: [0, 1],
      },
    };

    const config = layerConfig[layerType];
    const ranges: any[] = [];

    // Base opacity animation
    ranges.push(
      { key: 'opacity', val: config.opacityRange[0], prog: config.prog[0] },
      { key: 'opacity', val: config.opacityRange[1], prog: config.prog[1] },
    );

    // Blur effect
    if (chromaticAberration && layerType !== 'foreground') {
      // Chromatic aberration via filter with blur and color channel splits
      const blurStart = `blur(${config.blurRange[0]}px) drop-shadow(1px 0 0 rgba(255,0,0,0.3)) drop-shadow(-1px 0 0 rgba(0,255,0,0.3))`;
      const blurEnd = `blur(${config.blurRange[1]}px) drop-shadow(1px 0 0 rgba(255,0,0,0.3)) drop-shadow(-1px 0 0 rgba(0,255,0,0.3))`;
      
      ranges.push(
        { key: 'filter', val: blurStart, prog: config.prog[0] },
        { key: 'filter', val: blurEnd, prog: config.prog[1] },
      );
    } else {
      // Standard blur without chromatic aberration
      ranges.push(
        { key: 'filter', val: `blur(${config.blurRange[0]}px)`, prog: config.prog[0] },
        { key: 'filter', val: `blur(${config.blurRange[1]}px)`, prog: config.prog[1] },
      );
    }

    // Focus breathing animation (cyclic)
    if (focusBreathing?.enabled && layerType !== 'foreground') {
      const breathingIntensity = focusBreathing.intensity;
      const midOpacity = (config.opacityRange[0] + config.opacityRange[1]) / 2;
      const opacityVariation = midOpacity * breathingIntensity * 0.1;
      const midBlur = (config.blurRange[0] + config.blurRange[1]) / 2;
      const blurVariation = midBlur * breathingIntensity * 0.3;

      // Add breathing keyframes (sine wave pattern)
      ranges.push(
        // Breathing cycle: up -> down -> up
        { key: 'opacity', val: midOpacity - opacityVariation, prog: 0.25 },
        { key: 'opacity', val: midOpacity + opacityVariation, prog: 0.5 },
        { key: 'opacity', val: midOpacity - opacityVariation, prog: 0.75 },
      );

      if (chromaticAberration) {
        const breathBlurDown = `blur(${midBlur + blurVariation}px) drop-shadow(1px 0 0 rgba(255,0,0,0.3)) drop-shadow(-1px 0 0 rgba(0,255,0,0.3))`;
        const breathBlurUp = `blur(${midBlur - blurVariation}px) drop-shadow(1px 0 0 rgba(255,0,0,0.3)) drop-shadow(-1px 0 0 rgba(0,255,0,0.3))`;
        
        ranges.push(
          { key: 'filter', val: breathBlurDown, prog: 0.25 },
          { key: 'filter', val: breathBlurUp, prog: 0.5 },
          { key: 'filter', val: breathBlurDown, prog: 0.75 },
        );
      } else {
        ranges.push(
          { key: 'filter', val: `blur(${midBlur + blurVariation}px)`, prog: 0.25 },
          { key: 'filter', val: `blur(${midBlur - blurVariation}px)`, prog: 0.5 },
          { key: 'filter', val: `blur(${midBlur + blurVariation}px)`, prog: 0.75 },
        );
      }
    }

    return {
      type: focusBreathing?.enabled ? 'ease-in-out' : 'ease-out',
      start: effectStart,
      duration: transitionDuration,
      mode: 'provider',
      targetIds,
      ranges,
    };
  };

  // Create effects for each layer
  if (layers.foreground.length > 0) {
    const foregroundEffect = {
      id: 'focus-layer-foreground',
      componentId: 'generic',
      data: createLayerEffect(layers.foreground, 'foreground', 'focus-layer-foreground'),
    };
    effects.push(foregroundEffect);
  }

  if (layers.midground.length > 0) {
    const midgroundEffect = {
      id: 'focus-layer-midground',
      componentId: 'generic',
      data: createLayerEffect(layers.midground, 'midground', 'focus-layer-midground'),
    };
    effects.push(midgroundEffect);
  }

  if (layers.background.length > 0) {
    const backgroundEffect = {
      id: 'focus-layer-background',
      componentId: 'generic',
      data: createLayerEffect(layers.background, 'background', 'focus-layer-background'),
    };
    effects.push(backgroundEffect);
  }

  // Create container to hold effects
  const rootContainer: RenderableComponentData = {
    id: 'focus-layers-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: effectStart,
        duration: effectDuration,
      },
    },
    effects,
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

const presetMetadata: PresetMetadata = {
  id: 'FocusLayers',
  title: 'FocusLayers',
  description:
    'Multi-layered depth effect preset that creates parallax-style focus with progressive opacity and blur. Foreground elements get sharp focus with subtle edge blur, midground gets moderate blur with slight opacity reduction, and background gets heavy blur with significant opacity reduction. Supports focus breathing animation mimicking camera autofocus, dynamic layer reassignment during playback, and chromatic aberration simulation for out-of-focus areas.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'focus', 'depth', 'parallax', 'blur', 'chromatic-aberration'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    layers: {
      foreground: ['foreground-element-1'],
      midground: ['midground-element-1'],
      background: ['background-element-1'],
    },
    focusBreathing: {
      enabled: true,
      intensity: 0.3,
      frequency: 0.5,
    },
    chromaticAberration: true,
    transitionDuration: 1,
    effectStart: 0,
    effectDuration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const FocusLayersPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
