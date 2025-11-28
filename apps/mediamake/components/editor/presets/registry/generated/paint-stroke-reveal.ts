/**
 * Paint Stroke Reveal Preset
 *
 * This preset creates a dynamic text reveal animation through animated brush strokes
 * that progressively build up to reveal text. Inspired by artistic title sequences
 * and rotoscoped calligraphy animations, the effect mimics watching an artist paint
 * text in real-time.
 *
 * Features:
 * - **Progressive Stroke Reveal**: Multiple brush strokes appear sequentially with staggered timing
 * - **Organic Movement**: Spring-based scaleX animations for natural, hand-painted feel
 * - **Varying Opacity**: Strokes have different opacity levels for depth and layering
 * - **Rotation Variations**: Slight rotation differences (-5deg to 5deg) for organic look
 * - **Texture Enhancement**: Subtle contrast and brightness filters for painted texture
 * - **Customizable Strokes**: Configurable number of strokes, colors, and timing
 *
 * Use cases:
 * - Artistic title sequences and opening credits
 * - Brand reveal animations with hand-painted aesthetic
 * - Typography-focused visual narratives
 * - Social media content with artistic flair
 * - Creative transitions between scenes
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('PAINT').describe('Text to reveal through brush strokes'),
  
  fontSize: z.number().default(120).describe('Font size in pixels'),
  
  fontFamily: z.string().default('Inter').describe('Font family for text'),
  
  textColor: z.string().default('#FFFFFF').describe('Color of the revealed text'),
  
  strokeColor: z.string().default('#FFFFFF').describe('Color of the brush strokes'),
  
  numStrokes: z.number().min(2).max(8).default(4).describe('Number of brush strokes (2-8)'),
  
  strokeDuration: z.number().default(0.8).describe('Duration of each stroke animation in seconds'),
  
  strokeStagger: z.number().default(0.1).describe('Time offset between strokes in seconds'),
  
  totalDuration: z.number().optional().describe('Total duration - if not provided, calculated from strokes'),
  
  textRevealDelay: z.number().default(0.3).describe('Delay before text starts revealing (relative to first stroke)'),
  
  textRevealDuration: z.number().default(0.6).describe('Duration of text fade-in'),
  
  contrastBoost: z.number().min(1).max(2).default(1.1).describe('Contrast filter boost (1-2)'),
  
  brightnessBoost: z.number().min(1).max(2).default(1.05).describe('Brightness filter boost (1-2)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random rotation
  const getRandomRotation = (): number => {
    return Math.random() * 10 - 5; // -5 to 5 degrees
  };

  // Helper function to generate random positioning
  const getStrokePosition = (index: number, total: number) => {
    const baseLeft = 10 + (index / total) * 70; // Spread across 10-80%
    const baseTop = 42 + Math.random() * 16; // 42-58% (centered around 50%)
    return { left: `${baseLeft}%`, top: `${baseTop}%` };
  };

  // Helper function to get stroke dimensions
  const getStrokeDimensions = (index: number) => {
    const baseWidth = 12 + Math.random() * 8; // 12-20%
    const baseHeight = 6 + Math.random() * 6; // 6-12%
    return { width: `${baseWidth}%`, height: `${baseHeight}%` };
  };

  // Helper function to get varying opacity
  const getStrokeOpacity = (index: number, total: number) => {
    const minOpacity = 0.6;
    const maxOpacity = 1.0;
    const range = maxOpacity - minOpacity;
    // Vary opacity with some randomness
    return minOpacity + (Math.random() * range);
  };

  // Calculate total duration
  const calculatedDuration = params.totalDuration || 
    (params.strokeStagger * (params.numStrokes - 1) + params.strokeDuration + params.textRevealDuration + 0.5);

  // Generate stroke components with effects
  const strokes: RenderableComponentData[] = [];
  const strokeEffects: RenderableComponentData[] = [];

  for (let i = 0; i < params.numStrokes; i++) {
    const strokeId = `stroke-${i}`;
    const position = getStrokePosition(i, params.numStrokes);
    const dimensions = getStrokeDimensions(i);
    const rotation = getRandomRotation();
    const opacity = getStrokeOpacity(i, params.numStrokes);
    const startTime = i * params.strokeStagger;

    // Create stroke container with HTMLBlockAtom for brush shape
    const strokeComponent: RenderableComponentData = {
      id: strokeId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: ${params.strokeColor}; border-radius: 50%;"></div>`,
        className: 'absolute',
        style: {
          top: position.top,
          left: position.left,
          width: dimensions.width,
          height: dimensions.height,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'left center',
          opacity: opacity,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: calculatedDuration,
        },
      },
    };

    strokes.push(strokeComponent);

    // Create scaleX animation effect
    const scaleEffect: RenderableComponentData = {
      id: `stroke-scale-${i}`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: startTime,
        duration: params.strokeDuration,
        mode: 'provider',
        targetIds: [strokeId],
        ranges: [
          { key: 'scaleX', val: 0, prog: 0 },
          { key: 'scaleX', val: 1, prog: 1 },
        ],
      },
    };

    strokeEffects.push(scaleEffect);

    // Create opacity fade-in effect
    const opacityEffect: RenderableComponentData = {
      id: `stroke-opacity-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: startTime,
        duration: params.strokeDuration * 0.5,
        mode: 'provider',
        targetIds: [strokeId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: opacity, prog: 1 },
        ],
      },
    };

    strokeEffects.push(opacityEffect);
  }

  // Create text component
  const textId = 'paint-text';
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: 'bold',
        color: params.textColor,
        textAlign: 'center',
      },
      font: {
        family: params.fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedDuration,
      },
    },
  };

  // Create text reveal effect
  const textRevealEffect: RenderableComponentData = {
    id: 'text-reveal-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: params.textRevealDelay,
      duration: params.textRevealDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Create brush strokes container
  const brushStrokesContainer: RenderableComponentData = {
    id: 'brush-strokes-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedDuration,
      },
    },
    childrenData: strokes as RenderableComponentData[],
    effects: strokeEffects as any[],
  };

  // Create text container
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedDuration,
      },
    },
    childrenData: [textComponent] as RenderableComponentData[],
    effects: [textRevealEffect] as any[],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'paint-stroke-reveal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          filter: `contrast(${params.contrastBoost}) brightness(${params.brightnessBoost})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedDuration,
      },
    },
    childrenData: [
      brushStrokesContainer,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'paintStrokeReveal',
  title: 'Paint Stroke Reveal',
  description: 'Text reveal animation through animated brush strokes that build up progressively. Features organic spring-based animations with varying opacity and rotation for a hand-painted calligraphy aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'reveal', 'artistic', 'paint', 'brush', 'calligraphy', 'organic', 'spring', 'animation', 'typography', 'title'],
  dependencies: {},
  defaultInputParams: {
    text: 'PAINT',
    fontSize: 120,
    fontFamily: 'Inter',
    textColor: '#FFFFFF',
    strokeColor: '#FFFFFF',
    numStrokes: 4,
    strokeDuration: 0.8,
    strokeStagger: 0.1,
    textRevealDelay: 0.3,
    textRevealDuration: 0.6,
    contrastBoost: 1.1,
    brightnessBoost: 1.05,
  },
};

// Export preset
export const paintStrokeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
