/**
 * Northern Lights Aurora Effect Preset
 *
 * Creates a cinematic aurora borealis effect with flowing gradient ribbons that dance
 * across the screen. Features vertical curtains of light that wave and shimmer with
 * ethereal colors (greens, purples, blues). The gradient ribbons have a natural,
 * wind-blown quality with varying opacity to simulate the aurora's characteristic
 * transparency.
 *
 * Features:
 * - 5-7 aurora ribbon layers with flowing gradient animations
 * - Wave-like motion using skewY transforms
 * - Vertical curtain effect with clip-path polygons
 * - Varying opacity and blur for depth simulation
 * - Text with animated aurora color reflections
 * - Majestic and otherworldly atmosphere
 *
 * Use cases:
 * - Creating mystical background effects
 * - Nature-inspired visual themes
 * - Ethereal text overlays
 * - Dynamic gradient animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  BaseEffect,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z
    .string()
    .default('Northern Lights')
    .describe('Text to display with aurora lighting effect'),
  textFontSize: z
    .number()
    .min(20)
    .max(400)
    .default(96)
    .optional()
    .describe('Font size for the text in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Base color for the text'),
  font: z
    .string()
    .default('Inter:300')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:300")',
    ),
  ribbonCount: z
    .number()
    .min(3)
    .max(7)
    .default(5)
    .optional()
    .describe('Number of aurora ribbon layers (3-7)'),
  auroraIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for aurora opacity and glow'),
  animationSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Speed multiplier for all animations'),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .describe('Duration of the effect in seconds'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:300';
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

  const ribbonCount = params.ribbonCount ?? 5;
  const auroraIntensity = params.auroraIntensity ?? 1;
  const animationSpeed = params.animationSpeed ?? 1;
  const duration = params.duration;

  // Define aurora color palettes
  const auroraColors = [
    {
      // Green (classic aurora)
      color: 'rgba(16, 185, 129',
      positions: ['0%', '20%', '40%', '60%', '100%'],
      opacities: [0, 0.4, 0.6, 0.4, 0],
    },
    {
      // Purple
      color: 'rgba(147, 51, 234',
      positions: ['0%', '25%', '50%', '75%', '100%'],
      opacities: [0, 0.5, 0.7, 0.5, 0],
    },
    {
      // Blue
      color: 'rgba(59, 130, 246',
      positions: ['0%', '15%', '35%', '65%', '100%'],
      opacities: [0, 0.3, 0.5, 0.3, 0],
    },
    {
      // Cyan-Purple gradient
      color: 'rgba(16, 185, 129',
      color2: 'rgba(147, 51, 234',
      positions: ['0%', '30%', '50%', '70%', '100%'],
      opacities: [0, 0.35, 0.55, 0.35, 0],
    },
    {
      // Blue-Cyan gradient
      color: 'rgba(59, 130, 246',
      color2: 'rgba(34, 211, 238',
      positions: ['0%', '25%', '50%', '75%', '100%'],
      opacities: [0, 0.4, 0.6, 0.4, 0],
    },
  ];

  // Helper function to create gradient string
  const createGradient = (colorConfig: any, baseOpacity: number) => {
    const { color, color2, positions, opacities } = colorConfig;
    const stops = positions.map((pos: string, i: number) => {
      const opacity = opacities[i] * baseOpacity * auroraIntensity;
      if (color2 && i >= positions.length / 2) {
        return `${color2}, ${opacity}) ${pos}`;
      }
      return `${color}, ${opacity}) ${pos}`;
    });
    return `linear-gradient(180deg, ${stops.join(', ')})`;
  };

  // Helper function to create clip-path polygon
  const createClipPath = (
    leftStart: number,
    leftEnd: number,
    rightStart: number,
    rightEnd: number,
  ) => {
    return `polygon(${leftStart}% 0%, ${leftEnd}% 0%, ${rightEnd}% 100%, ${rightStart}% 100%)`;
  };

  // Generate aurora ribbon layers
  const auroraLayers: RenderableComponentData[] = [];
  const ribbonConfigs = [
    {
      left: 5,
      clip: [15, 25, 30, 20],
      baseOpacity: 0.4,
      blur: 0,
      speed: 15,
      skewRange: [-3, 3],
      colorIndex: 0,
    },
    {
      left: 25,
      clip: [40, 55, 53, 38],
      baseOpacity: 0.5,
      blur: 1,
      speed: 18,
      skewRange: [2, -4],
      colorIndex: 1,
    },
    {
      left: 50,
      clip: [60, 70, 75, 55],
      baseOpacity: 0.4,
      blur: 0,
      speed: 16,
      skewRange: [-2, 3],
      colorIndex: 2,
    },
    {
      left: 65,
      clip: [72, 85, 87, 70],
      baseOpacity: 0.3,
      blur: 2,
      speed: 17,
      skewRange: [4, -3],
      colorIndex: 3,
    },
    {
      left: 80,
      clip: [82, 92, 94, 80],
      baseOpacity: 0.35,
      blur: 1,
      speed: 19,
      skewRange: [-4, 2],
      colorIndex: 4,
    },
    // Additional ribbons for higher ribbon counts
    {
      left: 10,
      clip: [8, 18, 22, 12],
      baseOpacity: 0.3,
      blur: 3,
      speed: 20,
      skewRange: [3, -2],
      colorIndex: 0,
    },
    {
      left: 35,
      clip: [33, 43, 48, 38],
      baseOpacity: 0.35,
      blur: 2,
      speed: 14,
      skewRange: [-3, 4],
      colorIndex: 2,
    },
  ];

  for (let i = 0; i < ribbonCount; i++) {
    const config = ribbonConfigs[i];
    const layerId = `aurora-layer-${i + 1}`;
    const colorConfig = auroraColors[config.colorIndex];
    const gradient = createGradient(colorConfig, config.baseOpacity);
    const clipPath = createClipPath(...(config.clip as [number, number, number, number]));

    // Create ribbon HTML
    const ribbonHTML = `<div style="width: 100%; height: 200%; background: ${gradient}; clip-path: ${clipPath}; ${config.blur > 0 ? `filter: blur(${config.blur}px);` : ''}"></div>`;

    // Create ribbon layer
    const ribbonLayer: RenderableComponentData = {
      id: layerId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: ribbonHTML,
        className: 'absolute',
        style: {
          left: `${config.left}%`,
          top: '-100%',
          opacity: config.baseOpacity * auroraIntensity,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };

    // Create ribbon effect
    const effectDuration = config.speed / animationSpeed;
    const ribbonEffect: BaseEffect = {
      id: `aurora-effect-${i + 1}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: (i * 0.5) / animationSpeed,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [layerId],
        ranges: [
          // Vertical movement (flow down)
          { key: 'translateY', val: -100, prog: 0, unit: '%' },
          { key: 'translateY', val: 0, prog: 1, unit: '%' },
          // Wave motion (skew)
          { key: 'skewY', val: config.skewRange[0], prog: 0, unit: 'deg' },
          { key: 'skewY', val: config.skewRange[1], prog: 0.5, unit: 'deg' },
          { key: 'skewY', val: config.skewRange[0], prog: 1, unit: 'deg' },
          // Opacity variation
          {
            key: 'opacity',
            val: config.baseOpacity * 0.7 * auroraIntensity,
            prog: 0,
          },
          {
            key: 'opacity',
            val: config.baseOpacity * 1.2 * auroraIntensity,
            prog: 0.5,
          },
          {
            key: 'opacity',
            val: config.baseOpacity * auroraIntensity,
            prog: 1,
          },
        ],
      } as GenericEffectData,
    };

    ribbonLayer.effects = [ribbonEffect];
    auroraLayers.push(ribbonLayer);
  }

  // Create text atom with aurora glow effect
  const textAtomId = 'aurora-text';
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'tracking-wide',
      style: {
        fontSize: params.textFontSize ?? 96,
        color: params.textColor ?? '#FFFFFF',
        fontWeight: fontStyle.fontWeight ?? 300,
        fontStyle: fontStyle.fontStyle ?? 'normal',
        textShadow:
          '0 0 20px rgba(16, 185, 129, 0.8), 0 0 40px rgba(147, 51, 234, 0.6)',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['300'],
      },
    },
    context: {
      timing: {
        start: 2,
        duration: duration - 2,
      },
    },
  };

  // Create text effects
  const textFadeEffect: BaseEffect = {
    id: 'text-fade-in',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: 2,
      mode: 'provider',
      targetIds: [textAtomId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const textGlowEffect: BaseEffect = {
    id: 'text-glow-cycle',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 2,
      duration: duration - 4,
      mode: 'provider',
      targetIds: [textAtomId],
      ranges: [
        {
          key: 'text-shadow',
          val: '0 0 20px rgba(16, 185, 129, 0.8), 0 0 40px rgba(147, 51, 234, 0.6)',
          prog: 0,
        },
        {
          key: 'text-shadow',
          val: '0 0 30px rgba(147, 51, 234, 0.9), 0 0 60px rgba(59, 130, 246, 0.7)',
          prog: 0.33,
        },
        {
          key: 'text-shadow',
          val: '0 0 25px rgba(59, 130, 246, 0.8), 0 0 50px rgba(16, 185, 129, 0.6)',
          prog: 0.66,
        },
        {
          key: 'text-shadow',
          val: '0 0 20px rgba(16, 185, 129, 0.8), 0 0 40px rgba(147, 51, 234, 0.6)',
          prog: 1,
        },
      ],
    } as GenericEffectData,
  };

  textAtom.effects = [textFadeEffect, textGlowEffect];

  // Create text container
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-20 flex items-center justify-center w-full h-full',
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

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'northern-lights-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-b from-black via-gray-900 to-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [...auroraLayers, textContainer],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'northern-lights-aurora',
  title: 'Northern Lights Aurora Effect',
  description:
    'Cinematic aurora borealis effect with flowing gradient ribbons that dance across the screen. Features vertical curtains of light with wave and shimmer effects in ethereal greens, purples, and blues. Text appears lit by the aurora with subtle color reflections.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'aurora',
    'northern-lights',
    'gradient',
    'ribbons',
    'cinematic',
    'ethereal',
    'nature',
    'background',
    'text-overlay',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Northern Lights',
    textFontSize: 96,
    textColor: '#FFFFFF',
    font: 'Inter:300',
    ribbonCount: 5,
    auroraIntensity: 1,
    animationSpeed: 1,
    duration: 20,
  },
};

// --- Export Preset ---

export const northernLightsAuroraPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
