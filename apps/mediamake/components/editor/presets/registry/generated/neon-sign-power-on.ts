/**
 * Neon Sign Power-On Animation Preset
 *
 * This preset creates a vintage neon sign animation where text appears as dim outlines
 * that suddenly illuminate and fill with vibrant glowing color, mimicking classic neon
 * signs powering on. Features a characteristic flicker effect during the charge-up sequence
 * with the glow intensity pulsing before stabilizing.
 *
 * Features:
 * - **Dim Outline to Full Glow**: Text starts as dim stroke outlines, then fills with color
 * - **Flicker Effect**: Characteristic neon startup flicker with multiple charge-up pulses
 * - **Glow Layers**: Multiple text-shadow layers for realistic neon glow (inner, medium, outer)
 * - **Mix Blend Mode**: Screen blending for authentic luminous neon effect
 * - **Customizable Colors**: Support for any neon color (classic red, blue, pink, etc.)
 * - **Timing Control**: Configurable flicker duration and stabilization timing
 *
 * Use cases:
 * - Retro/vintage title sequences
 * - Noir-style film titles
 * - 80s/synthwave aesthetics
 * - Bar/nightclub themed videos
 * - Cinematic neon sign reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display as neon sign'),
  neonColor: z
    .string()
    .default('#FF006E')
    .describe('Neon color (hex or rgb) - classic options: #FF006E (pink), #00F5FF (cyan), #FF3131 (red), #FFEB3B (yellow)'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (Google Fonts supported)'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  strokeWidth: z
    .number()
    .default(2)
    .describe('Text stroke width in pixels for outline effect'),
  flickerDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the flicker/charge-up effect in seconds'),
  totalDuration: z
    .number()
    .default(5)
    .describe('Total duration of the neon sign animation in seconds'),
  glowIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Glow intensity multiplier (higher = brighter glow)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    neonColor,
    fontSize,
    fontFamily,
    fontWeight,
    strokeWidth,
    flickerDuration,
    totalDuration,
    glowIntensity,
  } = params;

  const textId = 'neon-text';
  const containerId = 'neon-sign-container';

  // Calculate glow shadow values based on intensity
  const innerGlow = `0 0 ${10 * glowIntensity}px ${neonColor}`;
  const mediumGlow = `0 0 ${20 * glowIntensity}px ${neonColor}`;
  const outerGlow = `0 0 ${40 * glowIntensity}px ${neonColor}`;
  const textShadow = `${innerGlow}, ${mediumGlow}, ${outerGlow}`;

  // Flicker effect: animates fill color from transparent to color with characteristic flicker
  // Keyframes at [0%, 40%, 45%, 50%, 100%] create the neon startup flicker pattern
  const flickerEffect = {
    id: 'neon-flicker-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: flickerDuration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        // Fill color flicker: transparent -> color -> transparent -> color -> color (stable)
        { key: 'color', val: 'transparent', prog: 0 },
        { key: 'color', val: neonColor, prog: 0.4 },
        { key: 'color', val: 'transparent', prog: 0.45 },
        { key: 'color', val: neonColor, prog: 0.5 },
        { key: 'color', val: neonColor, prog: 1 },
        // Opacity flicker for added effect
        { key: 'opacity', val: 0.6, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.4 },
        { key: 'opacity', val: 0.7, prog: 0.45 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Glow pulse effect: pulsing glow intensity after flicker stabilizes
  const glowPulseEffect = {
    id: 'neon-glow-pulse-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: flickerDuration,
      duration: totalDuration - flickerDuration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        // Subtle glow pulse: normal -> bright -> normal
        {
          key: 'textShadow',
          val: textShadow,
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0 0 ${15 * glowIntensity}px ${neonColor}, 0 0 ${30 * glowIntensity}px ${neonColor}, 0 0 ${60 * glowIntensity}px ${neonColor}`,
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: textShadow,
          prog: 1,
        },
      ],
    },
  };

  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'mix-blend-screen',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: 'transparent', // Start transparent, will be filled by flicker effect
        WebkitTextStroke: `${strokeWidth}px ${neonColor}`,
        WebkitTextFillColor: 'transparent',
        textShadow: textShadow,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [flickerEffect, glowPulseEffect],
  };

  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'neon-sign-power-on',
  title: 'Neon Sign Power-On Animation',
  description:
    'Vintage neon sign animation with dim outline that suddenly illuminates with vibrant glowing color, featuring characteristic flicker effect during charge-up sequence and pulsing glow before stabilization. Mimics classic noir film neon signs powering on.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'neon',
    'glow',
    'flicker',
    'vintage',
    'retro',
    'noir',
    'title',
    'animation',
    'luminous',
  ],
  defaultInputParams: {
    text: 'OPEN',
    neonColor: '#FF006E',
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: '700',
    strokeWidth: 2,
    flickerDuration: 1.5,
    totalDuration: 5,
    glowIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const neonSignPowerOnPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
