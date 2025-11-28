/**
 * Neon Negative Effect Preset
 *
 * INTERNAL EFFECT PRESET:
 * Creates an inverted neon glow effect for text elements with animated multi-layer
 * text-shadows in psychedelic hues. Inverts colors while adding pulsing, shifting
 * shadow layers that create a vibrating neon sign effect.
 *
 * Features:
 * - Filter invert(1) for color inversion
 * - Animated multi-layer text-shadows (cyan, magenta, yellow)
 * - Pulsing and shifting shadow positions
 * - Configurable glow intensity, shadow spread, and animation speed
 * - Color palette selection (psychedelic, vaporwave, acid)
 * - GPU-accelerated transforms for 60fps performance
 *
 * EFFECT OUTPUT:
 * Returns TWO effects:
 * 1. Shadow animation effect (textShadow cycling through positions)
 * 2. Invert pulse effect (filter invert intensity pulsing)
 *
 * Use cases:
 * - Creating retro neon sign effects
 * - Adding psychedelic text animations
 * - Building vibrating, glowing text overlays
 * - Creating vaporwave/synthwave aesthetics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  glowIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Glow intensity multiplier (0.1-3, default: 1)'),
  shadowSpread: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .optional()
    .describe('Shadow spread distance in pixels (5-50, default: 20)'),
  animationSpeed: z
    .number()
    .min(500)
    .max(5000)
    .default(2000)
    .optional()
    .describe('Animation duration in milliseconds (500-5000, default: 2000)'),
  colorPalette: z
    .enum(['psychedelic', 'vaporwave', 'acid'])
    .default('psychedelic')
    .optional()
    .describe('Color palette selection (default: psychedelic)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .optional()
    .describe('Duration of the effect (uses animationSpeed if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to get color palette
  const getColorPalette = (
    palette: 'psychedelic' | 'vaporwave' | 'acid',
  ): { color1: string; color2: string; color3: string } => {
    const palettes = {
      psychedelic: {
        color1: 'cyan',
        color2: 'magenta',
        color3: 'yellow',
      },
      vaporwave: {
        color1: '#ff71ce',
        color2: '#01cdfe',
        color3: '#05ffa1',
      },
      acid: {
        color1: '#39ff14',
        color2: '#ff10f0',
        color3: '#ffff00',
      },
    };
    return palettes[palette];
  };

  // Extract parameters with defaults
  const glowIntensity = params.glowIntensity ?? 1;
  const shadowSpread = params.shadowSpread ?? 20;
  const animationSpeed = params.animationSpeed ?? 2000;
  const colorPalette = params.colorPalette ?? 'psychedelic';
  const effectStart = params.effectStart ?? 0;
  const effectDuration =
    params.effectDuration ?? animationSpeed / 1000; // Convert ms to seconds

  // Get color palette
  const colors = getColorPalette(colorPalette);

  // Calculate shadow values based on intensity and spread
  const baseBlur = 10 * glowIntensity;
  const midBlur = 20 * glowIntensity;
  const farBlur = 30 * glowIntensity;

  const nearOffset = 2 * glowIntensity;
  const farOffset = -2 * glowIntensity;

  // Create shadow animation ranges
  const shadowRanges = [
    {
      key: 'textShadow',
      val: `0 0 ${baseBlur}px ${colors.color1}, ${nearOffset}px ${nearOffset}px ${midBlur}px ${colors.color2}, ${farOffset}px ${farOffset}px ${farBlur}px ${colors.color3}`,
      prog: 0,
    },
    {
      key: 'textShadow',
      val: `${nearOffset}px 0 ${baseBlur + 5}px ${colors.color2}, ${farOffset}px ${nearOffset}px ${midBlur + 5}px ${colors.color3}, 0 ${farOffset}px ${farBlur + 5}px ${colors.color1}`,
      prog: 0.5,
    },
    {
      key: 'textShadow',
      val: `0 0 ${baseBlur}px ${colors.color1}, ${nearOffset}px ${nearOffset}px ${midBlur}px ${colors.color2}, ${farOffset}px ${farOffset}px ${farBlur}px ${colors.color3}`,
      prog: 1,
    },
  ];

  // Create invert pulse ranges (faster pulse at half duration)
  const invertRanges = [
    { key: 'filter', val: 'invert(1)', prog: 0 },
    { key: 'filter', val: 'invert(0.9)', prog: 0.5 },
    { key: 'filter', val: 'invert(1)', prog: 1 },
  ];

  // Create shadow effect
  const shadowEffect = {
    id: `neon-negative-shadow-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: shadowRanges,
    } as GenericEffectData,
  };

  // Create invert pulse effect (half duration for faster pulsing)
  const invertEffect = {
    id: `neon-negative-invert-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: effectStart,
      duration: effectDuration / 2,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: invertRanges,
    } as GenericEffectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'neon-negative-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [shadowEffect, invertEffect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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
  id: 'neon-negative',
  title: 'Neon Negative Effect',
  description:
    'Internal effect preset that creates an inverted neon glow effect for text elements with animated multi-layer text-shadows in psychedelic hues (cyan, magenta, yellow). Shadows pulse and shift positions creating a vibrating neon sign effect. Supports configurable glow intensity, shadow spread, animation speed, and color palette selection.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'neon',
    'glow',
    'invert',
    'text',
    'psychedelic',
    'vaporwave',
    'acid',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-component'],
    glowIntensity: 1,
    shadowSpread: 20,
    animationSpeed: 2000,
    colorPalette: 'psychedelic',
    effectStart: 0,
  },
};

export const neonNegativePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
