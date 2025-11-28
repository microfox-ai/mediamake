/**
 * Liquid Metal Text Animation Preset
 *
 * This preset creates a stunning 3D rotating text animation with liquid chrome/mercury appearance.
 * Text starts as a thin vertical line (scaleX: 0.1, rotateY: 90deg) and rotates/expands to reveal
 * the message with reflective gradients, ripple effects, and organic motion with overshoot.
 *
 * Features:
 * - 3D rotation from edge-on view (90deg) to face forward (0deg)
 * - Scale expansion from thin line (scaleX: 0.1) to full width (scaleX: 1.0)
 * - Metallic gradient appearance (silver/chrome)
 * - Ripple/settling effect during rotation (blur animation)
 * - Subtle scaleY oscillation for liquid feel
 * - Reflective gradient shift (hue rotation + brightness)
 * - Custom cubic-bezier easing with overshoot for natural motion
 * - Optional per-word timing with overlapping reveals
 *
 * Use cases:
 * - Title reveals with liquid metal effect
 * - Logo animations with chrome appearance
 * - Futuristic text intros
 * - Tech/sci-fi themed content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
  TranscriptionWord,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  GenericEffectData,
  TextAtomData,
  BaseLayoutData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .optional()
    .describe(
      'Static text to display. If not provided, will use caption data for per-word reveal.',
    ),
  captions: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
          }),
        ),
      }),
    )
    .optional()
    .describe(
      'Caption data for per-word timing. Each word will animate in sequence with 0.15s overlap.',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., "400", "700", "900")'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Total animation duration in seconds (for static text mode)'),
  rotationDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(3.5)
    .describe(
      'Duration of rotation/expansion phase (70% of total duration by default)',
    ),
  rippleDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.75)
    .describe('Duration of ripple/settling effect'),
  baseColor: z
    .string()
    .default('#d1d5db')
    .describe('Base color for metallic gradient (gray-300 default)'),
  midColor: z
    .string()
    .default('#9ca3af')
    .describe('Mid color for metallic gradient (gray-400 default)'),
  darkColor: z
    .string()
    .default('#4b5563')
    .describe('Dark color for metallic gradient (gray-600 default)'),
  perWordTiming: z
    .boolean()
    .default(false)
    .describe(
      'Enable per-word timing with overlapping reveals (requires caption data)',
    ),
  wordOverlap: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Overlap between word animations in seconds'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    captions,
    fontSize,
    fontFamily,
    fontWeight,
    duration,
    rotationDuration,
    rippleDuration,
    baseColor,
    midColor,
    darkColor,
    perWordTiming,
    wordOverlap,
  } = params;

  // Determine if using caption-based or static text mode
  const useCaptions = perWordTiming && captions && captions.length > 0;

  // Build gradient string
  const gradientString = `linear-gradient(to bottom right, ${baseColor}, ${midColor}, ${darkColor})`;

  // Helper: Create rotation/scale effect for a target
  const createRotationScaleEffect = (
    targetId: string,
    startTime: number,
    effectDuration: number,
  ): RenderableComponentData => {
    const effectData: GenericEffectData = {
      type: 'cubic-bezier',
      easingParams: [0.68, -0.55, 0.265, 1.55] as any, // Overshoot easing
      start: startTime,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'rotateY', val: 90, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
        { key: 'scaleX', val: 0.1, prog: 0 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    };

    return {
      id: `rotation-scale-${targetId}`,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  // Helper: Create scaleY oscillation effect
  const createScaleYEffect = (
    targetId: string,
    startTime: number,
    effectDuration: number,
  ): RenderableComponentData => {
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: startTime,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: 1.02, prog: 0.5 },
        { key: 'scaleY', val: 1, prog: 1 },
      ],
    };

    return {
      id: `scaley-${targetId}`,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  // Helper: Create gradient animation effect (hue rotation + brightness)
  const createGradientEffect = (
    targetId: string,
    startTime: number,
    effectDuration: number,
  ): RenderableComponentData => {
    const effectData: GenericEffectData = {
      type: 'linear',
      start: startTime,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'filter', val: 'hue-rotate(0deg) brightness(1.0)', prog: 0 },
        { key: 'filter', val: 'hue-rotate(180deg) brightness(1.2)', prog: 1 },
      ],
    };

    return {
      id: `gradient-${targetId}`,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  // Helper: Create ripple/settle effect
  const createRippleEffect = (
    targetId: string,
    startTime: number,
    effectDuration: number,
  ): RenderableComponentData => {
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: startTime,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'blur', val: 2, prog: 0 },
        { key: 'blur', val: 0, prog: 1 },
      ],
    };

    return {
      id: `ripple-${targetId}`,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  // Helper: Create opacity fade-in effect
  const createOpacityEffect = (
    targetId: string,
    startTime: number,
    effectDuration: number,
  ): RenderableComponentData => {
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: startTime,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    return {
      id: `opacity-${targetId}`,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  let childrenData: RenderableComponentData[];
  let totalDuration = duration;

  if (useCaptions && captions) {
    // Per-word timing mode
    const allWords: Array<{
      text: string;
      start: number;
      absoluteStart: number;
      duration: number;
    }> = [];

    captions.forEach((caption) => {
      caption.words.forEach((word) => {
        allWords.push({
          text: word.text,
          start: word.start,
          absoluteStart: word.absoluteStart,
          duration: word.duration,
        });
      });
    });

    // Calculate total duration from captions
    if (allWords.length > 0) {
      const lastWord = allWords[allWords.length - 1];
      totalDuration = lastWord.absoluteStart + lastWord.duration + 1; // Add 1s buffer
    }

    // Create word components
    childrenData = allWords.map((word, index) => {
      const wordId = `liquid-metal-word-${index}`;
      const wrapperId = `liquid-metal-wrapper-${index}`;

      // Word start time with overlap
      const wordStart = word.absoluteStart - (index > 0 ? wordOverlap : 0);
      const wordAnimDuration = Math.min(rotationDuration, word.duration + wordOverlap);
      const rippleStart = wordStart + wordAnimDuration * 0.5;
      const rippleEffectDuration = Math.min(rippleDuration, wordAnimDuration * 0.5);

      // Text atom
      const textAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: fontSize,
            fontWeight: fontWeight,
            textAlign: 'center',
            letterSpacing: '-0.05em',
            lineHeight: '1.1',
            marginRight: '0.2em',
          },
          className: `font-black tracking-tight bg-gradient-to-br bg-clip-text text-transparent`,
          gradient: gradientString,
          font: {
            family: fontFamily,
            weights: [fontWeight],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData;

      // Wrapper with effects
      const wrapper: RenderableComponentData = {
        id: wrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              transformOrigin: 'center',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              perspective: '1000px',
            },
          },
        } as BaseLayoutData,
        context: {
          timing: {
            start: wordStart,
            duration: totalDuration - wordStart,
          },
        },
        effects: [
          createOpacityEffect(wrapperId, 0, 0.3),
          createRotationScaleEffect(wrapperId, 0, wordAnimDuration),
          createScaleYEffect(wrapperId, 0, wordAnimDuration),
          createGradientEffect(wordId, 0, wordAnimDuration),
          createRippleEffect(wordId, rippleStart - wordStart, rippleEffectDuration),
        ],
        childrenData: [textAtom],
      } as RenderableComponentData;

      return wrapper;
    });

    // Wrap all words in a flex container
    const wordsContainer: RenderableComponentData = {
      id: 'liquid-metal-words-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex flex-wrap items-center justify-center',
          style: {
            gap: '0.3em',
          },
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: childrenData,
    } as RenderableComponentData;

    childrenData = [wordsContainer];
  } else {
    // Static text mode
    const textId = 'liquid-metal-text';
    const wrapperId = 'liquid-metal-wrapper';

    const rippleStart = rotationDuration * 0.5;

    // Text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text || 'Liquid Metal',
        style: {
          fontSize: fontSize,
          fontWeight: fontWeight,
          textAlign: 'center',
          letterSpacing: '-0.05em',
          lineHeight: '1.1',
        },
        className: `font-black tracking-tight bg-gradient-to-br bg-clip-text text-transparent`,
        gradient: gradientString,
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData;

    // Wrapper with effects
    const wrapper: RenderableComponentData = {
      id: wrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            transformOrigin: 'center',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          },
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        createOpacityEffect(wrapperId, 0, 0.5),
        createRotationScaleEffect(wrapperId, 0, rotationDuration),
        createScaleYEffect(wrapperId, 0, rotationDuration),
        createGradientEffect(textId, 0, rotationDuration),
        createRippleEffect(textId, rippleStart, rippleDuration),
      ],
      childrenData: [textAtom],
    } as RenderableComponentData;

    childrenData = [wrapper];
  }

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'liquid-metal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    } as BaseLayoutData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: childrenData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquidMetalTextAnimation',
  title: 'Liquid Metal Text Animation',
  description:
    '3D rotating text animation with liquid chrome/mercury appearance. Text starts as a thin vertical line (scaleX: 0.1, rotateY: 90deg) and rotates/expands to reveal the message with reflective gradients, ripple effects, and organic motion with overshoot. Supports per-word timing for flowing sentence reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    '3d',
    'rotation',
    'liquid',
    'metal',
    'chrome',
    'mercury',
    'metallic',
    'reflective',
    'gradient',
    'ripple',
    'morphing',
    'futuristic',
    'tech',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Liquid Metal',
    fontSize: 96,
    fontFamily: 'Inter',
    fontWeight: '900',
    duration: 5,
    rotationDuration: 3.5,
    rippleDuration: 1.75,
    baseColor: '#d1d5db',
    midColor: '#9ca3af',
    darkColor: '#4b5563',
    perWordTiming: false,
    wordOverlap: 0.15,
  },
};

// Export preset
export const liquidMetalTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
