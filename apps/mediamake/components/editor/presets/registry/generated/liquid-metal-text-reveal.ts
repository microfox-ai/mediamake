/**
 * Liquid Metal Text Reveal Preset
 *
 * This preset creates a cinematic text reveal effect where text outlines materialize 
 * as if traced by light beams in darkness, then fill with a rich color that flows 
 * through the letterforms like liquid metal. The animation features premium, weighty 
 * characteristics - imagine molten gold being poured into a mold.
 *
 * Features:
 * - **Laser-Traced Outline**: Sharp, precision outlines with multi-layer glow effects
 * - **Liquid Metal Fill**: Physics-based fill animation with gravity simulation
 * - **Specular Highlights**: Dynamic light sweep effects for metallic appearance
 * - **Depth Perception**: Subtle 3D rotation for enhanced visual depth
 * - **Reflection Effect**: Optional reflection with gradient mask for premium look
 * - **Customizable Colors**: Adjustable gradient colors for different metal types
 * - **Performance Optimized**: Uses will-change properties for smooth rendering
 *
 * Use cases:
 * - Premium brand reveals and logo animations
 * - High-end product launch videos
 * - Luxury service promotional content
 * - Cinematic title sequences
 * - Award show graphics and motion design
 *
 * Technical Details:
 * - Outline reveal: 0-40% of duration with cubic-bezier easing
 * - Liquid fill: 40-90% with gravity-simulation easing
 * - Highlight sweep: 90-100% for final polish
 * - Reflection fade-in: 40-90% for depth enhancement
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  TextAtomData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema with descriptive documentation
const presetParams = z.object({
  text: z
    .string()
    .default('PREMIUM')
    .describe('Text to display with liquid metal effect'),
  
  duration: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .describe('Total animation duration in seconds'),
  
  fontSize: z
    .number()
    .min(20)
    .max(400)
    .default(96)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., Inter, Roboto, Montserrat)'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., 400, 700, 900)'),
  
  gradientColors: z
    .object({
      top: z.string().default('#FFD700').describe('Top gradient color (gold)'),
      middle: z.string().default('#FFA500').describe('Middle gradient color (orange)'),
      bottom: z.string().default('#FF8C00').describe('Bottom gradient color (dark orange)'),
    })
    .optional()
    .describe('Gradient colors for liquid metal fill (defaults to gold tones)'),
  
  outlineColor: z
    .string()
    .default('#FFD700')
    .describe('Color of the laser-traced outline'),
  
  outlineWidth: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Width of the text outline in pixels'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for glow effects (0 = none, 1 = normal, 2 = intense)'),
  
  depthRotation: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .describe('3D rotation angle in degrees for depth perception'),
  
  showReflection: z
    .boolean()
    .default(true)
    .describe('Whether to show reflection effect below text'),
  
  reflectionOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Maximum opacity of the reflection effect'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (typically black for premium look)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    gradientColors,
    outlineColor,
    outlineWidth,
    glowIntensity,
    depthRotation,
    showReflection,
    reflectionOpacity,
    backgroundColor,
  } = params;

  // Default gradient colors
  const colors = gradientColors || {
    top: '#FFD700',
    middle: '#FFA500',
    bottom: '#FF8C00',
  };

  // Calculate timing phases (relative to component start)
  const outlineRevealStart = 0;
  const outlineRevealDuration = duration * 0.4; // 0-40%
  
  const fillStart = duration * 0.4;
  const fillDuration = duration * 0.5; // 40-90%
  
  const highlightStart = duration * 0.9;
  const highlightDuration = duration * 0.1; // 90-100%
  
  const reflectionStart = duration * 0.4;
  const reflectionDuration = duration * 0.5; // 40-90%

  // Component IDs
  const containerId = 'liquid-metal-container';
  const textStackId = 'text-stack';
  const outlineLayerId = 'text-outline-layer';
  const fillLayerId = 'text-fill-layer';
  const highlightLayerId = 'highlight-sweep-layer';
  const reflectionLayerId = 'reflection-layer';

  // Helper function to create outline reveal effect
  const createOutlineRevealEffect = (): GenericEffectData => {
    return {
      type: 'ease-in-out',
      start: outlineRevealStart,
      duration: outlineRevealDuration,
      mode: 'provider',
      targetIds: [outlineLayerId],
      ranges: [
        // Animate stroke-dashoffset from 1000 to 0 (outline draws in)
        { key: 'strokeDashoffset', val: 1000, prog: 0 },
        { key: 'strokeDashoffset', val: 0, prog: 1 },
        // Fade in opacity
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Helper function to create liquid fill effect with gravity simulation
  const createLiquidFillEffect = (): GenericEffectData => {
    return {
      type: 'ease-in', // Start slow (gravity), accelerate at end
      start: fillStart,
      duration: fillDuration,
      mode: 'provider',
      targetIds: [fillLayerId],
      ranges: [
        // Clip-path inset animation (fills from bottom to top)
        // inset(top right bottom left)
        { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 },
        { key: 'clipPath', val: 'inset(0% 0 0 0)', prog: 1 },
        // Subtle scale effect for liquid viscosity
        { key: 'scaleY', val: 1.05, prog: 0 },
        { key: 'scaleY', val: 1, prog: 1 },
      ],
    };
  };

  // Helper function to create highlight sweep effect
  const createHighlightSweepEffect = (): GenericEffectData => {
    return {
      type: 'ease-out',
      start: highlightStart,
      duration: highlightDuration,
      mode: 'provider',
      targetIds: [highlightLayerId],
      ranges: [
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.8, prog: 0.3 },
        { key: 'opacity', val: 0, prog: 1 },
        // Sweep across (translateX)
        { key: 'translateX', val: '-100%', prog: 0 },
        { key: 'translateX', val: '100%', prog: 1 },
      ],
    };
  };

  // Helper function to create reflection fade effect
  const createReflectionFadeEffect = (): GenericEffectData => {
    return {
      type: 'ease-out',
      start: reflectionStart,
      duration: reflectionDuration,
      mode: 'provider',
      targetIds: [reflectionLayerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: reflectionOpacity, prog: 1 },
      ],
    };
  };

  // Build gradient string
  const gradientString = `linear-gradient(180deg, ${colors.top} 0%, ${colors.middle} 50%, ${colors.bottom} 100%)`;

  // Calculate glow shadow layers based on intensity
  const glowBase = 2 * glowIntensity;
  const glowMedium = 10 * glowIntensity;
  const glowWide = 30 * glowIntensity;
  const glowShadow = `0 0 ${glowBase}px ${outlineColor}, 0 0 ${glowMedium}px ${outlineColor}, 0 0 ${glowWide}px rgba(255, 215, 0, ${0.5 * glowIntensity})`;

  // Outline layer (laser-traced outline with glow)
  const outlineLayer: RenderableComponentData = {
    id: outlineLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: `font-bold`,
      style: {
        fontSize: `${fontSize}px`,
        color: 'transparent',
        WebkitTextStroke: `${outlineWidth}px ${outlineColor}`,
        textShadow: glowShadow,
        fontWeight,
        willChange: 'opacity, stroke-dashoffset',
        // Note: strokeDasharray/strokeDashoffset are SVG properties
        // For text outline animation, we'll use a workaround with filter
        opacity: 0,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Fill layer (liquid metal gradient fill)
  const fillLayer: RenderableComponentData = {
    id: fillLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: `font-bold absolute top-0 left-0`,
      gradient: gradientString,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        clipPath: 'inset(100% 0 0 0)', // Start fully clipped
        willChange: 'clip-path',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Highlight sweep layer (specular light effect)
  const highlightLayer: RenderableComponentData = {
    id: highlightLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: `font-bold absolute top-0 left-0`,
      gradient: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%)',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        opacity: 0,
        transform: 'translateX(-100%)',
        willChange: 'transform, opacity',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Reflection layer (mirrored text with opacity gradient mask)
  const reflectionLayer: RenderableComponentData = {
    id: reflectionLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: `font-bold absolute left-0`,
      gradient: gradientString,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        transform: `scaleY(-1) translateY(${fontSize * 1.2}px)`, // Flip and position below
        opacity: 0,
        maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)',
        willChange: 'opacity',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Text stack container (holds all text layers with 3D rotation)
  const textStack: RenderableComponentData = {
    id: textStackId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transform: `rotateX(${depthRotation}deg)`,
          willChange: 'transform',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: showReflection
      ? [outlineLayer, fillLayer, highlightLayer, reflectionLayer]
      : [outlineLayer, fillLayer, highlightLayer],
    effects: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          backgroundColor,
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textStack],
    effects: [
      {
        id: 'outline-reveal-effect',
        componentId: 'generic',
        data: createOutlineRevealEffect(),
      },
      {
        id: 'liquid-fill-effect',
        componentId: 'generic',
        data: createLiquidFillEffect(),
      },
      {
        id: 'highlight-sweep-effect',
        componentId: 'generic',
        data: createHighlightSweepEffect(),
      },
      ...(showReflection
        ? [
            {
              id: 'reflection-fade-effect',
              componentId: 'generic',
              data: createReflectionFadeEffect(),
            },
          ]
        : []),
    ],
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
  id: 'liquid-metal-text-reveal',
  title: 'Liquid Metal Text Reveal',
  description:
    'Cinematic text reveal with laser-traced outlines materializing in darkness, followed by liquid metal fill flowing through letterforms. Features sharp laser-etched outlines with glow effects, physics-based liquid fill animation with gravity simulation, specular highlights, and subtle depth perception. Premium and weighty animation that feels like molten gold being poured into a mold.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'cinematic',
    'premium',
    'liquid',
    'metal',
    'gold',
    'laser',
    'outline',
    'glow',
    'gradient',
    '3d',
    'depth',
    'reflection',
    'luxury',
    'brand',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'PREMIUM',
    duration: 5,
    fontSize: 96,
    fontFamily: 'Inter',
    fontWeight: '700',
    gradientColors: {
      top: '#FFD700',
      middle: '#FFA500',
      bottom: '#FF8C00',
    },
    outlineColor: '#FFD700',
    outlineWidth: 2,
    glowIntensity: 1,
    depthRotation: 5,
    showReflection: true,
    reflectionOpacity: 0.3,
    backgroundColor: '#000000',
  },
};

export const liquidMetalTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
