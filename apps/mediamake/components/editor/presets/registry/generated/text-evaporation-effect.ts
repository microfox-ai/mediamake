/**
 * Text Evaporation Effect Preset
 *
 * This preset creates an elegant text evaporation effect where text appears to sublime
 * from solid to vapor. The text shrinks upward while becoming increasingly transparent,
 * mimicking steam rising from hot coffee.
 *
 * Features:
 * - **Asymmetric Scaling**: scaleY reduces faster than scaleX for vertical compression
 * - **Upward Drift**: Text floats upward with translateY animation
 * - **Atmospheric Blur**: Gaussian blur increases as text rises, simulating diffusion
 * - **Gentle Ease-Out**: Natural deceleration curve for smooth disappearance
 * - **Bottom-Anchored**: Transform origin at bottom for realistic evaporation
 * - **Optional Wind Effect**: Subtle skewX for added realism
 *
 * Perfect for:
 * - Poetic content endings
 * - Contemplative video conclusions
 * - Elegant text transitions
 * - Atmospheric mood pieces
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMETERS SCHEMA ---

const presetParams = z.object({
  text: z.string().describe('Text content to evaporate'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of evaporation effect in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontWeight: z
    .union([z.number(), z.string()])
    .default(600)
    .describe('Font weight (e.g., 400, 600, 700, "bold")'),
  color: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeights: z
    .array(z.string())
    .default(['400', '600', '700'])
    .optional()
    .describe('Font weights to load'),

  // Effect intensity parameters
  scaleXEnd: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Final horizontal scale (0-1, default 0.3)'),
  scaleYEnd: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Final vertical scale (0-1, default 0 for complete compression)'),
  translateYAmount: z
    .number()
    .min(-100)
    .max(0)
    .default(-30)
    .describe('Upward drift distance in vh units (negative = upward)'),
  maxBlur: z
    .number()
    .min(0)
    .max(30)
    .default(12)
    .describe('Maximum blur amount in pixels'),
  windEffect: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Skew angle for wind effect in degrees (0 = no wind)'),

  // Timing parameters
  fadeStartProgress: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('When opacity fade begins (0-1, default 0.4 = last 60%)'),
  blurAccelerateProgress: z
    .number()
    .min(0)
    .max(1)
    .default(0.67)
    .describe('When blur accelerates (0-1, default 0.67 = final third)'),
});

// --- PRESET EXECUTION ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const textId = 'evaporating-text';
  const containerId = 'evaporation-root-container';

  // Helper: Create evaporation effect with asymmetric scaling and blur
  const createEvaporationEffect = (): GenericEffectData => {
    return {
      type: 'ease-out',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // Asymmetric scaling - scaleY reduces faster than scaleX
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: params.scaleXEnd, prog: 1 },
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: params.scaleYEnd, prog: 1 },

        // Upward drift
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: `${params.translateYAmount}vh`, prog: 1 },

        // Opacity fade (accelerates in last 60%)
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: params.fadeStartProgress },
        { key: 'opacity', val: 0, prog: 1 },

        // Gaussian blur (accelerates in final third)
        { key: 'blur', val: '0px', prog: 0 },
        { key: 'blur', val: `${params.maxBlur * 0.3}px`, prog: params.blurAccelerateProgress },
        { key: 'blur', val: `${params.maxBlur}px`, prog: 1 },

        // Optional wind effect (subtle skew)
        ...(params.windEffect > 0
          ? [
              { key: 'skewX', val: 0, prog: 0 },
              { key: 'skewX', val: params.windEffect, prog: 1 },
            ]
          : []),
      ],
    };
  };

  // Create the effect
  const evaporationEffect = {
    id: 'evaporation-animation',
    componentId: 'generic',
    data: createEvaporationEffect(),
  };

  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.color,
        textAlign: 'center',
        transformOrigin: 'center bottom',
        willChange: 'transform, opacity, filter',
      },
      font: {
        family: params.fontFamily,
        weights: params.fontWeights,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [evaporationEffect],
  };

  // Root container - text starts at bottom
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex flex-col items-center justify-end',
        style: {
          overflow: 'hidden',
          paddingBottom: '10vh', // Padding from bottom edge
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom],
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

// --- PRESET METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'text-evaporation-effect',
  title: 'Text Evaporation Effect',
  description:
    'Elegant text evaporation effect where text appears to sublime from solid to vapor. Text shrinks upward while becoming transparent, with asymmetric scaling (scaleY reduces faster than scaleX), upward drift, and increasing Gaussian blur. Features light, airy animation with gentle ease-out curve, perfect for poetic or contemplative content endings.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'evaporation',
    'sublime',
    'vapor',
    'atmospheric',
    'elegant',
    'poetic',
    'contemplative',
    'blur',
    'drift',
    'fade',
    'scaling',
    'transform',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Fading Away...',
    duration: 3,
    fontSize: 64,
    fontWeight: 600,
    color: '#ffffff',
    fontFamily: 'Inter',
    fontWeights: ['400', '600', '700'],
    scaleXEnd: 0.3,
    scaleYEnd: 0,
    translateYAmount: -30,
    maxBlur: 12,
    windEffect: 2,
    fadeStartProgress: 0.4,
    blurAccelerateProgress: 0.67,
  },
};

// --- EXPORT ---

export const textEvaporationEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
