/**
 * Ink in Water Text Effect Preset
 *
 * This preset creates a gentle ink-in-water effect where text appears as if ink is being
 * dropped into clear water and slowly forming words. The letters have fluid, organic edges
 * that shift and flow subtly. Features include dispersion effects where color initially
 * spreads wide before contracting into final letter shapes, slow rotation and scaling for
 * depth perception, and subtle radial gradients that shift from center to edges.
 *
 * Features:
 * - **Fluid Organic Edges**: SVG turbulence filters create fluid, ink-like text edges
 * - **Dispersion Effect**: Color spreads wide then contracts into letter shapes
 * - **Depth Animation**: 3D rotation and scaling create water-viewing depth effect
 * - **Color Gradients**: Radial gradients animate from center to edges
 * - **Continuous Motion**: Smooth infinite rotation for meditative feel
 * - **Performance Optimized**: GPU rasterization and CSS containment
 *
 * Use cases:
 * - Creating meditative title sequences
 * - Artistic text reveals for creative content
 * - Ambient background text for relaxation videos
 * - Liquid-themed brand animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  words: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['Ink', 'Water', 'Flow', 'Dream', 'Grace'])
    .describe('Array of words to display (1-10 words)'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family to use (e.g., "Inter", "Roboto")'),
  
  fontWeight: z
    .string()
    .default('600')
    .describe('Font weight (e.g., "400", "600", "700")'),
  
  colors: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['#4A90E2', '#50C878', '#9B59B6', '#E74C3C', '#F39C12'])
    .describe('Array of colors for each word (hex format)'),
  
  wordSpacing: z
    .number()
    .min(10)
    .max(100)
    .default(20)
    .describe('Gap between words in pixels'),
  
  entryDuration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Duration of ink dispersion entry effect in seconds'),
  
  staggerDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.6)
    .describe('Delay between each word appearing in seconds'),
  
  rotationDuration: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .describe('Duration of one full rotation cycle in seconds'),
  
  depthCycleDuration: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .describe('Duration of 3D depth animation cycle in seconds'),
  
  turbulenceIntensity: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.02)
    .describe('SVG turbulence base frequency (0.01-0.1)'),
  
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('SVG Gaussian blur standard deviation'),
  
  initialScale: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Initial scale for dispersion effect'),
  
  initialBlur: z
    .number()
    .min(0)
    .max(50)
    .default(15)
    .describe('Initial blur amount for dispersion in pixels'),
  
  depthTranslateZ: z
    .number()
    .min(0)
    .max(200)
    .default(50)
    .describe('Maximum translateZ for 3D depth effect in pixels'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    words,
    fontSize,
    fontFamily,
    fontWeight,
    colors,
    wordSpacing,
    entryDuration,
    staggerDelay,
    rotationDuration,
    depthCycleDuration,
    turbulenceIntensity,
    blurIntensity,
    initialScale,
    initialBlur,
    depthTranslateZ,
  } = params;

  // Helper: Generate radial gradient for word
  const generateGradient = (color: string): string => {
    // Parse hex color to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Create darker shades
    const midR = Math.floor(r * 0.7);
    const midG = Math.floor(g * 0.7);
    const midB = Math.floor(b * 0.7);

    const darkR = Math.floor(r * 0.4);
    const darkG = Math.floor(g * 0.4);
    const darkB = Math.floor(b * 0.4);

    return `radial-gradient(circle at center, rgb(${r},${g},${b}) 0%, rgb(${midR},${midG},${midB}) 50%, rgb(${darkR},${darkG},${darkB}) 100%)`;
  };

  // Helper: Generate SVG filter for turbulence
  const generateSVGFilters = (): string => {
    const filters = words
      .map(
        (_, index) => `
      <filter id='turbulence-filter-${index}'>
        <feTurbulence type='fractalNoise' baseFrequency='${turbulenceIntensity}' numOctaves='3' result='turbulence'/>
        <feGaussianBlur stdDeviation='${blurIntensity}' result='blur'/>
        <feColorMatrix in='blur' type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0'/>
      </filter>
    `,
      )
      .join('');

    return `<svg width='0' height='0' style='position: absolute;'><defs>${filters}</defs></svg>`;
  };

  // Calculate total duration needed to display all words
  const totalDuration = staggerDelay * (words.length - 1) + entryDuration + rotationDuration;

  // ============================================================================
  // BUILD COMPONENT TREE
  // ============================================================================

  const childrenData: RenderableComponentData[] = [];

  // Create word containers with text atoms
  words.forEach((word, index) => {
    const wordId = `word-${index}`;
    const textId = `text-${index}`;
    const color = colors[index % colors.length];
    const gradient = generateGradient(color);
    const wordStart = index * staggerDelay;

    // Word container (BaseLayout)
    const wordContainer: RenderableComponentData = {
      id: wordId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block mx-2',
          style: {
            mixBlendMode: 'screen',
            willChange: 'filter, transform',
          },
        },
      },
      context: {
        timing: {
          start: wordStart,
          duration: totalDuration - wordStart,
        },
      },
      childrenData: [
        // TextAtom for the word
        {
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight,
              color,
              background: gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: `url(#turbulence-filter-${index})`,
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
              subsets: ['latin'],
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0,
              duration: totalDuration - wordStart,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [],
    } as RenderableComponentData;

    // ============================================================================
    // EFFECTS FOR THIS WORD
    // ============================================================================

    // 1. Entry Effect: Dispersion (scale + blur + opacity)
    const entryEffect: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration: entryDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: initialScale, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'blur', val: initialBlur, prog: 0 },
        { key: 'blur', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    wordContainer.effects!.push({
      id: `entry-effect-${wordId}`,
      componentId: 'generic',
      data: entryEffect,
    });

    // 2. Continuous Rotation Effect
    const rotationEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 360, prog: 1 },
      ],
    };

    wordContainer.effects!.push({
      id: `continuous-rotation-${wordId}`,
      componentId: 'generic',
      data: rotationEffect,
    });

    // 3. Depth Effect (translateZ oscillation)
    const depthEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: depthCycleDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateZ', val: 0, prog: 0 },
        { key: 'translateZ', val: depthTranslateZ, prog: 0.5 },
        { key: 'translateZ', val: 0, prog: 1 },
      ],
    };

    wordContainer.effects!.push({
      id: `depth-effect-${wordId}`,
      componentId: 'generic',
      data: depthEffect,
    });

    childrenData.push(wordContainer);
  });

  // ============================================================================
  // SVG FILTERS (HTMLBlockAtom)
  // ============================================================================

  const svgFiltersHtml = generateSVGFilters();

  childrenData.push({
    id: 'svg-filters',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFiltersHtml,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'parent',
      },
    },
  } as RenderableComponentData);

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'ink-water-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          contain: 'layout',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'parent',
      },
    },
    childrenData: [
      {
        id: 'words-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center flex-wrap',
            style: {
              gap: `${wordSpacing}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'parent',
          },
        },
        childrenData: childrenData as RenderableComponentData[],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'ink-water-text-effect',
  title: 'Ink in Water Text Effect',
  description:
    'Gentle ink-in-water effect where text appears as if ink is being dropped into clear water with fluid, organic edges. Features dispersion effects with color spreading and contracting, slow rotation/scaling for depth perception, and subtle radial gradients that shift from center to edges. Meditative and graceful with smooth continuous motion throughout.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'ink',
    'water',
    'fluid',
    'organic',
    'dispersion',
    'gradient',
    '3d',
    'depth',
    'rotation',
    'meditative',
    'artistic',
    'creative',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['Ink', 'Water', 'Flow', 'Dream', 'Grace'],
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '600',
    colors: ['#4A90E2', '#50C878', '#9B59B6', '#E74C3C', '#F39C12'],
    wordSpacing: 20,
    entryDuration: 2.5,
    staggerDelay: 0.6,
    rotationDuration: 20,
    depthCycleDuration: 5,
    turbulenceIntensity: 0.02,
    blurIntensity: 2,
    initialScale: 2,
    initialBlur: 15,
    depthTranslateZ: 50,
  },
};

// ============================================================================
// EXPORT PRESET
// ============================================================================

export const inkWaterTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};