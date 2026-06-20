/**
 * Bubble Float Text Preset
 *
 * This preset creates physics-based floating text elements that rise upward like bubbles or smoke particles
 * with Perlin noise-like wobble, weight-based speed variations, and dissipation fade effects.
 *
 * Features:
 * - **Physics-Based Motion**: Text elements float upward with realistic turbulence and drift
 * - **Weight-Based Speed**: Smaller text floats faster, larger text slower (8-15 seconds duration range)
 * - **Horizontal Wobble**: Oscillating translateX values (-50px to 50px) using multiple keyframes for realistic drift
 * - **Dissipation Fade**: Opacity decreases as text rises (1 → 0.8 → 0.5 → 0) to simulate smoke dispersal
 * - **Bubble Growth**: Scale effect from 1 to 1.2 over animation duration to enhance bubble effect
 * - **Blur Dissipation**: Blur effect from 0 to 2px in final 20% for enhanced dissipation
 * - **Randomized Positioning**: Dynamic left positioning based on text index for random horizontal distribution
 * - **Staggered Launch**: Cascading start times (0s, 0.4s, 0.8s, 1.2s, 1.6s) for sequential bubble launches
 *
 * Use cases:
 * - Creating bubble-like floating text animations
 * - Building smoke particle text effects
 * - Creating upward-drifting message effects
 * - Adding physics-based text motion graphics
 * - Simulating particle system text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameters schema
const presetParams = z.object({
  texts: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe('Array of text strings to display as floating bubbles'),
  fontSizes: z
    .array(z.number().min(16).max(48))
    .optional()
    .describe(
      'Array of font sizes for each text (px). Affects float speed - smaller floats faster. If not provided, random sizes between 20-36px will be used.',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color in hex or CSS format'),
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  containerDuration: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe(
      'Total duration of the container (seconds). Bubbles will float for this duration.',
    ),
  staggerDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.4)
    .describe('Delay between each bubble launch (seconds)'),
  wobbleIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Horizontal wobble intensity multiplier (1 = normal, 2 = double wobble)',
    ),
  fadeStartProgress: z
    .number()
    .min(0)
    .max(1)
    .default(0.25)
    .describe(
      'Progress (0-1) when opacity fade begins (0.25 = starts at 25% of height)',
    ),
  blurStartProgress: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe(
      'Progress (0-1) when blur dissipation begins (0.8 = starts at 80% of height)',
    ),
  baseScale: z
    .number()
    .min(0.8)
    .max(1.2)
    .default(1)
    .describe('Starting scale value for text bubbles'),
  endScale: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.2)
    .describe('Ending scale value for text bubbles (growth effect)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    texts,
    fontSizes,
    textColor,
    font,
    containerDuration,
    staggerDelay,
    wobbleIntensity,
    fadeStartProgress,
    blurStartProgress,
    baseScale,
    endScale,
  } = params;

  // Helper: Parse font string
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

  // Helper: Calculate bubble duration based on fontSize (weight)
  const calculateBubbleDuration = (fontSize: number): number => {
    // Smaller text (20-24px) = faster (8.5-10s)
    // Medium text (28-32px) = medium (11-12s)
    // Larger text (36px+) = slower (14s)
    if (fontSize <= 24) return 8.5 + Math.random() * 1.5;
    if (fontSize <= 32) return 11 + Math.random() * 1;
    return 14;
  };

  // Helper: Generate random horizontal position (10% - 90%)
  const generateRandomPosition = (index: number): number => {
    // Use index as seed for pseudo-random but consistent positioning
    const seed = (index * 17 + 13) % 100;
    return 10 + (seed % 80);
  };

  // Helper: Generate wobble keyframes (Perlin noise-like pattern)
  const generateWobbleKeyframes = (
    intensity: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const maxDrift = 50 * intensity;
    return [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: maxDrift * 0.3, prog: 0.15 },
      { key: 'translateX', val: -maxDrift * 0.5, prog: 0.35 },
      { key: 'translateX', val: maxDrift * 0.7, prog: 0.55 },
      { key: 'translateX', val: -maxDrift * 0.4, prog: 0.75 },
      { key: 'translateX', val: maxDrift * 0.2, prog: 0.9 },
      { key: 'translateX', val: 0, prog: 1 },
    ];
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter');

  // Generate font sizes if not provided
  const effectiveFontSizes =
    fontSizes && fontSizes.length === texts.length
      ? fontSizes
      : texts.map(() => 20 + Math.random() * 16); // Random 20-36px

  // Create text bubble components
  const textBubbles = texts.map((text, index) => {
    const fontSize = effectiveFontSizes[index];
    const bubbleDuration = calculateBubbleDuration(fontSize);
    const startTime = index * staggerDelay;
    const leftPosition = generateRandomPosition(index);

    const bubbleId = `text-bubble-${index}`;

    // Generate wobble keyframes
    const wobbleRanges = generateWobbleKeyframes(wobbleIntensity);

    // Upward movement effect (translateY: 0 to -120vh)
    const floatEffect = {
      id: `float-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.4, 0, 0.2, 1)',
        start: 0,
        duration: bubbleDuration,
        mode: 'provider',
        targetIds: [bubbleId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -120, prog: 1 }, // -120vh
          ...wobbleRanges,
        ],
      },
    };

    // Opacity fade effect (1 → 0.8 → 0.5 → 0)
    const fadeEffect = {
      id: `fade-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: bubbleDuration,
        mode: 'provider',
        targetIds: [bubbleId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.8, prog: fadeStartProgress },
          { key: 'opacity', val: 0.5, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 0.8 },
        ],
      },
    };

    // Scale growth effect (1 → 1.2)
    const scaleEffect = {
      id: `scale-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: bubbleDuration,
        mode: 'provider',
        targetIds: [bubbleId],
        ranges: [
          { key: 'scale', val: baseScale, prog: 0 },
          { key: 'scale', val: endScale, prog: 1 },
        ],
      },
    };

    // Blur dissipation effect (0 → 2px in final 20%)
    const blurEffect = {
      id: `blur-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: bubbleDuration * blurStartProgress,
        duration: bubbleDuration * (1 - blurStartProgress),
        mode: 'provider',
        targetIds: [bubbleId],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(2px)', prog: 1 },
        ],
      },
    };

    return {
      id: bubbleId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          ...fontStyle,
          position: 'absolute',
          bottom: 0,
          left: `${leftPosition}%`,
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: bubbleDuration,
        },
      },
      effects: [floatEffect, fadeEffect, scaleEffect, blurEffect],
    } as RenderableComponentData;
  });

  const rootContainer = {
    id: 'bubble-float-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
      },
    },
    childrenData: textBubbles as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'bubble-float-text',
  title: 'Bubble Float Text',
  description:
    'Physics-based floating text elements that rise upward like bubbles or smoke particles with Perlin noise-like wobble, weight-based speed variations, and dissipation fade effects. Text elements start from bottom with random horizontal positions and float upward with realistic turbulence, opacity fade, scale growth, and blur dissipation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'bubbles',
    'smoke',
    'particles',
    'float',
    'physics',
    'upward',
    'drift',
    'wobble',
    'dissipation',
    'fade',
    'blur',
    'scale',
    'kinetic',
    'motion-graphics',
  ],
  dependencies: {},
  defaultInputParams: {
    texts: [
      'Hello',
      'World',
      'Float',
      'Rise',
      'Bubble',
    ],
    fontSizes: [24, 32, 20, 28, 36],
    textColor: '#FFFFFF',
    font: 'Inter:400',
    containerDuration: 15,
    staggerDelay: 0.4,
    wobbleIntensity: 1,
    fadeStartProgress: 0.25,
    blurStartProgress: 0.8,
    baseScale: 1,
    endScale: 1.2,
  },
};

export const bubbleFloatTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
