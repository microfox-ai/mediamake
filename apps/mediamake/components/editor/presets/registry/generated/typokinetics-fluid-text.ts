/**
 * Typokinetics Fluid Text Preset
 *
 * This preset creates a particle-like fluid simulation effect for text, where letters
 * coalesce from scattered, barely visible fragments, hold their form briefly with
 * subtle micro-movements (breathing/floating), then organically dissolve and drift away.
 *
 * Features:
 * - **Particle Coalesce Phase (0-25%)**: Letters animate from scattered positions with
 *   random offsets, low opacity, and reduced scale, converging to their final positions
 *   using spring easing for a natural fluid motion.
 * - **Stable Breathing Phase (25-75%)**: Letters maintain their position with subtle
 *   sine-wave float animation (translateY oscillation) and gentle scale breathing
 *   (0.98-1.02) for an organic, living quality.
 * - **Organic Dissolve Phase (75-100%)**: Letters break apart and drift away with
 *   random trajectories, decreasing opacity, reducing scale, and increasing blur
 *   for a dissolving-in-water effect.
 * - **Wave-Based Dissolution**: Uses word-level timing to create wave patterns across
 *   sentences, with each word's dissolution staggered based on its index.
 * - **Micro-Movements**: Continuous subtle animations during the stable phase to give
 *   text a breathing, living quality.
 *
 * Use cases:
 * - High-end title sequences with particle-based text effects
 * - Poetic or artistic text presentations
 * - Video editing transitions with organic text dissolution
 * - Motion graphics with fluid typography effects
 */

import { z } from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),
  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  letterSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(2)
    .describe('Letter spacing in pixels'),
  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text on screen'),
  coalesceIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for coalesce scatter distance'),
  dissolveIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for dissolve drift distance'),
  breathingIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for breathing/float animations'),
  waveSpeed: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Speed multiplier for wave-based dissolution across words'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    letterSpacing,
    position,
    coalesceIntensity,
    dissolveIntensity,
    breathingIntensity,
    waveSpeed,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random offset for initial scatter
  const generateRandomOffset = (): { x: number; y: number } => {
    const range = 20 * coalesceIntensity;
    return {
      x: randomInRange(-range, range),
      y: randomInRange(-range, range),
    };
  };

  // Helper: Generate random offset for dissolve drift
  const generateDissolveOffset = (): { x: number; y: number } => {
    const range = 30 * dissolveIntensity;
    return {
      x: randomInRange(-range, range),
      y: randomInRange(-range, range),
    };
  };

  // Helper: Create letter components with effects for a word
  const createLetterComponents = (
    word: string,
    wordIndex: number,
    wordStart: number,
    wordDuration: number,
    captionId: string,
    totalWordsInCaption: number,
  ): RenderableComponentData[] => {
    const letters = word.split('');

    return letters.map((letter, letterIndex) => {
      const letterId = `${captionId}-word-${wordIndex}-letter-${letterIndex}`;

      // Generate random offsets for this letter
      const coalesceOffset = generateRandomOffset();
      const dissolveOffset = generateDissolveOffset();

      // Phase durations (as percentage of word duration)
      const coalesceDuration = wordDuration * 0.25; // 0-25%
      const stableDuration = wordDuration * 0.5; // 25-75%
      const dissolveDuration = wordDuration * 0.25; // 75-100%

      // Phase start times
      const coalesceStart = 0;
      const stableStart = coalesceDuration;
      const dissolveStart = coalesceDuration + stableDuration;

      // Wave-based stagger for dissolution (based on word index)
      const waveStagger = (wordIndex / totalWordsInCaption) * 0.5 * waveSpeed;

      // Breathing animation parameters
      const floatAmplitude = 2 * breathingIntensity;
      const scaleAmplitude = 0.02 * breathingIntensity;

      // Effect 1: Coalesce Phase (0-25%)
      const coalesceEffect: GenericEffectData = {
        type: 'spring',
        start: coalesceStart,
        duration: coalesceDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateX', val: coalesceOffset.x, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: coalesceOffset.y, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'opacity', val: 0.1, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      // Effect 2: Stable/Breathing Phase (25-75%) - Float animation
      const floatEffect: GenericEffectData = {
        type: 'linear',
        start: stableStart,
        duration: stableDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateY', val: -floatAmplitude, prog: 0 },
          { key: 'translateY', val: floatAmplitude, prog: 0.25 },
          { key: 'translateY', val: -floatAmplitude, prog: 0.5 },
          { key: 'translateY', val: floatAmplitude, prog: 0.75 },
          { key: 'translateY', val: -floatAmplitude, prog: 1 },
        ],
      };

      // Effect 3: Stable/Breathing Phase (25-75%) - Scale oscillation
      const breathingEffect: GenericEffectData = {
        type: 'linear',
        start: stableStart,
        duration: stableDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1 + scaleAmplitude, prog: 0.25 },
          { key: 'scale', val: 1 - scaleAmplitude, prog: 0.5 },
          { key: 'scale', val: 1 + scaleAmplitude, prog: 0.75 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      // Effect 4: Dissolve Phase (75-100%)
      const dissolveEffect: GenericEffectData = {
        type: 'ease-in',
        start: dissolveStart + waveStagger,
        duration: dissolveDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: dissolveOffset.x, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: dissolveOffset.y, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.7, prog: 1 },
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(4px)', prog: 1 },
        ],
      };

      return {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter,
          style: {
            display: 'inline-block',
            fontSize: `${fontSize}px`,
            color: textColor,
            letterSpacing: `${letterSpacing}px`,
            ...fontStyle,
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
            start: 0,
            duration: wordDuration,
          },
        },
        effects: [
          {
            id: `${letterId}-coalesce`,
            componentId: 'generic',
            data: coalesceEffect,
          },
          {
            id: `${letterId}-float`,
            componentId: 'generic',
            data: floatEffect,
          },
          {
            id: `${letterId}-breathing`,
            componentId: 'generic',
            data: breathingEffect,
          },
          {
            id: `${letterId}-dissolve`,
            componentId: 'generic',
            data: dissolveEffect,
          },
        ],
      } as RenderableComponentData;
    });
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption) => {
      const captionId = caption.id;

      // Create word wrappers with letter components
      const wordWrappers: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `${captionId}-word-${wordIndex}`;
          const wordText = word.text;
          const wordDuration = word.duration;

          // Create letter components for this word
          const letterComponents = createLetterComponents(
            wordText,
            wordIndex,
            word.start,
            wordDuration,
            captionId,
            caption.words.length,
          );

          return {
            id: wordId,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative inline-flex',
                style: {
                  marginRight: '0.3em',
                },
              },
            },
            context: {
              timing: {
                start: word.start,
                duration: wordDuration,
              },
            },
            childrenData: letterComponents,
          } as RenderableComponentData;
        },
      );

      // Position class based on position parameter
      const positionClass =
        position === 'top'
          ? 'items-start pt-20'
          : position === 'bottom'
            ? 'items-end pb-20'
            : 'items-center';

      return {
        id: `${captionId}-container`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 flex flex-col ${positionClass} justify-center px-8`,
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [
          {
            id: `${captionId}-words-container`,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex flex-row flex-wrap justify-center',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: wordWrappers,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Default duration, will be overridden by caption timing
      },
    },
    childrenData: captionContainers,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-fluid-text',
  title: 'Typokinetics Fluid Text Preset',
  description:
    'Particle-like fluid simulation text effect where letters coalesce from scattered fragments, hold with subtle breathing animation, then organically dissolve and drift away. Features spring easing for coalesce, sine-wave float during stable phase, and wave-based dissolution across sentences using word-level caption timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'captions',
    'subtitles',
    'particle',
    'fluid',
    'simulation',
    'coalesce',
    'dissolve',
    'breathing',
    'float',
    'kinetic',
    'organic',
    'advanced',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'The future is fluid',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-0',
            text: 'The',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-1',
            text: 'future',
            start: 0.5,
            absoluteStart: 0.5,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1,
          },
          {
            id: 'word-2',
            text: 'is',
            start: 1.5,
            absoluteStart: 1.5,
            end: 2,
            absoluteEnd: 2,
            duration: 0.5,
          },
          {
            id: 'word-3',
            text: 'fluid',
            start: 2,
            absoluteStart: 2,
            end: 3,
            absoluteEnd: 3,
            duration: 1,
          },
        ],
      },
    ],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#FFFFFF',
    letterSpacing: 2,
    position: 'center',
    coalesceIntensity: 1,
    dissolveIntensity: 1,
    breathingIntensity: 1,
    waveSpeed: 1,
  },
};

// --- Export ---

export const typokineticsFluidTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
