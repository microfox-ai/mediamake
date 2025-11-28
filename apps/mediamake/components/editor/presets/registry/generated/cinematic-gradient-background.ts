/**
 * Cinematic Gradient Background Animation Preset
 *
 * This preset creates a luxury brand cinematic gradient background with smooth, continuous
 * color transitions that flow like liquid behind static text. The gradient slowly morphs
 * between premium colors (deep purples, rich blues, warm golds) using a sine wave timing
 * pattern. The text remains perfectly still and legible, creating a striking contrast
 * between the fluid background motion and the stable foreground.
 *
 * Features:
 * - Continuous gradient rotation (0 to 360 degrees) over full duration
 * - Organic scale animations (1 to 1.5 and back) for depth
 * - Subtle blur filter animation (0px to 8px) for atmospheric depth
 * - Static, perfectly legible text with strong contrast
 * - Premium color palette (deep purples, rich blues, warm golds)
 * - Smooth ease-in-out easing for organic motion
 *
 * Use cases:
 * - Luxury brand video backgrounds
 * - Premium product showcases
 * - High-end title sequences
 * - Elegant video intros/outros
 * - Sophisticated brand content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  text: z
    .string()
    .default('LUXURY')
    .describe('Text to display in the foreground (static and legible)'),
  
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Montserrat:800")',
    ),
  
  fontSize: z
    .number()
    .min(24)
    .max(400)
    .default(96)
    .describe('Font size in pixels for the text'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex, rgb, or CSS color name)'),
  
  textShadow: z
    .string()
    .optional()
    .describe(
      'Text shadow for enhanced readability (e.g., "0 4px 20px rgba(0, 0, 0, 0.8)")',
    ),
  
  gradientColors: z
    .array(z.string())
    .min(3)
    .max(5)
    .default(['#1e3a8a', '#7c3aed', '#a855f7', '#d97706'])
    .describe(
      'Array of gradient colors to morph between (3-5 premium colors recommended)',
    ),
  
  rotationDuration: z
    .number()
    .min(5)
    .max(60)
    .optional()
    .describe(
      'Duration for full gradient rotation in seconds (defaults to parent duration)',
    ),
  
  scaleRange: z
    .tuple([z.number(), z.number()])
    .default([1, 1.5])
    .describe('Scale range for gradient animation [min, max] (e.g., [1, 1.5])'),
  
  blurRange: z
    .tuple([z.number(), z.number()])
    .default([0, 8])
    .describe('Blur range in pixels [min, max] (e.g., [0, 8])'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Build gradient CSS from color array
  const buildGradient = (colors: string[]): string => {
    const colorStops = colors.map((color, index) => {
      const percentage = (index / (colors.length - 1)) * 100;
      return `${color} ${percentage}%`;
    });
    return `linear-gradient(135deg, ${colorStops.join(', ')})`;
  };

  const gradientStyle = buildGradient(params.gradientColors);

  // IDs for targeting
  const gradientBackgroundId = 'cinematic-gradient-bg';
  const staticTextId = 'cinematic-static-text';

  // Gradient background effects
  const gradientEffects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [
    // Fade in effect
    {
      id: 'gradient-fade-in',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: 1,
        mode: 'provider',
        targetIds: [gradientBackgroundId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    },
    // Continuous rotation (0deg to 360deg)
    {
      id: 'gradient-rotation',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        fitDurationTo: 'parent',
        mode: 'provider',
        targetIds: [gradientBackgroundId],
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: 360, prog: 1 },
        ],
      },
    },
    // Scale animation (1 to 1.5 to 1) - organic breathing
    {
      id: 'gradient-scale',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        fitDurationTo: 'parent',
        mode: 'provider',
        targetIds: [gradientBackgroundId],
        ranges: [
          { key: 'scale', val: params.scaleRange[0], prog: 0 },
          { key: 'scale', val: params.scaleRange[1], prog: 0.5 },
          { key: 'scale', val: params.scaleRange[0], prog: 1 },
        ],
      },
    },
    // Blur animation (0px to 8px to 0px) - depth effect
    {
      id: 'gradient-blur',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        fitDurationTo: 'parent',
        mode: 'provider',
        targetIds: [gradientBackgroundId],
        ranges: [
          { key: 'blur', val: params.blurRange[0], prog: 0 },
          { key: 'blur', val: params.blurRange[1], prog: 0.5 },
          { key: 'blur', val: params.blurRange[0], prog: 1 },
        ],
      },
    },
  ];

  // Gradient background layer
  const gradientBackground: RenderableComponentData = {
    id: gradientBackgroundId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full',
        style: {
          background: gradientStyle,
          backgroundSize: '400% 400%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'parent',
      },
    },
    effects: gradientEffects,
    childrenData: [],
  };

  // Static text layer (perfectly still, no effects)
  const staticText: RenderableComponentData = {
    id: staticTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'relative z-10 text-center',
      style: {
        fontSize: `${params.fontSize}px`,
        color: params.textColor,
        fontWeight: fontStyle.fontWeight || 700,
        fontStyle: fontStyle.fontStyle,
        textShadow:
          params.textShadow ||
          '0 4px 20px rgba(0, 0, 0, 0.8), 0 2px 10px rgba(0, 0, 0, 0.6)',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        subsets: ['latin'],
        display: 'swap',
        preload: true,
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'parent',
      },
    },
    effects: [],
    childrenData: [],
  };

  // Root container with layered children
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-gradient-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'parent',
      },
    },
    childrenData: [gradientBackground, staticText],
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
  id: 'cinematic-gradient-background',
  title: 'Cinematic Gradient Background Animation',
  description:
    'Luxury brand cinematic gradient background with smooth, continuous color transitions flowing like liquid behind static text. Features rotating, scaling, and blurring gradient animations with deep purples, rich blues, and warm golds. Text remains perfectly still and legible with high contrast against the fluid background motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'background',
    'gradient',
    'cinematic',
    'luxury',
    'brand',
    'animated',
    'fluid',
    'motion',
    'premium',
    'title',
  ],
  defaultInputParams: {
    text: 'LUXURY',
    font: 'Inter:700',
    fontSize: 96,
    textColor: '#FFFFFF',
    textShadow:
      '0 4px 20px rgba(0, 0, 0, 0.8), 0 2px 10px rgba(0, 0, 0, 0.6)',
    gradientColors: ['#1e3a8a', '#7c3aed', '#a855f7', '#d97706'],
    scaleRange: [1, 1.5],
    blurRange: [0, 8],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicGradientBackgroundPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
