/**
 * Pressure-Sensitive Fill Text Animation Preset
 *
 * This preset creates an organic, hand-drawn style text animation that simulates
 * pressure-sensitive filling. Text starts with a thin stroke outline and gradually
 * thickens and fills completely, mimicking the progression from a light pencil sketch
 * to a heavy marker fill.
 *
 * Features:
 * - **Layered approach**: Separate stroke and fill layers for smooth progression
 * - **Organic motion**: Slight rotation wiggle and scale variation for hand-drawn feel
 * - **Progressive thickening**: Stroke progressively thickens via drop-shadow effects
 * - **Gradual fill**: Fill layer fades in with slight scale growth
 * - **Non-linear timing**: Multiple keyframes create organic, non-uniform animation
 * - **Caption-aware**: Optional impact-based effects for caption data
 *
 * Use cases:
 * - Creating hand-drawn style text reveals
 * - Organic typography animations
 * - Sketch-to-final artistic transitions
 * - Dynamic title sequences with natural feel
 * - Social media content with artistic flair
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { TextAtomData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfex/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to animate with pressure-sensitive fill'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  strokeColor: z
    .string()
    .default('#000000')
    .describe('Stroke outline color (hex or rgba)'),
  fillColor: z
    .string()
    .default('#000000')
    .describe('Final fill color (hex or rgba)'),
  strokeThickenIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for stroke thickening effect'),
  fillFadeIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for fill fade-in effect'),
  wiggleIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of rotation wiggle effect'),
  scaleVariationIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of scale variation effect'),
  startOffset: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time offset in seconds (relative to parent)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Apply default font weight if not specified in font string
  if (!fontStyle.fontWeight) {
    fontStyle.fontWeight = params.fontWeight;
  }

  // IDs for targeting
  const containerId = 'pressure-fill-container';
  const strokeLayerId = 'pressure-stroke-layer';
  const fillLayerId = 'pressure-fill-layer';

  // Timing configuration
  const totalDuration = params.duration;
  const strokeDuration = totalDuration * 0.67; // Stroke thickens for 2/3 of duration
  const fillStart = totalDuration * 0.17; // Fill starts at 1/6 of duration
  const fillDuration = totalDuration * 0.83; // Fill lasts for 5/6 of duration

  // Stroke layer - thin outline that thickens
  const strokeLayerData: TextAtomData = {
    text: params.text,
    style: {
      fontSize: `${params.fontSize}px`,
      fontWeight: fontStyle.fontWeight || params.fontWeight,
      color: 'transparent',
      WebkitTextStroke: `2px ${params.strokeColor}`,
      textStroke: `2px ${params.strokeColor}`,
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      ...(fontStyle.fontWeight
        ? { weights: [fontStyle.fontWeight.toString()] }
        : {}),
    },
  };

  // Fill layer - solid fill that fades in
  const fillLayerData: TextAtomData = {
    text: params.text,
    style: {
      fontSize: `${params.fontSize}px`,
      fontWeight: fontStyle.fontWeight || params.fontWeight,
      color: params.fillColor,
      position: 'absolute' as any,
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      ...(fontStyle.fontWeight
        ? { weights: [fontStyle.fontWeight.toString()] }
        : {}),
    },
  };

  // Stroke thickening effect (via drop-shadow)
  const strokeThickenEffect = {
    id: 'stroke-thicken-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: strokeDuration,
      mode: 'provider' as const,
      targetIds: [strokeLayerId],
      ranges: [
        {
          key: 'filter',
          val: 'drop-shadow(0 0 0px rgba(0,0,0,0))',
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${4 * params.strokeThickenIntensity}px rgba(0,0,0,0.6))`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${8 * params.strokeThickenIntensity}px rgba(0,0,0,0.9))`,
          prog: 1,
        },
      ],
    },
  };

  // Stroke wiggle rotation
  const strokeWiggleEffect = {
    id: 'stroke-wiggle-rotation',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: totalDuration,
      mode: 'provider' as const,
      targetIds: [strokeLayerId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: -0.8 * params.wiggleIntensity, prog: 0.25 },
        { key: 'rotate', val: 1 * params.wiggleIntensity, prog: 0.5 },
        { key: 'rotate', val: -0.5 * params.wiggleIntensity, prog: 0.75 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    },
  };

  // Stroke scale variation
  const strokeScaleEffect = {
    id: 'stroke-scale-variation',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: totalDuration,
      mode: 'provider' as const,
      targetIds: [strokeLayerId],
      ranges: [
        { key: 'scale', val: 0.98, prog: 0 },
        {
          key: 'scale',
          val: 0.98 + 0.03 * params.scaleVariationIntensity,
          prog: 0.3,
        },
        {
          key: 'scale',
          val: 0.98 + 0.01 * params.scaleVariationIntensity,
          prog: 0.6,
        },
        {
          key: 'scale',
          val: 0.98 + 0.04 * params.scaleVariationIntensity,
          prog: 0.85,
        },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Fill fade-in effect
  const fillFadeEffect = {
    id: 'fill-fade-in-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: fillStart,
      duration: fillDuration,
      mode: 'provider' as const,
      targetIds: [fillLayerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.2 * params.fillFadeIntensity, prog: 0.3 },
        { key: 'opacity', val: 0.6 * params.fillFadeIntensity, prog: 0.6 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Fill scale growth
  const fillScaleEffect = {
    id: 'fill-scale-growth',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: fillStart,
      duration: fillDuration,
      mode: 'provider' as const,
      targetIds: [fillLayerId],
      ranges: [
        { key: 'scale', val: 0.97, prog: 0 },
        { key: 'scale', val: 1, prog: 0.4 },
        { key: 'scale', val: 1.01 * params.scaleVariationIntensity, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Fill text shadow effect
  const fillShadowEffect = {
    id: 'fill-text-shadow-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: fillStart + fillDuration * 0.3,
      duration: fillDuration * 0.7,
      mode: 'provider' as const,
      targetIds: [fillLayerId],
      ranges: [
        { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0,0,0,0))', prog: 0 },
        {
          key: 'filter',
          val: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
          prog: 1,
        },
      ],
    },
  };

  // Fill wiggle rotation
  const fillWiggleEffect = {
    id: 'fill-wiggle-rotation',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: fillStart,
      duration: fillDuration,
      mode: 'provider' as const,
      targetIds: [fillLayerId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 0.7 * params.wiggleIntensity, prog: 0.2 },
        { key: 'rotate', val: -0.9 * params.wiggleIntensity, prog: 0.5 },
        { key: 'rotate', val: 0.4 * params.wiggleIntensity, prog: 0.8 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    },
  };

  // Stroke layer component
  const strokeLayer = {
    id: strokeLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: strokeLayerData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [strokeThickenEffect, strokeWiggleEffect, strokeScaleEffect],
  } as RenderableComponentData;

  // Fill layer component
  const fillLayer = {
    id: fillLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: fillLayerData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      fillFadeEffect,
      fillScaleEffect,
      fillShadowEffect,
      fillWiggleEffect,
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center absolute inset-0',
      },
    },
    context: {
      timing: {
        start: params.startOffset,
        duration: totalDuration,
      },
    },
    childrenData: [strokeLayer, fillLayer] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'pressure-fill-text',
  title: 'Pressure-Sensitive Fill Text Animation',
  description:
    'Organic text animation that simulates pressure-sensitive filling, transitioning from light stroke outlines to thick filled text with hand-drawn variations. Uses layered TextAtom components with CSS text-stroke and progressive opacity/scale effects for an authentic sketched-to-marker feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'organic',
    'hand-drawn',
    'stroke',
    'fill',
    'pressure',
    'sketch',
    'artistic',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Pressure Fill',
    duration: 3,
    fontSize: 96,
    fontWeight: '700',
    font: 'Inter:700',
    strokeColor: '#000000',
    fillColor: '#000000',
    strokeThickenIntensity: 1,
    fillFadeIntensity: 1,
    wiggleIntensity: 1,
    scaleVariationIntensity: 1,
    startOffset: 0,
  },
};

// Export preset
export const pressureFillTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
