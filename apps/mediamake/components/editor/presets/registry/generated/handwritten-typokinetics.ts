/**
 * Handwritten Typokinetics Preset
 *
 * Organic, flowing typokinetics preset where words appear to be written by an invisible hand
 * with natural handwriting rhythm. Features slide animations with varying speeds (function words 0.3s,
 * content words 0.5s), subtle opacity fade trails, and slight vertical variations (±3px) for human touch.
 * Mimics time-lapse calligraphy with smooth cadence.
 *
 * Features:
 * - Natural handwriting rhythm with varying word speeds
 * - Function words (the, and, is, etc.) animate faster (0.3s)
 * - Content words animate slower (0.5s) for emphasis
 * - Slide-in animation from right with custom easing per word type
 * - Subtle opacity gradient creating ink-flow effect
 * - Random vertical offset (±3px) for organic, handwritten feel
 * - Staggered delays based on cumulative timing for natural rhythm
 * - Optional letter-spacing animation for added fluidity
 * - Uses caption metadata for enhanced word categorization
 *
 * Use cases:
 * - Poetic or literary content
 * - Handwritten-style captions
 * - Time-lapse calligraphy effects
 * - Organic, flowing text animations
 * - Educational content with natural reading pace
 */

import z from 'zod';
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
        start: z.number().describe('Relative start time of caption'),
        absoluteStart: z
          .number()
          .describe('Absolute start time in caption timeline'),
        end: z.number().describe('Relative end time of caption'),
        absoluteEnd: z
          .number()
          .describe('Absolute end time in caption timeline'),
        duration: z.number().describe('Duration of caption'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start time within caption'),
            absoluteStart: z
              .number()
              .describe('Absolute start time in caption timeline'),
            end: z.number().describe('Relative end time within caption'),
            absoluteEnd: z
              .number()
              .describe('Absolute end time in caption timeline'),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            impact: z.number().optional(),
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels for text display'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (hex or rgba)'),

  font: z
    .string()
    .default('Inter:600')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:400:italic")',
    ),

  containerPosition: z
    .object({
      left: z.string().default('50%').optional(),
      top: z.string().default('50%').optional(),
      transform: z.string().default('translate(-50%, -50%)').optional(),
      maxWidth: z.string().default('80%').optional(),
    })
    .optional()
    .describe('Positioning for the main text container'),

  functionWordDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .optional()
    .describe('Animation duration for function words (seconds)'),

  contentWordDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Animation duration for content words (seconds)'),

  verticalVariation: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Maximum vertical offset in pixels for natural positioning'),

  enableLetterSpacing: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable letter-spacing animation for added fluidity'),

  impact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Global impact multiplier for effect intensity'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Categorize word as function word or content word
  const isFunctionWord = (word: string): boolean => {
    const functionWords = [
      'the',
      'and',
      'is',
      'a',
      'an',
      'to',
      'of',
      'in',
      'on',
      'at',
      'for',
      'with',
      'from',
      'by',
      'as',
      'or',
      'but',
      'if',
      'it',
      'be',
      'are',
      'was',
      'were',
      'has',
      'have',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
    ];
    return functionWords.includes(word.toLowerCase());
  };

  // Helper: Parse font string
  const parseFontString = (
    fontString: string,
  ): {
    family: string;
    weight?: number;
    style?: string;
  } => {
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts[1] ? parseInt(parts[1], 10) : undefined,
      style: parts[2] || 'normal',
    };
  };

  // Parse font
  const fontConfig = parseFontString(params.font || 'Inter:600');

  // Extract global settings
  const fontSize = params.fontSize ?? 48;
  const textColor = params.textColor ?? '#ffffff';
  const functionWordDuration = params.functionWordDuration ?? 0.3;
  const contentWordDuration = params.contentWordDuration ?? 0.5;
  const verticalVariation = params.verticalVariation ?? 3;
  const enableLetterSpacing = params.enableLetterSpacing ?? true;
  const globalImpact = params.impact ?? 1;

  // Build all caption containers
  const allCaptionContainers: any[] = [];

  params.captions.forEach((caption: TranscriptionSentence, captionIndex) => {
    const words = caption.words || [];

    // Calculate cumulative timing for staggered word appearance
    let cumulativeDelay = 0;

    const wordComponents = words.map((word, wordIndex) => {
      const wordText = word.text;
      const wordId = `word-${captionIndex}-${wordIndex}`;

      // Determine word type and duration
      const isFuncWord = isFunctionWord(wordText);
      const baseDuration = isFuncWord
        ? functionWordDuration
        : contentWordDuration;
      const effectDuration = baseDuration * globalImpact;

      // Random vertical offset for natural positioning
      const verticalOffset =
        Math.random() * verticalVariation * 2 - verticalVariation;

      // Calculate effect start time (cumulative)
      const effectStart = cumulativeDelay;

      // Update cumulative delay for next word
      cumulativeDelay += effectDuration;

      // Create slide + opacity effect
      const slideEffect: GenericEffectData = {
        type: isFuncWord ? 'ease-out' : 'ease-in-out',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Slide in from right
          { key: 'translateX', val: '100%', prog: 0 },
          { key: 'translateX', val: '0%', prog: 1 },
          // Opacity fade (ink flowing effect)
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
          // Optional letter-spacing animation
          ...(enableLetterSpacing
            ? [
                { key: 'letterSpacing', val: '0.1em', prog: 0 },
                { key: 'letterSpacing', val: '0.02em', prog: 1 },
              ]
            : []),
        ],
      };

      const effect = {
        id: `${wordId}-slide-effect`,
        componentId: 'generic',
        data: slideEffect,
      };

      // Create word component
      const wordComponent: any = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: wordText,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontConfig.weight || 600,
            fontStyle: fontConfig.style || 'normal',
            transform: `translateY(${verticalOffset}px)`,
            letterSpacing: '0.02em',
          },
          font: {
            family: fontConfig.family,
            weights: fontConfig.weight ? [fontConfig.weight.toString()] : ['600'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [effect],
      };

      return wordComponent;
    });

    // Create caption container
    const captionContainer: any = {
      id: `caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row flex-wrap items-center gap-2',
          style: {
            position: 'absolute',
            left: params.containerPosition?.left || '50%',
            top: params.containerPosition?.top || '50%',
            transform: params.containerPosition?.transform || 'translate(-50%, -50%)',
            maxWidth: params.containerPosition?.maxWidth || '80%',
            justifyContent: 'center',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };

    allCaptionContainers.push(captionContainer);
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'handwritten-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          params.captions.length > 0
            ? Math.max(
                ...params.captions.map((c: any) => c.absoluteEnd || c.end),
              )
            : 10,
      },
    },
    childrenData: allCaptionContainers as RenderableComponentData[],
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
  id: 'handwritten-typokinetics',
  title: 'Handwritten Typokinetics Preset',
  description:
    'Organic, flowing typokinetics preset where words appear to be written by an invisible hand with natural handwriting rhythm. Features slide animations with varying speeds (function words 0.3s, content words 0.5s), subtle opacity fade trails, and slight vertical variations (±3px) for human touch. Mimics time-lapse calligraphy with smooth cadence.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'handwritten',
    'typokinetics',
    'organic',
    'calligraphy',
    'flowing',
    'natural',
    'slide',
    'fade',
    'stagger',
  ],
  dependencies: {},
  defaultInputParams: {
    fontSize: 48,
    textColor: '#ffffff',
    font: 'Inter:600',
    functionWordDuration: 0.3,
    contentWordDuration: 0.5,
    verticalVariation: 3,
    enableLetterSpacing: true,
    impact: 1,
    containerPosition: {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '80%',
    },
    captions: [
      {
        id: 'caption-1',
        text: 'This is a sample caption',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'This',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-2',
            text: 'is',
            start: 0.5,
            absoluteStart: 0.5,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.3,
          },
          {
            id: 'word-3',
            text: 'a',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1,
            absoluteEnd: 1,
            duration: 0.2,
          },
          {
            id: 'word-4',
            text: 'sample',
            start: 1,
            absoluteStart: 1,
            end: 1.8,
            absoluteEnd: 1.8,
            duration: 0.8,
          },
          {
            id: 'word-5',
            text: 'caption',
            start: 1.8,
            absoluteStart: 1.8,
            end: 3,
            absoluteEnd: 3,
            duration: 1.2,
          },
        ],
      },
    ],
  },
};

// --- Export ---

export const handwrittenTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
