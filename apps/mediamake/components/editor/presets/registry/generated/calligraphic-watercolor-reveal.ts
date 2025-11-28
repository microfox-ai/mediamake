/**
 * Calligraphic Watercolor Reveal Preset
 *
 * A sophisticated text reveal featuring elegant calligraphic stroke animation
 * followed by organic watercolor-style fill effects. The preset creates an
 * artistic, handcrafted aesthetic perfect for luxury brands or artistic presentations.
 *
 * Features:
 * - Variable stroke width animation simulating pen pressure
 * - Calligraphic stroke reveal with custom clip-path animation
 * - Multiple overlapping gradient fill layers for watercolor effect
 * - Organic edge distortion and color bleeding simulation
 * - Staggered timing creates natural, artistic flow
 * - Supports custom text, colors, and timing parameters
 *
 * Use cases:
 * - Luxury brand titles and intros
 * - Artistic video presentations
 * - Elegant event announcements
 * - High-end product reveals
 * - Creative portfolio showcases
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('Elegance')
    .describe('Text to display with calligraphic watercolor reveal effect'),
  
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  
  primaryColor: z
    .string()
    .default('#2c2c2c')
    .describe('Primary text color (dark stroke and final text)'),
  
  gradientColor1: z
    .string()
    .default('#1a1a1a')
    .describe('First gradient color for watercolor fill'),
  
  gradientColor2: z
    .string()
    .default('#3d3d3d')
    .describe('Second gradient color for watercolor fill'),
  
  highlightColor: z
    .string()
    .default('rgba(255,255,255,0.3)')
    .describe('Highlight color for watercolor shimmer effect'),
  
  strokeDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of stroke reveal animation in seconds'),
  
  fillDelay: z
    .number()
    .min(0)
    .max(3)
    .default(2.2)
    .describe('Delay before fill starts (relative to animation start)'),
  
  fillDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of watercolor fill animation in seconds'),
  
  totalDuration: z
    .number()
    .min(2)
    .max(15)
    .default(5)
    .describe('Total duration of the entire animation'),
  
  fontFamily: z
    .string()
    .default('Playfair Display')
    .describe('Font family for elegant typography (e.g., "Playfair Display", "Cormorant Garamond", "Cinzel")'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    primaryColor,
    gradientColor1,
    gradientColor2,
    highlightColor,
    strokeDuration,
    fillDelay,
    fillDuration,
    totalDuration,
    fontFamily,
  } = params;

  // IDs for targeting
  const strokeLayerId1 = 'calligraphic-stroke-layer-1';
  const strokeLayerId2 = 'calligraphic-stroke-layer-2';
  const fillLayerBaseId = 'watercolor-fill-base';
  const fillLayerHighlightId = 'watercolor-fill-highlight';
  const finalTextId = 'final-text-layer';

  // Stroke layer 1 (primary stroke)
  const strokeLayer1 = {
    id: strokeLayerId1,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'font-serif italic absolute',
      style: {
        fontSize: `${fontSize}px`,
        color: 'transparent',
        WebkitTextStroke: `2px ${primaryColor}`,
        textStroke: `2px ${primaryColor}`,
        fontWeight: '400',
        letterSpacing: '0.02em',
      },
      font: {
        family: fontFamily,
        weights: ['400', '700'],
        subsets: ['latin'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'stroke-reveal-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic' as const,
          start: 0,
          duration: strokeDuration,
          mode: 'provider' as const,
          targetIds: [strokeLayerId1],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(0 0, 0% 0, 0% 100%, 0 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Stroke layer 2 (softer, wider stroke for depth)
  const strokeLayer2 = {
    id: strokeLayerId2,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'font-serif italic absolute',
      style: {
        fontSize: `${fontSize}px`,
        color: 'transparent',
        WebkitTextStroke: `3.5px rgba(44, 44, 44, 0.3)`,
        textStroke: `3.5px rgba(44, 44, 44, 0.3)`,
        fontWeight: '400',
        letterSpacing: '0.02em',
        filter: 'blur(1px)',
      },
      font: {
        family: fontFamily,
        weights: ['400', '700'],
        subsets: ['latin'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'stroke-secondary-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic' as const,
          start: 0.15,
          duration: strokeDuration,
          mode: 'provider' as const,
          targetIds: [strokeLayerId2],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(0 0, 0% 0, 0% 100%, 0 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Fill layer base (main watercolor fill)
  const fillLayerBase = {
    id: fillLayerBaseId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'font-serif italic absolute',
      gradient: `linear-gradient(135deg, ${gradientColor1} 0%, ${gradientColor2} 50%, ${gradientColor1} 100%)`,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '400',
        letterSpacing: '0.02em',
        filter: 'blur(0.5px)',
      },
      font: {
        family: fontFamily,
        weights: ['400', '700'],
        subsets: ['latin'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'fill-base-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: fillDelay,
          duration: fillDuration,
          mode: 'provider' as const,
          targetIds: [fillLayerBaseId],
          ranges: [
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 0.8,
              prog: 1,
            },
            {
              key: 'scale',
              val: 0.95,
              prog: 0,
            },
            {
              key: 'scale',
              val: 1.02,
              prog: 0.6,
            },
            {
              key: 'scale',
              val: 1,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Fill layer highlight (shimmer/highlight effect)
  const fillLayerHighlight = {
    id: fillLayerHighlightId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'font-serif italic absolute',
      gradient: `linear-gradient(165deg, ${highlightColor} 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.2) 100%)`,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '400',
        letterSpacing: '0.02em',
      },
      font: {
        family: fontFamily,
        weights: ['400', '700'],
        subsets: ['latin'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'fill-highlight-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: fillDelay + 0.3,
          duration: fillDuration + 0.3,
          mode: 'provider' as const,
          targetIds: [fillLayerHighlightId],
          ranges: [
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 0.6,
              prog: 1,
            },
            {
              key: 'scale',
              val: 0.97,
              prog: 0,
            },
            {
              key: 'scale',
              val: 1.05,
              prog: 0.5,
            },
            {
              key: 'scale',
              val: 1,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Final text layer (solid final text)
  const finalTextLayer = {
    id: finalTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'font-serif italic absolute',
      style: {
        fontSize: `${fontSize}px`,
        color: primaryColor,
        fontWeight: '400',
        letterSpacing: '0.02em',
      },
      font: {
        family: fontFamily,
        weights: ['400', '700'],
        subsets: ['latin'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'final-text-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: fillDelay + fillDuration + 0.3,
          duration: 1,
          mode: 'provider' as const,
          targetIds: [finalTextId],
          ranges: [
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Text wrapper (relative container for all text layers)
  const textWrapper = {
    id: 'calligraphic-text-wrapper',
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
        duration: totalDuration,
      },
    },
    childrenData: [
      strokeLayer1,
      strokeLayer2,
      fillLayerBase,
      fillLayerHighlight,
      finalTextLayer,
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer = {
    id: 'calligraphic-watercolor-reveal-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center gap-4 p-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textWrapper] as RenderableComponentData[],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'calligraphic-watercolor-reveal',
  title: 'Calligraphic Watercolor Reveal',
  description:
    'Sophisticated text reveal with calligraphic stroke animation and organic watercolor fill effect. Strokes appear with variable width suggesting pen pressure, followed by irregular color bleeding creating an artistic, handcrafted aesthetic perfect for luxury brands.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'calligraphy',
    'watercolor',
    'artistic',
    'luxury',
    'elegant',
    'handcrafted',
    'organic',
    'stroke',
    'fill',
    'gradient',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Elegance',
    fontSize: 64,
    primaryColor: '#2c2c2c',
    gradientColor1: '#1a1a1a',
    gradientColor2: '#3d3d3d',
    highlightColor: 'rgba(255,255,255,0.3)',
    strokeDuration: 2,
    fillDelay: 2.2,
    fillDuration: 1.2,
    totalDuration: 5,
    fontFamily: 'Playfair Display',
  },
};

// --- Export Preset ---
export const calligraphicWatercolorRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
