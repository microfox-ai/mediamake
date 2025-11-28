/**
 * Staggered Breathing Wave Animation Preset
 *
 * This preset creates a coordinated wave-like breathing animation across multiple elements
 * with customizable stagger delays. Each element scales independently but in sequence,
 * producing a stadium wave ripple effect. Ideal for menu items, word-by-word text reveals,
 * or grid layouts where items need sequential emphasis.
 *
 * Features:
 * - **Staggered Wave Effect**: Each element starts its breathing cycle slightly after the previous one
 * - **Customizable Stagger Delay**: Control the timing offset between elements (default 150ms)
 * - **Breathing Scale Animation**: Smooth scale animation from 1 → 1.1 → 1 over 2.5 seconds
 * - **Flexible Layouts**: Supports flex, grid, horizontal, vertical, and custom layouts
 * - **Performance Optimized**: Transform-gpu enabled, limited to 20 simultaneous elements
 * - **Caption Integration**: Works with caption data for word-by-word animations
 * - **Customizable Appearance**: Font, size, color, spacing fully configurable
 *
 * Use cases:
 * - Creating wave effects for menu items or navigation
 * - Word-by-word text reveals with breathing emphasis
 * - Grid layouts with sequential item emphasis
 * - Dynamic typography with coordinated motion
 * - Social media content with engaging text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  elements: z.array(
    z.object({
      text: z.string().describe('Text content for this element'),
    })
  ).optional().describe('Array of elements to animate. If not provided, uses caption words.'),
  
  caption: z.any().optional().describe('Caption data object containing words array for word-by-word animation'),
  
  staggerDelay: z.number().min(0.05).max(1).default(0.15).describe('Delay between each element\'s animation start in seconds (default: 0.15s / 150ms)'),
  
  breathDuration: z.number().min(0.5).max(10).default(2.5).describe('Duration of one breathing cycle in seconds (default: 2.5s)'),
  
  scaleIntensity: z.number().min(1.01).max(1.5).default(1.1).describe('Peak scale value during breathing (default: 1.1 = 110%)'),
  
  layout: z.enum(['flex-row', 'flex-col', 'flex-wrap', 'grid']).default('flex-wrap').describe('Layout type for elements'),
  
  gap: z.number().min(0).max(100).default(8).describe('Gap between elements in pixels'),
  
  fontSize: z.number().min(12).max(200).default(48).describe('Font size in pixels'),
  
  fontWeight: z.union([z.string(), z.number()]).default('600').describe('Font weight'),
  
  textColor: z.string().default('#ffffff').describe('Text color (hex or CSS color)'),
  
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  alignment: z.enum(['start', 'center', 'end']).default('center').describe('Alignment of elements in container'),
  
  maxElements: z.number().min(1).max(20).default(20).describe('Maximum number of elements to animate simultaneously (performance limit)'),
  
  containerPadding: z.number().min(0).max(200).default(40).describe('Padding around the container in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string | undefined) => {
    if (!fontString) return { family: 'Inter', weight: undefined, style: undefined };
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts[1] ? parseInt(parts[1], 10) : undefined,
      style: parts[2] as 'normal' | 'italic' | undefined,
    };
  };

  const fontConfig = parseFontString(params.font);
  const fontFamily = fontConfig.family;
  const fontWeight = fontConfig.weight || params.fontWeight;
  const fontStyle = fontConfig.style;

  // Determine elements source
  let elementsData: Array<{ text: string; startOffset?: number }> = [];
  let totalDuration = 10; // Default duration

  if (params.caption && typeof params.caption === 'object' && Array.isArray(params.caption.words)) {
    // Use caption words
    const caption = params.caption as TranscriptionSentence;
    elementsData = caption.words.slice(0, params.maxElements).map(word => ({
      text: word.text,
      startOffset: word.start, // Relative to caption start
    }));
    totalDuration = caption.duration;
  } else if (params.elements && Array.isArray(params.elements)) {
    // Use provided elements
    elementsData = params.elements.slice(0, params.maxElements).map((el, index) => ({
      text: el.text,
      startOffset: index * params.staggerDelay,
    }));
    totalDuration = elementsData.length * params.staggerDelay + params.breathDuration;
  } else {
    // Fallback to default elements
    elementsData = [
      { text: 'Element', startOffset: 0 },
      { text: 'One', startOffset: params.staggerDelay },
      { text: 'Two', startOffset: params.staggerDelay * 2 },
      { text: 'Three', startOffset: params.staggerDelay * 3 },
      { text: 'Four', startOffset: params.staggerDelay * 4 },
    ];
    totalDuration = 5 * params.staggerDelay + params.breathDuration;
  }

  // Create child elements with staggered breathing effects
  const childrenData: RenderableComponentData[] = elementsData.map((element, index) => {
    const elementId = `breathing-element-${index}`;
    const textId = `text-content-${index}`;

    // Calculate stagger offset
    const staggerOffset = element.startOffset !== undefined 
      ? element.startOffset 
      : index * params.staggerDelay;

    // Create breathing effect (scale animation)
    const breathingEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: staggerOffset,
      duration: params.breathDuration,
      mode: 'provider',
      targetIds: [elementId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: params.scaleIntensity, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    // Text atom data
    const textAtomData: TextAtomData = {
      text: element.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontWeight,
        color: params.textColor,
        ...(fontStyle && { fontStyle }),
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    };

    // Element container with text and breathing effect
    return {
      id: elementId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'transform-gpu',
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
          id: `breathing-effect-${index}`,
          componentId: 'generic',
          data: breathingEffect,
        },
      ],
      childrenData: [
        {
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: textAtomData,
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Build layout classes
  const layoutClasses = (() => {
    const base = 'absolute inset-0 items-center';
    const alignmentClass = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
    }[params.alignment];

    if (params.layout === 'flex-row') {
      return `${base} flex flex-row ${alignmentClass}`;
    } else if (params.layout === 'flex-col') {
      return `${base} flex flex-col ${alignmentClass}`;
    } else if (params.layout === 'flex-wrap') {
      return `${base} flex flex-wrap ${alignmentClass}`;
    } else if (params.layout === 'grid') {
      return `${base} grid grid-cols-auto ${alignmentClass}`;
    }
    return `${base} flex flex-wrap ${alignmentClass}`;
  })();

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'staggered-breathing-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: layoutClasses,
        style: {
          gap: `${params.gap}px`,
          padding: `${params.containerPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: childrenData,
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'staggeredBreathingWave',
  title: 'Staggered Breathing Wave Animation',
  description: 'Creates a coordinated wave-like breathing animation across multiple elements with customizable stagger delays. Each element scales independently but in sequence, producing a stadium wave ripple effect. Supports typography word-by-word reveals, menu items, and grid layouts. Configurable stagger delay (100-200ms typical), breathing scale intensity, and cycle duration. Optimized with transform-gpu and limited to 20 simultaneous elements for performance.',
  type: 'predefined',
  presetType: 'children',
  tags: ['animation', 'wave', 'stagger', 'breathing', 'scale', 'typography', 'menu', 'grid', 'ripple', 'sequential'],
  dependencies: {},
  defaultInputParams: {
    staggerDelay: 0.15,
    breathDuration: 2.5,
    scaleIntensity: 1.1,
    layout: 'flex-wrap',
    gap: 8,
    fontSize: 48,
    fontWeight: '600',
    textColor: '#ffffff',
    font: 'Inter:600',
    alignment: 'center',
    maxElements: 20,
    containerPadding: 40,
    elements: [
      { text: 'Wave' },
      { text: 'Effect' },
      { text: 'Animation' },
      { text: 'System' },
      { text: 'Staggered' },
    ],
  },
};

export const staggeredBreathingWavePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};