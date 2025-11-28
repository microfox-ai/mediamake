/**
 * Typokinetic Bloom Preset
 *
 * A kinetic typography preset where text unfolds from a central point like a blooming flower.
 * Each word or letter expands outward in a radial pattern with spring-eased animations that
 * slightly overshoot before settling, creating an organic petal-opening effect.
 *
 * Features:
 * - **Radial Bloom Animation**: Text elements expand from center point in circular pattern
 * - **Spring Physics**: Overshoot animation (0 → 1.1 → 1) for organic motion
 * - **Staggered Timing**: Inner elements animate first, outer elements follow in waves
 * - **Polar Positioning**: Elements positioned using sin/cos calculations based on index
 * - **GPU Acceleration**: Transform-only animations with will-change optimization
 * - **Configurable Layout**: Word-level or letter-level bloom modes
 *
 * Use cases:
 * - Creating dramatic title reveals with organic motion
 * - Building kinetic typography effects for intros/outros
 * - Adding dynamic text animations for social media content
 * - Creating blooming text effects synchronized with music beats
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z.string().describe('Text content to animate (words or letters will bloom outward)'),
  
  bloomMode: z
    .enum(['word', 'letter'])
    .default('word')
    .describe('Bloom granularity: "word" for word-by-word bloom, "letter" for letter-by-letter bloom'),
  
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds'),
  
  baseDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0)
    .describe('Initial delay before first element starts animating (seconds)'),
  
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.5)
    .default(0.05)
    .describe('Delay multiplier between consecutive elements (seconds per radial distance unit)'),
  
  animationDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Duration of each individual element\'s bloom animation (seconds)'),
  
  radius: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Radial distance from center point (pixels)'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size for text elements (pixels)'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto", "Montserrat")'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  
  overshootScale: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.1)
    .describe('Peak scale during overshoot animation (1.1 = 110% scale)'),
  
  rotationEnabled: z
    .boolean()
    .default(true)
    .describe('Enable rotation animation during bloom'),
  
  rotationAmount: z
    .number()
    .min(-180)
    .max(180)
    .default(15)
    .describe('Rotation angle during bloom animation (degrees)'),
  
  startScale: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Initial scale at animation start (0 = invisible point)'),
  
  easingType: z
    .enum(['spring', 'ease-out', 'ease-in-out'])
    .default('spring')
    .describe('Animation easing curve type'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse text into elements based on bloom mode
  const parseTextElements = (text: string, mode: 'word' | 'letter'): string[] => {
    if (mode === 'letter') {
      return text.split('').filter(char => char.trim() !== '');
    }
    return text.split(/\s+/).filter(word => word.trim() !== '');
  };

  // Calculate polar coordinates for radial positioning
  const calculatePolarPosition = (
    index: number,
    total: number,
    radius: number,
  ): { x: number; y: number; angle: number } => {
    // Distribute elements evenly in a circle
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y, angle: angle * (180 / Math.PI) };
  };

  // Calculate radial distance for stagger timing
  const calculateRadialDistance = (index: number, total: number): number => {
    // Inner elements (lower index) have smaller distance
    return index;
  };

  const elements = parseTextElements(params.text, params.bloomMode);
  const totalElements = elements.length;

  // Create child components for each text element
  const elementComponents: RenderableComponentData[] = elements.map((element, index) => {
    const elementId = `bloom-element-${index}`;
    const textId = `bloom-text-${index}`;
    
    // Calculate position
    const position = calculatePolarPosition(index, totalElements, params.radius);
    const radialDistance = calculateRadialDistance(index, totalElements);
    
    // Calculate staggered start time
    const elementStartDelay = params.baseDelay + (radialDistance * params.staggerDelay);

    // Create bloom animation effect
    const bloomEffect: GenericEffectData = {
      type: params.easingType,
      start: elementStartDelay,
      duration: params.animationDuration,
      mode: 'provider',
      targetIds: [elementId],
      ranges: [
        // Opacity: 0 → 1
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
        
        // Scale: 0 → 1.1 → 1 (overshoot)
        { key: 'scale', val: params.startScale, prog: 0 },
        { key: 'scale', val: params.overshootScale, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },
        
        // TranslateX: center → final position
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: position.x, prog: 1 },
        
        // TranslateY: center → final position
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: position.y, prog: 1 },
        
        // Optional rotation
        ...(params.rotationEnabled
          ? [
              { key: 'rotate', val: -params.rotationAmount, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ]
          : []),
      ],
    };

    const effect = {
      id: `bloom-effect-${index}`,
      componentId: 'generic' as const,
      data: bloomEffect,
    };

    // Text atom data
    const textData: TextAtomData = {
      text: element,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.textColor,
        whiteSpace: 'nowrap',
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
      },
    };

    // Element container with text
    const elementContainer: RenderableComponentData = {
      id: elementId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform-gpu',
          style: {
            willChange: 'transform, opacity',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [effect],
      childrenData: [
        {
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: textData,
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    return elementContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-bloom-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: elementComponents,
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
  id: 'typokinetic-bloom',
  title: 'Typokinetic Bloom',
  description:
    'A kinetic typography preset where text unfolds from a central point like a blooming flower. Each word or letter expands outward in a radial pattern with spring-eased animations that slightly overshoot before settling, creating an organic petal-opening effect. Inner elements animate first, followed by outer elements in a wave pattern.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'bloom',
    'radial',
    'spring',
    'organic',
    'flower',
    'reveal',
    'animation',
    'text',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BLOOM OUT',
    bloomMode: 'word',
    duration: 3,
    baseDelay: 0,
    staggerDelay: 0.05,
    animationDuration: 0.8,
    radius: 200,
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#FFFFFF',
    overshootScale: 1.1,
    rotationEnabled: true,
    rotationAmount: 15,
    startScale: 0,
    easingType: 'spring',
  },
};

export const typokineticBloomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
