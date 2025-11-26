/**
 * Liquid Mercury Typography Preset
 *
 * This preset creates organic, fluid kinetic typography where words emerge like liquid mercury
 * or water. Words materialize with liquid morph effects - starting as blurred, distorted shapes
 * that gradually focus and solidify into readable text.
 *
 * Features:
 * - **Liquid Morph Effects**: Combining blur, contrast, and brightness animations (20px→0, 200%→100%, 150%→100%)
 * - **Curved Path Positioning**: Words follow S-curves and arcs using cubic-bezier timing functions
 * - **Wave Distortion**: Subtle wave effects using skewX and scaleY transforms to simulate liquid movement
 * - **Iridescent Colors**: Gradient backgrounds transitioning from deep purples (#6B46C1) through teals (#0891B2) to warm oranges (#EA580C)
 * - **Floating Particles**: Bubble-like dots that float upward around words
 * - **Dreamy Aesthetic**: Overall feeling is fluid and mesmerizing, like watching text form in a lava lamp
 *
 * Use cases:
 * - Creating dreamy, fluid typography for artistic content
 * - Building mesmerizing text animations for music videos or ambient content
 * - Adding organic, liquid-like motion to captions
 * - Creating lava lamp aesthetic text effects
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';

// --- Params Schema ---
const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption sentences with words and timing data'),
  fontSize: z
    .number()
    .default(48)
    .describe('Base font size in pixels for the text'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  morphDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the liquid morph effect in seconds'),
  waveDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the wave distortion effect in seconds'),
  impact: z
    .number()
    .default(1.0)
    .describe('Effect intensity multiplier (0.1 - 3.0)'),
  bubbleCount: z
    .number()
    .default(8)
    .describe('Number of floating bubble particles to generate'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    font,
    morphDuration,
    waveDuration,
    impact,
    bubbleCount,
  } = params;

  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

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

    return { fontFamily, fontStyle };
  };

  // Helper: Generate bezier curve points for word positioning
  const calculateBezierPosition = (
    progress: number,
    containerWidth: number,
    containerHeight: number,
  ): { x: number; y: number } => {
    // S-curve using cubic bezier
    const p0 = { x: containerWidth * 0.1, y: containerHeight * 0.7 };
    const p1 = { x: containerWidth * 0.3, y: containerHeight * 0.2 };
    const p2 = { x: containerWidth * 0.7, y: containerHeight * 0.8 };
    const p3 = { x: containerWidth * 0.9, y: containerHeight * 0.5 };

    const t = progress;
    const oneMinusT = 1 - t;

    const x =
      oneMinusT ** 3 * p0.x +
      3 * oneMinusT ** 2 * t * p1.x +
      3 * oneMinusT * t ** 2 * p2.x +
      t ** 3 * p3.x;

    const y =
      oneMinusT ** 3 * p0.y +
      3 * oneMinusT ** 2 * t * p1.y +
      3 * oneMinusT * t ** 2 * p2.y +
      t ** 3 * p3.y;

    return { x, y };
  };

  // Helper: Generate iridescent gradient based on position
  const getIridescentGradient = (progress: number): string => {
    if (progress < 0.33) {
      // Purple to teal
      return 'linear-gradient(135deg, #6B46C1 0%, #9333EA 50%, #0891B2 100%)';
    } else if (progress < 0.66) {
      // Teal to orange
      return 'linear-gradient(135deg, #0891B2 0%, #14B8A6 50%, #EA580C 100%)';
    } else {
      // Orange back to purple
      return 'linear-gradient(135deg, #EA580C 0%, #9333EA 50%, #6B46C1 100%)';
    }
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:700');

  // Generate bubbles
  const bubbles: RenderableComponentData[] = [];
  for (let i = 0; i < bubbleCount; i++) {
    const bubbleColors = ['#6B46C1', '#0891B2', '#EA580C', '#9333EA', '#14B8A6'];
    const bubbleSize = [1, 1.5, 2, 2.5, 3][Math.floor(Math.random() * 5)];
    const leftPosition = (i / bubbleCount) * 100;
    const floatDelay = 0.3 + i * 0.2;
    const floatDuration = 4 + Math.random() * 2;

    bubbles.push({
      id: `liquid-mercury-bubble-${i}`,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        type: 'ellipse',
        color: bubbleColors[i % bubbleColors.length],
        containerProps: {
          className: `absolute bottom-0 rounded-full w-${bubbleSize} h-${bubbleSize}`,
          style: {
            left: `${leftPosition}%`,
            width: `${bubbleSize * 4}px`,
            height: `${bubbleSize * 4}px`,
            opacity: 0.6,
          },
        },
      },
      context: {
        timing: {
          start: floatDelay,
          duration: floatDuration,
        },
      },
      effects: [
        {
          id: `bubble-float-${i}`,
          componentId: `liquid-mercury-bubble-${i}`,
          data: {
            type: 'ease-out',
            start: 0,
            duration: floatDuration,
            mode: 'provider',
            targetIds: [`liquid-mercury-bubble-${i}`],
            ranges: [
              { key: 'translateY', val: 0, prog: 0, unit: 'px' },
              { key: 'translateY', val: -800, prog: 1, unit: 'px' },
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Process captions and create word components
  const wordContainers: RenderableComponentData[] = [];

  (captions as TranscriptionSentence[]).forEach((caption, captionIndex) => {
    const words = caption.words || [];
    const totalWords = words.length;

    words.forEach((word, wordIndex) => {
      const globalWordIndex = captionIndex * 100 + wordIndex;
      const progress = totalWords > 1 ? wordIndex / (totalWords - 1) : 0.5;

      // Calculate bezier position (relative percentages)
      const position = calculateBezierPosition(progress, 100, 100);

      // Get iridescent gradient
      const gradient = getIridescentGradient(progress);

      // Calculate wave delay for organic flow
      const waveDelay = Math.sin(globalWordIndex * 0.3) * 0.2;

      // Apply impact multiplier
      const finalMorphDuration = morphDuration * impact;
      const finalWaveDuration = waveDuration * impact;

      const wordId = `liquid-mercury-word-${captionIndex}-${wordIndex}`;

      // Create liquid morph effect (blur, contrast, brightness)
      const liquidMorphEffect = {
        id: `${wordId}-morph`,
        componentId: wordId,
        data: {
          type: 'ease-out',
          start: word.start,
          duration: finalMorphDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'blur', val: 20, prog: 0, unit: 'px' },
            { key: 'blur', val: 0, prog: 1, unit: 'px' },
            { key: 'contrast', val: 200, prog: 0, unit: '%' },
            { key: 'contrast', val: 100, prog: 1, unit: '%' },
            { key: 'brightness', val: 150, prog: 0, unit: '%' },
            { key: 'brightness', val: 100, prog: 1, unit: '%' },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.7 },
          ],
        },
      };

      // Create wave distortion effect (skewX, scaleY)
      const waveDistortionEffect = {
        id: `${wordId}-wave`,
        componentId: wordId,
        data: {
          type: 'ease-in-out',
          start: word.start + waveDelay,
          duration: finalWaveDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'skewX', val: -10, prog: 0, unit: 'deg' },
            { key: 'skewX', val: 10, prog: 0.5, unit: 'deg' },
            { key: 'skewX', val: 0, prog: 1, unit: 'deg' },
            { key: 'scaleY', val: 0.8, prog: 0 },
            { key: 'scaleY', val: 1.2, prog: 0.5 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      };

      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle || 'normal',
            backgroundImage: gradient,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            mixBlendMode: 'screen',
            willChange: 'transform, filter, opacity',
            contain: 'layout paint',
            transformStyle: 'preserve-3d',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
          containerProps: {
            className: 'absolute font-bold',
            style: {
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        effects: [liquidMorphEffect, waveDistortionEffect],
      };

      wordContainers.push(wordComponent);
    });
  });

  // Create background glow
  const backgroundGlow: RenderableComponentData = {
    id: 'liquid-mercury-background-glow',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      type: 'rect',
      color: 'transparent',
      containerProps: {
        className: 'absolute inset-0 opacity-30',
        style: {
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(107, 70, 193, 0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(8, 145, 178, 0.3) 0%, transparent 50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 9999,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-mercury-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 9999,
      },
    },
    childrenData: [backgroundGlow, ...bubbles, ...wordContainers],
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
  id: 'liquid-mercury-typography',
  title: 'Liquid Mercury Typography',
  description:
    'Organic, fluid kinetic typography preset where words emerge like liquid mercury or water. Features liquid morph effects (blur, contrast, brightness animation), curved bezier path positioning, wave distortion transforms, iridescent color gradients (purple → teal → orange), and floating bubble particles. Creates a dreamy, mesmerizing lava lamp aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'liquid',
    'mercury',
    'fluid',
    'organic',
    'morph',
    'blur',
    'wave',
    'distortion',
    'gradient',
    'iridescent',
    'bubbles',
    'particles',
    'dreamy',
    'lava-lamp',
    'mesmerizing',
    'curved-path',
    'bezier',
  ],
  defaultInputParams: {
    captions: [],
    fontSize: 48,
    font: 'Inter:700',
    morphDuration: 0.6,
    waveDuration: 0.8,
    impact: 1.0,
    bubbleCount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---
export const liquidMercuryTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
