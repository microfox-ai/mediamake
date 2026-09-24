/**
 * Liquid Morphing Typography Preset
 *
 * This preset creates an elegant liquid morphing text effect where text flows between states 
 * like viscous fluid. Text initially appears blurred and stretched horizontally, then smoothly 
 * morphs to normal proportions while the blur clears. Perfect for luxury brand commercials 
 * and high-end titles where elegance is paramount.
 *
 * Features:
 * - **Smooth Transform Morphing**: Text scales from stretched (scaleX: 1.5, scaleY: 0.7) to normal
 * - **Progressive Blur Clearance**: Blur animates from 8px to 0px during morph
 * - **Opacity Transition**: Text fades from translucent (0.4) to solid (1.0)
 * - **Subtle Wave Motion**: Gentle vertical wave ripples through text during transition
 * - **Iridescent Quality**: Optional gradient text effect for shimmering appearance
 * - **Perfectly Smooth Easing**: Custom cubic-bezier for organic, continuous motion
 * - **Performance Optimized**: Uses will-change for GPU acceleration
 *
 * Use cases:
 * - Luxury perfume commercials
 * - High-end brand titles
 * - Elegant product reveals
 * - Premium content intros
 * - Sophisticated typography presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display with liquid morphing effect'),
  
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the preset in seconds'),
  
  morphDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the liquid morph transition in seconds (typically 1.2s)'),
  
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., Inter, Playfair Display, Montserrat)'),
  
  fontWeight: z
    .string()
    .default('400')
    .describe('Font weight (e.g., 400, 700)'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (used if gradient is not provided)'),
  
  gradient: z
    .string()
    .optional()
    .describe('Optional gradient string for iridescent text effect (e.g., "linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,1))")'),
  
  initialScaleX: z
    .number()
    .default(1.5)
    .describe('Initial horizontal scale (default: 1.5 for stretched appearance)'),
  
  initialScaleY: z
    .number()
    .default(0.7)
    .describe('Initial vertical scale (default: 0.7 for compressed appearance)'),
  
  initialBlur: z
    .number()
    .default(8)
    .describe('Initial blur amount in pixels (default: 8px)'),
  
  initialOpacity: z
    .number()
    .default(0.4)
    .describe('Initial opacity (default: 0.4 for translucent start)'),
  
  waveAmplitude: z
    .number()
    .default(5)
    .describe('Amplitude of the subtle wave motion in pixels (default: 5px)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    morphDuration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    gradient,
    initialScaleX,
    initialScaleY,
    initialBlur,
    initialOpacity,
    waveAmplitude,
  } = params;

  // Parse font string if it includes weight/style
  const parsedFontFamily = fontFamily.includes(':')
    ? fontFamily.split(':')[0]
    : fontFamily;
  
  const parsedFontWeight = fontFamily.includes(':')
    ? fontFamily.split(':')[1] || fontWeight
    : fontWeight;

  const textAtomId = 'liquid-text-atom';
  const containerId = 'liquid-text-container';

  // Create the TextAtom component with liquid morph styling
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: parsedFontWeight,
        color: gradient ? 'transparent' : textColor,
        textAlign: 'center',
        willChange: 'transform, filter, opacity',
      },
      font: {
        family: parsedFontFamily,
        weights: [parsedFontWeight],
        subsets: ['latin'],
        display: 'swap',
      },
      gradient: gradient || undefined,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Transform effect: scale morph from stretched to normal
      {
        id: 'liquid-morph-transform',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: [0.4, 0.0, 0.2, 1], // Custom easing for organic feel
          start: 0,
          duration: morphDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'scaleX', val: initialScaleX, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'scaleY', val: initialScaleY, prog: 0 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
      // Blur effect: clear from blurred to sharp
      {
        id: 'liquid-morph-blur',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: [0.4, 0.0, 0.2, 1],
          start: 0,
          duration: morphDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'blur', val: initialBlur, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity effect: fade from translucent to solid
      {
        id: 'liquid-morph-opacity',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: [0.4, 0.0, 0.2, 1],
          start: 0,
          duration: morphDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'opacity', val: initialOpacity, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Wave effect: subtle vertical ripple during transition
      {
        id: 'liquid-wave-subtle',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: morphDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'translateY', val: waveAmplitude, prog: 0 },
            { key: 'translateY', val: 0, prog: 0.5 },
            { key: 'translateY', val: -waveAmplitude, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Container layout to center the text
  const containerLayout: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textAtom],
  };

  // Root container with flex centering
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [containerLayout],
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
  id: 'liquid-morph-typography',
  title: 'Liquid Morphing Typography',
  description:
    'Elegant liquid morphing text effect with smooth scale, blur, and opacity transitions. Text flows from stretched and blurred state to crisp clarity with organic continuous motion, perfect for luxury brand commercials and high-end titles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'liquid',
    'morph',
    'luxury',
    'elegant',
    'smooth',
    'blur',
    'transform',
    'scale',
    'wave',
    'gradient',
    'iridescent',
    'premium',
    'commercial',
  ],
  defaultInputParams: {
    text: 'LIQUID ELEGANCE',
    duration: 5,
    morphDuration: 1.2,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '400',
    textColor: '#FFFFFF',
    gradient: 'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,1))',
    initialScaleX: 1.5,
    initialScaleY: 0.7,
    initialBlur: 8,
    initialOpacity: 0.4,
    waveAmplitude: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMorphTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
