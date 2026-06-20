/**
 * Retro Vaporwave Gradient Scene Preset
 *
 * This preset creates a retro-futuristic animated gradient with sharp angular transitions,
 * inspired by 80s motion graphics and vaporwave aesthetics. Features neon grid backgrounds
 * with diagonal gradient sweeps that slide across the screen in geometric patterns.
 *
 * Features:
 * - Multiple gradient layers sliding in different directions (diagonal, horizontal)
 * - Bold, contrasting neon colors (hot pink, electric blue, neon green)
 * - Hard edges with sharp transitions using clip-path animations
 * - Retro glow text effect with chromatic aberration
 * - Step-based easing for authentic digital retro feel
 * - Angular geometric reveals using polygon clip-paths
 *
 * Use cases:
 * - 80s/vaporwave aesthetic videos
 * - Retro gaming content
 * - Synthwave music visualizers
 * - Cyberpunk-themed motion graphics
 * - Nostalgic digital art animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('VAPORWAVE')
    .describe('Text to display with retro glow effect'),
  duration: z
    .number()
    .default(10)
    .describe('Duration of the scene in seconds'),
  textColor: z
    .string()
    .default('#FF1493,#00FFFF')
    .describe('Gradient colors for text (comma-separated hex values)'),
  fontFamily: z
    .string()
    .default('Orbitron')
    .describe('Font family for the text (Google Fonts)'),
  fontSize: z
    .number()
    .default(128)
    .describe('Font size for the text in pixels'),
  gradientColors: z
    .object({
      layer1Start: z.string().default('#FF1493').describe('Layer 1 start color'),
      layer1End: z.string().default('#00FFFF').describe('Layer 1 end color'),
      layer2Start: z.string().default('#00FF00').describe('Layer 2 start color'),
      layer2End: z.string().default('#FF1493').describe('Layer 2 end color'),
      layer3Color1: z.string().default('#00BFFF').describe('Layer 3 color 1'),
      layer3Color2: z.string().default('#FF1493').describe('Layer 3 color 2'),
      layer3Color3: z.string().default('#00FF00').describe('Layer 3 color 3'),
    })
    .optional()
    .describe('Custom gradient colors for each layer'),
  transitionSpeed: z
    .enum(['slow', 'medium', 'fast'])
    .default('medium')
    .describe('Speed of gradient transitions'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    textColor,
    fontFamily,
    fontSize,
    gradientColors,
    transitionSpeed,
  } = params;

  // Parse text gradient colors
  const textColors = textColor.split(',').map((c) => c.trim());
  const textGradient = textColors.length >= 2
    ? `linear-gradient(90deg, ${textColors[0]}, ${textColors[1]})`
    : `linear-gradient(90deg, #FF1493, #00FFFF)`;

  // Get gradient colors with fallbacks
  const colors = gradientColors || {
    layer1Start: '#FF1493',
    layer1End: '#00FFFF',
    layer2Start: '#00FF00',
    layer2End: '#FF1493',
    layer3Color1: '#00BFFF',
    layer3Color2: '#FF1493',
    layer3Color3: '#00FF00',
  };

  // Calculate transition durations based on speed
  const getTransitionDuration = () => {
    switch (transitionSpeed) {
      case 'slow':
        return duration;
      case 'fast':
        return Math.min(duration * 0.6, 6);
      default:
        return Math.min(duration * 0.8, 8);
    }
  };

  const transitionDuration = getTransitionDuration();

  // Gradient layer 1: Diagonal sweep (top-left to bottom-right)
  const gradientLayer1: RenderableComponentData = {
    id: 'gradient-layer-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute inset-0',
      style: {
        background: `linear-gradient(45deg, ${colors.layer1Start} 0%, ${colors.layer1End} 100%)`,
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'gradient-1-slide',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['gradient-layer-1'],
          ranges: [
            { key: 'translateX', val: -100, prog: 0 },
            { key: 'translateX', val: 100, prog: 1 },
            { key: 'translateY', val: -100, prog: 0 },
            { key: 'translateY', val: 100, prog: 1 },
          ],
        },
      },
      {
        id: 'gradient-1-clip',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['gradient-layer-1'],
          ranges: [
            { key: 'clipPath', val: 'polygon(0 0, 0% 0, 0% 100%, 0 100%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Gradient layer 2: Diagonal sweep (opposite direction)
  const gradientLayer2: RenderableComponentData = {
    id: 'gradient-layer-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute inset-0',
      style: {
        background: `linear-gradient(-45deg, ${colors.layer2Start} 0%, ${colors.layer2End} 100%)`,
        zIndex: 12,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'gradient-2-slide',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: Math.min(1, duration * 0.1),
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gradient-layer-2'],
          ranges: [
            { key: 'translateX', val: 100, prog: 0 },
            { key: 'translateX', val: -100, prog: 1 },
            { key: 'translateY', val: 100, prog: 0 },
            { key: 'translateY', val: -100, prog: 1 },
          ],
        },
      },
      {
        id: 'gradient-2-clip',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: Math.min(1, duration * 0.1),
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gradient-layer-2'],
          ranges: [
            { key: 'clipPath', val: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Gradient layer 3: Horizontal sweep with multi-color gradient
  const gradientLayer3: RenderableComponentData = {
    id: 'gradient-layer-3',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute inset-0',
      style: {
        background: `linear-gradient(90deg, ${colors.layer3Color1} 0%, ${colors.layer3Color2} 50%, ${colors.layer3Color3} 100%)`,
        zIndex: 15,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'gradient-3-slide',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: Math.min(2, duration * 0.2),
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gradient-layer-3'],
          ranges: [
            { key: 'translateX', val: -150, prog: 0 },
            { key: 'translateX', val: 150, prog: 1 },
          ],
        },
      },
      {
        id: 'gradient-3-clip',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: Math.min(2, duration * 0.2),
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['gradient-layer-3'],
          ranges: [
            { key: 'clipPath', val: 'polygon(50% 0, 50% 0, 50% 100%, 50% 100%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Text atom with retro glow and chromatic aberration
  const textAtom: RenderableComponentData = {
    id: 'text-atom',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-transparent bg-clip-text uppercase',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        letterSpacing: '0.1em',
        textShadow: '2px 2px 0 #FF00FF, -2px -2px 0 #00FFFF, 0 0 20px rgba(255,20,147,0.8), 0 0 40px rgba(0,255,255,0.6)',
        backgroundImage: textGradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
      font: {
        family: fontFamily,
        weights: ['900'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'text-glow-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['text-atom'],
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.7, prog: 1 },
          ],
        },
      },
    ],
  };

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'retro-vaporwave-gradient-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      gradientLayer1,
      gradientLayer2,
      gradientLayer3,
      textContainer,
    ] as RenderableComponentData[],
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
  id: 'retro-vaporwave-gradient',
  title: 'Retro Vaporwave Gradient Scene',
  description:
    'A retro-futuristic animated gradient preset with sharp angular transitions inspired by 80s motion graphics and vaporwave aesthetics. Features multiple gradient layers sliding in different directions with geometric clip-path reveals, bold contrasting neon colors (hot pink, electric blue, neon green), and text with retro glow and chromatic aberration effects. Uses step() easing for authentic digital retro feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'gradient',
    'retro',
    'vaporwave',
    '80s',
    'neon',
    'animated',
    'geometric',
    'angular',
    'synthwave',
    'cyberpunk',
    'motion-graphics',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'VAPORWAVE',
    duration: 10,
    textColor: '#FF1493,#00FFFF',
    fontFamily: 'Orbitron',
    fontSize: 128,
    transitionSpeed: 'medium',
  },
};

export const retroVaporwaveGradientPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
