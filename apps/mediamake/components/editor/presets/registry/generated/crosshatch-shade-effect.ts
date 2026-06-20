/**
 * CrosshatchShade Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This preset creates an animated crosshatch shading effect that simulates hand-drawn illustration styles.
 * It progressively builds up multiple crosshatch layers with different line angles and densities to create depth and shading.
 *
 * Features:
 * - 5 progressive crosshatch layers with staggered reveals
 * - Multiple styles: pen (sharp), pencil (soft), etching (dense)
 * - Animation patterns: fade (opacity reveal), draw (scale reveal), build (combined)
 * - Configurable shade levels (1-5) for darkness intensity
 * - Adjustable line spacing and color
 * - SVG-based patterns for crisp, scalable crosshatch lines
 *
 * Technical Implementation:
 * - Uses SVG patterns with different angles: 45°, -45°, 0°, 90°, 30°
 * - Each layer has unique line spacing and stroke width based on style
 * - Staggered animation timing at [0, 0.2, 0.4, 0.6, 0.8] progress points
 * - Opacity and transform animations for progressive reveal
 * - Mix-blend-mode: multiply for authentic shading effect
 *
 * Use Cases:
 * - Hand-drawn illustration effects for videos
 * - Artistic shading overlays for images
 * - Sketch-style animations
 * - Educational content with drawing effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply crosshatch shading to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(2)
    .describe('Total duration for all crosshatch layers to build up'),
  shadeLevels: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of crosshatch layers to use (1-5, higher = darker)'),
  hatchStyle: z
    .enum(['pen', 'pencil', 'etching'])
    .default('pen')
    .describe('Style of crosshatch lines: pen (sharp), pencil (soft), etching (dense)'),
  animationPattern: z
    .enum(['fade', 'draw', 'build'])
    .default('fade')
    .describe('Animation reveal pattern: fade (opacity), draw (scale), build (combined)'),
  lineSpacing: z
    .number()
    .min(2)
    .max(20)
    .default(8)
    .describe('Spacing between crosshatch lines in pixels'),
  lineColor: z
    .string()
    .default('#000000')
    .describe('Color of the crosshatch lines (hex color)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    effectStart,
    effectDuration,
    shadeLevels,
    hatchStyle,
    animationPattern,
    lineSpacing,
    lineColor,
    effectId,
  } = params;

  // Helper function: Generate SVG pattern HTML for a crosshatch layer
  const generateHatchPattern = (
    layerIndex: number,
    angle: number,
    spacing: number,
    strokeWidth: number,
  ): string => {
    const patternId = `hatch-${layerIndex}`;
    return `<svg width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='${patternId}' patternUnits='userSpaceOnUse' width='${spacing}' height='${spacing}' patternTransform='rotate(${angle})'><line x1='0' y1='0' x2='0' y2='${spacing}' stroke='currentColor' stroke-width='${strokeWidth}'/></pattern></defs><rect width='100%' height='100%' fill='url(#${patternId})'/></svg>`;
  };

  // Helper function: Calculate style properties based on hatchStyle
  const getStyleProperties = () => {
    switch (hatchStyle) {
      case 'pen':
        return {
          strokeWidths: [1, 1, 0.8, 0.8, 0.6],
          spacingMultipliers: [1, 1, 0.75, 0.75, 0.5],
          opacities: [0.6, 0.5, 0.4, 0.35, 0.3],
        };
      case 'pencil':
        return {
          strokeWidths: [0.8, 0.8, 0.6, 0.6, 0.5],
          spacingMultipliers: [1.2, 1.2, 0.9, 0.9, 0.6],
          opacities: [0.5, 0.4, 0.35, 0.3, 0.25],
        };
      case 'etching':
        return {
          strokeWidths: [1.2, 1.2, 1, 1, 0.8],
          spacingMultipliers: [0.8, 0.8, 0.6, 0.6, 0.4],
          opacities: [0.7, 0.6, 0.5, 0.45, 0.4],
        };
      default:
        return {
          strokeWidths: [1, 1, 0.8, 0.8, 0.6],
          spacingMultipliers: [1, 1, 0.75, 0.75, 0.5],
          opacities: [0.6, 0.5, 0.4, 0.35, 0.3],
        };
    }
  };

  const styleProps = getStyleProperties();

  // Layer configurations: angle, spacing multiplier, stroke width
  const layerConfigs = [
    { angle: 45, spacingMult: styleProps.spacingMultipliers[0], strokeWidth: styleProps.strokeWidths[0] },
    { angle: -45, spacingMult: styleProps.spacingMultipliers[1], strokeWidth: styleProps.strokeWidths[1] },
    { angle: 0, spacingMult: styleProps.spacingMultipliers[2], strokeWidth: styleProps.strokeWidths[2] },
    { angle: 90, spacingMult: styleProps.spacingMultipliers[3], strokeWidth: styleProps.strokeWidths[3] },
    { angle: 30, spacingMult: styleProps.spacingMultipliers[4], strokeWidth: styleProps.strokeWidths[4] },
  ];

  // Generate effects array for each layer
  const effects: any[] = [];
  const childrenData: RenderableComponentData[] = [];

  for (let i = 0; i < shadeLevels; i++) {
    const layerConfig = layerConfigs[i];
    const layerSpacing = lineSpacing * layerConfig.spacingMult;
    const layerId = `${effectId || 'crosshatch'}-layer-${i + 1}`;
    const staggerStart = effectStart + (effectDuration * i) / 5;
    const layerDuration = effectDuration / 5;

    // Generate SVG pattern HTML
    const svgHtml = generateHatchPattern(
      i + 1,
      layerConfig.angle,
      layerSpacing,
      layerConfig.strokeWidth,
    );

    // Create HTMLBlockAtom for this layer
    childrenData.push({
      id: layerId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgHtml,
        className: 'absolute inset-0',
        style: {
          color: lineColor,
          opacity: 0,
          pointerEvents: 'none',
        },
      },
    } as RenderableComponentData);

    // Generate animation ranges based on animationPattern
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    if (animationPattern === 'fade' || animationPattern === 'build') {
      ranges.push(
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: styleProps.opacities[i], prog: 1 },
      );
    }

    if (animationPattern === 'draw' || animationPattern === 'build') {
      ranges.push(
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      );
    }

    // If fade is not included but draw is, still animate opacity
    if (animationPattern === 'draw') {
      ranges.push(
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: styleProps.opacities[i], prog: 0.3 },
        { key: 'opacity', val: styleProps.opacities[i], prog: 1 },
      );
    }

    // Create generic effect for this layer
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: staggerStart,
      duration: layerDuration,
      mode: 'provider',
      targetIds: [layerId],
      ranges,
    };

    effects.push({
      id: `${layerId}-effect`,
      componentId: 'generic',
      data: effectData,
    });
  }

  // Create container with crosshatch layers
  const rootContainer: RenderableComponentData = {
    id: `${effectId || 'crosshatch'}-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects,
    childrenData,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: targetId,
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'crosshatchShadeEffect',
  title: 'CrosshatchShade Internal Effect',
  description:
    'Animated crosshatch shading effect that builds up progressively with different line angles and densities, creating a hand-drawn illustration style',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'crosshatch', 'shading', 'illustration', 'hand-drawn', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 2,
    shadeLevels: 3,
    hatchStyle: 'pen',
    animationPattern: 'fade',
    lineSpacing: 8,
    lineColor: '#000000',
  },
};

export const crosshatchShadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
