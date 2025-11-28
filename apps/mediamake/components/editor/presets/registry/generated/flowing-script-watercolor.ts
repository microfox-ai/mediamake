/**
 * Flowing Script Watercolor Text Preset
 *
 * This preset creates an elegant script typography effect with watercolor aesthetics.
 * The text appears with a handwritten calligraphy animation where strokes write themselves,
 * followed by watercolor blooms that fill the letters. The effect includes subtle parallax
 * floating animations and smooth focus pulls for a sophisticated, artistic presentation.
 *
 * Features:
 * - **SVG Path Animation**: Simulates calligrapher's hand movement with stroke-dashoffset
 * - **Watercolor Bloom**: Scale and opacity animations that bloom after each stroke
 * - **Parallax Float**: Different text layers move at slightly different speeds
 * - **Focus Pulls**: Subtle blur sweeps across the text for depth
 * - **Gradient Flow**: Flowing watercolor gradients that shift and blend
 * - **Custom Cursive Font**: Uses Dancing Script or similar elegant font
 * - **Mathematical Easing**: Natural hand movement simulation with cubic-bezier
 *
 * Use cases:
 * - Elegant title cards for videos
 * - Wedding or event announcements
 * - Artistic intro sequences
 * - Sophisticated brand presentations
 * - Poetic or literary content overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Input parameters
const presetParams = z.object({
  text: z
    .string()
    .default('Beautiful Watercolor')
    .describe('Text to display in elegant script'),
  font: z
    .string()
    .default('Dancing Script:700')
    .describe('Font family with weight (e.g., "Dancing Script:700:normal", "Pacifico:400")'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(80)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (used for stroke and fallback)'),
  gradientColors: z
    .array(z.string())
    .default(['#FF6B9D', '#C44569', '#9B59B6', '#5F27CD', '#0ABDE3'])
    .describe('Array of colors for watercolor gradient flow'),
  strokeDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of the writing stroke animation in seconds'),
  bloomDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of the watercolor bloom animation in seconds'),
  bloomDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.6)
    .describe('Delay before bloom starts (as ratio of stroke duration, 0-1 or seconds)'),
  parallaxIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(15)
    .describe('Intensity of parallax floating effect in pixels'),
  parallaxDuration: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Duration of one parallax float cycle in seconds'),
  focusPullIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of focus pull blur in pixels'),
  focusPullStart: z
    .number()
    .min(0)
    .default(2.5)
    .describe('When to start focus pull effect (seconds from start)'),
  focusPullDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(2)
    .describe('Duration of focus pull sweep in seconds'),
  duration: z
    .number()
    .min(1)
    .default(8)
    .describe('Total duration of the preset in seconds'),
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text'),
  horizontalPosition: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal position of text'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Dancing Script:700';
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
  } else {
    fontStyle.fontWeight = 700; // Default bold for script fonts
  }

  // Generate gradient CSS
  const gradientCss = `linear-gradient(90deg, ${params.gradientColors.join(', ')})`;

  // Calculate bloom delay
  const bloomDelay =
    params.bloomDelay < 1
      ? params.strokeDuration * params.bloomDelay
      : params.bloomDelay;

  // Position classes based on params
  const verticalClass =
    params.verticalPosition === 'top'
      ? 'items-start pt-20'
      : params.verticalPosition === 'bottom'
        ? 'items-end pb-20'
        : 'items-center';
  const horizontalClass =
    params.horizontalPosition === 'left'
      ? 'justify-start pl-20'
      : params.horizontalPosition === 'right'
        ? 'justify-end pr-20'
        : 'justify-center';

  // --- Watercolor blob backgrounds ---
  const watercolorBlobs: RenderableComponentData[] = [
    {
      id: 'watercolor-blob-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, ${params.gradientColors[0]}99, ${params.gradientColors[1]}4D); filter: blur(40px);"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          top: '20%',
          left: '15%',
          transform: 'translateZ(0)',
        },
      },
      context: {
        timing: {
          start: bloomDelay,
          duration: params.duration - bloomDelay,
        },
      },
      effects: [
        {
          id: 'blob-1-bloom',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: params.bloomDuration,
            mode: 'provider',
            targetIds: ['watercolor-blob-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.8, prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.6 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          } as GenericEffectData,
        },
        {
          id: 'blob-1-float',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: params.parallaxDuration,
            mode: 'provider',
            targetIds: ['watercolor-blob-1'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -params.parallaxIntensity * 0.7, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
    {
      id: 'watercolor-blob-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 350px; height: 350px; border-radius: 50%; background: radial-gradient(circle, ${params.gradientColors[2]}80, ${params.gradientColors[3]}33); filter: blur(50px);"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          top: '40%',
          right: '20%',
          transform: 'translateZ(0)',
        },
      },
      context: {
        timing: {
          start: bloomDelay + 0.3,
          duration: params.duration - bloomDelay - 0.3,
        },
      },
      effects: [
        {
          id: 'blob-2-bloom',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: params.bloomDuration * 1.1,
            mode: 'provider',
            targetIds: ['watercolor-blob-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.7, prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.15, prog: 0.7 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          } as GenericEffectData,
        },
        {
          id: 'blob-2-float',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: params.parallaxDuration,
            mode: 'provider',
            targetIds: ['watercolor-blob-2'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -params.parallaxIntensity, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
    {
      id: 'watercolor-blob-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, ${params.gradientColors[4]}99, ${params.gradientColors[0]}4D); filter: blur(45px);"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          bottom: '25%',
          left: '35%',
          transform: 'translateZ(0)',
        },
      },
      context: {
        timing: {
          start: bloomDelay + 0.15,
          duration: params.duration - bloomDelay - 0.15,
        },
      },
      effects: [
        {
          id: 'blob-3-bloom',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: params.bloomDuration,
            mode: 'provider',
            targetIds: ['watercolor-blob-3'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.75, prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.12, prog: 0.65 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          } as GenericEffectData,
        },
        {
          id: 'blob-3-float',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: params.parallaxDuration,
            mode: 'provider',
            targetIds: ['watercolor-blob-3'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -params.parallaxIntensity * 1.3, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
  ];

  // --- SVG stroke layer (simulated calligraphy) ---
  const strokeLayer: RenderableComponentData = {
    id: 'script-stroke-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width="100%" height="200" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <path d="M50,100 Q100,70 150,100 T250,100 Q300,130 350,100 T450,100 Q500,70 550,100 T650,100 Q700,130 750,100" 
          fill="none" 
          stroke="${params.textColor}80" 
          stroke-width="3" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          style="stroke-dasharray: 1000; stroke-dashoffset: 1000;" />
      </svg>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.strokeDuration,
      },
    },
    effects: [
      {
        id: 'stroke-write',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          start: 0,
          duration: params.strokeDuration,
          mode: 'provider',
          targetIds: ['script-stroke-layer'],
          ranges: [
            { key: 'strokeDashoffset', val: 1000, prog: 0 },
            { key: 'strokeDashoffset', val: 0, prog: 1 },
          ],
          easingParams: [0.65, 0, 0.35, 1],
        } as GenericEffectData,
      },
    ],
  };

  // --- Text fill layer with gradient ---
  const textFillLayer: RenderableComponentData = {
    id: 'script-text-fill',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        display: 'swap',
      },
      className: `text-transparent bg-clip-text`,
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontStyle.fontWeight || 700,
        fontStyle: fontStyle.fontStyle || 'normal',
        backgroundImage: gradientCss,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
        letterSpacing: '0.05em',
        transform: 'translateZ(0)',
      },
    },
    context: {
      timing: {
        start: bloomDelay,
        duration: params.duration - bloomDelay,
      },
    },
    effects: [
      {
        id: 'text-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.bloomDuration * 0.7,
          mode: 'provider',
          targetIds: ['script-text-fill'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
      {
        id: 'text-parallax-float',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: params.parallaxDuration,
          mode: 'provider',
          targetIds: ['script-text-fill'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -params.parallaxIntensity * 0.8, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
      {
        id: 'focus-pull-sweep',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: params.focusPullStart,
          duration: params.focusPullDuration,
          mode: 'provider',
          targetIds: ['script-text-fill'],
          ranges: [
            { key: 'filter', val: `drop-shadow(0 4px 8px rgba(0,0,0,0.15)) blur(0px)`, prog: 0 },
            { key: 'filter', val: `drop-shadow(0 4px 8px rgba(0,0,0,0.15)) blur(${params.focusPullIntensity}px)`, prog: 0.5 },
            { key: 'filter', val: `drop-shadow(0 4px 8px rgba(0,0,0,0.15)) blur(0px)`, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // --- Assemble the composition ---
  const rootContainer: RenderableComponentData = {
    id: 'flowing-script-watercolor-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative h-full w-full flex ${verticalClass} ${horizontalClass} overflow-hidden`,
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      // Watercolor background layer
      {
        id: 'watercolor-background-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: watercolorBlobs,
      },
      // Text content layer
      {
        id: 'script-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative z-10',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [strokeLayer, textFillLayer],
      },
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'flowingScriptWatercolor',
  title: 'Flowing Script Watercolor Text',
  description:
    'Elegant script text with watercolor bloom effects, simulating calligrapher hand movement with stroke animations, gradient fills, parallax floating, and focus pull sweeps. Features smooth acceleration/deceleration, flowing watercolor gradients that shift and blend, and sophisticated fluid motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'script',
    'watercolor',
    'calligraphy',
    'elegant',
    'artistic',
    'gradient',
    'parallax',
    'sophisticated',
    'handwritten',
    'flowing',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Beautiful Watercolor',
    font: 'Dancing Script:700',
    fontSize: 80,
    textColor: '#FFFFFF',
    gradientColors: ['#FF6B9D', '#C44569', '#9B59B6', '#5F27CD', '#0ABDE3'],
    strokeDuration: 2,
    bloomDuration: 1.5,
    bloomDelay: 0.6,
    parallaxIntensity: 15,
    parallaxDuration: 5,
    focusPullIntensity: 2,
    focusPullStart: 2.5,
    focusPullDuration: 2,
    duration: 8,
    verticalPosition: 'center',
    horizontalPosition: 'center',
  },
};

export const flowingScriptWatercolorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
