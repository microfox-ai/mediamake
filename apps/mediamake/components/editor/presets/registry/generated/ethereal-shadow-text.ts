/**
 * Ethereal Shadow Text Preset
 *
 * A minimalist typokinetic preset where text materializes from shadow to substance.
 * Features multiple shadow layers with independent animations that create true depth.
 * Shadows fade in first and shift organically (as if cast by moving light), then text
 * fades in above them. Perfect for poetic captions, artistic titles, or any text that
 * needs to feel weightless yet grounded.
 *
 * Features:
 * - **Multi-Layer Shadows**: 3 shadow layers with increasing blur (4px, 8px, 16px) and decreasing opacity
 * - **Organic Movement**: Shadows shift position using sine wave functions for breathing motion
 * - **Sequential Animation**: Shadows materialize first (staggered), then text fades in
 * - **GPU Acceleration**: Uses will-change for optimized performance
 * - **Ethereal Aesthetic**: Creates dreamy, atmospheric text effects
 *
 * Use cases:
 * - Poetic captions and artistic titles
 * - Dreamy, atmospheric video intros
 * - Minimalist text overlays with depth
 * - Artistic content requiring weightless yet grounded text
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the main text (e.g., "#FFFFFF" or "rgba(255,255,255,1)")'),
  fontSize: z
    .union([z.string(), z.number()])
    .default('48px')
    .describe('Font size for the text (e.g., "48px" or 48)'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('400')
    .describe('Font weight (e.g., "400", "700", or 700)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:400", "Roboto:700:italic")',
    ),
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the animation in seconds'),
  shadowColor: z
    .string()
    .default('rgba(0, 0, 0, 0.8)')
    .describe('Base color for shadow layers (supports rgba for transparency)'),
  movementIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for shadow movement (0 = no movement, 2 = double)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Normalize fontSize
  const fontSize =
    typeof params.fontSize === 'number'
      ? `${params.fontSize}px`
      : params.fontSize;

  // Calculate movement values based on intensity
  const moveX = 4 * params.movementIntensity;
  const moveY = 2 * params.movementIntensity;

  // Shadow layer 1 data (strongest blur and opacity)
  const shadowLayer1Data: TextAtomData = {
    text: params.text,
    style: {
      color: 'transparent',
      textShadow: `0 0 4px ${params.shadowColor}`,
      fontSize: fontSize,
      fontWeight: params.fontWeight,
      willChange: 'transform, opacity',
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight
        ? [fontStyle.fontWeight.toString()]
        : [params.fontWeight.toString()],
      subsets: ['latin'],
    },
  };

  // Shadow layer 2 data (medium blur and opacity)
  const shadowLayer2Data: TextAtomData = {
    text: params.text,
    style: {
      color: 'transparent',
      textShadow: `0 0 8px ${params.shadowColor.replace(/[\d.]+\)/, '0.5)')}`,
      fontSize: fontSize,
      fontWeight: params.fontWeight,
      position: 'absolute',
      top: 0,
      left: 0,
      willChange: 'transform, opacity',
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight
        ? [fontStyle.fontWeight.toString()]
        : [params.fontWeight.toString()],
      subsets: ['latin'],
    },
  };

  // Shadow layer 3 data (softest blur and opacity)
  const shadowLayer3Data: TextAtomData = {
    text: params.text,
    style: {
      color: 'transparent',
      textShadow: `0 0 16px ${params.shadowColor.replace(/[\d.]+\)/, '0.2)')}`,
      fontSize: fontSize,
      fontWeight: params.fontWeight,
      position: 'absolute',
      top: 0,
      left: 0,
      willChange: 'transform, opacity',
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight
        ? [fontStyle.fontWeight.toString()]
        : [params.fontWeight.toString()],
      subsets: ['latin'],
    },
  };

  // Main text data
  const textContentData: TextAtomData = {
    text: params.text,
    style: {
      color: params.textColor,
      fontSize: fontSize,
      fontWeight: params.fontWeight,
      position: 'absolute',
      top: 0,
      left: 0,
      willChange: 'transform, opacity',
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight
        ? [fontStyle.fontWeight.toString()]
        : [params.fontWeight.toString()],
      subsets: ['latin'],
    },
  };

  // Shadow layer 1 fade effect
  const shadow1FadeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 0.8,
    mode: 'provider',
    targetIds: ['shadow-layer-1'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Shadow layer 1 movement effect (continuous breathing motion)
  const shadow1MovementEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: ['shadow-layer-1'],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: moveX, prog: 0.5 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: moveY, prog: 0.5 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Shadow layer 2 fade effect
  const shadow2FadeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0.1,
    duration: 0.8,
    mode: 'provider',
    targetIds: ['shadow-layer-2'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Shadow layer 2 movement effect (slightly different phase)
  const shadow2MovementEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: ['shadow-layer-2'],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: moveX * 0.75, prog: 0.5 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: moveY * 0.75, prog: 0.5 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Shadow layer 3 fade effect
  const shadow3FadeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0.2,
    duration: 0.8,
    mode: 'provider',
    targetIds: ['shadow-layer-3'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Shadow layer 3 movement effect (subtler movement)
  const shadow3MovementEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: ['shadow-layer-3'],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: moveX * 0.5, prog: 0.5 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: moveY * 0.5, prog: 0.5 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Text fade effect (fades in after shadows)
  const textFadeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0.8,
    duration: 1.2,
    mode: 'provider',
    targetIds: ['text-content'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Build shadow container with all layers
  const shadowContainer = {
    id: 'shadow-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      // Shadow layer 1
      {
        id: 'shadow-layer-1',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: shadowLayer1Data,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: 'shadow-1-fade',
            componentId: 'generic',
            data: shadow1FadeEffect,
          },
          {
            id: 'shadow-1-movement',
            componentId: 'generic',
            data: shadow1MovementEffect,
          },
        ],
      },
      // Shadow layer 2
      {
        id: 'shadow-layer-2',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: shadowLayer2Data,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: 'shadow-2-fade',
            componentId: 'generic',
            data: shadow2FadeEffect,
          },
          {
            id: 'shadow-2-movement',
            componentId: 'generic',
            data: shadow2MovementEffect,
          },
        ],
      },
      // Shadow layer 3
      {
        id: 'shadow-layer-3',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: shadowLayer3Data,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: 'shadow-3-fade',
            componentId: 'generic',
            data: shadow3FadeEffect,
          },
          {
            id: 'shadow-3-movement',
            componentId: 'generic',
            data: shadow3MovementEffect,
          },
        ],
      },
      // Main text content (fades in last)
      {
        id: 'text-content',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: textContentData,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: 'text-fade',
            componentId: 'generic',
            data: textFadeEffect,
          },
        ],
      },
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: 'ethereal-shadow-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [shadowContainer] as RenderableComponentData[],
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
  id: 'etherealShadowText',
  title: 'Ethereal Shadow Text',
  description:
    'A minimalist typokinetic preset featuring text that materializes from shadow to substance. Multiple shadow layers with independent animations create true depth, with shadows breathing and shifting organically before the text fades in above them. Perfect for poetic captions, artistic titles, or any text requiring a weightless yet grounded aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'shadow',
    'ethereal',
    'minimalist',
    'kinetic',
    'atmospheric',
    'artistic',
    'dreamy',
    'depth',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Ethereal Dreams',
    textColor: '#FFFFFF',
    fontSize: '48px',
    fontWeight: '400',
    font: 'Inter:400',
    duration: 3,
    shadowColor: 'rgba(0, 0, 0, 0.8)',
    movementIntensity: 1,
  },
};

// Export preset
export const etherealShadowTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
